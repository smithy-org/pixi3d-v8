import { PNG } from "pngjs"
import { use } from "chai"
import pixelmatch from "pixelmatch"
import * as puppeteer from "puppeteer"
import express from "express"
import cors from "cors"
import fs from "fs/promises"
import path from "path"
import { fileURLToPath } from "url"

const PORT = 3000
const DIRNAME = path.dirname(fileURLToPath(import.meta.url))
// The PixiJS the library is built and type-checked against (the dev
// dependency), in its browser build.
const PIXI_SCRIPT = path.join(DIRNAME, "../node_modules/pixi.js/dist/pixi.js")
// When set, every render is also written to this directory, named after its
// snapshot.
const RENDER_OUT = process.env.RENDER_OUT
// Set to 1 to render with WebGL 1 rather than WebGL 2.
const WEBGL_VERSION = Number(process.env.WEBGL_VERSION) || 2

use(function (chai) {
  chai.Assertion.addMethod("match", async function (expectedURL, { resources = [], threshold = 0.1, maxDiff = 50 } = {}) {
    resources = resources.map(res => ({
      name: res,
      url: `http://localhost:${PORT}/${res}`
    }))
    let actual = await getImageDataFromRender(this._obj, resources)
    let expected = await getImageDataFromSnapshot("test/" + expectedURL)
    if (RENDER_OUT) {
      await fs.mkdir(RENDER_OUT, { recursive: true })
      await fs.writeFile(path.join(RENDER_OUT, path.basename(expectedURL)), PNG.sync.write(actual))
    }
    const diff = pixelmatch(actual.data, expected.data,
      undefined, actual.width, actual.height, { threshold })
    if (diff > maxDiff) {
      // await fs.writeFile("./temp.png", PNG.sync.write(actual))
      throw new Error(`The render didn't match the snapshot (diff ${diff} > maxDiff ${maxDiff})`)
    }
  })
})

let app, server, browser, page

before(async function () {
  app = express()
  app.use(cors())
  app.use("/assets", express.static(path.join(DIRNAME, "assets")))
  server = app.listen(PORT, () => { })
  browser = await puppeteer.launch({ headless: true })
})

beforeEach(async function () {
  page = await browser.newPage()

  await page.addScriptTag({ path: PIXI_SCRIPT })
  await page.addScriptTag({ path: path.join(DIRNAME, "../dist/browser/pixi3d.js") })
  await page.addScriptTag({ path: path.join(DIRNAME, "test-utils.js") })
  await page.evaluate((version) => { window.PIXI3D_TEST_WEBGL_VERSION = version }, WEBGL_VERSION)
})

afterEach(async function () {
  await page.close()
})

after(async function () {
  server.close(); await browser.close()
});

/**
 * Runs a function inside the test page, where PixiJS and Pixi3D are loaded,
 * and returns its result; for tests that check values rather than pixels.
 */
globalThis.evaluateInPage = (fn, ...args) => page.evaluate(fn, ...args)

async function getImageDataFromRender(render, resources) {
  let renderFuncString = render.toString()
    .slice(render.toString()
      .indexOf("{") + 1, render.toString()
        .lastIndexOf("}"))

  let url = await page.evaluate((renderFuncString, resources) => {
    // This function is running inside puppeteer browser
    return getObjectURLFromRender(new Function(
      "renderer", "resources", renderFuncString), resources)
  }, renderFuncString, resources)

  const response = await page.goto(url)
  let data = await response.buffer()
  return new Promise(resolve => {
    let png = new PNG().parse(data, function (error, data) {
      resolve(png)
    })
  })
}

async function getImageDataFromSnapshot(path) {
  let data = await fs.readFile(path)
  return new Promise(resolve => {
    let png = new PNG().parse(data, function (error, data) {
      resolve(png)
    })
  })
}

import "./punctual-light.test.mjs"
import "./standard-material.test.mjs"
import "./custom-material.test.mjs"
import "./shadow.test.mjs"
import "./instancing.test.mjs"
import "./custom-geometry.test.mjs"
import "./composite-sprite.test.mjs"
import "./sprite.test.mjs"
import "./model-animation.test.mjs"
import "./mesh.test.mjs"
import "./camera.test.mjs"
import "./camera-orbit-control.test.mjs"
import "./interaction.test.mjs"
import "./skybox.test.mjs"
import "./gltf.test.mjs"
import "./morph.test.mjs"
