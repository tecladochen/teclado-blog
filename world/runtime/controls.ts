import type { Camera } from './camera'

interface Options {
  camera: Camera
  signal: AbortSignal
  invalidate: () => void
  retryDetails?: () => void
  toggleMotion?: () => void
}

export function bindControls(host: HTMLElement, { camera, signal, invalidate, retryDetails, toggleMotion }: Options) {
  const canvas = host.querySelector<HTMLCanvasElement>('[data-scene]')!
  const status = host.querySelector<HTMLElement>('[data-world-status]')!
  const retry = host.querySelector<HTMLButtonElement>('[data-action="retry"]')!
  const pointers = new Map<number, { x: number, y: number }>()

  function local(point: { x: number, y: number }) {
    const rect = canvas.getBoundingClientRect()
    return { x: point.x - rect.left, y: point.y - rect.top }
  }
  function move(x: number, y: number) {
    camera.move(x / camera.scale, y / camera.scale)
    invalidate()
  }
  function reset() {
    camera.reset()
    status.textContent = '已回到院落。'
    invalidate()
  }
  function gesture() {
    const [first, second] = [...pointers.values()]
    return first && second
      ? { center: { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 }, distance: Math.hypot(first.x - second.x, first.y - second.y) }
      : undefined
  }

  canvas.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || pointers.size >= 2)
      return
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    canvas.setPointerCapture(event.pointerId)
    canvas.focus({ preventScroll: true })
    canvas.dataset.dragging = 'true'
  }, { signal })
  canvas.addEventListener('pointermove', (event) => {
    const previous = pointers.get(event.pointerId)
    if (!previous)
      return
    const before = gesture()
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    const after = gesture()
    if (before && after) {
      camera.zoomAt(camera.scale * after.distance / Math.max(1, before.distance), local(before.center))
      move(before.center.x - after.center.x, before.center.y - after.center.y)
    }
    else {
      move(previous.x - event.clientX, previous.y - event.clientY)
    }
  }, { signal })
  function release(event: PointerEvent) {
    pointers.delete(event.pointerId)
    if (!pointers.size)
      delete canvas.dataset.dragging
  }
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture'] as const)
    canvas.addEventListener(name, release, { signal })
  canvas.addEventListener('wheel', (event) => {
    event.preventDefault()
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? camera.height : 1
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY) && !event.ctrlKey) {
      move(event.deltaX * unit, 0)
      return
    }
    const delta = Math.max(-100, Math.min(100, event.deltaY * unit))
    camera.zoomAt(camera.scale * Math.exp(-delta * (event.ctrlKey ? 0.008 : 0.002)), local({ x: event.clientX, y: event.clientY }))
    invalidate()
  }, { signal, passive: false })
  canvas.addEventListener('keydown', (event) => {
    const step = event.shiftKey ? 200 : 65
    const delta = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[event.key]
    if (delta) {
      event.preventDefault()
      move(delta[0]!, delta[1]!)
    }
    if (event.key === 'Home' || event.key === '0') {
      event.preventDefault()
      reset()
    }
    if (['+', '=', '-', '_'].includes(event.key)) {
      event.preventDefault()
      camera.zoomAt(camera.scale * (event.key === '-' || event.key === '_' ? 1 / 1.15 : 1.15))
      invalidate()
    }
    if (event.code === 'Space' && toggleMotion) {
      event.preventDefault()
      toggleMotion()
    }
  }, { signal })
  host.querySelectorAll<HTMLButtonElement>('[data-action]').forEach((button) => {
    button.addEventListener('click', () => {
      if (button.dataset.action === 'reset')
        reset()
      if (button.dataset.action === 'pause')
        toggleMotion?.()
      if (button.dataset.action === 'retry') {
        retryDetails?.()
        invalidate()
      }
    }, { signal })
  })
  const requestedPlace = new URLSearchParams(location.search).get('place')
  if (requestedPlace)
    camera.goTo(requestedPlace)

  return {
    update(failed: number) {
      retry.hidden = failed === 0 || !retryDetails
    },
    motion(paused: boolean) {
      const button = host.querySelector<HTMLButtonElement>('[data-action="pause"]')!
      const label = paused ? '继续画面动态' : '暂停画面动态'
      button.setAttribute('aria-pressed', String(paused))
      button.setAttribute('aria-label', label)
      button.title = label
      host.dataset.paused = String(paused)
    },
    enable() {
      host.querySelectorAll<HTMLButtonElement>('[data-action]').forEach(button => button.disabled = false)
      host.querySelector<HTMLButtonElement>('[data-action="pause"]')!.hidden = !toggleMotion
    },
    stopDragging() {
      const ids = [...pointers.keys()]
      pointers.clear()
      for (const id of ids) {
        if (canvas.hasPointerCapture(id))
          canvas.releasePointerCapture(id)
      }
      delete canvas.dataset.dragging
    },
  }
}
