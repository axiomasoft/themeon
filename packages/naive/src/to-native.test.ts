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
    expect(out.common.actionColor).toMatch(HEX_RE)
    expect(out.common.textColorBase).toMatch(HEX_RE)
    expect(out.common.borderColor).toMatch(HEX_RE)
    expect(out.common.borderRadius).toBe('0.5rem')
    expect(out.common.fontFamily).toBe('system-ui, sans-serif')
  })

  test('common.baseColor не мапится (P8.8, Blocker #3) — адаптер не трогает канву Naive', () => {
    const out = toNative(fixtureResolved()) as any
    expect(out.common.baseColor).toBeUndefined()
  })

  test('--color-bg-subtle → actionColor/tableHeaderColor/tabColor (не baseColor); --color-bg-elevated → +tableColor', () => {
    const out = toNative(fixtureResolved()) as any
    expect(out.common.actionColor).toBe(out.common.tableHeaderColor)
    expect(out.common.tableHeaderColor).toBe(out.common.tabColor)
    expect(out.common.actionColor).toMatch(HEX_RE)
    expect(out.common.tableColor).toBe(out.common.cardColor)
  })

  test('мультиключ: --color-bg-elevated → card+modal+popover+table одним значением', () => {
    const out = toNative(fixtureResolved()) as any
    expect(out.common.cardColor).toBe(out.common.modalColor)
    expect(out.common.modalColor).toBe(out.common.popoverColor)
    expect(out.common.popoverColor).toBe(out.common.tableColor)
    expect(out.common.cardColor).toMatch(HEX_RE)
  })

  test('все color-выходы — валидный hex, не oklch', () => {
    const out = toNative(fixtureResolved()) as any
    for (const key of ['primaryColor', 'bodyColor', 'actionColor', 'textColorBase', 'borderColor']) {
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

describe('toNative — fail-loud (P8.8, §1.3)', () => {
  test('непарсибельная роль → ThemeonError(BAD_COLOR) со списком плохих ролей', () => {
    const resolved = buildResolved([
      tok('--color-action-primary', 'color-mix(in oklch, red, blue)'),
      tok('--color-bg-page', 'var(--x)'),
    ])
    let thrown: unknown
    try {
      toNative(resolved)
    } catch (e) {
      thrown = e
    }
    expect(thrown).toBeInstanceOf(Error)
    expect((thrown as { code?: string }).code).toBe('BAD_COLOR')
    expect((thrown as Error).message).toContain('--color-action-primary')
    expect((thrown as Error).message).toContain('--color-bg-page')
  })

  test('onInvalidColor:"skip" — не бросает, роль отсутствует в выходе', () => {
    const resolved = buildResolved([
      tok('--color-action-primary', 'color-mix(in oklch, red, blue)'),
      tok('--color-bg-page', 'oklch(0.99 0 0)'),
    ])
    const out = toNative(resolved, { onInvalidColor: 'skip' }) as any
    expect(out.common.primaryColor).toBeUndefined()
    expect(out.common.bodyColor).toMatch(HEX_RE)
  })

  test('одна и та же плохая роль в сообщении не дублируется (общая для common-map + деривации)', () => {
    const resolved = buildResolved([tok('--color-action-primary', 'var(--x)')])
    let thrown: unknown
    try {
      toNative(resolved)
    } catch (e) {
      thrown = e
    }
    const message = (thrown as Error).message
    const occurrences = message.split('--color-action-primary').length - 1
    expect(occurrences).toBe(1)
  })

  test('присутствующая, но невалидная on-роль статуса НЕ фолбэчит на --color-on-primary — skip реально пропускает роль', () => {
    const resolved = buildResolved([
      tok('--color-status-success', 'oklch(0.5 0.15 155)'),
      tok('--color-on-success', 'var(--broken)'),
      tok('--color-on-primary', 'oklch(1 0 0)'),
    ])
    const skipped = toNative(resolved, { onInvalidColor: 'skip' }) as any
    expect(skipped.Button?.textColorSuccess).toBeUndefined()

    let thrown: unknown
    try {
      toNative(resolved)
    } catch (e) {
      thrown = e
    }
    expect((thrown as Error).message).toContain('--color-on-success')
  })
})

describe('toNative — INK-таблица (P8.8, §2.4/§2.5)', () => {
  function withInk(...extra: ResolvedToken[]): ResolvedTheme {
    return buildResolved([...fixtureResolved().tokens, ...extra])
  }

  test('--color-on-primary красит Button.textColor*Primary и не-Button компоненты (обе темы)', () => {
    const out = toNative(withInk(tok('--color-on-primary', 'oklch(1 0 0)'))) as any
    for (const state of ['', 'Hover', 'Pressed', 'Focus', 'Disabled']) {
      expect(out.Button[`textColor${state}Primary`]).toMatch(HEX_RE)
    }
    expect(out.Checkbox.checkMarkColor).toMatch(HEX_RE)
    expect(out.Tag.textColorChecked).toMatch(HEX_RE)
    expect(out.IconWrapper.iconColor).toMatch(HEX_RE)
  })

  test('без --color-on-primary в теме — INK-оверрайды не эмитятся (полный сток, D3)', () => {
    const out = toNative(fixtureResolved()) as any
    expect(out.Button).toBeUndefined()
    expect(out.Checkbox).toBeUndefined()
  })

  test('Radio/FloatButton/Switch INK — только в dark (appearance-гейт)', () => {
    const resolved = withInk(tok('--color-on-primary', 'oklch(1 0 0)'))
    const light = toNative(resolved, { appearance: 'light' }) as any
    const dark = toNative(resolved, { appearance: 'dark' }) as any
    expect(light.Radio?.buttonTextColorActive).toBeUndefined()
    expect(dark.Radio.buttonTextColorActive).toMatch(HEX_RE)
    expect(dark.FloatButton.textColorPrimary).toMatch(HEX_RE)
    expect(dark.Switch.iconColor).toMatch(HEX_RE)
  })

  test('статусная ink-роль без своей on-роли фолбэчит на --color-on-primary', () => {
    const resolved = buildResolved([
      tok('--color-action-primary', 'oklch(0.55 0.15 155)'),
      tok('--color-status-success', 'oklch(0.5 0.15 155)'),
      tok('--color-on-primary', 'oklch(1 0 0)'),
    ])
    const out = toNative(resolved) as any
    expect(out.Button.textColorSuccess).toMatch(HEX_RE)
    expect(out.Button.textColorSuccess).toBe(out.Button.textColorPrimary)
  })

  test('ACCENT-INK: --color-link красит Anchor/Menu/Tabs/Pagination/Typography/Dropdown + Button text/ghost*Primary', () => {
    const out = toNative(withInk(tok('--color-link', 'oklch(0.45 0.15 260)'))) as any
    expect(out.Anchor.linkTextColorActive).toMatch(HEX_RE)
    expect(out.Menu.itemTextColorActive).toMatch(HEX_RE)
    expect(out.Tabs.tabTextColorActiveLine).toMatch(HEX_RE)
    expect(out.Pagination.itemTextColorActive).toMatch(HEX_RE)
    expect(out.Typography.aTextColor).toMatch(HEX_RE)
    expect(out.Dropdown.optionTextColorActive).toMatch(HEX_RE)
    expect(out.Button.textColorTextPrimary).toMatch(HEX_RE)
    expect(out.Button.textColorGhostPrimary).toMatch(HEX_RE)
  })
})
