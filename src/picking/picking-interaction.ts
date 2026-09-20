import { WebGLRenderer } from "pixi.js"
import { PickingMap } from "./picking-map"
import { PickingHitArea } from "./picking-hitarea"
import { Compatibility } from "../compatibility/compatibility"

/**
 * Manages the picking hit areas by keeping track on which hit areas needs to
 * be checked for interaction. Renders the hit area meshes to a texture which
 * is then used to map a mesh to a x/y coordinate. The picking manager is
 * registered as a renderer system and refreshes the map after each frame.
 */
export class PickingInteraction {
  private _map?: PickingMap
  private _hitAreas: PickingHitArea[] = []
  private _meshesSeen = 0

  /**
   * Creates a new picking manager using the specified renderer.
   * @param renderer The renderer to use.
   */
  constructor(public renderer: WebGLRenderer) {
    if (!PickingInteraction.main) {
      PickingInteraction.main = this
    }
  }

  /**
   * The picking map, created when a hit area is first tested: every renderer
   * gets a picking interaction, and most never use one.
   */
  private get map() {
    if (!this._map) {
      this._map = new PickingMap(this.renderer, 128)
    }
    return this._map
  }

  /** The main picking interaction which is used by default. */
  static main: PickingInteraction

  /**
   * Called by the renderer after each frame has been rendered. Runs inside
   * the frame so the picking map can be bound and released in balance with
   * the renderer's own render target stack.
   */
  postrender() {
    if (Compatibility.isRendererDestroyed(this.renderer)) {
      return
    }
    // The hit areas only register themselves when their "contains" method is
    // called during a hit test, which the event system only does in response
    // to pointer events. Forcing a hit test every frame keeps the picking map
    // current even while the pointer is still, and makes the result
    // independent of the order in which the objects were added to the stage.
    //
    // A hit area belongs to a mesh or a model, so it is only forced when the
    // pipeline drew meshes since the last time: the hit test walks the whole
    // stage, and PixiJS gives every renderer created after this library loads
    // its own picking interaction, including renderers that only draw 2D.
    const pipeline = this.renderer.renderPipes.pipeline
    const drewMeshes = !pipeline || pipeline.meshesRendered !== this._meshesSeen
    if (pipeline) {
      this._meshesSeen = pipeline.meshesRendered
    }
    const events = this.renderer.events
    if (events && drewMeshes) {
      const boundary = events.rootBoundary
      boundary.rootTarget = this.renderer.lastObjectRendered
      if (boundary.rootTarget) {
        boundary.hitTest(0, 0)
      }
    }
    if (this._hitAreas.length > 0) {
      this.map.resizeToAspect()
      this.map.update(this._hitAreas); this._hitAreas = []
    }
  }

  destroy() {
    if (this === PickingInteraction.main) {
      // @ts-ignore It's ok, main picking interaction was destroyed.
      PickingInteraction.main = undefined
    }
    this._map?.destroy()
    this._map = undefined
  }

  /**
   * Hit tests a area using the specified x/y coordinates.
   * @param x The x coordinate.
   * @param y The y coordinate.
   * @param hitArea The hit area to test.
   */
  containsHitArea(x: number, y: number, hitArea: PickingHitArea) {
    if (this._hitAreas.indexOf(hitArea) < 0) {
      this._hitAreas.push(hitArea)
    }
    return this.map.containsId(x, y, hitArea.id)
  }
}

Compatibility.installRendererSystem("picking", PickingInteraction)
