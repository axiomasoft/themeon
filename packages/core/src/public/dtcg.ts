/**
 * `@themeon/core/dtcg` — DTCG interchange (import/export/color).
 *
 * Same implementations as the root entry. Document AST types stay package-private.
 */
export { toDTCG } from '../dtcg/to-dtcg'
export type { ToDTCGOptions, DTCGExport } from '../dtcg/to-dtcg'
export { fromDTCG } from '../dtcg/from-dtcg'
export type { FromDTCGOptions, FromDTCGResult } from '../dtcg/from-dtcg'
export { parseColor, formatColor } from '../dtcg/color'
export { ThemeonError, THEMEON_ERROR_CODES } from '../errors'
export type { ThemeonErrorCode, ThemeonErrorOptions } from '../errors'
export type { ThemeDefinition } from '../types'
