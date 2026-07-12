/** Один потребляемый sys-var: имя, литеральный fallback, модули-потребители. */
export interface CssContractEntry {
  readonly varName: `--${string}`
  readonly fallback: string
  readonly usedBy: readonly string[]
}

/**
 * Machine-readable CSS custom-property contract of `@themeon/css` — the set of `sys`-layer
 * variables the package's own CSS consumes (with literal fallbacks). Input for the
 * token-coverage linter in `themeon check` (P4).
 */
export const CSS_CONTRACT: readonly CssContractEntry[] = [
  { varName: '--color-focus-ring', fallback: 'currentColor', usedBy: ['reset'] },
  { varName: '--font-sans', fallback: 'system-ui, sans-serif', usedBy: ['base'] },
  { varName: '--font-mono', fallback: 'ui-monospace, monospace', usedBy: ['base'] },
  { varName: '--color-text', fallback: 'oklch(0.25 0.01 260)', usedBy: ['base', 'blueprints'] },
  { varName: '--color-bg-page', fallback: 'oklch(0.99 0.002 260)', usedBy: ['base'] },
  { varName: '--color-link', fallback: 'oklch(0.45 0.15 260)', usedBy: ['base'] },
  {
    varName: '--color-link-hover',
    fallback: 'oklch(0.4 0.17 260)',
    usedBy: ['base', 'blueprints'],
  },
  { varName: '--color-border', fallback: 'oklch(0.85 0.01 260)', usedBy: ['base', 'blueprints'] },
  { varName: '--text-base', fallback: '1rem', usedBy: ['base'] },
  { varName: '--text-base--line-height', fallback: '1.6', usedBy: ['base'] },
  { varName: '--text-sm', fallback: '0.875rem', usedBy: ['base'] },
  { varName: '--text-sm--line-height', fallback: '1.4', usedBy: ['base'] },
  { varName: '--text-xl', fallback: '1.25rem', usedBy: ['base'] },
  { varName: '--text-xl--line-height', fallback: '1.3', usedBy: ['base'] },
  { varName: '--text-2xl', fallback: '1.5rem', usedBy: ['base'] },
  { varName: '--text-2xl--line-height', fallback: '1.25', usedBy: ['base'] },
  { varName: '--text-3xl', fallback: '1.875rem', usedBy: ['base'] },
  { varName: '--text-3xl--line-height', fallback: '1.2', usedBy: ['base'] },
  { varName: '--text-4xl', fallback: '2.5rem', usedBy: ['base'] },
  { varName: '--text-4xl--line-height', fallback: '1.15', usedBy: ['base'] },
  { varName: '--spacing-sm', fallback: '0.75rem', usedBy: ['composition', 'blueprints'] },
  { varName: '--spacing-md', fallback: '1rem', usedBy: ['composition', 'blueprints'] },
  { varName: '--spacing-xs', fallback: '0.5rem', usedBy: ['blueprints'] },
  { varName: '--spacing-lg', fallback: '1.5rem', usedBy: ['blueprints'] },
  { varName: '--spacing-xl', fallback: '2rem', usedBy: ['blueprints'] },
  { varName: '--spacing-2xl', fallback: '3rem', usedBy: ['blueprints'] },
  { varName: '--color-bg-elevated', fallback: 'oklch(1 0 0)', usedBy: ['blueprints'] },
  { varName: '--color-bg-subtle', fallback: 'oklch(0.96 0.003 260)', usedBy: ['blueprints'] },
  { varName: '--color-text-muted', fallback: 'oklch(0.5 0.01 260)', usedBy: ['blueprints'] },
  { varName: '--radius-lg', fallback: '0.75rem', usedBy: ['blueprints'] },
  {
    varName: '--shadow-lg',
    fallback: '0 8px 24px rgb(0 0 0 / 0.12)',
    usedBy: ['blueprints'],
  },
]

/** Порядок каскада ThemeOn (P-D20) — то же перечисление, что и в `layers.css`. */
export const THEMEON_LAYERS = [
  'themeon.tokens',
  'themeon.reset',
  'themeon.base',
  'themeon.composition',
  'themeon.blueprints',
  'themeon.components',
  'themeon.utilities',
] as const
