---
"@themeon/colors": minor
---

Fix the 12-step scale generator (audit #12/#13/#14): steps 11/12 were binary-searched to exact
APCA targets |Lc| 68/90 over a domain that made them unreachable for most seeds, silently
clamping both to the same colour as step 10 (Radix "low-contrast text" / "high-contrast text"
collapsed). The generator now uses a fixed lightness ramp (medians of 62 real Radix Colors 3.0
scales) for steps 1-8/11/12, and a binary-search **guard** for floors |Lc| 60/90 only (not an
exact-target search) over the full domain; unreachable floors now `throw` instead of clamping.
Chroma-cap is computed from the post-gamut-mapped `C9` (was the raw seed chroma), fixing steps
6-8 overtaking step 9 in saturation. Seeds outside the validated band
(`L9 ∉ [0.50, 0.93]`) now `throw ColorsError('SEED_OUT_OF_BAND')` by default (opt out via
`seedPolicy: 'clamp'`). New error codes: `SEED_OUT_OF_BAND`, `CONTRAST_UNREACHABLE`.

Fix `contrastAPCA` (audit #15): a semi-transparent foreground/background pair no longer composites
unconditionally against white — the actual backdrop must be supplied via
`contrastAPCA(fg, bg, { base })`; a translucent `bg` without `base` now throws
`ColorsError('ALPHA_NEEDS_BASE')` instead of silently returning a number computed against a
backdrop that doesn't exist in the theme (this alone flipped a dark-theme pair from a false
FAIL at |Lc| 60.1 to its real value, 89.8).

New SSOT for contrast checks, replacing the duplicated tables that used to live separately in
`@themeon/css`'s token generator and the `themeon` CLI (audit #22 — same theme, two different
verdicts): `SEMANTIC_CONTRAST_PAIRS` (14 canonical pairs) and `checkThemeContrast(lookup)`,
exported from `@themeon/colors` and consumed by both.

`STEP10_DELTA` (the lightness delta between the scale's step 9 and step 10, per appearance) is
now a public export — `@themeon/naive`'s hover/pressed derivation reads it instead of using a
fixed delta of its own.
