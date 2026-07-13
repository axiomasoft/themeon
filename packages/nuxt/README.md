# @themeon/nuxt

Nuxt module for ThemeOn: pushes the CSS foundation (`@themeon/css`), auto-imports
`useTheme()`, bootstraps a per-request theme state, injects the one generated anti-FOUC head
script (D6) and — optionally — generates `tokens.css` from your own
[`@themeon/core`](https://github.com/themeon/themeon/tree/main/packages/core) theme with a
dev-time watcher. Zero manual wiring.

> **Status: pre-1.0 — the API may change.**

## Install

```sh
pnpm add @themeon/nuxt
```

ESM-only, Node `>= 22.18`, `nuxt: >=4.0.0` (peer).

## Quickstart

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@themeon/nuxt'],
  themeon: {
    themes: ['light', 'dark'],
    default: 'light',
  },
})
```

```vue
<!-- any component, useTheme is auto-imported -->
<script setup lang="ts">
const theme = useTheme()
</script>

<template>
  <button class="btn" @click="theme.toggle()">
    Theme: {{ theme.theme.value }}
  </button>
</template>
```

The module pushes `@themeon/css/tokens.css` + `@themeon/css/index.css` into `nuxt.options.css`
(first — before your own CSS), registers a critical anti-FOUC script in `<head>`, and
bootstraps a per-app (= per-request in SSR) `themeonPlugin` so `useTheme()` is always
SSR-safe — no module-level singleton leaking between requests.

## Options (`ModuleOptions`, `configKey: 'themeon'`)

| Option | Type | Default | Notes |
|:--|:--|:--|:--|
| `css` | `boolean` | `true` | Push the static CSS foundation (`tokens.css` + `index.css`). |
| `storageKey` | `string` | `'themeon-theme'` | `localStorage` key (shared by `useTheme()` and the anti-FOUC script). |
| `default` | `string` | — | Theme used when nothing is persisted and the system default isn't wanted. `''` (and an unset option) means "not set" — falls back to the `prefers-color-scheme` system preference, not a literal theme named `''`. |
| `themes` | `readonly string[]` | `['light', 'dark']` | Known theme names. |
| `attribute` | `string` | `'data-theme'` | DOM attribute driving the switch (D6). |
| `fouc` | `boolean` | `true` | Insert the generated anti-FOUC head script. |
| `theme` | `string` | — | Path to a user theme module (`defineTheme`, default export or named `theme`/`defaultTheme`). When set, replaces the static `tokens.css` with a generated one. |
| `tokensDir` | `string` | `dirname(theme)` | Directory watched for regenerating the theme in dev (hashed, not a hardcoded file list). |

### Environment overrides and the anti-FOUC script

Options travel to the client through `runtimeConfig.public.themeon`, so they can be overridden at
runtime with `NUXT_PUBLIC_THEMEON_*` (that is why `default` is always emitted, as `''` when unset —
Nitro only applies env overrides to keys that already exist in the config).

**That override reaches the runtime only, not the anti-FOUC script.** The script is baked into
`<head>` at build time from `nuxt.config`, so it cannot see an environment variable applied later:

```sh
# nuxt.config has no `themeon.default`
NUXT_PUBLIC_THEMEON_DEFAULT=dark node .output/server/index.mjs
```

Here the pre-paint script still resolves the theme from `prefers-color-scheme`, while `useTheme()`
resolves `dark` after hydration — a visitor on a light OS sees a light→dark flash on first paint.

Set the theme you want in `nuxt.config` (`themeon: { default: 'dark' }`) and treat
`NUXT_PUBLIC_THEMEON_DEFAULT` as an override of the *same* value per environment, not as the only
place it is declared. Resolving the script per request is a separate route, not implemented yet.

## Generating tokens from your own theme

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@themeon/nuxt'],
  themeon: {
    theme: './theme.config.ts',
    tokensDir: './theme', // optional — defaults to the theme file's directory
  },
})
```

```ts
// theme.config.ts
import { defineTheme } from '@themeon/core'

export default defineTheme({ /* … */ })
```

In dev, editing any file under `tokensDir` regenerates `tokens.css` automatically (hashed
directory watch — no hardcoded file list, D13). In production the theme is generated once at
build time.

## Anti-FOUC

The module injects the *one* generated anti-FOUC script the whole ThemeOn stack reuses (D6,
`@themeon/vue/anti-fouc`) as a critical `app.head.script` entry — it runs before Vue mounts and
sets `data-theme` from the persisted value or `prefers-color-scheme`, so the first paint is
never the wrong theme. Set `fouc: false` to opt out (e.g. if you inject it yourself elsewhere).

## License

MIT
