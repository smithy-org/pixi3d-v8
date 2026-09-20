import { Renderer, WebGLRenderer } from "pixi.js"
import { getGlContext } from "./compatibility/gl-context"

export namespace Capabilities {
  let _maxVertexUniformVectors: number | undefined

  export function getMaxVertexUniformVectors(renderer: Renderer) {
    if (_maxVertexUniformVectors !== undefined) {
      return _maxVertexUniformVectors
    }
    const gl = getGlContext(renderer)
    _maxVertexUniformVectors = <number>gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS)
    return _maxVertexUniformVectors
  }

  let _isFloatTextureSupported: boolean | undefined

  export function isFloatingPointTextureSupported(renderer: Renderer) {
    const context = (<WebGLRenderer>renderer).context
    if (context.webGLVersion === 2) {
      return true
    }
    if (_isFloatTextureSupported !== undefined) {
      return _isFloatTextureSupported
    }
    // v8 already probes and exposes this extension on the context system;
    // no need to call gl.getExtension ourselves.
    _isFloatTextureSupported = !!context.extensions.floatTexture
    return _isFloatTextureSupported
  }

  let _isHalfFloatFramebufferSupported: boolean | undefined

  export function isHalfFloatFramebufferSupported(renderer: Renderer) {
    const context = (<WebGLRenderer>renderer).context
    if (context.webGLVersion === 2) {
      return true
    }
    if (_isHalfFloatFramebufferSupported !== undefined) {
      return _isHalfFloatFramebufferSupported
    }
    const ext = context.extensions.textureHalfFloat
    if (!ext) {
      return false
    }
    _isHalfFloatFramebufferSupported = isRenderableColorType(getGlContext(renderer), ext.HALF_FLOAT_OES)
    return _isHalfFloatFramebufferSupported
  }

  /**
   * Returns whether a framebuffer with an RGBA color texture of the given
   * type is complete. The texture and framebuffer bindings are restored
   * afterwards, so the renderer's record of them stays true.
   * @param gl The WebGL context.
   * @param type The texture type.
   */
  function isRenderableColorType(gl: WebGLRenderingContext | WebGL2RenderingContext, type: number) {
    const previousTexture = gl.getParameter(gl.TEXTURE_BINDING_2D)
    const previousFramebuffer = gl.getParameter(gl.FRAMEBUFFER_BINDING)
    const texture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 8, 8, 0, gl.RGBA, type, null)
    const framebuffer = gl.createFramebuffer()
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)
    const complete = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE
    gl.bindFramebuffer(gl.FRAMEBUFFER, previousFramebuffer)
    gl.bindTexture(gl.TEXTURE_2D, previousTexture)
    gl.deleteFramebuffer(framebuffer)
    gl.deleteTexture(texture)
    return complete
  }

  let _isFloatFramebufferSupported: boolean | undefined

  export function isFloatFramebufferSupported(renderer: Renderer) {
    const context = (<WebGLRenderer>renderer).context
    if (context.webGLVersion === 2) {
      return true
    }
    if (_isFloatFramebufferSupported !== undefined) {
      return _isFloatFramebufferSupported
    }
    if (!context.extensions.floatTexture) {
      return false
    }
    const gl = getGlContext(renderer)
    _isFloatFramebufferSupported = isRenderableColorType(gl, gl.FLOAT)
    return _isFloatFramebufferSupported
  }

  let _isFloatLinearSupported: boolean | undefined

  export function supportsFloatLinear(renderer: Renderer) {
    if (_isFloatLinearSupported !== undefined) {
      return _isFloatLinearSupported
    }
    const context = (<WebGLRenderer>renderer).context
    _isFloatLinearSupported = !!context.extensions.floatTextureLinear
    return _isFloatLinearSupported
  }

  export function isShaderTextureLodSupported(renderer: Renderer) {
    const context = (<WebGLRenderer>renderer).context
    if (context.webGLVersion === 2) {
      return true
    }
    // v8's WebGLExtensions map doesn't carry EXT_shader_texture_lod (it's
    // niche and unused elsewhere in v8 core), so this one still queries gl
    // directly rather than a context.extensions field.
    return getGlContext(renderer).getExtension("EXT_shader_texture_lod") !== null
  }

  let _isInstancingSupported: boolean | undefined

  export function isInstancingSupported(renderer: Renderer) {
    if (_isInstancingSupported !== undefined) {
      return _isInstancingSupported
    }
    const context = (<WebGLRenderer>renderer).context
    // WebGL2 (v8's default/preferred context) has instancing in core, no
    // extension needed; v7's ANGLE_instanced_arrays check only applied to
    // WebGL1 fallback.
    _isInstancingSupported = context.webGLVersion === 2 || !!context.extensions.vertexAttribDivisorANGLE
    return _isInstancingSupported
  }
}
