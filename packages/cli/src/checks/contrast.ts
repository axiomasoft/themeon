/**
 * `checkContrastPairs` (P4.5, линтер 2/3) — APCA семантических пар (text-on-bg) для каждой
 * темы (база + каждый `resolved.themes[*]`). Переиспользует `checkContrast`/`LC_THRESHOLDS` из
 * `@themeon/colors` (P-D18/P2.1) — формула APCA НЕ дублируется. Fail-closed: непарсибельная
 * пара бросает `ColorsError` внутри `checkContrast` — здесь она ловится и превращается в
 * `Finding` уровня `error` (не skip, R-14 §3.3).
 */
import type { ResolvedTheme } from '@themeon/core'
import { checkContrast } from '@themeon/colors'
import type { ContrastPair } from '@themeon/colors'
import type { Finding } from './types'

/** Роли дефолт-темы (`packages/css/src/theme/default.ts`) — фиксированный набор пар v1. */
const CONTRAST_PAIRS = [
  { fg: '--color-text', bg: '--color-bg-page', usage: 'body', label: 'text on bg.page' },
  { fg: '--color-text-muted', bg: '--color-bg-subtle', usage: 'body', label: 'text.muted on bg.subtle' },
  { fg: '--color-on-primary', bg: '--color-action-primary', usage: 'body', label: 'on-primary on action.primary' },
] as const

/** Плоский lookup varName→value для темы: база `resolved.vars` + перекрытие патчем темы. */
function buildLookup(resolved: ResolvedTheme, themeName: string | undefined): Record<string, string> {
  const lookup: Record<string, string> = { ...resolved.vars }
  if (themeName !== undefined) {
    for (const token of resolved.themes[themeName] ?? []) lookup[token.varName] = token.value
  }
  return lookup
}

export function checkContrastPairs(resolved: ResolvedTheme): Finding[] {
  const findings: Finding[] = []
  // '' — сентинел для базовой темы (:root), далее — каждый именованный патч темы.
  const themeNames: (string | undefined)[] = [undefined, ...Object.keys(resolved.themes)]

  for (const themeName of themeNames) {
    const lookup = buildLookup(resolved, themeName)
    const pairs: ContrastPair[] = []

    for (const spec of CONTRAST_PAIRS) {
      const fg = lookup[spec.fg]
      const bg = lookup[spec.bg]
      if (fg === undefined || bg === undefined) continue // роль отсутствует в теме — пропуск пары
      pairs.push({ fg, bg, usage: spec.usage, label: spec.label })
    }

    if (pairs.length === 0) continue

    const themeLabel = themeName ?? 'base'
    try {
      const { reports } = checkContrast(pairs)
      for (const report of reports) {
        if (!report.pass) {
          findings.push({
            level: 'error',
            rule: 'contrast',
            message: `APCA ${Math.abs(report.lc).toFixed(1)} < ${report.required} for ${report.pair.label} (theme ${themeLabel})`,
          })
        }
      }
    } catch (error) {
      findings.push({
        level: 'error',
        rule: 'contrast',
        message: `unparseable color pair in theme ${themeLabel}: ${error instanceof Error ? error.message : String(error)}`,
      })
    }
  }

  return findings
}
