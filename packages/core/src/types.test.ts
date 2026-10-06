import { describe, expect, expectTypeOf, test } from 'vitest'
import { themeVars } from './apply'
import { defineTheme, defineTokens } from './define'
import { ThemeonError } from './errors'
import { resolveTheme } from './resolve'
import { TOKEN_BRAND, isToken } from './types'
import type { ResolvedTheme, SysPatch, ThemeDefinition, Token, Tokenized, WellKnownSys } from './types'

describe('Tokenized<T>', () => {
  test('оборачивает листья в Token, сохраняя форму дерева', () => {
    expectTypeOf<Tokenized<{ a: { b: string } }>>().toEqualTypeOf<{
      readonly a: { readonly b: Token }
    }>()
  })
})

describe('Token — бренд недоступен снаружи модуля', () => {
  test('обычный литерал без бренда не присваивается Token', () => {
    // @ts-expect-error — без бренд-символа (не экспортируется из index.ts) объект не Token
    const fake: Token = { type: 'color', path: ['color', 'x'], value: '#fff' }
    void fake
  })
})

describe('SysPatch<T>', () => {
  test('принимает частичный патч по существующим ключам well-known группы', () => {
    const patch: SysPatch<WellKnownSys> = {
      color: { bg: { page: '#000' } },
      space: { 4: '1rem' },
    }
    expect(patch).toBeDefined()
  })

  test('неизвестный ключ well-known группы — ошибка типов', () => {
    // @ts-expect-error — 'TYPO' не входит в WellKnownSys
    const patch: SysPatch<WellKnownSys> = { TYPO: '#fff' }
    void patch
  })
})

describe('isToken', () => {
  test('отклоняет примитивы и null/undefined', () => {
    expect(isToken(null)).toBe(false)
    expect(isToken(undefined)).toBe(false)
    expect(isToken('string')).toBe(false)
    expect(isToken(42)).toBe(false)
  })

  test('отклоняет структурно похожий объект без бренда', () => {
    const lookalike = { type: 'color', path: ['color', 'x'], value: '#fff' }
    expect(isToken(lookalike)).toBe(false)
  })

  test('распознаёт настоящий Token по бренд-символу', () => {
    // Реальные Token собирает defineTokens (P1.2); здесь — колоцированная сборка
    // напрямую через TOKEN_BRAND (доступен внутри пакета, не экспортируется из index.ts).
    const real: Token = Object.freeze({
      [TOKEN_BRAND]: true as const,
      type: 'color' as const,
      path: ['color', 'x'],
      value: '#fff',
    })
    expect(isToken(real)).toBe(true)
  })
})

describe('точные типы токенов (группа → TokenType)', () => {
  test('well-known группа навязывает тип листьям defineTokens', () => {
    const palette = defineTokens('color', { forest: { 600: 'oklch(0.55 0.13 155)' } })
    expectTypeOf(palette.forest[600]).toEqualTypeOf<Token<'color'>>()
    const space = defineTokens('space', { 4: '1rem' })
    expectTypeOf(space[4]).toEqualTypeOf<Token<'dimension'>>()
  })

  test('неизвестная группа: ссылка наследует тип цели, number/text выводятся, строка — весь union', () => {
    const palette = defineTokens('color', { a: '#fff' })
    const custom = defineTokens('brand', { ref: palette.a, n: 2, t: { size: '1rem' }, s: 'x' })
    expectTypeOf(custom.ref).toEqualTypeOf<Token<'color'>>()
    expectTypeOf(custom.n).toEqualTypeOf<Token<'number'>>()
    expectTypeOf(custom.t).toEqualTypeOf<Token<'text'>>()
    expectTypeOf(custom.s).toEqualTypeOf<Token>()
  })

  test('рантайм совпадает со статикой', () => {
    const palette = defineTokens('color', { a: '#fff' })
    const custom = defineTokens('brand', { ref: palette.a, n: 2, t: { size: '1rem' } })
    expect([custom.ref.type, custom.n.type, custom.t.type]).toEqual(['color', 'number', 'text'])
  })

  test('динамическая группа может навязать тип независимо от значения листа', () => {
    const group: string = 'color'
    const tree = defineTokens(group, { a: 2 })
    expectTypeOf(tree.a).toEqualTypeOf<Token>()
    expect(tree.a.type).toBe('color')
  })

  test('defineTheme: sys-группы типизированы, ссылка в well-known группе получает тип группы', () => {
    const palette = defineTokens('color', { forest: { 600: '#0a0' } })
    const theme = defineTheme({
      base: {
        color: { action: { primary: palette.forest[600] } },
        space: { 4: '1rem' },
        text: { body: { size: '1rem', lineHeight: 1.5 } },
      },
    })
    expectTypeOf(theme.sys.color.action.primary).toEqualTypeOf<Token<'color'>>()
    expectTypeOf(theme.sys.space[4]).toEqualTypeOf<Token<'dimension'>>()
    expectTypeOf(theme.sys.text.body).toEqualTypeOf<Token<'text'>>()
    expect(theme.sys.space[4].type).toBe('dimension')
  })

  test('уточнённые типы остаются совместимы с широкими контрактами', () => {
    const theme = defineTheme({ base: { color: { bg: '#fff' } } })
    expectTypeOf(theme).toExtend<ThemeDefinition>()
    expectTypeOf<Token<'color'>>().toExtend<Token>()
    expectTypeOf<Token>().not.toExtend<Token<'color'>>()
  })

  test('existing explicit tree generic remains the first parameter', () => {
    const palette = defineTokens<{ brand: string }>('color', { brand: '#fff' })
    expectTypeOf(palette.brand).toEqualTypeOf<Token>()
    expect(palette.brand.type).toBe('color')
  })
})

describe('типизированные имена тем (defineTheme → resolveTheme → themeVars)', () => {
  const base = { color: { bg: '#fff' } }

  test('имена тем выводятся из ключей `themes`', () => {
    const def = defineTheme({ base, themes: { dark: { color: { bg: '#000' } }, hc: {} } })
    expectTypeOf<keyof typeof def.themes>().toEqualTypeOf<'dark' | 'hc'>()
    const resolved = resolveTheme(def)
    expectTypeOf(resolved).toEqualTypeOf<ResolvedTheme<'dark' | 'hc'>>()
    expectTypeOf(themeVars<'dark' | 'hc'>).parameter(1).toEqualTypeOf<'dark' | 'hc' | undefined>()
  })

  test('без `themes` набор пуст (never), а не произвольная строка', () => {
    const def = defineTheme({ base })
    expectTypeOf<keyof typeof def.themes>().toEqualTypeOf<never>()
  })

  test('schemes: ключи ⊆ объявленные темы ∪ base; опечатка — ошибка', () => {
    defineTheme({ base, themes: { dark: {} }, schemes: { base: 'light', dark: 'dark' } })
    // @ts-expect-error — 'drak' не объявлена в themes
    defineTheme({ base, themes: { dark: {} }, schemes: { drak: 'dark' } })
    // @ts-expect-error — without named themes, only 'base' has a scheme
    defineTheme({ base, schemes: { drak: 'dark' } })
  })

  test('контекстная типизация патча сохраняется: неизвестный ключ — ошибка', () => {
    expect(() =>
      // @ts-expect-error — 'TYPO' нет в base.color
      defineTheme({ base, themes: { dark: { color: { TYPO: '#000' } } } }),
    ).toThrow(ThemeonError)
  })

  test('точные типы совместимы с широкими контрактами адаптеров', () => {
    const def = defineTheme({ base, themes: { dark: {} } })
    expectTypeOf(def).toExtend<ThemeDefinition>()
    expectTypeOf(resolveTheme(def)).toExtend<ResolvedTheme>()
  })

  test('existing explicit sys generic keeps named patches accessible', () => {
    const def = defineTheme<{ color: { bg: string } }>({ base, themes: { dark: { color: { bg: '#000' } } } })
    expectTypeOf<keyof typeof def.themes>().toEqualTypeOf<string>()
    const resolved = resolveTheme(def)
    expectTypeOf(resolved).toEqualTypeOf<ResolvedTheme>()
    expect(themeVars(resolved, 'dark')['--color-bg']).toBe('#000')
  })
})
