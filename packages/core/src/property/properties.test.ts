import { describe, expect, test } from 'vitest'
import fc from 'fast-check'

import {
  arbitraryAliasTheme,
  arbitraryBrandingPatch,
  arbitraryDistinctPaths,
  arbitraryDtcgSafeTheme,
  arbitraryFlatColorTheme,
  arbitraryFlatColorTreePair,
  arbitraryPatchableTheme,
} from './generators'
import { defineTheme } from '../define'
import type { SysTreeInput } from '../types'
import { runProperty } from './harness'
import {
  lawDtcgRoundTripSemantics,
  lawInsertionOrderInvariant,
  lawNamingInjective,
  lawResolveDeterministic,
  lawSerializeDeterministic,
  lawTenantEmptyPatchNoDeclarations,
  lawTenantPatchDeterministic,
} from './laws'
import { PROPERTY_SEED } from './config'

describe('P2.1 property laws', () => {
  test('seeded stream is stable across two collector passes', () => {
    const samples = (arb: fc.Arbitrary<unknown>) => {
      const out: unknown[] = []
      fc.sample(arb, { seed: PROPERTY_SEED, numRuns: 8 }).forEach((value) => out.push(value))
      return out
    }
    const a = samples(arbitraryFlatColorTheme)
    const b = samples(arbitraryFlatColorTheme)
    expect(a).toEqual(b)
  })

  test('resolveTheme is deterministic', () => {
    runProperty('resolve-deterministic', arbitraryFlatColorTheme, lawResolveDeterministic)
  })

  test('serializeThemeCss is deterministic', () => {
    runProperty('serialize-deterministic', arbitraryFlatColorTheme, lawSerializeDeterministic)
  })

  test('object key insertion order does not change CSS', () => {
    runProperty('insertion-order', arbitraryFlatColorTreePair, ({ base, permuted }) => {
      const original = defineTheme({ base: base as SysTreeInput })
      const shuffled = defineTheme({ base: permuted as SysTreeInput })
      return lawInsertionOrderInvariant(original, shuffled)
    })
  })

  test('distinct generated paths do not collide after naming', () => {
    runProperty('naming-injective', arbitraryDistinctPaths, (paths) => lawNamingInjective(paths))
  })

  test('DTCG round-trip preserves resolved vars', () => {
    runProperty('dtcg-round-trip', arbitraryDtcgSafeTheme, lawDtcgRoundTripSemantics)
  })

  test('alias themes still resolve deterministically', () => {
    runProperty('alias-resolve-deterministic', arbitraryAliasTheme, lawResolveDeterministic)
  })

  test('tenant patch CSS is deterministic', () => {
    runProperty('tenant-patch-deterministic', fc.tuple(arbitraryPatchableTheme, arbitraryBrandingPatch), ([theme, patch]) =>
      lawTenantPatchDeterministic(theme, patch),
    )
  })

  test('empty tenant patch emits no declarations', () => {
    runProperty('tenant-empty-patch', arbitraryPatchableTheme, lawTenantEmptyPatchNoDeclarations)
  })
})

describe('P2.1 harness', () => {
  test('runProperty fails loudly on a deliberately false law (shrinking path exercised)', () => {
    expect(() => runProperty('forced-bug-demo', fc.integer({ min: 1, max: 50 }), () => false, { numRuns: 30 })).toThrow(
      /Property failed|counterexample/i,
    )
  })
})
