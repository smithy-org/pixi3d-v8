# Pixi3D
> **Use this software at your own risk.** This is an unofficial fork that ports Pixi3D to PixiJS v8. It is only intended as a patch for a personal project: it comes as is, with no warranty and no support, and it is not affiliated with or endorsed by the original Pixi3D project, which lives at https://github.com/jnsmalm/pixi3d. The port is an alpha; see [PORT_STATUS.md](PORT_STATUS.md).

Pixi3D is a 3D rendering library for the web. It's built on top of PixiJS (which is at it's core, an established 2D rendering library). This makes Pixi3D have seamless integration with already existing 2D applications.

* Load models from file (glTF) or create procedural generated meshes
* Physically-based rendering (PBR) and image-based lighting (IBL)
* Customized materials and shaders
* 3D sprites
* Transformation, morphing and skeletal animations
* This fork: compatible with PixiJS v8, from 8.20 on. For PixiJS v5, v6 and v7, use upstream Pixi3D 2.5. Coming from Pixi3D 2.5? [MIGRATION_V8.md](MIGRATION_V8.md) lists what changed.

![SPY-HYPERSPORT](https://github.com/jnsmalm/pixi3d/blob/develop/spy-hypersport.jpg?raw=true)

*"SPY-HYPERSPORT" (https://skfb.ly/o8z7t) by Amvall is licensed under Creative Commons Attribution (http://creativecommons.org/licenses/by/4.0/). Rendered using Pixi3D.*

## Production ready?
Upstream Pixi3D is: it's currently being used in multiple projects in production running on hundreds of thousands of different devices (both desktop and mobile). This fork's PixiJS v8 port is an alpha. It passes upstream's snapshot test suite on PixiJS 8.20, on WebGL 2 and WebGL 1, but it has not been used in production.

## Getting started
This fork needs PixiJS 8.20 or later, and renders with WebGL (not WebGPU). Coming from Pixi3D 2.5, see [MIGRATION_V8.md](MIGRATION_V8.md).

### Using npm
The fork is not published to npm; install a tagged release from GitHub, next to PixiJS:

```
npm install pixi.js@^8.20.0 github:pjderouen/pixi3d#v3.0.0-alpha.2
```

Then import from *pixi3d*, i.e. `import { Model } from "pixi3d"`. A rotating, lit cube:

```javascript
import { Application } from "pixi.js"
import { Light, LightingEnvironment, Mesh3D } from "pixi3d"

const app = new Application()
await app.init({
  preference: "webgl", backgroundColor: 0xdddddd, resizeTo: window, antialias: true
})
document.body.appendChild(app.canvas)

const mesh = app.stage.addChild(Mesh3D.createCube())

const light = new Light()
light.position.set(-1, 0, 3)
LightingEnvironment.main.lights.push(light)

let rotation = 0
app.ticker.add(() => {
  mesh.rotationQuaternion.setEulerAngles(0, rotation++, 0)
})
```

Import Pixi3D before the application is initialised: PixiJS v8 sets up a renderer's extensions, Pixi3D's among them, when it is created.

### Script tags
Each tagged release includes the browser build, which reads PixiJS from the `PIXI` global and provides `PIXI3D`:

```html
<!doctype html>
<html lang="en">
<body>
  <script src="https://cdn.jsdelivr.net/npm/pixi.js@8.20.1/dist/pixi.min.js"></script>
  <script src="https://cdn.jsdelivr.net/gh/pjderouen/pixi3d@v3.0.0-alpha.2/dist/browser/pixi3d.min.js"></script>
  <script type="module" src="app.js"></script>
</body>
</html>
```

with *app.js* as above, using `PIXI.Application` and `PIXI3D.Mesh3D` in place of the imports.

## Examples
Upstream's examples are available as sandboxes at https://codesandbox.io, and at https://github.com/jnsmalm/pixi3d-sandbox to run them locally. They are written for Pixi3D 2.5 on PixiJS v5 to v7; with this fork, adapt them as [MIGRATION_V8.md](MIGRATION_V8.md) describes.

| Example           | Description                                                             | Sandbox |
|-------------------|-------------------------------------------------------------------------|:-------:|
| Getting started | Create application, rotating cube | [View](https://codesandbox.io/s/github/jnsmalm/pixi3d-sandbox/tree/master/getting-started) |
| Standard material | Load glTF model, image-based lighting, physically-based rendering | [View](https://codesandbox.io/s/github/jnsmalm/pixi3d-sandbox/tree/master/standard-material) |
| Animation | Model animation, dynamic shadows | [View](https://codesandbox.io/s/github/jnsmalm/pixi3d-sandbox/tree/master/model-animation) |
| Custom material | Custom material/shader | [View](https://codesandbox.io/s/github/jnsmalm/pixi3d-sandbox/tree/master/custom-material) |
| Sprites | Billboard sprites in 3D space | [View](https://codesandbox.io/s/github/jnsmalm/pixi3d-sandbox/tree/master/sprites-3d) |
| Punctual lights | Directional light, spot light, point light | [View](https://codesandbox.io/s/github/jnsmalm/pixi3d-sandbox/tree/master/punctual-lights) |
| Custom geometry | Mesh with custom vertex attributes | [View](https://codesandbox.io/s/github/jnsmalm/pixi3d-sandbox/tree/master/custom-geometry) |
| Interaction | Mesh picking | [View](https://codesandbox.io/s/github/jnsmalm/pixi3d-sandbox/tree/master/mesh-interaction) |
| Post processing | Post processing sprite with filters | [View](https://codesandbox.io/s/github/jnsmalm/pixi3d-sandbox/tree/master/post-processing-sprite) |

## Quick guide
An introduction to Pixi3D and a overview of the core concepts and components, updated for PixiJS v8. Upstream's [Quick guide sandbox](https://codesandbox.io/s/github/jnsmalm/pixi3d-sandbox/tree/master/quick-guide) shows the scene created with this guide, on PixiJS v7.

### Creating an application
The quickest way to get started is by creating an PixiJS application object. The application object creates a renderer and automatically starts the render loop. It also creates a canvas element which should be added to the HTML document. Pixi3D renders with WebGL, so the application is asked for it.

```javascript
let app = new PIXI.Application();
await app.init({
  preference: "webgl", resizeTo: window, backgroundColor: 0xdddddd, antialias: true
});
document.body.appendChild(app.canvas);
```
*Creates an application and adds the canvas element which results in an empty 
page with a grey background.*

### Loading a 3D model
A model includes a hierarchy of 3D objects which are called meshes. A mesh contains the geometry and material used for rendering that object. Models are generally being loaded from a file which has been created in a 3D modeling tool like Maya or Blender. Pixi3D supports loading of models using the glTF 2.0 file format. Learn more about glTF at https://www.khronos.org/gltf/

Models load through PixiJS' `Assets`, like any other asset (`.gltf` and `.glb`).

```javascript
let gltf = await PIXI.Assets.load("https://raw.githubusercontent.com/jnsmalm/pixi3d-sandbox/master/assets/teapot/teapot.gltf");
let teapot = app.stage.addChild(PIXI3D.Model.from(gltf));
```
*Loads a glTF 2.0 file and creates a model. The silhouette of a teapot should appear. For now, it will be rendered black because there is no lighting.*

### Position, rotation and scale
All objects in a scene have a transform which is used for setting the position, rotation and scale of that object. The transform of an object is always relative to it's parent transform. So when changing the transform of the parent object, all of it's childrens transforms will be affected as well.

Both position and scale is represented by a vector with three components (x, y, z), one for each axis. Rotation is represented by a quaternion and has four components (x, y, z, w). A quaternion is not as straight forward to use as a vector, and because of that the method *setEulerAngles* is used to change the rotation.

```javascript
teapot.position.y = -1;
teapot.scale.set(1.2);
teapot.rotationQuaternion.setEulerAngles(0, 15, 0);
```
*Moves the model to -1 on the y-axis. Rotates it to 15 degrees on the y-axis and scales it on all axes.*

### Lighting environment
Lights are needed to illuminate the objects in the scene, otherwise they may be rendered completely black (depending on the material being used). A lighting environment contains the different components used for lighting a scene. The lighting environment can be shared across objects, or each object can have it's own. The main lighting environment is created and used by default.

There are a few different types of lights available. The "point" type is a light that is located at a point and emits light in all directions equally. The "directional" type is a light that is located infinitely far away, and emits light in one direction only. The "spot" type is a light that is located at a point and emits light in a cone shape. Lights have a transform and can be attached to other objects.

```javascript
let dirLight = new PIXI3D.Light();
dirLight.type = "directional";
dirLight.intensity = 0.5;
dirLight.rotationQuaternion.setEulerAngles(45, 45, 0);
dirLight.position.set(-4, 7, -4);
PIXI3D.LightingEnvironment.main.lights.push(dirLight);

let pointLight = new PIXI3D.Light();
pointLight.type = "point";
pointLight.intensity = 10;
pointLight.position.set(1, 0, 3);
PIXI3D.LightingEnvironment.main.lights.push(pointLight);
```
*Adds a directional light and a point light to the main lighting environment. The teapot should now be illuminated by the light.*

### Changing the material
Each mesh contains a material, and the standard material is used by default. The standard material has several properties which can be used for changing the appearance of a mesh. It's also possible to create custom materials to achieve almost any visual effect.

```javascript
teapot.meshes.forEach((mesh) => {
  mesh.material.baseColor = PIXI3D.Color.fromHex("#ffefd5");
});
```
*Gives the model a different color by setting the material color of each mesh.*

### Playing animations
Models can contain animations which has been created in a 3D modeling tool. There are three different kinds of animations: skeletal, morphing and transformation. Skeletal animation is often used for animating characters, but it can also be used to animate anything else as well. Morphing is used to animate per-vertex, for example to create a waving flag or a face expression. Transformation animations are used for moving, rotating and scaling entire objects.

```javascript
setInterval(() => {
  teapot.animations.forEach((anim) => anim.play());
}, 1500);
```
*Starts playing all animations in the model every 1.5 seconds.*

### Casting shadows
To enable lights to cast shadows, a shadow casting light is required. It wraps a light and gives it the ability to cast shadows. It has multiple settings for controlling the quality of the shadow, for example the size of the shadow texture and the softness of the shadow. Directional and spot light types have support for casting shadows.

```javascript
let ground = app.stage.addChild(PIXI3D.Mesh3D.createPlane());
ground.y = -1;
ground.scale.set(10);
```
*Creates a ground plane to have something to cast the shadows on.*

The shadows must also be enabled (using the standard pipeline) for an object to both receive and cast shadows.

```javascript
let shadowCastingLight = new PIXI3D.ShadowCastingLight(app.renderer, dirLight, {
  shadowTextureSize: 512,
  quality: PIXI3D.ShadowQuality.medium
});
shadowCastingLight.softness = 1;
shadowCastingLight.shadowArea = 8;

let pipeline = app.renderer.renderPipes.pipeline;
pipeline.enableShadows(teapot, shadowCastingLight);
pipeline.enableShadows(ground, shadowCastingLight);
```
*Enables shadows to be casted and received for both the model and the ground.*

### 2D and 3D
Compositing 2D (PixiJS) and 3D (Pixi3D) containers is simple and can be combined in many ways. 2D containers can be added on top of 3D containers, and the other way around. Although the containers can be combined, the transforms used by 2D and 3D works differently from each other and are not compatible. The transforms won't be affected by each other, even if they have a parent-child relation.

To be able to convert 3D coordinates to 2D coordinates (or the other way around) the camera methods `screenToWorld` and `worldToScreen` can be used. 

Another way of combining 2D and 3D objects is to render a 3D object as a sprite using `CompositeSprite`. Thay way, the 3D object can easily be positioned in 2D space. This method also makes it possible to use regular PixiJS filters with 3D objects.

```javascript
let vignette = app.stage.addChild(
  new PIXI.Sprite(await PIXI.Assets.load(
    "https://raw.githubusercontent.com/jnsmalm/pixi3d-sandbox/master/assets/vignette.png"
  ))
);

app.ticker.add(() => {
  Object.assign(vignette, {
    width: app.renderer.width, height: app.renderer.height
  });
});
```
*Adds a 2D vignette layer on top of the 3D scene to give it a more cinematic effect. Resizes the vignette to the size of the renderer.*

### Controlling the camera
The camera is used for controlling from which position and direction the 3D scene is rendered, it has a position and rotation which is used for changing the view. Like any other object which has a transform, it can be attached to another object. The camera can also be directly controlled by using a mouse or trackpad. The main camera is created and used by default.

```javascript
let control = new PIXI3D.CameraOrbitControl(app.canvas)
```
*Gives the user orbit control over the main camera using mouse/trackpad. Hold left mouse button and drag to orbit, use scroll wheel to zoom in/out.*

## API
Upstream's API documentation, for Pixi3D 2.5, is at https://api.pixi3d.org. [MIGRATION_V8.md](MIGRATION_V8.md) lists everything this fork changes, and the type declarations in *types* describe its API.

## Changelog
All notable changes to this project will be documented in the [changelog](CHANGELOG.md)

## Development
The render harness, *serve/src/index.ts*, runs with `npm start` and serves http://127.0.0.1:8080; see [PORT_STATUS.md](PORT_STATUS.md) for its scenes.

## Tests
Automatic tests can run both using Puppeteer (Headless Chrome) and on a specific device/browser. Run command `npm test` to build and execute tests using Puppeteer (set `WEBGL_VERSION=1` to test WebGL 1), or start local web server with `npm run test:browser` and go to http://localhost:8080/.

## Building
Build to *dist* folder with `npm run build`, and the type declarations to *types* with `npm run types`.