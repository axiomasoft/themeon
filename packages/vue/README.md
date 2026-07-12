# @themeon/vue

Reactive theme switching for Vue: `useTheme()` (persist, `prefers-color-scheme`, N themes),
a Vue plugin for SSR-safe per-app state, and a generated anti-FOUC script — on top of
[`@themeon/core`](https://github.com/themeon/themeon/tree/main/packages/core).

**One owner of the DOM write.** `useTheme()` sets the `data-theme` attribute (static themes
swap variables via the `[data-theme]` block emitted by `@themeon/core`'s `tokens.css`) and,
optionally, patches inline variables at runtime via `applyTheme` for themes that only exist
at runtime (tenant/dynamic themes, no rebuild).

> **Status: pre-1.0 — the API may change.** Pinned by a public-surface snapshot test, but not
> yet stable.

## Install

```sh
pnpm add @themeon/vue @themeon/core vue
```

ESM-only, Node `>= 22.18`, `vue ^3.5` (peer).

## Quickstart — plain SPA (no plugin)

```ts
import { useTheme } from '@themeon/vue'

const { theme, isDark, set, toggle, init } = useTheme({ themes: ['light', 'dark'] })
onMounted(() => init())
```

Calling `useTheme()` without a registered plugin falls back to a module-level singleton —
convenient for a plain SPA, but **not SSR-safe**: the singleton would leak between requests
on the server. In dev, calling it without a plugin logs a warning recommending the plugin.

## Quickstart — SSR-safe (plugin)

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

`app.use(themeonPlugin, options)` creates one theme state per app instance (one per request
in SSR) and provides it via `inject`; `useTheme()` picks it up automatically. Calling
`app.use(themeonPlugin, …)` a second time on the same app is a no-op — the state is not
recreated.

## Anti-FOUC

`themeInitScript()` — from the pure subpath `@themeon/vue/anti-fouc` (zero imports, does not
pull in `vue`) — generates the *one* anti-FOUC inline script the whole ThemeOn stack reuses
(D6): it reads the persisted theme (or `prefers-color-scheme`) and sets `data-theme` on
`<html>` before Vue mounts, so the first paint is never the wrong theme.

```ts
import { themeInitScript } from '@themeon/vue/anti-fouc'

const script = themeInitScript({ storageKey: 'themeon-theme', attribute: 'data-theme' })
// `<script>${script}</script>` — inject as early as possible in <head>.
// Nuxt (`@themeon/nuxt`) injects it via `app.head.script`; Vite (`@themeon/vite`) via
// `transformIndexHtml`. Options passed to `themeInitScript` and to `useTheme`/`themeonPlugin`
// must match (same `storageKey`/`attribute`/theme names) — they are two channels of the same
// state, not two independent configs.
```

Option values are validated against a script-injection guard (no quotes, angle brackets,
backslash or newlines) — `themeInitScript` throws rather than silently producing broken or
unsafe output.

## API

### `useTheme(options?)`

| Option | Type | Default | Meaning |
|:--|:--|:--|:--|
| `themes` | `readonly string[]` | `['light', 'dark']` | Known theme names; `toggle()` cycles the first two by default. |
| `default` | `string` | — | Theme used when nothing is persisted and the system default is not wanted. |
| `storageKey` | `string \| null` | `'themeon-theme'` | `localStorage` key; `null` disables persistence. |
| `attribute` | `string` | `'data-theme'` | DOM attribute driving the switch (D6). |
| `system` | `{ dark: string; light: string }` | `{ dark: 'dark', light: 'light' }` | Maps the system preference to a theme name. |
| `disableTransition` | `boolean` | `true` | Suppress CSS transitions for one frame during a switch. |
| `runtimeVars` | `Record<string, Record<string, string>>` | — | Runtime variable patches for themes absent from the static `tokens.css` (tenant/dynamic). |

Returns `{ theme, system, isDark, set, toggle, init }` — see `UseThemeReturn` in `src/types.ts`.

### `themeonPlugin`

`app.use(themeonPlugin, options)` — `options` is the same `UseThemeOptions` shape as
`useTheme()`. Also sets `app.config.globalProperties.$theme`.

### `themeInitScript(options?)` (`@themeon/vue/anti-fouc`)

| Option | Type | Default |
|:--|:--|:--|
| `storageKey` | `string` | `'themeon-theme'` |
| `attribute` | `string` | `'data-theme'` |
| `darkTheme` | `string` | `'dark'` |
| `lightTheme` | `string` | `'light'` |

Returns the IIFE body as a string (no `<script>` tags — the caller wraps it).

## License

MIT
