import { checkExtension, DOMAdapter, extensions, ExtensionType, LoaderParserPriority } from "pixi.js"
import type { Loader, LoaderParser, ResolvedAsset } from "pixi.js"
import { glTFAsset, glTFUrlResourceLoader } from "../gltf/gltf-asset"

/**
 * Load parser for `.gltf` files: `Assets.load("model.gltf")` resolves to a
 * `glTFAsset`. External buffers and images referenced by the file are loaded
 * relative to it (images through the same loader, so they share its cache).
 */
export const glTFLoader: LoaderParser<glTFAsset> = {
  extension: {
    type: ExtensionType.LoadParser,
    priority: LoaderParserPriority.Normal,
    name: "gltf",
  },
  id: "gltf",
  // Deprecated in favour of `id`, but PixiJS 8.20 still validates parsers by
  // name: two parsers without one are reported as a conflict.
  name: "gltf",
  test(url: string) {
    return checkExtension(url, ".gltf")
  },
  async load(url: string, _asset?: ResolvedAsset, loader?: Loader): Promise<glTFAsset> {
    const response = await DOMAdapter.get().fetch(url)
    const descriptor = await response.json()
    return glTFAsset.load(descriptor, new glTFUrlResourceLoader(url, loader))
  },
}

extensions.add(glTFLoader)
