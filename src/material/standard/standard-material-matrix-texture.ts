import { BufferImageSource, Texture, Renderer } from "pixi.js"
import { Capabilities } from "../../capabilities"
import { FLOAT_UPLOAD_METHOD_ID } from "../../compatibility/float-texture-uploader"

export class StandardMaterialMatrixTexture extends Texture {
  private _buffer: Float32Array
  private _bufferSource: BufferImageSource

  static isSupported(renderer: Renderer) {
    return Capabilities.isFloatingPointTextureSupported(renderer)
  }

  constructor(matrixCount: number) {
    let buffer = new Float32Array(matrixCount * 16)
    // v8's BufferImageSource takes a TypedArray resource directly and infers
    // pixel format from its type (Float32Array -> 'rgba32float'), replacing
    // v7's BaseTexture(BufferResource, {format: FORMATS.RGBA, type: TYPES.FLOAT}).
    let source = new BufferImageSource({
      resource: buffer,
      width: 4,
      height: matrixCount,
      autoGenerateMipmaps: false,
      wrapMode: "clamp-to-edge",
      scaleMode: "nearest",
      alphaMode: "no-premultiply-alpha",
      resolution: 1,
    })
    // Uploaded by Pixi3D's float uploader, which also handles WebGL 1.
    source.uploadMethodId = FLOAT_UPLOAD_METHOD_ID
    super({ source })
    this._buffer = buffer
    this._bufferSource = source
  }

  updateBuffer(buffer: Float32Array) {
    this._buffer.set(buffer)
    this._bufferSource.update()
  }
}
