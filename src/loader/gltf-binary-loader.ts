import { checkExtension, DOMAdapter, extensions, ExtensionType, LoaderParserPriority } from "pixi.js"
import type { Loader, LoaderParser, ResolvedAsset } from "pixi.js"
import { glTFAsset, glTFUrlResourceLoader } from "../gltf/gltf-asset"

/**
 * Load parser for binary glTF (`.glb`) files: `Assets.load("model.glb")`
 * resolves to a `glTFAsset`.
 */
export const glTFBinaryLoader: LoaderParser<glTFAsset> = {
  extension: {
    type: ExtensionType.LoadParser,
    priority: LoaderParserPriority.Normal,
    name: "glb",
  },
  id: "glb",
  // Deprecated in favour of `id`, but PixiJS 8.20 still validates parsers by
  // name: two parsers without one are reported as a conflict.
  name: "glb",
  test(url: string) {
    return checkExtension(url, ".glb")
  },
  async load(url: string, _asset?: ResolvedAsset, loader?: Loader): Promise<glTFAsset> {
    const response = await DOMAdapter.get().fetch(url)
    const data = await response.arrayBuffer()
    if (!glTFAsset.isValidBuffer(data)) {
      throw new Error(`PIXI3D: "${url}" is not a valid binary glTF file.`)
    }
    return glTFAsset.fromBuffer(data, undefined, new glTFUrlResourceLoader(url, loader))
  },
}

extensions.add(glTFBinaryLoader)
