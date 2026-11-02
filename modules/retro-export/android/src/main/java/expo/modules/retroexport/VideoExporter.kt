package expo.modules.retroexport

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.PorterDuff
import android.net.Uri
import android.os.Handler
import android.os.Looper
import androidx.media3.common.MediaItem
import androidx.media3.common.MimeTypes
import androidx.media3.common.audio.AudioProcessor
import androidx.media3.common.audio.ChannelMixingAudioProcessor
import androidx.media3.common.audio.ChannelMixingMatrix
import androidx.media3.common.audio.SonicAudioProcessor
import androidx.media3.common.util.UnstableApi
import androidx.media3.effect.*
import androidx.media3.transformer.*
import expo.modules.kotlin.Promise
import java.io.File
import java.util.UUID
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.math.*

@androidx.annotation.OptIn(UnstableApi::class)
class VideoExporter(private val context:Context,private val files:MediaFiles) {
    private val main=Handler(Looper.getMainLooper());private val io=Executors.newSingleThreadExecutor();private val busy=AtomicBoolean(false)
    private var transformer:Transformer?=null;private var pending:Promise?=null;private var output:File?=null
    @Volatile private var destroyed=false
    fun export(options:Map<String,Any?>,promise:Promise){
        if(!busy.compareAndSet(false,true)){promise.reject("BUSY","Сохранение уже выполняется",null);return}
        io.execute{try{val input=(options["inputUris"] as? List<*>)?.map{files.privateFile(it as? String?:error("Неверный кусок"))}?:error("Нет кусков")
            require(input.isNotEmpty());val infos=input.map{files.inspect(it)};val fx=FxConfig(options)
            main.post{start(input,infos,fx,options,promise)}
        }catch(e:Exception){busy.set(false);promise.reject("EXPORT",e.message,e)}}
    }
    private fun start(input:List<File>,infos:List<Map<String,Any>>,fx:FxConfig,options:Map<String,Any?>,promise:Promise){
        if(destroyed){busy.set(false);promise.reject("CLOSED","Приложение закрыто",null);return}
        val out=File(context.cacheDir,"retro_export_${UUID.randomUUID()}.mp4");output=out;pending=promise
        var overlay:StampOverlay?=null
        try{
            val edge=when(options["quality"]){"4k"->3840;"720"->1280;else->1920}
            val ratio=when(options["aspect"]){"original"->(infos[0]["width"] as Int).toDouble()/(infos[0]["height"] as Int);"1:1"->1.0;"16:9"->16.0/9;else->9.0/16}
            val w=if(ratio>=1)edge else (edge*ratio/2).roundToInt()*2;val h=if(ratio>=1)(edge/ratio/2).roundToInt()*2 else edge
            val audio=options["audioMode"] as? String?:"live";require(audio in listOf("live","vintage","mute"))
            val items=input.map{file->
                val processors=mutableListOf<AudioProcessor>()
                if(audio!="mute"){
                    val mixing=ChannelMixingAudioProcessor();mixing.putChannelMixingMatrix(ChannelMixingMatrix(1,2,floatArrayOf(1f,1f)));mixing.putChannelMixingMatrix(ChannelMixingMatrix.create(2,2))
                    processors.add(mixing);processors.add(SonicAudioProcessor().apply{setOutputSampleRateHz(48000)})
                    if(audio=="vintage")processors.add(VintageAudioProcessor())
                }
                EditedMediaItem.Builder(MediaItem.fromUri(Uri.fromFile(file))).setRemoveAudio(audio=="mute")
                    .setEffects(Effects(processors,listOf(Presentation.createForWidthAndHeight(w,h,Presentation.LAYOUT_SCALE_TO_FIT_WITH_CROP),WarmFilmGlEffect(fx)))).build()
            }
            val builder=Composition.Builder(EditedMediaItemSequence(items)).setHdrMode(Composition.HDR_MODE_TONE_MAP_HDR_TO_SDR_USING_OPEN_GL)
            if(audio!="mute"&&infos.any{it["hasAudio"]==true})builder.experimentalSetForceAudioTrack(true)
            if(options["showRec"]!=false||options["dateEnabled"]!=false){overlay=StampOverlay(w,h,options+("baseTimeMs" to System.currentTimeMillis()));builder.setEffects(Effects(emptyList(),listOf(OverlayEffect(listOf(overlay))))) }
            val stamp=overlay
            val encoders=DefaultEncoderFactory.Builder(context).setEnableFallback(false)
                .setRequestedAudioEncoderSettings(AudioEncoderSettings.Builder().setBitrate(192000).build())
                .setRequestedVideoEncoderSettings(VideoEncoderSettings.Builder().setBitrate(if(edge>=3840)40000000 else if(edge>=1920)18000000 else 8000000).build()).build()
            transformer=Transformer.Builder(context).setLooper(Looper.getMainLooper()).setEncoderFactory(encoders)
                .setVideoMimeType(MimeTypes.VIDEO_H264).setAudioMimeType(MimeTypes.AUDIO_AAC).addListener(object:Transformer.Listener{
                    override fun onCompleted(composition:Composition,result:ExportResult){transformer=null;pending=null;output=null
                        io.execute{try{val info=files.inspect(out)
                            check(info["width"]==w&&info["height"]==h){"Кодек изменил разрешение: ожидалось $w × $h, получено ${info["width"]} × ${info["height"]}. Исходники сохранены."}
                            check(audio=="mute"||infos.none{it["hasAudio"]==true}||info["hasAudio"]==true){"После склейки пропала звуковая дорожка. Исходники сохранены."}
                            val uri=files.save(out,true);promise.resolve(mapOf("success" to true,"outputUri" to uri.toString(),"durationMs" to info.getValue("durationMs"),"width" to info.getValue("width"),"height" to info.getValue("height"),"hasAudio" to info.getValue("hasAudio"),"fileSizeBytes" to out.length()))}
                            catch(e:Exception){promise.reject("SAVE",e.message,e)}finally{out.delete();File(out.parentFile,"${out.nameWithoutExtension}.jpg").delete();stamp?.dispose();busy.set(false)}}}
                    override fun onError(composition:Composition,result:ExportResult,exception:ExportException){stamp?.dispose();fail(out,promise,exception)}
                }).build()
            transformer!!.start(builder.build(),out.path)
        }catch(e:Exception){overlay?.dispose();fail(out,promise,e)}
    }
    private fun fail(file:File,promise:Promise,e:Exception){transformer?.cancel();transformer=null;pending=null;output=null;file.delete();busy.set(false);promise.reject("EXPORT",e.message,e)}
    fun close(){destroyed=true;main.post{transformer?.cancel();transformer=null;output?.delete();pending?.reject("CLOSED","Обработка прервана; исходники сохранены",null);output=null;pending=null;io.shutdown()}}
    private class StampOverlay(private val w:Int,private val h:Int,private val options:Map<String,Any?>):BitmapOverlay(){
        private val width=min(w,1080);private val height=(h.toDouble()*width/w).roundToInt();private val bitmap=Bitmap.createBitmap(width,height,Bitmap.Config.ARGB_8888);private var last=-1L
        override fun getBitmap(presentationTimeUs:Long):Bitmap {val sec=presentationTimeUs/1_000_000;if(sec!=last){last=sec;val canvas=Canvas(bitmap);canvas.drawColor(Color.TRANSPARENT,PorterDuff.Mode.CLEAR);PhotoEngine.stamp(canvas,width,height,options,true,presentationTimeUs)};return bitmap}
        override fun getOverlaySettings(presentationTimeUs:Long):OverlaySettings=OverlaySettings.Builder().setScale(w.toFloat()/width,h.toFloat()/height).build()
        fun dispose(){if(!bitmap.isRecycled)bitmap.recycle()}
    }
}
