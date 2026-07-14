import { afterAll, describe, expect, test } from 'vitest'
import { closeChromium, withChromium } from '../helpers/chromium'

describe('withChromium — хелпер гоняет настоящий Chromium', () => {
  afterAll(async () => {
    await closeChromium()
  })

  test('реальный getComputedStyle резолвит цвет на тривиальной странице', async () => {
    const color = await withChromium('<div id="t">x</div>', '#t { color: red; }', (page) =>
      page.evaluate(() => getComputedStyle(document.getElementById('t')!).color),
    )
    expect(color).toBe('rgb(255, 0, 0)')
  })
})
