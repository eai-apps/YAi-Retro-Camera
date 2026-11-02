package expo.modules.retroexport

import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import androidx.media3.common.C
import androidx.media3.common.audio.AudioProcessor
import androidx.media3.common.audio.BaseAudioProcessor
import androidx.media3.common.util.UnstableApi
import java.io.File
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.math.*

@androidx.annotation.OptIn(UnstableApi::class)
class VintageAudioProcessor:BaseAudioProcessor(){
    private var previous=FloatArray(2)
    override fun onConfigure(input:AudioProcessor.AudioFormat):AudioProcessor.AudioFormat {
        if(input.encoding!=C.ENCODING_PCM_16BIT)throw AudioProcessor.UnhandledAudioFormatException(input)
        previous=FloatArray(input.channelCount);return input
    }
    override fun queueInput(input:ByteBuffer){val output=replaceOutputBuffer(input.remaining());var channel=0
        while(input.remaining()>=2){val sample=input.short.toFloat();val value=previous[channel]+.24f*(sample-previous[channel]);previous[channel]=value
            output.putShort(value.toInt().coerceIn(-31000,31000).toShort());channel=(channel+1)%previous.size};output.flip()}
    override fun onFlush(){previous.fill(0f)}
}

object AudioTools {
    fun analyze(file:File):Map<String,Any> {
        val extractor=MediaExtractor();var codec:MediaCodec?=null
        try{extractor.setDataSource(file.path);val track=(0 until extractor.trackCount).firstOrNull{extractor.getTrackFormat(it).getString(MediaFormat.KEY_MIME)?.startsWith("audio/")==true}
            ?:return mapOf("hasAudio" to false,"rmsDb" to -120,"peakDb" to -120)
            extractor.selectTrack(track)
            extractor.seekTo(0,MediaExtractor.SEEK_TO_CLOSEST_SYNC)
            val format=extractor.getTrackFormat(track);val mime=format.getString(MediaFormat.KEY_MIME)!!
            var rate=format.getInteger(MediaFormat.KEY_SAMPLE_RATE);var channels=format.getInteger(MediaFormat.KEY_CHANNEL_COUNT)
            // Decode raw PCM for the meter. Do not apply container edit/gapless
            // metadata a second time in the codec (older AAC decoders can trim
            // every sample of a short clip). Keep the actual codec configuration.
            val raw=MediaFormat.createAudioFormat(mime,rate,channels)
            for(i in 0..2){val key="csd-$i";format.getByteBuffer(key)?.let{source->
                val bytes=source.duplicate();bytes.rewind();raw.setByteBuffer(key,bytes)
            }}
            raw.setInteger("pcm-encoding",C.ENCODING_PCM_16BIT)
            val decoder=MediaCodec.createDecoderByType(mime);codec=decoder
            decoder.configure(raw,null,null,0);decoder.start()
            val info=MediaCodec.BufferInfo();var ended=false;var count=0L;var square=0.0;var peak=0.0;var encoding=C.ENCODING_PCM_16BIT
            var firstTime:Long?=null;var lastTime=0L;var packets=0;var buffers=0
            var steps=0
            while(steps++<1500&&count<rate.toLong()*channels*3){
                if(!ended){val input=decoder.dequeueInputBuffer(10000)
                    if(input>=0){
                        val buffer=decoder.getInputBuffer(input)!!;buffer.clear()
                        val n=extractor.readSampleData(buffer,0);val sampleTime=extractor.sampleTime
                        if(firstTime==null&&n>=0)firstTime=sampleTime
                        val relative=sampleTime-(firstTime?:0L)
                        if(n<0||relative>3_000_000){
                            decoder.queueInputBuffer(input,0,0,lastTime+1024_000_000L/rate,MediaCodec.BUFFER_FLAG_END_OF_STREAM)
                            ended=true
                        }else{
                            lastTime=relative.coerceAtLeast(0)
                            decoder.queueInputBuffer(input,0,n,lastTime,0);packets++;extractor.advance()
                        }
                    }
                }
                val out=decoder.dequeueOutputBuffer(info,10000)
                if(out==MediaCodec.INFO_OUTPUT_FORMAT_CHANGED){
                    val output=decoder.outputFormat
                    encoding=if(output.containsKey("pcm-encoding"))output.getInteger("pcm-encoding")else C.ENCODING_PCM_16BIT
                    rate=output.getInteger(MediaFormat.KEY_SAMPLE_RATE);channels=output.getInteger(MediaFormat.KEY_CHANNEL_COUNT)
                    require(encoding==C.ENCODING_PCM_16BIT||encoding==C.ENCODING_PCM_FLOAT){"Этот PCM-формат не поддерживает измерение уровня"}
                }
                if(out>=0){
                    if(info.size>0){
                        val data=decoder.getOutputBuffer(out)!!.duplicate().order(ByteOrder.LITTLE_ENDIAN)
                        data.position(info.offset);data.limit(info.offset+info.size);buffers++
                        while(data.remaining()>=(if(encoding==C.ENCODING_PCM_FLOAT)4 else 2)&&count<rate.toLong()*channels*3){
                            val v=if(encoding==C.ENCODING_PCM_FLOAT)data.float.toDouble()else data.short/32768.0
                            square+=v*v;peak=max(peak,abs(v));count++
                        }
                    }
                    decoder.releaseOutputBuffer(out,false)
                    if(info.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM!=0)break
                }
            }
            if(count==0L)android.util.Log.w("RetroAudio","Empty decoded PCM: mime=$mime packets=$packets buffers=$buffers")
            require(count>0){"Аудиодорожка есть, но её не удалось декодировать для измерения"}
            return mapOf("hasAudio" to true,"rmsDb" to (20*log10(max(1e-6,sqrt(square/max(1L,count))))),"peakDb" to (20*log10(max(1e-6,peak))),"sampleRate" to rate,"channels" to channels,"codec" to mime,"secondsAnalyzed" to count.toDouble()/rate/channels)
        }finally{try{codec?.stop()}catch(_:Exception){};codec?.release();extractor.release()}
    }
}
