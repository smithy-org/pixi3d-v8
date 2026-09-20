import { ColorSource, DestroyOptions, InstructionSet, ObservablePoint, Renderer, RenderLayer, Texture } from "pixi.js"
import type { BLEND_MODES } from "pixi.js"
import { Camera } from "../camera/camera"
import { Mat4 } from "../math/mat4"
import { Vec3 } from "../math/vec3"
import { SpriteBillboardType } from "./sprite-billboard-type"
import { Container3D } from "../container"
import { ProjectionSprite } from "./projection-sprite"

const vec3 = new Float32Array(3)

/**
 * Represents a sprite in 3D space.
 */
export class Sprite3D extends Container3D {
  /**
   * The name of the render pipe that draws the sprite. Sprites are drawn by
   * the standard pipeline, after the meshes and sorted back to front.
   */
  renderPipeId = "pipeline"

  private _sprite: ProjectionSprite
  private _modelView = new Float32Array(16)
  private _cameraTransformId?: number
  private _billboardType?: SpriteBillboardType
  private _parentID?: number

  /**
   * The camera used when rendering the sprite. Uses main camera by default.
   */
  camera?: Camera

  /**
   * Creates a new sprite using the specified texture.
   * @param texture The texture to use.
   */
  constructor(texture?: Texture) {
    super()
    this._sprite = new ProjectionSprite(texture)
    this._sprite.anchor.set(0.5)
  }

  /**
   * The billboard type to use when rendering the sprite. Used for making the
   * sprite always face the viewer.
   */
  get billboardType() {
    return this._billboardType
  }

  set billboardType(value: SpriteBillboardType | undefined) {
    if (value !== this._billboardType) {
      this._billboardType = value
      this._cameraTransformId = undefined
    }
  }

  /** Defines the size of the sprite relative to a unit in world space. */
  get pixelsPerUnit() {
    return this._sprite.pixelsPerUnit
  }

  set pixelsPerUnit(value: number) {
    this._sprite.pixelsPerUnit = value
  }

  /** Used for sorting the sprite before render. */
  get renderSortOrder() {
    return this._sprite.zIndex
  }

  set renderSortOrder(value: number) {
    this._sprite.zIndex = value
  }

  /**
   * The tint applied to the sprite. This is a hex value. A value of 0xFFFFFF
   * will remove any tint effect. It tints this sprite only, not its children.
   */
  get tint(): number {
    return this._sprite.tint
  }

  set tint(value: ColorSource) {
    this._sprite.tint = value
  }

  /** The flat sprite the sprite batch renderer draws. */
  get projectionSprite() {
    return this._sprite
  }

  /**
   * Destroys this sprite and optionally its texture and children.
   */
  destroy(options?: boolean | DestroyOptions) {
    super.destroy(options)
    this._sprite.destroy(options)
  }

  /**
   * Hands the sprite to its render pipe while the renderer builds its
   * instruction set, then lets the children collect themselves as usual.
   * @internal
   */
  collectRenderablesSimple(instructionSet: InstructionSet, renderer: Renderer, currentLayer: RenderLayer): void {
    const pipe = (<any>renderer.renderPipes)[this.renderPipeId]
    if (pipe?.addRenderable) {
      pipe.addRenderable(this, instructionSet)
    }
    super.collectRenderablesSimple(instructionSet, renderer, currentLayer)
  }

  /**
   * Brings the sprite's projection up to date with its camera: the
   * model-view-projection matrix (with the billboard applied), the distance
   * used for sorting, the quad and the alpha. The standard pipeline calls
   * this before it sorts and draws the sprites.
   * @param renderer The renderer to use.
   */
  _render(renderer: Renderer) {
    const camera = this.camera || Camera.main
    this.updateTransform3D()
    const update = camera.transformId !== this._cameraTransformId ||
      this._parentID !== this.transform._worldID

    if (update) {
      const scaling = this.worldTransform.scaling
      Mat4.multiply(camera.view.array, this.worldTransform.array, this._modelView)
      switch (this._billboardType) {
        case SpriteBillboardType.spherical: {
          this._modelView[0] = scaling.x
          this._modelView[1] = 0
          this._modelView[2] = 0
          this._modelView[3] = 0
          this._modelView[4] = 0
          this._modelView[5] = scaling.y
          this._modelView[6] = 0
          this._modelView[7] = 0
          break
        }
        case SpriteBillboardType.cylindrical: {
          this._modelView[0] = scaling.x
          this._modelView[1] = 0
          this._modelView[2] = 0
          this._modelView[3] = 0
          this._modelView[8] = 0
          this._modelView[9] = 0
          this._modelView[10] = 1
          this._modelView[11] = 0
          break
        }
      }
      Mat4.multiply(camera.projection.array,
        this._modelView, this._sprite.modelViewProjection.array)
      this._parentID = this.transform._worldID
      this._cameraTransformId = camera.transformId
      const dir = Vec3.subtract(camera.worldTransform.position.array,
        this.worldTransform.position.array, vec3)
      const projection = Vec3.scale(camera.worldTransform.forward.array,
        Vec3.dot(dir, camera.worldTransform.forward.array), vec3)
      this._sprite.distanceFromCamera = Vec3.squaredMagnitude(projection)
    }
    this._sprite.calculateVertices(renderer.resolution)
    this._sprite.worldAlpha = this.groupAlpha
  }

  /**
   * The anchor sets the origin point of the sprite.
   */
  get anchor(): ObservablePoint {
    return this._sprite.anchor
  }

  set anchor(value: ObservablePoint) {
    this._sprite.anchor = value
  }

  /** The texture used when rendering the sprite. */
  get texture(): Texture {
    return this._sprite.texture
  }

  set texture(value: Texture) {
    this._sprite.texture = value
  }

  /** The blend used when rendering the sprite. */
  get blendMode(): BLEND_MODES {
    return this._sprite.blendMode
  }

  set blendMode(value: BLEND_MODES) {
    this._sprite.blendMode = value
  }
}
