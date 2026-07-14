/**
 * `checkHardcode` (P4.5, линтер 3/3) — сырые hex/px/цветовые литералы в стилях потребителя,
 * конструктивная замена молча-нарушаемому skill-запрету (vintera регрессировал, master §2).
 * Уровень — всегда `warning` (билд не ломается по умолчанию; error — только coverage-dead и
 * contrast-fail, Rule 5 `commands/check.ts`). Исключения по имени файла здесь НЕ живут (P8.13,
 * Major #23): раньше локальный `EXCLUDE_FILE_RE` ловил только буквальное имя `tokens.css`,
 * молча пропуская любой другой `--out` (`src/styles/theme.css` и т.п.), а `coverage.ts` вообще
 * не исключал ничего — те же сгенерированные файлы давали 8 ложных hardcode-находок и попутно
 * съедали unused-детект coverage. Исключения теперь принадлежат сканеру (`commands/check.ts`
 * `scanIgnorePatterns`+баннер-фильтр) — единый список для всех линтеров сразу.
 */
import type { Finding, SourceFile } from './types'

export interface HardcodeOptions {
  /** Разрешённые px-значения (не флагаются). Default `[0, 1]` (нулевые/однопиксельные бордеры). */
  allowPx?: readonly number[]
}

const DEFAULT_ALLOW_PX: readonly number[] = [0, 1]

const HEX_RE = /#[0-9a-fA-F]{3,8}\b/g
const PX_RE = /\b(\d+)px\b/g
const COLOR_FN_RE = /\b(rgb|hsl|oklch)\(/g

function lineAt(content: string, index: number): number {
  return content.slice(0, index).split('\n').length
}

export function checkHardcode(sources: readonly SourceFile[], opts?: HardcodeOptions): Finding[] {
  const allowPx = new Set(opts?.allowPx ?? DEFAULT_ALLOW_PX)
  const findings: Finding[] = []

  for (const source of sources) {
    HEX_RE.lastIndex = 0
    for (let m = HEX_RE.exec(source.content); m !== null; m = HEX_RE.exec(source.content)) {
      findings.push({
        level: 'warning',
        rule: 'hardcode',
        message: `hardcoded hex ${m[0]}`,
        file: source.file,
        line: lineAt(source.content, m.index),
      })
    }

    PX_RE.lastIndex = 0
    for (let m = PX_RE.exec(source.content); m !== null; m = PX_RE.exec(source.content)) {
      if (allowPx.has(Number(m[1]))) continue
      findings.push({
        level: 'warning',
        rule: 'hardcode',
        message: `hardcoded px value ${m[0]}`,
        file: source.file,
        line: lineAt(source.content, m.index),
      })
    }

    COLOR_FN_RE.lastIndex = 0
    for (let m = COLOR_FN_RE.exec(source.content); m !== null; m = COLOR_FN_RE.exec(source.content)) {
      findings.push({
        level: 'warning',
        rule: 'hardcode',
        message: `hardcoded color literal ${m[1]}(...)`,
        file: source.file,
        line: lineAt(source.content, m.index),
      })
    }
  }

  return findings
}
