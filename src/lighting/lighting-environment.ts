import { Renderer } from "pixi.js"
import { Compatibility } from "../compatibility/compatibility"
import { ImageBasedLighting } from "./image-based-lighting"
import { Light } from "./light"
import { Fog } from "./fog"

/**
 * A lighting environment represents the different lighting conditions for a
 * specific object or an entire scene.
 */
export class LightingEnvironment {
  /** The image-based lighting object. */
  imageBasedLighting?: ImageBasedLighting

  /** The lights affecting this lighting environment. */
  lights: Light[] = []

  fog?: Fog

  /** The main lighting environment which is used by default. */
  static main: LightingEnvironment

  private _prerender = { prerender: () => this.updateLightTransforms() }

  /**
   * Creates a new lighting environment using the specified renderer.
   * @param renderer The renderer to use.
   * @param imageBasedLighting The image based lighting to use.
   */
  constructor(public renderer: Renderer, imageBasedLighting?: ImageBasedLighting) {
    // The lights are updated before every render, as the shadow pass reads
    // them before any material does.
    renderer.runners.prerender.add(this._prerender)
    if (!LightingEnvironment.main) {
      LightingEnvironment.main = this
    }
    this.imageBasedLighting = imageBasedLighting
  }

  /**
   * Makes sure every light's transform is current before it is read into
   * uniforms; a light that isn't part of the stage hierarchy is never
   * updated by anything else.
   */
  updateLightTransforms() {
    for (let light of this.lights) {
      light.updateTransform3D()
    }
  }

  destroy() {
    this.renderer.runners?.prerender?.remove(this._prerender)
  }

  /** Value indicating if this object is valid to be used for rendering. */
  get valid() {
    return !this.imageBasedLighting || this.imageBasedLighting.valid
  }
}

Compatibility.installRendererSystem("lighting", LightingEnvironment)
