import assert from 'node:assert/strict'
// eslint-disable-next-line test/no-import-node-test -- Keep the existing built-in test runner.
import { it } from 'node:test'
import { isMobileWorldClient } from './platform'

it('blocks phones and iPads even with a desktop user agent or external pointer', () => {
  assert.equal(isMobileWorldClient('Android Chrome', 1, false), true)
  assert.equal(isMobileWorldClient('iPhone Safari', 1, false), true)
  assert.equal(isMobileWorldClient('Macintosh Safari', 5, false), true)
})

it('keeps narrow desktop windows and touch laptops with a mouse supported', () => {
  assert.equal(isMobileWorldClient('Windows Chrome', 10, false), false)
  assert.equal(isMobileWorldClient('Macintosh Safari', 0, false), false)
  assert.equal(isMobileWorldClient('Unknown touch browser', 1, true), true)
})
