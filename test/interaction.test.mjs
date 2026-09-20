import { expect } from "chai"

describe("Picking interaction", () => {

  // Renders a cube with a picking hit area twice (the first frame registers
  // the hit area, after which the picking map is drawn) and hit tests the
  // specified points. Runs in the page; returns which points hit the cube.
  const hitTestCube = async (points) => {
    let renderer = await PIXI.autoDetectRenderer({
      width: 800, height: 600, preference: "webgl",
      preferWebGLVersion: window.PIXI3D_TEST_WEBGL_VERSION || 2
    })
    let mesh = PIXI3D.Mesh3D.createCube()
    mesh.hitArea = new PIXI3D.PickingHitArea(mesh)
    mesh.eventMode = "static"
    renderer.render(mesh)
    renderer.render(mesh)
    const boundary = new PIXI.EventBoundary(mesh)
    const hits = points.map(([x, y]) => boundary.hitTest(x, y) === mesh)
    renderer.destroy()
    return hits
  }

  it("should hit test for mesh using pixi *.*.*", async () => {
    expect(await evaluateInPage(hitTestCube, [[400, 300]])).to.deep.equal([true])
  })

  it("should not hit test for mesh using pixi *.*.*", async () => {
    expect(await evaluateInPage(hitTestCube, [[100, 100]])).to.deep.equal([false])
  })

  // Every renderer created after Pixi3D loads has a picking interaction, and
  // its hit test after a render walks the whole stage. Only a render that drew
  // meshes can need it, since hit areas belong to meshes and models. Renders a
  // stage of interactive sprites three times, with or without a cube, and
  // counts the hit tests made on the renderer's event boundary.
  const hitTestsWhileRendering = async (withMesh) => {
    let renderer = await PIXI.autoDetectRenderer({
      width: 200, height: 200, preference: "webgl",
      preferWebGLVersion: window.PIXI3D_TEST_WEBGL_VERSION || 2
    })
    let stage = new PIXI.Container()
    stage.eventMode = "static"
    for (let i = 0; i < 20; i++) {
      let sprite = new PIXI.Sprite(PIXI.Texture.WHITE)
      sprite.eventMode = "static"
      stage.addChild(sprite)
    }
    if (withMesh) {
      stage.addChild(PIXI3D.Mesh3D.createCube())
    }
    let calls = 0
    const boundary = renderer.events.rootBoundary
    const hitTest = boundary.hitTest
    boundary.hitTest = function (x, y) {
      calls++
      return hitTest.call(this, x, y)
    }
    for (let i = 0; i < 3; i++) {
      renderer.render(stage)
    }
    const picking = !!renderer.picking
    renderer.destroy()
    return { picking, calls }
  }

  it("should not hit test a stage without meshes after rendering using pixi *.*.*", async () => {
    expect(await evaluateInPage(hitTestsWhileRendering, false)).to.deep.equal({ picking: true, calls: 0 })
  })

  it("should hit test a stage with meshes after rendering using pixi *.*.*", async () => {
    expect(await evaluateInPage(hitTestsWhileRendering, true)).to.deep.equal({ picking: true, calls: 3 })
  })
})
