import type { PanoramaManifest, PanoramaSection } from './types'
import { Application, Assets, Container, Graphics, Sprite } from 'pixi.js'
import { PanoramaCamera } from './camera'

export async function mountPanorama(root: HTMLElement) {
  const manifest: PanoramaManifest = JSON.parse(root.dataset.manifest!)
  const host = root.querySelector<HTMLElement>('[data-viewport]')!
  const fallback = root.querySelector<HTMLElement>('[data-fallback]')!
  const range = root.querySelector<HTMLInputElement>('[data-position]')!
  const zoomLabel = root.querySelector<HTMLOutputElement>('[data-zoom-label]')!
  const region = root.querySelector<HTMLSelectElement>('[data-region]')!
  const status = root.querySelector<HTMLElement>('[data-status]')!
  const retry = root.querySelector<HTMLButtonElement>('[data-retry]')!
  const staticButton = root.querySelector<HTMLButtonElement>('[data-static]')!
  const camera = new PanoramaCamera(manifest.width, manifest.height, manifest.initialCenter, manifest.maxScale)
  const views = manifest.views ?? ['村居日常', '菜园与林缘', '田间与果茶坡', '塘岸与草地', '村务与出口'].map((name, index) => ({ name, center: [index * 1440 + 720, manifest.height / 2], fit: false }))
  const app = new Application()
  const land = new Container()
  const loaded = new Map<string, { section: PanoramaSection, group: Container }>()
  const pending = new Map<string, Promise<void>>()
  const failures = new Set<string>()
  const pointers = new Map<number, { x: number, y: number }>()
  const events = new AbortController()
  let wanted = new Set<string>()
  let disposed = false
  let initialized = false
  let ready = false
  let staticMode = false
  let frame = 0

  function updateControls() {
    range.value = String(Math.round(camera.progress * 1000))
    zoomLabel.value = `${Math.round(camera.zoom * 100)}%`
    const nearest = views.reduce((best, view, index) => {
      if (view.fit)
        return best
      const distance = Math.hypot(camera.x - view.center[0]!, camera.y - view.center[1]!)
      return distance < best.distance ? { index, distance } : best
    }, { index: 0, distance: Infinity })
    region.value = String(camera.zoom <= camera.minZoom + 0.00001 && views[0]?.fit ? 0 : nearest.index)
    range.disabled = camera.right - camera.left >= manifest.width
    root.dataset.position = String(Math.round(camera.x))
    root.dataset.zoom = camera.zoom.toFixed(2)
    root.dataset.scale = camera.scale.toFixed(5)
    root.dataset.top = camera.top.toFixed(2)
    root.dataset.minZoom = camera.minZoom.toFixed(5)
    root.querySelectorAll<HTMLButtonElement>('[data-zoom]').forEach((button) => {
      button.disabled = staticMode || (Number(button.dataset.zoom) > 0 ? camera.zoom >= 1 : camera.zoom <= camera.minZoom + 0.00001)
    })
  }

  function useStatic() {
    staticMode = true
    region.disabled = true
    camera.zoomAt(camera.minZoom)
    root.dataset.mode = 'static'
    fallback.hidden = false
    fallback.querySelectorAll<HTMLImageElement>('img').forEach(img => img.src = img.dataset.src!)
    fallback.scrollLeft = Math.max(0, camera.x * host.clientHeight / manifest.height - host.clientWidth / 2)
    root.querySelectorAll<HTMLButtonElement>('[data-zoom]').forEach(button => button.disabled = true)
    staticButton.hidden = true
    status.textContent = '静态浏览 · 左右滑动'
    host.setAttribute('aria-busy', 'false')
    for (const id of loaded.keys())
      release(id)
    root.dataset.decodedBytes = '0'
    if (frame) {
      cancelAnimationFrame(frame)
      frame = 0
    }
    if (initialized) {
      app.destroy({ removeView: true }, { children: true })
      initialized = false
    }
    updateControls()
  }

  function schedule() {
    if (frame || disposed || staticMode || document.hidden)
      return
    frame = requestAnimationFrame(() => {
      frame = 0
      if (disposed || !initialized || staticMode)
        return
      land.scale.set(camera.scale)
      land.position.set(-camera.left * camera.scale, -camera.top * camera.scale)
      updateControls()
      ensureSections()
      app.render()
    })
  }

  function release(id: string) {
    const entry = loaded.get(id)
    if (!entry)
      return
    loaded.delete(id)
    entry.group.destroy({ children: true })
    const operation = Assets.unload(entry.section.src).finally(() => {
      pending.delete(id)
      schedule()
    })
    pending.set(id, operation)
  }

  function ensureSections() {
    const intersects = (section: PanoramaSection, margin = 0) => {
      const bounds = section.bounds ?? [section.clip[0]!, 0, section.clip[1]!, manifest.height]
      return bounds[2]! >= camera.left - margin && bounds[0]! <= camera.right + margin
        && bounds[3]! >= camera.top - margin && bounds[1]! <= camera.bottom + margin
    }
    const visible = manifest.sections.filter(section => intersects(section))
    // Prefetch a narrow border in both axes, then release tiles outside it.
    const nearby = manifest.sections.filter(section => intersects(section, 160))
    wanted = new Set(nearby.map(section => section.id))
    const missing = visible.filter(section => !loaded.has(section.id))
    host.setAttribute('aria-busy', String(missing.length > 0))
    retry.hidden = !missing.some(section => failures.has(section.id))
    status.textContent = retry.hidden ? (missing.length ? '正在展开这一段…' : '放大后可上下左右拖动 · 方向键也可浏览') : '这一段加载失败，可重试或静态浏览'
    if (!ready && missing.length === 0) {
      ready = true
      root.dataset.mode = 'panorama'
      fallback.hidden = true
      fallback.querySelectorAll('img').forEach(img => img.removeAttribute('src'))
    }
    for (const id of loaded.keys()) {
      if (!wanted.has(id))
        void release(id)
    }
    root.dataset.decodedBytes = String([...loaded.values()].reduce((sum, entry) => sum + entry.section.decodedBytes, 0))
    for (const section of nearby) {
      if (loaded.has(section.id) || pending.has(section.id) || failures.has(section.id))
        continue
      const request = Assets.load(section.src).then(async (texture) => {
        if (disposed || !wanted.has(section.id) || staticMode) {
          await Assets.unload(section.src)
          return
        }
        const sprite = new Sprite(texture)
        sprite.position.set(section.start, section.top ?? 0)
        sprite.width = section.width
        sprite.height = section.height ?? manifest.height
        const mask = new Graphics().poly(section.outline.flat()).fill(0xFFFFFF)
        const group = new Container()
        group.addChild(sprite, mask)
        sprite.mask = mask
        land.addChild(group)
        loaded.set(section.id, { section, group })
      }).catch(() => {
        if (!disposed)
          failures.add(section.id)
      }).finally(() => {
        pending.delete(section.id)
        schedule()
      })
      pending.set(section.id, request)
    }
  }

  function onResize() {
    camera.resize(host.clientWidth, host.clientHeight)
    if (initialized)
      app.renderer.resize(host.clientWidth, host.clientHeight)
    if (staticMode)
      fallback.scrollLeft = Math.max(0, camera.x * host.clientHeight / manifest.height - host.clientWidth / 2)
    updateControls()
    schedule()
  }

  function changeView() {
    updateControls()
    if (staticMode)
      fallback.scrollLeft = Math.max(0, camera.x * host.clientHeight / manifest.height - host.clientWidth / 2)
    else
      schedule()
  }

  const options = { signal: events.signal }
  range.addEventListener('input', () => {
    camera.moveTo(Number(range.value) / 1000)
    changeView()
  }, options)
  region.addEventListener('change', () => {
    const view = views[Number(region.value)]!
    camera.zoomAt(view.fit ? camera.minZoom : 1)
    camera.x = view.center[0]!
    camera.y = view.center[1]!
    camera.clamp()
    changeView()
  }, options)
  root.querySelector('[data-reset]')!.addEventListener('click', () => {
    camera.reset()
    changeView()
  }, options)
  root.querySelectorAll<HTMLButtonElement>('[data-zoom]').forEach(button => button.addEventListener('click', () => {
    camera.zoomAt(camera.zoom + Number(button.dataset.zoom))
    changeView()
  }, options))
  retry.addEventListener('click', () => {
    failures.clear()
    schedule()
  }, options)
  staticButton.addEventListener('click', useStatic, options)
  fallback.addEventListener('scroll', () => {
    if (!staticMode)
      return
    camera.zoom = camera.minZoom
    camera.x = (fallback.scrollLeft + host.clientWidth / 2) / (host.clientHeight / manifest.height)
    camera.clamp()
    updateControls()
  }, options)
  host.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight')
      camera.pan((event.key === 'ArrowLeft' ? 1 : -1) * host.clientWidth * 0.18)
    else if (event.key === 'ArrowUp' || event.key === 'ArrowDown')
      camera.pan(0, (event.key === 'ArrowUp' ? 1 : -1) * host.clientHeight * 0.18)
    else if (event.key === 'Home')
      camera.reset()
    else if (event.key === 'End')
      camera.moveTo(1)
    else if ((event.key === '+' || event.key === '=') && !staticMode)
      camera.zoomAt(camera.zoom + 0.1)
    else if (event.key === '-' && !staticMode)
      camera.zoomAt(camera.zoom - 0.1)
    else
      return
    event.preventDefault()
    changeView()
  }, options)
  host.addEventListener('wheel', (event) => {
    event.preventDefault()
    const multiplier = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? host.clientWidth : 1
    if ((event.ctrlKey || event.metaKey) && !staticMode) {
      const rect = host.getBoundingClientRect()
      camera.zoomAt(camera.zoom * Math.exp(-event.deltaY * 0.002), event.clientX - rect.left, event.clientY - rect.top)
    }
    else {
      camera.pan(-(event.deltaX || event.deltaY) * multiplier)
    }
    changeView()
  }, { ...options, passive: false })
  host.addEventListener('pointerdown', (event) => {
    if (staticMode || event.button !== 0)
      return
    host.focus({ preventScroll: true })
    host.setPointerCapture(event.pointerId)
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    host.classList.add('is-dragging')
  }, options)
  host.addEventListener('pointermove', (event) => {
    const previous = pointers.get(event.pointerId)
    if (!previous || staticMode)
      return
    const other = [...pointers.entries()].find(([id]) => id !== event.pointerId)?.[1]
    if (other) {
      const oldDistance = Math.hypot(previous.x - other.x, previous.y - other.y)
      const newDistance = Math.hypot(event.clientX - other.x, event.clientY - other.y)
      const rect = host.getBoundingClientRect()
      camera.pan((event.clientX - previous.x) / 2, (event.clientY - previous.y) / 2)
      if (oldDistance > 0)
        camera.zoomAt(camera.zoom * newDistance / oldDistance, (event.clientX + other.x) / 2 - rect.left, (event.clientY + other.y) / 2 - rect.top)
    }
    else {
      camera.pan(event.clientX - previous.x, event.clientY - previous.y)
    }
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    schedule()
  }, options)
  function endPointer(event: PointerEvent) {
    pointers.delete(event.pointerId)
    if (pointers.size === 0)
      host.classList.remove('is-dragging')
  }
  host.addEventListener('pointerup', endPointer, options)
  host.addEventListener('pointercancel', endPointer, options)
  host.addEventListener('lostpointercapture', endPointer, options)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && frame) {
      cancelAnimationFrame(frame)
      frame = 0
    }
    else if (!document.hidden) {
      schedule()
    }
  }, options)
  // Full navigation can enter the back/forward cache; on restore reload a clean
  // scene rather than retain a destroyed renderer and detached texture cache.
  window.addEventListener('pageshow', event => event.persisted && location.reload())
  const observer = new ResizeObserver(onResize)
  observer.observe(host)
  window.addEventListener('pagehide', () => {
    disposed = true
    events.abort()
    observer.disconnect()
    if (frame)
      cancelAnimationFrame(frame)
    if (initialized)
      app.destroy({ removeView: true }, { children: true })
    for (const entry of loaded.values())
      void Assets.unload(entry.section.src)
    loaded.clear()
  }, { once: true })
  onResize()
  try {
    await app.init({
      width: host.clientWidth,
      height: host.clientHeight,
      autoStart: false,
      sharedTicker: false,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 1.5),
      backgroundColor: 0xD9DEC8,
      preference: 'webgl',
      powerPreference: 'low-power',
      antialias: false,
    })
    initialized = true
    if (disposed || staticMode) {
      app.destroy({ removeView: true }, { children: true })
      initialized = false
      return
    }
    app.stage.addChild(land)
    app.canvas.setAttribute('aria-hidden', 'true')
    app.canvas.classList.add('panorama-canvas')
    app.canvas.addEventListener('webglcontextlost', useStatic, options)
    host.appendChild(app.canvas)
    onResize()
  }
  catch (error) {
    console.warn('田园渲染器初始化失败，切换为静态浏览。', error)
    useStatic()
  }
}
