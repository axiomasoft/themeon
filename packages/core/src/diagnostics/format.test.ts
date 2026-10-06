import { describe, expect, test } from 'vitest'
import { createFormatter, formatDiagnostics } from './format'
import type { Diagnostic } from './types'

describe('diagnostic presentation contracts', () => {
  const diagnostic: Diagnostic = {
    code: 'THEMEON_REF_NOT_FOUND', severity: 'error', message: 'Missing reference',
    path: ['color', 'brand'], source: { file: 'theme.ts', line: 2, column: 4 },
    hint: 'Declare the token', related: [{ path: ['color', 'link'], message: 'referrer' }],
  }

  test('pretty output keeps actionable hints and related locations', () => {
    expect(formatDiagnostics([diagnostic], 'pretty')).toBe(
      'error THEMEON_REF_NOT_FOUND at color.brand (theme.ts:2)\n' +
      '  Missing reference\n  hint: Declare the token\n  related color.link: referrer',
    )
  })

  test('GitHub annotations preserve columns and severity without inventing a location', () => {
    expect(formatDiagnostics([diagnostic], 'github')).toBe(
      '::error file=theme.ts,line=2,col=4::THEMEON_REF_NOT_FOUND: Missing reference',
    )
    expect(formatDiagnostics([{ code: diagnostic.code, severity: 'info', message: 'Information' }], 'github')).toBe(
      '::notice::THEMEON_REF_NOT_FOUND: Information',
    )
  })

  test('untrusted diagnostic text cannot emit additional workflow commands', () => {
    const rendered = formatDiagnostics([{
      code: diagnostic.code, severity: 'warning',
      message: '100%\r\n::error::forged annotation',
      source: { file: 'a:b,c%\r\n::notice::.ts', line: 1 },
    }], 'github')
    expect(rendered).toBe(
      '::warning file=a%3Ab%2Cc%25%0D%0A%3A%3Anotice%3A%3A.ts,line=1::' +
      'THEMEON_REF_NOT_FOUND: 100%25%0D%0A::error::forged annotation',
    )
    expect(rendered.split('\n')).toHaveLength(1)
  })

  test.each(['plain', 'pretty', 'json', 'github'] as const)('formatter metadata matches its format: %s', (format) => {
    expect(createFormatter(format).format).toBe(format)
  })
})
