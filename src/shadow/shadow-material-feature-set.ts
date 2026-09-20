import { WebGLRenderer } from "pixi.js"
export namespace ShadowMaterialFeatureSet {
  export function build(renderer: WebGLRenderer, features: string[] = []) {
    if (renderer.context.webGLVersion === 1) {
      features.push("WEBGL1 1")
    }
    if (renderer.context.webGLVersion === 2) {
      features.push("WEBGL2 1")
    }
    return features
  }
}
