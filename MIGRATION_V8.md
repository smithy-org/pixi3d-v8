# Migrating from Pixi3D 2.5 to the PixiJS v8 port

This fork keeps the API of Pixi3D 2.5.0 on PixiJS v8 (8.20 or later). Most
code runs unchanged. This note lists every place where PixiJS v8 forced a
difference, and what to write instead. For changes in PixiJS itself
(`DisplayObject` becoming `Container`, `BaseTexture` becoming
`TextureSource`, blend modes as strings, and so on), see the
[PixiJS v8 migration guide](https://pixijs.com/8.x/guides/migrations/v8).

The fork is unofficial and comes as is; see the notice in the
[README](README.md).

## Setting up

- **PixiJS 8.20 or later.** The cubemap upload uses an extension point
  PixiJS added in 8.19.
- **One entry point:** import from `pixi3d`. The `pixi3d/pixi7` entry point
  is gone.
- **WebGL only.** Pixi3D's shaders are GLSL, so create the application with
  `preference: "webgl"`:

  ```javascript
  const app = new PIXI.Application()
  await app.init({ preference: "webgl", resizeTo: window, antialias: true })
  ```

- Importing Pixi3D registers its renderer extensions and asset loaders, as
  before. Import it before the renderer is created (`app.init`), since PixiJS
  v8 sets up a renderer's extensions when it is initialised.

## Reaching Pixi3D on the renderer

PixiJS v8 has no `renderer.plugins`. What Pixi3D registered there is now a
renderer system or render pipe, and typed, so no casts are needed:

| Pixi3D 2.5 | This port |
|---|---|
| `renderer.plugins.pipeline` | `renderer.renderPipes.pipeline` |
| `renderer.plugins.camera` | `renderer.camera` |
| `renderer.plugins.lighting` | `renderer.lighting` |
| `renderer.plugins.picking` | `renderer.picking` |
| `renderer.plugins.sprite3d` | None; the pipeline owns its sprite renderer. |

`Camera.main`, `LightingEnvironment.main` and `PickingInteraction.main` are
unchanged.

## API changes

### `Point3D.magnitude` is a method

Write `point.magnitude()` where 2.5 had `point.magnitude`. PixiJS v8
declares `magnitude()` on every `ObservablePoint` (part of its math extras),
and `Point3D` is an `ObservablePoint`, as it was in 2.5. A getter cannot
satisfy that declaration, and without it every 3D object would be rejected
by TypeScript wherever PixiJS expects a `Container`, starting with
`app.stage.addChild(model)`.

`Point3D.normalize(out)` and `Quaternion.normalize(out)` are unchanged; they
also accept a 2D point now, as `ObservablePoint.normalize` does.

### The standard pipeline

- `StandardPipeline` is a PixiJS v8 render pipe and no longer extends
  `ObjectRenderer`. `render(object)` and `flush()` still queue and draw
  objects; `enableShadows`, `disableShadows`, `renderPasses`,
  `materialPass`, `shadowPass` and `sort` are unchanged.
- The render passes are cleared at the start of every render, including
  renders to a texture, as they were on `prerender`.

### Sprites

- `Sprite3D` is unchanged. `SpriteBatchRenderer`, which draws the sprites, is
  now a PixiJS v8 `Batcher`: `render(sprites)` draws a sorted list of
  projected sprites. PixiJS v7's object renderer methods (`start`,
  `render(sprite)`, `flush`, `stop`) and `packInterleavedGeometry` have no
  v8 equivalent.
- `Sprite3D.blendMode` takes PixiJS v8's blend mode names (`"normal"`,
  `"add"`, `"multiply"`, ...). It is `"normal"` by default, as before, and
  does not inherit from the containers above the sprite.
- `CompositeSpriteOptions.objectToRender` is a `Container`; v8 has no
  `DisplayObject`.
- With `roundPixels`, a sprite's corners are rounded at the renderer's
  resolution. PixiJS v7 used the global `settings.RESOLUTION`, which v8
  removed.

### Meshes and materials

- Meshes are drawn through PixiJS v8's render pipes, so `Mesh3D._render`, the
  PixiJS v7 render hook, is gone. `renderPipeId` names the pipe that draws a
  mesh; `pluginName` still works as another name for it.
- `MeshShader` takes a PixiJS v8 `GlProgram`
  (`GlProgram.from({ vertex, fragment })`) where it took a v7 `Program`
  (`Program.from(vertex, fragment)`). `Material.from(vertex, fragment)` is
  unchanged.
- `MeshShader.render(mesh, renderer, state, drawMode)` takes a PixiJS v8
  topology (`"triangle-list"`, `"line-strip"`, ...) as its last argument.
  PixiJS' deprecated `DRAW_MODES` constants still map to these.
- `StandardMaterialTexture`, `StandardMaterialNormalTexture` and
  `StandardMaterialOcclusionTexture` take a `TextureSource` where they took a
  `BaseTexture`.

### Cubemaps

- `Cubemap` extends `Texture`; v8 has no `BaseTexture`. `Cubemap.fromFaces`,
  `Cubemap.fromColors` and the `.cubemap` loader work as before, and
  `Cubemap.fromFaces` takes an optional format.
- `CubemapResource` is a PixiJS v8 `TextureSource` built from mip levels,
  each holding the six faces:
  `new CubemapResource([{ posx, negx, posy, negy, posz, negz }, ...])`.
  In 2.5 it took six `MipmapResource`s and a level count. `levels` is
  read-only (the number of levels given), and PixiJS v7's `style` hook is
  gone: the source sets its own addressing and filtering.

### Transforms

- `Transform3D` no longer extends PixiJS' 2D `Transform`, which v8 removed.
  The 2D members it inherited (`pivot`, `skew`, `rotation`, `setFromMatrix`,
  `updateSkew`) went with it; everything 3D is unchanged.
- `Container3D.updateTransform()` updates the 3D world transforms of the
  object, its ancestors and its visible descendants, as in 2.5. PixiJS v8
  uses the same name for setting properties; called with options
  (`updateTransform({ x: 1 })`), it does that, keeping the z of the position
  and scale.
- `Container3D.localTransform` is still the 3D matrix. Its 2D fields hold
  PixiJS' own 2D transform of the container, which is always the identity.

### Loading

- Loading goes through `Assets`, as it already did on PixiJS v7:
  `Assets.load("model.gltf")`, `.glb`, `.cubemap`, and shader sources
  (`.vert`, `.frag`, `.glsl`). The PixiJS v5 and v6 `Loader` path is gone.
- `glTFAsset.load` and `glTFAsset.fromBuffer` return promises; their
  callbacks still fire.
- `glTFResourceLoader` gains promise-based `loadBuffer` and `loadTexture`.
  A loader that implements only 2.5's `load(uri, onComplete)` still works:
  it passes a buffer as `data` and an image as `texture`.

### Everything else

- `CameraOrbitControl.onMouseDownInteraction` is gone. It handled PixiJS v5
  and v6's `InteractionManager`, which v7 removed, so it was never called on
  v7 either.
- `LightingEnvironment` and `PickingInteraction` are PixiJS v8 renderer
  systems where they were v7 renderer plugins. Their API is unchanged.

## Changes in PixiJS that show in 3D scenes

These come from PixiJS itself; Pixi3D renders as it did.

- `CameraOrbitControl` takes the element to listen on: pass
  `renderer.canvas` or `app.canvas`. In PixiJS v8, `renderer.view` is no
  longer the canvas.
- PixiJS v8's `BlurFilter` spreads its strength over its passes differently
  from v7's, so a blurred `CompositeSprite` looks blurrier.
  `new BlurFilter({ legacy: true })` blurs as v7 did.
- Picking hit areas work with PixiJS v8's event system; set
  `mesh.eventMode = "static"` (`interactive = true` still works in v8, as a
  deprecated alias).
