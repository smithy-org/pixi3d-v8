import { Container } from "pixi.js"
import type { UpdateTransformOptions } from "pixi.js"
import { Quaternion } from "./transform/quaternion"
import { Transform3D } from "./transform/transform"
import { IPoint3DData, Point3D } from "./transform/point"
import type { Matrix4x4 } from "./transform/matrix"

/**
 * A container represents a collection of 3D objects.
 *
 * In PixiJS v8 the renderer no longer walks a `transform` object per
 * container, so the 3D hierarchy keeps its own `Transform3D` and updates it
 * on demand through `updateTransform3D` (the render pipeline calls it for
 * every mesh it draws; cameras and lights call it themselves).
 */
export class Container3D extends Container {
  /** The 3D transform (position, scale, rotation and the derived matrices). */
  transform = new Transform3D()

  /**
   * The 3D transformation matrix in local space. Its 2D fields (`a` to `ty`)
   * hold PixiJS' 2D transform of the container, which is always the identity.
   */
  declare localTransform: Matrix4x4

  // The position and scale are 3D points (`Point3D` is an `ObservablePoint`).
  // PixiJS' own 2D position and scale stay at their defaults, so the 2D
  // transform of a 3D object is always the identity.

  set position(value: IPoint3DData) {
    this.transform.position.copyFrom(value)
  }

  /** The position of the object relative to the local coordinates of the parent. */
  get position(): Point3D {
    return this.transform.position
  }

  set scale(value: IPoint3DData) {
    this.transform.scale.copyFrom(value)
  }

  /** The scale of the object. */
  get scale(): Point3D {
    return this.transform.scale
  }

  set rotationQuaternion(value: Quaternion) {
    this.transform.rotationQuaternion.copyFrom(value)
  }

  /** The quaternion rotation of the object. */
  get rotationQuaternion(): Quaternion {
    return this.transform.rotationQuaternion
  }

  // PixiJS v8's own `x` and `y` accessors read and write its 2D `_position`
  // directly rather than going through `position`, so without these the 3D
  // position would silently ignore `container.x = 1`.

  /** The position of the object on the x axis relative to the local
   * coordinates of the parent. */
  get x() {
    return this.transform.position.x
  }

  set x(value: number) {
    this.transform.position.x = value
  }

  /** The position of the object on the y axis relative to the local
   * coordinates of the parent. */
  get y() {
    return this.transform.position.y
  }

  set y(value: number) {
    this.transform.position.y = value
  }

  /** The position of the object on the z axis relative to the local
   * coordinates of the parent. */
  get z() {
    return this.transform.position.z
  }

  set z(value: number) {
    this.transform.position.z = value
  }

  /**
   * The 3D transformation matrix in world space. It is brought up to date
   * with this object's and its ancestors' transforms when read: PixiJS v8
   * does not update 3D transforms while rendering, as v7 did for every
   * object in the scene.
   */
  get worldTransform() {
    this.updateTransform3D()
    return this.transform.worldTransform
  }

  /**
   * Updates the 3D world transform of this object, updating its 3D ancestors
   * first. Cheap when nothing changed (ids are compared, no matrix math).
   */
  updateTransform3D() {
    const parent = this.parent
    if (parent instanceof Container3D) {
      parent.updateTransform3D()
      this.transform.updateTransform(parent.transform)
    } else {
      this.transform.updateTransform()
    }
  }

  /**
   * Updates the 3D world transform of this object, its 3D ancestors and its
   * visible descendants, as `updateTransform()` did up to PixiJS v7.
   *
   * With options, sets the object's properties as PixiJS v8's
   * `Container.updateTransform` does, keeping the z of the 3D position and
   * scale.
   * @param opts The properties to set.
   */
  updateTransform(opts?: Partial<UpdateTransformOptions>): this {
    if (!opts) {
      this.updateTransform3D()
      updateDescendantTransforms(this)
      return this
    }
    const valueOr = (value: number | undefined, current: number) =>
      typeof value === "number" ? value : current
    const { position, scale } = this.transform
    position.set(valueOr(opts.x, position.x), valueOr(opts.y, position.y), position.z)
    scale.set(valueOr(opts.scaleX, scale.x), valueOr(opts.scaleY, scale.y), scale.z)
    this.rotation = valueOr(opts.rotation, this.rotation)
    this.skew.set(valueOr(opts.skewX, this.skew.x), valueOr(opts.skewY, this.skew.y))
    this.pivot.set(valueOr(opts.pivotX, this.pivot.x), valueOr(opts.pivotY, this.pivot.y))
    this.origin.set(valueOr(opts.originX, this.origin.x), valueOr(opts.originY, this.origin.y))
    return this
  }
}

/**
 * Updates the 3D world transforms below a container, skipping invisible
 * branches as PixiJS v7 did.
 * @param container The container whose descendants to update.
 */
function updateDescendantTransforms(container: Container) {
  for (const child of container.children) {
    if (!child.visible) {
      continue
    }
    if (child instanceof Container3D) {
      child.transform.updateTransform(
        container instanceof Container3D ? container.transform : undefined)
    }
    updateDescendantTransforms(child)
  }
}

// PixiJS v8 declares `localTransform` as a field, which TypeScript does not
// let a subclass replace with an accessor, so the accessor is defined here.
// PixiJS assigns the field once, in the `Container` constructor, before the
// 3D transform exists; that matrix is not kept, since PixiJS writes the 2D
// transform into the 3D matrix's 2D fields instead.
Object.defineProperty(Container3D.prototype, "localTransform", {
  get(this: Container3D) {
    this.transform.updateLocalTransform()
    return this.transform.localTransform
  },
  set(this: Container3D, _value: unknown) { },
  configurable: true,
})
