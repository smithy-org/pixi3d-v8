import { Renderer, WebGLRenderer } from "pixi.js"

/**
 * Returns the raw WebGL2 rendering context used by the renderer.
 *
 * In PixiJS v8 the renderer is split into WebGL/WebGPU/Canvas backends and
 * the GL context lives on the (WebGL-only) `context` system, typed as
 * `protected` since application code is expected to stay above the GL
 * layer. pixi3d is a WebGL-only renderer (see `Compatibility`), so this is
 * a deliberate, narrow escape hatch for the handful of call sites that
 * still need raw `gl.*` calls (float-texture/framebuffer capability
 * probing, picking readback, manual attribute/uniform work predating the
 * v8 port). Callers must have already confirmed they're running under
 * `WebGLRenderer` (pixi3d never runs under the WebGPU or Canvas backends).
 */
export function getGlContext(renderer: Renderer): WebGL2RenderingContext {
  return (renderer as unknown as WebGLRenderer).context["gl"] as WebGL2RenderingContext
}
