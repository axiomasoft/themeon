/**
 * Single source of tenant-patch security policy (P0.3). Grammar (`patch-grammar.ts`),
 * JSON Schema (`schema.ts`) and runtime (`patch.ts`) consume this immutable table —
 * three allowlists are forbidden (drift = a hole).
 *
 * Trust levels: `branding` (default, narrowest public option) · `extended` · `trusted`
 * (`trusted` is opt-in owner configuration, never implicit).
 */

export const TENANT_TRUST_LEVELS = ['branding', 'extended', 'trusted'] as const
export type TenantTrustLevel = (typeof TENANT_TRUST_LEVELS)[number]

/** Default public policy — the narrowest safe option. `trusted` requires explicit selection. */
export const DEFAULT_TENANT_TRUST: TenantTrustLevel = 'branding'

export interface TenantPatchBounds {
  /** Maximum object nesting from the patch root (root = 0). Rejected before deep recursion. */
  readonly maxDepth: number
  /** Maximum own-property count across the whole patch tree. */
  readonly maxKeys: number
  /** Maximum UTF-16 length of any string value (and of number-coerced strings). */
  readonly maxValueLength: number
  /** Maximum UTF-16 length of any object key. */
  readonly maxKeyLength: number
}

export interface TenantPatchPolicy {
  readonly trust: TenantTrustLevel
  readonly bounds: TenantPatchBounds
  readonly allowPrimitivePaths: boolean
  readonly allowInternalPaths: boolean
  /** Token-object references in a patch (JS API only). JSON tenants cannot send these. */
  readonly allowTokenReferences: boolean
}

function freezePolicy(policy: TenantPatchPolicy): TenantPatchPolicy {
  return Object.freeze({
    trust: policy.trust,
    bounds: Object.freeze({ ...policy.bounds }),
    allowPrimitivePaths: policy.allowPrimitivePaths,
    allowInternalPaths: policy.allowInternalPaths,
    allowTokenReferences: policy.allowTokenReferences,
  })
}

export const TENANT_PATCH_POLICIES: Readonly<Record<TenantTrustLevel, TenantPatchPolicy>> = Object.freeze({
  branding: freezePolicy({
    trust: 'branding',
    bounds: { maxDepth: 6, maxKeys: 48, maxValueLength: 128, maxKeyLength: 64 },
    allowPrimitivePaths: false,
    allowInternalPaths: false,
    allowTokenReferences: false,
  }),
  extended: freezePolicy({
    trust: 'extended',
    bounds: { maxDepth: 8, maxKeys: 128, maxValueLength: 256, maxKeyLength: 64 },
    allowPrimitivePaths: false,
    allowInternalPaths: false,
    allowTokenReferences: false,
  }),
  trusted: freezePolicy({
    trust: 'trusted',
    bounds: { maxDepth: 12, maxKeys: 512, maxValueLength: 1024, maxKeyLength: 64 },
    allowPrimitivePaths: true,
    allowInternalPaths: true,
    allowTokenReferences: true,
  }),
})

/** Prototype-pollution keys. Own JSON properties with these names are rejected at every depth. */
export const RESERVED_PATCH_KEYS = Object.freeze(['__proto__', 'constructor', 'prototype'] as const)
export const RESERVED_PATCH_KEY_SET: ReadonlySet<string> = Object.freeze(new Set(RESERVED_PATCH_KEYS))

/**
 * Safe object-key alphabet for tenant JSON. Anchored with `(?![\\s\\S])` so JSON Schema
 * (PCRE `$`) and runtime (ECMA-262) reject a trailing newline the same way.
 */
export const TENANT_PATCH_KEY_PATTERN =
  '^(?!__proto__$|constructor$|prototype$)[A-Za-z0-9_-]{1,64}(?![\\s\\S])'

export const TENANT_PATCH_KEY_RE = new RegExp(TENANT_PATCH_KEY_PATTERN)

/** C0 + DEL + C1 + common bidi/format controls used in homoglyph / override attacks. */
export const UNICODE_CONTROL_RE = /[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2066-\u2069]/

/**
 * Semantic color roles tenants may brand. Palette shades (`color.forest.600`) are primitive
 * and stay owner-controlled until `trusted`.
 */
export const BRANDING_COLOR_ROLES: ReadonlySet<string> = new Set([
  'bg',
  'fg',
  'text',
  'action',
  'border',
  'fill',
  'surface',
  'accent',
  'muted',
  'logo',
  'brand',
  'status',
  'icon',
  'on',
  'feedback',
  'link',
  'focus',
  'overlay',
  'onPrimary',
  'onSecondary',
  'onAccent',
  'onSurface',
])

/** Groups branding may touch (semantic colors, fonts, radii, logos). */
export const BRANDING_GROUPS: ReadonlySet<string> = new Set(['color', 'font', 'fontWeight', 'radius', 'text'])

export const PRIMITIVE_GROUPS: ReadonlySet<string> = new Set(['ref', 'primitive', 'palette', 'internal'])

export function resolveTenantPatchPolicy(trust: TenantTrustLevel = DEFAULT_TENANT_TRUST): TenantPatchPolicy {
  return TENANT_PATCH_POLICIES[trust]
}

export function isReservedPatchKey(key: string): boolean {
  return RESERVED_PATCH_KEY_SET.has(key)
}

export function hasLoneSurrogate(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i)
    if (code >= 0xd800 && code <= 0xdbff) {
      if (i + 1 >= value.length) return true
      const next = value.charCodeAt(i + 1)
      if (next < 0xdc00 || next > 0xdfff) return true
      i += 1
      continue
    }
    if (code >= 0xdc00 && code <= 0xdfff) return true
  }
  return false
}

export function isSafePatchKey(key: string, bounds: TenantPatchBounds): boolean {
  if (key.length === 0 || key.length > bounds.maxKeyLength) return false
  if (isReservedPatchKey(key)) return false
  if (UNICODE_CONTROL_RE.test(key) || hasLoneSurrogate(key)) return false
  return TENANT_PATCH_KEY_RE.test(key)
}

export type PatchValueSafety =
  | { ok: true }
  | { ok: false; reason: 'length' | 'unicode' | 'surrogate' }

export function inspectPatchValue(value: string, bounds: TenantPatchBounds): PatchValueSafety {
  if (value.length > bounds.maxValueLength) return { ok: false, reason: 'length' }
  if (hasLoneSurrogate(value)) return { ok: false, reason: 'surrogate' }
  if (UNICODE_CONTROL_RE.test(value)) return { ok: false, reason: 'unicode' }
  return { ok: true }
}

export function isInternalTokenPath(path: readonly string[]): boolean {
  return path.some((segment) => segment.startsWith('_') || segment === 'internal' || segment === 'private')
}

const SHADE_RE = /^\d{2,4}$/

function isColorRole(segment: string): boolean {
  return BRANDING_COLOR_ROLES.has(segment) || /^on[A-Z][A-Za-z0-9]*$/.test(segment)
}

/** Palette / primitive color path: `color.forest.600`, `ref.*`, `palette.*`. */
export function isPrimitiveTokenPath(path: readonly string[]): boolean {
  const group = path[0]
  if (group !== undefined && PRIMITIVE_GROUPS.has(group)) return true
  if (group === 'color' && path.length >= 3 && SHADE_RE.test(path[path.length - 1]!) && !isColorRole(path[1]!)) {
    return true
  }
  return false
}

export function isBrandingPath(path: readonly string[]): boolean {
  const group = path[0]
  if (group === undefined || !BRANDING_GROUPS.has(group)) return false
  if (group === 'color') {
    const role = path[1]
    if (role === undefined) return false
    return isColorRole(role)
  }
  return true
}

export type PatchPathDenial = 'internal' | 'primitive' | 'branding'

export function inspectPatchPath(
  path: readonly string[],
  policy: TenantPatchPolicy,
): { ok: true } | { ok: false; reason: PatchPathDenial } {
  if (!policy.allowInternalPaths && isInternalTokenPath(path)) return { ok: false, reason: 'internal' }
  if (!policy.allowPrimitivePaths && isPrimitiveTokenPath(path)) return { ok: false, reason: 'primitive' }
  if (policy.trust === 'branding' && !isBrandingPath(path)) return { ok: false, reason: 'branding' }
  return { ok: true }
}

/** JSON Schema `propertyNames` shared by every object node the tenant schema emits. */
export function tenantPatchKeySchema(bounds: TenantPatchBounds): Readonly<Record<string, unknown>> {
  return Object.freeze({
    type: 'string',
    minLength: 1,
    maxLength: bounds.maxKeyLength,
    pattern: TENANT_PATCH_KEY_PATTERN,
  })
}
