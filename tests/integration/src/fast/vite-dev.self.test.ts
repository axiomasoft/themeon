import { describe, expect, test } from 'vitest'
import { mkFixture, rmFixture } from '../helpers/fixture'
import { withViteDev } from '../helpers/vite-dev'

describe('withViteDev — хелпер поднимает настоящий vite dev server', () => {
  test('отдаёт рабочий URL, GET / отвечает 200', async () => {
    const dir = mkFixture('vite-dev-self', {
      'index.html': '<!doctype html><html><body>themeon-integration-self-test-marker</body></html>',
    })
    try {
      await withViteDev(dir, {}, async ({ url }) => {
        const res = await fetch(url)
        expect(res.ok).toBe(true)
        expect(await res.text()).toContain('themeon-integration-self-test-marker')
      })
    } finally {
      rmFixture(dir)
    }
  })
})
