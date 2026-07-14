import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createJiti } from 'jiti'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { runInit } from './commands/init'
import type { BuildOptions, BuildResult } from './commands/build'
import type { CheckOptions } from './commands/check'

/**
 * `themeon init → build → check` на РЕАЛЬНОМ скаффолде (P8.13, `findings/
 * P8-css-layers-cli-checks.md` §4.1, Major #22/#23) — воспроизводит и закрывает:
 * - Major #22: дефолтная тема пакета проваливала собственный `check` (пороги CLI расходились
 *   с SSOT `@themeon/colors`);
 * - Major #23: сгенерированные `--out`/`--tailwind` файлы давали ложные hardcode-находки и
 *   съедали unused-детект coverage (`unused = 0` всегда).
 * Code Guidance P8.13: запрещено тестировать `check` на синтетической теме — здесь всегда
 * реальный `runInit`-скаффолд, реальный `resolveTheme`/`checkThemeContrast`.
 *
 * `runBuild`/`runCheck` — через jiti (тот же Known Deviation, что `build.test.ts`/`check.test.ts`
 * P4.4/P4.5): прямой ESM-импорт этого тестового файла создал бы ВТОРОЙ экземпляр `@themeon/core`
 * с несовпадающим `TOKEN_BRAND` относительно jiti-native загрузки `theme/theme.config.ts`,
 * которую делает `loadThemeConfig` изнутри команд. `runInit` не грузит `@themeon/core` в рантайме
 * (пишет шаблон строкой) — обычный ESM-импорт для него безопасен.
 */
const jiti = createJiti(import.meta.url, {
  nativeModules: ['@themeon/core', '@themeon/tailwind', '@themeon/colors'],
})

interface BuildModule {
  runBuild: (opts: BuildOptions) => Promise<BuildResult>
}
interface CheckModule {
  runCheck: (opts: CheckOptions) => Promise<{ findings: { level: string; rule: string; message: string }[]; ok: boolean }>
}

let runBuild: BuildModule['runBuild']
let runCheck: CheckModule['runCheck']

function writeAppCss(cwd: string): void {
  mkdirSync(join(cwd, 'src', 'styles'), { recursive: true })
  writeFileSync(
    join(cwd, 'src', 'styles', 'app.css'),
    '.a { color: var(--color-text); background: var(--color-nope); }\n',
    'utf8',
  )
}

describe('init → build → check на реальном скаффолде (Major #22/#23)', () => {
  let cwd: string

  beforeAll(async () => {
    ;({ runBuild } = await jiti.import<BuildModule>(join(import.meta.dirname, 'commands', 'build.ts'), {}))
    ;({ runCheck } = await jiti.import<CheckModule>(join(import.meta.dirname, 'commands', 'check.ts'), {}))
  })

  beforeEach(() => {
    cwd = mkdtempSync(join(import.meta.dirname, '.tmp-scaffold-'))
  })

  afterEach(() => {
    rmSync(cwd, { recursive: true, force: true })
  })

  it('ручной прогон Validation: init → build(--out/--tailwind) → check без консьюмерских исходников → exit 0', async () => {
    runInit({ cwd })

    await runBuild({
      cwd,
      config: 'theme/theme.config.ts',
      out: 'src/styles/theme.css',
      tailwind: 'src/styles/bridge.css',
    })

    const { findings, ok } = await runCheck({
      cwd,
      config: 'theme/theme.config.ts',
      out: 'src/styles/theme.css',
      tailwind: 'src/styles/bridge.css',
    })

    expect(ok).toBe(true)
    expect(findings.filter((f) => f.rule === 'hardcode')).toHaveLength(0)
    // Нет консьюмерских .css/.vue кроме сгенерированных (оба исключены скановым фильтром) —
    // легитимный «пустой скан» (findings §4.2 п.3), а не ложный «зелёный» результат: сигналится
    // warning'ом, exit остаётся 0 (warning не валит билд).
    expect(findings).toContainEqual(expect.objectContaining({ level: 'warning', message: 'no sources scanned' }))
  })

  it('build --out/--tailwind → check: 0 ложных hardcode на сгенерированных файлах, unused>0, dead-ref сохранён (Major #23)', async () => {
    runInit({ cwd })
    writeAppCss(cwd)

    await runBuild({
      cwd,
      config: 'theme/theme.config.ts',
      out: 'src/styles/theme.css',
      tailwind: 'src/styles/bridge.css',
    })

    const { findings, ok } = await runCheck({
      cwd,
      config: 'theme/theme.config.ts',
      out: 'src/styles/theme.css',
      tailwind: 'src/styles/bridge.css',
    })

    expect(findings.filter((f) => f.rule === 'hardcode')).toHaveLength(0)
    expect(
      findings.some((f) => f.level === 'warning' && f.rule === 'token-coverage' && f.message.startsWith('unused token')),
    ).toBe(true)
    expect(findings).toContainEqual(
      expect.objectContaining({ level: 'error', rule: 'token-coverage', message: 'dead var reference --color-nope' }),
    )
    // Настоящий dead-ref держит check красным — исключения не глушат реальные находки.
    expect(ok).toBe(false)
  })

  it('без --out/--tailwind у check — авто-skip по баннеру даёт тот же результат на hardcode (P8.13 §4.2 п.2)', async () => {
    runInit({ cwd })
    writeAppCss(cwd)
    await runBuild({
      cwd,
      config: 'theme/theme.config.ts',
      out: 'src/styles/theme.css',
      tailwind: 'src/styles/bridge.css',
    })

    const { findings } = await runCheck({ cwd, config: 'theme/theme.config.ts' })

    expect(findings.filter((f) => f.rule === 'hardcode')).toHaveLength(0)
  })
})
