import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createJiti } from 'jiti'
import type { ResolvedTheme, ThemeDefinition } from '@themeon/core'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { BuildOptions, BuildResult } from './commands/build'

/**
 * `themeon build` (P4.4): jiti-загрузка реального `theme.config.ts` на tmp-фикстуре →
 * `resolveTheme`/`serializeThemeCss` ядра → `tokens.css` (+опц. Tailwind-bridge) —
 * обязательные тесты Code Guidance (1)-(5).
 *
 * Тест-харнесс грузит и `commands/build.ts`, и `@themeon/core` через ОДИН И ТОТ ЖЕ jiti-
 * инстанс (`nativeModules`, реальный Node `import()`), а не через обычный ESM-импорт этого
 * тестового файла. Причина: Vitest выполняет тестовые файлы в собственном SSR-модульном
 * графе (vite-node), а jiti (Rule 1 `load-theme.ts`) намеренно резолвит `@themeon/*` родным
 * `import()` в обход этого графа (иначе — «No "exports" main defined», пакеты чисто-ESM
 * без `require`-условия) — под Vitest это создаёт ДВА разных экземпляра `@themeon/core` с
 * разными `TOKEN_BRAND`-символами (`isToken` из одного экземпляра не узнаёт Token,
 * созданный другим), из-за чего резолвер молча теряет ветки дерева. В реальном
 * (не-Vitest) запуске `node dist/cli.js` эта развилка не существует — один Node-процесс,
 * один модульный реестр по резолвнутому URL (проверено вручную вне Vitest — см. Known
 * Deviations). Фикстура-tmpdir создаётся ВНУТРИ `src/` (а не в ОС-tmpdir): `theme.config.ts`
 * реально импортирует `@themeon/core`, а jiti резолвит bare-specifier'ы по расположению
 * ЗАГРУЖАЕМОГО файла — вне дерева монорепо `node_modules`-цепочка не поднимается до
 * workspace-пакетов. Каталог git-игнорируется (`.gitignore`: `.tmp-*`) и удаляется в
 * `afterEach`.
 */

/** Фикстура с var-chain (`--color-text` → `--color-neutral-900`) — годится и для ref-layer,
 *  и для паритет-теста «CLI-вывод байт-в-байт равен прямому вызову ядра». */
const FIXTURE_CONFIG = `import { defineTokens, defineTheme } from '@themeon/core'

const palette = defineTokens('color', { neutral: { 900: '#111111' } })

export default defineTheme({
  base: {
    color: {
      text: palette.neutral[900],
      bg: { page: '#ffffff' },
    },
    space: { md: '1rem' },
  },
  themes: {
    dark: {
      color: { bg: { page: '#000000' } },
    },
  },
})
`

const jiti = createJiti(import.meta.url, {
  nativeModules: ['@themeon/core', '@themeon/tailwind', '@themeon/colors'],
})

interface CoreModule {
  resolveTheme: (def: ThemeDefinition, opts?: unknown) => ResolvedTheme
  serializeThemeCss: (resolved: ResolvedTheme) => string
}
interface BuildModule {
  runBuild: (opts: BuildOptions) => Promise<BuildResult>
}

let runBuild: BuildModule['runBuild']
let core: CoreModule

describe('runBuild', () => {
  let cwd: string

  beforeAll(async () => {
    ;({ runBuild } = await jiti.import<BuildModule>(join(import.meta.dirname, 'commands', 'build.ts'), {}))
    core = await jiti.import<CoreModule>('@themeon/core', {})
  })

  beforeEach(() => {
    cwd = mkdtempSync(join(import.meta.dirname, '.tmp-build-'))
    writeFileSync(join(cwd, 'theme.config.ts'), FIXTURE_CONFIG, 'utf8')
  })

  afterEach(() => {
    rmSync(cwd, { recursive: true, force: true })
  })

  it('пишет tokens.css с :root и [data-theme=…] из реального theme.config.ts', async () => {
    const { outPath } = await runBuild({ cwd, config: 'theme.config.ts', out: 'tokens.css' })

    const css = readFileSync(outPath, 'utf8')
    expect(css).toContain(':root')
    expect(css).toContain('[data-theme="dark"]')
    expect(css).toContain('--color-text')
  })

  it('--tailwind пишет bridge-файл с @theme reference (P8.3)', async () => {
    const { bridgePath } = await runBuild({
      cwd,
      config: 'theme.config.ts',
      out: 'tokens.css',
      tailwind: 'bridge.css',
    })

    expect(bridgePath).toBeDefined()
    const bridge = readFileSync(bridgePath!, 'utf8')
    expect(bridge).toContain('@theme reference')
  })

  it('--ref-layer inline инлайнит финальное значение, убирая var-chain на --color-neutral-900', async () => {
    const referenced = await runBuild({ cwd, config: 'theme.config.ts', out: 'referenced.css', refLayer: 'referenced' })
    const inline = await runBuild({ cwd, config: 'theme.config.ts', out: 'inline.css', refLayer: 'inline' })

    const referencedCss = readFileSync(referenced.outPath, 'utf8')
    const inlineCss = readFileSync(inline.outPath, 'utf8')

    expect(referencedCss).toContain('--color-neutral-900')
    expect(inlineCss).not.toContain('--color-neutral-900')
    expect(inlineCss).toContain('#111111')
  })

  it('битый config (нет .sys) — reject', async () => {
    writeFileSync(join(cwd, 'bad.config.ts'), 'export default { notATheme: true }\n', 'utf8')

    await expect(runBuild({ cwd, config: 'bad.config.ts', out: 'tokens.css' })).rejects.toThrow()
  })

  it('вывод tokens.css байт-идентичен прямому serializeThemeCss(resolveTheme(...)) ядра', async () => {
    const { outPath } = await runBuild({ cwd, config: 'theme.config.ts', out: 'tokens.css' })
    const cliOutput = readFileSync(outPath, 'utf8')

    // Тот же загруженный theme.config.ts, резолвнутый напрямую тем же (jiti-native) экземпляром
    // ядра, что и `runBuild` изнутри — «два независимых пути дают один и тот же CSS».
    const themeModule = await jiti.import<{ default: ThemeDefinition }>(join(cwd, 'theme.config.ts'), {})
    const directOutput = core.serializeThemeCss(core.resolveTheme(themeModule.default))

    expect(cliOutput).toBe(directOutput)
  })
})
