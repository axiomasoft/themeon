/**
 * `@themeon/naive` — public entry `.`.
 *
 * This module is re-exports only (no logic). The public surface is frozen by
 * `api.test.ts`.
 */

export { toHex, deriveInteractionStates } from './color'
export { mergeOverrides } from './merge'
export { toNative } from './to-native'
export { resolveResponsiveOverrides } from './responsive'

export type { ToNativeOptions, BreakpointOverrides } from './types'
