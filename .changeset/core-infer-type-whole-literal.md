---
"@themeon/core": patch
---

Fix the token-type heuristic for groups outside the well-known table: a dimension or duration is
now inferred only from a whole numeric literal with a unit (`'16px'`, `'-0.5rem'`, `'200ms'`).
The previous suffix match classified `'Helvetica, Arial, sans'` as `duration` and `'system'` as
`dimension`, silently. Colour detection now requires a real hex literal (3/4/6/8 digits) or a CSS
Color 4/5 function (`hwb()`, `lab()`, `lch()`, `color-mix()`, `light-dark()` are recognised too);
`'#hashtag'` is no longer a colour. Well-known groups are unaffected.
