package expo.modules.retroexport
import android.content.Context
import androidx.media3.effect.GlEffect
import androidx.media3.effect.GlShaderProgram
import androidx.media3.common.util.UnstableApi
@androidx.annotation.OptIn(UnstableApi::class)
class WarmFilmGlEffect(private val config:FxConfig):GlEffect {
    override fun toGlShaderProgram(context:Context,useHdr:Boolean):GlShaderProgram=WarmFilmShaderProgram(context,useHdr,config)
}
