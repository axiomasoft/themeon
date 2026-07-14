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
    // `default` is optional — it defaults to 'system' (follow the OS preference).
  },
})
```

```vue
<!-- any component, useTheme is auto-imported -->
<script setup lang="ts">
const theme = useTheme()
</script>

<template>
  <!-- `preference` is the user's intent ('system' | 'light' | 'dark'), `theme` is what's applied -->
  <button v-for="p in ['light', 'dark', 'system']" :key="p" @click="theme.set(p)">
    {{ p }}{{ theme.preference.value === p ? ' ✓' : '' }}
  </button>
  <p>Applied: {{ theme.theme.value }}</p>
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
| `default` | `string` | `'system'` | Preference used when nothing is persisted — a theme name, or `'system'` to follow the OS. `''` (and an unset option) means "not set" and resolves to `'system'`, not a literal theme named `''`. |
| `themes` | `readonly string[]` | `['light', 'dark']` | Known theme names. |
| `attribute` | `string` | `'data-theme'` | DOM attribute driving the switch (D6). |
| `fouc` | `boolean` | `true` | Insert the generated anti-FOUC head script. |
| `theme` | `string` | — | Path to a user theme module (`defineTheme`, default export or named `theme`/`defaultTheme`). When set, replaces the static `tokens.css` with a generated one. |
| `tokensDir` | `string` | `dirname(theme)` | Directory watched for regenerating the theme in dev. Cannot be the project root. |

### Environment overrides

Options travel to the client through `runtimeConfig.public.themeon`, so they can be overridden at
runtime with `NUXT_PUBLIC_THEMEON_*` (that is why `default` is always emitted, as `''` when unset —
Nitro only applies env overrides to keys that already exist in the config).

The override reaches **both** channels — the runtime *and* the pre-paint anti-FOUC script:

```sh
# nuxt.config has no `themeon.default`
NUXT_PUBLIC_THEMEON_DEFAULT=dark node .output/server/index.mjs
```

Under SSR the script is generated per request from `runtimeConfig` (a server-only plugin injecting a
critical `<head>` script), so it sees `dark` too and the first paint is already correct — no flash.
In a pure SPA build (`ssr: false`) there is no server, so the script is baked at build time instead;
`runtimeConfig` is baked there as well, so env overrides do not apply to that build in any case.

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

In dev, editing the theme file — or any file it imports, from anywhere in `tokensDir` — regenerates
`tokens.css` automatically (the module re-reads the whole import graph on every save and skips the
write when the generated CSS is unchanged). If the theme file lives at the project root, `tokensDir`
falls back to the file itself: Nuxt can only watch it with a full dev-server restart on save (a
watched directory would swallow Nuxt's own narrower subscriptions). Move the theme into its own
directory (e.g. `theme/`) or set `tokensDir` to get CSS hot-reload without a restart. In production
the theme is generated once at build time.

## Anti-FOUC

The module injects the *one* generated anti-FOUC script the whole ThemeOn stack reuses (D6,
`@themeon/vue/anti-fouc`) as a critical `<head>` script — it runs before Vue mounts and sets
`data-theme` from the persisted preference or `prefers-color-scheme`, so the first paint is never the
wrong theme. Under SSR it is generated per request from `runtimeConfig` (so env overrides reach it);
in a SPA build it is baked into the HTML. Set `fouc: false` to opt out (e.g. if you inject it
yourself elsewhere).

The script and `useTheme()` resolve persistence by the same rules — `@themeon/vue` has a test that
runs every combination of inputs through both channels and asserts they agree, because any divergence
between them is a visible theme flash after hydration.

## License

MIT
