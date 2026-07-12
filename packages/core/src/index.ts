/**
 * `@themeon/core` — public entry `.`.
 *
 * This module is re-exports only (no logic). The public surface is frozen by
 * `api.test.ts`; anything not listed here (internal walkers, DTCG document types,
 * the brand symbol) is deliberately private.
 */

// ── Authoring ──
export { defineTokens, defineTheme } from './define'

// ── Resolver ──
export { resolveTheme } from './resolve'

// ── Serializer (build channel) ──
export { serializeThemeCss } from './serialize'

// ── Runtime applier ──
export { applyTheme, clearTheme, themeVars } from './apply'

// ── Naming engine ──
export { cssVar, formatVarName, kebabSegment, NAMESPACE_TABLE } from './naming'

// ── Legacy aliases ──
export { legacyV0Alias } from './aliases/legacy-v0'

// ── DTCG interchange ──
export { toDTCG } from './dtcg/to-dtcg'
export { fromDTCG } from './dtcg/from-dtcg'
export { parseColor, formatColor } from './dtcg/color'

// ── Errors & guards ──
export { ThemeonError } from './errors'
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
export type { ToDTCGOptions, DTCGExport } from './dtcg/to-dtcg'
export type { FromDTCGResult } from './dtcg/from-dtcg'
export type { ThemeonErrorCode } from './errors'
