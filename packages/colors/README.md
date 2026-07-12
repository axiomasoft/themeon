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
result.pass // true | false
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

Steps 11–12 are **contrast-solved**: their lightness is found by binary search so that
`|contrastAPCA(step, step 2)|` reaches a target Lc, not just interpolated — text readability
is guaranteed by construction for any seed, not "usually good enough".

## APCA contrast (`contrastAPCA` / `checkContrast`)

`contrastAPCA(fg, bg)` returns the **signed** APCA Lc (negative = light-on-dark) — compare by
`Math.abs()`. `checkContrast` batches pairs and is fail-closed: an unparsable color in any
pair throws `ColorsError('BAD_COLOR')` immediately, it never reports `pass: false` for a bad
input.

| Usage | Minimum \|Lc\| (`LC_THRESHOLDS`) |
|:--|:--|
| `body` | 75 |
| `text` | 60 |
| `large` | 45 |
| `non-text` | 45 |

Thresholds follow the [APCA in a Nutshell](https://git.apcacontrast.com/documentation/APCA_in_a_Nutshell.html)
guidance. APCA is a **guardrail metric** — it is not yet a ratified standard (it underlies the
WCAG 3 draft, still in development); treat the gate as "catches egregiously low contrast",
not as a legal accessibility certification.

## License note

The contrast engine is [colorjs.io](https://colorjs.io) (MIT) — not `apca-w3`, whose Limited
W3 License restricts commercial use outside web-content contrast checking. See `plan.md`
decision P-D18 for the full rationale.
