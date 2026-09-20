import { BaseDestroyOptions, ContextDestroyOptions, TextureDestroyOptions, TextDestroyOptions } from "pixi.js"

/**
 * Destroy options for a mesh: the object form of PixiJS v8's `DestroyOptions`
 * plus the mesh-specific flags.
 */
export interface MeshDestroyOptions extends BaseDestroyOptions, ContextDestroyOptions, TextureDestroyOptions, TextDestroyOptions {
  geometry?: boolean
  material?: boolean
}
