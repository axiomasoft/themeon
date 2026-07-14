/**
 * Whether a value is a usable theme name. An empty (or whitespace-only) string is NOT a theme:
 * Nuxt coerces an undeclared `runtimeConfig` value to `''` (documented convention for
 * env-overridable keys), and a JSON/env transport can do the same. Treating `''` as a real theme
 * name kills the `prefers-color-scheme` fallback and poisons the persisted value.
 *
 * The function **classifies, it never rewrites**: any non-blank string comes back as-is, with
 * surrounding whitespace intact. Silently turning `' dark'` into `'dark'` would create a second,
 * invisible source of truth — the anti-FOUC script and the runtime read the same `localStorage`
 * key, and if they normalise it differently the page repaints after hydration (P3.8).
 */
export function asThemeName(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined
}
