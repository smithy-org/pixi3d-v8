import { Texture, TextureSource, WebGLRenderer } from "pixi.js"
import { getGlContext } from "../compatibility/gl-context"

/**
 * A bag of uniform values keyed by GLSL uniform name, the shape Pixi3D's
 * materials have always written to (`shader.uniforms.u_ModelMatrix = ...`).
 */
export type UniformValues = { [name: string]: unknown }

/**
 * Uploads a uniform bag to the currently bound program.
 *
 * PixiJS v8 syncs uniforms through typed `UniformGroup`s whose layout must
 * be declared up front, which does not fit shaders assembled from feature
 * defines (the set of active uniforms is only known after compilation) nor
 * struct-array names such as `u_Lights[0].color`. So the mesh shader binds
 * its program with `skipSync` and this function uploads straight from the
 * program's reflected uniform data instead, the way v7's sync did.
 *
 * Textures are bound through the renderer's texture system so its unit
 * bookkeeping stays coherent with the rest of the frame.
 */
export function syncUniforms(renderer: WebGLRenderer, program: import("pixi.js").GlProgram, values: UniformValues) {
  const gl = getGlContext(renderer)
  const uniformData = program._uniformData
  const programData = renderer.shader._getProgramData(program)
  let textureUnit = 0
  for (const name in values) {
    const info = uniformData[name]
    if (!info) {
      continue
    }
    const location = programData.uniformData[name].location as WebGLUniformLocation
    const value = values[name]
    switch (info.type) {
      case "sampler2D":
      case "samplerCube":
      case "sampler2DShadow":
      case "samplerCubeShadow":
      case "sampler2DArray":
      case "sampler2DArrayShadow": {
        renderer.texture.bind(<Texture | TextureSource>value, textureUnit)
        gl.uniform1i(location, textureUnit++)
        break
      }
      case "float": {
        if (info.isArray) gl.uniform1fv(location, <Float32List>value)
        else gl.uniform1f(location, <number>value)
        break
      }
      case "vec2": gl.uniform2fv(location, <Float32List>value); break
      case "vec3": gl.uniform3fv(location, <Float32List>value); break
      case "vec4": gl.uniform4fv(location, <Float32List>value); break
      case "int":
      case "bool": {
        if (info.isArray) gl.uniform1iv(location, <Int32List>value)
        else gl.uniform1i(location, Number(value))
        break
      }
      case "ivec2":
      case "bvec2": gl.uniform2iv(location, <Int32List>value); break
      case "ivec3":
      case "bvec3": gl.uniform3iv(location, <Int32List>value); break
      case "ivec4":
      case "bvec4": gl.uniform4iv(location, <Int32List>value); break
      case "uint": {
        if (info.isArray) gl.uniform1uiv(location, <Uint32List>value)
        else gl.uniform1ui(location, <number>value)
        break
      }
      case "uvec2": gl.uniform2uiv(location, <Uint32List>value); break
      case "uvec3": gl.uniform3uiv(location, <Uint32List>value); break
      case "uvec4": gl.uniform4uiv(location, <Uint32List>value); break
      case "mat2": gl.uniformMatrix2fv(location, false, <Float32List>value); break
      case "mat3": gl.uniformMatrix3fv(location, false, <Float32List>value); break
      case "mat4": gl.uniformMatrix4fv(location, false, <Float32List>value); break
    }
  }
}
