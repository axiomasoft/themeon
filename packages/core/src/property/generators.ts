import fc from 'fast-check'

import { defineTheme, defineTokens } from '../define'
import type { SysTreeInput, ThemeDefinition, TokenTreeInput } from '../types'
import { MAX_THEME_LEAVES } from './config'

const segment = fc.stringMatching(/^[a-z][a-z0-9]{0,5}$/)

const hexByte = fc.integer({ min: 0, max: 255 })

const hexColor = fc
  .tuple(hexByte, hexByte, hexByte)
  .map(([r, g, b]) =>
    `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`,
  )

const remDimension = fc
  .integer({ min: 1, max: 48 })
  .map((n) => `${n * 0.25}rem`)

function buildColorTree(leaves: Readonly<Record<string, string>>): TokenTreeInput {
  const color: Record<string, Record<string, string>> = {}
  for (const [dotted, value] of Object.entries(leaves)) {
    const [group, leaf] = dotted.split('.')
    if (!group || !leaf) continue
    if (!color[group]) color[group] = {}
    color[group][leaf] = value
  }
  return { color }
}

function leavesToBase(leaves: Record<string, string>): SysTreeInput {
  return buildColorTree(leaves) as SysTreeInput
}

/** Valid shallow color-only themes for resolver/serialize laws. */
export const arbitraryFlatColorTheme = fc
  .uniqueArray(
    fc.tuple(segment, segment, hexColor),
    { minLength: 1, maxLength: MAX_THEME_LEAVES, selector: ([a, b]) => `${a}.${b}` },
  )
  .map((rows) => {
    const leaves: Record<string, string> = {}
    for (const [a, b, color] of rows) leaves[`${a}.${b}`] = color
    return defineTheme({ base: leavesToBase(leaves) })
  })

/** Authoring-time trees with a permuted key order sibling map. */
export const arbitraryFlatColorTreePair = fc
  .uniqueArray(
    fc.tuple(segment, segment, hexColor),
    { minLength: 1, maxLength: MAX_THEME_LEAVES, selector: ([a, b]) => `${a}.${b}` },
  )
  .map((rows) => {
    const leaves: Record<string, string> = {}
    for (const [a, b, color] of rows) leaves[`${a}.${b}`] = color
    const base = leavesToBase(leaves)
    const permuted = permuteObjectKeys(base as Record<string, unknown>)
    return { base, permuted }
  })

/** Color + space theme suitable for DTCG round-trip (no composite text / theme overlays). */
export const arbitraryDtcgSafeTheme = fc
  .tuple(
    fc.uniqueArray(fc.tuple(segment, segment, hexColor), {
      maxLength: 6,
      selector: ([a, b]) => `${a}.${b}`,
    }),
    fc.uniqueArray(fc.tuple(segment, remDimension), { maxLength: 4, selector: ([k]) => k }),
  )
  .map(([colors, spaces]) => {
    const colorLeaves: Record<string, string> = {}
    for (const [a, b, c] of colors) colorLeaves[`${a}.${b}`] = c
    const spaceLeaves: Record<string, string> = {}
    for (const [k, v] of spaces) spaceLeaves[k] = v
    return defineTheme({
      base: {
        ...buildColorTree(colorLeaves),
        space: spaceLeaves,
      } as SysTreeInput,
    })
  })

/** Theme with Token reference (alias) leaf. */
export const arbitraryAliasTheme = hexColor.map((seedColor) => {
  const palette = defineTokens('color', { brand: { base: seedColor } })
  return defineTheme({
    base: {
      color: {
        brand: { base: seedColor },
        link: palette.brand.base,
      },
    },
  })
})

export const arbitraryDistinctPaths = fc.uniqueArray(
  fc.tuple(fc.constantFrom('color', 'space', 'z'), segment, segment),
  {
    maxLength: 10,
    selector: ([g, a, b]) => `${g}.${a}.${b}`,
  },
).map((rows) => rows.map(([g, a, b]) => [g, a, b] as const))

function permuteObjectKeys(node: Record<string, unknown>): TokenTreeInput {
  const keys = Object.keys(node).reverse()
  const out: TokenTreeInput = {}
  for (const key of keys) {
    const value = node[key]
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      out[key] = permuteObjectKeys(value as Record<string, unknown>)
    } else {
      out[key] = value as TokenTreeInput
    }
  }
  return out
}

export const arbitraryPatchableTheme = fc.tuple(hexColor, hexColor).map(([page, accent]) =>
  defineTheme({
    base: {
      color: { bg: { page }, action: { primary: accent } },
      space: { 4: '1rem' },
    },
  }),
)

export const arbitraryBrandingPatch = fc.record({
  color: fc.record({
    bg: fc.record({
      page: hexColor,
    }),
  }),
})
