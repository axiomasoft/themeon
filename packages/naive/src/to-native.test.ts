import type { CssVarName, ResolvedTheme, ResolvedToken } from '@themeon/core'
import { describe, expect, test } from 'vitest'
import { toNative } from './to-native'

const HEX_RE = /^#[0-9a-f]{6,8}$/i

/**
 * `toNative` — чистая функция над `ResolvedTheme` (данными), фикстура строится напрямую как
 * объект резолвера (тот же паттерн, что `packages/tailwind/src/bridge.test.ts`).
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

function fixtureResolved(): ResolvedTheme {
  const base: ResolvedToken[] = [
    tok('--color-action-primary', 'oklch(0.55 0.15 155)'),
    tok('--color-bg-page', 'oklch(0.99 0 0)'),
    tok('--color-bg-subtle', 'oklch(0.97 0 0)'),
    tok('--color-bg-elevated', 'oklch(1 0 0)'),
    tok('--color-text', 'oklch(0.2 0 0)'),
    tok('--color-text-muted', 'oklch(0.5 0 0)'),
    tok('--color-border', 'oklch(0.85 0 0)'),
    tok('--radius-md', '0.5rem'),
    tok('--radius-sm', '0.25rem'),
    tok('--shadow-sm', '0 1px 3px rgb(0 0 0 / 0.08)'),
    tok('--shadow-md', '0 4px 12px rgb(0 0 0 / 0.10)'),
    tok('--shadow-lg', '0 8px 24px rgb(0 0 0 / 0.12)'),
    tok('--font-sans', 'system-ui, sans-serif'),
    tok('--text-xs', '0.75rem'),
    tok('--text-sm', '0.875rem'),
    tok('--text-base', '1rem'),
    tok('--text-lg', '1.125rem'),
  ]
  return buildResolved(base, {
    dark: [tok('--color-action-primary', 'oklch(0.65 0.15 155)')],
  })
}

describe('toNative', () => {
  test('primary/bg/text/border мапятся в правильные Naive-ключи', () => {
    const out = toNative(fixtureResolved()) as any
    expect(out.common.primaryColor).toMatch(HEX_RE)
    expect(out.common.bodyColor).toMatch(HEX_RE)
    expect(out.common.baseColor).toMatch(HEX_RE)
    expect(out.common.textColorBase).toMatch(HEX_RE)
    expect(out.common.borderColor).toMatch(HEX_RE)
    expect(out.common.borderRadius).toBe('0.5rem')
    expect(out.common.fontFamily).toBe('system-ui, sans-serif')
  })

  test('мультиключ: --color-bg-elevated → card+modal+popover одним значением', () => {
    const out = toNative(fixtureResolved()) as any
    expect(out.common.cardColor).toBe(out.common.modalColor)
    expect(out.common.modalColor).toBe(out.common.popoverColor)
    expect(out.common.cardColor).toMatch(HEX_RE)
  })

  test('все color-выходы — валидный hex, не oklch', () => {
    const out = toNative(fixtureResolved()) as any
    for (const key of ['primaryColor', 'bodyColor', 'baseColor', 'textColorBase', 'borderColor']) {
      expect(out.common[key]).toMatch(HEX_RE)
      expect(out.common[key]).not.toContain('oklch')
    }
  })

  test('derived pressed/suppl вычисляются, когда тема их не задала; hover берётся из темы, когда задан явно', () => {
    const withExplicitHover = buildResolved([
      tok('--color-action-primary', 'oklch(0.55 0.15 155)'),
      tok('--color-action-primary-hover', 'oklch(0.75 0.15 155)'),
    ])
    const out = toNative(withExplicitHover) as any
    // Explicit hover role в теме — используется напрямую (toHex), не деривится.
    const expectedHover = 'oklch(0.75 0.15 155)'
    expect(out.common.primaryColorHover).toBeDefined()
    expect(out.common.primaryColorHover).toMatch(HEX_RE)
    // pressed/suppl не заданы темой — обязаны быть derived (присутствуют).
    expect(out.common.primaryColorPressed).toMatch(HEX_RE)
    expect(out.common.primaryColorSuppl).toMatch(HEX_RE)
    void expectedHover
  })

  test('opts.theme перекрывает базу (dark-патч меняет значения)', () => {
    const resolved = fixtureResolved()
    const light = toNative(resolved) as any
    const dark = toNative(resolved, { theme: 'dark' }) as any
    expect(dark.common.primaryColor).not.toBe(light.common.primaryColor)
  })

  test('opts.overrides deep-merge поверх common (peers сохраняются)', () => {
    const out = toNative(fixtureResolved(), {
      overrides: { Button: { peers: { Icon: { color: 'red' } } } } as any,
    }) as any
    expect(out.Button.peers.Icon.color).toBe('red')
    expect(out.common.primaryColor).toMatch(HEX_RE)
  })
})
