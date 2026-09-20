import { expect } from "chai"

// The snapshots of these tests were rendered by Pixi3D 2.5.0 on PixiJS 7.2.4,
// as upstream's were; upstream had no morphing test.
describe("Morphing", () => {

  it("should render correctly with morph target weights using pixi *.*.*", async () => {
    let render = (renderer, resources) => {
      let lightingEnvironment = new PIXI3D.LightingEnvironment(renderer)
      let light = Object.assign(new PIXI3D.Light(), {
        intensity: 1.5, type: PIXI3D.LightType.directional
      })
      light.rotationQuaternion.setEulerAngles(20, 160, 0)
      lightingEnvironment.lights.push(light)
      let model = PIXI3D.Model.from(resources["assets/morph/morph.gltf"].gltf)
      model.meshes.forEach(mesh => {
        mesh.material.lightingEnvironment = lightingEnvironment
      })
      renderer.render(model)
    }
    await expect(render).to.match("snapshots/vqmrt.png", {
      resources: [
        "assets/morph/morph.gltf"
      ]
    })
  })

  it("should render correctly with animated morph target weights using pixi *.*.*", async () => {
    let render = (renderer, resources) => {
      let lightingEnvironment = new PIXI3D.LightingEnvironment(renderer)
      let light = Object.assign(new PIXI3D.Light(), {
        intensity: 1.5, type: PIXI3D.LightType.directional
      })
      light.rotationQuaternion.setEulerAngles(20, 160, 0)
      lightingEnvironment.lights.push(light)
      let model = PIXI3D.Model.from(resources["assets/morph/morph.gltf"].gltf)
      model.meshes.forEach(mesh => {
        mesh.material.lightingEnvironment = lightingEnvironment
      })
      model.animations[0].position = 0.9
      renderer.render(model)
    }
    await expect(render).to.match("snapshots/kbnzl.png", {
      resources: [
        "assets/morph/morph.gltf"
      ]
    })
  })
})
