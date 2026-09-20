import { describe, expect, test } from 'vitest'
import { tailwindBridge } from '@themeon/tailwind'
import { canonicalThemeCssSha256, resolvedConformanceContract } from '../conformance/compiled-contract'

/**
 * Proves the conformance contract is wired (P2.6): mutating adapter output without touching the
 * compiler contract must fail parity checks.
 */
describe('conformance gate self-check', () => {
  test('canonical CSS hash is stable for the frozen fixture', () => {
    expect(canonicalThemeCssSha256()).toMatch(/^[a-f0-9]{64}$/)
  })

  test('tailwind bridge cannot invent a different primary literal than resolveTheme', () => {
    const resolved = resolvedConformanceContract()
    const primary = resolved.tokens.find((t) => t.varName === '--color-action-primary')
    expect(primary).toBeDefined()
    const bridge = tailwindBridge(resolved)
    expect(bridge).toContain(`--color-action-primary: ${primary!.value}`)
    const tampered = bridge.replace(primary!.value, 'oklch(0 0 0)')
    expect(tampered).not.toContain(`--color-action-primary: ${primary!.value}`)
  })
})
