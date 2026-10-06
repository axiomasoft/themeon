---
"@themeon/core": minor
---

Precise token types. `defineTokens('color', …)` now returns `Token<'color'>` leaves (not the
wide `Token`), and every well-known group maps to its `TokenType` (`space` → `dimension`,
`text` → `text`, …). In other groups a reference keeps its target's type and numbers/text styles
are inferred, which matches the runtime. `defineTheme(...).sys` is typed per group
(`TokenizedSys`). New public types: `WellKnownGroupTypes`, `GroupTokenType`,
`InferLeafTokenType`, `TokenizedSys`. This is source compatible: `Token<'color'>` is assignable to
`Token`, `Tokenized<T>` keeps its old shape by default, and a precise `ThemeDefinition` is still
accepted wherever a `ThemeDefinition` is expected.
