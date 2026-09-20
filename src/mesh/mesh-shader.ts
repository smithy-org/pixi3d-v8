import { Shader, GlProgram, State, Geometry, WebGLRenderer, Topology } from "pixi.js"
import { Mesh3D } from "./mesh"
import { MeshGeometry3D } from "./geometry/mesh-geometry"
import { createAttribute, createIndexBuffer } from "./geometry/mesh-geometry-buffers"
import { syncUniforms, UniformValues } from "./mesh-shader-uniforms"
import { fixGlslEs100Program } from "../compatibility/gl-program"

const oppositeWindingStates = new WeakMap<State, State>()

/**
 * Returns the state to draw with on the current render target. PixiJS v8
 * inverts the front face while drawing into a render texture, to match its
 * 2D projection, which flips y there. Pixi3D's projection does not, so there
 * the state is swapped for one of the opposite winding, which the inversion
 * turns back into the intended one (PixiJS v7 inverted nothing).
 * @param renderer The renderer to draw with.
 * @param state The intended state.
 */
function stateForRenderTarget(renderer: WebGLRenderer, state: State) {
  if (!renderer.renderTarget.frontFaceInverted) {
    return state
  }
  let opposite = oppositeWindingStates.get(state)
  if (!opposite) {
    opposite = new State()
    oppositeWindingStates.set(state, opposite)
  }
  opposite.blendMode = state.blendMode
  opposite.polygonOffset = state.polygonOffset
  opposite.data = state.data
  opposite.clockwiseFrontFace = !state.clockwiseFrontFace
  return opposite
}

/**
 * Shader used specifically to render a mesh.
 */
export class MeshShader extends Shader {
  private _state = Object.assign(new State(), {
    culling: true, clockwiseFrontFace: false, depthTest: true
  })

  /**
   * Uniform values keyed by GLSL uniform name. Assigned by materials each
   * render and uploaded by `render` (see mesh-shader-uniforms.ts for why
   * this bypasses v8's UniformGroup sync).
   */
  uniforms: UniformValues = {}

  /**
   * Creates a new mesh shader from a WebGL program.
   * @param program The compiled program (see `GlProgram.from`).
   */
  constructor(program: GlProgram) {
    fixGlslEs100Program(program)
    super({ glProgram: program, resources: {} })
  }

  /** The name of the mesh shader. Used for figuring out if geometry attributes is compatible with the shader. This needs to be set to something different than default value when custom attributes is used. */
  get name() {
    return "mesh-shader"
  }

  /**
   * Creates geometry with required attributes used by this shader. Override when using custom attributes.
   * @param geometry The geometry with mesh data.
   * @param instanced Value indicating if the geometry will be instanced.
   */
  createShaderGeometry(geometry: MeshGeometry3D, instanced: boolean) {
    let result = new Geometry()
    if (geometry.indices) {
      result.addIndex(createIndexBuffer(geometry.indices))
    }
    if (geometry.positions) {
      result.addAttribute("a_Position", createAttribute(geometry.positions, 3))
    }
    if (geometry.uvs && geometry.uvs[0]) {
      result.addAttribute("a_UV1", createAttribute(geometry.uvs[0], 2))
    }
    if (geometry.normals) {
      result.addAttribute("a_Normal", createAttribute(geometry.normals, 3))
    }
    if (geometry.tangents) {
      result.addAttribute("a_Tangent", createAttribute(geometry.tangents, 4))
    }
    if (geometry.colors) {
      result.addAttribute("a_Color", createAttribute(geometry.colors, geometry.colors.componentCount || 4))
    }
    return result
  }

  /**
   * Renders the geometry of the specified mesh.
   * @param mesh Mesh to render.
   * @param renderer Renderer to use.
   * @param state Rendering state to use.
   * @param topology Draw mode (topology) to use.
   */
  render(mesh: Mesh3D, renderer: WebGLRenderer, state: State = this._state, topology: Topology = "triangle-list") {
    const instancing = mesh.instances.length > 0
    const instanceCount = instancing
      ? mesh.instances.filter(i => i.isRenderable).length
      : undefined
    if (!mesh.geometry.hasShaderGeometry(this, instancing)) {
      mesh.geometry.addShaderGeometry(this, instancing)
    }
    let geometry = mesh.geometry.getShaderGeometry(this)
    renderer.shader.bind(this, true)
    syncUniforms(renderer, this.glProgram, this.uniforms)
    renderer.state.set(stateForRenderTarget(renderer, state))
    renderer.geometry.bind(geometry, this.glProgram)
    renderer.geometry.draw(topology, undefined, undefined, instanceCount)
  }
}
