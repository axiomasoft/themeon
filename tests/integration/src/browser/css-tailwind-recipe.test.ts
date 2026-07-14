import { afterAll, describe, expect, test } from 'vitest'
import { closeChromium, withChromium } from '../helpers/chromium'
import { mkFixture, rmFixture } from '../helpers/fixture'
import { tailwindCompile } from '../helpers/tailwind-compile'

/**
 * `@themeon/css` — рецепт соседства с Tailwind v4 в РЕАЛЬНОМ Chromium (P8.7, аудит #16,
 * findings/P8-css-layers-cli-checks.md §1). Регресс-тест на README-рецепт: канонический
 * порядок (`layers-tailwind.css`, рецепт C) обязан работать, а прежний README-рецепт
 * (`layers.css` перед `tailwindcss`, рецепт A) — обязан оставаться сломанным (иначе тест
 * ничего не сторожит, findings §5 обязательный тест #2).
 */

const CANDIDATES = ['p-0']
const HTML = `
  <h1 id="h1">Heading</h1>
  <button class="btn" id="btn">Button</button>
  <button class="btn p-0" id="btn-p0">Button</button>
  <button class="btn consumer-override" id="btn-override">Button</button>
`
const UNLAYERED_CONSUMER_CSS = `.consumer-override { background-color: rgb(1, 2, 3); }`

async function compile(entryImports: string): Promise<string> {
  const dir = mkFixture('css-tw-recipe', {
    'entry.css': `${entryImports}\n${UNLAYERED_CONSUMER_CSS}\n`,
  })
  try {
    return await tailwindCompile(`@import "./entry.css";\n`, CANDIDATES, dir)
  } finally {
    rmFixture(dir)
  }
}

describe('@themeon/css — рецепт соседства с Tailwind v4 (README)', () => {
  afterAll(async () => {
    await closeChromium()
  })

  test('C) канонический order-statement (layers-tailwind.css) — рабочий', async () => {
    const css = await compile(
      `@import "@themeon/css/layers-tailwind.css";\n` +
        `@import "tailwindcss";\n` +
        `@import "@themeon/css/tokens.css";\n` +
        `@import "@themeon/css/index.css";\n`,
    )

    const styles = await withChromium(HTML, css, (page) =>
      page.evaluate(() => ({
        h1FontSize: getComputedStyle(document.getElementById('h1')!).fontSize,
        h1FontWeight: getComputedStyle(document.getElementById('h1')!).fontWeight,
        btnBg: getComputedStyle(document.getElementById('btn')!).backgroundColor,
        btnPadding: getComputedStyle(document.getElementById('btn')!).paddingLeft,
        btnP0Padding: getComputedStyle(document.getElementById('btn-p0')!).paddingLeft,
        overrideBg: getComputedStyle(document.getElementById('btn-override')!).backgroundColor,
      })),
    )

    expect(styles.h1FontSize).toBe('40px')
    expect(styles.h1FontWeight).toBe('700')
    expect(styles.btnBg).not.toBe('rgba(0, 0, 0, 0)')
    expect(styles.btnPadding).not.toBe('0px')
    expect(styles.btnP0Padding).toBe('0px')
    expect(styles.overrideBg).toBe('rgb(1, 2, 3)')
  })

  test('A) старый README-рецепт (layers.css перед tailwindcss) — остаётся сломанным (сторож)', async () => {
    const css = await compile(
      `@import "@themeon/css/layers.css";\n` +
        `@import "tailwindcss";\n` +
        `@import "@themeon/css/tokens.css";\n` +
        `@import "@themeon/css/index.css";\n`,
    )

    const styles = await withChromium(HTML, css, (page) =>
      page.evaluate(() => ({
        h1FontSize: getComputedStyle(document.getElementById('h1')!).fontSize,
        btnBg: getComputedStyle(document.getElementById('btn')!).backgroundColor,
        btnPadding: getComputedStyle(document.getElementById('btn')!).paddingLeft,
      })),
    )

    // Если это когда-нибудь начнёт проходить — рецепт C и весь тест выше нужно пересмотреть:
    // тест-сторож существует именно для того, чтобы такой дрейф не прошёл незамеченным.
    expect(styles.h1FontSize).not.toBe('40px')
    expect(styles.btnBg).toBe('rgba(0, 0, 0, 0)')
    expect(styles.btnPadding).toBe('0px')
  })
})
