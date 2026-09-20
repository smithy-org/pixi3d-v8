// Development harness for the PixiJS v8 port: bundles ONLY the modules that
// have been ported (imported from serve/src/index.ts) together with the
// pixi.js installed in node_modules, and serves it. PixiJS is bundled rather
// than loaded from a CDN so the harness always runs the exact version the
// port is built and type-checked against (the devDependency). Unlike
// rollup.serve.js it does not build the library's dist bundles first, so
// modules still being ported don't have to be import-safe yet.
//
//   npx rollup -w -c rollup.harness.mjs
//
import { fileURLToPath } from "url"
import { dirname, resolve as resolvePath } from "path"
import esbuild from "rollup-plugin-esbuild"
import image from "@rollup/plugin-image"
import resolve from "@rollup/plugin-node-resolve"
import commonjs from "@rollup/plugin-commonjs"
import serve from "rollup-plugin-serve"
import glsl from "./rollup-plugin-glsl.js"

const root = dirname(fileURLToPath(import.meta.url))

export default {
  input: resolvePath(root, "serve/src/index.ts"),
  output: {
    file: resolvePath(root, "serve/bundle.js"),
    format: "iife",
    sourcemap: true,
    // PixiJS loads its environment extensions with a dynamic import.
    inlineDynamicImports: true,
  },
  plugins: [
    esbuild({ target: "es2020" }),
    image(),
    glsl(),
    resolve({ browser: true }),
    commonjs(),
    serve({
      host: "127.0.0.1",
      port: 8080,
      open: false,
      contentBase: [resolvePath(root, "serve")],
      // A reload must always run the latest build, never a cached one.
      headers: { "Cache-Control": "no-store" },
    }),
  ],
}
