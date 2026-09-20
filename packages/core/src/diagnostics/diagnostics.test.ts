import { describe, expect, test } from 'vitest'
import pkg from '../../package.json'
import { canonicalId } from '../model/ir'
import { GRAPH_MAX_DEPTH } from '../graph/build'
import type { GraphIssue } from '../graph/build'
import { ThemeonError } from '../errors'
import {
  DIAGNOSTIC_CODES,
  DIAGNOSTIC_SCHEMA_VERSION,
  aggregateDiagnostics,
  diagnosticFromDtcg,
  diagnosticFromGraphIssue,
  diagnosticFromThemeonError,
  diagnosticFromUnknown,
  diagnosticsFromGraphIssues,
  formatDiagnostics,
} from './index'
import type { Diagnostic } from './types'

function sample(overrides: Partial<Diagnostic> = {}): Diagnostic {
  return {
    code: 'THEMEON_REF_CYCLE',
    severity: 'error',
    message: 'Circular token reference: color.a → color.b → color.a',
    path: ['color', 'a'],
    ...overrides,
  }
}

describe('diagnostic schema (P1.4)', () => {
  test('schema version is 1 and catalog codes are THEMEON_*', () => {
    expect(DIAGNOSTIC_SCHEMA_VERSION).toBe(1)
    expect(DIAGNOSTIC_CODES.length).toBeGreaterThan(10)
    for (const code of DIAGNOSTIC_CODES) expect(code.startsWith('THEMEON_')).toBe(true)
  })

  test('unknown additive codes round-trip without catalog membership', () => {
    const diagnostic = sample({ code: 'THEMEON_FUTURE_CODE' })
    const [frozen] = aggregateDiagnostics([diagnostic])
    expect(frozen?.code).toBe('THEMEON_FUTURE_CODE')
    const parsed = JSON.parse(formatDiagnostics([frozen!], 'json')) as {
      diagnostics: Array<{ code: string }>
    }
    expect(parsed.diagnostics[0]?.code).toBe('THEMEON_FUTURE_CODE')
  })

  test('structured object snapshot is independent of pretty text', () => {
    const diagnostics = aggregateDiagnostics([
      sample(),
      sample({
        code: 'THEMEON_REF_NOT_FOUND',
        message: 'Missing token reference: color.missing',
        path: ['color', 'missing'],
        severity: 'error',
      }),
    ])
    expect(diagnostics).toMatchInlineSnapshot(`
      [
        {
          "code": "THEMEON_REF_CYCLE",
          "message": "Circular token reference: color.a → color.b → color.a",
          "path": [
            "color",
            "a",
          ],
          "severity": "error",
        },
        {
          "code": "THEMEON_REF_NOT_FOUND",
          "message": "Missing token reference: color.missing",
          "path": [
            "color",
            "missing",
          ],
          "severity": "error",
        },
      ]
    `)
    const pretty = formatDiagnostics(diagnostics, 'pretty')
    expect(pretty).toContain('error THEMEON_REF_CYCLE at color.a')
    expect(pretty).toContain('error THEMEON_REF_NOT_FOUND at color.missing')
  })

  test('github formatter emits workflow commands', () => {
    const diagnostics = aggregateDiagnostics([
      sample({ path: ['color', 'a'], source: { file: 'theme.config.ts', line: 3 } }),
    ])
    expect(formatDiagnostics(diagnostics, 'github')).toBe(
      '::error file=theme.config.ts,line=3::THEMEON_REF_CYCLE: Circular token reference: color.a → color.b → color.a',
    )
  })

  test('formatters omit location when path is missing or empty', () => {
    const message = 'Circular token reference: color.a → color.b → color.a'
    for (const path of [undefined, [] as string[]]) {
      const bare = aggregateDiagnostics([sample({ path })])
      expect(formatDiagnostics(bare, 'pretty')).toBe(`error THEMEON_REF_CYCLE\n  ${message}`)
      expect(formatDiagnostics(bare, 'plain')).toBe(`error THEMEON_REF_CYCLE ${message}`)
    }
  })
})

describe('legacy mapping', () => {
  test('ThemeonError maps at a single boundary by code, not message text', () => {
    const error = new ThemeonError('CYCLE', 'human text can change', { path: ['color', 'a'] })
    const diagnostic = diagnosticFromThemeonError(error, { provenance: { stage: 'resolve' } })
    expect(diagnostic.code).toBe('THEMEON_REF_CYCLE')
    expect(diagnostic.severity).toBe('error')
    expect(diagnostic.path).toEqual(['color', 'a'])
    expect(diagnostic.message).toBe('human text can change')
  })

  test('graph CYCLE/MISSING_REF/DEPTH map to THEMEON_REF_* without parsing messages', () => {
    const cycle: GraphIssue = {
      code: 'CYCLE',
      nodes: [canonicalId(['color', 'a']), canonicalId(['color', 'b'])],
      paths: [
        ['color', 'a'],
        ['color', 'b'],
      ],
    }
    const missing: GraphIssue = {
      code: 'MISSING_REF',
      from: canonicalId(['color', 'a']),
      ref: ['color', 'missing'],
    }
    const depth: GraphIssue = { code: 'DEPTH', from: canonicalId(['color', 'a']), depth: GRAPH_MAX_DEPTH + 1 }
    const mapped = diagnosticsFromGraphIssues([cycle, missing, depth])
    expect(mapped.map((item) => item.code)).toEqual([
      'THEMEON_REF_CYCLE',
      'THEMEON_REF_NOT_FOUND',
      'THEMEON_REF_DEPTH',
    ])
    expect(diagnosticFromGraphIssue(missing).path).toEqual(['color', 'missing'])
  })

  test('DTCG diagnostic codes stay THEMEON_DTCG_*', () => {
    const diagnostic = diagnosticFromDtcg({
      code: 'THEMEON_DTCG_LOSSY_IMPORT',
      severity: 'warning',
      message: 'lossy',
      path: ['color'],
    })
    expect(diagnostic.code).toBe('THEMEON_DTCG_LOSSY_IMPORT')
    expect(diagnostic.severity).toBe('warning')
    expect(diagnostic.provenance?.stage).toBe('dtcg')
  })

  test('unknown errors become THEMEON_INTERNAL without dropping the original text', () => {
    const diagnostic = diagnosticFromUnknown(new Error('boom'), { provenance: { stage: 'adapter' } })
    expect(diagnostic.code).toBe('THEMEON_INTERNAL')
    expect(diagnostic.message).toBe('boom')
  })
})

describe('redaction', () => {
  test('tenant diagnostics strip quoted payload, url() and javascript: from message and hint', () => {
    const error = new ThemeonError(
      'PATCH_POLICY',
      `Tenant value "url(https://evil.example/x.css)" javascript:alert(1) '{__proto__:1}' rejected`,
      {
        path: ['color', 'bg', 'page'],
        hint: 'Do not send "constructor.prototype" or url(javascript:1)',
      },
    )
    const diagnostic = diagnosticFromThemeonError(error, { provenance: { stage: 'tenant' } })
    expect(diagnostic.path).toEqual(['color', 'bg', 'page'])
    expect(diagnostic.message).not.toContain('evil.example')
    expect(diagnostic.message).not.toContain('javascript:alert')
    expect(diagnostic.message).not.toContain('__proto__')
    expect(diagnostic.message).toContain('[redacted]')
    expect(diagnostic.hint).not.toContain('constructor.prototype')
    expect(diagnostic.hint).toContain('[redacted]')
    const json = formatDiagnostics([diagnostic], 'json')
    expect(json).not.toContain('evil.example')
    expect(json).toContain('THEMEON_PATCH_POLICY')
  })

  test('non-tenant diagnostics keep quoted text', () => {
    const diagnostic = diagnosticFromThemeonError(
      new ThemeonError('NAME_COLLISION', 'Collision between "color.bg.base" and "color.bgBase"'),
    )
    expect(diagnostic.message).toContain('"color.bg.base"')
  })
})

describe('formatters', () => {
  test('pretty/plain/json keep severity and input order', () => {
    const diagnostics = aggregateDiagnostics([
      sample({ code: 'THEMEON_CONTRAST_APCA_ADVISORY', severity: 'warning', message: 'advisory' }),
      sample({ code: 'THEMEON_REF_CYCLE', severity: 'error', message: 'cycle' }),
      sample({ code: 'THEMEON_DTCG_EMPTY_IMPORT', severity: 'info', message: 'empty', path: ['meta'] }),
    ])
    const pretty = formatDiagnostics(diagnostics, 'pretty').split('\n')
    const plain = formatDiagnostics(diagnostics, 'plain').split('\n')
    const report = JSON.parse(formatDiagnostics(diagnostics, 'json')) as {
      schemaVersion: number
      diagnostics: Array<{ code: string; severity: string }>
    }

    expect(report.schemaVersion).toBe(1)
    expect(report.diagnostics.map((item) => item.severity)).toEqual(['warning', 'error', 'info'])
    expect(report.diagnostics.map((item) => item.code)).toEqual(diagnostics.map((item) => item.code))
    expect(plain.map((line) => line.split(' ')[0])).toEqual(['warning', 'error', 'info'])
    expect(pretty.filter((line) => /^(error|warning|info) /.test(line)).map((line) => line.split(' ')[0])).toEqual([
      'warning',
      'error',
      'info',
    ])
  })

  test('json key order is stable across insertion permutation of diagnostic fields', () => {
    const a = aggregateDiagnostics([
      { severity: 'error', message: 'x', code: 'THEMEON_BAD_VALUE', path: ['a'] },
    ])
    const b = aggregateDiagnostics([
      { path: ['a'], code: 'THEMEON_BAD_VALUE', message: 'x', severity: 'error' },
    ])
    expect(formatDiagnostics(a, 'json')).toBe(formatDiagnostics(b, 'json'))
  })
})

describe('core zero-dependency envelope', () => {
  test('package.json has no runtime dependencies', () => {
    expect(Object.hasOwn(pkg, 'dependencies')).toBe(false)
  })
})
