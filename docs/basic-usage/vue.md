# @themeon/vue

`useTheme()` (persist, `prefers-color-scheme`, N themes), Vue plugin, anti-FOUC script
generator.

## Main exports

| Export | What it does |
|:--|:--|
| `useTheme` | Composable: `{ preference, theme, system, isDark, set, toggle, init }`. Falls back to a module-level singleton without the plugin (not SSR-safe). |
| `themeonPlugin` | Vue plugin — one theme state per app instance (per request in SSR), makes `useTheme()` SSR-safe. |
| `themeInitScript` (`@themeon/vue/anti-fouc`, pure subpath) | Generates the one anti-FOUC inline script the whole ThemeOn stack reuses. |

## Example — SSR-safe (plugin)

```ts
// main.ts / entry-server.ts
import { createApp } from 'vue'
import { themeonPlugin } from '@themeon/vue'

const app = createApp(App)
app.use(themeonPlugin, { themes: ['light', 'dark'], default: 'light' })
```

```vue
<!-- any component -->
<script setup lang="ts">
import { useTheme } from '@themeon/vue'
const { theme, isDark, set, toggle } = useTheme()
</script>
```

Full API & options → [`packages/vue/README.md` on GitHub](https://github.com/axioma-studio/themeon/tree/main/packages/vue#readme).

## Typed theme names (opt-in)

By default theme names are plain strings. To make `useTheme().set()`, `toggle()` and `$theme`
accept only the themes you actually have, augment `ThemeonRegister` once, ideally deriving the
union from the theme definition:

```ts
// themeon.d.ts
import type { theme } from './theme/theme.config'

declare module '@themeon/vue' {
  interface ThemeonRegister {
    theme: 'light' | keyof (typeof theme)['themes']
  }
}
```

`'system'` (follow the OS) is always accepted as a preference. The registry is a compile-time
contract only: persisted values are still validated at runtime against `themes`.
