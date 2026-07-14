import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterAll, describe, expect, test } from 'vitest'
import { spawnNuxtDev } from '../helpers/nuxt-dev'

const FIXTURE = join(import.meta.dirname, '..', '..', 'fixtures', 'nuxt-app')

describe('spawnNuxtDev — хелпер поднимает настоящий nuxt dev', () => {
  let stop: (() => Promise<void>) | undefined

  afterAll(async () => {
    await stop?.()
  })

  // Фикстура держит РАБОЧУЮ (именованную) форму экспорта темы — это self-test стенда, не
  // проверка блокера 5a (`export default` не грузится никогда, чинит P8.4).
  test(
    'стартует на теме именованного экспорта и отдаёт токены в themeon-tokens.css',
    async () => {
      const handle = await spawnNuxtDev(FIXTURE)
      stop = handle.stop

      const res = await fetch(handle.url)
      expect(res.status).toBe(200)

      const css = readFileSync(handle.tokensCssPath, 'utf8')
      expect(css).toMatch(/--color-action-primary:\s*oklch\(0\.42 0\.2 30\)/)
    },
    45_000,
  )
})
