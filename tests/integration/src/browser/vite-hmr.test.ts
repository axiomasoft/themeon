import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterAll, describe, expect, test } from 'vitest'
import { defineTheme } from '@themeon/core'
import { themeon } from '@themeon/vite'
import { closeChromium, withPage } from '../helpers/chromium'
import { mkFixture, rmFixture } from '../helpers/fixture'
import { withViteDev } from '../helpers/vite-dev'

/**
 * `@themeon/vite` — живой HMR доказывается ЭФФЕКТОМ в реальном Chromium (Implementation Rule 4,
 * P8.2), не фактом отправки сообщения в мок. `theme` читает JSON-файл при каждом вызове —
 * НЕ config-dependency (D4, findings §4): статический `import` темы в `vite.config` даёт
 * рестарт-сервера вместо HMR, здесь мы проверяем именно живой канал.
 * `findings/P8-vite-channel-hmr.md` §7 (T2/T3/T4/T5).
 */

function readTheme(dir: string) {
  const raw = JSON.parse(readFileSync(join(dir, 'theme.config.json'), 'utf8')) as Record<string, unknown>
  return defineTheme(raw as never)
}

async function pollUntil(fn: () => Promise<boolean>, timeoutMs = 5000, stepMs = 50): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await fn()) return
    await new Promise((resolve) => setTimeout(resolve, stepMs))
  }
  throw new Error(`условие не выполнилось за ${timeoutMs}ms`)
}

async function bgPage(page: { evaluate: <T>(fn: () => T) => Promise<T> }): Promise<string> {
  return page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--color-bg-page').trim(),
  )
}

describe('@themeon/vite — живой HMR (dev + Chromium)', () => {
  afterAll(async () => {
    await closeChromium()
  })

  test(
    'правка темы (относительный tokensFiles) меняет CSS-переменную БЕЗ перезагрузки страницы (T2/T3, D3-регресс)',
    async () => {
      const dir = mkFixture('vite-hmr', {
        'index.html':
          '<!doctype html><html><body><script type="module" src="/main.js"></script></body></html>',
        'main.js': `import 'virtual:themeon.css'\nwindow.__themeonNoReloadMark = true\n`,
        'theme.config.json': JSON.stringify({ base: { color: { bg: { page: 'oklch(0.99 0 0)' } } } }),
      })
      try {
        await withViteDev(
          dir,
          {
            plugins: [
              themeon({
                theme: () => readTheme(dir),
                // относительный путь — regress-тест на D3 (hotUpdate({file}) даёт абсолютный)
                tokensFiles: ['theme.config.json'],
              }),
            ],
          },
          async ({ url }) => {
            await withPage(url, async (page) => {
              await pollUntil(async () => (await bgPage(page)) === 'oklch(0.99 0 0)')

              writeFileSync(
                join(dir, 'theme.config.json'),
                JSON.stringify({ base: { color: { bg: { page: 'oklch(0.11 0 0)' } } } }),
              )

              await pollUntil(async () => (await bgPage(page)) === 'oklch(0.11 0 0)')

              // Self-accepting js-update, а не full reload — window-состояние выживает.
              const markSurvived = await page.evaluate(
                () => (window as unknown as { __themeonNoReloadMark?: boolean }).__themeonNoReloadMark,
              )
              expect(markSurvived).toBe(true)
            })
          },
        )
      } finally {
        rmFixture(dir)
      }
    },
    20_000,
  )

  test(
    'файл вне tokensFiles — правка НЕ триггерит апдейт (T5)',
    async () => {
      const dir = mkFixture('vite-hmr-untracked', {
        'index.html':
          '<!doctype html><html><body><script type="module" src="/main.js"></script></body></html>',
        'main.js': `import 'virtual:themeon.css'\n`,
        'theme.config.json': JSON.stringify({ base: { color: { bg: { page: 'oklch(0.99 0 0)' } } } }),
        'unrelated.txt': 'noop',
      })
      try {
        await withViteDev(
          dir,
          { plugins: [themeon({ theme: () => readTheme(dir), tokensFiles: ['theme.config.json'] })] },
          async ({ url }) => {
            await withPage(url, async (page) => {
              await pollUntil(async () => (await bgPage(page)) === 'oklch(0.99 0 0)')

              writeFileSync(join(dir, 'unrelated.txt'), 'changed')
              await new Promise((resolve) => setTimeout(resolve, 300))

              expect(await bgPage(page)).toBe('oklch(0.99 0 0)')
            })
          },
        )
      } finally {
        rmFixture(dir)
      }
    },
    20_000,
  )

  test(
    '`cssImport` канал: правка темы обновляет реальный файл, Chromium видит новое значение (§6.3)',
    async () => {
      const dir = mkFixture('vite-hmr-cssimport', {
        'index.html': '<!doctype html><html><head><link rel="stylesheet" href="/style.css"></head><body></body></html>',
        'style.css': `@import 'virtual:themeon.css';\n`,
        'theme.config.json': JSON.stringify({ base: { color: { bg: { page: 'oklch(0.99 0 0)' } } } }),
      })
      try {
        await withViteDev(
          dir,
          {
            plugins: [
              themeon({
                theme: () => readTheme(dir),
                tokensFiles: ['theme.config.json'],
                cssImport: true,
              }),
            ],
          },
          async ({ url }) => {
            await withPage(url, async (page) => {
              await pollUntil(async () => (await bgPage(page)) === 'oklch(0.99 0 0)')

              writeFileSync(
                join(dir, 'theme.config.json'),
                JSON.stringify({ base: { color: { bg: { page: 'oklch(0.11 0 0)' } } } }),
              )

              await pollUntil(async () => (await bgPage(page)) === 'oklch(0.11 0 0)')
            })
          },
        )
      } finally {
        rmFixture(dir)
      }
    },
    20_000,
  )
})
