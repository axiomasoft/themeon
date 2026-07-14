import { chromium, type Browser, type Page } from 'playwright'

let browserPromise: Promise<Browser> | undefined

function getBrowser(): Promise<Browser> {
  browserPromise ??= chromium.launch()
  return browserPromise
}

/** Закрывает переиспользуемый экземпляр Chromium — звать из `afterAll` вызывающего файла. */
export async function closeChromium(): Promise<void> {
  if (!browserPromise) return
  const browser = await browserPromise
  browserPromise = undefined
  await browser.close()
}

export interface ChromiumOptions {
  theme?: string
  width?: number
  height?: number
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
  const browser = await getBrowser()
  const page = await browser.newPage({
    viewport: { width: options.width ?? 1280, height: options.height ?? 600 },
  })
  try {
    await page.setContent(
      `<!doctype html><html${options.theme ? ` data-theme="${options.theme}"` : ''}>` +
        `<head><style>${css}</style></head><body>${html}</body></html>`,
    )
    return await fn(page)
  } finally {
    await page.close()
  }
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
  const browser = await getBrowser()
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
