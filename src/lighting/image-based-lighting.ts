import { Texture, ImageSource } from "pixi.js"
import { Cubemap } from "../cubemap/cubemap"

import png from "./assets/lut-ggx.png"

/**
 * Creates a texture from an inline (data URL) image. PixiJS v8's
 * `Texture.from` no longer loads from a URL; until the image has decoded the
 * texture reports its size as 0x0, which the renderer skips, and it is
 * resized and re-uploaded on load.
 */
function textureFromDataUrl(url: string) {
  const image = new Image()
  const source = new ImageSource({
    resource: image, autoGenerateMipmaps: false, alphaMode: "no-premultiply-alpha"
  })
  image.onload = () => {
    source.resize(image.naturalWidth, image.naturalHeight)
    source.update()
  }
  image.src = url
  return new Texture({ source })
}

/**
 * Collection of components used for image-based lighting (IBL), a
 * rendering technique which involves capturing an omnidirectional representation
 * of real-world light information as an image.
 */
export class ImageBasedLighting {
  private _diffuse: Cubemap
  private _specular: Cubemap
  private static _defaultLookupBrdf?: Texture

  /**
   * The default BRDF integration map lookup texture. Its image starts
   * decoding as soon as the library is loaded (see below), so it is ready by
   * the time the first scene is rendered.
   */
  static get defaultLookupBrdf(): Texture {
    if (!this._defaultLookupBrdf) {
      this._defaultLookupBrdf = textureFromDataUrl(png)
    }
    return this._defaultLookupBrdf
  }

  static set defaultLookupBrdf(value: Texture) {
    this._defaultLookupBrdf = value
  }

  /** Cube texture used for the diffuse component. */
  get diffuse() {
    return this._diffuse
  }

  /** Cube mipmap texture used for the specular component. */
  get specular() {
    return this._specular
  }

  /** BRDF integration map lookup texture. */
  lookupBrdf?: Texture

  /**
   * Creates a new image-based lighting object.
   * @param diffuse Cubemap used for the diffuse component.
   * @param specular Cubemap used for the specular component.
   */
  constructor(diffuse: Cubemap, specular: Cubemap) {
    this._diffuse = diffuse
    this._specular = specular
  }

  /**
   * Value indicating if this object is valid to be used for rendering.
   */
  get valid() {
    return this._diffuse.valid && this._specular.valid
  }
}

// Decode the default lookup texture now, as PixiJS v7 did when it was a
// static field: a texture created on first use would still be decoding
// during the first render, and metallic surfaces would render black. Where
// there is no DOM, it is created on first use instead.
if (typeof Image !== "undefined") {
  ImageBasedLighting.defaultLookupBrdf
}
