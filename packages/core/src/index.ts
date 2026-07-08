/** Marker export proving the build pipeline resolves and emits types. Removed in P1.8. */
export const THEMEON_CORE_STUB = true as const

export { isToken } from './types'
export type {
  AutoComplete,
  CssVarName,
  CssVarRef,
  ResolvedToken,
  ResolvedTheme,
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
export { ThemeonError } from './errors'
export type { ThemeonErrorCode } from './errors'
