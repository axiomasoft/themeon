import fc from 'fast-check'

import { PROPERTY_RUNS, PROPERTY_SEED } from './config'
import { persistFailureReplay } from './replay'

export interface PropertyRunOptions {
  readonly numRuns?: number
  readonly seed?: number
}

export function fcParams(opts: PropertyRunOptions = {}): fc.Parameters<unknown> {
  return {
    numRuns: opts.numRuns ?? PROPERTY_RUNS,
    seed: opts.seed ?? PROPERTY_SEED,
    verbose: false,
  }
}

/**
 * Assert a fast-check property; on failure persist a minimal replay under
 * `tests/fixtures/generated/replay/`.
 */
export function runProperty<T>(
  lawId: string,
  arbitrary: fc.Arbitrary<T>,
  predicate: (value: T) => boolean | void,
  opts?: PropertyRunOptions,
): void {
  try {
    fc.assert(
      fc.property(arbitrary, (value) => {
        const ok = predicate(value)
        return ok !== false
      }),
      fcParams(opts),
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const counterexample = extractCounterexample(message)
    persistFailureReplay(lawId, counterexample, message)
    throw error
  }
}

function extractCounterexample(message: string): unknown {
  const jsonStart = message.indexOf('Counterexample:')
  if (jsonStart === -1) return { raw: message.slice(0, 500) }
  const slice = message.slice(jsonStart)
  const match = slice.match(/Counterexample:\s*(\{[\s\S]*\}|\[[\s\S]*\]|"[^"]*"|-?\d+)/)
  if (!match?.[1]) return { raw: slice.slice(0, 500) }
  try {
    return JSON.parse(match[1]) as unknown
  } catch {
    return { raw: match[1] }
  }
}
