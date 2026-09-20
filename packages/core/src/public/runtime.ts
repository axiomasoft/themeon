/**
 * `@themeon/core/runtime` — inline CSS-variable applier.
 *
 * Same implementations as the root entry. Does not resolve a theme.
 */
export { applyTheme, clearTheme, themeVars } from '../runtime'
export type { ElementLike } from '../runtime'
export { ThemeonError, THEMEON_ERROR_CODES } from '../errors'
export type { ThemeonErrorCode, ThemeonErrorOptions } from '../errors'
export type { CssVarName, ResolvedTheme } from '../types'
