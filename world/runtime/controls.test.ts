/* eslint test/no-import-node-test: off */
import assert from 'node:assert/strict'
import { after, it } from 'node:test'
import { createCamera } from './camera'
import { bindControls } from './controls'

const previousLocation = Object.getOwnPropertyDescriptor(globalThis, 'location')
Object.defineProperty(globalThis, 'location', { configurable: true, value: { search: '' } })
after(() => {
  if (previousLocation)
    Object.defineProperty(globalThis, 'location', previousLocation)
  else
    Reflect.deleteProperty(globalThis, 'location')
})

class Surface extends EventTarget {
  dataset: Record<string, string> = {}
  captures = new Set<number>()
  focus() {}
  getBoundingClientRect() { return { left: 10, top: 20 } }
  setPointerCapture(id: number) { this.captures.add(id) }
  hasPointerCapture(id: number) { return this.captures.has(id) }
  releasePointerCapture(id: number) {
    this.captures.delete(id)
    this.dispatchEvent(Object.assign(new Event('lostpointercapture'), { pointerId: id }))
  }
}

function setup() {
  const canvas = new Surface()
  const camera = createCamera({ size: { width: 2400, height: 1600 }, initial: { x: 1200, y: 800 } })
  camera.resize(600, 500)
  const targets: Record<string, unknown> = { '[data-scene]': canvas, '[data-world-status]': {}, '[data-action="retry"]': {} }
  const host = { querySelector: (selector: string) => targets[selector], querySelectorAll: () => [] } as unknown as HTMLElement
  const abort = new AbortController()
  const controls = bindControls(host, { camera, signal: abort.signal, invalidate() {} })
  return { canvas, camera, controls, abort }
}

function pointer(canvas: Surface, name: string, id: number, x: number, y: number) {
  canvas.dispatchEvent(Object.assign(new Event(name), { button: 0, pointerId: id, clientX: x, clientY: y }))
}
const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 0.00001, `${a} ≠ ${b}`)

it('two captured fingers pinch and pan around the same world point without a jump on release', () => {
  const { canvas, camera, abort } = setup()
  const point = camera.worldAt({ x: 300, y: 230 })
  pointer(canvas, 'pointerdown', 1, 260, 250)
  pointer(canvas, 'pointerdown', 2, 360, 250)
  pointer(canvas, 'pointermove', 2, 390, 270)
  near(camera.worldAt({ x: 315, y: 240 }).x, point.x)
  near(camera.worldAt({ x: 315, y: 240 }).y, point.y)
  assert.ok(camera.scale > 1)
  pointer(canvas, 'pointerup', 2, 390, 270)
  const previous = { ...camera.position }
  pointer(canvas, 'pointermove', 1, 250, 250)
  near(camera.position.x - previous.x, 10 / camera.scale)
  near(camera.position.y, previous.y)
  abort.abort()
})

it('cancellation clears capture and leaves subsequent mouse or touch dragging usable', () => {
  const { canvas, camera, controls, abort } = setup()
  pointer(canvas, 'pointerdown', 1, 300, 250)
  pointer(canvas, 'pointerdown', 2, 380, 250)
  controls.stopDragging()
  assert.equal(canvas.captures.size, 0)
  assert.equal(canvas.dataset.dragging, undefined)
  const before = camera.position.x
  pointer(canvas, 'pointerdown', 3, 400, 250)
  pointer(canvas, 'pointermove', 3, 380, 250)
  assert.equal(camera.position.x, before + 20)
  pointer(canvas, 'pointercancel', 3, 380, 250)
  assert.equal(canvas.dataset.dragging, undefined)
  abort.abort()
})

it('wheel and trackpad pinch prevent page scrolling and retain their pointer anchor', () => {
  const { canvas, camera, abort } = setup()
  const anchor = { x: 280, y: 240 }
  const point = camera.worldAt(anchor)
  for (const ctrlKey of [false, true]) {
    const event = Object.assign(new Event('wheel', { cancelable: true }), { deltaMode: 0, deltaX: 0, deltaY: -15, ctrlKey, clientX: 290, clientY: 260 })
    canvas.dispatchEvent(event)
    assert.equal(event.defaultPrevented, true)
    near(camera.worldAt(anchor).x, point.x)
    near(camera.worldAt(anchor).y, point.y)
  }
  assert.ok(camera.scale > 1)
  abort.abort()
})
