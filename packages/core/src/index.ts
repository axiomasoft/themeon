/**
 * `@themeon/core` — public entry `.`.
 *
 * This module is re-exports only (no logic). The public surface is frozen by
 * `api.test.ts`; anything not listed here (internal walkers, DTCG document types,
 * the brand symbol) is deliberately private.
 *
 * Additive subpaths (`./authoring`, `./compiler`, `./runtime`, `./dtcg`, `./tenant`)
 * re-export the same implementations. Root exports are not removed. The staged
 * compiler (`compileTheme`) lives only on `./compiler`.
 */

// ── Authoring ──
export { defineTokens, defineTheme } from './define'

// ── Resolver ──
export { resolveTheme } from './resolve'

// ── Serializer (build channel) ──
export { serializeThemeCss } from './serialize'

// ── Runtime applier ──
export { applyTheme, clearTheme, themeVars } from './apply'

// ── Tenant patch (multi-tenant, P6.1 / P0.3) ──
export { applyThemePatch, serializeThemePatch } from './patch'
export { ALLOWED_TENANT_TYPES } from './patch-grammar'
export { TENANT_PATCH_POLICIES, DEFAULT_TENANT_TRUST, resolveTenantPatchPolicy } from './patch-policy'

// ── Tenant patch JSON Schema (multi-tenant, P6.2) ──
export { tenantThemeSchema } from './schema'

// ── Naming engine ──
export { cssVar, formatVarName, kebabSegment, NAMESPACE_TABLE } from './naming'

// ── Legacy aliases ──
export { legacyV0Alias } from './aliases/legacy-v0'

// ── DTCG interchange ──
export { toDTCG } from './dtcg/to-dtcg'
export { fromDTCG } from './dtcg/from-dtcg'
export { parseColor, formatColor } from './dtcg/color'

// ── Errors & guards ──
export { ThemeonError, THEMEON_ERROR_CODES } from './errors'
export { isToken } from './types'

// ── Types ──
export type {
  AutoComplete,
  CssVarName,
  CssVarRef,
  ResolvedTheme,
  ResolvedToken,
  SysPatch,
  SysTreeInput,
  TextStyleValue,
  Token,
  ThemeDefinition,
  Tokenized,
  TokenLeafInput,
  TokenTreeInput,
  TokenType,
  WellKnownSys,
} from './types'
export type { ThemeConfig } from './define'
export type { ResolveOptions } from './resolve'
export type { NamingOptions } from './naming'
export type { AliasesOption, AliasRule } from './aliases/legacy-v0'
export type { SerializeCssOptions } from './serialize'
export type { ElementLike } from './apply'
export type { ApplyPatchOptions, ApplyPatchResult, SerializePatchOptions } from './patch'
export type { TextStyleTenantValue } from './patch-grammar'
export type { TenantPatchPolicy, TenantTrustLevel } from './patch-policy'
export type { JsonSchema, JsonSchemaNode, TenantSchemaOptions } from './schema'
export type { ToDTCGOptions, DTCGExport } from './dtcg/to-dtcg'
export type { FromDTCGResult } from './dtcg/from-dtcg'
export type { ThemeonErrorCode, ThemeonErrorOptions } from './errors'
export {
  DIAGNOSTIC_SCHEMA_VERSION,
  DIAGNOSTIC_CODES,
  aggregateDiagnostics,
  diagnosticFromDtcg,
  diagnosticFromGraphIssue,
  diagnosticFromThemeonError,
  diagnosticFromUnknown,
  diagnosticsFromGraphIssues,
  formatDiagnostics,
} from './diagnostics'
export type {
  Diagnostic,
  DiagnosticFormat,
  DiagnosticFormatter,
  DiagnosticProvenance,
  DiagnosticReport,
  DiagnosticSeverity,
  RelatedLocation,
  SourceLocation,
} from './diagnostics'
