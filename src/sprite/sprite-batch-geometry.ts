import { Buffer, BufferUsage, Geometry } from "pixi.js"

const placeholderAttributeData = new Float32Array(1)
const placeholderIndexData = new Uint32Array(1)

/**
 * The interleaved vertex layout of the sprite batch: PixiJS' 2D batch layout
 * (position, texture coordinates, color, texture id) followed by the
 * sprite's model-view-projection matrix, as four columns.
 */
export class SpriteBatchGeometry extends Geometry {
  /** Floats per vertex: 6 for the 2D batch layout, 16 for the matrix. */
  static readonly vertexSize = 6 + 16

  constructor() {
    const attributeBuffer = new Buffer({
      data: placeholderAttributeData,
      label: "pixi3d-sprite-batch-attributes",
      usage: BufferUsage.VERTEX | BufferUsage.COPY_DST,
      shrinkToFit: false,
    })
    const indexBuffer = new Buffer({
      data: placeholderIndexData,
      label: "pixi3d-sprite-batch-indices",
      usage: BufferUsage.INDEX | BufferUsage.COPY_DST,
      shrinkToFit: false,
    })
    const stride = SpriteBatchGeometry.vertexSize * 4
    super({
      attributes: {
        aVertexPosition: { buffer: attributeBuffer, format: "float32x2", stride, offset: 0 },
        aTextureCoord: { buffer: attributeBuffer, format: "float32x2", stride, offset: 2 * 4 },
        aColor: { buffer: attributeBuffer, format: "unorm8x4", stride, offset: 4 * 4 },
        aTextureId: { buffer: attributeBuffer, format: "float32", stride, offset: 5 * 4 },
        aMatrix0: { buffer: attributeBuffer, format: "float32x4", stride, offset: 6 * 4 },
        aMatrix1: { buffer: attributeBuffer, format: "float32x4", stride, offset: 10 * 4 },
        aMatrix2: { buffer: attributeBuffer, format: "float32x4", stride, offset: 14 * 4 },
        aMatrix3: { buffer: attributeBuffer, format: "float32x4", stride, offset: 18 * 4 },
      },
      indexBuffer,
    })
  }
}
