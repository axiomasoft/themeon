import { describe, expect, test } from 'vitest'
import { defineTokens, defineTheme } from './define'
import { resolveTheme } from './resolve'
import { serializeThemeCss } from './serialize'
import { applyTheme, themeVars } from './apply'
import type { ElementLike } from './apply'
import type { ResolveOptions } from './resolve'

/**
 * Паритет-тест (P1.8) — исполняемая форма контракта D4 «один naming-движок».
 *
 * Полное определение темы резолвится ОДИН раз, затем прогоняется через два канала:
 *  - build: `serializeThemeCss` → собственный вывод парсится примитивным regex по блокам;
 *  - runtime: `themeVars` → `applyTheme` на фейковый элемент, записанные пары собираются.
 * Множества имён И значения обязаны совпадать попарно (включая alias-пары — правило
 * P1.4 шаг 8: без алиасов в `vars`/`themeVars` runtime-переключение потеряло бы легаси-
 * потребителей). Совпадение — конструктивное свидетельство, что «двух копий kebab» нет.
 */

/** Палитра-донор ссылок (создаётся вне sys-дерева, попадает в CSS только как ref-цель). */
const palette = defineTokens('color', {
  forest: { 600: 'oklch(0.55 0.13 155)' },
  neutral: { 0: 'oklch(0.99 0 0)', 900: 'oklch(0.15 0 0)' },
})

/** Полное определение: палитра + все well-known группы + 2 темы. */
const theme = defineTheme({
  base: {
    color: {
      bg: { page: palette.neutral[0] },
      action: { primary: palette.forest[600] },
      text: { muted: 'oklch(0.5 0 0)' },
    },
    space: { 4: '1rem', '1.5': '0.375rem' },
    radius: { md: '0.5rem' },
    text: { '2xl': { size: '1.5rem', lineHeight: 1.33 } },
    font: { sans: 'Inter, sans-serif' },
    fontWeight: { bold: 700 },
    z: { modal: 100 },
    ease: { out: 'cubic-bezier(0, 0, 0.2, 1)' },
    duration: { fast: '150ms' },
    breakpoint: { md: '768px' },
  },
  themes: {
    dark: { color: { bg: { page: palette.neutral[900] } } },
    hc: { color: { text: { muted: 'oklch(0.3 0 0)' } } },
  },
})

/** Фейковый элемент: `setProperty` пишет пары в словарь в порядке вызовов. */
function fakeEl(): ElementLike & { calls: Record<string, string> } {
  const calls: Record<string, string> = {}
  return {
    calls,
    style: {
      setProperty(name: string, value: string): void {
        calls[name] = value
      },
      removeProperty(name: string): string {
        delete calls[name]
        return ''
      },
    },
  }
}

/** Вырезает содержимое CSS-блока по селектору и парсит `--var: value;` пары.
 *  Значения не содержат '}' (гейт сериализатора), поэтому `[^}]*` безопасен. */
function blockVars(css: string, selector: string): Record<string, string> {
  const head = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const block = new RegExp(`${head}\\s*\\{([^}]*)\\}`).exec(css)
  const body = block?.[1]
  if (body === undefined) throw new Error(`block not found: ${selector}`)
  const out: Record<string, string> = {}
  const varRe = /(--[\w-]+)\s*:\s*([^;]+);/g
  let m: RegExpExecArray | null
  while ((m = varRe.exec(body)) !== null) {
    const name = m[1]
    const value = m[2]
    if (name !== undefined && value !== undefined) out[name] = value.trim()
  }
  return out
}

/** Прогоняет оба канала для базы и каждой темы и утверждает попарное равенство. */
function assertParity(opts: ResolveOptions): void {
  const resolved = resolveTheme(theme, opts)
  const css = serializeThemeCss(resolved)

  // База.
  const buildBase = blockVars(css, ':root')
  const el = fakeEl()
  applyTheme(el, themeVars(resolved))
  expect(buildBase).toEqual(el.calls)

  // Каждая тема.
  for (const themeName of Object.keys(resolved.themes)) {
    const buildTheme = blockVars(css, `[data-theme="${themeName}"]`)
    const themeEl = fakeEl()
    applyTheme(themeEl, themeVars(resolved, themeName))
    expect(buildTheme).toEqual(themeEl.calls)
  }
}

describe('паритет build/runtime вывода', () => {
  test('legacy-v0 алиасы, referenced ref-слой — база и обе темы совпадают', () => {
    assertParity({ aliases: 'legacy-v0', refLayer: 'referenced' })
  })

  test('без алиасов — база и обе темы совпадают', () => {
    assertParity({ refLayer: 'referenced' })
  })

  test('prefix "to" — паритет сохраняется', () => {
    assertParity({ prefix: 'to', aliases: 'legacy-v0' })
  })

  test('refLayer "inline" — паритет сохраняется', () => {
    assertParity({ refLayer: 'inline', aliases: 'legacy-v0' })
  })
})
