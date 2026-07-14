import type { CssVarName, ResolvedTheme, ResolvedToken } from '@themeon/core'
import { describe, expect, it } from 'vitest'
import { checkContrastPairs } from './contrast'

function tok(varName: CssVarName, value: string): ResolvedToken {
  return { path: varName.slice(2).split('-'), varName, type: 'color', value }
}

function buildResolved(
  tokens: readonly ResolvedToken[],
  themes: Readonly<Record<string, readonly ResolvedToken[]>> = {},
): ResolvedTheme {
  return {
    tokens,
    themes,
    aliases: [],
    breakpoints: {},
    vars: Object.fromEntries(tokens.map((t) => [t.varName, t.value])),
    schemes: {},
  }
}

describe('checkContrastPairs', () => {
  it('провальная пара — error', () => {
    // Два близких серых — APCA заведомо ниже порога body (75).
    const resolved = buildResolved([tok('--color-text', '#777777'), tok('--color-bg-page', '#888888')])

    const findings = checkContrastPairs(resolved)

    expect(findings).toContainEqual(
      expect.objectContaining({ level: 'error', rule: 'contrast' }),
    )
    expect(findings[0]!.message).toContain('text/bg.page')
  })

  it('проходная пара — пусто', () => {
    const resolved = buildResolved([tok('--color-text', '#000000'), tok('--color-bg-page', '#ffffff')])

    expect(checkContrastPairs(resolved)).toEqual([])
  })

  it('непарсибельный цвет — error (fail-closed, не skip)', () => {
    const resolved = buildResolved([tok('--color-text', 'not-a-color'), tok('--color-bg-page', '#ffffff')])

    const findings = checkContrastPairs(resolved)

    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatchObject({ level: 'error', rule: 'contrast' })
    expect(findings[0]!.message).toContain('unparseable')
  })

  it('пара с отсутствующей ролью — пропуск (не error, не false pass)', () => {
    // Только text/bg.page заданы — остальные две пары набора отсутствуют, пропускаются молча.
    const resolved = buildResolved([tok('--color-text', '#000000'), tok('--color-bg-page', '#ffffff')])

    expect(checkContrastPairs(resolved)).toEqual([])
  })

  it('патч темы перекрывает базу — провал только в перекрытой теме', () => {
    const resolved = buildResolved(
      [tok('--color-text', '#000000'), tok('--color-bg-page', '#ffffff')],
      { dark: [tok('--color-text', '#777777'), tok('--color-bg-page', '#888888')] },
    )

    const findings = checkContrastPairs(resolved)

    expect(findings).toHaveLength(1)
    expect(findings[0]!.message).toContain('theme dark')
  })
})
