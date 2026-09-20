async function loadResources(urls) {
  let resources = {}
  for (let url of urls || []) {
    let asset = await PIXI.Assets.load(url.url)
    resources[url.name] = {
      gltf: asset, texture: asset, cubemap: asset
    }
  }
  // Need some delay for embedded/binary glTF files, not sure why - needs
  // some investigation.
  await new Promise(resolve => setTimeout(resolve, 100))
  return resources
}

async function getObjectURLFromRender(render, urls, { width = 1280, height = 720 } = {}) {
  // Pixi3D renders with WebGL only; the runner can ask for WebGL 1.
  let renderer = await PIXI.autoDetectRenderer({
    width, height, backgroundColor: 0xcccccc, preference: "webgl",
    preferWebGLVersion: window.PIXI3D_TEST_WEBGL_VERSION || 2
  })
  let resources = await loadResources(urls)
  return new Promise(async (resolve, reject) => {
    await render(renderer, resources)
    let canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    let ctx = canvas.getContext("2d")
    ctx.drawImage(renderer.canvas, 0, 0)
    canvas.toBlob(blob => {
      resolve(URL.createObjectURL(blob))
      renderer.destroy()
    })
  })
}

async function getImageDataFromUrl(url) {
  return new Promise((resolve, reject) => {
    let image = new Image()
    image.src = url
    image.onload = () => {
      let canvas = document.createElement("canvas")
      canvas.width = image.width
      canvas.height = image.height
      let ctx = canvas.getContext("2d")
      ctx.drawImage(image, 0, 0)
      let imageData = ctx.getImageData(0, 0, image.width, image.height)
      resolve({
        data: imageData.data,
        height: imageData.height,
        width: imageData.width,
        url
      })
    }
  })
}

async function getImageDataFromRender(render, resources, options = {}) {
  return await getImageDataFromUrl(
    await getObjectURLFromRender(render, resources, { ...options }), false)
}