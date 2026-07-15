import { afterAll, describe, expect, test } from 'vitest'
import { defineTheme, resolveTheme, serializeThemeCss } from '@themeon/core'
import { tailwindLayerPreamble } from '@themeon/tailwind'
import { closeChromium, withChromium } from '../helpers/chromium'
import { mkFixture, rmFixture } from '../helpers/fixture'
import { tailwindCompile } from '../helpers/tailwind-compile'

/**
 * `themeon build --tailwind-layers` — эффект order-statement-преамбулы на статик-канале
 * `tokens.css` в РЕАЛЬНОМ Chromium (P8.15, P-D67, findings/P8-css-layers-cli-checks.md §1).
 * Регресс-тест-сторож на первопричину P5.9: `--radius-md`/`--font-sans`/`--text-lg` —
 * имена, которые D5 намеренно зеркалит с Tailwind — обязаны резолвиться в значения ТЕМЫ
 * с преамбулой и остаться сломанными (Tailwind-дефолты) без неё (иначе тест ничего не
 * сторожит, тот же обязательный сторож-антипод, что `css-tailwind-recipe.test.ts` #A).
 */

function fixtureTheme() {
  return defineTheme({
    base: {
      font: { sans: '"Commissioner", sans-serif' },
      text: { lg: { size: '2rem', lineHeight: 1.4 } },
      radius: { md: '999px' },
    },
  })
}

// Tailwind (`@tailwindcss/node` compile()) эмитит `--radius-*`/`--text-*` в `theme`-слой
// ТОЛЬКО для namespace'ов, реально использованных генерируемыми утилитами (`--font-sans`
// эмитится безусловно — Preflight ссылается на него в `html`-правиле). Без кандидатов-
// утилит `rounded-md`/`text-lg` тест ничего не сторожит: Tailwind не декларирует свои
// дефолты вовсе, и «победа» темы была бы победой по умолчанию, а не по порядку слоёв.
const CANDIDATES = ['rounded-md', 'text-lg']
const HTML = `<div id="probe" class="rounded-md text-lg">x</div>`

/**
 * Порядок подключения — P-D34/P-D40: `tokens.css` (`<link>`) грузится ПЕРВЫМ, Tailwind
 * (компилированная таблица стилей) — вторым; тот же канал, что живая vintera (P5.9).
 */
async function compile(withPreamble: boolean): Promise<string> {
  const resolved = resolveTheme(fixtureTheme())
  const tokensCss = withPreamble
    ? tailwindLayerPreamble() + serializeThemeCss(resolved)
    : serializeThemeCss(resolved)
  const dir = mkFixture('tw-tokens-layers', { 'tokens.css': tokensCss })
  try {
    return await tailwindCompile(`@import "./tokens.css";\n@import "tailwindcss";\n`, CANDIDATES, dir)
  } finally {
    rmFixture(dir)
  }
}

async function readTokenVars(css: string) {
  return withChromium(HTML, css, (page) =>
    page.evaluate(() => {
      const root = getComputedStyle(document.documentElement)
      return {
        radiusMd: root.getPropertyValue('--radius-md').trim(),
        fontSans: root.getPropertyValue('--font-sans').trim(),
        textLg: root.getPropertyValue('--text-lg').trim(),
      }
    }),
  )
}

describe('themeon build --tailwind-layers — эффект в Chromium (P8.15)', () => {
  afterAll(async () => {
    await closeChromium()
  })

  test('с преамбулой — коллидирующие токены резолвятся в значения темы', async () => {
    const css = await compile(true)
    const vars = await readTokenVars(css)

    expect(vars.radiusMd).toBe('999px')
    expect(vars.fontSans).toBe('"Commissioner", sans-serif')
    expect(vars.textLg).toBe('2rem')
  })

  test('без преамбулы — коллидирующие токены остаются Tailwind-дефолтами (сторож-антипод)', async () => {
    const css = await compile(false)
    const vars = await readTokenVars(css)

    expect(vars.radiusMd).not.toBe('999px')
    expect(vars.fontSans).not.toBe('"Commissioner", sans-serif')
    expect(vars.textLg).not.toBe('2rem')
  })
})
