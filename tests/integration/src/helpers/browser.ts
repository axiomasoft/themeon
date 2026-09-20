import { chromium, firefox, webkit, type Browser, type BrowserType } from 'playwright'

export type BrowserName = 'chromium' | 'firefox' | 'webkit'

let browserPromise: Promise<Browser> | undefined

/** Periodic lane sets `THEMEON_CROSS_BROWSER=firefox|webkit`; PR smoke stays on Chromium. */
export function activeBrowserName(): BrowserName {
  const raw = process.env.THEMEON_CROSS_BROWSER
  if (raw === 'firefox' || raw === 'webkit') return raw
  return 'chromium'
}

function browserType(name: BrowserName): BrowserType {
  if (name === 'firefox') return firefox
  if (name === 'webkit') return webkit
  return chromium
}

function getBrowser(): Promise<Browser> {
  browserPromise ??= browserType(activeBrowserName()).launch()
  return browserPromise
}

export async function closeBrowser(): Promise<void> {
  if (!browserPromise) return
  const browser = await browserPromise
  browserPromise = undefined
  await browser.close()
}

export interface BrowserPageOptions {
  theme?: string
  width?: number
  height?: number
  /** Runs in the page before document scripts (Playwright `addInitScript`). */
  initScripts?: string[]
  /** Extra markup inserted into `<head>` after the inline `<style>`. */
  headHtml?: string
}

export async function withBrowserPage<T>(
  html: string,
  css: string,
  fn: (page: import('playwright').Page) => Promise<T>,
  options: BrowserPageOptions = {},
): Promise<T> {
  const browser = await getBrowser()
  const page = await browser.newPage({
    viewport: { width: options.width ?? 1280, height: options.height ?? 600 },
  })
  try {
    for (const source of options.initScripts ?? []) {
      await page.addInitScript(source)
    }
    await page.setContent(
      `<!doctype html><html${options.theme ? ` data-theme="${options.theme}"` : ''}>` +
        `<head><style>${css}</style>${options.headHtml ?? ''}</head><body>${html}</body></html>`,
    )
    return await fn(page)
  } finally {
    await page.close()
  }
}
