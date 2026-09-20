/**
 * Runtime channel facade. `apply.ts` remains the implementation so build/runtime
 * parity and existing internal imports stay on one module instance.
 */
export { applyTheme, clearTheme, themeVars } from '../apply'
export type { ElementLike } from '../apply'
