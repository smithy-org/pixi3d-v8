import { Container } from "pixi.js"
export interface CompositeSpriteOptions {
  /**
   * The width of the texture for the sprite.
   */
  width?: number,
  /**
   * The height of the texture for the sprite.
   */
  height?: number,
  /**
   * The object to render. When set, it will automatically be rendered to the
   * sprite's texture each frame.
   */
  objectToRender?: Container
  /**
   * The resolution of the texture for the sprite.
   */
  resolution?: number
}