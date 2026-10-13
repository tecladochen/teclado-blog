import assert from 'node:assert/strict'
// eslint-disable-next-line test/no-import-node-test -- Use the built-in runner without adding a test framework.
import { it } from 'node:test'
import { PanoramaCamera } from './camera'

it('height-fit shows the complete new vertical space and cannot shrink further', () => {
  const camera = new PanoramaCamera(2170, 1773, [1085, 886.5], 0.75)
  camera.resize(1280, 720)
  camera.zoomAt(0.01)
  assert.ok(Math.abs(camera.top) < 0.001)
  assert.ok(Math.abs(camera.bottom - 1773) < 0.001)
  assert.ok(Math.abs(camera.scale - 720 / 1773) < 0.001)
})

it('portrait can observe local details and both horizontal and vertical ends', () => {
  const camera = new PanoramaCamera(2170, 1773, [1085, 886.5], 0.75)
  camera.resize(390, 844)
  camera.zoomAt(10)
  camera.moveTo(1)
  assert.ok(Math.abs(camera.right - 2170) < 0.001)
  camera.pan(-100000, -100000)
  assert.ok(Math.abs(camera.bottom - 1773) < 0.001)
  camera.moveTo(0)
  camera.pan(100000, 100000)
  assert.ok(Math.abs(camera.left) < 0.001)
  assert.ok(Math.abs(camera.top) < 0.001)
})

it('zoom keeps the chosen ground point under the pointer away from boundaries', () => {
  const camera = new PanoramaCamera(7200, 1773, [3500, 886.5], 0.75)
  camera.resize(1280, 720)
  const point = [camera.left + 750 / camera.scale, camera.top + 350 / camera.scale]
  camera.zoomAt(0.9, 750, 350)
  assert.ok(Math.abs(camera.left + 750 / camera.scale - point[0]!) < 0.001)
  assert.ok(Math.abs(camera.top + 350 / camera.scale - point[1]!) < 0.001)
})

it('maximum source scale stays fixed through resizing; reset follows height-fit', () => {
  const camera = new PanoramaCamera(2170, 1773, [1085, 886.5], 0.75)
  camera.resize(1280, 720)
  camera.zoomAt(100)
  camera.resize(1440, 1000)
  assert.equal(camera.scale, 0.75)
  camera.reset()
  assert.ok(Math.abs(camera.scale - 1000 / 1773) < 0.001)
  camera.resize(390, 844)
  assert.ok(Math.abs(camera.bottom - 1773) < 0.001)
})

it('oversized windows centre the art and retain the quality cap', () => {
  const camera = new PanoramaCamera(2170, 1773, [1085, 886.5], 0.75)
  camera.resize(10000, 3000)
  camera.moveTo(1)
  camera.pan(-100000, 100000)
  assert.equal(camera.scale, 0.75)
  assert.equal(camera.x, 1085)
  assert.equal(camera.y, 886.5)
  assert.equal(camera.progress, 0)
})
