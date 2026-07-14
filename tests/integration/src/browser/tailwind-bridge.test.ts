import { afterAll, describe, expect, test } from 'vitest'
import { defineTheme, resolveTheme, serializeThemeCss } from '@themeon/core'
import { tailwindBridge } from '@themeon/tailwind'
import { closeChromium, withChromium } from '../helpers/chromium'
import { mkFixture, rmFixture } from '../helpers/fixture'
import { tailwindCompile } from '../helpers/tailwind-compile'

/**
 * `@themeon/tailwind` — эффект `@theme reference`-моста в РЕАЛЬНОМ Chromium (P8.3,
 * findings/P8-tailwind-bridge-form.md §4, тесты 5/7 — Implementation Rule 4: computed-стиль,
 * не текст CSS). Fast-tier (`../fast/tailwind-bridge.test.ts`) закрывает форму/структуру (1/2/3/4/6).
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

const HTML = `
  <div id="bg" class="bg-action-primary"></div>
  <div id="pad" class="p-md"></div>
  <div id="text" class="text-2xl">x</div>
  <div id="responsive" class="md:bg-action-primary"></div>
  <div id="shadow" class="shadow-md"></div>
`

async function compileFixture(): Promise<string> {
  const resolved = resolveTheme(fixtureTheme())
  const dir = mkFixture('tw-bridge-browser', {
    'bridge.css': tailwindBridge(resolved),
    'tokens.css': serializeThemeCss(resolved),
  })
  try {
    return await tailwindCompile(
      `@import "tailwindcss";\n@import "./bridge.css";\n@import "./tokens.css";\n`,
      CANDIDATES,
      dir,
    )
  } finally {
    rmFixture(dir)
  }
}

describe('tailwindBridge — эффект в Chromium (@theme reference)', () => {
  afterAll(async () => {
    await closeChromium()
  })

  test('5) dark-своп фона, spacing/text-литералы, `md:` применяется на 1000px и не применяется на 400px', async () => {
    const css = await compileFixture()

    const bgLight = await withChromium(HTML, css, (page) =>
      page.evaluate(() => getComputedStyle(document.getElementById('bg')!).backgroundColor),
    )
    const bgDark = await withChromium(HTML, css, (page) =>
      page.evaluate(() => getComputedStyle(document.getElementById('bg')!).backgroundColor),
      { theme: 'dark' },
    )
    expect(bgLight).not.toBe(bgDark)

    const padding = await withChromium(HTML, css, (page) =>
      page.evaluate(() => getComputedStyle(document.getElementById('pad')!).paddingLeft),
    )
    expect(padding).toBe('16px')

    const textStyle = await withChromium(HTML, css, (page) =>
      page.evaluate(() => {
        const el = document.getElementById('text')!
        const cs = getComputedStyle(el)
        return { fontSize: cs.fontSize, lineHeight: cs.lineHeight }
      }),
    )
    expect(textStyle.fontSize).toBe('24px')
    expect(textStyle.lineHeight).toBe('30px')

    const bgAt1000 = await withChromium(
      HTML,
      css,
      (page) => page.evaluate(() => getComputedStyle(document.getElementById('responsive')!).backgroundColor),
      { width: 1000 },
    )
    const bgAt400 = await withChromium(
      HTML,
      css,
      (page) => page.evaluate(() => getComputedStyle(document.getElementById('responsive')!).backgroundColor),
      { width: 400 },
    )
    expect(bgAt1000).toBe(bgLight)
    expect(bgAt400).toBe('rgba(0, 0, 0, 0)')
  })

  test('7) `shadow-md` свопится под `[data-theme=dark]` (var()-исключение)', async () => {
    const css = await compileFixture()

    const shadowLight = await withChromium(HTML, css, (page) =>
      page.evaluate(() => getComputedStyle(document.getElementById('shadow')!).boxShadow),
    )
    const shadowDark = await withChromium(
      HTML,
      css,
      (page) => page.evaluate(() => getComputedStyle(document.getElementById('shadow')!).boxShadow),
      { theme: 'dark' },
    )
    expect(shadowLight).not.toBe(shadowDark)
  })
})
