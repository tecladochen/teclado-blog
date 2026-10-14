import { PanoramaCamera } from './camera'
import { supportsWorld } from './platform'

interface PilotImage {
  id: string
  src: string
  x: number
  y: number
  width: number
  height: number
  clip?: [number, number, number, number]
}

interface PilotManifest {
  width: number
  height: number
  initialCenter: number[]
  maxScale: number
  images: PilotImage[]
}

export function mountPilotWorld(root: HTMLElement) {
  if (!supportsWorld()) {
    root.dataset.mode = 'unsupported'
    root.querySelector<HTMLElement>('[data-unsupported]')!.hidden = false
    return
  }

  const manifest = JSON.parse(root.dataset.manifest!) as PilotManifest
  const host = root.querySelector<HTMLElement>('[data-pilot-viewport]')!
  const scene = root.querySelector<HTMLElement>('[data-pilot-scene]')!
  const error = root.querySelector<HTMLElement>('[data-pilot-error]')!
  const controller = new AbortController()
  const options = { signal: controller.signal }
  const camera = new PanoramaCamera(manifest.width, manifest.height, manifest.initialCenter, manifest.maxScale)
  let drag: { id: number, x: number, y: number } | null = null

  scene.style.width = `${manifest.width}px`
  scene.style.height = `${manifest.height}px`
  for (const item of manifest.images) {
    const image = document.createElement('img')
    image.alt = ''
    image.draggable = false
    image.decoding = 'async'
    image.dataset.imageId = item.id
    image.style.left = `${item.x}px`
    image.style.top = `${item.y}px`
    image.style.width = `${item.width}px`
    image.style.height = `${item.height}px`
    if (item.clip)
      image.style.clipPath = `inset(${item.clip.map(value => `${value}px`).join(' ')})`
    image.addEventListener('load', () => {
      if (image.naturalWidth !== item.width || image.naturalHeight !== item.height) {
        image.hidden = true
        error.hidden = false
      }
    }, options)
    image.addEventListener('error', () => {
      error.hidden = false
    }, options)
    image.src = item.src
    scene.append(image)
  }

  function draw() {
    scene.style.transform = `translate(${-camera.left * camera.scale}px,${-camera.top * camera.scale}px) scale(${camera.scale})`
    root.dataset.scale = String(camera.scale)
    root.dataset.left = String(camera.left)
    root.dataset.top = String(camera.top)
  }

  const observer = new ResizeObserver(() => {
    camera.resize(host.clientWidth, host.clientHeight)
    draw()
  })
  observer.observe(host)
  camera.resize(host.clientWidth, host.clientHeight)
  draw()
  root.dataset.mode = 'ready'

  host.addEventListener('pointerdown', (event) => {
    if (event.button !== 0)
      return
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY }
    host.setPointerCapture(event.pointerId)
    host.classList.add('dragging')
    host.focus({ preventScroll: true })
  }, options)
  host.addEventListener('pointermove', (event) => {
    if (!drag || drag.id !== event.pointerId)
      return
    camera.pan(event.clientX - drag.x, event.clientY - drag.y)
    drag.x = event.clientX
    drag.y = event.clientY
    draw()
  }, options)
  function endDrag() {
    drag = null
    host.classList.remove('dragging')
  }
  host.addEventListener('pointerup', endDrag, options)
  host.addEventListener('pointercancel', endDrag, options)
  host.addEventListener('lostpointercapture', endDrag, options)
  host.addEventListener('wheel', (event) => {
    event.preventDefault()
    const rect = host.getBoundingClientRect()
    camera.zoomAt(camera.zoom * Math.exp(-event.deltaY * 0.001), event.clientX - rect.left, event.clientY - rect.top)
    draw()
  }, { ...options, passive: false })
  host.addEventListener('keydown', (event) => {
    const key = event.key
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', 'Home'].includes(key))
      return
    event.preventDefault()
    if (key === 'Home')
      camera.reset()
    else if (key === '+' || key === '=')
      camera.zoomAt(camera.zoom * 1.15)
    else if (key === '-')
      camera.zoomAt(camera.zoom / 1.15)
    else
      camera.pan(key === 'ArrowLeft' ? 100 : key === 'ArrowRight' ? -100 : 0, key === 'ArrowUp' ? 100 : key === 'ArrowDown' ? -100 : 0)
    draw()
  }, options)
  root.querySelector<HTMLButtonElement>('[data-reset]')!.addEventListener('click', () => {
    camera.reset()
    draw()
  }, options)
  window.addEventListener('pagehide', (event) => {
    endDrag()
    if (event.persisted)
      return
    controller.abort()
    observer.disconnect()
    scene.replaceChildren()
  }, options)
}
