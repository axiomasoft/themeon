import { join } from 'node:path'
import { describe, expect, test } from 'vitest'
import { defineTheme } from '@themeon/core'
import { themeon } from '@themeon/vite'
import { mkFixture, rmFixture } from '../helpers/fixture'
import { viteBuild } from '../helpers/vite-build'

/**
 * `@themeon/vite` — рабочий канал подключения (P8.2, Blocker #1 + Major #18).
 * Настоящая труба: `build()` из `vite`, никаких моков `ViteDevServer`/`environment`.
 * `findings/P8-vite-channel-hmr.md` §7 (T1, регресс-тест на #1/#3, T6, T7).
 */

const theme = defineTheme({
  base: { color: { action: { primary: 'oklch(0.55 0.15 255)' } }, bg: { page: 'oklch(1 0 0)' } },
  themes: { dark: { color: { action: { primary: 'oklch(0.7 0.15 255)' } } } },
})

const INDEX_HTML = '<!doctype html><html><body><script type="module" src="/main.js"></script></body></html>'

describe('@themeon/vite — канал подключения (build)', () => {
  // T1: канонический канал — регрессионный якорь.
  test('JS-энтри `import "virtual:themeon.css"` доезжает до выходного CSS', async () => {
    const dir = mkFixture('vite-plugin', {
      'index.html': INDEX_HTML,
      'main.js': `import 'virtual:themeon.css'\n`,
    })
    try {
      const { css } = await viteBuild(dir, { plugins: [themeon({ theme })] })
      expect(css).toMatch(/--color-action-primary:\s*oklch\(0\.55 0\.15 255\)/)
      expect(css).toMatch(/\[data-theme="dark"\][^}]*--color-action-primary:\s*oklch\(0\.7 0\.15 255\)/)
    } finally {
      rmFixture(dir)
    }
  })

  // Blocker #1 (аудит) / D1 (findings §4): CSS-`@import` виртуального модуля физически
  // невозможен — postcss-import резолвит по ФС, плагинные хуки не участвуют. Красный до фикса
  // и ПОСЛЕ него — это регресс-тест, фиксирующий контракт «канон — только import из JS».
  test('CSS-`@import "virtual:themeon.css"` не резолвится (регресс-тест на контракт)', async () => {
    const dir = mkFixture('vite-plugin', {
      'index.html': INDEX_HTML,
      'main.js': `import './style.css'\n`,
      'style.css': `@import 'virtual:themeon.css';\nbody { background: red; }\n`,
    })
    try {
      await expect(viteBuild(dir, { plugins: [themeon({ theme })] })).rejects.toThrow()
    } finally {
      rmFixture(dir)
    }
  })
})

describe('@themeon/vite — `cssImport` (CSS-first канал без JS-энтри)', () => {
  // T6: build зелёный, оба `@import` живы (реальный файл на диске вместо virtual-модуля).
  test('CSS-энтри с двумя `@import` собирается: токены и второй импорт присутствуют', async () => {
    const dir = mkFixture('vite-plugin-cssimport', {
      'index.html': INDEX_HTML,
      'style.css': `@import 'virtual:themeon.css';\n@import './other.css';\n`,
      'other.css': `.other-marker { color: red; }\n`,
    })
    try {
      const { css } = await viteBuild(dir, {
        plugins: [themeon({ theme, cssImport: true })],
        rollupOptions: { input: join(dir, 'style.css') },
      })
      expect(css).toMatch(/--color-action-primary:\s*oklch\(0\.55 0\.15 255\)/)
      expect(css).toContain('.other-marker')
    } finally {
      rmFixture(dir)
    }
  })

  // T7: анти-регресс на «тихую потерю второго @import» — ровно тот класс дефекта, из-за
  // которого был отвергнут вариант `enforce:'pre'` + инлайн (findings §5, Отвергнутые варианты).
  test('второй `@import` не выброшен молча (анти-регресс на отвергнутый inline-вариант)', async () => {
    const dir = mkFixture('vite-plugin-cssimport', {
      'index.html': INDEX_HTML,
      'style.css': `@import 'virtual:themeon.css';\n@import './brand.css';\n`,
      'brand.css': `.brand-marker-unique-9f2c { color: blue; }\n`,
    })
    try {
      const { css } = await viteBuild(dir, {
        plugins: [themeon({ theme, cssImport: { file: '.themeon-custom/out.css' } })],
        rollupOptions: { input: join(dir, 'style.css') },
      })
      expect(css).toContain('.brand-marker-unique-9f2c')
    } finally {
      rmFixture(dir)
    }
  })
})
