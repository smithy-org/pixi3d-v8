import type { Camera } from "./camera/camera"
import type { LightingEnvironment } from "./lighting/lighting-environment"
import type { PickingInteraction } from "./picking/picking-interaction"
import type { StandardPipeline } from "./pipeline/standard-pipeline"

// Types what Pixi3D registers on the renderer, the way PixiJS' own
// extensions do: `renderer.camera`, `renderer.lighting`, `renderer.picking`
// and `renderer.renderPipes.pipeline` (`renderer.plugins.*` up to PixiJS v7).
declare global {
  namespace PixiMixins {
    interface RendererSystems {
      camera: Camera
      lighting: LightingEnvironment
      picking: PickingInteraction
    }

    interface RendererPipes {
      pipeline: StandardPipeline
    }
  }
}

export { }
