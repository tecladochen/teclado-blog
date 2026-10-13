/* eslint test/no-import-node-test: off */
import assert from 'node:assert/strict'
import { it } from 'node:test'
import { createCamera } from './camera'

const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 0.00001, `${a} ≠ ${b}`)
const make = () => createCamera({ size: { width: 2000, height: 1400 }, initial: { x: 1000, y: 700 } })

it('zoom keeps the world beneath the pointer stationary, including at the zoom limit', () => {
  const camera = make()
  camera.resize(800, 600)
  const anchor = { x: 180, y: 240 }
  const point = camera.worldAt(anchor)
  camera.zoomAt(1.4, anchor)
  near(camera.worldAt(anchor).x, point.x)
  near(camera.worldAt(anchor).y, point.y)
  camera.zoomAt(100, anchor)
  const limited = { ...camera.position }
  camera.zoomAt(100, anchor)
  assert.deepEqual(camera.position, limited)
})

it('a combined pinch and finger translation retains the same world point under their midpoint', () => {
  const camera = make()
  camera.resize(600, 500)
  const before = { x: 220, y: 210 }
  const after = { x: 250, y: 225 }
  const point = camera.worldAt(before)
  camera.zoomAt(camera.scale * 1.3, before)
  camera.move((before.x - after.x) / camera.scale, (before.y - after.y) / camera.scale)
  near(camera.worldAt(after).x, point.x)
  near(camera.worldAt(after).y, point.y)
})

it('desktop, portrait and oversized viewports remain inside the painting after extreme pan and zoom', () => {
  const camera = make()
  for (const [width, height] of [[1440, 900], [390, 844], [3440, 1440], [200, 2400]]) {
    camera.resize(width!, height!)
    for (const direction of [-1, 1]) {
      camera.zoomAt(direction < 0 ? 0.00001 : 100)
      camera.move(direction * 100000, direction * 100000)
      const view = camera.view()
      assert.ok(view.x >= -0.00001 && view.y >= -0.00001)
      assert.ok(view.x + view.width <= 2000.00001 && view.y + view.height <= 1400.00001)
    }
  }
})

it('reset restores both position and scale after exploration', () => {
  const camera = make()
  camera.resize(800, 600)
  camera.move(300, 200)
  camera.zoomAt(1.5)
  camera.reset()
  assert.deepEqual(camera.position, { x: 1000, y: 700 })
  assert.equal(camera.scale, 1)
})
