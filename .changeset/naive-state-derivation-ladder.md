---
"@themeon/naive": patch
---

Fix `hover`/`pressed`/`suppl` derivation (audit #21, Major): fixed deltas (`hover +0.06` /
`pressed -0.06` / `suppl +0.10`, always applied in the same direction regardless of theme
appearance) made `hover` and `pressed` visually indistinguishable in the default light theme
(ΔL 0.007) and pushed `suppl` in the opposite direction from stock Naive UI's own dark-theme
`*ColorSuppl` (which is *darker* than primary, not lighter). Derivation now uses
`@themeon/colors`' `STEP10_DELTA` (the scale's own step-9→step-10 lightness delta, signed per
appearance) for `hover`, extrapolates the `base→hover` vector for `pressed` when an explicit
hover is set (or applies the delta twice otherwise), and treats `suppl` as identity
(`suppl = base`) — matching the lightness band stock Naive already occupies for that role. An
explicit theme role always wins over derivation.
