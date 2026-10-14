import type { Texture as PixiTexture } from 'pixi.js'
import type { BackgroundTile, TiledManifest } from './tiled-types'
import { Application, Assets, Container, Rectangle, Sprite, Texture } from 'pixi.js'
import { PanoramaCamera } from './camera'
import { ByteCache, visiblePreviewIndices, visibleTileIds } from './tiled-cache'

// Serialize unload/reload across page lifecycle changes and cache eviction.
const releases = new Map<string, Promise<void>>()
const pendingTextures = new Map<string, Promise<PixiTexture>>()

async function loadTexture(src: string, shouldLoad: () => boolean) {
  await releases.get(src)
  if (!shouldLoad())
    return null
  const pending = Assets.load<PixiTexture>(src)
  pendingTextures.set(src, pending)
  try {
    return await pending
  }
  finally {
    if (pendingTextures.get(src) === pending)
      pendingTextures.delete(src)
  }
}

function releaseTexture(src: string) {
  if (releases.has(src))
    return
  const pending = (async () => {
    await pendingTextures.get(src)?.catch(() => {})
    await Assets.unload(src).catch(() => {})
  })()
  releases.set(src, pending)
  void pending.finally(() => {
    if (releases.get(src) === pending)
      releases.delete(src)
  })
}

export async function mountTiledWorld(root: HTMLElement) {
  const manifest: TiledManifest = JSON.parse(root.dataset.manifest!)
  const host = root.querySelector<HTMLElement>('[data-tiled-viewport]')!
  const previewWorld = root.querySelector<HTMLElement>('[data-preview-world]')!
  const error = root.querySelector<HTMLElement>('[data-load-error]')!
  const retry = root.querySelector<HTMLButtonElement>('[data-retry]')!
  const camera = new PanoramaCamera(manifest.width, manifest.height, manifest.initialCenter, manifest.maxScale)
  const tiles = new Map(manifest.tiles.map(tile => [tile.id, tile]))
  const app = new Application()
  const land = new Container()
  const events = new AbortController()
  const pointers = new Map<number, { x: number, y: number }>()
  const loading = new Set<string>()
  const failures = new Set<string>()
  const released = new Set<string>()
  const previews = new Map<number, HTMLImageElement>()
  for (const image of Array.from(previewWorld.querySelectorAll<HTMLImageElement>('img[data-preview-index]')))
    previews.set(Number(image.dataset.previewIndex), image)
  let queued: string[] = []
  let visible = new Set<string>()
  let wanted = new Set<string>()
  let disposed = false
  let initialized = false
  let frame = 0
  let staticMode = false
  let frameCount = 0
  let maxRenderMs = 0
  let direction = 0
  let lastX = camera.x
  const arrivals: { tile: BackgroundTile, texture: PixiTexture }[] = []
  function release(tile: BackgroundTile) {
    if (!released.has(tile.id)) {
      released.add(tile.id)
      releaseTexture(tile.src)
    }
  }
  interface Entry { sprite: Sprite, tile: BackgroundTile }
  const cache = new ByteCache<Entry>(96 * 1024 * 1024, ({ sprite, tile }) => {
    sprite.destroy({ texture: true, textureSource: false })
    release(tile)
  })
  const stats = () => {
    root.dataset.loadedTiles = String(cache.entries.size)
    root.dataset.decodedBytes = String(cache.bytes)
    root.dataset.pendingTiles = String(loading.size + queued.length)
    root.dataset.previewStrips = String(previews.size)
    root.dataset.frames = String(frameCount)
    root.dataset.maxRenderMs = maxRenderMs.toFixed(2)
    root.dataset.scale = camera.scale.toFixed(5)
    root.dataset.position = camera.x.toFixed(0)
    root.dataset.top = camera.top.toFixed(0)
  }
  function schedule() {
    if (!frame && !disposed && !document.hidden)
      frame = requestAnimationFrame(render)
  }
  function syncPreviews() {
    previewWorld.style.width = `${manifest.width * camera.scale}px`
    previewWorld.style.height = `${manifest.height * camera.scale}px`
    previewWorld.style.transform = `translate(${-camera.left * camera.scale}px,${-camera.top * camera.scale}px)`
    const nearby = new Set(visiblePreviewIndices(camera, manifest.previews, 1024))
    for (const [index, image] of previews) {
      if (!nearby.has(index)) {
        image.removeAttribute('src')
        image.remove()
        previews.delete(index)
      }
    }
    for (const index of nearby) {
      if (previews.has(index))
        continue
      const preview = manifest.previews[index]!
      const image = document.createElement('img')
      image.alt = ''
      image.decoding = 'async'
      image.dataset.previewIndex = String(index)
      image.style.left = `${preview.x / manifest.width * 100}%`
      image.style.width = `${preview.width / manifest.width * 100}%`
      image.src = preview.src
      previews.set(index, image)
      previewWorld.appendChild(image)
    }
  }
  function query() {
    direction = Math.sign(camera.x - lastX) || direction
    lastX = camera.x
    visible = new Set(visibleTileIds(camera, manifest.width, manifest.height, manifest.tileSize))
    const nearby = visibleTileIds({
      left: camera.left - (direction < 0 ? 1024 : 256),
      right: camera.right + (direction > 0 ? 1024 : 256),
      top: camera.top,
      bottom: camera.bottom,
    }, manifest.width, manifest.height, manifest.tileSize, 160)
    wanted = new Set([...visible, ...nearby])
    queued = [...wanted].filter(id => !cache.entries.has(id) && !loading.has(id) && !failures.has(id)).sort((a, b) => Number(visible.has(b)) - Number(visible.has(a)))
    for (const id of visible)
      cache.get(id)
    for (const [id, entry] of cache.entries)
      entry.value.sprite.visible = visible.has(id)
    cache.trim(visible)
    error.hidden = ![...visible].some(id => failures.has(id))
    host.setAttribute('aria-busy', String([...visible].some(id => !cache.entries.has(id) && !failures.has(id))))
    pump()
  }
  function pump() {
    if (disposed || staticMode || document.hidden)
      return
    while (loading.size < 2 && queued.length) {
      const id = queued.shift()!
      const tile = tiles.get(id)
      if (!tile || cache.entries.has(id))
        continue
      loading.add(id)
      released.delete(id)
      void loadTexture(tile.src, () => !disposed && !staticMode && wanted.has(id)).then((texture) => {
        if (!texture) {
          loading.delete(id)
          pump()
          return
        }
        if (disposed || staticMode || !wanted.has(id)) {
          loading.delete(id)
          release(tile)
          pump()
          return
        }
        arrivals.push({ tile, texture })
        schedule()
      }).catch(() => {
        loading.delete(id)
        failures.add(id)
        schedule()
        pump()
      })
    }
  }
  function render() {
    frame = 0
    if (disposed)
      return
    syncPreviews()
    if (!initialized || staticMode) {
      stats()
      return
    }
    const start = performance.now()
    // At most one newly decoded texture enters the scene per animation frame.
    const arrival = arrivals.shift()
    if (arrival) {
      loading.delete(arrival.tile.id)
      if (wanted.has(arrival.tile.id)) {
        const texture = new Texture({ source: arrival.texture.source, frame: new Rectangle(manifest.gutter, manifest.gutter, arrival.tile.width, arrival.tile.height) })
        const sprite = new Sprite(texture)
        sprite.position.set(arrival.tile.x, arrival.tile.y)
        land.addChild(sprite)
        cache.put(arrival.tile.id, { sprite, tile: arrival.tile }, arrival.tile.decodedBytes)
      }
      else {
        release(arrival.tile)
      }
    }
    land.scale.set(camera.scale)
    land.position.set(-camera.left * camera.scale, -camera.top * camera.scale)
    query()
    app.render()
    frameCount++
    maxRenderMs = Math.max(maxRenderMs, performance.now() - start)
    stats()
    if (arrivals.length)
      schedule()
  }
  function resize() {
    camera.resize(host.clientWidth, host.clientHeight)
    if (initialized && !staticMode)
      app.renderer.resize(host.clientWidth, host.clientHeight)
    schedule()
  }
  const options = { signal: events.signal }
  root.querySelector('[data-reset]')!.addEventListener('click', () => {
    camera.reset()
    schedule()
  }, options)
  retry.addEventListener('click', () => {
    failures.clear()
    schedule()
  }, options)
  host.addEventListener('wheel', (event) => {
    event.preventDefault()
    const rect = host.getBoundingClientRect()
    camera.zoomAt(camera.zoom * Math.exp(-event.deltaY * 0.002), event.clientX - rect.left, event.clientY - rect.top)
    schedule()
  }, { ...options, passive: false })
  host.addEventListener('pointerdown', (event) => {
    if (event.button !== 0)
      return
    host.setPointerCapture(event.pointerId)
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    host.classList.add('dragging')
  }, options)
  host.addEventListener('pointermove', (event) => {
    const previous = pointers.get(event.pointerId)
    if (!previous)
      return
    camera.pan(event.clientX - previous.x, event.clientY - previous.y)
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    schedule()
  }, options)
  function endPointer(event: PointerEvent) {
    pointers.delete(event.pointerId)
    if (!pointers.size)
      host.classList.remove('dragging')
  }
  host.addEventListener('pointerup', endPointer, options)
  host.addEventListener('pointercancel', endPointer, options)
  host.addEventListener('lostpointercapture', endPointer, options)
  host.addEventListener('keydown', (event) => {
    const key = event.key
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', 'Home', 'End'].includes(key))
      return
    event.preventDefault()
    if (key === 'Home')
      camera.reset()
    else if (key === 'End')
      camera.moveTo(1)
    else if (key === '+' || key === '=' || key === '-')
      camera.zoomAt(camera.zoom * (key === '-' ? 0.9 : 1.1))
    else
      camera.pan(key === 'ArrowLeft' ? 100 : key === 'ArrowRight' ? -100 : 0, key === 'ArrowUp' ? 100 : key === 'ArrowDown' ? -100 : 0)
    schedule()
  }, options)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (frame)
        cancelAnimationFrame(frame)
      frame = 0
    }
    else {
      schedule()
      pump()
    }
  }, options)
  window.addEventListener('resize', resize, options)
  window.addEventListener('pagehide', () => {
    disposed = true
    events.abort()
    if (frame)
      cancelAnimationFrame(frame)
    cache.clear()
    for (const image of previews.values()) {
      image.removeAttribute('src')
      image.remove()
    }
    previews.clear()
    for (const arrival of arrivals)
      release(arrival.tile)
    arrivals.length = 0
    for (const id of loading)
      release(tiles.get(id)!)
    if (initialized)
      app.destroy({ removeView: true }, { children: true })
  }, { once: true })
  window.addEventListener('pageshow', (event) => {
    if (event.persisted && disposed)
      void mountTiledWorld(root)
  }, { once: true })
  resize()
  try {
    await app.init({
      width: host.clientWidth,
      height: host.clientHeight,
      autoStart: false,
      sharedTicker: false,
      resolution: Math.min(devicePixelRatio || 1, 1.5),
      autoDensity: true,
      backgroundAlpha: 0,
      preference: 'webgl',
      powerPreference: 'low-power',
      antialias: false,
    })
    initialized = true
    if (disposed) {
      app.destroy({ removeView: true }, { children: true })
      return
    }
    app.stage.addChild(land)
    app.canvas.classList.add('tiled-canvas')
    app.canvas.setAttribute('aria-hidden', 'true')
    host.appendChild(app.canvas)
    app.canvas.addEventListener('webglcontextlost', () => {
      staticMode = true
      cache.clear()
      for (const arrival of arrivals)
        release(arrival.tile)
      arrivals.length = 0
      for (const id of loading)
        release(tiles.get(id)!)
      host.setAttribute('aria-busy', 'false')
      error.hidden = true
      app.destroy({ removeView: true }, { children: true })
      initialized = false
      root.dataset.mode = 'preview'
      schedule()
    }, options)
    root.dataset.mode = 'tiled'
    resize()
  }
  catch (failure) {
    console.warn('田园绘制初始化失败，保留可浏览预览。', failure)
    staticMode = true
    root.dataset.mode = 'preview'
    schedule()
  }
}
