import { afterAll, describe, expect, test } from 'vitest'
import { activeBrowserName, closeBrowser, withBrowserPage } from '../helpers/browser'
import { canonicalThemeCss } from '../conformance/compiled-contract'

/**
 * Periodic Firefox/WebKit lane (P2.6). Skipped on PR Chromium smoke unless
 * `THEMEON_CROSS_BROWSER=firefox|webkit` is set (see `.github/workflows/browser.yml`).
 */
describe.skipIf(activeBrowserName() === 'chromium')('cross-browser compiled contract smoke', () => {
  afterAll(async () => {
    await closeBrowser()
  })

  test('resolved theme CSS applies on [data-theme=dark]', async () => {
    const css = canonicalThemeCss()
    const color = await withBrowserPage(
      '<div id="t">x</div>',
      `${css} #t { color: var(--color-action-primary); }`,
      (page) => page.evaluate(() => getComputedStyle(document.getElementById('t')!).color),
      { theme: 'dark' },
    )
    expect(color).not.toBe('rgb(0, 0, 0)')
    expect(color).not.toBe('')
  })
})
