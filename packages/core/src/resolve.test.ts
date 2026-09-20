import { describe, expect, test } from 'vitest'
import { defineTheme, defineTokens } from './define'
import { GRAPH_MAX_DEPTH } from './graph/build'
import { resolveTheme } from './resolve'
import { ThemeonError } from './errors'
import { TOKEN_BRAND } from './types'
import type { ThemeDefinition, Token, TokenType } from './types'

/**
 * Общий образец темы из Code Guidance P1.2/P1.4 (продолжение примера define):
 * палитра forest.600 + sys с ref-ссылкой, dimension, композитным text и патчем dark.
 */
function sampleTheme() {
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

describe('resolveTheme — пример вход→выход (P1.4 Code Guidance)', () => {
  test('refLayer referenced: порядок токенов, var-chain, companion, тема', () => {
    const r = resolveTheme(sampleTheme(), { refLayer: 'referenced' })

    // ref-токен идёт первым, затем sys в каноническом identity-порядке (P1.3).
    expect(r.tokens.map((t) => t.varName)).toEqual([
      '--color-forest-600',
      '--color-action-primary',
      '--color-bg-page',
      '--spacing-4',
      '--text-2xl',
      '--text-2xl--line-height',
    ])

    // цель ссылки эмитится как самостоятельная переменная со своим значением
    expect(r.tokens[0]).toEqual({
      path: ['color', 'forest', '600'],
      varName: '--color-forest-600',
      type: 'color',
      value: 'oklch(0.55 0.13 155)',
    })
    // sys-ссылка: value схлопнут до финального, ref указывает на непосредственную цель
    expect(r.tokens[1]).toEqual({
      path: ['color', 'action', 'primary'],
      varName: '--color-action-primary',
      type: 'color',
      value: 'oklch(0.55 0.13 155)',
      ref: '--color-forest-600',
    })
    // text-композит: size + double-dash companion line-height (число → строка)
    expect(r.tokens[4]).toMatchObject({ varName: '--text-2xl', value: '1.5rem' })
    expect(r.tokens[5]).toMatchObject({ varName: '--text-2xl--line-height', value: '1.33' })

    // var-chain уходит в vars (паритет build/runtime по построению)
    expect(r.vars['--color-action-primary']).toBe('var(--color-forest-600)')
    expect(r.vars['--color-forest-600']).toBe('oklch(0.55 0.13 155)')

    // блок темы содержит только патченную переменную, финальным значением
    expect(r.themes.dark).toEqual([
      {
        path: ['color', 'bg', 'page'],
        varName: '--color-bg-page',
        type: 'color',
        value: 'oklch(0.15 0 0)',
      },
    ])

    // schemes проброшены из defineTheme (конвенция dark → 'dark')
    expect(r.schemes).toEqual({ dark: 'dark' })
  })

  test('refLayer inline: ссылка инлайнится, ref-переменная не эмитится', () => {
    const r = resolveTheme(sampleTheme(), { refLayer: 'inline' })
    expect(r.vars['--color-action-primary']).toBe('oklch(0.55 0.13 155)')
    expect(r.vars['--color-forest-600']).toBeUndefined()
    expect(r.tokens.map((t) => t.varName)).not.toContain('--color-forest-600')
    // ResolvedToken.ref в inline не проставляется
    expect(r.tokens.find((t) => t.varName === '--color-action-primary')?.ref).toBeUndefined()
  })
})

describe('resolveTheme — refLayer referenced vs all на цепочке из 2 звеньев', () => {
  function chained() {
    const base = defineTokens('color', { neutral: { 900: '#111' } })
    const mid = defineTokens('color', { ink: { strong: base.neutral[900] } })
    // sys.color.text.body → ink.strong → neutral.900 → '#111'
    return defineTheme({ base: { color: { text: { body: mid.ink.strong } } } })
  }

  test("referenced: только непосредственная цель — переменная, глубже цепочка схлопнута", () => {
    const r = resolveTheme(chained(), { refLayer: 'referenced' })
    expect(r.vars['--color-ink-strong']).toBe('#111') // ink.strong схлопнут (neutral не эмитится)
    expect(r.vars['--color-neutral-900']).toBeUndefined()
    expect(r.vars['--color-text-body']).toBe('var(--color-ink-strong)')
  })

  test('all: каждое звено цепочки — своя переменная, var-chain сохранён целиком', () => {
    const r = resolveTheme(chained(), { refLayer: 'all' })
    expect(r.vars['--color-ink-strong']).toBe('var(--color-neutral-900)')
    expect(r.vars['--color-neutral-900']).toBe('#111')
    expect(r.vars['--color-text-body']).toBe('var(--color-ink-strong)')
    // порядок: ref-звенья в порядке цепочки, затем sys
    expect(r.tokens.map((t) => t.varName)).toEqual([
      '--color-ink-strong',
      '--color-neutral-900',
      '--color-text-body',
    ])
  })
})

describe('resolveTheme — циклы', () => {
  /** Собирает мутабельный «сырой» Token (публичный API цикл создать не даёт — все Token заморожены). */
  function rawToken(path: string[]): { [TOKEN_BRAND]: true; type: TokenType; path: string[]; value: unknown } {
    return { [TOKEN_BRAND]: true, type: 'color', path, value: null }
  }
  function defWith(sysColor: Record<string, unknown>): ThemeDefinition {
    return { sys: { color: sysColor }, themes: {}, schemes: {} } as unknown as ThemeDefinition
  }

  test('цикл из 2 звеньев печатает всю цепочку путей', () => {
    const a = rawToken(['color', 'a'])
    const b = rawToken(['color', 'b'])
    a.value = b
    b.value = a
    try {
      resolveTheme(defWith({ a: a as unknown as Token, b: b as unknown as Token }))
      throw new Error('ожидался ThemeonError CYCLE')
    } catch (e) {
      expect(e).toBeInstanceOf(ThemeonError)
      expect((e as ThemeonError).code).toBe('CYCLE')
      expect((e as ThemeonError).message).toBe('Circular token reference: color.a → color.b → color.a')
    }
  })

  test('цикл из 3 звеньев', () => {
    const a = rawToken(['color', 'a'])
    const b = rawToken(['color', 'b'])
    const c = rawToken(['color', 'c'])
    a.value = b
    b.value = c
    c.value = a
    expect(() =>
      resolveTheme(defWith({ a: a as unknown as Token, b: b as unknown as Token, c: c as unknown as Token })),
    ).toThrow('Circular token reference: color.a → color.b → color.c → color.a')
  })
})

describe('resolveTheme — валидация значений', () => {
  test('BAD_VALUE: dimension-группа с голым числом', () => {
    const bad = defineTheme({ base: { space: { 4: 16 as unknown as string } } })
    try {
      resolveTheme(bad)
      throw new Error('ожидался ThemeonError BAD_VALUE')
    } catch (e) {
      expect(e).toBeInstanceOf(ThemeonError)
      expect((e as ThemeonError).code).toBe('BAD_VALUE')
      expect((e as ThemeonError).message).toContain("space.4")
    }
  })

  test('число в z/leading/fontWeight — валидно, сериализуется строкой', () => {
    const t = defineTheme({ base: { z: { modal: 1000 }, fontWeight: { bold: 700 } } })
    const r = resolveTheme(t)
    expect(r.vars['--z-modal']).toBe('1000')
    expect(r.vars['--font-weight-bold']).toBe('700')
  })
})

describe('resolveTheme — коллизии имён', () => {
  test('NAME_COLLISION: два пути дают одно имя переменной', () => {
    const t = defineTheme({ base: { color: { bgBase: '#fff', bg: { base: '#000' } } } })
    try {
      resolveTheme(t)
      throw new Error('ожидался ThemeonError NAME_COLLISION')
    } catch (e) {
      expect(e).toBeInstanceOf(ThemeonError)
      expect((e as ThemeonError).code).toBe('NAME_COLLISION')
      expect((e as ThemeonError).message).toContain('--color-bg-base')
      // оба конфликтующих пути присутствуют в сообщении
      expect((e as ThemeonError).message).toContain('color.bgBase')
      expect((e as ThemeonError).message).toContain('color.bg.base')
    }
  })
})

describe('resolveTheme — легаси-алиасы', () => {
  test('legacy-v0: color-роль даёт alias без префикса color- и var(target)', () => {
    const t = defineTheme({ base: { color: { primary: '#00f', bg: { page: '#fff' } } } })
    const r = resolveTheme(t, { aliases: 'legacy-v0' })
    expect(r.aliases).toContainEqual({ alias: '--primary', target: '--color-primary' })
    expect(r.aliases).toContainEqual({ alias: '--bg-page', target: '--color-bg-page' })
    expect(r.vars['--primary']).toBe('var(--color-primary)')
    expect(r.vars['--bg-page']).toBe('var(--color-bg-page)')
  })

  test('своя функция-правило вместо пресета', () => {
    const t = defineTheme({ base: { space: { 4: '1rem' } } })
    const r = resolveTheme(t, { aliases: (p) => (p[0] === 'space' ? ('--gap-' + p[1]) as `--${string}` : null) })
    expect(r.aliases).toContainEqual({ alias: '--gap-4', target: '--spacing-4' })
  })

  test('ref-палитра не алиасится (только базовые sys-токены)', () => {
    const palette = defineTokens('color', { forest: { 600: '#0a0' } })
    const t = defineTheme({ base: { color: { primary: palette.forest[600] } } })
    const r = resolveTheme(t, { aliases: 'legacy-v0' })
    // forest.600 — ref-цель, а не sys-роль: алиаса '--forest-600' быть не должно
    expect(r.aliases.map((a) => a.alias)).not.toContain('--forest-600')
    expect(r.aliases).toContainEqual({ alias: '--primary', target: '--color-primary' })
  })
})

describe('resolveTheme — breakpoints', () => {
  test('px парсится в число, не-px единица → px: null', () => {
    const t = defineTheme({ base: { breakpoint: { md: '768px', lg: '48rem' } } })
    const r = resolveTheme(t)
    expect(r.breakpoints).toEqual({
      md: { value: '768px', px: 768 },
      lg: { value: '48rem', px: null },
    })
    // breakpoint также эмитится обычной переменной
    expect(r.vars['--breakpoint-md']).toBe('768px')
  })
})

describe('resolveTheme — темы со ссылками', () => {
  test('патч темы может ссылаться на ref-Token; значение схлопывается инлайном', () => {
    const palette = defineTokens('color', { neutral: { 900: '#111' } })
    const theme = defineTheme({
      base: { color: { bg: { page: '#fff' } } },
      themes: { dark: { color: { bg: { page: palette.neutral[900] } } } },
    })
    const r = resolveTheme(theme)
    expect(r.themes.dark).toContainEqual({
      path: ['color', 'bg', 'page'],
      varName: '--color-bg-page',
      type: 'color',
      value: '#111',
    })
  })
})

describe('resolveTheme — детерминизм', () => {
  test('два вызова на одной теме дают идентичный результат', () => {
    const t = sampleTheme()
    expect(resolveTheme(t)).toEqual(resolveTheme(t))
  })
})

describe('resolveTheme — policy errors', () => {
  test('ref chain deeper than GRAPH_MAX_DEPTH throws CYCLE with depth message', () => {
    let ref: Token = defineTokens('color', { leaf: '#000' }).leaf
    for (let i = 0; i < GRAPH_MAX_DEPTH + 1; i++) {
      const palette = defineTokens('color', { [`n${i}`]: ref } as Record<string, Token>)
      ref = Object.values(palette)[0]!
    }
    const theme = defineTheme({ base: { color: { deep: ref } } })
    expect(() => resolveTheme(theme)).toThrow(/GRAPH_MAX_DEPTH/)
  })
})
