/**
 * `@themeon/core/authoring` — DSL authoring surface.
 *
 * Same implementations as the root entry. Does not re-export IR normalizers
 * (`normalizeDsl` / `normalizeDtcg`) or `TOKEN_BRAND`.
 */
export { defineTokens, defineTheme } from '../define'
export type { ThemeConfig } from '../define'
export { isToken } from '../types'
export type {
  AutoComplete,
  CssVarName,
  CssVarRef,
  GroupTokenType,
  InferLeafTokenType,
  SysPatch,
  SysTreeInput,
  TextStyleValue,
  ThemeDefinition,
  Token,
  Tokenized,
  TokenizedSys,
  TokenLeafInput,
  TokenTreeInput,
  TokenType,
  WellKnownGroupTypes,
  WellKnownSys,
} from '../types'
export { cssVar, formatVarName, kebabSegment, NAMESPACE_TABLE } from '../naming'
export type { NamingOptions } from '../naming'
export { ThemeonError, THEMEON_ERROR_CODES } from '../errors'
export type { ThemeonErrorCode, ThemeonErrorOptions } from '../errors'
