# Quick Start

Every target follows the same three steps — **Define** a theme with `@themeon/core`, **Build**
it into CSS (via the CLI or a bundler plugin), **Consume** the result. Pick your target below.

::: code-group

```ts [Vue]
// 1. Define — theme.config.ts
import { defineTokens, defineTheme } from '@themeon/core'

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
```

```sh [Vue — 2. Build]
themeon build
# compiles theme/theme.config.ts → tokens.css (defaults; see the CLI page for --config/--out/--tailwind)
```

```ts [Vue — 3. Consume]
import { useTheme } from '@themeon/vue'

const { theme, isDark, set, toggle, init } = useTheme({ themes: ['light', 'dark'] })
onMounted(() => init())
```

```ts [Nuxt — 1. Define]
// theme.config.ts
import { defineTheme } from '@themeon/core'

export default defineTheme({ /* … */ })
```

```ts [Nuxt — 2. Build]
// nuxt.config.ts — the module generates tokens.css from your theme automatically
export default defineNuxtConfig({
  modules: ['@themeon/nuxt'],
  themeon: {
    theme: './theme.config.ts',
    tokensDir: './theme', // optional — defaults to the theme file's directory
  },
})
```

```vue [Nuxt — 3. Consume]
<!-- any component, useTheme is auto-imported -->
<script setup lang="ts">
const theme = useTheme()
</script>
```

```ts [Vite — 1. Define]
// resources/theme.config.ts (or theme.config.ts for a plain SPA)
import { defineTokens, defineTheme } from '@themeon/core'

const palette = defineTokens('color', {
  forest: { 600: 'oklch(0.55 0.13 155)' },
  neutral: { 0: 'oklch(0.99 0 0)', 900: 'oklch(0.15 0 0)' },
})

export const theme = defineTheme({
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
```

```ts [Vite — 2. Build]
// vite.config.ts
import { defineConfig } from 'vite'
import { themeon } from '@themeon/vite'
import { theme } from './theme.config'

export default defineConfig({
  plugins: [
    themeon({
      theme,
      tokensFiles: ['./theme.config.ts'],
      injectFouc: true, // inserts the anti-FOUC script into index.html
    }),
  ],
})
```

```ts [Vite — 3. Consume]
// src/main.ts
import 'virtual:themeon.css'
import '@themeon/css/index.css'
```

```js [Laravel — 1+2. Define + Build]
// vite.config.js
import laravel from 'laravel-vite-plugin'
import { defineConfig } from 'vite'
import { themeon } from '@themeon/vite'
import { theme } from './resources/theme.config'

export default defineConfig({
  plugins: [
    laravel({ input: ['resources/css/app.css', 'resources/js/app.js'] }),
    themeon({ theme, tokensFiles: ['./resources/theme.config.ts'], injectFouc: true }),
  ],
})
```

```js [Laravel — 3. Consume]
// resources/js/app.js
import 'virtual:themeon.css'
```

:::

**Do not** add `@import 'virtual:themeon.css'` to a CSS file (Vite or Laravel) — the virtual
module is JS-import only, `postcss-import`'s resolver never consults plugin `resolveId`/`load`
hooks. The Recipes section covers the full picture (all three Laravel-facing channels, including
the pure-Blade CSS-only path) and the `@themeon/vite` Basic Usage page covers HMR and the
reasoning in full.

Next: pick your package in Basic Usage for the full API, or read Best Practices before you ship.
