# @themeon/vite

Vite plugin: `virtual:themeon.css` with HMR, optional anti-FOUC injection — for Laravel/plain
projects.

## Main exports

| Export | What it does |
|:--|:--|
| `themeon` | Creates the Vite plugin: `virtual:themeon.css` module + `hotUpdate`-based HMR + optional anti-FOUC injection into `index.html`. |
| `ThemeonViteOptions` (type) | `theme`/`tokensFiles`/`resolve`/`serialize`/`virtualId`/`cssImport`/`injectFouc`. |

## Example

```ts
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

```ts
// src/main.ts
import 'virtual:themeon.css'
import '@themeon/css/index.css'
```

The only supported connection is a JS/TS import — **not** a CSS `@import` (see the package
README for why). For Nuxt use [`@themeon/nuxt`](/basic-usage/nuxt) instead.

Full API & options → [`packages/vite/README.md` on GitHub](https://github.com/axioma-studio/themeon/tree/main/packages/vite#readme).
