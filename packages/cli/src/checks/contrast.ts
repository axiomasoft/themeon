/**
 * `checkContrastPairs` (P4.5, линтер 2/3) — APCA семантических пар (text-on-bg) для каждой
 * темы (база + каждый `resolved.themes[*]`). Пары/пороги — из SSOT `SEMANTIC_CONTRAST_PAIRS`/
 * `checkThemeContrast` (`@themeon/colors`, P8.6/P8.13, `findings/P8-css-layers-cli-checks.md`
 * §3.4): раньше здесь жила отдельная таблица из 3 пар, все с `usage:'body'` (порог 75), в то
 * время как гейт генерации (`packages/css/scripts/gen-tokens.mjs`) уже гонял `text.muted` как
 * `'text'` (60) — дефолтная тема пакета проваливала собственный линтер (Major #22). Локальная
 * таблица удалена, единственный канал — импорт из `@themeon/colors`. Fail-closed: непарсибельная
 * пара бросает `ColorsError` внутри `checkThemeContrast` — здесь она ловится и превращается в
 * `Finding` уровня `error` (не skip, R-14 §3.3).
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
  // '' — сентинел для базовой темы (:root), далее — каждый именованный патч темы.
  const themeNames: (string | undefined)[] = [undefined, ...Object.keys(resolved.themes)]

  for (const themeName of themeNames) {
    const lookup = buildLookup(resolved, themeName)
    const themeLabel = themeName ?? 'base'

    try {
      const { reports } = checkThemeContrast(lookup)
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
