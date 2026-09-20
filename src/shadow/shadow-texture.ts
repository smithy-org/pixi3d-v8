import { RenderTexture, WebGLRenderer } from "pixi.js"
import type { SCALE_MODE, TEXTURE_FORMATS } from "pixi.js"
import { Capabilities } from "../capabilities"
import { ShadowQuality } from "./shadow-quality"
import { FLOAT_UPLOAD_METHOD_ID } from "../compatibility/float-texture-uploader"

export namespace ShadowTexture {
  export function create(renderer: WebGLRenderer, size: number, quality: ShadowQuality) {
    const format = getSupportedFormat(renderer, quality)
    const texture = RenderTexture.create({
      width: size,
      height: size,
      resolution: 1,
      format,
      scaleMode: getSupportedScaleMode(renderer),
      autoGenerateMipmaps: false,
    })
    if (format !== "rgba8unorm") {
      // Allocated by Pixi3D's float uploader, which also handles WebGL 1.
      texture.source.uploadMethodId = FLOAT_UPLOAD_METHOD_ID
    }
    return texture
  }

  function getSupportedScaleMode(renderer: WebGLRenderer): SCALE_MODE {
    if (Capabilities.supportsFloatLinear(renderer)) {
      return "linear"
    }
    return "nearest"
  }

  function getSupportedFormat(renderer: WebGLRenderer, quality: ShadowQuality): TEXTURE_FORMATS {
    if (quality === ShadowQuality.high) {
      if (Capabilities.isFloatFramebufferSupported(renderer)) {
        return "rgba32float"
      }
      if (Capabilities.isHalfFloatFramebufferSupported(renderer)) {
        return "rgba16float"
      }
    }
    if (quality === ShadowQuality.medium && Capabilities.isHalfFloatFramebufferSupported(renderer)) {
      return "rgba16float"
    }
    return "rgba8unorm"
  }
}
