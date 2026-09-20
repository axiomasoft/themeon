import { describe, expect, test } from 'vitest'

import { normalizeDsl } from '../authoring/normalize-dsl'
import { normalizeDtcg } from '../authoring/normalize-dtcg'
import { defineTheme, defineTokens } from '../define'
import { resolveTheme } from '../resolve'
import { serializeThemeCss } from '../serialize'
import { canonicalId, irFromDefinition, toThemeDefinition } from '../model'
import { isToken } from '../types'
import type { Token } from '../types'

function representative() {
  const palette = defineTokens('color', { forest: { 600: 'oklch(0.55 0.13 155)' } })
  return defineTheme({
    base: {
      color: { bg: { page: 'oklch(0.99 0 0)' }, action: { primary: palette.forest[600] } },
      space: { 4: '1rem' },
      text: { '2xl': { size: '1.5rem', lineHeight: 1.33 } },
    },
    themes: { dark: { color: { bg: { page: 'oklch(0.15 0 0)' } } } },
  })
}

describe('canonical IR (P1.2)', () => {
  test('DSL normalizer is frozen, path-identified, and records aliases without nesting Token objects', () => {
    const def = representative()
    const ir = normalizeDsl(def)
    expect(Object.isFrozen(ir)).toBe(true)
    expect(Object.isFrozen(ir.tokens)).toBe(true)

    const page = ir.tokens.find((t) => t.id === canonicalId(['color', 'bg', 'page']))
    expect(page?.value).toEqual({ kind: 'literal', type: 'color', value: 'oklch(0.99 0 0)' })
    expect(page?.source.kind).toBe('dsl')
    expect(ir.sysIds).toContain(page?.id)

    const primary = ir.tokens.find((t) => t.id === canonicalId(['color', 'action', 'primary']))
    expect(primary?.value).toEqual({ kind: 'alias', ref: ['color', 'forest', '600'] })

    const palette = ir.tokens.find((t) => t.id === canonicalId(['color', 'forest', '600']))
    expect(palette).toBeDefined()
    expect(ir.sysIds).not.toContain(palette?.id)
  })

  test('DTCG normalizer carries description on IR while the Token facade stays unchanged', () => {
    const { definition, document } = normalizeDtcg({
      color: {
        $type: 'color',
        bg: {
          page: {
            $value: '#ffffff',
            $description: 'Page background',
          },
        },
      },
    })
    const irPage = document.tokens.find((t) => t.id === canonicalId(['color', 'bg', 'page']))
    expect(irPage?.metadata.description).toBe('Page background')
    expect(irPage?.source.kind).toBe('dtcg')

    const token = (definition.sys as unknown as { color: { bg: { page: Token } } }).color.bg.page
    expect(isToken(token)).toBe(true)
    expect(token).not.toHaveProperty('metadata')
    expect(token).not.toHaveProperty('description')
  })

  test('DTCG $extensions are retained on IR when allowLossy is explicit', () => {
    const { document } = normalizeDtcg(
      {
        color: {
          $type: 'color',
          bg: {
            page: {
              $value: '#ffffff',
              $extensions: { 'com.acme': { a: 1 } },
            },
          },
        },
      },
      { allowLossy: true },
    )
    const irPage = document.tokens.find((t) => t.id === canonicalId(['color', 'bg', 'page']))
    expect(irPage?.metadata.extensions).toEqual({ 'com.acme': { a: 1 } })
  })

  test('compatibility facade round-trips DSL IR to equivalent resolved CSS', () => {
    const original = representative()
    const roundTrip = toThemeDefinition(irFromDefinition(original, { kind: 'dsl' }))
    const opts = { aliases: 'legacy-v0' as const }
    expect(serializeThemeCss(resolveTheme(roundTrip, opts))).toBe(
      serializeThemeCss(resolveTheme(original, opts)),
    )
  })

  test('IR document stays frozen after metadata merge', () => {
    const { document } = normalizeDtcg({
      color: { $type: 'color', bg: { page: { $value: '#fff', $description: 'x' } } },
    })
    expect(Object.isFrozen(document)).toBe(true)
    expect(Object.isFrozen(document.tokens[0])).toBe(true)
  })
})
