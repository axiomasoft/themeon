import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { afterAll, describe, expect, test } from 'vitest'
import { closeChromium, withChromium } from '../helpers/chromium'

/**
 * `@themeon/css` — самодостаточность `composition.css` БЕЗ `reset.css` (P8.7, аудит #26,
 * findings/P8-css-layers-cli-checks.md §2). `.container`/`.cover`/`.with-sidebar` объявляют
 * `box-sizing: border-box` локально — импорт ТОЛЬКО `composition.css` (без reset) обязан дать
 * тот же геометрический результат, что документированный контракт, а не UA content-box.
 */

// UA-дефолтный `body { margin: 8px }` не входит в скоуп composition.css (это ответственность
// reset.css) — обнуляем его отдельно, чтобы тест мерил ИМЕННО инвариант composition-примитивов,
// а не побочный документ-скролл от UA-стилей, которые reset.css чинит в другом item'е.
const CSS =
  readFileSync(fileURLToPath(new URL('../../../../packages/css/dist/composition.css', import.meta.url)), 'utf-8') +
  '\nbody { margin: 0; }\n'

describe('@themeon/css — composition.css самодостаточен без reset.css', () => {
  afterAll(async () => {
    await closeChromium()
  })

  test('.container == --container-max (72rem == 1152px), а не UA content-box (1184px)', async () => {
    const width = await withChromium(
      `<div class="container" id="c">x</div>`,
      CSS,
      (page) => page.evaluate(() => document.getElementById('c')!.offsetWidth),
      { width: 1600, height: 900 },
    )
    expect(width).toBe(1152)
  })

  test('.cover == 100svh, без постоянного вертикального скролла', async () => {
    const html = `<div class="cover" id="cv"><header>a</header><main class="cover-center">b</main><footer>c</footer></div>`
    const { coverHeight, hasScroll } = await withChromium(
      html,
      CSS,
      (page) =>
        page.evaluate(() => {
          const cover = document.getElementById('cv')!
          return {
            coverHeight: cover.offsetHeight,
            hasScroll: document.documentElement.scrollHeight > document.documentElement.clientHeight,
          }
        }),
      { width: 1600, height: 813 },
    )
    expect(coverHeight).toBe(813)
    expect(hasScroll).toBe(false)
  })

  test('.with-sidebar > :first-child ≈ --sidebar-width (20rem == 320px) при паддинге у ребёнка', async () => {
    const html =
      `<div class="with-sidebar" id="ws" style="--sidebar-width: 20rem;">` +
      `<div style="padding: 24px;">sidebar</div><div>content</div></div>`
    const width = await withChromium(
      html,
      CSS,
      (page) => page.evaluate(() => (document.getElementById('ws')!.firstElementChild as HTMLElement).offsetWidth),
      { width: 1600, height: 900 },
    )
    expect(Math.abs(width - 320)).toBeLessThanOrEqual(2)
  })

  test('.center остаётся content-box, в т.ч. прямым ребёнком .with-sidebar', async () => {
    const html = `<div class="with-sidebar" id="ws"><div class="center" id="ct" style="padding-inline: 24px;">x</div><div>content</div></div>`
    const boxSizing = await withChromium(
      html,
      CSS,
      (page) => page.evaluate(() => getComputedStyle(document.getElementById('ct')!).boxSizing),
      { width: 1600, height: 900 },
    )
    expect(boxSizing).toBe('content-box')
  })
})
