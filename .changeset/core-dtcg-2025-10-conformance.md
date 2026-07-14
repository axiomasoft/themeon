---
"@themeon/core": minor
---

Fix `toDTCG`/`fromDTCG` to emit and accept spec-conformant DTCG 2025.10 (audit #6/#7/#8/#9/#10/
#11/#24/#25 — verdicts obtained by running the third-party `@terrazzo/parser` validator, not by
assertion): colours are emitted as structural objects (`{colorSpace, components, alpha, hex}`)
with a zero-dependency OKLCH→sRGB→hex fallback (no runtime dependency added — `@themeon/core`
stays zero-dep); `dimension` is only emitted for `px`/`rem` (other units are unrepresentable in
2025.10 and are now skipped with a warning + `$extensions` bridge instead of an invalid legacy
string); `cubicBezier` is emitted as a 4-number array, never a named-easing string; token/group
names containing `.`/`{`/`}` are escaped for DTCG (`space['1.5']` → `space["1-5"]`) with a bridge
back to the original path; `$type` declared on the document root now inherits down instead of
being silently ignored.

`toDTCG` returns `{ files, warnings }` — no representable value is ever silently dropped; a new
`ThemeonError('DTCG_NAME_COLLISION')` guards against two token paths escaping to the same DTCG
name.

`fromDTCG(files, opts?)` gains `FromDTCGOptions` (`base?`, `themes?`, `onEmpty?: 'warn' | 'error'`)
so a caller can name which file is the base theme instead of relying on ThemeOn's own file-naming
convention — third-party DTCG bundles (e.g. Tokens Studio exports) that don't follow it used to
import as an empty theme with no warning at all. An import that yields zero tokens is now always
either a `warning` (default) or a thrown `ThemeonError('DTCG_PARSE', ...)` (`onEmpty: 'error'`).
