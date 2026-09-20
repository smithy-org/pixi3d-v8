const pkg = require("./package.json")

import esbuild from "rollup-plugin-esbuild";
import image from "@rollup/plugin-image"
import resolve from '@rollup/plugin-node-resolve'
import glsl from "./rollup-plugin-glsl"

// PixiJS v8 is one package; the browser build reads it from the `PIXI`
// global of PixiJS' own browser build.
const external = ["pixi.js"]
const globals = { "pixi.js": "PIXI" }
const banner = `/* Pixi3D v${pkg.version} */`

const plugins = ({ minify = false } = {}) => [
  esbuild({
    target: "es2017",
    minify
  }),
  image(),
  glsl(),
  resolve()
]

const config = (file, format, options) => {
  return {
    input: "src/index.ts",
    external,
    plugins: plugins(options),
    output: [{
      file: file,
      format: format,
      sourcemap: true,
      name: "PIXI3D",
      globals,
      banner,
    }]
  }
}

const format = (path, format, options = {}) => {
  return [
    config(path + "pixi3d.js", format, { minify: false, ...options }),
    config(path + "pixi3d.min.js", format, { minify: true, ...options }),
  ]
}

export default [
  ...format("dist/browser/", "iife"),
  ...format("dist/cjs/", "cjs"),
  ...format("dist/esm/", "esm"),
]
