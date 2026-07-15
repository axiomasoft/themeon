# @themeon/core

Token model (`ref`/`sys`/`comp`), `defineTheme`, resolver, naming engine, CSS/DTCG serializers,
runtime applier. Zero runtime deps.

## Main exports

| Export | What it does |
|:--|:--|
| `defineTokens` | Author a group of tokens (palette, scale) — leaves that reference another `Token` become `var()` chains. |
| `defineTheme` | Define a theme: a base contract plus named partial patches (`dark`, …). |
| `resolveTheme` | Resolve once — collapses reference chains, applies the naming engine, detects cycles/collisions. |
| `serializeThemeCss` | Build channel — static CSS (`@layer`, `:root`, `[data-theme]`) for `<head>`. |
| `applyTheme` / `clearTheme` / `themeVars` | Runtime channel — inline variables for theme/tenant switching without a rebuild. |
| `toDTCG` / `fromDTCG` | Bridge to/from the [DTCG](https://www.designtokens.org/) interchange format. |
| `applyThemePatch` / `serializeThemePatch` | Multi-tenant runtime patch (see [Laravel recipe](https://github.com/axioma-studio/themeon/blob/main/docs/recipes/laravel-vite.md)). |

## Example

```ts
import { defineTokens, defineTheme, resolveTheme, serializeThemeCss, applyTheme, themeVars } from '@themeon/core'

const palette = defineTokens('color', {
  forest: { 600: 'oklch(0.55 0.13 155)' },
  neutral: { 0: 'oklch(0.99 0 0)', 900: 'oklch(0.15 0 0)' },
})

const theme = defineTheme({
  base: {
    color: {
      bg: { page: palette.neutral[0] },
      action: { primary: palette.forest[600] },
    },
    space: { 4: '1rem' },
    text: { '2xl': { size: '1.5rem', lineHeight: 1.33 } },
  },
  themes: {
    dark: { color: { bg: { page: palette.neutral[900] } } },
  },
})

const resolved = resolveTheme(theme, { refLayer: 'referenced' })

const css = serializeThemeCss(resolved) // static CSS for <head>
applyTheme(document.documentElement, themeVars(resolved)) // runtime channel, same names/values
```

Full API & options → [`packages/core/README.md` on GitHub](https://github.com/axioma-studio/themeon/tree/main/packages/core#readme).
