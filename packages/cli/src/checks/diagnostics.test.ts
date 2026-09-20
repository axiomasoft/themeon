import { describe, expect, it } from 'vitest'
import { formatDiagnostics } from '@themeon/core'
import { diagnosticFromFinding, findingsToDiagnostics } from './diagnostics'
import type { Finding } from './types'

describe('CLI diagnostic adapter (P1.4)', () => {
  const findings: Finding[] = [
    {
      level: 'error',
      rule: 'contrast',
      code: 'THEMEON_CONTRAST_WCAG_AA',
      message: 'WCAG 2.2 AA 1.20:1 < 4.5:1 for text/bg.page',
    },
    {
      level: 'warning',
      rule: 'hardcode',
      message: 'hardcoded hex',
      file: 'app.css',
      line: 2,
    },
  ]

  it('maps Finding.code and falls back per rule; formatters keep order and severity', () => {
    const diagnostics = findingsToDiagnostics(findings)
    expect(diagnostics.map((item) => item.code)).toEqual(['THEMEON_CONTRAST_WCAG_AA', 'THEMEON_CHECK_HARDCODE'])
    expect(diagnostics.map((item) => item.severity)).toEqual(['error', 'warning'])
    expect(diagnostics[1]?.source).toEqual({ file: 'app.css', line: 2 })

    const pretty = formatDiagnostics(diagnostics, 'pretty')
    const json = JSON.parse(formatDiagnostics(diagnostics, 'json')) as {
      diagnostics: Array<{ code: string; severity: string }>
    }
    expect(json.diagnostics.map((item) => item.code)).toEqual(diagnostics.map((item) => item.code))
    expect(pretty.indexOf('THEMEON_CONTRAST_WCAG_AA')).toBeLessThan(pretty.indexOf('THEMEON_CHECK_HARDCODE'))
  })

  it('does not invent a code by parsing the message', () => {
    const diagnostic = diagnosticFromFinding({
      level: 'error',
      rule: 'token-coverage',
      message: 'looks like THEMEON_REF_CYCLE but is coverage',
    })
    expect(diagnostic.code).toBe('THEMEON_CHECK_COVERAGE')
  })
})
