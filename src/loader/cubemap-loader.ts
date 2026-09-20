import { Assets, checkExtension, DOMAdapter, extensions, ExtensionType, LoaderParserPriority } from "pixi.js"
import type { Loader, LoaderParser, ResolvedAsset, Texture } from "pixi.js"
import { Cubemap } from "../cubemap/cubemap"
import type { CubemapFaces } from "../cubemap/cubemap-faces"
import { CubemapFormat } from "../cubemap/cubemap-format"

interface CubemapFileVersion {
  format: CubemapFormat
  mipmaps: string[]
}

class CubemapFileVersion1 implements CubemapFileVersion {
  constructor(private json: any) { }

  get format() {
    return CubemapFormat.ldr
  }

  get mipmaps(): string[] {
    return this.json
  }
}

class CubemapFileVersion2 implements CubemapFileVersion {
  constructor(private json: any) { }

  get format() {
    return <CubemapFormat>this.json.format
  }

  get mipmaps(): string[] {
    return <string[]>this.json.mipmaps
  }
}

namespace CubemapFileVersionSelector {
  export function getFileVersion(json: any): CubemapFileVersion {
    if (json.version === 2) {
      return new CubemapFileVersion2(json)
    }
    return new CubemapFileVersion1(json)
  }
}

/** The face keys in the order the `{{face}}` placeholder is expanded. */
const FACES = ["posx", "negx", "posy", "negy", "posz", "negz"] as const

/**
 * Load parser for `.cubemap` files (a JSON list of face image urls, one per
 * mipmap level): `Assets.load("environment.cubemap")` resolves to a
 * `Cubemap`. The face images are loaded through the same loader so they
 * share its cache.
 */
export const CubemapLoader: LoaderParser<Cubemap> = {
  extension: {
    type: ExtensionType.LoadParser,
    priority: LoaderParserPriority.Normal,
    name: "cubemap",
  },
  id: "cubemap",
  // Deprecated in favour of `id`, but PixiJS 8.20 still validates parsers by
  // name: two parsers without one are reported as a conflict.
  name: "cubemap",
  test(url: string) {
    return checkExtension(url, ".cubemap")
  },
  async load(url: string, _asset?: ResolvedAsset, loader?: Loader): Promise<Cubemap> {
    const response = await DOMAdapter.get().fetch(url)
    const version = CubemapFileVersionSelector.getFileVersion(await response.json())
    const directory = url.substring(0, url.lastIndexOf("/") + 1)
    const loadTexture = (face: string) =>
      loader ? loader.load<Texture>(face) : Assets.load<Texture>(face)

    const mipmaps = await Promise.all(version.mipmaps.map(async mipmap => {
      const textures = await Promise.all(FACES.map(face =>
        loadTexture(directory + mipmap.replace("{{face}}", face))))
      const faces = <CubemapFaces>{}
      FACES.forEach((face, i) => faces[face] = textures[i])
      return faces
    }))
    if (mipmaps.length === 1) {
      return Cubemap.fromFaces(mipmaps[0], version.format)
    }
    return Cubemap.fromMipmaps(mipmaps, version.format)
  },
}

extensions.add(CubemapLoader)
