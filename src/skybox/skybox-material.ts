import { State, GlProgram } from "pixi.js"
import { Cubemap } from "../cubemap/cubemap"
import { MeshShader } from "../mesh/mesh-shader"
import { Camera } from "../camera/camera"
import { Mesh3D } from "../mesh/mesh"
import { Material } from "../material/material"
import { Shader as Vertex } from "./shader/skybox.vert"
import { Shader as Fragment } from "./shader/skybox.frag"
import { CubemapFormat } from "../cubemap/cubemap-format"

export class SkyboxMaterial extends Material {
  private _cubemap: Cubemap

  get cubemap() {
    return this._cubemap
  }

  set cubemap(value: Cubemap) {
    if (value !== this._cubemap) {
      if (!this._cubemap.valid) {
        // Remove the shader so it can be rebuilt with the current features.
        // It may happen that we set a texture which is not yet valid, in that
        // case we don't want to render the skybox until it has become valid.
        this._shader = undefined
      }
      this._cubemap = value
    }
  }

  camera?: Camera

  exposure = 1

  constructor(cubemap: Cubemap) {
    super()
    this._cubemap = cubemap
    // Writing to the depth buffer is disabled so all other objects end up
    // in front of the skybox. The renderer's state system applies the depth
    // mask, so no raw GL calls are needed around the draw.
    this.state = Object.assign(new State(), {
      culling: true, clockwiseFrontFace: true, depthTest: true, depthMask: false
    })
  }

  updateUniforms(mesh: Mesh3D, shader: MeshShader) {
    let camera = this.camera || Camera.main

    shader.uniforms.u_ModelMatrix = mesh.worldTransform.array
    shader.uniforms.u_View = camera.view.array
    shader.uniforms.u_Projection = camera.projection.array
    shader.uniforms.u_EnvironmentSampler = this.cubemap
    shader.uniforms.u_RGBE = this.cubemap.cubemapFormat === CubemapFormat.rgbe8
    shader.uniforms.u_Exposure = this.exposure
  }

  createShader() {
    if (this.cubemap.valid) {
      return new MeshShader(GlProgram.from({ vertex: Vertex.source, fragment: Fragment.source }))
    }
  }
}
