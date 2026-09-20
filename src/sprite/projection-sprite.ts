import { Sprite, Texture } from "pixi.js"
import { Matrix4x4 } from "../transform/matrix"

/**
 * The flat sprite behind a `Sprite3D`. It keeps the texture, anchor, tint and
 * blend mode with PixiJS' own sprite semantics, plus the quad and the matrix
 * the sprite batch renderer draws it with. It is never part of a scene.
 */
export class ProjectionSprite extends Sprite {
  private _pixelsPerUnit = 100

  /**
   * Squared distance from the camera along the camera's forward axis, used
   * for drawing sprites back to front.
   */
  distanceFromCamera = 0

  /** Transforms the quad from the sprite's local units to clip space. */
  modelViewProjection = new Matrix4x4()

  /**
   * The quad's corners in the sprite's local units, x and y for the top left,
   * top right, bottom right and bottom left corners. Set by
   * `calculateVertices`.
   */
  vertexData = new Float32Array(8)

  /** The alpha of the `Sprite3D` drawing this sprite, including its ancestors'. */
  worldAlpha = 1

  constructor(texture?: Texture) {
    super(texture)
    // A sprite in 3D space has its own blend mode, as it did in PixiJS v7,
    // rather than inheriting one from the containers above it.
    this.blendMode = "normal"
  }

  get pixelsPerUnit() {
    return this._pixelsPerUnit
  }

  set pixelsPerUnit(value: number) {
    this._pixelsPerUnit = value
  }

  /**
   * Updates `vertexData` from the texture's size and trim, the anchor and
   * `pixelsPerUnit`. The y axis points up, as it does in 3D, while the image
   * rows run down.
   * @param resolution The resolution to round the corners to when
   * `roundPixels` is set.
   */
  calculateVertices(resolution = 1) {
    const { minX, maxX, minY, maxY } = this.visualBounds
    const pixelsPerUnit = this._pixelsPerUnit
    const vertexData = this.vertexData

    vertexData[0] = minX / pixelsPerUnit
    vertexData[1] = -minY / pixelsPerUnit

    vertexData[2] = maxX / pixelsPerUnit
    vertexData[3] = -minY / pixelsPerUnit

    vertexData[4] = maxX / pixelsPerUnit
    vertexData[5] = -maxY / pixelsPerUnit

    vertexData[6] = minX / pixelsPerUnit
    vertexData[7] = -maxY / pixelsPerUnit

    if (this.roundPixels) {
      for (let i = 0; i < vertexData.length; ++i) {
        vertexData[i] = Math.round((vertexData[i] * resolution | 0) / resolution)
      }
    }
  }
}
