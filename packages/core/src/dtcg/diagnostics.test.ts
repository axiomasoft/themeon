import { describe, expect, test } from 'vitest'

import { ThemeonError } from '../errors'
import { diagnosticsFromWarnings } from './diagnostics'
import { fromDTCG } from './from-dtcg'

describe('dtcg diagnostics', () => {
  test('diagnosticsFromWarnings assigns stable codes', () => {
    const [diag] = diagnosticsFromWarnings(['token "a" has no resolvable $type (not set on the token nor inherited from a parent group, spec §5.2.2), skipped'])
    expect(diag?.code).toBe('THEMEON_DTCG_UNKNOWN_TYPE')
  })

  test('lossy import rejected by default (D2)', () => {
    expect(() =>
      fromDTCG({
        color: { a: { $type: 'color', $value: '#000', $extensions: { x: 1 } } },
      }),
    ).toThrow(ThemeonError)
    try {
      fromDTCG({
        color: { a: { $type: 'color', $value: '#000', $extensions: { x: 1 } } },
      })
    } catch (error) {
      expect(error).toBeInstanceOf(ThemeonError)
      expect((error as ThemeonError).code).toBe('DTCG_LOSSY_IMPORT')
    }
  })
})
