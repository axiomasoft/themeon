# @themeon/nuxt

Nuxt module: CSS push, `useTheme()` auto-import, anti-FOUC head script, theme codegen + dev
watcher.

## Main exports

| Export | What it does |
|:--|:--|
| default export | The Nuxt module itself — register via `modules: ['@themeon/nuxt']`, configure under the `themeon` key (`ModuleOptions`). |
| `ModuleOptions` (type) | `css`/`storageKey`/`default`/`themes`/`attribute`/`fouc`/`theme`/`tokensDir` — see full option table in the package README. |
| `useTheme` | Auto-imported in every component — no manual import needed (module wires `addImports`). |

## Example

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
  <button v-for="p in ['light', 'dark', 'system']" :key="p" @click="theme.set(p)">
    {{ p }}{{ theme.preference.value === p ? ' ✓' : '' }}
  </button>
  <p>Applied: {{ theme.theme.value }}</p>
</template>
```

The module pushes `@themeon/css/tokens.css` + `@themeon/css/index.css` into `nuxt.options.css`,
registers a critical anti-FOUC script in `<head>`, and bootstraps a per-request `themeonPlugin`.

Full API & options → [`packages/nuxt/README.md` on GitHub](https://github.com/axioma-studio/themeon/tree/main/packages/nuxt#readme).
