package expo.modules.retroexport

import androidx.media3.common.util.GlProgram
import androidx.media3.common.util.UnstableApi
import kotlin.math.*

@androidx.annotation.OptIn(UnstableApi::class)
class FxConfig(options: Map<String, Any?>) {
    val values=FloatArray(EffectParameters.names.size) { i ->
        val value=(options[EffectParameters.names[i]] as? Number)?.toFloat() ?: EffectParameters.defaults[i]
        require(value.isFinite() && value in EffectParameters.minimum[i]..EffectParameters.maximum[i]) { "Некорректный эффект: ${EffectParameters.names[i]}" }; value
    }
    operator fun get(name:String)=values[EffectParameters.names.indexOf(name)]
    fun bind(program:GlProgram) { EffectParameters.names.forEachIndexed { i,name -> program.setFloatUniform("u"+name.replaceFirstChar { it.uppercase() },values[i]) } }
    private val warmth=this["warmth"]
    private val contrast=this["contrast"]
    private val saturation=this["saturation"]
    private val grainIntensity=this["grainIntensity"]
    private val grainScale=this["grainScale"]
    private val vignette=this["vignette"]
    private val dust=this["dust"]
    private val scratches=this["scratches"]
    private val leak=this["leak"]
    private val scanlines=this["scanlines"]
    private val red=this["red"]
    private val green=this["green"]
    private val blue=this["blue"]
    private val frame=this["frame"]
    private val fade=this["fade"]
    private val lutOffset=EffectParameters.names.indexOf("lut0")
    private fun lut(v:Float):Float {val x=v.coerceIn(0f,1f)*4;val i=min(3,floor(x).toInt());val f=x-i;return values[lutOffset+i]*(1-f)+values[lutOffset+i+1]*f}
    fun pixel(color:Int,x:Int,y:Int,width:Int,height:Int):Int {
        val uvx=x.toFloat()/width;val uvy=y.toFloat()/height

        if(frame>2.5f&&(uvx<.045||uvx>.955||uvy<.04||uvy>.84))return 0xfff8f6ee.toInt()
        if(frame>.5&&frame<1.5&&(uvx<.025||uvx>.975))return 0xff101010.toInt()
        if(frame>1.5&&frame<2.5&&(uvy<.012||uvy>.988))return 0xff090909.toInt()
        var r=(lut(linear[(color ushr 16) and 255])*red+.1f*warmth-.5f)*contrast+.5f
        var g=(lut(linear[(color ushr 8) and 255])*green+.02f*warmth-.5f)*contrast+.5f
        var b=(lut(linear[color and 255])*blue-.08f*warmth-.5f)*contrast+.5f
        val l=.2126f*r+.7152f*g+.0722f*b;val s=saturation
        r=(l+(r-l)*s)*(1-fade)+.55f*fade;g=(l+(g-l)*s)*(1-fade)+.52f*fade;b=(l+(b-l)*s)*(1-fade)+.48f*fade
        val grain=hash(floor(x/grainScale),floor(y/grainScale),0f)*grainIntensity*max(1-2*abs(l-.5f),.35f)
        val edge=min(1f,sqrt((uvx-.5f).pow(2)+(uvy-.5f).pow(2))*1.4f);val shade=1-vignette*edge*edge
        val leakAmount=max(0f,1-uvx*3).pow(3)*leak*.7f
        val dustAmount=if(hash(floor(x/70f),floor(y/70f),0f)>.97f&&hypot(x%70-35f,y%70-35f)<1.4f)dust*.65f else 0f
        val scratch=if(hash(floor(x/2f),7f,0f)>.997)scratches*.35f else 0f
        val scan=1-scanlines*(.5f+.5f*sin((y+.5f)*3.14159f))*.22f
        fun out(v:Float,leakGain:Float):Int {val value=(((v+grain)*shade+leakAmount*leakGain+dustAmount+scratch)*scan).coerceIn(0f,1f);return encoded[(value*4096).toInt()]}
        return (255 shl 24) or (out(r,.8f) shl 16) or (out(g,.18f) shl 8) or out(b,.04f)
    }
    companion object {
        val linear=FloatArray(256){val s=it/255f;if(s<=.04045f)s/12.92f else ((s+.055f)/1.055f).pow(2.4f)}
        val encoded=IntArray(4097){val l=it/4096f;((if(l<=.0031308f)l*12.92f else 1.055f*l.pow(1f/2.4f)-.055f)*255).roundToInt().coerceIn(0,255)}
        fun hash(x:Float,y:Float,t:Float):Float {var v=(x*197+y*233+(t%1024)*277)%4093;v=(v*(v+131))%4093;return v/2046-1}
    }
}
