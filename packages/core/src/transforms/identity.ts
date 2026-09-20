import type { ResolvedTheme } from '../types'

/** Built-in transform: pass resolved tokens through unchanged. Pure and sync. */
export function identityTransform(resolved: ResolvedTheme): ResolvedTheme {
  return resolved
}
