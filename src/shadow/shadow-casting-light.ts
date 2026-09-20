import { RenderTexture, RenderTarget, WebGLRenderer, CLEAR } from "pixi.js"
import { Light } from "../lighting/light"
import { LightType } from "../lighting/light-type"
import { Camera } from "../camera/camera"
import { Capabilities } from "../capabilities"
import { ShadowTexture } from "./shadow-texture"
import { ShadowMath } from "./shadow-math"
import { ShadowQuality } from "./shadow-quality"

export interface ShadowCastingLightOptions {
  /**
   * The quality (precision) of the shadow. If the quality is not supported by
   * current platform, a lower quality will be selected instead.
   */
  quality?: ShadowQuality
  /**
   * The size (both width and height) in pixels for the shadow texture.
   * Increasing the size will improve the quality of the shadow.
   */
  shadowTextureSize?: number
}

/**
 * Contains the required components used for rendering a shadow casted by a light.
 */
export class ShadowCastingLight {
  private _shadowTexture: RenderTexture
  private _filterTexture: RenderTexture
  private _renderTarget: RenderTarget
  private _lightViewProjection = new Float32Array(16)

  /** The softness of the edges for the shadow. */
  softness = 0

  /**
   * The area in units of the shadow when using directional lights. Reducing
   * the area will improve the quality of the shadow.
   */
  shadowArea = 50

  /** The light view projection matrix. */
  get lightViewProjection() {
    return this._lightViewProjection
  }

  /** The camera to follow when using directional lights. */
  camera?: Camera

  /**
   * Value indicating if the shadow should follow the specified camera. If the
   * camera is not set, the main camera will be used as default. Only available
   * when using directional lights.
   */
  followCamera = true

  /**
   * The rendered shadow texture.
   */
  get shadowTexture() {
    return this._shadowTexture
  }

  /**
   * The rendered filter texture.
   */
  get filterTexture() {
    return this._filterTexture
  }

  /**
   * The render target which draws into the shadow texture with a depth
   * buffer attached. Shadow casters must be rendered through this target,
   * not the texture itself, so they are depth tested against each other.
   */
  get renderTarget() {
    return this._renderTarget
  }

  /**
   * Creates a new shadow casting light used for rendering a shadow texture.
   * @param renderer The renderer to use.
   * @param light The light which is casting the shadow.
   * @param options The options to use when creating the shadow texture.
   */
  constructor(public renderer: WebGLRenderer, public light: Light, options?: ShadowCastingLightOptions) {
    if (light.type === LightType.point) {
      throw new Error("PIXI3D: Only directional and spot lights are supported as shadow casters.")
    }
    const { shadowTextureSize = 1024, quality = ShadowQuality.medium } = options || {}

    this._shadowTexture = ShadowTexture.create(renderer, shadowTextureSize, quality)
    this._renderTarget = new RenderTarget({
      colorTextures: [this._shadowTexture], depth: true
    })
    this._filterTexture = ShadowTexture.create(renderer, shadowTextureSize, quality)
  }

  /**
   * Destroys the shadow casting light and it's used resources.
   */
  destroy() {
    this._renderTarget.destroy()
    this._shadowTexture.destroy(true)
    this._filterTexture.destroy(true)
  }

  /**
   * Clears the rendered shadow texture (color and depth).
   */
  clear() {
    this.renderer.renderTarget.push({
      target: this._renderTarget, clear: CLEAR.ALL, clearColor: [0, 0, 0, 0]
    })
    this.renderer.renderTarget.pop()
  }

  /**
   * Updates the light view projection matrix.
   */
  updateLightViewProjection() {
    if (this.light.type === LightType.directional) {
      ShadowMath.calculateDirectionalLightViewProjection(this)
    } else if (this.light.type === LightType.spot) {
      ShadowMath.calculateSpotLightViewProjection(this)
    }
  }

  /**
   * Returns a value indicating if medium quality (16-bit precision) shadows is
   * supported by current platform.
   * @param renderer The renderer to use.
   */
  static isMediumQualitySupported(renderer: WebGLRenderer) {
    return Capabilities.isHalfFloatFramebufferSupported(renderer)
  }

  /**
   * Returns a value indicating if high quality (32-bit precision) shadows is
   * supported by current platform.
   * @param renderer The renderer to use.
   */
  static isHighQualitySupported(renderer: WebGLRenderer) {
    return Capabilities.isFloatFramebufferSupported(renderer)
  }
}
