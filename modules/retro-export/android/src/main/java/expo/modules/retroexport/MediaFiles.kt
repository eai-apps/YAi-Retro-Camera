package expo.modules.retroexport

import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import androidx.core.content.FileProvider
import java.io.File
import java.io.FileOutputStream
import java.util.UUID

class MediaFiles(val context:Context) {
    val root=File(context.filesDir,"retro_sessions").apply {mkdirs()}
    fun privateFile(uri:String,requireExists:Boolean=true):File {val p=Uri.parse(uri);require(p.scheme=="file"){"Ожидался файл приложения"};val file=File(p.path?:error("Пустой путь")).canonicalFile
        require(listOf("chunks","photos").any{file.path.startsWith(File(root,it).canonicalPath+File.separator)}&&(!requireExists||file.isFile)){"Исходник не найден"};return file}
    fun commit(uri:String,kind:String):Map<String,Any> {
        require(kind in listOf("video","photo"))
        val parsed=Uri.parse(uri);val source=if(parsed.scheme=="file"||parsed.scheme==null)File(parsed.path?:uri).canonicalFile else null
        if(source!=null)require(source.path.startsWith(context.cacheDir.canonicalPath+File.separator)){"Импортировать можно только выбранный системным окном файл"}
        else require(parsed.scheme=="content"){"Некорректный источник"}
        val file=File(File(root,if(kind=="video")"chunks" else "photos").apply{mkdirs()},"${UUID.randomUUID()}.${if(kind=="video")"mp4" else "jpg"}")
        try {
            val input=source?.inputStream()?:context.contentResolver.openInputStream(parsed)?:error("Не удалось открыть выбранный файл")
            input.use {reader->FileOutputStream(file).use{out->reader.copyTo(out);out.fd.sync()}}
            val info=if(kind=="video")inspect(file) else {val opts=android.graphics.BitmapFactory.Options().apply{inJustDecodeBounds=true};android.graphics.BitmapFactory.decodeFile(file.path,opts);require(opts.outWidth>0&&opts.outHeight>0){"Не удалось прочитать фото"};mapOf("uri" to Uri.fromFile(file).toString(),"width" to opts.outWidth,"height" to opts.outHeight,"sizeBytes" to file.length())}
            if(source!=null)source.delete()
            return info
        }catch(e:Exception){file.delete();throw e}
    }
    fun inspect(file:File):Map<String,Any> {
        require(file.isFile&&file.length()>0){"Файл пуст или отсутствует"};val meta=MediaMetadataRetriever()
        try {meta.setDataSource(file.path);val duration=meta.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)?.toLongOrNull()?:0
            var w=meta.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_WIDTH)?.toIntOrNull()?:0;var h=meta.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_HEIGHT)?.toIntOrNull()?:0
            val rotation=meta.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_ROTATION)?.toIntOrNull()?:0;if(rotation%180!=0){val t=w;w=h;h=t}
            require(duration>0&&w>0&&h>0){"Видео не завершено или повреждено"}
            val thumb=File(file.parentFile,"${file.nameWithoutExtension}.jpg")
            if(!thumb.exists())try {(if(Build.VERSION.SDK_INT>=27)meta.getScaledFrameAtTime(0,MediaMetadataRetriever.OPTION_CLOSEST_SYNC,240,240)else meta.getFrameAtTime(0,MediaMetadataRetriever.OPTION_CLOSEST_SYNC))?.let{b->val small=if(b.width>240||b.height>240)Bitmap.createScaledBitmap(b,(b.width*240f/kotlin.math.max(b.width,b.height)).toInt().coerceAtLeast(1),(b.height*240f/kotlin.math.max(b.width,b.height)).toInt().coerceAtLeast(1),true)else b;thumb.outputStream().use{small.compress(Bitmap.CompressFormat.JPEG,80,it)};if(small!==b)small.recycle();b.recycle()}}catch(_:Exception){}
            return mapOf("uri" to Uri.fromFile(file).toString(),"durationMs" to duration,"sizeBytes" to file.length(),"width" to w,"height" to h,"hasAudio" to (meta.extractMetadata(MediaMetadataRetriever.METADATA_KEY_HAS_AUDIO)=="yes"),"thumbnailUri" to if(thumb.exists())Uri.fromFile(thumb).toString() else "")
        }finally{meta.release()}
    }
    fun deleteSource(uri:String) {val f=privateFile(uri,false);if(f.exists())check(f.delete()){ "Не удалось удалить исходник" };File(f.parentFile,"${f.nameWithoutExtension}.jpg").delete()}
    fun save(source:File,isVideo:Boolean):Uri {
        val resolver=context.contentResolver;val folder=(if(isVideo)Environment.DIRECTORY_MOVIES else Environment.DIRECTORY_PICTURES)+"/YAi Retro Camera"
        val name="YAi_Retro_${System.currentTimeMillis()}_${UUID.randomUUID().toString().take(5)}.${if(isVideo)"mp4" else "jpg"}"
        val values=ContentValues().apply{put(MediaStore.MediaColumns.DISPLAY_NAME,name);put(MediaStore.MediaColumns.MIME_TYPE,if(isVideo)"video/mp4" else "image/jpeg")
            if(Build.VERSION.SDK_INT>=29){put(MediaStore.MediaColumns.RELATIVE_PATH,folder);put(MediaStore.MediaColumns.IS_PENDING,1)}
            else {val dir=File(Environment.getExternalStorageDirectory(),folder).apply{mkdirs()};put(MediaStore.MediaColumns.DATA,File(dir,name).path)}}
        val collection=if(isVideo)MediaStore.Video.Media.EXTERNAL_CONTENT_URI else MediaStore.Images.Media.EXTERNAL_CONTENT_URI
        val uri=resolver.insert(collection,values)?:error("Не удалось создать файл в галерее")
        try {resolver.openOutputStream(uri,"w")?.use{out->source.inputStream().use{it.copyTo(out)}}?:error("Не удалось записать файл")
            resolver.openFileDescriptor(uri,"r")?.use{check(it.statSize==source.length()){ "Записан не весь файл" }}?:error("Не удалось проверить файл")
            if(Build.VERSION.SDK_INT>=29){values.clear();values.put(MediaStore.MediaColumns.IS_PENDING,0);check(resolver.update(uri,values,null,null)==1)};return uri
        }catch(e:Exception){resolver.delete(uri,null,null);throw e}
    }
    fun library():List<Map<String,Any>> {
        val results=mutableListOf<Map<String,Any>>()
        for((collection,type) in listOf(MediaStore.Video.Media.EXTERNAL_CONTENT_URI to "video",MediaStore.Images.Media.EXTERNAL_CONTENT_URI to "photo")){
            val pathColumn=if(Build.VERSION.SDK_INT>=29)MediaStore.MediaColumns.RELATIVE_PATH else MediaStore.MediaColumns.DATA
            val columns=arrayOf("_id","_display_name","date_added","_size",pathColumn)
            context.contentResolver.query(collection,columns,"$pathColumn LIKE ?",arrayOf("%/YAi Retro Camera/%"),"date_added DESC")?.use{c->
                while(c.moveToNext()){val name=c.getString(1)?:continue;if(!name.startsWith("YAi_Retro_"))continue
                    results.add(mapOf("uri" to Uri.withAppendedPath(collection,c.getLong(0).toString()).toString(),"name" to name,"type" to type,"createdAt" to c.getLong(2)*1000,"sizeBytes" to c.getLong(3)))}}
        };return results.sortedByDescending{it["createdAt"] as Long}
    }
    fun deleteSaved(uri:String) {require(library().any{it["uri"]==uri}){"Удалять можно только работы YAi Retro Camera"};check(context.contentResolver.delete(Uri.parse(uri),null,null)>0){"Галерея не разрешила удаление"}}
    fun open(uri:String) {
        val parsed=Uri.parse(uri);val target=if(parsed.scheme=="file")FileProvider.getUriForFile(context,context.packageName+".retro.files",privateFile(uri)) else {
            require(parsed.scheme=="content"&&parsed.authority=="media"){"Некорректная ссылка"};parsed}
        val mime=if(uri.endsWith(".jpg",true)||uri.contains("/images/"))"image/jpeg" else "video/mp4"
        context.startActivity(Intent(Intent.ACTION_VIEW).apply{setDataAndType(target,mime);addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_GRANT_READ_URI_PERMISSION)})
    }
}
