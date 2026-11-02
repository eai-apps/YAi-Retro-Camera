package expo.modules.retroexport

import android.Manifest
import android.graphics.Bitmap
import android.graphics.Color
import android.net.Uri
import android.os.Build
import androidx.media3.common.C
import androidx.media3.common.audio.AudioProcessor
import androidx.media3.common.util.UnstableApi
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import expo.modules.kotlin.Promise
import org.junit.*
import org.junit.Assert.*
import org.junit.runner.RunWith
import java.io.File
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

@RunWith(AndroidJUnit4::class)
@androidx.annotation.OptIn(UnstableApi::class)
class MediaPipelineTest {
    private val instrumentation=InstrumentationRegistry.getInstrumentation()
    private val context=instrumentation.targetContext
    private val files=MediaFiles(context)
    private val created=mutableListOf<Uri>()
    @Before fun permissions(){if(Build.VERSION.SDK_INT<=28)for(permission in listOf(Manifest.permission.READ_EXTERNAL_STORAGE,Manifest.permission.WRITE_EXTERNAL_STORAGE))instrumentation.uiAutomation.grantRuntimePermission(context.packageName,permission)}
    @After fun cleanup(){created.forEach{context.contentResolver.delete(it,null,null)}}
    private fun photo():String {val file=File(File(files.root,"photos").apply{mkdirs()},"native-test.jpg");val bitmap=Bitmap.createBitmap(240,180,Bitmap.Config.ARGB_8888)
        val pixels=IntArray(240*180){i->Color.rgb(70+i%240/2,100,120)};bitmap.setPixels(pixels,0,240,0,0,240,180);file.outputStream().use{bitmap.compress(Bitmap.CompressFormat.JPEG,95,it)};bitmap.recycle();return Uri.fromFile(file).toString()}
    @Test fun photographsLayoutsAndGalleryDeletion(){val uri=photo();val engine=PhotoEngine(context,files)
        for(layout in listOf("single","polaroid","strip","collage")){val count=if(layout=="strip")4 else if(layout=="collage")2 else 1
            val result=engine.render(List(count){uri},mapOf("layout" to layout,"dateEnabled" to false,"warmth" to .4,"grainIntensity" to .05))
            val output=Uri.parse(result["outputUri"] as String);created.add(output);assertTrue((result["width"] as Int)>0);assertTrue((result["height"] as Int)>0)
            assertTrue(files.library().any{it["uri"]==output.toString()});files.deleteSaved(output.toString());created.remove(output);assertFalse(files.library().any{it["uri"]==output.toString()})
        }
        files.deleteSource(uri);assertFalse(File(Uri.parse(uri).path!!).exists())
    }
    @Test fun privateDeletionCannotReachCatalogOrOutsideFiles(){val catalog=File(files.root,"current.json").apply{writeText("preserve")}
        try{files.deleteSource(Uri.fromFile(catalog).toString());fail("must refuse catalog deletion")}catch(_:IllegalArgumentException){}
        assertEquals("preserve",catalog.readText())
        try{files.deleteSaved("content://media/external/video/media/999999");fail("must refuse unrelated media")}catch(_:IllegalArgumentException){}
    }
    @Test fun vintageAudioDoesNotInventCrackleInSilence(){val audio=VintageAudioProcessor();audio.configure(AudioProcessor.AudioFormat(48000,2,C.ENCODING_PCM_16BIT));audio.flush()
        val input=ByteBuffer.allocateDirect(4096).order(ByteOrder.nativeOrder());while(input.hasRemaining())input.putShort(0);input.flip();audio.queueInput(input);val out=audio.output.order(ByteOrder.nativeOrder());while(out.hasRemaining())assertEquals(0,out.short.toInt());audio.reset()}
    @Test fun syntheticVideoExportContainsThreeClipsEffectAndRealAudio(){
        val clips=(1..3).map{i->val source=File(context.cacheDir,"native-$i.mp4");instrumentation.context.assets.open("clip-$i.mp4").use{input->source.outputStream().use{input.copyTo(it)}};files.commit(source.path,"video")["uri"] as String}
        val sound=AudioTools.analyze(files.privateFile(clips[0]));assertEquals(true,sound["hasAudio"]);assertTrue((sound["rmsDb"] as Double)>-35)
        val result=ResultPromise();val exporter=VideoExporter(context,files)
        try{exporter.export(mapOf("inputUris" to clips,"quality" to "720","aspect" to "9:16","audioMode" to "live","showRec" to true,"dateEnabled" to true,"dateText" to "NATIVE TEST","warmth" to .3,"grainIntensity" to .06),result)
            assertTrue("native export timed out",result.done.await(120,TimeUnit.SECONDS));result.error?.let{throw AssertionError("native export failed",it)}
            @Suppress("UNCHECKED_CAST") val value=result.value as Map<String,Any>;assertEquals(true,value["success"]);assertEquals(true,value["hasAudio"])
            val duration=(value["durationMs"] as Number).toLong();assertTrue("duration $duration",duration in 1200..1900)
            assertEquals(720,(value["width"] as Number).toInt());assertEquals(1280,(value["height"] as Number).toInt())
            val uri=Uri.parse(value["outputUri"] as String);created.add(uri)
            val copy=File(context.cacheDir,"exported-test.mp4");context.contentResolver.openInputStream(uri)!!.use{input->copy.outputStream().use{input.copyTo(it)}}
            val after=AudioTools.analyze(copy);assertEquals(true,after["hasAudio"]);assertTrue((after["rmsDb"] as Double)>-35);assertEquals(48000,after["sampleRate"])
            val reader=android.media.MediaMetadataRetriever()
            try{reader.setDataSource(copy.path);val frame=reader.getFrameAtTime(250000,android.media.MediaMetadataRetriever.OPTION_CLOSEST_SYNC)!!
                val center=frame.getPixel(frame.width/2,frame.height/2);assertTrue("warmth must change gray source",Color.red(center)>Color.blue(center)+4);frame.recycle()
            }finally{reader.release()}
            assertTrue(files.library().any{it["uri"]==uri.toString()});files.deleteSaved(uri.toString());created.remove(uri)
        }finally{exporter.close();clips.forEach{files.deleteSource(it)}}
    }
    private class ResultPromise:Promise {
        val done=CountDownLatch(1);var value:Any?=null;var error:Throwable?=null
        override fun resolve(value:Any?){this.value=value;done.countDown()}
        override fun reject(code:String,message:String?,cause:Throwable?){error=cause?:IllegalStateException("$code: $message");done.countDown()}
    }
}
