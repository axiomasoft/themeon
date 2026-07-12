import type { CssVarName, ResolvedTheme, ResolvedToken } from '@themeon/core'
import { describe, expect, it } from 'vitest'
import { checkCoverage } from './coverage'
import type { SourceFile } from './types'

/**
 * `checkCoverage` — чистая функция над `ResolvedTheme` (данными), поэтому фикстура строится
 * напрямую как объект резолвера (тот же паттерн, что `packages/tailwind/src/bridge.test.ts`
 * Known Deviation P4.1 #2), а не через `defineTheme`+`resolveTheme`.
 */
function tok(varName: CssVarName, value: string): ResolvedToken {
  return { path: varName.slice(2).split('-'), varName, type: 'color', value }
}

function buildResolved(
  tokens: readonly ResolvedToken[],
  themes: Readonly<Record<string, readonly ResolvedToken[]>> = {},
  aliases: ResolvedTheme['aliases'] = [],
): ResolvedTheme {
  return {
    tokens,
    themes,
    aliases,
    breakpoints: {},
    vars: Object.fromEntries(tokens.map((t) => [t.varName, t.value])),
    schemes: {},
  }
}

function src(content: string, file = 'app.css'): SourceFile {
  return { file, content }
}

describe('checkCoverage', () => {
  it('мёртвая ссылка на несуществующий токен — error', () => {
    const resolved = buildResolved([tok('--color-text', '#111')])
    const findings = checkCoverage(resolved, [src('.x{color:var(--color-nope)}')])

    expect(findings).toContainEqual(
      expect.objectContaining({ level: 'error', rule: 'token-coverage', message: 'dead var reference --color-nope' }),
    )
  })

  it('неиспользуемый токен — warning', () => {
    const resolved = buildResolved([tok('--color-focus-ring', '#123')])
    const findings = checkCoverage(resolved, [src('.x{color:red}')])

    expect(findings).toContainEqual(
      expect.objectContaining({ level: 'warning', rule: 'token-coverage', message: 'unused token --color-focus-ring' }),
    )
  })

  it('var(--x, fallback) — fallback НЕ считается отдельной мёртвой ссылкой', () => {
    const resolved = buildResolved([tok('--color-text', '#111')])
    const findings = checkCoverage(resolved, [src('.x{margin:var(--space-md, 8px)}')])

    // --space-md не в A → мёртвая ссылка сама по себе есть, но literal-fallback "8px" не даёт
    // второй/ложной находки — только одна на --space-md.
    const deadRefFindings = findings.filter((f) => f.level === 'error')
    expect(deadRefFindings).toHaveLength(1)
    expect(deadRefFindings[0]!.message).toBe('dead var reference --space-md')
  })

  it('литеральный var()-fallback у существующего токена — не даёт ложной находки', () => {
    const resolved = buildResolved([tok('--space-md', '1rem')])
    const findings = checkCoverage(resolved, [src('.x{margin:var(--space-md, 8px)}')])

    expect(findings.filter((f) => f.level === 'error')).toHaveLength(0)
  })

  it('вложенные var() — оба обращения учтены', () => {
    const resolved = buildResolved([tok('--color-bg', '#fff')])
    const findings = checkCoverage(resolved, [src('.x{color:var(--color-fg, var(--color-bg))}')])

    expect(findings).toContainEqual(
      expect.objectContaining({ level: 'error', message: 'dead var reference --color-fg' }),
    )
    // --color-bg использован (вложенно) — не должен попасть в unused
    expect(findings.some((f) => f.message === 'unused token --color-bg')).toBe(false)
  })

  it('alias-имена входят в множество A (используемый алиас — не unused, не dead)', () => {
    const resolved = buildResolved(
      [tok('--color-text', '#111')],
      {},
      [{ alias: '--text-color' as CssVarName, target: '--color-text' as CssVarName }],
    )
    const findings = checkCoverage(resolved, [src('.x{color:var(--text-color)}')])

    expect(findings.filter((f) => f.level === 'error')).toHaveLength(0)
    expect(findings.some((f) => f.message === 'unused token --text-color')).toBe(false)
  })

  it('file:line указаны для мёртвой ссылки', () => {
    const resolved = buildResolved([])
    const findings = checkCoverage(resolved, [src('.a{}\n.b{color:var(--color-nope)}', 'src/app.css')])

    expect(findings[0]).toMatchObject({ file: 'src/app.css', line: 2 })
  })
})
