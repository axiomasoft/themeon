import assert from 'node:assert/strict'
import test from 'node:test'
import { warmMedianAsync } from './measure.mjs'

test('async samples finish sequentially before timing returns', async () => {
  let active = 0
  let maximumActive = 0
  let finished = 0
  const median = await warmMedianAsync(async () => {
    active++
    maximumActive = Math.max(maximumActive, active)
    await Promise.resolve()
    active--
    finished++
  }, 3)
  assert.equal(finished, 3)
  assert.equal(maximumActive, 1)
  assert.ok(Number.isFinite(median) && median >= 0)
})

test('async benchmark failures propagate', async () => {
  await assert.rejects(warmMedianAsync(async () => {
    throw new Error('delivery failed')
  }, 3), /delivery failed/)
})
