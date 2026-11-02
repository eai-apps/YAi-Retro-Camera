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
            extractor.selectTrack(track);val format=extractor.getTrackFormat(track);val mime=format.getString(MediaFormat.KEY_MIME)!!
            val rate=format.getInteger(MediaFormat.KEY_SAMPLE_RATE);val channels=format.getInteger(MediaFormat.KEY_CHANNEL_COUNT)
            val decoder=MediaCodec.createDecoderByType(mime);codec=decoder;decoder.configure(format,null,null,0);decoder.start()
            val info=MediaCodec.BufferInfo();var ended=false;var count=0L;var square=0.0;var peak=0.0;var encoding=2
            var steps=0;while(steps++<1500&&count<rate.toLong()*channels*3){
                if(!ended){val input=decoder.dequeueInputBuffer(10000);if(input>=0){val buffer=decoder.getInputBuffer(input)!!;val n=extractor.readSampleData(buffer,0)
                    if(n<0||extractor.sampleTime>3_000_000){decoder.queueInputBuffer(input,0,0,0,MediaCodec.BUFFER_FLAG_END_OF_STREAM);ended=true}
                    else{decoder.queueInputBuffer(input,0,n,extractor.sampleTime,0);extractor.advance()}}}
                val out=decoder.dequeueOutputBuffer(info,10000)
                if(out==MediaCodec.INFO_OUTPUT_FORMAT_CHANGED){encoding=if(decoder.outputFormat.containsKey("pcm-encoding"))decoder.outputFormat.getInteger("pcm-encoding")else 2}
                if(out>=0){val data=decoder.getOutputBuffer(out)!!.order(ByteOrder.LITTLE_ENDIAN);data.position(info.offset);data.limit(info.offset+info.size)
                    while(data.remaining()>=(if(encoding==4)4 else 2)){val v=if(encoding==4)data.float.toDouble() else data.short/32768.0;square+=v*v;peak=max(peak,abs(v));count++}
                    decoder.releaseOutputBuffer(out,false);if(info.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM!=0)break}
            }
            require(count>0){"Аудиодорожка есть, но её не удалось декодировать для измерения"}
            return mapOf("hasAudio" to true,"rmsDb" to (20*log10(max(1e-6,sqrt(square/max(1L,count))))),"peakDb" to (20*log10(max(1e-6,peak))),"sampleRate" to rate,"channels" to channels,"codec" to mime,"secondsAnalyzed" to count.toDouble()/rate/channels)
        }finally{try{codec?.stop()}catch(_:Exception){};codec?.release();extractor.release()}
    }
}
