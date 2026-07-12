/**
 * Real-Tailwind compile-VERIFY (P4.1, R-14 §2.2): гоняет НАСТОЯЩИЙ Tailwind 4.3.2 на
 * фикстуре, использующей self-referential `@theme inline`-мост. Закрывает P-D31/VERIFY-
 * метку `handoff.md`: self-reference не даёт дубль-объявления и доносит `[data-theme]`-
 * своп до сгенерированной утилиты.
 *
 * Компилятор — `@tailwindcss/node` (тот же движок, что `@tailwindcss/vite`/`@tailwindcss/
 * postcss`): экспортирует `compile()`, который сам резолвит `@import "tailwindcss"` через
 * node-резолюцию пакета (в отличие от голого `tailwindcss.compile()`, который требует
 * ручной `loadStylesheet`). См. Known Deviations `phases/P4.md` P4.1.
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

describe('tailwindBridge — real Tailwind 4.3.2 compile-смок', () => {
  test('утилита инлайнит var(), нет дубль-объявления, [data-theme=dark] проходит насквозь', async () => {
    const dir = prepareFixtureDir()
    const inputCss = readFileSync(join(dir, 'input.css'), 'utf8')

    const result = await compile(inputCss, { base: dir, onDependency: () => {} })
    const out = result.build(['bg-action-primary'])

    // (a) утилита эмитит var(--color-action-primary), не литерал.
    expect(out).toMatch(/\.bg-action-primary\s*{\s*background-color:\s*var\(--color-action-primary\);?\s*}/)

    // (b) единственное self-referential объявление в @theme inline-слое — не второй
    // (не-var) источник значения вне tokens.css-скоупа (:root/[data-theme]).
    const selfRefCount = (out.match(/--color-action-primary:\s*var\(--color-action-primary\);/g) ?? []).length
    expect(selfRefCount).toBe(1)

    // (c) [data-theme="dark"]-своп из tokens.css присутствует нетронутым.
    expect(out).toContain('[data-theme="dark"]')
    expect(out).toMatch(/\[data-theme="dark"\]\s*{[^}]*--color-action-primary:\s*oklch\(0\.75 0\.15 155\)/)
  })
})
