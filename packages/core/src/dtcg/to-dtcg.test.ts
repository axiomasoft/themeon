import { describe, expect, test } from 'vitest'
import { toDTCG } from './to-dtcg'
import { defineTheme, defineTokens } from '../define'
import type { DTCGDocument } from './types'

/** Определение из примера P1.2 (палитра + ссылка + примитивы + композит + тема). */
function exampleTheme() {
  const palette = defineTokens('color', { forest: { 600: 'oklch(0.55 0.13 155)' } })
  return defineTheme({
    base: {
      color: { bg: { page: 'oklch(0.99 0 0)' }, action: { primary: palette.forest[600] } },
      space: { 4: '1rem' },
      text: { '2xl': { size: '1.5rem', lineHeight: 1.33 } },
      breakpoint: { md: '768px' },
    },
    themes: { dark: { color: { bg: { page: 'oklch(0.15 0 0)' } } } },
  })
}

describe('toDTCG — файлы пачки', () => {
  test('эмитит base + <theme> + resolver', () => {
    const { files } = toDTCG(exampleTheme())
    expect(Object.keys(files).sort()).toEqual([
      'base.tokens.json',
      'dark.tokens.json',
      'themeon.resolver.json',
    ])
  })
})

describe('toDTCG — base.tokens.json', () => {
  test('примитивы структурной формой, ссылка — curly-brace, цель ссылки включена', () => {
    const base = toDTCG(exampleTheme()).files['base.tokens.json'] as DTCGDocument
    expect(base).toEqual({
      color: {
        // порядок ключей не важен для toEqual: bg/action из sys, forest добавлен как ref-цель
        bg: { page: { $type: 'color', $value: { colorSpace: 'oklch', components: [0.99, 0, 0] } } },
        action: { primary: { $type: 'color', $value: '{color.forest.600}' } },
        forest: { 600: { $type: 'color', $value: { colorSpace: 'oklch', components: [0.55, 0.13, 155] } } },
      },
      space: { 4: { $type: 'dimension', $value: { value: 1, unit: 'rem' } } },
      text: {
        '2xl': { $type: 'typography', $value: { fontSize: { value: 1.5, unit: 'rem' }, lineHeight: 1.33 } },
      },
      breakpoint: { md: { $type: 'dimension', $value: { value: 768, unit: 'px' } } },
    })
  })
})

describe('toDTCG — <theme>.tokens.json', () => {
  test('только патченные пути, значения структурной формой', () => {
    const dark = toDTCG(exampleTheme()).files['dark.tokens.json'] as DTCGDocument
    expect(dark).toEqual({
      color: { bg: { page: { $type: 'color', $value: { colorSpace: 'oklch', components: [0.15, 0, 0] } } } },
    })
  })
})

describe('toDTCG — themeon.resolver.json', () => {
  test('схема Resolver Module 2025.10: sets/modifiers/resolutionOrder', () => {
    const resolver = toDTCG(exampleTheme()).files['themeon.resolver.json'] as DTCGDocument
    expect(resolver).toEqual({
      version: '2025.10',
      sets: { base: { sources: [{ $ref: './base.tokens.json' }] } },
      modifiers: {
        theme: {
          contexts: { light: [], dark: [{ $ref: './dark.tokens.json' }] },
          default: 'light',
        },
      },
      resolutionOrder: [{ $ref: '#/sets/base' }, { $ref: '#/modifiers/theme' }],
    })
  })

  test('resolver не эмитится при отсутствии тем (modifier требует ≥ 2 контекстов)', () => {
    const noThemes = defineTheme({ base: { space: { 4: '1rem' } } })
    const files = toDTCG(noThemes).files
    expect(files['themeon.resolver.json']).toBeUndefined()
    expect(Object.keys(files)).toEqual(['base.tokens.json'])
  })

  test('splitThemes:false — только base, без тем и resolver', () => {
    const files = toDTCG(exampleTheme(), { splitThemes: false }).files
    expect(Object.keys(files)).toEqual(['base.tokens.json'])
  })
})

describe('toDTCG — маппинг типов', () => {
  test('duration → {value,unit}, cubicBezier → массив, fontFamily-стек → массив имён', () => {
    const def = defineTheme({
      base: {
        duration: { fast: '150ms' },
        ease: { out: 'cubic-bezier(0.4, 0, 0.2, 1)' },
        font: { sans: 'Inter, sans-serif' },
        fontWeight: { bold: 700 },
        z: { modal: 100 },
      },
    })
    const base = toDTCG(def).files['base.tokens.json'] as DTCGDocument
    expect(base).toEqual({
      duration: { fast: { $type: 'duration', $value: { value: 150, unit: 'ms' } } },
      ease: { out: { $type: 'cubicBezier', $value: [0.4, 0, 0.2, 1] } },
      font: { sans: { $type: 'fontFamily', $value: ['Inter', 'sans-serif'] } },
      fontWeight: { bold: { $type: 'fontWeight', $value: 700 } },
      z: { modal: { $type: 'number', $value: 100 } },
    })
  })

  test('непарсибельные значения — legacy-строкой (calc, именованная кривая, shadow)', () => {
    const def = defineTheme({
      base: {
        space: { fluid: 'calc(1rem + 2vw)' },
        ease: { linear: 'linear' },
        shadow: { sm: '0 1px 2px rgba(0,0,0,0.1)' },
      },
    })
    const base = toDTCG(def).files['base.tokens.json'] as DTCGDocument
    expect(base).toEqual({
      space: { fluid: { $type: 'dimension', $value: 'calc(1rem + 2vw)' } },
      ease: { linear: { $type: 'cubicBezier', $value: 'linear' } },
      shadow: { sm: { $type: 'shadow', $value: '0 1px 2px rgba(0,0,0,0.1)' } },
    })
  })
})
