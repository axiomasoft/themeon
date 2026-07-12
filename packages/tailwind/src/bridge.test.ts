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
 * расширения вне Tailwind-набора (gradient/z/duration), double-dash companion
 * (`--text-2xl` + `--text-2xl--line-height`, P1.3) и var, введённый только темой `hc`.
 */
function fixtureResolved(): ResolvedTheme {
  const base: ResolvedToken[] = [
    tok('--color-action-primary', 'oklch(0.55 0.15 155)'),
    tok('--spacing-md', '1rem'),
    tok('--font-weight-bold', '700'),
    tok('--font-sans', 'Inter, sans-serif'),
    tok('--text-2xl', '1.5rem'),
    tok('--text-2xl--line-height', '1.33'),
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
  test('каждая строка — self-referential mapping `--x: var(--x);`', () => {
    const out = tailwindBridge(fixtureResolved())
    const bodyLines = out.split('\n').filter((l) => l.trim().startsWith('--'))
    expect(bodyLines.length).toBeGreaterThan(0)
    for (const line of bodyLines) {
      const trimmed = line.trim()
      const match = trimmed.match(/^(--[a-z0-9-]+):\s*var\(([a-z0-9-]+)\);$/)
      expect(match).not.toBeNull()
      expect(match![1]).toBe(match![2])
    }
  })

  test('фильтр namespace: color/spacing внутри, gradient/z/duration снаружи', () => {
    const out = tailwindBridge(fixtureResolved())
    expect(out).toContain('--color-action-primary: var(--color-action-primary);')
    expect(out).toContain('--spacing-md: var(--spacing-md);')
    expect(out).not.toContain('--gradient-brand')
    expect(out).not.toContain('--z-modal')
    expect(out).not.toContain('--duration-fast')
  })

  test('font-weight не уходит в namespace font (самый длинный префикс)', () => {
    const out = tailwindBridge(fixtureResolved())
    expect(out).toContain('--font-weight-bold: var(--font-weight-bold);')
    expect(out).toContain('--font-sans: var(--font-sans);')
  })

  test('double-dash companion переменные исключены', () => {
    const out = tailwindBridge(fixtureResolved())
    expect(out).toContain('--text-2xl: var(--text-2xl);')
    expect(out).not.toMatch(/--text-2xl--line-height/)
  })

  test("include:'base' vs 'all' — тема вводит новый var", () => {
    const resolved = fixtureResolved()
    const base = tailwindBridge(resolved, { include: 'base' })
    const all = tailwindBridge(resolved, { include: 'all' })
    expect(base).not.toContain('--color-action-primary-focus')
    expect(all).toContain('--color-action-primary-focus: var(--color-action-primary-focus);')
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
    expect(out).toBe('@theme inline {\n}\n')
  })

  test('banner:false убирает комментарий', () => {
    const resolved = fixtureResolved()
    const withBanner = tailwindBridge(resolved)
    const withoutBanner = tailwindBridge(resolved, { banner: false })
    expect(withBanner.startsWith('/* Generated by @themeon/tailwind')).toBe(true)
    expect(withoutBanner.startsWith('/* Generated by @themeon/tailwind')).toBe(false)
    expect(withoutBanner.startsWith('@theme inline {')).toBe(true)
  })
})
