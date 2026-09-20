import { describe, expect, test } from 'vitest'

import { ThemeonError } from '../errors'
import { fromDTCG } from './from-dtcg'
import type { DTCGDocument } from './types'
import aliasCurly from './fixtures/alias-curly.json' with { type: 'json' }
import colorString from './fixtures/color-string.json' with { type: 'json' }
import colorStructural from './fixtures/color-structural.json' with { type: 'json' }
import dimensionStructural from './fixtures/dimension-structural.json' with { type: 'json' }
import extensionsToken from './fixtures/extensions-token.json' with { type: 'json' }
import groupTypeInherit from './fixtures/group-type-inherit.json' with { type: 'json' }
import manifest from './fixtures/matrix-manifest.json' with { type: 'json' }
import rootExtends from './fixtures/root-extends.json' with { type: 'json' }
import tokenGroupMix from './fixtures/token-group-mix.json' with { type: 'json' }

const FIXTURES: Record<string, DTCGDocument> = {
  'alias-curly.json': aliasCurly,
  'color-string.json': colorString,
  'color-structural.json': colorStructural,
  'dimension-structural.json': dimensionStructural,
  'extensions-token.json': extensionsToken,
  'group-type-inherit.json': groupTypeInherit,
  'root-extends.json': rootExtends,
  'token-group-mix.json': tokenGroupMix,
}

describe('DTCG 2025.10 matrix fixtures (P0.1)', () => {
  for (const row of manifest.rows) {
    test(`${row.id} — fixture exercises matrix row`, () => {
      const doc = FIXTURES[row.fixture]
      expect(doc).toBeDefined()
      if (doc === undefined) return
      if (row.import === 'reject-error') {
        expect(() => fromDTCG(doc)).toThrow(ThemeonError)
        return
      }
      const opts = row.import === 'lossy' ? { allowLossy: true } : {}
      const { definition, diagnostics } = fromDTCG(doc, opts)
      expect(definition).toBeDefined()
      expect(diagnostics.length).toBeGreaterThanOrEqual(0)
      if (row.import === 'lossy') {
        expect(diagnostics.some((d) => d.code === 'THEMEON_DTCG_EXTENSIONS_NOT_CARRIED')).toBe(true)
      }
      if (row.id === 'root-extends') {
        expect(diagnostics.some((d) => d.code === 'THEMEON_DTCG_UNSUPPORTED_EXTENDS')).toBe(true)
      }
    })
  }
})
