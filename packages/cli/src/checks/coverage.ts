/**
 * `checkCoverage` (P4.5, линтер 1/3) — ловит класс `--size-2-xl` (dterema, мёртвые
 * `var(--*)`-ссылки на несуществующие токены) + неиспользуемые токены. Множество A —
 * все генерируемые имена (`resolved.tokens` ∪ все `resolved.themes[*]` ∪ `resolved.aliases[*]`).
 * Множество B — все `var(--*)`-обращения в исходниках потребителя. Мёртвые = B∖A (error),
 * неиспользуемые = A∖B (warning). `var(--x, fallback)` — fallback НЕ считается ссылкой:
 * regex забирает только первую группу до `,`/`)`.
 */
import type { ResolvedTheme } from '@themeon/core'
import type { Finding, SourceFile } from './types'

/** Первая группа — имя переменной до `,`/`)`; literal/var()-fallback в неё не попадает. */
const VAR_REF = /var\(\s*(--[\w-]+)/g

function collectGenerated(resolved: ResolvedTheme): Set<string> {
  const names = new Set<string>()
  for (const token of resolved.tokens) names.add(token.varName)
  for (const patch of Object.values(resolved.themes)) {
    for (const token of patch) names.add(token.varName)
  }
  for (const alias of resolved.aliases) names.add(alias.alias)
  return names
}

/** Номер строки 1-based по индексу совпадения в исходнике (Rule 6: `\n` до индекса). */
function lineAt(content: string, index: number): number {
  return content.slice(0, index).split('\n').length
}

export function checkCoverage(resolved: ResolvedTheme, sources: readonly SourceFile[]): Finding[] {
  const generated = collectGenerated(resolved)
  const used = new Set<string>()
  const findings: Finding[] = []

  for (const source of sources) {
    VAR_REF.lastIndex = 0
    for (let match = VAR_REF.exec(source.content); match !== null; match = VAR_REF.exec(source.content)) {
      const varName = match[1]!
      used.add(varName)
      if (!generated.has(varName)) {
        findings.push({
          level: 'error',
          rule: 'token-coverage',
          message: `dead var reference ${varName}`,
          file: source.file,
          line: lineAt(source.content, match.index),
        })
      }
    }
  }

  for (const varName of generated) {
    if (!used.has(varName)) {
      findings.push({ level: 'warning', rule: 'token-coverage', message: `unused token ${varName}` })
    }
  }

  return findings
}
