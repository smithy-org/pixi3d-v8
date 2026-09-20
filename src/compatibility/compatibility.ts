import { ExtensionType, extensions, Renderer } from "pixi.js"

/**
 * The seams between Pixi3D and the PixiJS renderer. Pixi3D historically
 * supported PixiJS v5-v7 through a set of version shims here; the v8 port is
 * v8-only (WebGL backend), so this is now just the registration helpers.
 */
export namespace Compatibility {
  /**
   * Registers a render pipe, the v8 equivalent of an "object renderer"
   * plugin. The pipe class is constructed once per renderer and exposed as
   * `renderer.renderPipes[name]`.
   * @param name The name of the pipe.
   * @param pipe The pipe class.
   */
  export function installRendererPipe(name: string, pipe: any): void {
    pipe.extension = { type: [ExtensionType.WebGLPipes], name }
    extensions.add(pipe)
  }

  /**
   * Registers a renderer system: a class constructed once per renderer with
   * the renderer as its argument and exposed as `renderer[name]`. Used for
   * the objects that v7 registered as plain renderer plugins (camera,
   * lighting, picking).
   * @param name The name of the system.
   * @param system The system class.
   */
  export function installRendererSystem(name: string, system: any): void {
    system.extension = { type: [ExtensionType.WebGLSystem], name }
    extensions.add(system)
  }

  /**
   * Returns a value indicating if the renderer has been destroyed.
   * @param renderer The renderer to check.
   */
  export function isRendererDestroyed(renderer: Renderer): boolean {
    return !renderer.renderPipes
  }
}
