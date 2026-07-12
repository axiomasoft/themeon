import { describe, expect, it } from 'vitest'
import { checkHardcode } from './hardcode'
import type { SourceFile } from './types'

function src(content: string, file = 'app.css'): SourceFile {
  return { file, content }
}

describe('checkHardcode', () => {
  it('hex-литерал — warning с file:line', () => {
    const findings = checkHardcode([src('.a{}\n.y{color:#ff0000}', 'src/app.css')])

    expect(findings).toContainEqual(
      expect.objectContaining({
        level: 'warning',
        rule: 'hardcode',
        message: 'hardcoded hex #ff0000',
        file: 'src/app.css',
        line: 2,
      }),
    )
  })

  it('1px и 0px не флагаются (дефолтный allowlist), 24px — флагуется', () => {
    const findings = checkHardcode([src('.a{border:1px solid;margin:0px;padding:24px}')])

    expect(findings.some((f) => f.message.includes('1px'))).toBe(false)
    expect(findings.some((f) => f.message.includes('0px'))).toBe(false)
    expect(findings).toContainEqual(expect.objectContaining({ message: 'hardcoded px value 24px' }))
  })

  it('allowPx расширяет разрешённый набор', () => {
    const findings = checkHardcode([src('.a{gap:2px}')], { allowPx: [0, 1, 2] })

    expect(findings).toHaveLength(0)
  })

  it('tokens.css исключён из скана', () => {
    expect(checkHardcode([src('.x{color:#ff0000}', 'dist/tokens.css')])).toEqual([])
  })

  it('файл-конфиг темы (*.config.ts) исключён из скана', () => {
    expect(checkHardcode([src("export default { c: '#ff0000' }", 'theme.config.ts')])).toEqual([])
  })

  it('rgb/hsl/oklch литералы — warning', () => {
    const findings = checkHardcode([src('.z{color:rgb(0 0 0);background:oklch(0.5 0.1 200)}')])

    expect(findings.filter((f) => f.rule === 'hardcode')).toHaveLength(2)
  })
})
