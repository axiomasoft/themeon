---
"@themeon/core": minor
"@themeon/vue": minor
---

Reject malformed unquoted CSS URL tokens, including escaped `url` names, that could bypass
the declaration guard through CSS error recovery. Validate resolved data at CSS serialization
so compiler transforms and structural resolved objects cannot bypass the guard. Reject invalid
color schemes and non-finite or non-string text line heights.

Fix whole-literal color inference and keep dynamic token-group names conservatively typed.
Constrain Vue's initial preference to registered theme names. Document TypeScript 5.4 as the
minimum and test packed types on 5.4.5 with library checking enabled.

Preserve the pre-existing single explicit tree/sys generic in `defineTokens<MyTree>()` and
`defineTheme<MySys>()`; calls with inferred types keep the precise group and theme-name types.
