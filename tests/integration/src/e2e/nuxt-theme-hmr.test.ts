import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { mkFixture, rmFixture } from '../helpers/fixture'
import { spawnNuxtDev } from '../helpers/nuxt-dev'

/**
 * P8.4 T1 (findings/P8-nuxt-vue-runtime.md §5): живой `nuxt dev` на теме `export default
 * defineTheme(...)` (форма `themeon init`, замороженный объект — Blocker §0) — codegen обязан
 * подняться, а правка темы И правка ФАЙЛА, который тема ИМПОРТИРУЕТ, обязаны обновлять
 * `.nuxt/themeon-tokens.css` без ручного рестарта (Major #19).
 */

async function pollUntil(fn: () => boolean, timeoutMs = 15_000, stepMs = 200): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (fn()) return
    await new Promise((resolve) => setTimeout(resolve, stepMs))
  }
  throw new Error(`условие не выполнилось за ${timeoutMs}ms`)
}

describe('живой nuxt dev — codegen + theme-HMR (P8.4)', () => {
  let dir: string | undefined
  let stop: (() => Promise<void>) | undefined

  afterEach(async () => {
    await stop?.()
    stop = undefined
    if (dir) rmFixture(dir)
    dir = undefined
  })

  test(
    'export default defineTheme(...) поднимается; правка темы и правка импортируемого файла обновляют CSS',
    async () => {
      dir = mkFixture('nuxt-theme-hmr', {
        'nuxt.config.ts': `export default defineNuxtConfig({\n  compatibilityDate: '2026-07-14',\n  modules: ['@themeon/nuxt'],\n  themeon: { theme: './theme/theme.config.ts' },\n})\n`,
        'app.vue': '<template><div>nuxt-theme-hmr fixture</div></template>\n',
        'theme/theme.config.ts':
          "import { defineTheme } from '@themeon/core'\nimport { primary } from './palette'\n\n" +
          'export default defineTheme({\n' +
          "  base: { color: { action: { primary }, bg: { page: 'oklch(1 0 0)' } } },\n" +
          '})\n',
        'theme/palette.ts': "export const primary = 'oklch(0.42 0.2 30)'\n",
      })

      const handle = await spawnNuxtDev(dir)
      stop = handle.stop

      // Blocker §0 регресс-гейт: `export default` — форма `themeon init`. На старом `importModule`
      // codegen падал на `setup()` ещё до первого запроса.
      const res = await fetch(handle.url)
      expect(res.status).toBe(200)

      const readCss = (): string => readFileSync(handle.tokensCssPath, 'utf8')
      await pollUntil(() => readCss().includes('--color-action-primary: oklch(0.42 0.2 30)'))

      // Правка файла темы (entry) — dev-watcher обязан перегенерировать CSS.
      writeFileSync(
        join(dir, 'theme/theme.config.ts'),
        "import { defineTheme } from '@themeon/core'\nimport { primary } from './palette'\n\n" +
          'export default defineTheme({\n' +
          "  base: { color: { action: { primary }, bg: { page: 'oklch(0.5 0 0)' } } },\n" +
          '})\n',
      )
      await pollUntil(() => readCss().includes('--color-bg-page: oklch(0.5 0 0)'))
      expect(readCss()).toContain('--color-action-primary: oklch(0.42 0.2 30)')

      // Правка файла, который тема ИМПОРТИРУЕТ (не entry) — доказывает ре-эвалуацию ВСЕГО графа,
      // а не только entry-файла (регрессия `?v=`-cache-busting, findings §1).
      writeFileSync(join(dir, 'theme/palette.ts'), "export const primary = 'oklch(0.77 0.1 90)'\n")
      await pollUntil(() => readCss().includes('--color-action-primary: oklch(0.77 0.1 90)'))
    },
    45_000,
  )
})
