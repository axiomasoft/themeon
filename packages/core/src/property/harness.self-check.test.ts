import { describe, expect, test } from 'vitest'
import fc from 'fast-check'

const SELF_CHECK = process.env.THEMEON_PROPERTY_SELF_CHECK === '1'

describe.runIf(SELF_CHECK)('P2.1 optional shrinking smoke', () => {
  test('fast-check shrinks integer counterexamples', () => {
    let message = ''
    try {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 200 }), (n) => n < 0),
        { numRuns: 100, seed: 42, verbose: true },
      )
    } catch (error) {
      message = error instanceof Error ? error.message : String(error)
    }
    expect(message).toMatch(/Counterexample|Received/i)
  })
})
