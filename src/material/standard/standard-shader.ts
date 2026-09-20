import { GlProgram, WebGLRenderer, State, Topology } from "pixi.js"
import { MeshGeometry3D } from "../../mesh/geometry/mesh-geometry"
import { Mesh3D } from "../../mesh/mesh"
import { MeshShader } from "../../mesh/mesh-shader"
import { createAttribute } from "../../mesh/geometry/mesh-geometry-buffers"
import { StandardShaderInstancing } from "./standard-shader-instancing"
import { StandardShaderSource } from "./standard-shader-source"
import { Shader as MetallicRoughness } from "./shader/metallic-roughness.frag"
import { Shader as Primitive } from "./shader/primitive.vert"

export class StandardShader extends MeshShader {
  private _instancing = new StandardShaderInstancing()

  static build(renderer: WebGLRenderer, features: string[]) {
    let program = GlProgram.from({
      vertex: StandardShaderSource.build(Primitive.source, features, renderer),
      fragment: StandardShaderSource.build(MetallicRoughness.source, features, renderer),
    })
    return new StandardShader(program)
  }

  get name() {
    return "standard-shader"
  }

  createShaderGeometry(geometry: MeshGeometry3D, instanced: boolean) {
    let result = super.createShaderGeometry(geometry, instanced)
    if (instanced) {
      this._instancing.addGeometryAttributes(result)
    }
    if (geometry.targets) {
      for (let i = 0; i < geometry.targets.length; i++) {
        let positions = geometry.targets[i].positions
        if (positions) {
          result.addAttribute(`a_Target_Position${i}`, createAttribute(positions, 3))
        }
        let normals = geometry.targets[i].normals
        if (normals) {
          result.addAttribute(`a_Target_Normal${i}`, createAttribute(normals, 3))
        }
        let tangents = geometry.targets[i].tangents
        if (tangents) {
          result.addAttribute(`a_Target_Tangent${i}`, createAttribute(tangents, 3))
        }
      }
    }
    if (geometry.uvs && geometry.uvs[1]) {
      result.addAttribute("a_UV2", createAttribute(geometry.uvs[1], 2))
    }
    if (geometry.joints) {
      result.addAttribute("a_Joint1", createAttribute(geometry.joints, 4))
    }
    if (geometry.weights) {
      result.addAttribute("a_Weight1", createAttribute(geometry.weights, 4))
    }
    return result
  }

  render(mesh: Mesh3D, renderer: WebGLRenderer, state: State, topology: Topology) {
    if (mesh.instances.length > 0) {
      const filteredInstances = mesh.instances.filter((instance) => instance.isRenderable)
      if (filteredInstances.length === 0) {
        //early exit - this avoids us drawing the last known instance in the instance buffer
        return
      }
      this._instancing.updateBuffers(filteredInstances)
    }
    super.render(mesh, renderer, state, topology)
  }
}
