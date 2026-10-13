import { loadArt } from '../art'
import { createCamera } from '../camera'
import { bindControls } from '../controls'
import { art, sample } from './definition'
import { createLifePainter } from './paint'

export async function mountSample(host: HTMLElement) {
  const canvas = host.querySelector<HTMLCanvasElement>('[data-scene]')!
  const context = canvas.getContext('2d', { alpha: false })
  if (!context)
    throw new Error('Canvas 2D is unavailable')
  const cache = document.createElement('canvas')
  const background = cache.getContext('2d', { alpha: false })!
  const output = host.querySelector<HTMLOutputElement>('[data-performance]')!
  const abort = new AbortController()
  const { signal } = abort
  const inspect = new URLSearchParams(location.search).has('inspect')
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
  const initial = { x: host.clientWidth < 900 ? sample.narrowInitialX : sample.initial.x, y: sample.initial.y }
  const camera = createCamera({ size: art.size, initial, initialScale: sample.scale })
  let paused = reducedMotion.matches
  let disposed = false
  let ready = false
  let dirty = true
  let ratio = 1
  let animation = 0
  let lastFrame = 0
  let seconds = Date.now() / 1000 % 64
  let frames = 0
  let painter: ReturnType<typeof createLifePainter> | undefined
  output.hidden = !inspect

  const controls = bindControls(host, { camera, signal, invalidate, toggleMotion: () => setPaused(!paused) })
  function setPaused(next: boolean) {
    paused = next
    lastFrame = 0
    controls.motion(paused)
    cancelAnimationFrame(animation)
    animation = 0
    invalidate()
  }
  controls.motion(paused)
  reducedMotion.addEventListener('change', () => setPaused(reducedMotion.matches), { signal })

  function transform(target: CanvasRenderingContext2D) {
    const { width, height, scale, position } = camera
    target.setTransform(ratio * scale, 0, 0, ratio * scale, (width / 2 - position.x * scale) * ratio, (height / 2 - position.y * scale) * ratio)
  }
  function schedule() {
    if (ready && !disposed && !document.hidden && !animation)
      animation = requestAnimationFrame(frame)
  }
  function invalidate() {
    dirty = true
    schedule()
  }
  function frame(timestamp: number) {
    animation = 0
    if (!ready || disposed || document.hidden || !painter)
      return
    if (!dirty && !paused && lastFrame && timestamp - lastFrame < 1000 / 30) {
      schedule()
      return
    }
    const started = performance.now()
    if (!paused && lastFrame)
      seconds += Math.min(0.1, (timestamp - lastFrame) / 1000)
    lastFrame = timestamp
    if (dirty) {
      transform(background)
      background.drawImage(painter.background, 0, 0)
      dirty = false
    }
    context!.setTransform(1, 0, 0, 1, 0, 0)
    context!.drawImage(cache, 0, 0)
    transform(context!)
    painter.draw(context!, seconds, camera.view())
    frames++
    if (inspect) {
      output.textContent = JSON.stringify({
        mode: 'continuous-life-sample',
        revision: art.revision,
        world: art.size,
        camera: camera.position,
        scale: +camera.scale.toFixed(4),
        zoomLimits: camera.limits,
        viewport: [camera.width, camera.height],
        buffer: [canvas.width, canvas.height],
        paused,
        seconds: +seconds.toFixed(2),
        frames,
        drawMs: +(performance.now() - started).toFixed(2),
      }, null, 2)
    }
    if (!paused)
      schedule()
  }
  function resize() {
    initial.x = host.clientWidth < 900 ? sample.narrowInitialX : sample.initial.x
    camera.resize(host.clientWidth, host.clientHeight)
    ratio = Math.max(1, Math.min(devicePixelRatio || 1, 2, Math.sqrt(16000000 / (camera.width * camera.height))))
    canvas.width = cache.width = Math.round(camera.width * ratio)
    canvas.height = cache.height = Math.round(camera.height * ratio)
    invalidate()
  }
  function visibility() {
    cancelAnimationFrame(animation)
    animation = 0
    lastFrame = 0
    controls.stopDragging()
    if (!document.hidden)
      invalidate()
  }
  const observer = new ResizeObserver(resize)
  observer.observe(host)
  document.addEventListener('visibilitychange', visibility, { signal })
  function dispose() {
    if (disposed)
      return
    disposed = true
    controls.stopDragging()
    abort.abort()
    observer.disconnect()
    cancelAnimationFrame(animation)
    painter?.dispose()
    canvas.width = canvas.height = cache.width = cache.height = 1
  }
  window.addEventListener('pagehide', event => event.persisted ? visibility() : dispose(), { signal })
  window.addEventListener('pageshow', visibility, { signal })
  try {
    const urls = { landscape: art.background, ...Object.fromEntries(Object.entries(art.actors).flatMap(([id, frames]) => frames.map((frame, i) => [`${id}-${i}`, frame.url]))) }
    const entries = await Promise.allSettled(Object.entries(urls).map(async ([id, url]) => [id, await loadArt(url, signal)] as const))
    const failed = entries.find(entry => entry.status === 'rejected')
    if (failed || disposed) {
      for (const entry of entries) {
        if (entry.status === 'fulfilled')
          entry.value[1].close()
      }
      if (failed?.status === 'rejected')
        throw failed.reason
      return dispose
    }
    painter = createLifePainter(Object.fromEntries(entries.map(entry => (entry as PromiseFulfilledResult<readonly [string, ImageBitmap]>).value)))
    resize()
    ready = true
    host.dataset.state = 'ready'
    host.dataset.mode = 'sample'
    controls.enable()
    schedule()
  }
  catch (error) {
    dispose()
    throw error
  }
  return dispose
}
