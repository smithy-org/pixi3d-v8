import { checkExtension, DOMAdapter, extensions, ExtensionType, LoaderParserPriority } from "pixi.js"
import type { LoaderParser } from "pixi.js"

const EXTENSIONS = [".glsl", ".vert", ".frag"]

/**
 * Load parser for GLSL shader source files: `Assets.load("shader.frag")`
 * resolves to the file contents as a string.
 */
export const ShaderSourceLoader: LoaderParser<string> = {
  extension: {
    type: ExtensionType.LoadParser,
    priority: LoaderParserPriority.Normal,
    name: "shader-source",
  },
  id: "shader-source",
  // Deprecated in favour of `id`, but PixiJS 8.20 still validates parsers by
  // name: two parsers without one are reported as a conflict.
  name: "shader-source",
  test(url: string) {
    return checkExtension(url, EXTENSIONS)
  },
  async load(url: string): Promise<string> {
    const response = await DOMAdapter.get().fetch(url)
    return response.text()
  },
}

extensions.add(ShaderSourceLoader)
