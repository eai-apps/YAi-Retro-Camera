package expo.modules.retroexport

import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.os.Environment
import android.os.Handler
import android.os.Looper
import android.provider.MediaStore
import android.util.AtomicFile
import androidx.media3.common.MediaItem
import androidx.media3.common.MimeTypes
import androidx.media3.common.util.UnstableApi
import androidx.media3.transformer.Composition
import androidx.media3.transformer.EditedMediaItem
import androidx.media3.transformer.EditedMediaItemSequence
import androidx.media3.transformer.Effects
import androidx.media3.transformer.ExportException
import androidx.media3.transformer.ExportResult
import androidx.media3.transformer.Transformer
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.util.UUID
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

@androidx.annotation.OptIn(UnstableApi::class)
class RetroExportModule : Module() {
    private val main = Handler(Looper.getMainLooper())
    private val io = Executors.newSingleThreadExecutor()
    private val busy = AtomicBoolean(false)
    private var transformer: Transformer? = null // Main-looper access only.
    private var activePromise: Promise? = null
    private var activeFile: File? = null
    @Volatile private var destroyed = false
    private val context: Context get() = appContext.reactContext ?: error("Приложение уже закрыто")
    private val sessionRoot: File get() = File(context.filesDir, "retro_sessions").apply { mkdirs() }

    override fun definition() = ModuleDefinition {
        Name("RetroExport")
        AsyncFunction("commitRecording") { path: String, promise: Promise ->
            background(promise) {
                val source = File(Uri.parse(path).path ?: path).canonicalFile
                require(source.path.startsWith(context.cacheDir.canonicalPath + File.separator)) { "Исходник вне папки камеры" }
                inspect(source)
                val destination = File(File(sessionRoot, "chunks").apply { mkdirs() }, "${UUID.randomUUID()}.mp4")
                try {
                    source.inputStream().use { input -> FileOutputStream(destination).use { out -> input.copyTo(out); out.fd.sync() } }
                    val info = inspect(destination)
                    source.delete() // Only after durable copy and metadata verification.
                    info
                } catch (e: Exception) { destination.delete(); throw e }
            }
        }
        AsyncFunction("inspectVideo") { uri: String, promise: Promise -> background(promise) { inspect(privateChunk(uri)) } }
        AsyncFunction("saveCatalog") { json: String, promise: Promise ->
            background(promise) {
                val data = JSONObject(json)
                val id = data.getString("sessionId")
                require(id.matches(Regex("[A-Za-z0-9_-]{1,120}"))) { "Некорректный id сессии" }
                val chunks = data.getJSONArray("chunks")
                for (i in 0 until chunks.length()) privateChunk(chunks.getJSONObject(i).getString("uri"))
                writeAtomic(File(sessionRoot, "$id.json"), json)
                writeAtomic(File(sessionRoot, "current.json"), json)
                null
            }
        }
        AsyncFunction("loadCatalog") { promise: Promise ->
            background(promise) {
                val atomic = AtomicFile(File(sessionRoot, "current.json"))
                if (atomic.baseFile.exists() || File(atomic.baseFile.path + ".bak").exists()) String(atomic.readFully(), Charsets.UTF_8) else null
            }
        }
        AsyncFunction("openVideo") { uri: String, promise: Promise ->
            main.post {
                try {
                    require(uri.startsWith("content://media/")) { "Некорректная ссылка на ролик" }
                    context.startActivity(Intent(Intent.ACTION_VIEW).apply {
                        setDataAndType(Uri.parse(uri), "video/mp4")
                        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
                    })
                    promise.resolve(null)
                } catch (e: Exception) { promise.reject("OPEN_VIDEO", "Не удалось открыть проигрыватель: ${e.message}", e) }
            }
        }
        AsyncFunction("exportSession") { options: Map<String, Any>, promise: Promise ->
            if (!busy.compareAndSet(false, true)) promise.reject("EXPORT_BUSY", "Склейка уже выполняется", null)
            else io.execute {
                try {
                    val uris = options["inputUris"] as? List<*> ?: error("Не переданы куски")
                    require(uris.isNotEmpty()) { "Лента пуста" }
                    val files = uris.map { privateChunk(it as? String ?: error("Некорректный URI")) }
                    files.forEach { inspect(it) }
                    val params = floatArrayOf(parameter(options, "warmth", 0f, 1f), parameter(options, "contrast", 0.1f, 2f),
                        parameter(options, "saturation", 0f, 2f), parameter(options, "grainIntensity", 0f, 0.5f),
                        parameter(options, "grainScale", 0.5f, 8f), parameter(options, "grainSpeed", 1f, 60f))
                    main.post { startExport(files, params, promise) }
                } catch (e: Exception) { busy.set(false); promise.reject("EXPORT_ERROR", e.message, e) }
            }
        }
        OnDestroy {
            destroyed = true
            main.post {
                transformer?.cancel(); transformer = null
                activeFile?.delete(); activeFile = null
                activePromise?.reject("EXPORT_CANCELLED", "Приложение закрыто; исходники сохранены", null)
                activePromise = null; busy.set(false)
                io.shutdown()
            }
        }
    }

    private fun background(promise: Promise, task: () -> Any?) {
        io.execute {
            try { promise.resolve(task()) }
            catch (e: Exception) { promise.reject("VIDEO_STORAGE", e.message, e) }
        }
    }
    private fun writeAtomic(file: File, json: String) {
        val atomic = AtomicFile(file)
        val stream = atomic.startWrite()
        try { stream.write(json.toByteArray(Charsets.UTF_8)); atomic.finishWrite(stream) }
        catch (e: Exception) { atomic.failWrite(stream); throw e }
    }
    private fun privateChunk(uri: String): File {
        val parsed = Uri.parse(uri)
        require(parsed.scheme == "file") { "Ожидался приватный файл съёмки" }
        val file = File(parsed.path ?: error("Пустой путь")).canonicalFile
        val root = File(sessionRoot, "chunks").canonicalFile
        require(file.path.startsWith(root.path + File.separator) && file.isFile) { "Кусок отсутствует или вне папки съёмки" }
        return file
    }
    private fun inspect(file: File): Map<String, Any> {
        require(file.isFile && file.length() > 0) { "Кусок пуст или отсутствует" }
        val metadata = MediaMetadataRetriever()
        try {
            metadata.setDataSource(file.absolutePath)
            val duration = metadata.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)?.toLongOrNull() ?: 0L
            val width = metadata.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_WIDTH)?.toIntOrNull() ?: 0
            val height = metadata.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_HEIGHT)?.toIntOrNull() ?: 0
            require(duration > 0 && width > 0 && height > 0) { "Кусок ещё не завершён или не содержит видео" }
            require(metadata.extractMetadata(MediaMetadataRetriever.METADATA_KEY_HAS_AUDIO) == "yes") { "В куске отсутствует звук микрофона" }
            return mapOf("uri" to Uri.fromFile(file).toString(), "durationMs" to duration, "sizeBytes" to file.length())
        } finally { metadata.release() }
    }
    private fun parameter(options: Map<String, Any>, key: String, min: Float, max: Float): Float {
        val value = (options[key] as? Number)?.toFloat() ?: error("Не задан параметр $key")
        require(value.isFinite() && value in min..max) { "Некорректный параметр $key" }
        return value
    }
    private fun startExport(files: List<File>, p: FloatArray, promise: Promise) {
        if (destroyed) { busy.set(false); promise.reject("EXPORT_CANCELLED", "Приложение закрыто", null); return }
        val ctx = context.applicationContext
        val output = File(ctx.cacheDir, "retro_export_${UUID.randomUUID()}.mp4")
        activeFile = output; activePromise = promise
        try {
            val items = files.map { file -> EditedMediaItem.Builder(MediaItem.fromUri(Uri.fromFile(file)))
                .setEffects(Effects(emptyList(), listOf(WarmFilmGlEffect(p[0], p[1], p[2], p[3], p[4], p[5])))).build() }
            val composition = Composition.Builder(EditedMediaItemSequence(items)).build()
            transformer = Transformer.Builder(ctx).setLooper(Looper.getMainLooper())
                .setVideoMimeType(MimeTypes.VIDEO_H264).setAudioMimeType(MimeTypes.AUDIO_AAC)
                .addListener(object : Transformer.Listener {
                    override fun onCompleted(composition: Composition, exportResult: ExportResult) {
                        transformer = null; activeFile = null; activePromise = null
                        io.execute {
                            try {
                                val info = inspect(output)
                                val uri = saveVideo(ctx, output)
                                promise.resolve(mapOf("success" to true, "outputUri" to uri.toString(),
                                    "durationMs" to info.getValue("durationMs"), "fileSizeBytes" to output.length()))
                            } catch (e: Exception) { promise.reject("SAVE_VIDEO", e.message, e) }
                            finally { output.delete(); busy.set(false) }
                        }
                    }
                    override fun onError(composition: Composition, result: ExportResult, exception: ExportException) { failExport(output, promise, exception) }
                }).build()
            transformer!!.start(composition, output.absolutePath)
        } catch (e: Exception) { failExport(output, promise, e) }
    }
    private fun failExport(output: File, promise: Promise, error: Exception) {
        transformer?.cancel(); transformer = null; activeFile = null; activePromise = null
        output.delete(); busy.set(false); promise.reject("EXPORT_ERROR", error.message, error)
    }
    private fun saveVideo(ctx: Context, source: File): Uri {
        val resolver = ctx.contentResolver
        val values = ContentValues().apply {
            put(MediaStore.Video.Media.DISPLAY_NAME, "YAi_Retro_${System.currentTimeMillis()}.mp4")
            put(MediaStore.Video.Media.MIME_TYPE, "video/mp4")
            put(MediaStore.Video.Media.RELATIVE_PATH, Environment.DIRECTORY_MOVIES + "/YAi Retro Camera")
            put(MediaStore.Video.Media.IS_PENDING, 1)
        }
        val uri = resolver.insert(MediaStore.Video.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY), values) ?: error("Галерея не создала файл")
        try {
            resolver.openOutputStream(uri, "w")?.use { out -> source.inputStream().use { it.copyTo(out) } } ?: error("Галерея не открыла файл")
            resolver.openFileDescriptor(uri, "r")?.use { require(it.statSize == source.length()) { "Файл записан не полностью" } } ?: error("Не удалось проверить файл")
            values.clear(); values.put(MediaStore.Video.Media.IS_PENDING, 0)
            check(resolver.update(uri, values, null, null) == 1) { "Не удалось опубликовать файл в галерее" }
            return uri
        } catch (e: Exception) { resolver.delete(uri, null, null); throw e }
    }
}
