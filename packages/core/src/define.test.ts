import { afterEach, describe, expect, test, vi } from 'vitest'
import { defineTheme, defineTokens } from './define'
import { ThemeonError } from './errors'
import { isToken } from './types'
import { isLeaf, walkTree } from './internal/walk'
import type { Token } from './types'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('defineTokens — оборачивание, пути, freeze', () => {
  test('лист становится замороженным Token с полным путём от группы', () => {
    const palette = defineTokens('color', { forest: { 600: 'oklch(0.55 0.13 155)' } })
    const tok = palette.forest[600] as Token

    expect(isToken(tok)).toBe(true)
    expect(tok.type).toBe('color')
    expect(tok.path).toEqual(['color', 'forest', '600'])
    expect(tok.value).toBe('oklch(0.55 0.13 155)')
    expect(Object.isFrozen(tok)).toBe(true)
    // и промежуточная подгруппа, и корень дерева заморожены
    expect(Object.isFrozen(palette)).toBe(true)
    expect(Object.isFrozen(palette.forest)).toBe(true)
  })

  test('ссылка Token-в-Token: значение нового токена — исходный Token', () => {
    const palette = defineTokens('color', { forest: { 600: 'oklch(0.55 0.13 155)' } })
    const sys = defineTokens('color', { action: { primary: palette.forest[600] } })
    const ref = sys.action.primary as Token

    expect(ref.path).toEqual(['color', 'action', 'primary'])
    expect(isToken(ref.value)).toBe(true)
    expect((ref.value as Token).path).toEqual(['color', 'forest', '600'])
    // тип берётся у группы 'color', а не переоборачивается
    expect(ref.type).toBe('color')
  })

  test('путь с сегментом __proto__/constructor/prototype — ThemeonError UNSAFE_PATH, дерево не портится (final-audit H2)', () => {
    const dangerous = JSON.parse('{"__proto__":{"x":"#fff"},"primary":"#00f"}') as unknown as Parameters<typeof defineTokens>[1]

    expect(() => defineTokens('color', dangerous)).toThrow(ThemeonError)
    try {
      defineTokens('color', dangerous)
    } catch (err) {
      expect((err as ThemeonError).code).toBe('UNSAFE_PATH')
    }

    // соседний легитимный лист не должен был превратиться в прототип группы у ДРУГИХ вызовов
    const clean = defineTokens('color', { primary: '#00f' })
    expect(Object.getPrototypeOf(clean)).toBe(Object.prototype)
    expect((clean as Record<string, unknown>).x).toBeUndefined()

    expect(() => defineTokens('color', { constructor: { x: '#fff' }, primary: '#00f' })).toThrow(ThemeonError)
    expect(() => defineTokens('color', { prototype: { x: '#fff' }, primary: '#00f' })).toThrow(ThemeonError)
  })

  test('TextStyleValue — один лист типа text (в подгруппу size/lineHeight не спускаемся)', () => {
    const text = defineTokens('text', { '2xl': { size: '1.5rem', lineHeight: 1.33 } })
    const tok = text['2xl'] as Token

    expect(tok.type).toBe('text')
    expect(tok.path).toEqual(['text', '2xl'])
    expect(tok.value).toEqual({ size: '1.5rem', lineHeight: 1.33 })
    expect(Object.isFrozen(tok.value)).toBe(true)
  })
})

describe('defineTokens — инференс типа для неизвестной группы (все ветки)', () => {
  test('TextStyleValue → text', () => {
    const t = defineTokens('custom', { a: { size: '1rem' } })
    expect((t.a as Token).type).toBe('text')
  })

  test('number → number', () => {
    const t = defineTokens('custom', { a: 7 })
    expect((t.a as Token).type).toBe('number')
  })

  test('строка-цвет → color', () => {
    const t = defineTokens('custom', { a: '#fff', b: 'oklch(0.5 0 0)', c: 'rgb(0 0 0)' })
    expect((t.a as Token).type).toBe('color')
    expect((t.b as Token).type).toBe('color')
    expect((t.c as Token).type).toBe('color')
  })

  test('строка с единицей длины → dimension', () => {
    const t = defineTokens('custom', { a: '16px', b: '1.5rem', c: '50%' })
    expect((t.a as Token).type).toBe('dimension')
    expect((t.b as Token).type).toBe('dimension')
    expect((t.c as Token).type).toBe('dimension')
  })

  test('строка с единицей времени → duration', () => {
    const t = defineTokens('custom', { a: '200ms', b: '2s' })
    expect((t.a as Token).type).toBe('duration')
    expect((t.b as Token).type).toBe('duration')
  })

  test('ссылка в неизвестной группе наследует тип цели', () => {
    const palette = defineTokens('color', { forest: { 600: '#0a0' } })
    const t = defineTokens('custom', { a: palette.forest[600] })
    expect((t.a as Token).type).toBe('color')
  })

  test('неопознаваемая строка → dimension + dev-warn', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const t = defineTokens('custom', { a: 'whatever' })

    expect((t.a as Token).type).toBe('dimension')
    expect(warn).toHaveBeenCalledOnce()
    expect(warn.mock.calls[0]?.[0]).toContain('custom.a')
  })

  test('известная группа не анализирует значение и не варнит', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    // 'whatever' в space — известная группа → dimension без разбора значения
    const t = defineTokens('space', { a: 'whatever' })
    expect((t.a as Token).type).toBe('dimension')
    expect(warn).not.toHaveBeenCalled()
  })
})

describe('defineTheme', () => {
  test('пример вход→выход из ТЗ: sys обёрнут, ссылка сохранена, schemes.dark выведен', () => {
    const palette = defineTokens('color', { forest: { 600: 'oklch(0.55 0.13 155)' } })
    const theme = defineTheme({
      base: {
        color: { bg: { page: 'oklch(0.99 0 0)' }, action: { primary: palette.forest[600] } },
        space: { 4: '1rem' },
        text: { '2xl': { size: '1.5rem', lineHeight: 1.33 } },
      },
      themes: { dark: { color: { bg: { page: 'oklch(0.15 0 0)' } } } },
    })

    const primary = theme.sys.color.action.primary as Token
    expect(primary.path).toEqual(['color', 'action', 'primary'])
    expect(isToken(primary.value)).toBe(true)
    expect((primary.value as Token).path).toEqual(['color', 'forest', '600'])

    const space4 = theme.sys.space[4] as Token
    expect(space4.type).toBe('dimension')
    expect(space4.value).toBe('1rem')

    expect(theme.schemes).toEqual({ dark: 'dark' })
    // патчи хранятся сырыми (резолюция — P1.4)
    expect(theme.themes.dark).toEqual({ color: { bg: { page: 'oklch(0.15 0 0)' } } })
    expect(Object.isFrozen(theme)).toBe(true)
  })

  test('патч на несуществующий путь → ThemeonError UNKNOWN_PATH с точным путём', () => {
    // Невалидный ключ типы ловят на компиляции — рантайм-гейт нужен для обойдённых
    // типов (динамический вход, напр. из fromDTCG в P1.7); эмулируем приведением.
    const build = () =>
      defineTheme({
        base: { color: { bg: { page: '#fff' } } },
        themes: { dark: { color: { TYPO: '#000' } } } as unknown as Record<string, never>,
      })

    expect(build).toThrow(ThemeonError)
    try {
      build()
    } catch (e) {
      const err = e as ThemeonError
      expect(err.code).toBe('UNKNOWN_PATH')
      expect(err.message).toContain('color.TYPO')
      expect(err.message).toContain('"dark"')
      expect(err.message).toContain('TYPO')
    }
  })

  test('патч по валидному пути проходит', () => {
    expect(() =>
      defineTheme({
        base: { color: { bg: { page: '#fff' } } },
        themes: { dark: { color: { bg: { page: '#000' } } } },
      }),
    ).not.toThrow()
  })

  test('schemes-конвенция: явное переопределение dark не затирается', () => {
    const theme = defineTheme({
      base: { color: { bg: { page: '#fff' } } },
      themes: {
        dark: { color: { bg: { page: '#000' } } },
        hc: { color: { bg: { page: '#111' } } },
      },
      schemes: { dark: 'light', hc: 'dark' },
    })
    // dark переопределён на light пользователем — конвенция не перебивает
    expect(theme.schemes).toEqual({ dark: 'light', hc: 'dark' })
  })

  test('без темы dark — schemes пуст', () => {
    const theme = defineTheme({
      base: { color: { bg: { page: '#fff' } } },
      themes: { hc: { color: { bg: { page: '#111' } } } },
    })
    expect(theme.schemes).toEqual({})
  })
})

describe('walkTree / isLeaf — единственный обход', () => {
  test('walkTree детерминирован: два прохода дают идентичные пути', () => {
    const tree = { color: { bg: { page: '#fff' }, fg: '#000' }, space: { 4: '1rem' } }
    const paths1 = [...walkTree(tree)].map((e) => e.path.join('.'))
    const paths2 = [...walkTree(tree)].map((e) => e.path.join('.'))
    expect(paths1).toEqual(paths2)
    expect(paths1).toEqual(['color.bg.page', 'color.fg', 'space.4'])
  })

  test('TextStyleValue — лист, а не группа (в size/lineHeight не спускаемся)', () => {
    const entries = [...walkTree({ '2xl': { size: '1.5rem', lineHeight: 1.33 } })]
    expect(entries).toHaveLength(1)
    expect(entries[0]?.path).toEqual(['2xl'])
    expect(entries[0]?.value).toEqual({ size: '1.5rem', lineHeight: 1.33 })
  })

  test('isLeaf: примитивы и Token — листья; обычный объект — нет', () => {
    const palette = defineTokens('color', { forest: { 600: '#0a0' } })
    expect(isLeaf('#fff')).toBe(true)
    expect(isLeaf(42)).toBe(true)
    expect(isLeaf({ size: '1rem' })).toBe(true)
    expect(isLeaf(palette.forest[600])).toBe(true)
    expect(isLeaf({ page: '#fff' })).toBe(false)
  })
})
