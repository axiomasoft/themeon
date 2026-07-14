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

// Pass the SAME options you pass to useTheme() — the script and useTheme() are two channels of
// one state, not two independent configs. Omitting `themes`/`default` here while passing them to
// useTheme() is exactly how the page ends up repainting after hydration.
const script = themeInitScript({
  storageKey: 'themeon-theme',
  attribute: 'data-theme',
  themes: ['light', 'dark'],
  default: 'system',
})
// `<script>${script}</script>` — inject as early as possible in <head>.
// Nuxt (`@themeon/nuxt`) injects it per request from `runtimeConfig`; Vite (`@themeon/vite`) via
// `transformIndexHtml`.
```

Both channels resolve persistence by the **same** rules, and a test (`src/parity.test.ts`) runs every
combination of inputs through both and asserts they agree — a divergence here is a visible theme flash,
so it is an executable invariant rather than a convention.

Option values are validated against a script-injection guard (no quotes, angle brackets,
backslash or newlines) — `themeInitScript` throws rather than silently producing broken or
unsafe output.

## API

### `useTheme(options?)`

| Option | Type | Default | Meaning |
|:--|:--|:--|:--|
| `themes` | `readonly string[]` | `['light', 'dark']` | Known theme names; `toggle()` cycles the first two by default. `'system'` is a reserved preference, not a theme — do not list it. |
| `default` | `string` | `'system'` | Preference used when nothing is persisted: a theme name, or `'system'` to follow the OS. An empty or whitespace-only string means "not set" and resolves to `'system'` — it is not a theme named `''`. |
| `storageKey` | `string \| null` | `'themeon-theme'` | `localStorage` key; `null` disables persistence. |
| `attribute` | `string` | `'data-theme'` | DOM attribute driving the switch (D6). |
| `system` | `{ dark: string; light: string }` | `{ dark: 'dark', light: 'light' }` | Maps the system preference to a theme name. |
| `disableTransition` | `boolean` | `true` | Suppress CSS transitions for one frame during a switch. |
| `runtimeVars` | `Record<string, Record<string, string>>` | — | Runtime variable patches for themes absent from the static `tokens.css` (tenant/dynamic). |

Returns `{ preference, theme, system, isDark, set, toggle, init }` — see `UseThemeReturn` in `src/types.ts`.

### Preference vs theme (why there are two)

```ts
const { preference, theme, system, set } = useTheme()

preference.value // 'system' | 'light' | 'dark' | … — the user's INTENT. This is what gets persisted.
theme.value      // 'light' | 'dark' | …           — the RESOLVED theme, the one on <html>.
system.value     // 'light' | 'dark'               — the OS preference, tracked live.

set('dark')      // explicit choice — stops following the OS
set('system')    // back to following the OS, live
```

ThemeOn persists the **preference**, never the resolved theme. Storing the resolved value on behalf
of a user who never chose it would silently unsubscribe them from `prefers-color-scheme` on their very
first visit: the OS flips to dark, the site stays light, and there is no way back. Same split as VueUse
`useColorMode` (`store`/`state`) and next-themes (`theme`/`resolvedTheme`).

Consequences worth knowing:

- `init()` **never writes** to storage. Persistence is a trace of an explicit `set()`.
- While `preference` is `'system'`, an OS theme change repaints the page live — no reload needed.
- Render your switcher's selected item from `preference`, and the page from `theme`.

`set(value)` ignores an empty or whitespace-only value: it warns and returns without touching the DOM
or persistence, leaving the current theme in place. An empty string is never a theme — it is how a
missing value arrives over a JSON/env transport (Nitro coerces an unset `runtimeConfig` value to `''`),
and applying it would wipe the attribute and poison the persisted value.

### `themeonPlugin`

`app.use(themeonPlugin, options)` — `options` is the same `UseThemeOptions` shape as
`useTheme()`. Also sets `app.config.globalProperties.$theme`.

### `themeInitScript(options?)` (`@themeon/vue/anti-fouc`)

| Option | Type | Default | Meaning |
|:--|:--|:--|:--|
| `storageKey` | `string` | `'themeon-theme'` | `localStorage` key — must match `useTheme()`. |
| `attribute` | `string` | `'data-theme'` | DOM attribute — must match `useTheme()`. |
| `darkTheme` | `string` | `'dark'` | Name used when the system prefers dark. |
| `lightTheme` | `string` | `'light'` | Name used when the system prefers light. |
| `default` | `string` | `'system'` | Preference used when nothing is persisted — a theme name, or `'system'` to follow the OS. `''`/whitespace means "not set". |
| `themes` | `readonly string[]` | — | Known theme names. When set, a persisted name outside the set is rejected and the fallback applies. |

Returns the IIFE body as a string (no `<script>` tags — the caller wraps it).

Pass the **same** `storageKey`/`attribute`/`default`/`themes` you pass to `useTheme()`. The script
runs before paint and `useTheme().init()` runs after hydration; if they resolve the theme by
different rules, the page visibly repaints. (`@themeon/nuxt` wires both from one config for you.)

## License

MIT
