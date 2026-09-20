# PixiJS v8 port status

Pixi3D (upstream: https://github.com/jnsmalm/pixi3d) has no PixiJS v8 support.
Its own issue tracker has an open v8 feature request since September 2024
and a closed duplicate from August 2024, neither acted on; the last commit
to the project was in May 2024. This fork exists to port it to v8 so it can
be used in a v8 project. Branch: `pixi-v8-port`.

The goal is a compatibility port, not a redesign: every feature Pixi3D 2.5.0
has, with the same public API wherever PixiJS v8 allows. Where v8 forces a
difference, it is the smallest possible one and is written down.

## PixiJS version

- **Target: PixiJS 8.20.** `peerDependencies` is `pixi.js ^8.20.0`; the port
  is developed, type-checked and render-tested on 8.20.x (`devDependencies`
  `~8.20.1`).
- The cubemap upload registers a `TextureUploaderWebGL` extension, which
  PixiJS added in 8.19; nothing older can load a `Cubemap`.
- PixiJS v5, v6 and v7 are not supported by this fork. Use upstream Pixi3D
  2.5 for those.

## Current state

- `npx tsc --noEmit -p tsconfig.json` reports **0 errors**; every module in
  `src/` compiles against v8.
- **Rendered on PixiJS 8.20.1** in the harness (below), with no shader
  compile errors:
  - `#cube`: a lit `StandardMaterial` cube on a plane (the render core).
  - `#teapot`: a glTF model through `Assets` (loaders, glTF parser, `Model`).
  - `#material`: a custom `Material.from` shader.
  - `#demo`: upstream's demo in full, with image-based lighting from
    cubemaps, a shadow-casting directional light with soft (blurred)
    shadows, and orbit control.
  - `#sprite`: `Sprite3D` with each billboard type, sorted back to front and
    depth tested against meshes; a tinted, faded sprite with a
    non-premultiplied texture and its own pixels per unit; and a
    `CompositeSprite` rendering a model that is not on the stage, at half
    resolution, with a blur filter.
- **API parity:** every export and member of Pixi3D 2.5.0 is present, except
  where PixiJS v8 forces a difference; each of those is in
  [MIGRATION_V8.md](MIGRATION_V8.md). See "API parity audit" below.
- **Upstream's snapshot suite passes on PixiJS 8.20.1, on WebGL 2 and on
  WebGL 1**: all 40 snapshot tests against the original v7 snapshots, none
  re-baselined, the two picking tests, two new morphing tests and two new
  tests of when picking hit tests the stage: 46 tests
  (`npm test`; see "Snapshot test suite" below). Compared with 2.5.0 on
  PixiJS 7.2.4 on the same machine, every WebGL 1 render is identical pixel
  for pixel, and so are 41 of the 42 WebGL 2 renders; the directional
  shadow differs by 3 pixels there, most likely from the shadow map's depth
  buffer (v7 used a 16-bit depth texture, v8 a 24-bit buffer).
- Every subsystem of 2.5.0 is now covered by a test or a harness scene.

### v8 differences found by rendering

Each of these type-checked cleanly and still drew the wrong thing.

- **`x` and `y` bypassed the 3D position.** v8's `Container.x`/`y` accessors
  read and write its 2D `_position` directly, so `container.y = 1` changed
  nothing in 3D. `Container3D` now overrides both, as it already did `z`.
- **The shadow blur failed to compile on WebGL2**, which v8 uses by default:
  it was built without the WebGL version defines and used `texture2D`.
- **Loader parsers need `name` beside `id`.** `name` is deprecated in 8.20,
  but the `Assets` loader still validates parsers by it, and reports every
  parser without one as a conflict.
- **glTF nodes set `label`**, v8's name for a container's name; `name` still
  reads it through v8's deprecated alias.
- **Render pipes get no calls from the renderer's runners.** v8 constructs
  pipes but only systems join `prerender`, `renderStart` and the rest, so the
  pipeline's per-frame clear of its passes never ran. A shadow map then kept
  the last frame's shadow whenever no mesh cast one (remove the caster and
  its shadow stayed on the ground). The pipeline now joins `renderStart`
  itself.
- **Pipes are created before the WebGL context**, and the shadow pass needs
  it (its shaders depend on the WebGL version). The pipeline creates the
  shadow pass on `contextChange`, so `renderPasses` is `[shadow, material]`
  and `shadowPass` a plain property again, as in 2.5.0.
- **3D rendered to a texture is still upside down** relative to 2D content,
  as in v7, so `CompositeSprite` keeps its flipped texture (`rotate: 8`).
  It renders through its own render target with a depth buffer; v8 creates
  targets for a texture without one.
- **A sprite's quad comes from `visualBounds`**, which includes the texture
  trim; v8's `bounds` does not.

### v8 differences found by the snapshot suite

The harness scenes render many frames; the suite renders one, which exposed
everything that only became right on a later frame, and a few worse.

- **v8 inverts the front face when drawing into a render texture**, to match
  its 2D projection, which flips y there. Pixi3D's projection does not, so
  every culled mesh drawn into a texture lost its front faces: the shadow
  map held back faces (shadows shifted), a single-sided mesh cast no shadow,
  and the same held for `CompositeSprite` and the picking map. `MeshShader`
  now draws there with the opposite winding, which v8's inversion turns back
  (8.20's `renderTarget.frontFaceInverted` says when).
- **Nothing updates 3D transforms while rendering**, where v7 updated every
  object's each frame. The port updated a mesh and its ancestors before
  drawing it, which missed joints (a skinned mesh drew in its bind pose),
  lights, and the camera (the shadow pass read both before anything updated
  them). `Container3D.worldTransform` and `localTransform` now bring
  themselves up to date when read, `Skin` updates its joints, and `Camera`
  and `LightingEnvironment` update on `prerender` again, as they did in
  2.5.0.
- **The BRDF lookup texture was created on first use**, so it was still
  decoding during the first render and metallic surfaces drew black. It is
  decoded when the library loads again, as the 2.5.0 static field was.
- **glTF textures sample as in 2.5.0** again: the sampler's wrap mode along s
  for both axes, linear filtering, mipmaps for power-of-two images. The port
  had applied the samplers' filters, which 2.5.0 never did.
- **v8's `BlurFilter` blurs differently from v7's** (the strength is spread
  over the passes differently). The composite sprite test uses
  `BlurFilter({ legacy: true })`, v7's blur, so it still compares against the
  original snapshot.

### v8 differences found on WebGL 1

- **GLSL ES 1.00 shaders did not compile.** v8's `GlProgram` puts a
  `#define SHADER_NAME` line, a block of WebGL 1 defines and a precision
  statement at the top of every GLSL ES 1.00 source: the `#version 100`
  directive was no longer first, and a statement came before the
  `#extension` directives. `MeshShader` moves both back into place before
  the program is first compiled (`compatibility/gl-program.ts`).
- **v8 creates no float textures on WebGL 1.** It passes WebGL 2's sized
  internal formats (`RGBA32F`, `RGBA16F`) and has no half float type there,
  so the joint matrix textures and the shadow maps failed to allocate.
  They are allocated by a Pixi3D texture uploader (the 8.19 extension
  point) that uses WebGL 1's unsized format and `OES_texture_half_float`'s
  type, as PixiJS v7 did (`compatibility/float-texture-uploader.ts`).
- **The shader extensions were never enabled.** 2.5.0's `StandardMaterial`
  enabled `EXT_shader_texture_lod` and `OES_standard_derivatives` before
  building a shader on WebGL 1, and the port had dropped that; without
  derivatives, a mesh without normals shaded black. Restored.
- **The capability probes changed GL state behind v8's back**, leaving a
  probe texture and framebuffer bound, which v8 keeps a record of. They
  restore the bindings now.
- PixiJS v8 sets some WebGL 2-only texture parameters on WebGL 1 too, which
  logs `INVALID_ENUM: texParameter` warnings there; they change nothing.

### Faster than 2.5.0 where it did work for nothing

- **Picking hit tests the stage only after a render that drew meshes.** A
  picking hit area only registers itself when the event system calls its
  `contains`, so the picking interaction forces a hit test at (0, 0) to keep
  its map current: a walk of the whole stage. 2.5.0 did that on every tick
  for every renderer, and every renderer gets a picking interaction once
  Pixi3D loads, as a plugin in v7 and a system in v8. A renderer drawing
  only 2D paid for it on every frame: with a stage of about a thousand
  interactive 2D objects, the walk tripled the CPU time of a frame. Hit areas
  belong to meshes and models, so a render that drew no meshes has nothing
  to register; the pipeline counts the meshes it draws
  (`StandardPipeline.meshesRendered`), and the picking interaction skips the
  hit test when the count has not moved since the last one. Where meshes
  are drawn, it runs as before (`test/interaction.test.mjs` checks both).
- **The picking map is created when a hit area is first tested**, not with
  every renderer.

## API parity audit

2.5.0 never committed its generated `types/`, so the audit compared sources:
a script walked every export of `src/index.ts` at `v2.5.0` and now (69 each)
with the TypeScript parser, listing each class, interface, enum and
namespace member that is not private, with its parameters, and diffed the
two. Every 2.5.0 export is present. Restored where the port had changed
something without need:

- `Point3D` and `Quaternion` extend `ObservablePoint` again, so a
  `Container3D` is a `Container` to TypeScript and `stage.addChild(model)`
  type-checks without a cast. The one cost, `magnitude()` becoming a method,
  is forced by v8's typings (see the migration note).
- `Container3D.localTransform` is the 3D matrix again (the port had renamed
  it `localTransform3D`). v8 declares the property as a field, so the
  accessor is defined on the prototype; v8 writes its 2D transform into the
  matrix's 2D fields.
- `Container3D.updateTransform()` updates the 3D world transforms of the
  object, its ancestors and its visible descendants, as in 2.5.0. Without
  this, v8's `Container.updateTransform(opts)` threw when called without
  options and, with them, set z to x through `Point3D.set(x, y)`.
- `StandardPipeline.render(object)` and `flush()`; `execute` now uses them.
- `glTFResourceLoader.load(uri, onComplete)`, beside the promise-based
  `loadBuffer` and `loadTexture`.
- `ImageBasedLighting.defaultLookupBrdf` can be assigned again.
- The renderer systems and pipe are typed through PixiJS' `PixiMixins`, so
  `renderer.renderPipes.pipeline` and `renderer.camera` need no cast, as
  `renderer.plugins.*` needed none on v7.

A throwaway TypeScript file written the way 2.5.0 code is (adding models to
the stage, `renderer.renderPipes.pipeline`, a 2.5.0-style resource loader)
compiled without errors against the port, and failed on a deliberate type
error. The differences that remain are forced by v8 and are all in
[MIGRATION_V8.md](MIGRATION_V8.md).

## Releases

`v3.0.0-alpha.2` is the latest tag (`v3.0.0-alpha.1` before it). Installing
it from GitHub (`github:pjderouen/pixi3d#v3.0.0-alpha.2`) next to PixiJS
8.20.1 gives a
package that type-checks (strict, declarations checked too) and bundles,
and the README's script tags load its browser build from jsDelivr and
render.

Installing from GitHub does not build, and the branch ignores `dist/` and
`types/`, so a release is tagged on a commit of its own, off the branch:

1. Set the version in `package.json` and `package-lock.json`, add a
   changelog entry, commit it to the branch and push.
2. `npm test`, and `npm test` again with `WEBGL_VERSION=1`; then
   `npm run types` (the test run has already built `dist/`).
3. `git checkout --detach`, `git add -f dist types`, commit ("Release
   x.y.z"), `git tag -a vx.y.z`, `git checkout pixi-v8-port`.
4. Push the tag alone: `git push origin vx.y.z`.

## Snapshot test suite

```
npm test
```

builds the library, then renders every test scene in headless Chromium
(puppeteer's bundled build) with the `pixi.js` from `node_modules`, and
compares each render with its snapshot in `test/snapshots` using the
suite's own `threshold` and `maxDiff`. Set `WEBGL_VERSION=1` to render with
WebGL 1, and `RENDER_OUT` to a directory to also write every render there,
named after its snapshot.

The snapshots are upstream's, made on PixiJS v7. To tell a difference caused
by the port from one caused by the machine, 2.5.0 was run first, unchanged,
on PixiJS 7.2.4 (both from npm) on the same machine: all 40 snapshot tests
passed, so they reproduce here. The test code changed only where PixiJS v8
or the migration note requires: `renderer.renderPipes.pipeline` for
`renderer.plugins.pipeline`, `GlProgram.from({ vertex, fragment })` for
`Program.from(vertex, fragment)`, `renderer.canvas` for `renderer.view`,
the renderer created with `autoDetectRenderer`, and the legacy blur above.
The picking tests are new versions of upstream's, which asserted inside the
page and so never ran under puppeteer; they run in both runners now, through
`evaluateInPage`.

Upstream had no morphing test. `test/morph.test.mjs` renders a quad with one
morph target (`test/assets/morph/morph.gltf`, written by hand), at the
mesh's default weight and at an animated one. Its two snapshots were
rendered by 2.5.0 on PixiJS 7.2.4 in the same way as upstream's, so the
port is compared with the original implementation there too.

## Render harness

```
npx rollup -w -c rollup.harness.mjs
```

serves `serve/` on http://127.0.0.1:8080. Pick a scene with the hash (`#cube`,
`#teapot`, `#material`, `#demo`, `#sprite`). The bundle includes the `pixi.js` from
`node_modules`, so the harness always runs the version the port is built
against. A page sets `window.__PIXI3D_READY__` when its scene is built,
`window.__PIXI3D_ERROR__` if building it threw, and collects every shader
that failed to compile, with its source, in `window.__PIXI3D_SHADER_ERRORS__`
(Pixi3D compiles its mesh shaders outside PixiJS' program cache, so such a
failure otherwise shows only as a mesh that never draws).

## Explicitly out of scope for this port

- WebGPU/Canvas backends — pixi3d is WebGL-only by design (hand-written
  GLSL), and this port only targets v8's WebGL backend to match. Do not
  "fix" `getGlContext()`'s cast by trying to make it WebGPU-safe.
- `@pixi/webworker` — not used by pixi3d, not touched.

## Toolchain notes

- `npm run build` builds `dist/browser`, `dist/cjs` and `dist/esm` (each
  `pixi3d.js` and `pixi3d.min.js`) with `pixi.js` external; `package.json`
  still points at the old layout until step 1 above.
- `typedoc` 0.22 predates the TypeScript 5 this port needs, so the lockfile
  is resolved with legacy peer dependencies until the docs step updates it.

## glTF / loader slice

`src/gltf/**`, `src/loader/**`, `src/model.ts` and `src/instanced-model.ts`
compile against v8 and render (the `#teapot` and `#demo` scenes).

- **Loading is `Assets` + `extensions.add(LoadParser)`.** The removed
  `@pixi/loaders` plugin flow (`Compatibility.installLoaderPlugin`,
  `setLoaderResourceExtensionType`, `Compatibility.assets`) is gone. Each of
  `src/loader/{gltf,gltf-binary,cubemap,shader-source}-loader.ts` is now a
  `LoaderParser` registered at import time; the public results are
  unchanged: `Assets.load("x.gltf" | "x.glb")` -> `glTFAsset`,
  `Assets.load("x.cubemap")` -> `Cubemap`, `Assets.load("x.vert" | ".frag" |
  ".glsl")` -> `string`. Extension matching uses v8's `checkExtension` (exact
  extension, query string stripped) rather than the old `url.includes(".gltf")`.
- **Dependent resources.** External glTF buffers are fetched directly with
  `DOMAdapter.get().fetch`; external glTF images and cubemap faces are loaded
  through the `Loader` instance the parser receives (so they share its
  promise cache) and fall back to `Assets.load` outside a parser
  (`glTFAsset.fromURL`). Relative uris resolve against the glTF/cubemap file
  url, as before.
- **`glTFResourceLoader` is now promise-based**: `loadBuffer(uri):
  Promise<ArrayBuffer>` and `loadTexture(uri): Promise<Texture>` replace the
  callback `load(uri, onComplete: (resource: ILoaderResource) => void)`.
  `glTFUrlResourceLoader` in `gltf-asset.ts` is the default implementation.
  `glTFAsset.load` / `glTFAsset.fromBuffer` return promises (the optional
  callback still fires for source compatibility); `fromBuffer` takes an
  optional resource loader so a `.glb` with external uris loads too.
- **Embedded / binary-chunk images** are decoded up front with
  `createImageBitmap(blob, { premultiplyAlpha: "none" })` (HTMLImageElement
  fallback) and wrapped in `new Texture({ source: new ImageSource(...) })`,
  since v8's `Texture.from(url)` is a cache lookup, not a load.
- **glTF sampler mapping** (`gltf-parser.ts`): each glTF texture gets its
  own `ImageSource` over the shared decoded resource (v8 keeps sampling state
  on the source, so this is the equivalent of v7's per-texture
  `BaseTexture`). `wrapS`/`wrapT` -> `style.addressModeU/V`
  (`repeat` / `clamp-to-edge` / `mirror-repeat`), `magFilter`/`minFilter` ->
  `style.magFilter/minFilter/mipmapFilter` (`nearest` / `linear`),
  and the `*_MIPMAP_*` min filters -> `autoGenerateMipmaps: true`. When a
  sampler omits filters, trilinear + mipmaps is used (the glTF sample viewer's
  choice); v7 only honoured `wrapS`. Alpha stays `no-premultiply-alpha`.
  `Texture.clone()` is gone, so material textures are `new Texture({ source })`
  over the parsed texture (`parseTextureInfo`, which also folds the five
  duplicated `KHR_texture_transform` blocks into one).
- `Model.getBoundingBox` calls `updateTransform3D()`; v8's
  `Container.updateTransform()` is a different (2D) method.
- `src/index.ts`: dropped the `@pixi/mixin-get-child-by-name` type reference
  (v8 ships `getChildByName`/`getChildByLabel` itself).

Caveats:

- Parsers register no `unload`; glTF textures share sources with the
  loader-cached image textures, so an unload that destroys sources needs a
  decision about ownership first.
- The geometry of a mesh carries every attribute its glTF primitive has, and
  v8 warns once per attribute a shader does not use ("Attribute a_Tangent is
  not present in the shader"). Harmless, but noisy; worth quieting when the
  geometry path is next touched.
