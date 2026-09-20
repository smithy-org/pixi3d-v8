import type { Texture } from "pixi.js"

/**
 * A resource loaded by `glTFResourceLoader.load`.
 */
export interface glTFLoaderResource {
  /** The data of a buffer. */
  data?: ArrayBuffer

  /** The texture of an image. */
  texture?: Texture
}

/**
 * Represents a loader for external glTF asset resources (buffers and images).
 * Uris are given exactly as they appear in the glTF descriptor, relative to
 * the descriptor's own location.
 *
 * A loader implements `loadBuffer` and `loadTexture`, or `load`, the one
 * method it had up to PixiJS v7. `load` is used for whichever of the other
 * two is missing.
 */
export interface glTFResourceLoader {
  /**
   * Loads binary data (a `.bin` buffer) from the specified uri.
   * @param uri The uri to load from.
   */
  loadBuffer?(uri: string): Promise<ArrayBuffer>

  /**
   * Loads an image as a texture from the specified uri.
   * @param uri The uri to load from.
   */
  loadTexture?(uri: string): Promise<Texture>

  /**
   * Loads the resource from the specified uri.
   * @param uri The uri to load from.
   * @param onComplete Callback when loading is completed, with the `data` of
   * a buffer or the `texture` of an image.
   */
  load?(uri: string, onComplete: (resource: glTFLoaderResource) => void): void
}
