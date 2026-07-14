import { describe, expect, test } from 'vitest'
import { defineTheme, resolveTheme, serializeThemeCss } from '@themeon/core'
import { tailwindBridge } from '@themeon/tailwind'
import { mkFixture, rmFixture } from '../helpers/fixture'
import { tailwindCompile } from '../helpers/tailwind-compile'

/**
 * `@themeon/tailwind` — форма моста `@theme reference` (P8.3, Blocker #4/#5).
 * Настоящая компиляция Tailwind 4.3.2 (`@tailwindcss/node`), не мок границы: старый
 * `tailwind-compile.test.ts` билдил только `bg-action-primary` (без `md:`-варианта) и
 * истолковал self-referential цикл как успех (`selfRefCount === 1`) — оба блокера прошли
 * зелёными. `findings/P8-tailwind-bridge-form.md` §4 (7 обязательных тестов; здесь — 1/2/3/4/6,
 * эффект в браузере (5) и dark-своп тени (7) — `../browser/tailwind-bridge.test.ts`).
 */

function fixtureTheme() {
  return defineTheme({
    base: {
      color: { action: { primary: 'oklch(0.55 0.15 155)' } },
      space: { md: '16px' },
      text: { '2xl': { size: '24px', lineHeight: '30px' } },
      breakpoint: { md: '48rem' },
      shadow: { md: '0 2px 8px oklch(0 0 0 / 0.15)' },
    },
    themes: {
      dark: {
        color: { action: { primary: 'oklch(0.75 0.15 155)' } },
        shadow: { md: '0 8px 32px oklch(0 0 0 / 0.8)' },
      },
    },
  })
}

const CANDIDATES = ['bg-action-primary', 'md:bg-action-primary', 'p-md', 'text-2xl', 'shadow-md']

/** Три перестановки подключения `tailwindcss`/`bridge.css`/`tokens.css` — O1/O2/O3 §2. */
const ORDERS = {
  O1: (b: string, t: string) => `@import "tailwindcss";\n@import "${b}";\n@import "${t}";\n`,
  O2: (b: string, t: string) => `@import "${t}";\n@import "tailwindcss";\n@import "${b}";\n`,
  O3: (b: string, t: string) => `@import "${b}";\n@import "${t}";\n@import "tailwindcss";\n`,
} as const

function prepareFixture(
  prefix: string,
  order: keyof typeof ORDERS,
): { dir: string; entryCss: string; tokensCss: string } {
  const resolved = resolveTheme(fixtureTheme())
  const tokensCss = serializeThemeCss(resolved)
  const dir = mkFixture(prefix, {
    'bridge.css': tailwindBridge(resolved),
    'tokens.css': tokensCss,
  })
  const entryCss = ORDERS[order]('./bridge.css', './tokens.css')
  return { dir, entryCss, tokensCss }
}

/**
 * Считает ЛИТЕРАЛЬНЫЕ (не `var()`-ссылка) объявления переменной в CSS-тексте — так измеряется
 * «нулевая эмиссия»: значение обязано совпасть с тем, сколько раз `tokens.css` сам объявляет
 * переменную (Tailwind не добавил ни одной сверху).
 */
function countLiteralDeclarations(css: string, varName: string): number {
  const re = new RegExp(`${varName}:\\s*(?!var\\()`, 'g')
  return css.match(re)?.length ?? 0
}

describe('tailwindBridge — real Tailwind 4.3.2 compile (@theme reference)', () => {
  test('1) `md:` — литерал в @media, применяется/не применяется по ширине проверяется в браузере; здесь — форма', async () => {
    const { dir, entryCss } = prepareFixture('tw-bridge-media', 'O1')
    try {
      const out = await tailwindCompile(entryCss, CANDIDATES, dir)
      expect(out).toMatch(/@media \(width >= 48rem\)/)
      expect(out).not.toMatch(/@media[^{]*var\(/)
    } finally {
      rmFixture(dir)
    }
  })

  test('2) нулевая эмиссия ThemeOn-переменных: Tailwind не добавляет деклараций сверх tokens.css', async () => {
    const { dir, entryCss, tokensCss } = prepareFixture('tw-bridge-zero-emit', 'O1')
    try {
      const out = await tailwindCompile(entryCss, CANDIDATES, dir)
      for (const name of ['--color-action-primary', '--spacing-md', '--breakpoint-md', '--text-2xl']) {
        expect(countLiteralDeclarations(out, name)).toBe(countLiteralDeclarations(tokensCss, name))
      }
    } finally {
      rmFixture(dir)
    }
  })

  test('3) анти-цикл: ни одна переменная не самоссылается (кроме `--shadow-*`, канон)', async () => {
    const { dir, entryCss } = prepareFixture('tw-bridge-anticycle', 'O1')
    try {
      const out = await tailwindCompile(entryCss, CANDIDATES, dir)
      const selfRefs = out.match(/--([\w-]+):\s*var\(--\1\)/g) ?? []
      const nonShadow = selfRefs.filter((s) => !s.startsWith('--shadow-'))
      expect(nonShadow).toEqual([])
    } finally {
      rmFixture(dir)
    }
  })

  test('4) инвариантность к порядку подключения: O1/O2/O3 дают одинаковую эмиссию и валидный @media', async () => {
    const dirs: string[] = []
    try {
      const results: Record<string, { out: string; tokensCss: string }> = {}
      for (const order of Object.keys(ORDERS) as (keyof typeof ORDERS)[]) {
        const { dir, entryCss, tokensCss } = prepareFixture(`tw-bridge-order-${order}`, order)
        dirs.push(dir)
        results[order] = { out: await tailwindCompile(entryCss, CANDIDATES, dir), tokensCss }
      }
      for (const order of Object.keys(ORDERS)) {
        const { out, tokensCss } = results[order]!
        expect(out).toMatch(/@media \(width >= 48rem\)/)
        expect(out).not.toMatch(/@media[^{]*var\(/)
        // Ни в одном порядке Tailwind не добавляет деклараций сверх того, что уже несёт tokens.css.
        for (const name of ['--color-action-primary', '--spacing-md', '--breakpoint-md']) {
          expect(countLiteralDeclarations(out, name)).toBe(countLiteralDeclarations(tokensCss, name))
        }
      }
    } finally {
      for (const dir of dirs) rmFixture(dir)
    }
  })

  test('6) companion: `.text-2xl` эмитит и font-size, и line-height', async () => {
    const { dir, entryCss } = prepareFixture('tw-bridge-companion', 'O1')
    try {
      const out = await tailwindCompile(entryCss, CANDIDATES, dir)
      expect(out).toMatch(/\.text-2xl\s*{[^}]*font-size:\s*var\(--text-2xl,\s*24px\)/)
      expect(out).toMatch(/line-height:[^;]*var\(--text-2xl--line-height,\s*30px\)/)
    } finally {
      rmFixture(dir)
    }
  })

  test('форма: `--breakpoint-md` — литерал, `--shadow-md` — var(), обе присутствуют в bridge.css', async () => {
    const resolved = resolveTheme(fixtureTheme())
    const bridge = tailwindBridge(resolved)
    expect(bridge).toContain('@theme reference {')
    expect(bridge).toContain('--breakpoint-md: 48rem;')
    expect(bridge).toContain('--shadow-md: var(--shadow-md);')
  })
})
