# @themeon/colors

Seed → 12-step OKLCH scale (Radix-shaped) + APCA contrast gate.

## Main exports

| Export | What it does |
|:--|:--|
| `generateScale` / `generateScalePair` | Seed color → 12-step OKLCH scale (light, or light+dark pair), Radix-shaped step roles. |
| `scaleToTokens` | Flatten a scale into a plain string dictionary — feeds `defineTokens('color', …)` from `@themeon/core`. |
| `contrastAPCA` | Signed APCA Lc between two colors (fail-closed — throws on an unparsable color). |
| `checkContrast` | Batch APCA check over `{ fg, bg, usage }` pairs. |
| `checkThemeContrast` | Runs `SEMANTIC_CONTRAST_PAIRS` (the 14 role pairs gating `@themeon/css`'s default theme) against a flat `varName → literal` dictionary. |
| `STEP_ROLES` / `LC_THRESHOLDS` | The 12 step roles table / the minimum `|Lc|` per usage (`body`/`text`/`large`/`non-text`). |

## Example

```ts
import { generateScalePair, scaleToTokens, checkContrast } from '@themeon/colors'

const accent = generateScalePair('oklch(0.55 0.15 155)')

const accentLightTokens = scaleToTokens(accent.light) // { '1': 'oklch(…)', …, '12': 'oklch(…)' }

const result = checkContrast([
  { fg: accent.light[11]!.css, bg: accent.light[1]!.css, usage: 'body' },
])
result.pass // true | false
```

Full API & options → [`packages/colors/README.md` on GitHub](https://github.com/axioma-studio/themeon/tree/main/packages/colors#readme).
