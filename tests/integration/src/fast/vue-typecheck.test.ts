import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'

/**
 * T6 (findings/P8-nuxt-vue-runtime.md §5) — CI-гейт: реальный `vue-tsc` на СОБРАННОМ
 * `@themeon/vue/dist` (не `src` — аугментация обязана ПЕРЕЖИТЬ сборку tsdown, аудит #27).
 * Требует `pnpm build` перед прогоном (`test:int` уже делает это, package.json).
 */
const VUE_TSC = join(import.meta.dirname, '..', '..', 'node_modules', '.bin', 'vue-tsc')
const FIXTURE = join(import.meta.dirname, '..', '..', 'fixtures', 'vue-consumer')
const VUE_DIST_INDEX_DTS = join(import.meta.dirname, '..', '..', 'node_modules', '@themeon', 'vue', 'dist', 'index.d.ts')
const VUE_DIST_ANTI_FOUC_DTS = join(
  import.meta.dirname,
  '..',
  '..',
  'node_modules',
  '@themeon',
  'vue',
  'dist',
  'anti-fouc.d.ts',
)

describe('@themeon/vue: vue-tsc на реальном потребителе из dist', () => {
  test('dist/index.d.ts несёт аугментацию ComponentCustomProperties.$theme', () => {
    expect(readFileSync(VUE_DIST_INDEX_DTS, 'utf8')).toContain('ComponentCustomProperties')
  })

  test('pure-подпуть ./anti-fouc НЕ течёт аугментацией', () => {
    expect(readFileSync(VUE_DIST_ANTI_FOUC_DTS, 'utf8')).not.toContain('ComponentCustomProperties')
  })

  test('<button @click="$theme.toggle()">{{ $theme.theme }}</button> компилируется без ошибок', () => {
    const result = spawnSync(VUE_TSC, ['--project', join(FIXTURE, 'tsconfig.json')], {
      encoding: 'utf8',
    })
    expect(result.stdout + result.stderr).not.toMatch(/TS2339/)
    expect(result.status).toBe(0)
  })
})
