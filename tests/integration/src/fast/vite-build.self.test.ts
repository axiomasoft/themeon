import { describe, expect, test } from 'vitest'
import { mkFixture, rmFixture } from '../helpers/fixture'
import { viteBuild } from '../helpers/vite-build'

describe('viteBuild — хелпер гоняет настоящий vite build', () => {
  test('на тривиальном входе возвращает JS-чанк с исходным содержимым', async () => {
    const dir = mkFixture('vite-self', {
      'index.html': '<!doctype html><html><body><script type="module" src="/main.js"></script></body></html>',
      'main.js': `console.log('themeon-integration-self-test-marker')\n`,
    })
    try {
      const { js } = await viteBuild(dir)
      expect(js).toContain('themeon-integration-self-test-marker')
    } finally {
      rmFixture(dir)
    }
  })
})
