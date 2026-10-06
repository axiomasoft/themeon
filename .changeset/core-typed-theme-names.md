---
"@themeon/core": minor
---

Typed theme names end to end. `defineTheme` infers the literal theme names from `themes`
(`ThemeDefinition<TSys, 'dark' | 'hc'>`). `resolveTheme` carries them into
`ResolvedTheme<'dark' | 'hc'>`, and `themeVars(resolved, 'drak')` becomes a compile-time error.
`schemes` keys are checked against the declared themes plus the reserved `base`. All new
parameters default to `string`, so explicitly wide types (`ThemeDefinition`, `ResolvedTheme`) and
adapters behave as before. To pass a runtime-chosen name, widen the resolved theme
(`const r: ResolvedTheme = resolveTheme(def)`); the runtime `UNKNOWN_PATH` guard still applies.
Requires TypeScript ≥ 5.4 (`NoInfer`).
