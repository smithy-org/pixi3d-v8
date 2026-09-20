import { RenderTexture, RenderTarget, Renderer, Container, DestroyOptions, Sprite, Ticker, TextureSource } from "pixi.js"
import { Compatibility } from "../compatibility/compatibility"
import { CompositeSpriteOptions } from "./composite-sprite-options"

/**
 * Represents a sprite used for compositing a 3D object as a 2D sprite. Can be
 * used for post processing effects and filters.
 */
export class CompositeSprite extends Sprite {
  private _tickerRender = () => { }
  private _prerender?: { prerender: () => void }
  private _renderTexture: RenderTexture
  private _renderTarget: RenderTarget

  /** The render texture. */
  get renderTexture() {
    return this._renderTexture
  }

  /**
   * Creates a new composite sprite using the specified options.
   * @param renderer The renderer to use.
   * @param options The options for the render texture. If both width and height
   * has not been set, it will automatically be resized to the renderer size.
   */
  constructor(public renderer: Renderer, options?: CompositeSpriteOptions) {
    super()

    let {
      width = 512, height = 512, objectToRender, resolution = 1
    } = options || {}

    /* When rendering to a texture, it's flipped vertically for some reason.
    This will flip it back to it's expected orientation. */
    this._renderTexture = new RenderTexture({
      source: new TextureSource({ width, height, resolution }), rotate: 8
    })
    // Rendering goes through a render target with a depth buffer, so the
    // object's meshes are depth tested against each other.
    this._renderTarget = new RenderTarget({
      colorTextures: [this._renderTexture], depth: true
    })
    this.texture = this._renderTexture

    if (!options || !options.width || !options.height) {
      this._prerender = {
        prerender: () => {
          this._renderTexture.resize(renderer.screen.width, renderer.screen.height)
        }
      }
      renderer.runners.prerender.add(this._prerender)
    }
    if (objectToRender) {
      this._tickerRender = () => {
        if (Compatibility.isRendererDestroyed(renderer)) {
          Ticker.shared.remove(this._tickerRender); return
        }
        if (this.isDisplayed()) {
          objectToRender && this.renderObject(objectToRender)
        }
      }
      Ticker.shared.add(this._tickerRender)
    }
  }

  /**
   * Sets the resolution of the render texture.
   * @param resolution The resolution to set.
   */
  setResolution(resolution: number) {
    this._renderTexture.resize(
      this._renderTexture.width, this._renderTexture.height, resolution)
  }

  destroy(options?: DestroyOptions) {
    Ticker.shared.remove(this._tickerRender)
    if (this._prerender && !Compatibility.isRendererDestroyed(this.renderer)) {
      this.renderer.runners.prerender.remove(this._prerender)
    }
    this._renderTarget.destroy()
    super.destroy(options)
  }

  /**
   * Updates the sprite's texture by rendering the specified object to it.
   * @param object The object to render.
   */
  renderObject(object: Container) {
    this.renderer.render({ container: object, target: this._renderTarget })
  }

  /**
   * Returns a value indicating if the sprite would be seen: it and all its
   * ancestors are visible, it is renderable, and its alpha (with theirs) is
   * above zero.
   */
  private isDisplayed() {
    let alpha = 1
    for (let object: Container | null = this; object; object = object.parent) {
      if (!object.visible) {
        return false
      }
      alpha *= object.alpha
    }
    return this.renderable && alpha > 0
  }
}
