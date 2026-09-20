import { chromium, type Browser, type Page } from 'playwright'
import { activeBrowserName, closeBrowser, withBrowserPage } from './browser'

let navBrowserPromise: Promise<Browser> | undefined

function getNavBrowser(): Promise<Browser> {
  navBrowserPromise ??= chromium.launch()
  return navBrowserPromise
}

/** Закрывает переиспользуемый браузер — звать из `afterAll` вызывающего файла. */
export async function closeChromium(): Promise<void> {
  await closeBrowser()
  if (navBrowserPromise) {
    const browser = await navBrowserPromise
    navBrowserPromise = undefined
    await browser.close()
  }
}

export interface ChromiumOptions {
  theme?: string
  width?: number
  height?: number
  initScripts?: string[]
  headHtml?: string
}

/**
 * Тонкий хелпер: ставит `html`+`css` настоящей странице в Chromium и выполняет `fn` на живой
 * странице (обычно `page.evaluate(() => getComputedStyle(...))`). Браузер переиспользуется между
 * вызовами внутри процесса — `closeChromium()` закрывает его.
 */
export async function withChromium<T>(
  html: string,
  css: string,
  fn: (page: Page) => Promise<T>,
  options: ChromiumOptions = {},
): Promise<T> {
  if (activeBrowserName() !== 'chromium') {
    throw new Error('withChromium is PR-lane only; use withBrowserPage for cross-browser periodic tests')
  }
  return withBrowserPage(html, css, fn, options)
}

/**
 * Тонкий хелпер: настоящая навигация Chromium на `url` (для живого dev-сервера, не статический
 * `setContent`) — `fn` получает страницу ПОСЛЕ первой загрузки. Браузер переиспользуется.
 */
export async function withPage<T>(
  url: string,
  fn: (page: Page) => Promise<T>,
  options: Pick<ChromiumOptions, 'width' | 'height'> = {},
): Promise<T> {
  if (activeBrowserName() !== 'chromium') {
    throw new Error('withPage is PR-lane only; use cross-browser helpers for periodic lane')
  }
  const browser = await getNavBrowser()
  const page = await browser.newPage({
    viewport: { width: options.width ?? 1280, height: options.height ?? 600 },
  })
  try {
    await page.goto(url)
    return await fn(page)
  } finally {
    await page.close()
  }
}
