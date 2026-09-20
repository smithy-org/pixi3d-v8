import { WebGLRenderer, GlProgram, Geometry, State } from "pixi.js"
import { MeshGeometry3D } from "../mesh/geometry/mesh-geometry"
import { MeshShader } from "../mesh/mesh-shader"
import { createAttribute, createIndexBuffer } from "../mesh/geometry/mesh-geometry-buffers"
import { StandardShaderSource } from "../material/standard/standard-shader-source"
import { Mesh3D } from "../mesh/mesh"
import { ShadowCastingLight } from "./shadow-casting-light"
import { Shader as Vertex } from "./shader/shadow.vert"
import { Shader as Fragment } from "./shader/shadow.frag"
import { ShadowShaderInstancing } from "./shadow-shader-instancing"
import { ShadowMaterialFeatureSet } from "./shadow-material-feature-set"

export class ShadowShader extends MeshShader {
  private _instancing: ShadowShaderInstancing

  constructor(renderer: WebGLRenderer, features: string[] = []) {
    features = ShadowMaterialFeatureSet.build(renderer, features)
    super(GlProgram.from({
      vertex: StandardShaderSource.build(Vertex.source, features, renderer),
      fragment: StandardShaderSource.build(Fragment.source, features, renderer),
    }))
    this._instancing = new ShadowShaderInstancing()
  }

  get maxSupportedJoints() {
    return 0
  }

  createShaderGeometry(geometry: MeshGeometry3D, instanced: boolean) {
    let result = new Geometry()
    if (geometry.indices) {
      result.addIndex(createIndexBuffer(geometry.indices))
    }
    if (geometry.positions) {
      result.addAttribute("a_Position", createAttribute(geometry.positions, 3))
    }
    if (instanced) {
      this._instancing.addGeometryAttributes(result)
    }
    return result
  }

  get name() {
    return "shadow-shader"
  }

  render(mesh: Mesh3D, renderer: WebGLRenderer, state: State) {
    if (mesh.instances.length > 0) {
      const filteredInstances = mesh.instances.filter((instance) => instance.isRenderable)
      if (filteredInstances.length === 0) {
        // Early exit, this avoids drawing the last known instance in the instance buffer.
        return
      }
      this._instancing.updateBuffers(filteredInstances)
    }
    super.render(mesh, renderer, state)
  }

  updateUniforms(mesh: Mesh3D, shadowCastingLight: ShadowCastingLight) {
    this.uniforms.u_ModelMatrix = mesh.worldTransform.array
    this.uniforms.u_ViewProjectionMatrix = shadowCastingLight.lightViewProjection
  }
}
