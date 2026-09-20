import { describe, expect, it } from 'vitest'
import { ThemeonError } from '@themeon/core'
import { formatThemeFailure } from './diagnostics'

describe('Nuxt diagnostic adapter (P1.4)', () => {
  it('renders ThemeonError by code through pretty/json without changing severity', () => {
    const err = new ThemeonError('CYCLE', 'Circular token reference: color.a → color.b → color.a', {
      path: ['color', 'a'],
    })
    const pretty = formatThemeFailure(err, 'pretty')
    const report = JSON.parse(formatThemeFailure(err, 'json')) as {
      diagnostics: Array<{ code: string; severity: string }>
    }
    expect(pretty).toContain('error THEMEON_REF_CYCLE')
    expect(report.diagnostics).toEqual([
      expect.objectContaining({ code: 'THEMEON_REF_CYCLE', severity: 'error' }),
    ])
  })
})
