import { describe, expect, test } from 'vitest'
import { mkFixture, rmFixture } from '../helpers/fixture'
import { viteBuild } from '../helpers/vite-build'

/**
 * Laravel-канал A (P6.4, `docs/laravel.md`): `@import "@themeon/css/tokens.css"` в CSS-entry
 * резолвится настоящим `vite build` (постcss-import через package `exports`-подпуть), а НЕ мокается
 * границей резолва (класс дефекта P8 Blocker #1). Сторож-антипод: канал B
 * (`virtual:themeon.css`, виртуальный модуль `@themeon/vite`) НИКОГДА не резолвится из CSS
 * `@import` без плагина в графе — билд обязан упасть, иначе тест выше ничего не сторожит
 * (R-16 §1).
 */
describe('Laravel + Vite — резолв канала A (@import "@themeon/css/tokens.css")', () => {
  test('канал A: CSS @import резолвится реальным vite build, --color-*/--radius-* в выходном CSS', async () => {
    const dir = mkFixture('laravel-css-import-a', {
      'index.html': '<!doctype html><html><head><link rel="stylesheet" href="/app.css"></head><body></body></html>',
      'app.css': `@import "@themeon/css/tokens.css";\n@import "@themeon/css/index.css";\n`,
    })
    try {
      const { css } = await viteBuild(dir)
      expect(css).toContain('--color-bg-page')
      expect(css).toContain('--radius-md')
    } finally {
      rmFixture(dir)
    }
  })

  test('сторож-антипод: @import "virtual:themeon.css" (канал B) без @themeon/vite в графе — билд падает', async () => {
    const dir = mkFixture('laravel-css-import-b-antipode', {
      'index.html': '<!doctype html><html><head><link rel="stylesheet" href="/app.css"></head><body></body></html>',
      'app.css': `@import "virtual:themeon.css";\n`,
    })
    try {
      await expect(viteBuild(dir)).rejects.toThrow()
    } finally {
      rmFixture(dir)
    }
  })
})
