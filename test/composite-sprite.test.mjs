import { expect } from "chai"

describe("Composite sprite", () => {

  it("should render correctly with blur filter using pixi *.*.*", async () => {
    let render = (renderer, resources) => {
      let model = PIXI3D.Model.from(resources["assets/teapot/teapot.gltf"].gltf)
      model.y = -0.8

      let sprite = new PIXI3D.CompositeSprite(renderer)
      sprite.renderObject(model)
      // PixiJS v8's blur spreads its strength over the passes differently;
      // its legacy mode is v7's blur, which the snapshot was made with.
      sprite.filters = [new PIXI.BlurFilter({ legacy: true })]

      renderer.render(sprite)
    }
    await expect(render).to.match("snapshots/omohh.png", {
      resources: [
        "assets/teapot/teapot.gltf"
      ]
    })
  })

  it("should render correctly after changing resolution using pixi *.*.*", async () => {
    let render = (renderer, resources) => {
      let model = PIXI3D.Model.from(resources["assets/teapot/teapot.gltf"].gltf)
      model.y = -0.8

      let sprite = new PIXI3D.CompositeSprite(renderer)
      sprite.setResolution(0.1)
      sprite.renderObject(model)

      renderer.render(sprite)
    }
    await expect(render).to.match("snapshots/qsoqc.png", {
      resources: [
        "assets/teapot/teapot.gltf"
      ],
      maxDiff: 500
    })
  })

  // it("should not try to render when renderer was destroyed using pixi *.*.*", async () => {
  //   let render = (renderer, resources) => {
  //     let sprite = new PIXI3D.PostProcessingSprite(renderer, {
  //       objectToRender: PIXI3D.Mesh3D.createCube()
  //     })
  //     renderer.destroy()
  //   }
  // })
})