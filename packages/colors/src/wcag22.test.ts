import { describe, expect, test } from 'vitest'

import {
  WCAG22_AA_NORMAL_TEXT_RATIO,
  contrastWCAG22Ratio,
  evaluateWcag22Policy,
  wcagContrastRatio,
} from './wcag22'

describe('wcagContrastRatio', () => {
  test('threshold equality: 4.5:1 boundary (AA normal text)', () => {
    const ratio = contrastWCAG22Ratio('#767676', '#ffffff')
    expect(ratio).toBeGreaterThanOrEqual(WCAG22_AA_NORMAL_TEXT_RATIO)
    const justBelow = contrastWCAG22Ratio('#777777', '#ffffff')
    const evalPass = evaluateWcag22Policy('#767676', '#ffffff', {
      kind: 'wcag22-text',
      context: { level: 'AA', size: 'normal' },
    })
    const evalFail = evaluateWcag22Policy('#777777', '#ffffff', {
      kind: 'wcag22-text',
      context: { level: 'AA', size: 'normal' },
    })
    expect(evalPass.status).toBe('pass')
    expect(evalFail.status).toBe('fail')
    expect(justBelow).toBeLessThan(WCAG22_AA_NORMAL_TEXT_RATIO)
  })

  test('gradient foreground → indeterminate (not pass)', () => {
    const result = evaluateWcag22Policy('linear-gradient(#000, #fff)', '#ffffff', {
      kind: 'wcag22-text',
      context: { level: 'AA', size: 'normal' },
    })
    expect(result.status).toBe('indeterminate')
    if (result.status === 'indeterminate') expect(result.reason).toBe('gradient')
  })

  test('symmetry via relative luminance helper', () => {
    const l1 = 0.2
    const l2 = 0.8
    expect(wcagContrastRatio(l1, l2)).toBeCloseTo(wcagContrastRatio(l2, l1), 10)
  })
})
