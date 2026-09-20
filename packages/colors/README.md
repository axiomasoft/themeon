# @themeon/colors

Seed → 12-step OKLCH scale (Radix-shaped) and APCA contrast gate for ThemeOn. Zero UI
surface — pure functions over color strings, meant to be consumed by `@themeon/css`'s
default theme (P2.7) and by `themeon check` (P4).

## Quickstart

```ts
import { generateScalePair, scaleToTokens, checkContrast } from '@themeon/colors'

// One seed → 12-step light + dark OKLCH scale pair (Radix-shaped: same step roles,
// gaussian chroma distribution, contrast-solved text steps).
const accent = generateScalePair('oklch(0.55 0.15 155)')

// Flatten a scale into a plain string dictionary — feeds `defineTokens('color', …)`
// from `@themeon/core`.
const accentLightTokens = scaleToTokens(accent.light) // { '1': 'oklch(…)', …, '12': 'oklch(…)' }

// APCA contrast gate — fail-closed: an unparsable color always throws, never silently skips.
const result = checkContrast([
  { fg: accent.light[11]!.css, bg: accent.light[1]!.css, usage: 'body' },
])
result.pass // WCAG 2.2 AA normative; see also result.apcaPass
```

## Scale roles (`STEP_ROLES`)

`generateScale`/`generateScalePair` return exactly 12 steps per scale, Radix-shaped:

| Step | Role |
|:--|:--|
| 1 | App background |
| 2 | Subtle background |
| 3 | UI element background |
| 4 | Hovered UI element background |
| 5 | Active or selected UI element background |
| 6 | Subtle borders and separators |
| 7 | UI element border and focus rings |
| 8 | Hovered UI element border |
| 9 | Solid background (seed) |
| 10 | Hovered solid background |
| 11 | Low-contrast text |
| 12 | High-contrast text |

Steps 1–8, 11, 12 sit on a **fixed lightness ramp** (medians of 31 published Radix Colors
3.0.0 scales) — step 9 is the seed, step 10 is `seed ± delta`. Steps 11/12 additionally carry
a contrast **floor guarantee**: `|contrastAPCA(step11, step2)| ≥ 60` and
`|contrastAPCA(step12, step2)| ≥ 90` (Radix's own documented floors, not exact targets). When
the fixed ramp value already clears the floor — the common case — it is used as-is; only when
it doesn't does a binary-search guard push the lightness toward the domain edge until the
floor is reached. An unreachable floor throws `ColorsError('CONTRAST_UNREACHABLE')` — it never
silently clamps.

### Seed validity band

`generateScale`/`generateScalePair` require the seed's lightness to fall in
`[SEED_L_MIN, SEED_L_MAX]` = `[0.50, 0.93]` — the band in which a color can plausibly play the
role of step 9 ("solid background"). A seed outside the band (e.g. a near-black corporate navy)
throws `ColorsError('SEED_OUT_OF_BAND')` by default — pass `seedPolicy: 'clamp'` to normalize
the seed's lightness into the band instead (hue/chroma preserved; `onSeedAdjusted` fires with
the before/after lightness when this happens).

## APCA contrast (`contrastAPCA` / `checkContrast`)

`contrastAPCA(fg, bg, opts?)` returns the **signed** APCA Lc (negative = light-on-dark) — compare
by `Math.abs()`. `checkContrast` batches pairs and is fail-closed: an unparsable color in any
pair throws `ColorsError('BAD_COLOR')` immediately, it never reports `pass: false` for a bad
input.

| Usage | Minimum \|Lc\| (`LC_THRESHOLDS`) |
|:--|:--|
| `body` | 75 |
| `text` | 60 |
| `large` | 45 |
| `non-text` | 45 |

Thresholds follow the [APCA in a Nutshell](https://git.apcacontrast.com/documentation/APCA_in_a_Nutshell.html)
guidance. APCA is **experimental/advisory** (D3): `checkContrast` / `checkThemeContrast` expose
`apcaPass` separately from normative WCAG 2.2 AA in `pass` / `wcagReports`.

**WCAG 2.2 (normative, RAG:✅):** [WCAG 2.2 contrast minimum](https://www.w3.org/TR/WCAG22/#contrast-minimum)
and [non-text contrast](https://www.w3.org/TR/WCAG22/#non-text-contrast) — retrieved 2026-09-19.
`contrastWCAG22Ratio` / `evaluateWcag22Policy` implement relative luminance contrast; gradients and
unresolved alpha yield **indeterminate** results, not silent pass.

### Alpha needs an actual backdrop

APCA's own contract (alpha is legal on fg only; a translucent bg must be composited onto its
**real** backdrop, never onto an unconditional white) is enforced via `opts.base`:

```ts
contrastAPCA(fg, bg) // bg is translucent → throws ColorsError('ALPHA_NEEDS_BASE')
contrastAPCA(fg, bg, { base: '#131313' }) // composited onto the actual page background
```

There is no silent white-backdrop fallback — a translucent `bg` without `base` is a hard error,
not a guess. `ContrastPair.base` carries the same option through `checkContrast`.

### `SEMANTIC_CONTRAST_PAIRS` / `checkThemeContrast`

`SEMANTIC_CONTRAST_PAIRS` is the single source of truth for the 14 role pairs that gate
`@themeon/css`'s default theme (`text`/`bg`, `link`/`bg`, `focusRing`/`bg`, …) — both
`packages/css/scripts/gen-tokens.mjs` and `themeon check` are meant to consume it instead of
keeping their own copies, so the two gates can no longer disagree on the same question.
`checkThemeContrast(lookup)` runs the table against a flat `varName → literal value` dictionary
for one theme, resolving the alpha backdrop from that theme's own `--color-bg-page`; a pair
whose role is absent from `lookup` is skipped, not failed.

```ts
import { checkThemeContrast } from '@themeon/colors'

const result = checkThemeContrast({
  '--color-text': '#1a1a1a',
  '--color-bg-page': '#ffffff',
  // …other roles
})
result.pass // WCAG 2.2 AA (normative)
result.apcaPass // APCA advisory
```

## License note

The contrast engine is [colorjs.io](https://colorjs.io) (MIT) — not `apca-w3`, whose Limited
W3 License restricts commercial use outside web-content contrast checking. See `plan.md`
decision P-D18 for the full rationale.
