package expo.modules.retroexport

import android.content.Context
import androidx.annotation.OptIn
import androidx.media3.common.util.UnstableApi
import androidx.media3.effect.GlEffect
import androidx.media3.effect.GlShaderProgram

/**
 * AndroidX Media3 GlEffect для применения кинематографичной цветокоррекции
 * «Тёплая плёнка» и процедурного анимированного зерна на GPU во время нативного экспорта.
 */
@OptIn(UnstableApi::class)
class WarmFilmGlEffect(
    val warmth: Float,
    val contrast: Float,
    val saturation: Float,
    val grainIntensity: Float,
    val grainScale: Float,
    val grainSpeed: Float
) : GlEffect {

    override fun toGlShaderProgram(context: Context, useHdr: Boolean): GlShaderProgram {
        return WarmFilmShaderProgram(
            context = context,
            useHdr = useHdr,
            warmth = warmth,
            contrast = contrast,
            saturation = saturation,
            grainIntensity = grainIntensity,
            grainScale = grainScale,
            grainSpeed = grainSpeed
        )
    }
}
