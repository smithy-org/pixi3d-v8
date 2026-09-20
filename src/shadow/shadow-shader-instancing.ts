import { Buffer, BufferUsage, Geometry } from "pixi.js"
import { InstancedMesh3D } from "../mesh/instanced-mesh"

const createBuffer = (size: number) => new Buffer({
  data: new Float32Array(size), usage: BufferUsage.VERTEX | BufferUsage.COPY_DST
})

export class ShadowShaderInstancing {
  private _maxInstances = 20

  private _modelMatrix: Buffer[]

  constructor() {
    const size = 4 * this._maxInstances
    this._modelMatrix = [createBuffer(size), createBuffer(size), createBuffer(size), createBuffer(size)]
  }

  expandBuffers(instanceCount: number) {
    while (instanceCount > this._maxInstances) {
      this._maxInstances += Math.floor(this._maxInstances * 0.5)
    }
    for (let i = 0; i < 4; i++) {
      this._modelMatrix[i].data = new Float32Array(4 * this._maxInstances)
    }
  }

  updateBuffers(instances: InstancedMesh3D[]) {
    if (instances.length > this._maxInstances) {
      this.expandBuffers(instances.length)
    }
    for (let i = 0; i < instances.length; i++) {
      instances[i].updateTransform3D()
      const model = instances[i].worldTransform.array
      for (let j = 0; j < 4; j++) {
        (<Float32Array>this._modelMatrix[j].data)
          .set(model.slice(j * 4, j * 4 + 4), i * 4)
      }
    }

    for (let i = 0; i < 4; i++) {
      this._modelMatrix[i].update()
    }
  }

  addGeometryAttributes(geometry: Geometry) {
    for (let i = 0; i < 4; i++) {
      geometry.addAttribute(`a_ModelMatrix${i}`, {
        buffer: this._modelMatrix[i], format: "float32x4", instance: true
      })
    }
  }
}
