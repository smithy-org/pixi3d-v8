import { ObservablePoint, Observer } from "pixi.js"

/**
 * The observer handed to `ObservablePoint` by `Point3D` and `Quaternion`.
 * Never called: they replace every method that would call it, and notify
 * their owner through `cb` and `scope`, as they did in PixiJS v7.
 */
export const unusedObserver: Observer<ObservablePoint> = { _onUpdate: () => { } }
