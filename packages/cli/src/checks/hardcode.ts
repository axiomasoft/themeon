/**
 * `checkHardcode` (P4.5, линтер 3/3) — сырые hex/px/цветовые литералы в стилях потребителя,
 * конструктивная замена молча-нарушаемому skill-запрету (vintera регрессировал, master §2).
 * Уровень — всегда `warning` (билд не ломается по умолчанию; error — только coverage-dead и
 * contrast-fail, Rule 5 `commands/check.ts`). `tokens.css` и файл-конфиг темы (`*.config.ts`)
 * исключены из скана — там литералы легитимны (это и есть источник значений).
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

/** `tokens.css` (любой путь) и файл-конфиг темы (`*.config.ts`) — литералы там легитимны. */
const EXCLUDE_FILE_RE = /(^|\/)tokens\.css$|\.config\.ts$/

function lineAt(content: string, index: number): number {
  return content.slice(0, index).split('\n').length
}

export function checkHardcode(sources: readonly SourceFile[], opts?: HardcodeOptions): Finding[] {
  const allowPx = new Set(opts?.allowPx ?? DEFAULT_ALLOW_PX)
  const findings: Finding[] = []

  for (const source of sources) {
    if (EXCLUDE_FILE_RE.test(source.file)) continue

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
