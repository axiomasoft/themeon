import { describe, expect, test } from 'vitest'
import {
  assertSafeAttributeValue,
  assertSafeCustomPropertyName,
  assertSafeDeclarationValue,
} from './css-safety'
import { defineTheme } from './define'
import { fromDTCG } from './dtcg/from-dtcg'
import { ThemeonError } from './errors'
import { resolveTheme } from './resolve'
import { serializeThemeCss } from './serialize'

function codeOf(fn: () => unknown): string | undefined {
  try {
    fn()
  } catch (e) {
    return e instanceof ThemeonError ? e.code : 'NOT_THEMEON_ERROR'
  }
  return undefined
}

describe('assertSafeDeclarationValue', () => {
  test.each([
    'oklch(0.55 0.13 155)',
    'oklch(0.5 0.1 120 / 50%)',
    '"Inter", system-ui, sans-serif',
    "'Font; With Semicolon', serif",
    'url("data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22/>")',
    'url(data:image/png;base64,AAAA)',
    'linear-gradient(90deg, var(--color-a) 0%, color-mix(in oklch, red 20%, blue) 100%)',
    '0 1px 2px rgb(0 0 0 / 0.1), inset 0 0 0 1px #fff',
    'cubic-bezier(0.4, 0, 0.2, 1)',
    '"\\201C"',
    'calc(100% - var(--space-4))',
    '',
    'red !important',
  ])('allows legitimate value %j', (value) => {
    expect(() => assertSafeDeclarationValue(value, 'v')).not.toThrow()
  })

  test.each([
    ['top-level semicolon', 'red; } body { background: url(//evil) } :root { --z: 1'],
    ['bare semicolon', 'red;color:blue'],
    ['closing brace', 'red }'],
    ['opening brace', 'a{b'],
    ['comment opener', 'red /* swallow the rest'],
    ['unterminated string', '"abc'],
    ['unbalanced paren', 'calc(1px'],
    ['stray closer', '1px) and (min-width: 0'],
    ['mismatched closer', 'a(b]'],
    ['dangling escape', 'red\\'],
    ['newline', 'red\n}'],
    ['html end tag', 'red</style><script>alert(1)</script>'],
    ['html comment', '<!--'],
  ])('rejects %s', (_label, value) => {
    expect(codeOf(() => assertSafeDeclarationValue(value, 'v'))).toBe('UNSAFE_CSS_TOKEN')
  })

  test('error message truncates huge payloads', () => {
    try {
      assertSafeDeclarationValue(`${'a'.repeat(500)};`, 'v')
      expect.unreachable()
    } catch (e) {
      expect((e as Error).message.length).toBeLessThan(250)
    }
  })
})

describe('assertSafeCustomPropertyName', () => {
  test.each(['--color-bg-page', '--text-2xl--line-height', '--color-фон', '--_private'])(
    'allows %s',
    (name) => expect(() => assertSafeCustomPropertyName(name, 'n')).not.toThrow(),
  )
  test.each(['--color-x;}*{a', '--a b', '-single', '--', '--a:b', '--a"b'])('rejects %j', (name) => {
    expect(codeOf(() => assertSafeCustomPropertyName(name, 'n'))).toBe('UNSAFE_CSS_TOKEN')
  })
})

describe('assertSafeAttributeValue', () => {
  test('allows ordinary theme names', () => {
    for (const name of ['dark', 'high-contrast', 'tenant_42', 'тёмная']) {
      expect(() => assertSafeAttributeValue(name, 't')).not.toThrow()
    }
  })
  test.each(['d"],*[y="', 'a\\', 'x{', 'a\nb'])('rejects %j', (name) => {
    expect(codeOf(() => assertSafeAttributeValue(name, 't'))).toBe('UNSAFE_CSS_TOKEN')
  })
})

describe('resolveTheme is the choke point for every emitter', () => {
  test('DTCG import with an injected value fails before any CSS is produced', () => {
    const doc = {
      color: {
        $type: 'color',
        ok: { $value: 'red; } body { background: url(https://evil.example/x) } :root { --z: 1' },
      },
    }
    const { definition: theme } = fromDTCG(doc)
    expect(codeOf(() => resolveTheme(theme))).toBe('UNSAFE_CSS_TOKEN')
  })

  test('DTCG import with an injected key fails (key becomes the variable name)', () => {
    const { definition: theme } = fromDTCG({ color: { $type: 'color', 'x;}*{a': { $value: '#fff' } } })
    expect(codeOf(() => resolveTheme(theme))).toBe('UNSAFE_CSS_TOKEN')
  })

  test('theme name cannot break out of the [data-theme="…"] selector', () => {
    const def = defineTheme({
      base: { color: { a: 'red' } },
      themes: { 'd"],*[y="': { color: { a: 'blue' } } },
    })
    expect(codeOf(() => resolveTheme(def))).toBe('UNSAFE_CSS_TOKEN')
  })

  test('error names the offending token path', () => {
    const def = defineTheme({ base: { color: { brand: 'red; x: y' } } })
    expect(() => resolveTheme(def)).toThrow(/token 'color\.brand'/)
  })

  test('legitimate themes are unaffected', () => {
    const def = defineTheme({
      base: {
        color: { bg: 'oklch(0.99 0 0)' },
        font: { body: '"Inter", system-ui, sans-serif' },
        gradient: { hero: 'url("data:image/svg+xml;utf8,<svg/>")' },
      },
      themes: { dark: { color: { bg: 'oklch(0.15 0 0)' } } },
    })
    expect(serializeThemeCss(resolveTheme(def))).toContain('--gradient-hero: url("data:image/svg+xml;utf8,<svg/>");')
  })
})
