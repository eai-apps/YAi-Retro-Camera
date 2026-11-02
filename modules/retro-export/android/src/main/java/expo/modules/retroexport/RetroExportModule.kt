package expo.modules.retroexport

import android.os.Handler
import android.os.Looper
import android.util.AtomicFile
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.util.concurrent.Executors
import org.json.JSONObject

class RetroExportModule:Module(){
    private val io=Executors.newSingleThreadExecutor();private val main=Handler(Looper.getMainLooper())
    private val context get()=appContext.reactContext?:error("Приложение закрыто")
    private val files get()=MediaFiles(context)
    private var exporter:VideoExporter?=null
    override fun definition()=ModuleDefinition {
        Name("RetroExport")
        AsyncFunction("commitRecording"){path:String,promise:Promise->background(promise){files.commit(path,"video")}}
        AsyncFunction("importMedia"){uri:String,type:String,promise:Promise->background(promise){files.commit(uri,type)}}
        AsyncFunction("inspectVideo"){uri:String,promise:Promise->background(promise){files.inspect(files.privateFile(uri))}}
        AsyncFunction("analyzeAudio"){uri:String,promise:Promise->background(promise){AudioTools.analyze(files.privateFile(uri))}}
        AsyncFunction("deleteSource"){uri:String,promise:Promise->background(promise){files.deleteSource(uri);null}}
        AsyncFunction("renderPhoto"){options:Map<String,Any?>,promise:Promise->background(promise){
            val uris=(options["inputUris"] as? List<*>)?.map{it as? String?:error("Неверное фото")}?:error("Нет фото")
            PhotoEngine(context,files).render(uris,options)
        }}
        AsyncFunction("listMedia"){promise:Promise->background(promise){files.library()}}
        AsyncFunction("deleteMedia"){uri:String,promise:Promise->background(promise){files.deleteSaved(uri);null}}
        AsyncFunction("openVideo"){uri:String,promise:Promise->main.post{try{files.open(uri);promise.resolve(null)}catch(e:Exception){promise.reject("OPEN",e.message,e)}}}
        AsyncFunction("loadSettings"){context.getSharedPreferences("retro_settings",0).getString("settings",null)}
        AsyncFunction("saveSettings"){json:String->JSONObject(json);context.getSharedPreferences("retro_settings",0).edit().putString("settings",json).apply()}
        AsyncFunction("saveCatalog"){json:String,promise:Promise->background(promise){
            val data=JSONObject(json);val id=data.getString("sessionId");require(id.matches(Regex("[A-Za-z0-9_-]{1,120}")))
            val chunks=data.getJSONArray("chunks");for(i in 0 until chunks.length())files.privateFile(chunks.getJSONObject(i).getString("uri"))
            atomic(File(files.root,"$id.json"),json);atomic(File(files.root,"current.json"),json);null
        }}
        AsyncFunction("loadCatalog"){promise:Promise->background(promise){val file=AtomicFile(File(files.root,"current.json"));if(file.baseFile.exists()||File(file.baseFile.path+".bak").exists())String(file.readFully(),Charsets.UTF_8)else null}}
        AsyncFunction("exportSession"){options:Map<String,Any?>,promise:Promise->main.post{try{if(exporter==null)exporter=VideoExporter(context.applicationContext,MediaFiles(context.applicationContext));exporter!!.export(options,promise)}catch(e:Exception){promise.reject("EXPORT",e.message,e)}}}
        OnDestroy {exporter?.close();io.shutdown()}
    }
    private fun background(promise:Promise,work:()->Any?){io.execute{try{promise.resolve(work())}catch(e:Exception){promise.reject("MEDIA",e.message,e)}}}
    private fun atomic(file:File,json:String){val af=AtomicFile(file);val stream=af.startWrite();try{stream.write(json.toByteArray(Charsets.UTF_8));af.finishWrite(stream)}catch(e:Exception){af.failWrite(stream);throw e}}
}
