import { Assets, DOMAdapter, ImageSource, Texture } from "pixi.js"
import type { Loader } from "pixi.js"
import type { glTFLoaderResource, glTFResourceLoader } from "./gltf-resource-loader"

/**
 * glTF assets are JSON files plus supporting external data.
 */
export class glTFAsset {
  /**
   * The textures used by this asset.
   */
  readonly textures: Texture[] = []

  /**
   * Creates a new glTF asset using the specified JSON descriptor.
   * @param descriptor The JSON descriptor to create the asset from.
   * @param buffers The buffers used by this asset.
   * @param images The images used by this asset.
   */
  constructor(readonly descriptor: any, readonly buffers: ArrayBuffer[] = [], readonly images: Texture[] = []) { }

  /**
   * Loads a new glTF asset (including resources) using the specified JSON
   * descriptor.
   * @param descriptor The JSON descriptor to create the asset from.
   * @param loader The resource loader to use for external resources. The
   * loader can be empty when all resources in the descriptor is embedded.
   * @param cb Callback when all resources have been loaded.
   */
  static async load(descriptor: any, loader?: glTFResourceLoader, cb?: (asset: glTFAsset) => void) {
    const buffers = await loadBuffers(descriptor, loader)
    const images = await loadImages(descriptor, buffers, loader)
    const asset = new glTFAsset(descriptor, buffers, images)
    cb && cb(asset)
    return asset
  }

  /**
   * Returns a value indicating if the specified data buffer is a valid glTF.
   * @param buffer The buffer data to validate.
   */
  static isValidBuffer(buffer: ArrayBuffer) {
    const header = new Uint32Array(buffer, 0, 3)
    if (header[0] === 0x46546C67 && header[1] === 2) {
      return true
    }
    return false
  }

  /**
   * Returns a value indicating if the specified uri is embedded.
   * @param uri The uri to check.
   */
  static isEmbeddedResource(uri: string) {
    return uri && uri.startsWith("data:")
  }

  /**
   * Creates a new glTF asset from binary (glb) buffer data.
   * @param data The binary buffer data to read from.
   * @param cb The function which gets called when the asset has been
   * created.
   * @param loader The resource loader to use for external resources, which
   * a binary glTF may still reference by uri.
   */
  static async fromBuffer(data: ArrayBuffer, cb?: (gltf: glTFAsset) => void, loader?: glTFResourceLoader) {
    const chunks: { type: number, offset: number, length: number }[] = []
    let offset = 3 * 4
    while (offset < data.byteLength) {
      const header = new Uint32Array(data, offset, 3)
      chunks.push({
        length: header[0], type: header[1], offset: offset + 2 * 4
      })
      offset += header[0] + 2 * 4
    }
    const json = new Uint8Array(data, chunks[0].offset, chunks[0].length)
    const descriptor = JSON.parse(new TextDecoder("utf-8").decode(json))
    const buffers: ArrayBuffer[] = []
    for (let i = 1; i < chunks.length; i++) {
      buffers.push(data.slice(chunks[i].offset, chunks[i].offset + chunks[i].length))
    }
    // The binary chunk is buffer 0; any further buffers are external.
    const externalBuffers = await loadBuffers(descriptor, loader, buffers.length)
    for (let i = buffers.length; i < externalBuffers.length; i++) {
      buffers[i] = externalBuffers[i]
    }
    const images = await loadImages(descriptor, buffers, loader)
    const asset = new glTFAsset(descriptor, buffers, images)
    cb && cb(asset)
    return asset
  }

  /**
   * Loads a glTF asset (`.gltf` or `.glb`) from the specified url. External
   * resources are loaded relative to the url, images through `Assets`.
   * @param url The url to load.
   * @param options Options for the fetch request.
   */
  static async fromURL(url: string, options?: RequestInit | undefined): Promise<glTFAsset> {
    const response = await DOMAdapter.get().fetch(url, options)
    const loader = new glTFUrlResourceLoader(url)
    if (url.split("?")[0].toLowerCase().endsWith(".glb")) {
      return glTFAsset.fromBuffer(await response.arrayBuffer(), undefined, loader)
    }
    return glTFAsset.load(await response.json(), loader)
  }
}

/**
 * Loads external glTF resources relative to the url of the glTF file. Images
 * go through the `Assets` loader (so they are cached and decoded the same
 * way as any other texture), buffers are fetched directly.
 */
export class glTFUrlResourceLoader implements glTFResourceLoader {
  /**
   * Creates a new resource loader.
   * @param parentUrl The url of the glTF file which references the resources.
   * @param loader The loader to load images with. When loading from inside
   * an `Assets` load parser this should be the loader passed to the parser;
   * defaults to `Assets`.
   */
  constructor(private parentUrl: string, private loader?: Loader) { }

  /**
   * Resolves a uri from the descriptor against the parent url.
   * @param uri The uri to resolve.
   */
  resolve(uri: string) {
    return this.parentUrl.substring(0, this.parentUrl.lastIndexOf("/") + 1) + uri
  }

  async loadBuffer(uri: string) {
    const response = await DOMAdapter.get().fetch(this.resolve(uri))
    return response.arrayBuffer()
  }

  loadTexture(uri: string) {
    const url = this.resolve(uri)
    return this.loader
      ? this.loader.load<Texture>(url)
      : Assets.load<Texture>(url)
  }
}

async function loadImages(descriptor: any, buffers: ArrayBuffer[], loader?: glTFResourceLoader) {
  const images: Texture[] = []
  if (!descriptor.images) {
    return images
  }
  await Promise.all(descriptor.images.map(async (image: any, index: number) => {
    if (typeof image.bufferView === "number") {
      images[index] = await textureFromBlob(blobFromBufferView(image, descriptor, buffers))
    } else if (glTFAsset.isEmbeddedResource(image.uri)) {
      images[index] = await textureFromDataUrl(image.uri)
    } else {
      if (!loader) {
        throw new Error("PIXI3D: A resource loader is required when image is external.")
      }
      images[index] = await (loader.loadTexture
        ? loader.loadTexture(image.uri)
        : loadResource(loader, image.uri, (resource) => resource.texture))
    }
  }))
  return images
}

async function loadBuffers(descriptor: any, loader?: glTFResourceLoader, start = 0) {
  const buffers: ArrayBuffer[] = []
  if (!descriptor.buffers) {
    return buffers
  }
  await Promise.all(descriptor.buffers.map(async (buffer: any, index: number) => {
    if (index < start) {
      return
    }
    if (glTFAsset.isEmbeddedResource(buffer.uri)) {
      buffers[index] = createBufferFromBase64(buffer.uri)
    } else {
      if (!loader) {
        throw new Error("PIXI3D: A resource loader is required when buffer is not embedded.")
      }
      buffers[index] = await (loader.loadBuffer
        ? loader.loadBuffer(buffer.uri)
        : loadResource(loader, buffer.uri, (resource) => resource.data))
    }
  }))
  return buffers
}

/**
 * Loads a resource through a loader's `load` method, the callback form
 * resource loaders had up to PixiJS v7.
 * @param loader The resource loader.
 * @param uri The uri to load from.
 * @param pick Picks the loaded value from the resource.
 */
function loadResource<T>(loader: glTFResourceLoader, uri: string, pick: (resource: glTFLoaderResource) => T | undefined) {
  return new Promise<T>((resolve, reject) => {
    if (!loader.load) {
      reject(new Error(`PIXI3D: The resource loader has no method to load "${uri}".`)); return
    }
    loader.load(uri, (resource) => {
      const value = pick(resource)
      if (value) {
        resolve(value)
      } else {
        reject(new Error(`PIXI3D: The resource loader failed to load "${uri}".`))
      }
    })
  })
}

function blobFromBufferView(image: any, descriptor: any, buffers: ArrayBuffer[]) {
  const view = descriptor.bufferViews[image.bufferView]
  const array = new Uint8Array(buffers[view.buffer], view.byteOffset || 0, view.byteLength)
  return new Blob([array], { type: image.mimeType })
}

async function textureFromDataUrl(url: string) {
  const response = await DOMAdapter.get().fetch(url)
  return textureFromBlob(await response.blob())
}

/**
 * Decodes an image blob into a texture. PixiJS v8 textures wrap an already
 * decoded resource (there is no lazily-loading `Texture.from(url)` any more),
 * so embedded and binary-chunk images are decoded here before the asset is
 * handed out. Alpha is left as-is; the parser sets the sampling state.
 */
async function textureFromBlob(blob: Blob): Promise<Texture> {
  let resource: ImageBitmap | HTMLImageElement
  if (typeof createImageBitmap === "function") {
    resource = await createImageBitmap(blob, { premultiplyAlpha: "none" })
  } else {
    resource = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image()
      const url = URL.createObjectURL(blob)
      image.onload = () => { URL.revokeObjectURL(url); resolve(image) }
      image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("PIXI3D: Failed to decode image.")) }
      image.src = url
    })
  }
  return new Texture({
    source: new ImageSource({ resource, alphaMode: "no-premultiply-alpha" })
  })
}

function createBufferFromBase64(value: string) {
  return Uint8Array.from(atob(value.split(",")[1]), c => c.charCodeAt(0)).buffer
}
