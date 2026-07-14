import { readFileSync } from 'node:fs'
import { runInit } from 'themeon'
import { afterEach, describe, expect, test } from 'vitest'
import { mkFixture, rmFixture } from '../helpers/fixture'
import { spawnNuxtDev } from '../helpers/nuxt-dev'

/**
 * P8.13 (`findings/P8-nuxt-vue-runtime.md` §2, `findings/P8-css-layers-cli-checks.md` §4):
 * связка `themeon init` → `nuxt dev` целиком, а не по частям — `runInit` пишет РЕАЛЬНЫЙ
 * скаффолд (`theme/theme.config.ts`, не rootDir), а не ручную фикстуру (как `nuxt-theme-hmr.
 * test.ts` P8.4). Регресс-гейт: до P8.13 `init` писал `theme.config.ts` в корень проекта —
 * `tokensDir === rootDir` заставил бы dev-watcher подписаться на весь проект (findings §2), а
 * не на директорию темы.
 */
async function pollUntil(fn: () => boolean, timeoutMs = 15_000, stepMs = 200): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (fn()) return
    await new Promise((resolve) => setTimeout(resolve, stepMs))
  }
  throw new Error(`условие не выполнилось за ${timeoutMs}ms`)
}

describe('themeon init → nuxt dev (P8.13)', () => {
  let dir: string | undefined
  let stop: (() => Promise<void>) | undefined

  afterEach(async () => {
    await stop?.()
    stop = undefined
    if (dir) rmFixture(dir)
    dir = undefined
  })

  test(
    'init скаффолдит theme/theme.config.ts — связка с nuxt dev поднимается и грузит тему',
    async () => {
      dir = mkFixture('cli-init-nuxt', {
        'nuxt.config.ts':
          "export default defineNuxtConfig({\n  compatibilityDate: '2026-07-14',\n  modules: ['@themeon/nuxt'],\n  themeon: { theme: './theme/theme.config.ts' },\n})\n",
        'app.vue': '<template><div>cli-init-nuxt fixture</div></template>\n',
      })

      const { created } = runInit({ cwd: dir })
      // Регресс-гейт формы: скаффолд обязан лежать НЕ в rootDir (P8.13, findings §2).
      expect(created).toContain('theme/theme.config.ts')

      const handle = await spawnNuxtDev(dir)
      stop = handle.stop

      const res = await fetch(handle.url)
      expect(res.status).toBe(200)

      await pollUntil(() => readFileSync(handle.tokensCssPath, 'utf8').includes('--color-bg-page'))
    },
    45_000,
  )
})
