import { Buffer, BufferUsage, Geometry } from "pixi.js"
import { InstancedMesh3D } from "../../mesh/instanced-mesh"
import { InstancedStandardMaterial } from "./instanced-standard-material"

const createBuffer = (size: number) => new Buffer({
  data: new Float32Array(size), usage: BufferUsage.VERTEX | BufferUsage.COPY_DST
})

export class StandardShaderInstancing {
  private _maxInstances = 200

  private _modelMatrix: Buffer[]
  private _normalMatrix: Buffer[]
  private _baseColor: Buffer

  constructor() {
    const size = 4 * this._maxInstances
    this._modelMatrix = [createBuffer(size), createBuffer(size), createBuffer(size), createBuffer(size)]
    this._normalMatrix = [createBuffer(size), createBuffer(size), createBuffer(size), createBuffer(size)]
    this._baseColor = createBuffer(size)
  }

  expandBuffers(instanceCount: number) {
    while (instanceCount > this._maxInstances) {
      this._maxInstances += Math.floor(this._maxInstances * 0.5)
    }
    for (let i = 0; i < 4; i++) {
      this._modelMatrix[i].data = new Float32Array(4 * this._maxInstances)
      this._normalMatrix[i].data = new Float32Array(4 * this._maxInstances)
    }
    this._baseColor.data = new Float32Array(4 * this._maxInstances)
  }

  updateBuffers(instances: InstancedMesh3D[]) {
    if (instances.length > this._maxInstances) {
      this.expandBuffers(instances.length)
    }
    let bufferIndex = 0
    for (let i = 0; i < instances.length; i++) {
      instances[i].updateTransform3D()
      const normal = instances[i].transform.normalTransform.array
      for (let j = 0; j < 4; j++) {
        (<Float32Array>this._normalMatrix[j].data)
          .set(normal.slice(j * 4, j * 4 + 4), bufferIndex * 4)
      }
      const model = instances[i].worldTransform.array
      for (let j = 0; j < 4; j++) {
        (<Float32Array>this._modelMatrix[j].data)
          .set(model.slice(j * 4, j * 4 + 4), bufferIndex * 4)
      }
      const material = <InstancedStandardMaterial>instances[i].material;
      (<Float32Array>this._baseColor.data)
        .set(material.baseColor.rgba, bufferIndex * 4)
      bufferIndex++
    }

    for (let i = 0; i < 4; i++) {
      this._modelMatrix[i].update()
      this._normalMatrix[i].update()
    }
    this._baseColor.update()
  }

  addGeometryAttributes(geometry: Geometry) {
    for (let i = 0; i < 4; i++) {
      geometry.addAttribute(`a_ModelMatrix${i}`, {
        buffer: this._modelMatrix[i], format: "float32x4", instance: true
      })
    }
    for (let i = 0; i < 4; i++) {
      geometry.addAttribute(`a_NormalMatrix${i}`, {
        buffer: this._normalMatrix[i], format: "float32x4", instance: true
      })
    }
    geometry.addAttribute("a_BaseColorFactor", {
      buffer: this._baseColor, format: "float32x4", instance: true
    })
  }
}
