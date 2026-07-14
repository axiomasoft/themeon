/**
 * Real-Tailwind compile-smoke (P4.1 → форма P8.3, `findings/P8-tailwind-bridge-form.md`):
 * гоняет НАСТОЯЩИЙ Tailwind 4.3.2 на фикстуре, использующей `@theme reference`-мост.
 * Полная матрица обязательных тестов (md-variant/zero-emission/anti-cycle/order-invariance/
 * companion/browser-effect/shadow-swap) — `tests/integration/src/fast/tailwind-bridge.test.ts`
 * и `tests/integration/src/browser/tailwind-bridge.test.ts` (реальный `@tailwindcss/node` +
 * Chromium). Здесь — быстрый пакетный смок без интеграционного гарнесса: форма моста и
 * базовая компиляция.
 */

import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { defineTheme, resolveTheme, serializeThemeCss } from '@themeon/core'
import { compile } from '@tailwindcss/node'
import { describe, expect, test } from 'vitest'
import { tailwindBridge } from './bridge'

const FIXTURES_DIR = join(import.meta.dirname, '..', 'test', 'fixtures')

function fixtureTheme() {
  return defineTheme({
    base: {
      color: { action: { primary: 'oklch(0.55 0.15 155)' } },
    },
    themes: {
      dark: { color: { action: { primary: 'oklch(0.75 0.15 155)' } } },
    },
  })
}

/** Готовит tmp-директорию: статичные фикстуры + сгенерированные bridge.css/tokens.css. */
function prepareFixtureDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'themeon-tailwind-compile-'))
  const resolved = resolveTheme(fixtureTheme())

  writeFileSync(join(dir, 'input.css'), readFileSync(join(FIXTURES_DIR, 'input.css'), 'utf8'))
  writeFileSync(join(dir, 'bridge.css'), tailwindBridge(resolved))
  writeFileSync(join(dir, 'tokens.css'), serializeThemeCss(resolved))

  return dir
}

describe('tailwindBridge — real Tailwind 4.3.2 compile-смок (@theme reference)', () => {
  test('утилита получает `var(--x, <литерал>)`, ThemeOn-переменная НЕ эмитится Tailwind-ом', async () => {
    const dir = prepareFixtureDir()
    const inputCss = readFileSync(join(dir, 'input.css'), 'utf8')

    const result = await compile(inputCss, { base: dir, onDependency: () => {} })
    const out = result.build(['bg-action-primary'])

    // (a) утилита ссылается на var() с литеральным fallback'ом — не запечённый литерал (C6 provал).
    expect(out).toMatch(
      /\.bg-action-primary\s*{\s*background-color:\s*var\(--color-action-primary,\s*oklch\(0\.55 0\.15 155\)\);?\s*}/,
    )

    // (b) Tailwind сам НЕ объявляет `--color-action-primary` в @layer theme — `reference`
    // никогда не эмитит (Blocker #5, supersedes старый selfRefCount===1, который закреплял цикл).
    const themeLayerStart = out.indexOf('@layer theme {')
    const nextLayerStart = out.indexOf('@layer base {', themeLayerStart)
    expect(themeLayerStart).toBeGreaterThanOrEqual(0)
    expect(nextLayerStart).toBeGreaterThan(themeLayerStart)
    expect(out.slice(themeLayerStart, nextLayerStart)).not.toContain('--color-action-primary')

    // (c) [data-theme="dark"]-своп из tokens.css присутствует нетронутым.
    expect(out).toContain('[data-theme="dark"]')
    expect(out).toMatch(/\[data-theme="dark"\]\s*{[^}]*--color-action-primary:\s*oklch\(0\.75 0\.15 155\)/)
  })
})
