import type { CssVarName, ResolvedTheme, ResolvedToken } from '@themeon/core'
import { describe, expect, test } from 'vitest'
import { tailwindBridge } from './bridge'

/**
 * `tailwindBridge` — чистая функция над `ResolvedTheme` (данными, не API-контрактом
 * `defineTheme`), поэтому фикстура строится напрямую как объект резолвера, а не через
 * `defineTheme`+`resolveTheme`. Это единственный способ смоделировать `resolved.themes[*]`
 * с var-именем, отсутствующим в `resolved.tokens` (Rule 4 ТЗ) — `defineTheme` runtime-
 * валидирует патчи строго как подмножество base (D3) и такую фикстуру своим API не
 * построить.
 */
function tok(varName: CssVarName, value: string): ResolvedToken {
  return { path: varName.slice(2).split('-'), varName, type: 'color', value }
}

function buildResolved(
  tokens: readonly ResolvedToken[],
  themes: Readonly<Record<string, readonly ResolvedToken[]>> = {},
): ResolvedTheme {
  return {
    tokens,
    themes,
    aliases: [],
    breakpoints: {},
    vars: Object.fromEntries(tokens.map((t) => [t.varName, t.value])),
    schemes: {},
  }
}

/**
 * Фикстура покрывает: Tailwind-namespace'ы (color/spacing/font-weight/font), ThemeOn-
 * расширения вне Tailwind-набора (gradient/z/duration), double-dash line-height companion
 * (`--text-2xl` + `--text-2xl--line-height`, P1.3 — оба должны попасть в бридж, R-11 §3)
 * и var, введённый только темой `hc`.
 */
function fixtureResolved(): ResolvedTheme {
  const base: ResolvedToken[] = [
    tok('--color-action-primary', 'oklch(0.55 0.15 155)'),
    tok('--spacing-md', '1rem'),
    tok('--font-weight-bold', '700'),
    tok('--font-sans', 'Inter, sans-serif'),
    tok('--text-2xl', '1.5rem'),
    tok('--text-2xl--line-height', '1.33'),
    tok('--breakpoint-md', '48rem'),
    tok('--shadow-md', '0 2px 8px oklch(0 0 0 / 0.15)'),
    tok('--gradient-brand', 'linear-gradient(135deg, red, blue)'),
    tok('--z-modal', '100'),
    tok('--duration-fast', '150ms'),
  ]
  return buildResolved(base, {
    dark: [tok('--color-action-primary', 'oklch(0.65 0.15 155)')],
    // Тема вводит var, которого нет в base.tokens (Rule 4) — конструктивно возможно в
    // произвольном ResolvedTheme, даже если `defineTheme` API такого не допускает.
    hc: [tok('--color-action-primary-focus', 'oklch(0.4 0.2 30)')],
  })
}

describe('tailwindBridge', () => {
  test('блок — `@theme reference`, не `inline`/plain/`static` (P-D54, supersedes P-D31)', () => {
    const out = tailwindBridge(fixtureResolved())
    expect(out).toContain('@theme reference {')
    expect(out).not.toContain('@theme inline')
    expect(out).not.toContain('@theme static')
  })

  test('значения — литералы резолва, а не self-referential `var()` (кроме shadow)', () => {
    const out = tailwindBridge(fixtureResolved())
    expect(out).toContain('--color-action-primary: oklch(0.55 0.15 155);')
    expect(out).toContain('--spacing-md: 1rem;')
    const selfRefs = out.match(/--([\w-]+):\s*var\(--\1\)/g) ?? []
    expect(selfRefs.filter((s) => !s.startsWith('--shadow-'))).toEqual([])
  })

  test('`--breakpoint-*` — всегда литерал (Blocker #4: var() в @media невалиден)', () => {
    const out = tailwindBridge(fixtureResolved())
    expect(out).toContain('--breakpoint-md: 48rem;')
    expect(out).not.toContain('--breakpoint-md: var(--breakpoint-md);')
  })

  test('`--shadow-*` — исключение, значение остаётся `var()` (dark-своп теней)', () => {
    const out = tailwindBridge(fixtureResolved())
    expect(out).toContain('--shadow-md: var(--shadow-md);')
    expect(out).not.toContain('--shadow-md: 0 2px 8px')
  })

  test('фильтр namespace: color/spacing внутри, gradient/z/duration снаружи', () => {
    const out = tailwindBridge(fixtureResolved())
    expect(out).toContain('--color-action-primary: oklch(0.55 0.15 155);')
    expect(out).toContain('--spacing-md: 1rem;')
    expect(out).not.toContain('--gradient-brand')
    expect(out).not.toContain('--z-modal')
    expect(out).not.toContain('--duration-fast')
  })

  test('font-weight не уходит в namespace font (самый длинный префикс)', () => {
    const out = tailwindBridge(fixtureResolved())
    expect(out).toContain('--font-weight-bold: 700;')
    expect(out).toContain('--font-sans: Inter, sans-serif;')
  })

  test('double-dash line-height companion включён (Tailwind text-* leading, R-11 §3, finding #28)', () => {
    const out = tailwindBridge(fixtureResolved())
    expect(out).toContain('--text-2xl: 1.5rem;')
    expect(out).toContain('--text-2xl--line-height: 1.33;')
  })

  test("include:'base' vs 'all' — тема вводит новый var (литерал патча — fallback)", () => {
    const resolved = fixtureResolved()
    const base = tailwindBridge(resolved, { include: 'base' })
    const all = tailwindBridge(resolved, { include: 'all' })
    expect(base).not.toContain('--color-action-primary-focus')
    expect(all).toContain('--color-action-primary-focus: oklch(0.4 0.2 30);')
  })

  test('детерминизм: два вызова байт-идентичны, сортировка стабильна', () => {
    const resolved = fixtureResolved()
    const a = tailwindBridge(resolved)
    const b = tailwindBridge(resolved)
    expect(a).toBe(b)
    // Сортировка — по имени переменной (до ':'), не по всей строке (иначе '-focus'
    // против ': var(' даёт ложный порядок при сравнении полных строк).
    const varNames = a
      .split('\n')
      .filter((l) => l.trim().startsWith('--'))
      .map((l) => l.trim().split(':')[0]!)
    expect(varNames).toEqual([...varNames].sort())
  })

  test('пустой набор namespace → валидный no-op блок', () => {
    const out = tailwindBridge(fixtureResolved(), { namespaces: [], banner: false })
    expect(out).toBe('@theme reference {\n}\n')
  })

  test('banner:false убирает комментарий', () => {
    const resolved = fixtureResolved()
    const withBanner = tailwindBridge(resolved)
    const withoutBanner = tailwindBridge(resolved, { banner: false })
    expect(withBanner.startsWith('/* Generated by @themeon/tailwind')).toBe(true)
    expect(withoutBanner.startsWith('/* Generated by @themeon/tailwind')).toBe(false)
    expect(withoutBanner.startsWith('@theme reference {')).toBe(true)
  })
})
