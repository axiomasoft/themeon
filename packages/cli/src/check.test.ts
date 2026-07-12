import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createJiti } from 'jiti'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { CheckOptions } from './commands/check'

/**
 * `themeon check` e2e (P4.5) — тот же jiti-паттерн, что `build.test.ts` (P4.4 Known
 * Deviation): `runCheck` изнутри вызывает `loadThemeConfig` (jiti-native `@themeon/core`),
 * поэтому сам тест грузит `commands/check.ts` через ТОТ ЖЕ jiti-инстанс, а не обычным ESM
 * `import` — иначе Vitest SSR-граф и jiti-native дают два разных экземпляра `@themeon/core`
 * с несовпадающим `TOKEN_BRAND`. Фикстура-tmpdir создаётся ВНУТРИ `src/` (bare-specifier'ы
 * резолвятся по расположению загружаемого файла), git-игнорируется (`.tmp-*`).
 */

const FIXTURE_CONFIG = `import { defineTokens, defineTheme } from '@themeon/core'

const palette = defineTokens('color', { neutral: { 900: '#111111' } })

export default defineTheme({
  base: {
    color: {
      text: palette.neutral[900],
      bg: { page: '#ffffff' },
    },
  },
})
`

// `.a` ссылается на существующий `--color-text` и на несуществующий `--color-nope` (мёртвая
// ссылка = error); `.b` содержит сырой hex (hardcode = warning).
const FIXTURE_APP_CSS = `.a { color: var(--color-text); background: var(--color-nope); }
.b { color: #ff0000; }
`

const jiti = createJiti(import.meta.url, {
  nativeModules: ['@themeon/core', '@themeon/tailwind', '@themeon/colors'],
})

interface CheckModule {
  runCheck: (opts: CheckOptions) => Promise<{ findings: { level: string; rule: string; message: string }[]; ok: boolean }>
}

let runCheck: CheckModule['runCheck']

describe('runCheck', () => {
  let cwd: string

  beforeAll(async () => {
    ;({ runCheck } = await jiti.import<CheckModule>(join(import.meta.dirname, 'commands', 'check.ts'), {}))
  })

  beforeEach(() => {
    cwd = mkdtempSync(join(import.meta.dirname, '.tmp-check-'))
    writeFileSync(join(cwd, 'theme.config.ts'), FIXTURE_CONFIG, 'utf8')
    writeFileSync(join(cwd, 'app.css'), FIXTURE_APP_CSS, 'utf8')
  })

  afterEach(() => {
    rmSync(cwd, { recursive: true, force: true })
  })

  it('фикстура со смешанными нарушениями → ok:false, есть coverage-error и hardcode-warning', async () => {
    const { findings, ok } = await runCheck({ cwd, config: 'theme.config.ts' })

    expect(ok).toBe(false)
    expect(findings).toContainEqual(
      expect.objectContaining({ level: 'error', rule: 'token-coverage', message: 'dead var reference --color-nope' }),
    )
    expect(findings).toContainEqual(expect.objectContaining({ level: 'warning', rule: 'hardcode' }))
  })

  it('hardcode:false убирает hardcode-находки, ok остаётся false из-за coverage-error', async () => {
    const { findings, ok } = await runCheck({ cwd, config: 'theme.config.ts', hardcode: false })

    expect(findings.some((f) => f.rule === 'hardcode')).toBe(false)
    expect(ok).toBe(false)
  })

  it('чистый проект (нет var()-ссылок, нет литералов) → ok:true, нет findings', async () => {
    writeFileSync(join(cwd, 'app.css'), '.clean { color: black; }\n', 'utf8')

    const { findings, ok } = await runCheck({ cwd, config: 'theme.config.ts' })

    expect(ok).toBe(true)
    expect(findings.filter((f) => f.level === 'error')).toHaveLength(0)
  })
})
