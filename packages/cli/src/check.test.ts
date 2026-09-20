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

  it('coverage:false и contrast:false оставляют только hardcode-линтер', async () => {
    const { findings } = await runCheck({
      cwd,
      config: 'theme.config.ts',
      coverage: false,
      contrast: false,
    })

    expect(findings.some((f) => f.rule === 'token-coverage' && f.level === 'error')).toBe(false)
    expect(findings.some((f) => f.rule === 'contrast')).toBe(false)
    expect(findings.some((f) => f.rule === 'hardcode')).toBe(true)
  })

  it('пустой скан (нет совпадающих src) → warning no sources scanned', async () => {
    const { findings, ok } = await runCheck({
      cwd,
      config: 'theme.config.ts',
      src: ['**/*.tsx'],
    })

    expect(findings).toContainEqual(
      expect.objectContaining({ level: 'warning', rule: 'token-coverage', message: 'no sources scanned' }),
    )
    expect(ok).toBe(true)
  })

  it('чистый проект (нет var()-ссылок, нет литералов) → ok:true, нет findings', async () => {
    writeFileSync(join(cwd, 'app.css'), '.clean { color: black; }\n', 'utf8')

    const { findings, ok } = await runCheck({ cwd, config: 'theme.config.ts' })

    expect(ok).toBe(true)
    expect(findings.filter((f) => f.level === 'error')).toHaveLength(0)
  })
})

/**
 * `themeon check --tenant` (P6.3, H3 И2) — fail-closed APCA-гейт публикации tenant-темы e2e.
 * Тёмная база (текст/фон из `packages/colors/src/contrast.test.ts` P8.6 Major #15 —
 * `--color-bg-elevated` полупрозрачен, `--color-bg-page` — фактическая непрозрачная подложка)
 * даёт возможность проверить и композицию `applyThemePatch`+`checkThemeContrast`, и
 * fail-closed на всех трёх путях (валидация патча / парсинг цвета / `pass===false`) одним
 * фикстурным набором.
 */
const TENANT_FIXTURE_CONFIG = `import { defineTheme } from '@themeon/core'

export default defineTheme({
  base: {
    color: {
      text: '#e3e5e9',
      bg: {
        page: '#131313',
        elevated: 'rgba(37, 37, 37, 0.6)',
      },
    },
    space: { gap: '8px' },
  },
})
`

describe('runCheck --tenant (fail-closed APCA-гейт публикации, P6.3, H3 И2)', () => {
  let cwd: string

  beforeAll(async () => {
    ;({ runCheck } = await jiti.import<CheckModule>(join(import.meta.dirname, 'commands', 'check.ts'), {}))
  })

  beforeEach(() => {
    cwd = mkdtempSync(join(import.meta.dirname, '.tmp-check-tenant-'))
    writeFileSync(join(cwd, 'theme.config.ts'), TENANT_FIXTURE_CONFIG, 'utf8')
  })

  afterEach(() => {
    rmSync(cwd, { recursive: true, force: true })
  })

  function writePatch(patch: unknown): void {
    writeFileSync(join(cwd, 'patch.json'), JSON.stringify(patch), 'utf8')
  }

  it('(1) валидный высококонтрастный патч → ok:true, exit 0 (нет error-findings)', async () => {
    writePatch({ color: { text: '#ffffff' } })

    const { findings, ok } = await runCheck({ cwd, config: 'theme.config.ts', tenant: 'patch.json' })

    expect(ok).toBe(true)
    expect(findings.filter((f) => f.level === 'error')).toHaveLength(0)
  })

  it('(2) валидный низкоконтрастный патч (текст почти сливается с фоном) → ok:false, отчёт пары', async () => {
    writePatch({ color: { text: '#151515' } })

    const { findings, ok } = await runCheck({ cwd, config: 'theme.config.ts', tenant: 'patch.json' })

    expect(ok).toBe(false)
    expect(findings).toContainEqual(
      expect.objectContaining({ level: 'error', rule: 'contrast', message: expect.stringContaining('text/bg.page') }),
    )
  })

  it('(3) невалидный патч (UNKNOWN_PATH) → ok:false, fail-closed на валидации, не на контрасте', async () => {
    writePatch({ nope: 'x' })

    const { findings, ok } = await runCheck({ cwd, config: 'theme.config.ts', tenant: 'patch.json' })

    expect(ok).toBe(false)
    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatchObject({ level: 'error', rule: 'contrast', code: 'THEMEON_PATCH_POLICY' })
    expect(findings[0]!.message).toContain('validation failed')
    expect(findings[0]!.message).toContain('outside the selected trust policy')
  })

  it('(4) тёмная тема + полупрозрачный `--color-bg-elevated` → корректный |Lc|, не false-pass/throw (сторож Major #15)', async () => {
    // Патч не трогает цвета (тот же полупрозрачный `bg.elevated`, что и база) — сторожит, что
    // `lookup` гейта сохраняет `--color-bg-page` как подложку для `flattenAlpha` (иначе throw
    // `ALPHA_NEEDS_BASE`) и корректно композитит на фактическую тёмную подложку, а не на
    // безусловный белый (Major #15) — оба привели бы к `ok:false`/throw вместо ожидаемого pass.
    writePatch({})

    const { findings, ok } = await runCheck({ cwd, config: 'theme.config.ts', tenant: 'patch.json' })

    expect(ok).toBe(true)
    expect(findings.filter((finding) => finding.level === 'error')).toHaveLength(0)
  })

  it('(5) патч без цветов → ok:true (легальный pass — нечего проверять сверх базы)', async () => {
    writePatch({})

    const { findings, ok } = await runCheck({ cwd, config: 'theme.config.ts', tenant: 'patch.json' })

    expect(ok).toBe(true)
    expect(findings).toHaveLength(0)
  })

  it('нечитаемый/невалидный JSON патч-файла → ok:false, fail-closed, не throw наружу', async () => {
    writeFileSync(join(cwd, 'patch.json'), '{ not valid json', 'utf8')

    const { findings, ok } = await runCheck({ cwd, config: 'theme.config.ts', tenant: 'patch.json' })

    expect(ok).toBe(false)
    expect(findings[0]).toMatchObject({ level: 'error', rule: 'contrast' })
  })
})
