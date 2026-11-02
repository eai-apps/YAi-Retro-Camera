package expo.modules.retroexport

import android.content.Context
import android.opengl.GLES20
import androidx.media3.common.VideoFrameProcessingException
import androidx.media3.common.util.GlProgram
import androidx.media3.common.util.GlUtil
import androidx.media3.common.util.Size
import androidx.media3.common.util.UnstableApi
import androidx.media3.effect.BaseGlShaderProgram

@androidx.annotation.OptIn(UnstableApi::class)
class WarmFilmShaderProgram(
    context: Context, useHdr: Boolean, private val config: FxConfig
) : BaseGlShaderProgram(useHdr, 1) {
    private val program = GlProgram(WarmFilmShaderSource.VERTEX, WarmFilmShaderSource.FRAGMENT)
    init {
        require(!useHdr) { "Для HDR сначала требуется преобразование в SDR" }
        program.setBufferAttribute("aFramePosition", GlUtil.getNormalizedCoordinateBounds(), GlUtil.HOMOGENEOUS_COORDINATE_VECTOR_SIZE)
    }
    override fun configure(inputWidth: Int, inputHeight: Int): Size {
        program.setFloatsUniform("uResolution", floatArrayOf(inputWidth.toFloat(), inputHeight.toFloat()))
        return Size(inputWidth, inputHeight)
    }
    override fun drawFrame(inputTexId: Int, presentationTimeUs: Long) {
        try {
            program.use()
            program.setSamplerTexIdUniform("uTexSampler", inputTexId, 0)
            program.setFloatUniform("uTime", ((presentationTimeUs / 1000L) % 4096000L).toFloat() / 1000f)
            config.bind(program)
            program.bindAttributesAndUniforms()
            GLES20.glDrawArrays(GLES20.GL_TRIANGLE_STRIP, 0, 4)
            GlUtil.checkGlError()
        } catch (e: GlUtil.GlException) { throw VideoFrameProcessingException(e, presentationTimeUs) }
    }
    override fun release() {
        super.release()
        try { program.delete() } catch (e: GlUtil.GlException) { throw VideoFrameProcessingException(e) }
    }
}
