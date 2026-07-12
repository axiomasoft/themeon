/**
 * `themeon check` (P4.5): три линтера (token-coverage / APCA-contrast / hardcode), выведенные
 * напрямую из найденных багов (§4.10 master) — заменяет заглушку P4.3. `runCheck` — чистая
 * (относительно `opts.cwd`) async-функция без обращений к `process.cwd()`/citty-контексту
 * (тестируемость, тот же паттерн, что `runBuild` P4.4); `checkCommand` — тонкая citty-обёртка,
 * печатающая сгруппированный отчёт и выставляющая exit-код.
 */
import { resolve } from 'node:path'
import { defineCommand } from 'citty'
import { consola } from 'consola'
import { resolveTheme } from '@themeon/core'
import { loadThemeConfig } from '../load-theme'
import { scanSources } from '../checks/scan'
import { checkCoverage } from '../checks/coverage'
import { checkContrastPairs } from '../checks/contrast'
import { checkHardcode } from '../checks/hardcode'
import type { Finding } from '../checks/types'

export interface CheckOptions {
  cwd: string
  config: string
  src?: readonly string[]
  coverage?: boolean
  contrast?: boolean
  hardcode?: boolean
  allowPx?: readonly number[]
  /** `--`-префиксы project-owned/third-party переменных, исключённые из coverage dead-ref (P4.5 code-review MED). */
  coverageIgnorePrefixes?: readonly string[]
}

const DEFAULT_SRC_PATTERNS: readonly string[] = ['**/*.css', '**/*.vue']
const DEFAULT_IGNORE: readonly string[] = ['**/node_modules/**', '**/dist/**']

/**
 * Loads `opts.config`, resolves it through the core resolver, scans `opts.src` (default
 * `**\/*.{css,vue}`) and runs the three enabled linters. `ok` is `false` only when a linter
 * reported a `'error'`-level finding — warnings never flip exit status (Rule 5).
 */
export async function runCheck(opts: CheckOptions): Promise<{ findings: Finding[]; ok: boolean }> {
  const theme = await loadThemeConfig(resolve(opts.cwd, opts.config))
  // Дефолтный `refLayer:'referenced'` эмитит var-chain (`--color-text: var(--color-neutral-900)`)
  // — годится для coverage (имена переменных те же при любом refLayer), но НЕ для APCA: colorjs.io
  // не парсит `var(...)` как цвет. Contrast резолвит ОТДЕЛЬНО с `refLayer:'inline'`, чтобы получить
  // финальные литеральные значения (var-имена/множество A между двумя резолвами идентичны, P-D14).
  const resolved = resolveTheme(theme)
  const resolvedInline = resolveTheme(theme, { refLayer: 'inline' })
  const sources = await scanSources(opts.cwd, opts.src ?? DEFAULT_SRC_PATTERNS, DEFAULT_IGNORE)

  const findings: Finding[] = []
  if (opts.coverage ?? true)
    findings.push(...checkCoverage(resolved, sources, { ignorePrefixes: opts.coverageIgnorePrefixes }))
  if (opts.contrast ?? true) findings.push(...checkContrastPairs(resolvedInline))
  if (opts.hardcode ?? true) findings.push(...checkHardcode(sources, { allowPx: opts.allowPx }))

  return { findings, ok: findings.every((f) => f.level !== 'error') }
}

function reportFindings(findings: readonly Finding[]): void {
  let errors = 0
  let warnings = 0

  for (const finding of findings) {
    const location = finding.file ? `${finding.file}${finding.line !== undefined ? `:${finding.line}` : ''} — ` : ''
    const line = `[${finding.rule}] ${location}${finding.message}`
    if (finding.level === 'error') {
      errors++
      consola.error(line)
    } else {
      warnings++
      consola.warn(line)
    }
  }

  if (errors === 0 && warnings === 0) consola.success('themeon check: no issues found')
  else consola.info(`themeon check: ${errors} error(s), ${warnings} warning(s)`)
}

export const checkCommand = defineCommand({
  meta: {
    name: 'check',
    description: 'Lint token coverage, APCA contrast and hardcoded values',
  },
  args: {
    config: {
      type: 'string',
      description: 'Path to theme.config.ts',
      default: 'theme.config.ts',
    },
    src: {
      type: 'string',
      description: 'Comma-separated glob patterns for source files (default: **/*.css,**/*.vue)',
    },
    coverage: {
      type: 'boolean',
      description: 'Check token coverage (dead/unused var references)',
      default: true,
      negativeDescription: 'Disable the token-coverage check',
    },
    contrast: {
      type: 'boolean',
      description: 'Check APCA contrast of semantic text-on-bg pairs',
      default: true,
      negativeDescription: 'Disable the APCA contrast check',
    },
    hardcode: {
      type: 'boolean',
      description: 'Check for hardcoded hex/px/color-function literals',
      default: true,
      negativeDescription: 'Disable the hardcoded-value check',
    },
    'allow-px': {
      type: 'string',
      description: 'Comma-separated px values to allow (default: 0,1)',
    },
    'coverage-ignore': {
      type: 'string',
      description: 'Comma-separated --var prefixes to exclude from dead-ref coverage errors (project-owned/third-party custom properties)',
    },
  },
  async run({ args }) {
    try {
      const { findings, ok } = await runCheck({
        cwd: process.cwd(),
        config: args.config,
        src: args.src ? args.src.split(',').map((s) => s.trim()) : undefined,
        coverage: args.coverage,
        contrast: args.contrast,
        hardcode: args.hardcode,
        allowPx: args['allow-px'] ? args['allow-px'].split(',').map(Number) : undefined,
        coverageIgnorePrefixes: args['coverage-ignore']
          ? args['coverage-ignore'].split(',').map((s) => s.trim())
          : undefined,
      })

      reportFindings(findings)
      process.exitCode = ok ? 0 : 1
    } catch (err) {
      consola.error(err instanceof Error ? err.message : String(err))
      process.exitCode = 1
    }
  },
})
