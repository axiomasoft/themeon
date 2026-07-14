import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { afterAll, describe, expect, test } from 'vitest'
import { closeChromium, withChromium } from '../helpers/chromium'

/**
 * `@themeon/css` — блюпринты (`@layer themeon.blueprints`), README рецепты
 * (`.page-shell`/`.site-header`+`.site-nav`/`.hero`/`.section`/`.site-footer`) без покрывающего
 * теста — контракт-тест (`contract.test.ts`) проверяет только присутствие var-имён, не
 * фактическое поведение. P8.14 (README-грep: «рецепт без теста → убрать») — здесь тест вместо
 * удаления, т.к. рецепты рабочие (эмпирика ниже, реальный Chromium).
 */

// UA-дефолтный `body { margin: 8px }` вне скоупа blueprints.css (ответственность reset.css,
// проверяется в другом item'е) — обнуляем отдельно, как в css-composition.test.ts.
const CSS =
  readFileSync(fileURLToPath(new URL('../../../../packages/css/dist/blueprints.css', import.meta.url)), 'utf-8') +
  '\nbody { margin: 0; }\n'

describe('@themeon/css — blueprints (README-рецепты)', () => {
  afterAll(async () => {
    await closeChromium()
  })

  test('.page-shell пинит .site-footer к низу короткой страницы (flex column, min-block-size: 100svh)', async () => {
    const html =
      `<body class="page-shell">` +
      `<header class="site-header">h</header>` +
      `<main>short</main>` +
      `<footer class="site-footer" id="f">f</footer>` +
      `</body>`
    const { footerBottom, viewportHeight } = await withChromium(
      html,
      CSS,
      (page) =>
        page.evaluate(() => ({
          footerBottom: document.getElementById('f')!.getBoundingClientRect().bottom,
          viewportHeight: window.innerHeight,
        })),
      { width: 1280, height: 800 },
    )
    expect(Math.abs(footerBottom - viewportHeight)).toBeLessThanOrEqual(1)
  })

  test('.site-header + .site-nav: широкий `page`-контейнер — nav развёрнута, `.nav-burger` скрыт', async () => {
    const html =
      `<div class="page-shell">` +
      `<header class="site-header">` +
      `<a href="/">Brand</a>` +
      `<nav class="site-nav" id="nav"><a href="/a">a</a></nav>` +
      `<button class="nav-burger" id="burger" popovertarget="m">☰</button>` +
      `</header>` +
      `</div>`
    const { navDisplay, burgerDisplay } = await withChromium(
      html,
      CSS,
      (page) =>
        page.evaluate(() => ({
          navDisplay: getComputedStyle(document.getElementById('nav')!).display,
          burgerDisplay: getComputedStyle(document.getElementById('burger')!).display,
        })),
      { width: 1280, height: 600 },
    )
    expect(navDisplay).not.toBe('none')
    expect(burgerDisplay).toBe('none')
  })

  test('.site-header + .site-nav: узкий `page`-контейнер (< 48rem) — nav скрыта, `.nav-burger` показан (@container)', async () => {
    const html =
      `<div class="page-shell">` +
      `<header class="site-header">` +
      `<a href="/">Brand</a>` +
      `<nav class="site-nav" id="nav"><a href="/a">a</a></nav>` +
      `<button class="nav-burger" id="burger" popovertarget="m">☰</button>` +
      `</header>` +
      `</div>`
    const { navDisplay, burgerDisplay } = await withChromium(
      html,
      CSS,
      (page) =>
        page.evaluate(() => ({
          navDisplay: getComputedStyle(document.getElementById('nav')!).display,
          burgerDisplay: getComputedStyle(document.getElementById('burger')!).display,
        })),
      { width: 500, height: 600 },
    )
    expect(navDisplay).toBe('none')
    expect(burgerDisplay).not.toBe('none')
  })

  test('.hero: контент ограничен `--hero-max` (60ch по умолчанию), паддинг из `clamp()` не нулевой', async () => {
    const html = `<section class="hero"><h1 id="h">Ship your design system</h1></section>`
    const { childMaxWidthPx, chWidthPx, padBlockTop } = await withChromium(
      html,
      CSS,
      (page) =>
        page.evaluate(() => {
          const h = document.getElementById('h')!
          // `ch` резолвится от font-size ЭЛЕМЕНТА — пробник должен быть внутри `h1`, не рядом
          // с ним (иначе `ch` считается от font-size секции, а не заголовка).
          const probe = document.createElement('span')
          probe.style.display = 'block'
          probe.style.width = '60ch'
          h.appendChild(probe)
          const chWidthPx = probe.getBoundingClientRect().width
          probe.remove()
          return {
            childMaxWidthPx: parseFloat(getComputedStyle(h).maxWidth),
            chWidthPx,
            padBlockTop: parseFloat(getComputedStyle(h.parentElement!).paddingTop),
          }
        }),
      { width: 1280, height: 900 },
    )
    // Computed style резолвит `max-width: 60ch` в px (браузер не возвращает `ch` обратно) —
    // сверяем с реально измеренной шириной `60ch` в том же контексте шрифта.
    expect(Math.abs(childMaxWidthPx - chWidthPx)).toBeLessThanOrEqual(1)
    expect(padBlockTop).toBeGreaterThan(0)
  })

  test('.section / .section--subtle: модификатор красит фон в `--color-bg-subtle` фолбэк, база — прозрачна', async () => {
    const html = `<section class="section" id="s">a</section><section class="section section--subtle" id="ss">b</section>`
    const { plainBg, subtleBg } = await withChromium(
      html,
      CSS,
      (page) =>
        page.evaluate(() => ({
          plainBg: getComputedStyle(document.getElementById('s')!).backgroundColor,
          subtleBg: getComputedStyle(document.getElementById('ss')!).backgroundColor,
        })),
      { width: 1280, height: 900 },
    )
    expect(subtleBg).not.toBe(plainBg)
    expect(subtleBg).not.toBe('rgba(0, 0, 0, 0)')
  })

  test('.site-footer .footer-cols: auto-fit grid — несколько колонок на широком экране', async () => {
    const html =
      `<footer class="site-footer"><div class="footer-cols" id="cols">` +
      `<div>a</div><div>b</div><div>c</div>` +
      `</div></footer>`
    const columnCount = await withChromium(
      html,
      CSS,
      (page) =>
        page.evaluate(() => getComputedStyle(document.getElementById('cols')!).gridTemplateColumns.split(' ').length),
      { width: 1280, height: 900 },
    )
    expect(columnCount).toBeGreaterThan(1)
  })
})
