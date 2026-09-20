import { ObservablePoint, Observer, Point, PointData } from "pixi.js"
import { Quat } from "../math/quat"
import { unusedObserver } from "./unused-observer"

const temp = new Float32Array(4)

/**
 * Represents a rotation quaternion in 3D space.
 */
export class Quaternion extends ObservablePoint {
  private _array = new Float32Array(4)

  /** The callback invoked when the quaternion changes. */
  cb: () => void

  /** The owner of the callback. */
  scope: any

  /** Array containing the x, y, z, w values. */
  get array() {
    return this._array
  }

  set array(value: Float32Array) {
    this.setFrom(value)
  }

  /**
   * Creates a new observable quaternion.
   * @param x The x component.
   * @param y The y component.
   * @param z The z component.
   * @param w The w component.
   * @param cb The callback when changed.
   * @param scope The owner of callback.
   */
  constructor(x = 0, y = 0, z = 0, w = 1, cb: () => void = () => { }, scope: any = undefined) {
    super(unusedObserver)
    this.cb = cb
    this.scope = scope
    this._array.set([x, y, z, w])
  }

  /** The x component of the quaternion. */
  get x() {
    return this._array[0]
  }

  set x(value: number) {
    if (this._array[0] !== value) {
      this._array[0] = value
      this.cb.call(this.scope)
    }
  }

  /** The y component of the quaternion. */
  get y() {
    return this._array[1]
  }

  set y(value: number) {
    if (this._array[1] !== value) {
      this._array[1] = value
      this.cb.call(this.scope)
    }
  }

  /** The z component of the quaternion. */
  get z() {
    return this._array[2]
  }

  set z(value: number) {
    if (this._array[2] !== value) {
      this._array[2] = value
      this.cb.call(this.scope)
    }
  }

  /** The w component of the quaternion. */
  get w() {
    return this._array[3]
  }

  set w(value: number) {
    if (this._array[3] !== value) {
      this._array[3] = value
      this.cb.call(this.scope)
    }
  }

  /**
   * Sets the euler angles in degrees.
   * @param x The x angle.
   * @param y The y angle.
   * @param z The z angle.
   */
  setEulerAngles(x: number, y: number, z: number) {
    Quat.fromEuler(x, y, z, this._array); this.cb.call(this.scope)
  }

  /**
   * Creates a clone of this quaternion.
   * @param cb Callback when changed.
   * @param scope Owner of callback.
   */
  clone(cb?: () => void, scope?: any): Quaternion
  /**
   * Creates a clone of this quaternion, notifying a PixiJS observer when
   * changed.
   * @param observer The observer to notify.
   */
  clone(observer?: Observer<ObservablePoint>): Quaternion
  clone(cb: (() => void) | Observer<ObservablePoint> = this.cb, scope: any = this.scope) {
    if (typeof cb === "function") {
      return new Quaternion(this.x, this.y, this.z, this.w, cb, scope)
    }
    const quaternion: Quaternion = new Quaternion(
      this.x, this.y, this.z, this.w, () => cb._onUpdate(quaternion))
    return quaternion
  }

  /**
   * Copies x, y, z, and w from the given quaternion.
   * @param p The quaternion to copy from.
   */
  copyFrom(p: Quaternion) {
    if (this._array[0] !== p.x || this._array[1] !== p.y || this._array[2] !== p.z || this._array[3] !== p.w) {
      this._array[0] = p.x
      this._array[1] = p.y
      this._array[2] = p.z
      this._array[3] = p.w
      this.cb.call(this.scope)
    }
    return this
  }

  /**
   * Copies x, y, z and w into the given quaternion.
   * @param p The quaternion to copy to.
   */
  copyTo<T extends PointData>(p: T) {
    if (p instanceof Quaternion) {
      p.set(this.x, this.y, this.z, this.w)
    }
    return <T>p
  }

  /**
   * Returns true if the given quaternion is equal to this quaternion.
   * @param p The quaternion to check.
   */
  equals(p: Quaternion) {
    return p.x === this.x && p.y === this.y && p.z === this.z && p.w === this.w
  }

  /**
   * Sets the quaternion to new x, y, z and w components.
   * @param x X component to set.
   * @param y Y component to set.
   * @param z Z component to set.
   * @param w W component to set.
   */
  set(x: number, y = x, z = x, w = x) {
    if (this._array[0] !== x || this._array[1] !== y || this._array[2] !== z || this._array[3] !== w) {
      this._array[0] = x
      this._array[1] = y
      this._array[2] = z
      this._array[3] = w
      this.cb.call(this.scope)
    }
    return this
  }

  /**
   * Sets the quaternion to a new x, y, z and w components.
   * @param array The array containing x, y, z and w, expected length is 4.
   */
  setFrom(array: ArrayLike<number>) {
    this.set(array[0], array[1], array[2], array[3]); return this
  }

  /**
   * Normalize the quaternion.
   * @param out The receiving quaternion. If not supplied, a new quaternion will be created.
   */
  normalize(out?: Quaternion): Quaternion
  /**
   * Normalize the quaternion into a 2D point, as `ObservablePoint.normalize`
   * does: receives the x and y of the normalized quaternion.
   * @param out The receiving point.
   */
  normalize<T extends PointData = Point>(out?: T): T
  normalize(out: PointData = new Quaternion()) {
    const normalized = Quat.normalize(this._array, temp)
    if (out instanceof Quaternion) {
      return out.setFrom(normalized)
    }
    out.x = normalized[0]
    out.y = normalized[1]
    return out
  }

  toString() {
    return `[pixi3d:Quaternion x=${this.x} y=${this.y} z=${this.z} w=${this.w}]`
  }

  /**
   * Performs a spherical linear interpolation between two quaternions.
   * @param a The first quaternion.
   * @param b The second quaternion.
   * @param t The interpolation amount, in the range [0-1], between the two inputs.
   * @param out The receiving quaternion. If not supplied, a new quaternion
   * will be created.
   */
  static slerp(a: Quaternion, b: Quaternion, t: number, out = new Quaternion()) {
    return out.setFrom(Quat.slerp(a.array, b.array, t, temp))
  }

  /**
   * Creates a quaternion from the given euler angle x, y, z.
   * @param x X axis to rotate around in degrees.
   * @param y Y axis to rotate around in degrees.
   * @param z Z axis to rotate around in degrees.
   * @param out The receiving quaternion. If not supplied, a new quaternion
   * will be created.
   */
  static fromEuler(x: number, y: number, z: number, out = new Quaternion()) {
    return out.setFrom(Quat.fromEuler(x, y, z, temp))
  }

  /**
   * Calculates the conjugate of a quaternion if the quaternion is normalized.
   * @param a The quaternion to calculate conjugate of.
   * @param out The receiving quaternion. If not supplied, a new quaternion
   * will be created.
   */
  static conjugate(a: Quaternion, out = new Quaternion()) {
    return out.setFrom(Quat.conjugate(a.array, temp))
  }

  /**
   * Rotates a quaternion by the given angle about the X axis.
   * @param a The quaternion to rotate.
   * @param rad The angle (in radians) to rotate.
   * @param out The receiving quaternion. If not supplied, a new quaternion
   * will be created.
   */
  static rotateX(a: Quaternion, rad: number, out = new Quaternion()) {
    return out.setFrom(Quat.rotateX(a.array, rad, temp))
  }

  /**
   * Rotates a quaternion by the given angle about the Y axis.
   * @param a The quaternion to rotate.
   * @param rad The angle (in radians) to rotate.
   * @param out The receiving quaternion. If not supplied, a new quaternion
   * will be created.
   */
  static rotateY(a: Quaternion, rad: number, out = new Quaternion()) {
    return out.setFrom(Quat.rotateY(a.array, rad, temp))
  }

  /**
   * Rotates a quaternion by the given angle about the Z axis.
   * @param a The quaternion to rotate.
   * @param rad The angle (in radians) to rotate.
   * @param out The receiving quaternion. If not supplied, a new quaternion
   * will be created.
   */
  static rotateZ(a: Quaternion, rad: number, out = new Quaternion()) {
    return out.setFrom(Quat.rotateZ(a.array, rad, temp))
  }
}
