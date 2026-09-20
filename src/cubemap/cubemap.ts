import { Texture, TextureSource, BufferImageSource, Cache } from "pixi.js"
import { CubemapResource, CubemapFaceSources } from "./cubemap-resource"
import { Color } from "../color"
import { CubemapFaces } from "./cubemap-faces"
import { CubemapFormat } from "./cubemap-format"

/**
 * Resolves a face given as a texture or as the URL of an already loaded
 * asset. PixiJS v8's `Texture.from` no longer loads from a URL, so a URL has
 * to have gone through `Assets.load` first.
 */
function toTextureSource(value: Texture | TextureSource | string, face: string): TextureSource {
  if (typeof value === "string") {
    const texture = Cache.has(value) ? Cache.get<Texture>(value) : undefined
    if (!texture) {
      throw new Error(`PIXI3D: The cubemap face "${face}" (${value}) has not been loaded, load it with Assets.load before creating the cubemap.`)
    }
    return texture.source
  }
  return value instanceof TextureSource ? value : value.source
}

/**
 * Cubemap which supports multiple user specified mipmaps. It is a texture
 * whose source is a cube (`CubemapResource`), so it can be assigned straight
 * to a `samplerCube` uniform.
 */
export class Cubemap extends Texture<CubemapResource> {

  /** Returns an array of faces. */
  static get faces(): ["posx", "negx", "posy", "negy", "posz", "negz"] {
    return ["posx", "negx", "posy", "negy", "posz", "negz"]
  }

  /** Returns the number of mipmap levels. */
  get levels() {
    return this.source.levels
  }

  /** The format for this cubemap. */
  cubemapFormat = CubemapFormat.ldr

  /**
   * Value indicating if every face of every level has loaded and the cubemap
   * can be used for rendering.
   */
  get valid() {
    return this.source.valid
  }

  /**
   * Creates a new cubemap from the specified resource.
   * @param source The cube texture source.
   */
  constructor(source: CubemapResource) {
    super({ source })
  }

  /**
   * Creates a new cubemap from the specified faces. Passing an array creates
   * one mip level per element, largest first.
   * @param faces The faces to create the cubemap from.
   * @param format The format of the cubemap.
   */
  static fromFaces(faces: CubemapFaces | CubemapFaces[], format = CubemapFormat.ldr) {
    const mipmaps = (Array.isArray(faces) ? faces : [faces]).map(level => {
      const sources = <CubemapFaceSources>{}
      for (const face of Cubemap.faces) {
        sources[face] = toTextureSource(level[face], face)
      }
      return sources
    })
    const cubemap = new Cubemap(new CubemapResource(mipmaps))
    cubemap.cubemapFormat = format
    return cubemap
  }

  /**
   * Creates a new cubemap from the specified mip levels, largest first.
   * @param mipmaps The faces for each mip level.
   * @param format The format of the cubemap.
   */
  static fromMipmaps(mipmaps: CubemapFaces[], format = CubemapFormat.ldr) {
    return Cubemap.fromFaces(mipmaps, format)
  }

  /**
   * Creates a new cubemap from the specified colors.
   * @param posx The color for positive x.
   * @param negx The color for negative x.
   * @param posy The color for positive y.
   * @param negy The color for negative y.
   * @param posz The color for positive z.
   * @param negz The color for negative z.
   */
  static fromColors(posx: Color, negx = posx, posy = posx, negy = posx, posz = posx, negz = posx) {
    const colors = { posx, negx, posy, negy, posz, negz }
    const sources = <CubemapFaceSources>{}
    for (const face of Cubemap.faces) {
      sources[face] = new BufferImageSource({
        resource: Uint8Array.from(colors[face].rgba, c => Math.round(c * 255)),
        width: 1,
        height: 1,
        format: "rgba8unorm",
        alphaMode: "no-premultiply-alpha",
        autoGenerateMipmaps: false,
      })
    }
    return new Cubemap(new CubemapResource([sources]))
  }
}
