/**
 * `checkContrastPairs` (P4.5, линтер 2/3) — WCAG 2.2 normative + APCA advisory семантических пар
 * (text-on-bg) для каждой темы (база + каждый `resolved.themes[*]`). Пары/пороги — из SSOT
 * `SEMANTIC_CONTRAST_PAIRS` / `checkThemeContrast` (`@themeon/colors`, P0.2/D3).
 */
import type { ResolvedTheme } from '@themeon/core'
import { checkThemeContrast } from '@themeon/colors'
import type { Finding } from './types'

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
  const themeNames: (string | undefined)[] = [undefined, ...Object.keys(resolved.themes)]

  for (const themeName of themeNames) {
    const lookup = buildLookup(resolved, themeName)
    const themeLabel = themeName ?? 'base'

    try {
      const { wcagReports, reports } = checkThemeContrast(lookup)

      for (const report of wcagReports) {
        const label = report.pair.label ?? 'pair'
        if (report.result.status === 'indeterminate') {
          findings.push({
            level: 'warning',
            rule: 'contrast',
            code: 'THEMEON_CONTRAST_WCAG_INDETERMINATE',
            message: `WCAG indeterminate (${report.result.reason}) for ${label} (theme ${themeLabel}): ${report.result.message}`,
          })
          continue
        }
        if (!report.result.pass) {
          findings.push({
            level: 'error',
            rule: 'contrast',
            code: 'THEMEON_CONTRAST_WCAG_AA',
            message:
              `WCAG 2.2 AA ${report.result.ratio.toFixed(2)}:1 < ${report.result.threshold}:1 for ${label} (theme ${themeLabel})`,
          })
        }
      }

      for (const report of reports) {
        if (!report.pass) {
          findings.push({
            level: 'warning',
            rule: 'contrast',
            code: 'THEMEON_CONTRAST_APCA_ADVISORY',
            message: `APCA advisory |Lc| ${Math.abs(report.lc).toFixed(1)} < ${report.required} for ${report.pair.label} (theme ${themeLabel})`,
          })
        }
      }
    } catch (error) {
      findings.push({
        level: 'error',
        rule: 'contrast',
        code: 'THEMEON_CONTRAST_BAD_COLOR',
        message: `unparseable color pair in theme ${themeLabel}: ${error instanceof Error ? error.message : String(error)}`,
      })
    }
  }

  return findings
}
