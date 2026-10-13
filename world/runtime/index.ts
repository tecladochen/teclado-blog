import { createCamera } from './camera'
import { bindControls } from './controls'
import { activeRegion, initialView, places, worldSize } from './layout'
import { createPainter, loadArt } from './scene'

export async function mountFarm(host: HTMLElement) {
  const canvas = host.querySelector<HTMLCanvasElement>('[data-scene]')!
  const context = canvas.getContext('2d', { alpha: false })
  if (!context)
    throw new Error('Canvas 2D is unavailable')
  const output = host.querySelector<HTMLOutputElement>('[data-performance]')!
  const abort = new AbortController()
  const { signal } = abort
  const inspect = new URLSearchParams(location.search).has('inspect')
  const camera = createCamera({ size: worldSize, initial: initialView, places, minScale: 0.55 })
  let ratio = 1
  let ready = false
  let disposed = false
  let animation = 0
  let frames = 0
  let painter: ReturnType<typeof createPainter> | undefined
  output.hidden = !inspect
  const controls = bindControls(host, {
    camera,
    signal,
    invalidate,
    retryDetails: () => painter?.retry(camera.view()),
  })

  function frame() {
    animation = 0
    if (!ready || disposed || document.hidden || !painter)
      return
    const started = performance.now()
    const { width, height, position } = camera
    context!.setTransform(ratio * camera.scale, 0, 0, ratio * camera.scale, (width / 2 - position.x * camera.scale) * ratio, (height / 2 - position.y * camera.scale) * ratio)
    painter.draw(context!, camera.view())
    frames++
    const stats = painter.stats(camera.view())
    controls.update(stats.failed)
    host.dataset.detailState = stats.failed ? 'error' : stats.detailed === stats.visible ? 'ready' : 'loading'
    if (inspect) {
      output.textContent = JSON.stringify({
        mode: 'whole-native-farm',
        revision: activeRegion.revision,
        world: worldSize,
        activeRegion: activeRegion.bounds,
        camera: position,
        scale: camera.scale,
        viewport: [width, height],
        buffer: [canvas.width, canvas.height],
        frames,
        drawMs: +(performance.now() - started).toFixed(2),
        ...stats,
      }, null, 2)
    }
  }

  function invalidate() {
    if (ready && !disposed && !document.hidden && !animation)
      animation = requestAnimationFrame(frame)
  }

  function resize() {
    camera.resize(host.clientWidth, host.clientHeight)
    const { width, height } = camera
    ratio = Math.max(1, Math.min(devicePixelRatio || 1, 2, Math.sqrt(16000000 / (width * height))))
    canvas.width = Math.round(width * ratio)
    canvas.height = Math.round(height * ratio)
    invalidate()
  }

  function visibility() {
    cancelAnimationFrame(animation)
    animation = 0
    controls.stopDragging()
    if (!document.hidden)
      invalidate()
  }
  document.addEventListener('visibilitychange', visibility, { signal })
  const observer = new ResizeObserver(resize)
  observer.observe(host)
  function dispose() {
    if (disposed)
      return
    disposed = true
    controls.stopDragging()
    abort.abort()
    observer.disconnect()
    cancelAnimationFrame(animation)
    painter?.dispose()
    canvas.width = canvas.height = 1
  }
  window.addEventListener('pagehide', event => event.persisted ? visibility() : dispose(), { signal })
  window.addEventListener('pageshow', visibility, { signal })
  try {
    const urls = {
      ...Object.fromEntries(Object.entries(activeRegion.textures).map(([id, url]) => [`texture-${id}`, url])),
      ...Object.fromEntries(Object.entries(activeRegion.sprites).map(([id, sprite]) => [`sprite-${id}`, sprite.url])),
      ...Object.fromEntries(activeRegion.patches.map(patch => [`scene-${patch.id}`, patch.overview])),
    }
    const entries = Object.entries(urls)
    const loaded = await Promise.allSettled(entries.map(async ([id, url]) => [id, await loadArt(url, signal)] as const))
    const failure = loaded.find(result => result.status === 'rejected')
    if (failure || disposed) {
      for (const result of loaded) {
        if (result.status === 'fulfilled')
          result.value[1].close()
      }
      if (failure?.status === 'rejected')
        throw failure.reason
      return dispose
    }
    const images = Object.fromEntries(loaded.map(result => (result as PromiseFulfilledResult<readonly [string, ImageBitmap]>).value))
    painter = createPainter(images, signal, invalidate)
    resize()
    await painter.prepare(camera.view())
    if (disposed)
      return dispose
    ready = true
    host.dataset.state = 'ready'
    controls.enable()
    invalidate()
  }
  catch (error) {
    if (!disposed) {
      dispose()
      throw error
    }
  }
  return dispose
}
