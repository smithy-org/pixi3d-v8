import { readFileSync } from "fs"
import { resolve, dirname } from "path"

function load(path) {
  let match, source = readFileSync(path, "utf8")
  while ((match = /@import (.*);/g.exec(source)) !== null) {
    let importPath = resolve(dirname(path), match[1]) + ".glsl"
    let importSource = readFileSync(importPath, "utf8")
    source = source.replace(match[0], importSource)
  }
  return source
}

function template(source) {
  return `export var Shader = ${JSON.stringify({ source })};`
}

export default function glsl() {
  return {
    name: "glsl",
    load(id) {
      // Only shader sources: PixiJS ships JavaScript modules named like
      // `blend-template.frag.mjs`, which a bundle that includes it must
      // leave alone.
      if (/\.(vert|frag)$/.test(id)) {
        return template(load(id))
      }
      return null
    }
  };
}