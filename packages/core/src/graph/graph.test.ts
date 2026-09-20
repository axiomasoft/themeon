import { describe, expect, test } from 'vitest'

import { defineTheme, defineTokens } from '../define'
import { GRAPH_MAX_DEPTH, buildGraph } from './build'
import { irDocument, irToken } from '../model/build'
import { canonicalId } from '../model/ir'
import { resolveTheme } from '../resolve'
import { serializeThemeCss } from '../serialize'
import type { IrToken } from '../model/ir'

function literal(path: readonly string[], value: string): IrToken {
  return irToken({
    path,
    type: 'color',
    value: { kind: 'literal', type: 'color', value },
    source: { kind: 'dsl' },
  })
}

function alias(path: readonly string[], ref: readonly string[]): IrToken {
  return irToken({
    path,
    type: 'color',
    value: { kind: 'alias', ref },
    source: { kind: 'dsl' },
  })
}

describe('reference graph (P1.3)', () => {
  test('topological order is canonical identity, not insertion order', () => {
    const later = literal(['color', 'z'], '#000')
    const earlier = literal(['color', 'a'], '#fff')
    const graph = buildGraph(
      irDocument({
        tokens: [later, earlier],
        sysIds: [later.id, earlier.id],
      }),
    )
    expect(graph.order).toEqual([canonicalId(['color', 'a']), canonicalId(['color', 'z'])])
    expect(graph.issues).toEqual([])
  })

  test('alias cycle is reported with both node ids', () => {
    const a = alias(['color', 'a'], ['color', 'b'])
    const b = alias(['color', 'b'], ['color', 'a'])
    const graph = buildGraph(irDocument({ tokens: [a, b], sysIds: [a.id, b.id] }))
    const cycle = graph.issues.find((issue) => issue.code === 'CYCLE')
    expect(cycle?.code).toBe('CYCLE')
    if (cycle?.code === 'CYCLE') {
      expect([...cycle.nodes].sort()).toEqual([a.id, b.id])
    }
  })

  test('missing alias target is MISSING_REF, not a hang', () => {
    const token = alias(['color', 'a'], ['color', 'missing'])
    const graph = buildGraph(irDocument({ tokens: [token], sysIds: [token.id] }))
    expect(graph.issues).toContainEqual({
      code: 'MISSING_REF',
      from: token.id,
      ref: ['color', 'missing'],
    })
  })

  test('adversarial long unique chain hits DEPTH policy and terminates', () => {
    const tokens: IrToken[] = [literal(['color', 'leaf'], '#000')]
    for (let i = 0; i < GRAPH_MAX_DEPTH + 2; i++) {
      tokens.push(alias(['color', `n${i}`], i === 0 ? ['color', 'leaf'] : ['color', `n${i - 1}`]))
    }
    const graph = buildGraph(
      irDocument({
        tokens,
        sysIds: tokens.map((t) => t.id),
      }),
    )
    expect(graph.issues.some((issue) => issue.code === 'DEPTH')).toBe(true)
  })

  test('resolveTheme permutation of sibling keys yields identical CSS', () => {
    const bgFirst = defineTheme({
      base: { color: { bg: { page: '#fff' }, action: { primary: '#f00' } }, space: { 4: '1rem' } },
    })
    const actionFirst = defineTheme({
      base: { color: { action: { primary: '#f00' }, bg: { page: '#fff' } }, space: { 4: '1rem' } },
    })
    expect(serializeThemeCss(resolveTheme(actionFirst))).toBe(serializeThemeCss(resolveTheme(bgFirst)))
  })

  test('palette insertion order does not change resolved CSS', () => {
    const forestFirst = defineTokens('color', { forest: { 600: '#060' }, ink: { 900: '#111' } })
    const inkFirst = defineTokens('color', { ink: { 900: '#111' }, forest: { 600: '#060' } })
    const a = defineTheme({
      base: { color: { action: { primary: forestFirst.forest[600] }, text: { body: forestFirst.ink[900] } } },
    })
    const b = defineTheme({
      base: { color: { text: { body: inkFirst.ink[900] }, action: { primary: inkFirst.forest[600] } } },
    })
    expect(serializeThemeCss(resolveTheme(a))).toBe(serializeThemeCss(resolveTheme(b)))
  })
})
