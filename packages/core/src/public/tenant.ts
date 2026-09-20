/**
 * `@themeon/core/tenant` — untrusted tenant patch, policy, and JSON Schema.
 *
 * Same implementations as the root entry.
 */
export { applyThemePatch, serializeThemePatch } from '../patch'
export type { ApplyPatchOptions, ApplyPatchResult, SerializePatchOptions } from '../patch'
export { ALLOWED_TENANT_TYPES } from '../patch-grammar'
export type { TextStyleTenantValue } from '../patch-grammar'
export {
  TENANT_PATCH_POLICIES,
  DEFAULT_TENANT_TRUST,
  resolveTenantPatchPolicy,
} from '../patch-policy'
export type { TenantPatchPolicy, TenantTrustLevel } from '../patch-policy'
export { tenantThemeSchema } from '../schema'
export type { JsonSchema, JsonSchemaNode, TenantSchemaOptions } from '../schema'
export { ThemeonError, THEMEON_ERROR_CODES } from '../errors'
export type { ThemeonErrorCode, ThemeonErrorOptions } from '../errors'
export type { ResolvedTheme } from '../types'
