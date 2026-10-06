---
"@themeon/core": patch
---

`defineTokens` / `defineTheme` now fail loud with `ThemeonError('BAD_VALUE')` on a token leaf or
theme-patch value that is not a string, a finite number, a text style or a Token reference.
Previously `undefined` (most often a reference to a palette step that does not exist, e.g.
`palette.forest[650]`), `null`, booleans and `NaN`/`Infinity` were accepted and serialized as
literal `--color-a: undefined;` / `--x: NaN;` declarations. The error names the token path and,
for `undefined`, hints at a missing reference.
