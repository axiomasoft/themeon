# @themeon/naive

Naive UI adapter: `toNative(resolved)` → `GlobalThemeOverrides`.

## Main exports

| Export | What it does |
|:--|:--|
| `toNative` | Builds a Naive UI `GlobalThemeOverrides` object from a resolved ThemeOn theme — feed straight into `<NConfigProvider :theme-overrides>`. |
| `mergeOverrides` | Recursive deep-merge for `GlobalThemeOverrides` layers (nested `peers`/per-component keys merge instead of being wiped by `Object.assign`). |
| `resolveResponsiveOverrides` | Folds breakpoint-scoped overrides onto a base `GlobalThemeOverrides` for the currently active breakpoints. |
| `toHex` / `deriveInteractionStates` | Color helpers `toNative` uses internally — converts to hex/hex8, derives `hover`/`pressed`/`suppl` when a theme doesn't define them explicitly. |

## Example

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { NConfigProvider, darkTheme } from 'naive-ui'
import { toNative } from '@themeon/naive'
import { useTheme } from '@themeon/vue'
import { resolved } from './theme' // resolveTheme(defineTheme(...)) at build/import time

const { theme, isDark } = useTheme()
const overrides = computed(() => toNative(resolved, { theme: theme.value }))
</script>

<template>
  <NConfigProvider :theme="isDark ? darkTheme : null" :theme-overrides="overrides">
    <slot />
  </NConfigProvider>
</template>
```

Naive UI does not read CSS custom properties for its theming — this is the only supported
channel, a JS `GlobalThemeOverrides` object built from the same resolved theme
`@themeon/tailwind`/`serializeThemeCss` consume.

Full API & options → [`packages/naive/README.md` on GitHub](https://github.com/axioma-studio/themeon/tree/main/packages/naive#readme).
