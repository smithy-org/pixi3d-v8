import { Buffer, BufferUsage } from "pixi.js"
import { MeshGeometryAttribute } from "./mesh-geometry-attribute"

const GL_BYTE = 5120
const GL_UNSIGNED_BYTE = 5121
const GL_SHORT = 5122
const GL_UNSIGNED_SHORT = 5123
const GL_UNSIGNED_INT = 5125
const GL_FLOAT = 5126

/** The vertex formats PixiJS v8 understands (WebGPU naming, shared by WebGL). */
type VertexFormat = string

/**
 * Maps a glTF-style (componentType, componentCount, normalized) triple onto a
 * v8 vertex format, or undefined when v8 has no such format (e.g. 8-bit
 * three-component colours), in which case the data is converted to floats.
 */
function vertexFormat(componentType: number, size: number, normalized: boolean): VertexFormat | undefined {
  switch (componentType) {
    case GL_FLOAT:
      return size === 1 ? "float32" : `float32x${size}`
    case GL_UNSIGNED_INT:
      return size === 1 ? "uint32" : `uint32x${size}`
    case GL_UNSIGNED_BYTE:
      if (size === 2 || size === 4) return `${normalized ? "unorm" : "uint"}8x${size}`
      return undefined
    case GL_BYTE:
      if (size === 2 || size === 4) return `${normalized ? "snorm" : "sint"}8x${size}`
      return undefined
    case GL_UNSIGNED_SHORT:
      if (size === 2 || size === 4) return `${normalized ? "unorm" : "uint"}16x${size}`
      return undefined
    case GL_SHORT:
      if (size === 2 || size === 4) return `${normalized ? "snorm" : "sint"}16x${size}`
      return undefined
  }
  return undefined
}

function normalizationDivisor(componentType: number) {
  switch (componentType) {
    case GL_UNSIGNED_BYTE: return 255
    case GL_BYTE: return 127
    case GL_UNSIGNED_SHORT: return 65535
    case GL_SHORT: return 32767
  }
  return 1
}

/**
 * Creates the v8 attribute description for a mesh geometry attribute.
 * @param attribute The attribute with the mesh data.
 * @param size The number of components per vertex.
 * @param instance Whether the attribute is per-instance.
 */
export function createAttribute(attribute: MeshGeometryAttribute, size: number, instance = false) {
  const componentType = attribute.componentType ?? GL_FLOAT
  let format = vertexFormat(componentType, size, attribute.normalized)
  let data: ArrayLike<number> & ArrayBufferView = attribute.buffer
  let stride = attribute.stride
  if (!format) {
    // No native format for this layout; unpack to floats (normalizing when
    // the attribute asks for it) so the shader still sees the right values.
    const divisor = attribute.normalized ? normalizationDivisor(componentType) : 1
    const source = attribute.buffer
    const floats = new Float32Array(source.length)
    for (let i = 0; i < source.length; i++) {
      floats[i] = source[i] / divisor
    }
    data = floats
    format = size === 1 ? "float32" : `float32x${size}`
    stride = undefined
  }
  return {
    buffer: new Buffer({ data: <any>data, usage: BufferUsage.VERTEX | BufferUsage.COPY_DST }),
    format: <any>format,
    stride,
    instance,
  }
}

/**
 * Creates the v8 index buffer for a mesh geometry. v8 draws 16- or 32-bit
 * indices only, so 8-bit indices are widened.
 * @param indices The attribute with the index data.
 */
export function createIndexBuffer(indices: MeshGeometryAttribute) {
  let data: Uint16Array | Uint32Array
  const buffer = indices.buffer
  if (buffer instanceof Uint16Array || buffer instanceof Uint32Array) {
    data = buffer
  } else {
    data = new Uint16Array(buffer.length)
    for (let i = 0; i < buffer.length; i++) {
      data[i] = buffer[i]
    }
  }
  return new Buffer({ data, usage: BufferUsage.INDEX | BufferUsage.COPY_DST })
}
