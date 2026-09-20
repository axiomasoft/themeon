import { serializeThemeCss } from '../serialize'
import type { FormatInput } from '../pipeline/types'

/**
 * Built-in CSS format. Reads a resolved theme and serialize options only —
 * it must not import or call the resolver (P-D14, P1.5).
 */
export function formatCss(input: FormatInput): string {
  return serializeThemeCss(input.resolved, input.options)
}
