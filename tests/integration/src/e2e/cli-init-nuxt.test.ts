import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
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
 * не на директорию темы. Тест правит СГЕНЕРИРОВАННЫЙ `init`-скаффолд после старта и ждёт, пока
 * dev-watcher перегенерирует CSS БЕЗ ручного рестарта — доказывает, что watcher реально реагирует
 * на файл именно там, где `init` его положил (не в rootDir). Различение «рестарт vs granular-HMR»
 * само по себе — отдельный известный долг (P8.4 review finding, см. `phases/P8.md` Open risks),
 * здесь не переоткрывается.
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
    'init скаффолдит theme/theme.config.ts — nuxt dev поднимается, грузит тему и подхватывает правку без ручного рестарта',
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

      // Правка РЕАЛЬНОГО init-скаффолда (не ручной фикстуры) — dev-watcher обязан среагировать
      // и без перезапуска процесса пересобрать `.nuxt/themeon-tokens.css` (MED#2 adversarial-
      // review commit 04aec27: старый тест поднимал сервер, но не проверял, что watcher вообще
      // следит за файлом именно там, куда его положил `init`).
      const themeConfigPath = join(dir, 'theme', 'theme.config.ts')
      const original = readFileSync(themeConfigPath, 'utf8')
      expect(original).toContain("page: 'oklch(1 0 0)'")
      writeFileSync(themeConfigPath, original.replace("page: 'oklch(1 0 0)'", "page: 'oklch(0.5 0 0)'"))

      await pollUntil(() => readFileSync(handle.tokensCssPath, 'utf8').includes('--color-bg-page: oklch(0.5 0 0)'))
    },
    45_000,
  )
})
