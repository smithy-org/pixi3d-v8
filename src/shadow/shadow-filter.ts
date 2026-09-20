import { WebGLRenderer, GlProgram, RenderTexture, RenderTarget, State, CLEAR } from "pixi.js"
import { MeshShader } from "../mesh/mesh-shader"
import { Mesh3D } from "../mesh/mesh"
import { ShadowCastingLight } from "./shadow-casting-light"
import { Shader as Vertex } from "./shader/gaussian-blur.vert"
import { Shader as Fragment } from "./shader/gaussian-blur.frag"
import { StandardShaderSource } from "../material/standard/standard-shader-source"
import { ShadowMaterialFeatureSet } from "./shadow-material-feature-set"

/**
 * Blurs a shadow texture by drawing a full-screen quad with a gaussian blur
 * shader into a render texture, once per axis. This goes through the mesh
 * shader path rather than PixiJS' filter system, which is built around 2D
 * containers and their bounds.
 */
export class ShadowFilter {
  private _gaussianBlurShader: MeshShader
  private _mesh: Mesh3D
  private _state = Object.assign(new State(), {
    blend: false, culling: false, depthTest: false, depthMask: false
  })

  constructor(public renderer: WebGLRenderer) {
    this._mesh = Mesh3D.createQuad()
    // The WebGL version defines switch on the shader's GLSL 3.00
    // declarations; PixiJS v8 renders with WebGL2 unless told otherwise.
    const features = ShadowMaterialFeatureSet.build(renderer)
    this._gaussianBlurShader = new MeshShader(GlProgram.from({
      vertex: StandardShaderSource.build(Vertex.source, features, renderer),
      fragment: StandardShaderSource.build(Fragment.source, features, renderer),
    }))
  }

  applyGaussianBlur(light: ShadowCastingLight) {
    this.applyBlurScale(light.shadowTexture, light.filterTexture,
      new Float32Array([0, light.softness / light.shadowTexture.height]))
    this.applyBlurScale(light.filterTexture, light.renderTarget,
      new Float32Array([light.softness / light.shadowTexture.width, 0]))
  }

  applyBlurScale(input: RenderTexture, output: RenderTexture | RenderTarget, scale: Float32Array) {
    this.renderer.renderTarget.push({
      target: output, clear: CLEAR.ALL, clearColor: [0, 0, 0, 0]
    })

    this._gaussianBlurShader.uniforms.u_FilterSampler = input
    this._gaussianBlurShader.uniforms.u_BlurScale = scale
    this._gaussianBlurShader.render(this._mesh, this.renderer, this._state)

    this.renderer.renderTarget.pop()
  }
}
