import { Matrix4x4 } from "./matrix"
import { Point3D } from "./point"
import { Quaternion } from "./quaternion"
import { Mat4 } from "../math/mat4"

/**
 * Handles position, scaling and rotation in 3D.
 *
 * Standalone since the PixiJS v8 port: v8 removed the `Transform` class this
 * used to extend (2D containers now own their matrices directly), and the 3D
 * hierarchy is no longer walked by the renderer. `Container3D.updateTransform3D`
 * drives `updateTransform` for the meshes being drawn.
 */
export class Transform3D {
  /** @internal Bumped whenever position, scale or rotation change. */
  _localID = 0
  /** @internal The local id the local matrix was last computed for. */
  _currentLocalID = 0
  /** @internal Bumped whenever the world matrix is recomputed. */
  _worldID = 0
  /**
   * @internal The parent's world id the world matrix was last computed
   * against; -1 means "needs recomputing", -2 means "computed with no parent".
   */
  _parentID = -1

  /** The position in local space. */
  position = new Point3D(0, 0, 0, this.onChange, this)

  /** The scale in local space. */
  scale = new Point3D(1, 1, 1, this.onChange, this)

  /** The rotation in local space. */
  rotationQuaternion = new Quaternion(0, 0, 0, 1, this.onChange, this)

  /** The transformation matrix in world space. */
  worldTransform = new Matrix4x4()

  /** The transformation matrix in local space. */
  localTransform = new Matrix4x4()

  /** The inverse transformation matrix in world space. */
  inverseWorldTransform = new Matrix4x4()

  /** The normal transformation matrix. */
  normalTransform = new Matrix4x4()

  protected onChange() {
    this._localID++
  }

  /**
   * Updates the local transformation matrix.
   */
  updateLocalTransform() {
    if (this._localID === this._currentLocalID) {
      return
    }
    this.localTransform.setFromRotationPositionScale(
      this.rotationQuaternion, this.position, this.scale)

    this._parentID = -1
    this._currentLocalID = this._localID
  }

  /**
   * Sets position, rotation and scale from a matrix array.
   * @param matrix The matrix to set.
   */
  setFromMatrix(matrix: Matrix4x4) {
    this.localTransform.copyFrom(matrix)
    this.position.copyFrom(this.localTransform.position)
    this.scale.copyFrom(this.localTransform.scaling)
    this.rotationQuaternion.copyFrom(this.localTransform.rotation)
  }

  /**
   * Updates the world transformation matrix.
   * @param parentTransform The parent transform.
   */
  updateTransform(parentTransform?: Transform3D) {
    this.updateLocalTransform()
    const parentID = parentTransform ? parentTransform._worldID : -2
    if (this._parentID === parentID) {
      return
    }
    this.worldTransform.copyFrom(this.localTransform)
    if (parentTransform) {
      this.worldTransform.multiply(parentTransform.worldTransform)
    }
    Mat4.invert(this.worldTransform.array, this.inverseWorldTransform.array)
    Mat4.transpose(this.inverseWorldTransform.array, this.normalTransform.array)
    this._worldID++
    this._parentID = parentID
  }

  /**
   * Rotates the transform so the forward vector points at specified point.
   * @param point The point to look at.
   * @param up The upward direction.
   */
  lookAt(point: Point3D, up: Point3D | Float32Array = new Point3D(0, 1, 0)) {
    if (up instanceof Point3D) {
      up = up.array
    }
    let rot = Mat4.getRotation(
      Mat4.targetTo(point.array, this.worldTransform.position.array, up))
    this.rotationQuaternion.set(rot[0], rot[1], rot[2], rot[3])
  }
}
