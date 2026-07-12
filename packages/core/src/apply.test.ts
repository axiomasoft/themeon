import { afterEach, describe, expect, test, vi } from 'vitest'
import { applyTheme, clearTheme, themeVars, type ElementLike } from './apply'
import { defineTheme, defineTokens } from './define'
import { ThemeonError } from './errors'
import { resolveTheme } from './resolve'

/**
 * Фейковый элемент: пишет вызовы `setProperty`/`removeProperty` в массивы — applier
 * тестируется без DOM-окружения (vitest environment: node), как требует ТЗ P1.6.
 */
function fakeEl(): ElementLike & { readonly set: [string, string][]; readonly removed: string[] } {
  const set: [string, string][] = []
  const removed: string[] = []
  return {
    set,
    removed,
    style: {
      setProperty(name: string, value: string): void {
        set.push([name, value])
      },
      removeProperty(name: string): string {
        removed.push(name)
        return ''
      },
    },
  }
}

/** Доступ к NODE_ENV структурно (без @types/node): модуль ядра тоже читает его через globalThis. */
function setNodeEnv(value: string | undefined): void {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process
    ?.env
  if (env === undefined) return
  if (value === undefined) delete env.NODE_ENV
  else env.NODE_ENV = value
}

/** Тот же образец, что и в serialize.test.ts: ref-ссылка, dimension, text, breakpoint, dark-патч. */
function fullTheme() {
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

describe('themeVars', () => {
  test('без темы возвращает базовый словарь resolved.vars (включая alias-пары)', () => {
    const r = resolveTheme(fullTheme(), { aliases: 'legacy-v0' })
    const vars = themeVars(r)
    // Значения совпадают с resolved.vars по содержимому...
    expect(vars).toEqual(r.vars)
    // ...и это свежая копия: мутация не задевает исходный (frozen) словарь.
    expect(vars).not.toBe(r.vars)
    vars['--injected'] = 'x'
    expect(r.vars['--injected']).toBeUndefined()
  })

  test('alias-пары присутствуют в базовом словаре', () => {
    const r = resolveTheme(fullTheme(), { aliases: 'legacy-v0' })
    const vars = themeVars(r)
    expect(vars['--bg-page']).toBe('var(--color-bg-page)')
    expect(vars['--action-primary']).toBe('var(--color-action-primary)')
  })

  test('именованная тема — только патченные переменные + alias-пары патченных целей', () => {
    const r = resolveTheme(fullTheme(), { aliases: 'legacy-v0' })
    const vars = themeVars(r, 'dark')
    expect(vars).toEqual({
      '--color-bg-page': 'oklch(0.15 0 0)',
      // цель --color-bg-page патчится темой → её легаси-алиас переобъявляется
      '--bg-page': 'var(--color-bg-page)',
    })
  })

  test('именованная тема без алиасов — только патченные переменные', () => {
    const r = resolveTheme(fullTheme())
    const vars = themeVars(r, 'dark')
    expect(vars).toEqual({ '--color-bg-page': 'oklch(0.15 0 0)' })
  })

  test('неизвестная тема → ThemeonError UNKNOWN_PATH', () => {
    const r = resolveTheme(fullTheme())
    expect(() => themeVars(r, 'sepia')).toThrowError(ThemeonError)
    try {
      themeVars(r, 'sepia')
    } catch (e) {
      expect((e as ThemeonError).code).toBe('UNKNOWN_PATH')
      expect((e as ThemeonError).message).toContain('sepia')
    }
  })
})

describe('applyTheme', () => {
  test('пишет ровно пары из словаря в порядке ключей', () => {
    const el = fakeEl()
    applyTheme(el, { '--a': '1', '--b': '2', '--c': '3' })
    expect(el.set).toEqual([
      ['--a', '1'],
      ['--b', '2'],
      ['--c', '3'],
    ])
  })

  test('применяет весь resolved.vars через themeVars', () => {
    const el = fakeEl()
    const r = resolveTheme(fullTheme(), { aliases: 'legacy-v0' })
    applyTheme(el, themeVars(r))
    const written = Object.fromEntries(el.set)
    expect(written['--color-action-primary']).toBe('var(--color-forest-600)')
    expect(written['--bg-page']).toBe('var(--color-bg-page)')
  })
})

describe('applyTheme — dev-валидация', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    setNodeEnv(undefined)
  })

  test('dev-warn на имя без "--"', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = fakeEl()
    applyTheme(el, { color: 'red' })
    expect(warn).toHaveBeenCalledTimes(1)
    // невалидная пара всё равно записана (предупреждение диагностическое, не гейт)
    expect(el.set).toEqual([['color', 'red']])
  })

  test('dev-warn на пустое значение', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = fakeEl()
    applyTheme(el, { '--x': '' })
    expect(warn).toHaveBeenCalledTimes(1)
  })

  test('dev-warn на значение с ";" или "}"', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = fakeEl()
    applyTheme(el, { '--x': 'red; }' })
    expect(warn).toHaveBeenCalled()
  })

  test('валидные пары не дают предупреждений', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = fakeEl()
    applyTheme(el, { '--x': 'red', '--y': 'var(--x)' })
    expect(warn).not.toHaveBeenCalled()
  })

  test("в NODE_ENV=production предупреждений нет", () => {
    setNodeEnv('production')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = fakeEl()
    applyTheme(el, { badname: '', '--y': ';}' })
    expect(warn).not.toHaveBeenCalled()
    // запись всё равно происходит
    expect(el.set.length).toBe(2)
  })
})

describe('clearTheme', () => {
  test('со списком имён снимает ровно эти имена в порядке списка', () => {
    const el = fakeEl()
    clearTheme(el, ['--a', '--b'])
    expect(el.removed).toEqual(['--a', '--b'])
  })

  test('с ResolvedTheme снимает все имена: база + алиасы + патчи тем, без повторов', () => {
    const el = fakeEl()
    const r = resolveTheme(fullTheme(), { aliases: 'legacy-v0' })
    clearTheme(el, r)
    // база (порядок resolved.tokens)
    expect(el.removed).toContain('--color-forest-600')
    expect(el.removed).toContain('--color-bg-page')
    expect(el.removed).toContain('--color-action-primary')
    expect(el.removed).toContain('--spacing-4')
    expect(el.removed).toContain('--text-2xl')
    expect(el.removed).toContain('--text-2xl--line-height')
    expect(el.removed).toContain('--breakpoint-md')
    // алиасы
    expect(el.removed).toContain('--bg-page')
    expect(el.removed).toContain('--action-primary')
    // патч dark (--color-bg-page уже в базе) — без повторов
    expect(el.removed.filter((n) => n === '--color-bg-page').length).toBe(1)
  })
})
