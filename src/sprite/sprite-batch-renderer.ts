import { Batcher, GlProgram, InstructionSet, Shader, State, UniformGroup } from "pixi.js"
import type { Batch, BatchableMeshElement, BatchableQuadElement, BLEND_MODES, BoundsData, Texture, Topology, WebGLRenderer } from "pixi.js"
import { SpriteBatchGeometry } from "./sprite-batch-geometry"
import { Shader as Vertex } from "./shader/sprite.vert"
import { Shader as Fragment } from "./shader/sprite.frag"
import type { ProjectionSprite } from "./projection-sprite"

/**
 * A sprite as the batcher sees it: always a textured quad.
 */
class BatchableSprite3D implements BatchableQuadElement {
  batcherName = "sprite3d"
  packAsQuad = true as const
  attributeSize = 4 as const
  indexSize = 6 as const
  topology: Topology = "triangle-list"
  texture!: Texture
  blendMode: BLEND_MODES = "normal"
  bounds!: BoundsData
  sprite!: ProjectionSprite
  /** Tint and alpha, as ABGR bytes (the 2D batch's color layout). */
  color = 0xffffffff
  _textureId = 0
  _attributeStart = 0
  _indexStart = 0
  _batcher!: Batcher
  _batch!: Batch

  /**
   * Points the element at a sprite for this frame.
   * @param sprite The sprite, projected for this frame.
   */
  set(sprite: ProjectionSprite) {
    this.sprite = sprite
    this.texture = sprite.texture
    this.bounds = sprite.visualBounds
    this.blendMode = sprite.blendMode === "inherit" ? "normal" : sprite.blendMode
    this.color = SpriteBatchRenderer.packColor(sprite.tint,
      Math.min(sprite.worldAlpha, 1), sprite.texture.source.alphaMode !== "no-premultiply-alpha")
  }
}

/**
 * Generates the texture lookup for a batch of `count` textures: GLSL ES 1.00
 * can only index a sampler array with a constant, so it is an if/else chain
 * on the texture id (what PixiJS v7's batch shader generator produced for
 * `%forloop%`).
 */
function generateSampleSource(count: number) {
  let source = ""
  for (let i = 0; i < count; i++) {
    if (i > 0) {
      source += "\nelse "
    }
    if (i < count - 1) {
      source += `if(vTextureId < ${i}.5)`
    }
    source += "\n{"
    source += `\n\tcolor = texture2D(uSamplers[${i}], vTextureCoord);`
    source += "\n}"
  }
  return source
}

/**
 * Batches and draws sprites in 3D space. Built on PixiJS' `Batcher`, which
 * does the texture batching; every vertex also carries its sprite's
 * model-view-projection matrix, so sprites with different transforms still
 * share a draw call. The standard pipeline draws the sprites of a frame
 * through this after the meshes, sorted back to front.
 */
export class SpriteBatchRenderer extends Batcher {
  readonly name = "sprite3d"
  protected vertexSize = SpriteBatchGeometry.vertexSize
  geometry = new SpriteBatchGeometry()
  shader: Shader

  private _pool: BatchableSprite3D[] = []
  private _instructions = new InstructionSet()
  private _state = Object.assign(new State(), {
    culling: false, clockwiseFrontFace: false, depthTest: true, blend: true
  })

  /**
   * Creates a new sprite batch renderer.
   * @param renderer The renderer to draw with.
   */
  constructor(public renderer: WebGLRenderer) {
    super({ maxTextures: renderer.limits.maxBatchableTextures })
    const samplers = new Int32Array(this.maxTextures)
    for (let i = 0; i < samplers.length; i++) {
      samplers[i] = i
    }
    this.shader = new Shader({
      glProgram: GlProgram.from({
        name: "pixi3d-sprite-batch",
        vertex: Vertex.source,
        fragment: Fragment.source
          .replace(/%count%/gi, `${this.maxTextures}`)
          .replace(/%forloop%/gi, generateSampleSource(this.maxTextures)),
      }),
      resources: {
        spriteUniforms: new UniformGroup({
          tint: { value: new Float32Array([1, 1, 1, 1]), type: "vec4<f32>" },
        }),
        spriteSamplers: new UniformGroup({
          uSamplers: { value: samplers, type: "i32", size: this.maxTextures },
        }, { isStatic: true }),
      },
    })
  }

  /**
   * Draws the specified sprites, in the order given. Their projections must
   * be up to date (see `Sprite3D._render`).
   * @param sprites The sprites to draw.
   */
  render(sprites: ProjectionSprite[]) {
    if (sprites.length === 0) {
      return
    }
    const renderer = this.renderer
    this.begin()
    this._instructions.reset()
    for (let i = 0; i < sprites.length; i++) {
      const element = this._pool[i] ?? (this._pool[i] = new BatchableSprite3D())
      element.set(sprites[i])
      this.add(element)
    }
    this.break(this._instructions)

    const geometry = this.geometry
    geometry.indexBuffer.setDataWithSize(this.indexBuffer, this.indexSize, true)
    geometry.buffers[0].setDataWithSize(this.attributeBuffer.float32View, this.attributeSize, true)

    renderer.shader.bind(this.shader)
    renderer.geometry.bind(geometry, this.shader.glProgram)
    for (let i = 0; i < this._instructions.instructionSize; i++) {
      const batch = <Batch>this._instructions.instructions[i]
      this._state.blendMode = batch.blendMode
      renderer.state.set(this._state)
      const textures = batch.textures.textures
      for (let t = 0; t < batch.textures.count; t++) {
        renderer.texture.bind(textures[t], t)
      }
      renderer.geometry.draw(batch.topology, batch.size, batch.start)
    }
  }

  /**
   * Packs one sprite's quad: position, texture coordinates, color and
   * texture id per corner, as the 2D batch does, then the sprite's
   * model-view-projection matrix.
   */
  packQuadAttributes(element: BatchableQuadElement, float32View: Float32Array, uint32View: Uint32Array, index: number, textureId: number) {
    const sprite = (<BatchableSprite3D>element).sprite
    const vertexData = sprite.vertexData
    const uvs = sprite.texture.uvs
    const color = (<BatchableSprite3D>element).color
    const modelViewProjection = sprite.modelViewProjection.array
    for (let corner = 0; corner < 4; corner++) {
      float32View[index++] = vertexData[corner * 2]
      float32View[index++] = vertexData[corner * 2 + 1]
      switch (corner) {
        case 0: float32View[index++] = uvs.x0; float32View[index++] = uvs.y0; break
        case 1: float32View[index++] = uvs.x1; float32View[index++] = uvs.y1; break
        case 2: float32View[index++] = uvs.x2; float32View[index++] = uvs.y2; break
        case 3: float32View[index++] = uvs.x3; float32View[index++] = uvs.y3; break
      }
      uint32View[index++] = color
      float32View[index++] = textureId
      for (let j = 0; j < 16; j++) {
        float32View[index++] = modelViewProjection[j]
      }
    }
  }

  /** Sprites are always quads; see `packQuadAttributes`. */
  packAttributes(_element: BatchableMeshElement, _float32View: Float32Array, _uint32View: Uint32Array, _index: number, _textureId: number) {
    throw new Error("PIXI3D: The sprite batch renderer only draws quads.")
  }

  /**
   * Packs a tint and an alpha into the batch's color layout (ABGR bytes),
   * rounding as PixiJS v7 did. For textures with premultiplied alpha, the
   * color is premultiplied too.
   * @param tint The tint, as 0xRRGGBB.
   * @param alpha The alpha, 0 to 1.
   * @param premultiplied Whether the texture has premultiplied alpha.
   */
  static packColor(tint: number, alpha: number, premultiplied: boolean) {
    let r = (tint >> 16) & 0xff
    let g = (tint >> 8) & 0xff
    let b = tint & 0xff
    if (premultiplied && alpha < 1) {
      if (alpha === 0) {
        return 0
      }
      r = (r * alpha + 0.5) | 0
      g = (g * alpha + 0.5) | 0
      b = (b * alpha + 0.5) | 0
    }
    return (((alpha * 255) << 24) | (b << 16) | (g << 8) | r) >>> 0
  }

  destroy() {
    this._pool = []
    this._instructions.destroy()
    super.destroy({ shader: true })
  }
}
