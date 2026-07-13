/**
 * Whether a value is a usable theme name. An empty (or whitespace-only) string is NOT a theme:
 * Nuxt coerces an undeclared `runtimeConfig` value to `''` (documented convention for
 * env-overridable keys), and a JSON/env transport can do the same. Treating `''` as a real theme
 * name kills the `prefers-color-scheme` fallback and poisons the persisted value.
 */
export function normalizeThemeName(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined
}
