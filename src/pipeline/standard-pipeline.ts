import { InstructionSet, Instruction, WebGLRenderer } from "pixi.js"
import { MaterialRenderPass } from "./material-render-pass"
import { Mesh3D } from "../mesh/mesh"
import { ShadowRenderPass } from "../shadow/shadow-render-pass"
import { Model } from "../model"
import { ShadowCastingLight } from "../shadow/shadow-casting-light"
import { RenderPass } from "./render-pass"
import { StandardMaterial } from "../material/standard/standard-material"
import { MaterialRenderSortType } from "../material/material-render-sort-type"
import { Compatibility } from "../compatibility/compatibility"
import { SpriteBatchRenderer } from "../sprite/sprite-batch-renderer"
import { ProjectionSprite } from "../sprite/projection-sprite"
import { Sprite3D } from "../sprite/sprite"

/**
 * One run of consecutive meshes and sprites in the renderer's instruction
 * set. Everything collected into it is sorted and drawn together when the
 * renderer executes it, which is what lets transparent materials sort behind
 * opaque ones, lets the shadow pass run once for the batch and lets sprites
 * draw back to front after the meshes.
 */
interface PipelineInstruction extends Instruction {
  renderPipeId: "pipeline"
  canBundle: false
  meshes: Mesh3D[]
  sprites: Sprite3D[]
}

/**
 * The standard pipeline renders meshes using the set render passes, and
 * sprites after them. It's created and used by default.
 *
 * In PixiJS v8 this is a render pipe: the renderer hands it every `Mesh3D`
 * and `Sprite3D` while building the frame's instruction set
 * (`addRenderable`), and calls `execute` when it reaches the pipeline's
 * instruction while drawing.
 */
export class StandardPipeline {
  protected _spriteRenderer!: SpriteBatchRenderer
  protected _meshes: Mesh3D[] = []
  protected _sprites: ProjectionSprite[] = []
  protected _current?: PipelineInstruction

  /** The pass used for rendering materials. */
  materialPass: MaterialRenderPass

  /**
   * The pass used for rendering shadows. Created with the WebGL context,
   * which its shaders depend on; PixiJS v8 creates render pipes before it.
   */
  shadowPass!: ShadowRenderPass

  /** The array of render passes. Each mesh will be rendered with these passes (if it has been enabled on that mesh). */
  renderPasses: RenderPass[]

  /**
   * How many meshes the pipeline has drawn since it was created. It only
   * grows: two readings tell whether any mesh was drawn between them, which
   * is how the picking interaction knows a render drew 3D content.
   */
  meshesRendered = 0

  /**
   * Creates a new standard pipeline using the specified renderer.
   * @param renderer The renderer to use.
   */
  constructor(public renderer: WebGLRenderer) {
    this.materialPass = new MaterialRenderPass(renderer, "material")
    this.renderPasses = [this.materialPass]
    // Render pipes get no calls from the renderer's runners unless they join
    // them. Joined after the renderer's systems, so the render target is
    // already bound when `renderStart` runs.
    renderer.runners.contextChange.add(this)
    renderer.runners.renderStart.add(this)
    if (renderer.gl) {
      this.contextChange()
    }
  }

  /**
   * Creates what depends on the WebGL context: the shadow pass and the
   * sprite renderer.
   */
  contextChange() {
    if (!this.shadowPass) {
      this.shadowPass = new ShadowRenderPass(this.renderer, "shadow")
      this.renderPasses.unshift(this.shadowPass)
    }
    if (!this._spriteRenderer) {
      this._spriteRenderer = new SpriteBatchRenderer(this.renderer)
    }
  }

  /**
   * Clears the render passes. Called by the renderer at the start of every
   * render, including renders to a texture.
   */
  renderStart() {
    for (let pass of this.renderPasses) {
      if (pass.clear) { pass.clear() }
    }
  }

  /**
   * Adds a mesh or a sprite to the instruction set being built.
   * @param object The mesh or sprite to render.
   * @param instructionSet The instruction set currently being built.
   */
  addRenderable(object: Mesh3D | Sprite3D, instructionSet: InstructionSet) {
    this.renderer.renderPipes.batch.break(instructionSet)
    const last = instructionSet.instructions[instructionSet.instructionSize - 1]
    if (!this._current || last !== this._current) {
      this._current = { renderPipeId: "pipeline", canBundle: false, meshes: [], sprites: [] }
      instructionSet.add(this._current)
    }
    if (object instanceof Sprite3D) {
      this._current.sprites.push(object)
    } else {
      this._current.meshes.push(object)
    }
  }

  /** Nothing is cached per object; transforms are read when executing. */
  updateRenderable(object: Mesh3D | Sprite3D) { }

  /** The instruction set never needs rebuilding on account of an object. */
  validateRenderable(object: Mesh3D | Sprite3D) {
    return false
  }

  destroyRenderable(object: Mesh3D | Sprite3D) {
    if (this._current) {
      const list: (Mesh3D | Sprite3D)[] = object instanceof Sprite3D ?
        this._current.sprites : this._current.meshes
      const index = list.indexOf(object)
      if (index >= 0) {
        list.splice(index, 1)
      }
    }
  }

  /**
   * Draws the meshes and sprites collected into an instruction.
   * @param instruction The instruction to execute.
   */
  execute(instruction: PipelineInstruction) {
    for (let mesh of instruction.meshes) {
      if (mesh.isRenderable) {
        this.render(mesh)
      }
    }
    for (let sprite of instruction.sprites) {
      if (sprite.isRenderable) {
        sprite._render(this.renderer)
        this.render(sprite.projectionSprite)
      }
    }
    this.flush()
  }

  /**
   * Adds an object to be rendered by the next `flush`. A sprite's projection
   * must be up to date (see `Sprite3D._render`).
   * @param object The object to render.
   */
  render(object: Mesh3D | ProjectionSprite) {
    if (object instanceof ProjectionSprite) {
      this._sprites.push(object)
    } else {
      this._meshes.push(object)
    }
  }

  /**
   * Renders the added objects to the current render target: the meshes with
   * the render passes, then the sprites.
   */
  flush() {
    this.meshesRendered += this._meshes.length
    for (let mesh of this._meshes) {
      mesh.updateTransform3D()
      if (mesh.skin) {
        mesh.skin.calculateJointMatrices()
      }
    }
    this.sort()
    for (let pass of this.renderPasses) {
      pass.render(this._meshes.filter(mesh => mesh.isRenderPassEnabled(pass.name)))
    }
    this._meshes = []

    if (this._sprites.length > 0) {
      this._spriteRenderer.render(this._sprites)
      this._sprites = []
    }
  }

  /**
   * Sorts the meshes by rendering order, and the sprites by their render
   * sort order and then back to front.
   */
  sort() {
    this._meshes.sort((a, b) => {
      if (!a.material || !b.material) {
        return 0
      }
      if (a.material.renderSortType !== b.material.renderSortType) {
        return a.material.renderSortType === MaterialRenderSortType.transparent ? 1 : -1
      }
      if (a.renderSortOrder === b.renderSortOrder) {
        return 0
      }
      return a.renderSortOrder < b.renderSortOrder ? -1 : 1
    })

    this._sprites.sort((a, b) => {
      if (a.zIndex !== b.zIndex) {
        return a.zIndex - b.zIndex
      }
      return b.distanceFromCamera - a.distanceFromCamera
    })
  }

  /**
   * Enables shadows for the specified object. Adds the shadow render pass to
   * the specified object and enables the standard material to use the casting
   * light.
   * @param object The mesh or model to enable shadows for.
   * @param light The shadow casting light to associate with the
   * object when using the standard material.
   */
  enableShadows(object: Mesh3D | Model, light?: ShadowCastingLight) {
    let meshes = object instanceof Model ? object.meshes : [object]
    for (let mesh of meshes) {
      if (light && mesh.material instanceof StandardMaterial) {
        mesh.material.shadowCastingLight = light
      }
      mesh.enableRenderPass(this.shadowPass.name)
    }
    if (light) {
      this.shadowPass.addShadowCastingLight(light)
    }
  }

  /**
   * Disables shadows for the specified object.
   * @param object The mesh or model to disable shadows for.
   */
  disableShadows(object: Mesh3D | Model) {
    let meshes = object instanceof Model ? object.meshes : [object]
    for (let mesh of meshes) {
      if (mesh.material instanceof StandardMaterial) {
        mesh.material.shadowCastingLight = undefined
      }
      mesh.disableRenderPass(this.shadowPass.name)
    }
  }

  destroy() {
    this.renderer.runners.contextChange.remove(this)
    this.renderer.runners.renderStart.remove(this)
    this._spriteRenderer?.destroy()
    this._meshes = []
    this._sprites = []
    this._current = undefined
  }
}

Compatibility.installRendererPipe("pipeline", StandardPipeline)
