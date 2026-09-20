import { ExtensionType, extensions } from "pixi.js"
import type { GlTexture, GLTextureUploader, TextureSource } from "pixi.js"

/** The half float type of WebGL 1's `OES_texture_half_float`. */
const HALF_FLOAT_OES = 0x8D61

/** The `uploadMethodId` of float texture sources (see below). */
export const FLOAT_UPLOAD_METHOD_ID = "pixi3d-float"

/**
 * Allocates and uploads float textures (`rgba16float`, `rgba32float`), with
 * data or without (render targets). PixiJS v8 does this for WebGL 2 only: on
 * WebGL 1 it passes WebGL 2's sized internal formats and has no half float
 * type. Here WebGL 1 gets the unsized format and the extensions' types, as
 * it did from PixiJS v7. Registered as a WebGL texture uploader extension,
 * so this module must be imported before the renderer is created.
 */
const floatUploader: GLTextureUploader & { extension: unknown } = {
  extension: { type: ExtensionType.TextureUploaderWebGL, name: FLOAT_UPLOAD_METHOD_ID },
  id: FLOAT_UPLOAD_METHOD_ID,
  upload(source: TextureSource, glTexture: GlTexture, gl: WebGLRenderingContext | WebGL2RenderingContext, webGLVersion: number) {
    const webGL1 = webGLVersion === 1
    const internalFormat = webGL1 ? glTexture.format : glTexture.internalFormat
    const type = webGL1 && source.format === "rgba16float" ? HALF_FLOAT_OES : glTexture.type
    const data = ArrayBuffer.isView(source.resource) ? source.resource : null
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, source.pixelWidth, source.pixelHeight,
      0, glTexture.format, type, data)
    glTexture.width = source.pixelWidth
    glTexture.height = source.pixelHeight
  }
}

extensions.add(floatUploader)
