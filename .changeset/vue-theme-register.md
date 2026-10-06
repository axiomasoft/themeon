---
"@themeon/vue": minor
---

Opt-in typed theme names for `useTheme()` / `$theme`: augment the new `ThemeonRegister` interface
(`declare module '@themeon/vue' { interface ThemeonRegister { theme: 'light' | 'dark' } }`).
After that, `set()`, `toggle()`, `theme`, `preference`, `themes` and `system` use the registered
union, with `'system'` always allowed as a preference. The union can be derived from a
`@themeon/core` definition: `'light' | keyof (typeof theme)['themes']`. Without augmentation
everything stays `string`. New types: `ThemeonRegister`, `ThemeName`, `ThemeNameOf`,
`ThemePreference`.
