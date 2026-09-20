import { describe, expect, test } from 'vitest'
import {
  BRANDING_GROUPS,
  DEFAULT_TENANT_TRUST,
  TENANT_PATCH_POLICIES,
  TENANT_TRUST_LEVELS,
  hasLoneSurrogate,
  inspectPatchPath,
  inspectPatchValue,
  isBrandingPath,
  isInternalTokenPath,
  isPrimitiveTokenPath,
  isReservedPatchKey,
  isSafePatchKey,
  resolveTenantPatchPolicy,
} from './patch-policy'

describe('tenant patch policy SSOT', () => {
  test('default public trust is branding; trusted is never implied', () => {
    expect(DEFAULT_TENANT_TRUST).toBe('branding')
    expect(TENANT_TRUST_LEVELS).toEqual(['branding', 'extended', 'trusted'])
    expect(resolveTenantPatchPolicy().trust).toBe('branding')
    expect(TENANT_PATCH_POLICIES.trusted.allowPrimitivePaths).toBe(true)
    expect(TENANT_PATCH_POLICIES.branding.allowPrimitivePaths).toBe(false)
  })

  test('policies are frozen', () => {
    expect(Object.isFrozen(TENANT_PATCH_POLICIES)).toBe(true)
    expect(Object.isFrozen(TENANT_PATCH_POLICIES.branding)).toBe(true)
    expect(Object.isFrozen(TENANT_PATCH_POLICIES.branding.bounds)).toBe(true)
  })

  test('reserved keys and key alphabet', () => {
    expect(isReservedPatchKey('__proto__')).toBe(true)
    expect(isReservedPatchKey('constructor')).toBe(true)
    expect(isReservedPatchKey('prototype')).toBe(true)
    expect(isSafePatchKey('bg', TENANT_PATCH_POLICIES.branding.bounds)).toBe(true)
    expect(isSafePatchKey('2xl', TENANT_PATCH_POLICIES.branding.bounds)).toBe(true)
    expect(isSafePatchKey('__proto__', TENANT_PATCH_POLICIES.branding.bounds)).toBe(false)
    expect(isSafePatchKey('a'.repeat(65), TENANT_PATCH_POLICIES.branding.bounds)).toBe(false)
  })

  test('branding vs primitive vs internal paths', () => {
    expect(isBrandingPath(['color', 'bg', 'page'])).toBe(true)
    expect(isBrandingPath(['color', 'onPrimary'])).toBe(true)
    expect(isBrandingPath(['radius', 'md'])).toBe(true)
    expect(BRANDING_GROUPS.has('space')).toBe(false)
    expect(isPrimitiveTokenPath(['color', 'forest', '600'])).toBe(true)
    expect(isPrimitiveTokenPath(['color', 'bg', 'page'])).toBe(false)
    expect(isInternalTokenPath(['_internal', 'secret'])).toBe(true)
    expect(inspectPatchPath(['space', '4'], TENANT_PATCH_POLICIES.branding).ok).toBe(false)
    expect(inspectPatchPath(['space', '4'], TENANT_PATCH_POLICIES.extended).ok).toBe(true)
    expect(inspectPatchPath(['color', 'forest', '600'], TENANT_PATCH_POLICIES.extended).ok).toBe(false)
    expect(inspectPatchPath(['color', 'forest', '600'], TENANT_PATCH_POLICIES.trusted).ok).toBe(true)
  })

  test('value envelope: length, controls, lone surrogates', () => {
    const bounds = TENANT_PATCH_POLICIES.branding.bounds
    expect(inspectPatchValue('x'.repeat(128), bounds)).toEqual({ ok: true })
    expect(inspectPatchValue('x'.repeat(129), bounds)).toEqual({ ok: false, reason: 'length' })
    expect(inspectPatchValue('ok\u0000', bounds)).toEqual({ ok: false, reason: 'unicode' })
    const lone = String.fromCharCode(0xd800)
    expect(hasLoneSurrogate(lone)).toBe(true)
    expect(inspectPatchValue(lone, bounds)).toEqual({ ok: false, reason: 'surrogate' })
  })
})
