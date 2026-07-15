---
layout: home
hero:
  name: ThemeOn
  tagline: Typed design-token pipeline — TS tokens → CSS custom properties → UI-library adapters
  actions:
    - theme: brand
      text: Get Started
      link: /introduction/quick-start
    - theme: alt
      text: Why ThemeOn
      link: /introduction/why-themeon
    - theme: alt
      text: GitHub
      link: https://github.com/axioma-studio/themeon
---

## What's in the box

<div class="themeon-features">

**🔤 Typed tokens**
Author tokens in TypeScript (`@themeon/core`) — `ref`/`sys`/`comp` model, resolver, naming
engine, CSS/DTCG serializers, runtime applier. Zero runtime deps.

**🎨 OKLCH color scales**
Seed → 12-step OKLCH scale (Radix-shaped) with an APCA contrast gate (`@themeon/colors`).

**🏗️ CSS foundation**
`@layer` cascade, reset, base typography, layout composition, component skeletons
(`@themeon/css`).

**⚡ Vue/Nuxt/Vite wiring**
`useTheme()` (persist, `prefers-color-scheme`, N themes), anti-FOUC script, HMR-aware Vite plugin
(`@themeon/vue`, `@themeon/nuxt`, `@themeon/vite`).

**🧩 Naive UI adapter**
`toNative(resolved)` → `GlobalThemeOverrides`, so a component library actually respects your
tokens (`@themeon/naive`).

**🛠️ CLI**
`init` / `build` / `check` — scaffold a theme, compile it to `tokens.css`, lint token coverage,
contrast and hardcoded values (`themeon`).

</div>

## One theme, three steps

::: code-group

```ts [1. Define]
// theme.config.ts
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

```sh [2. Build]
themeon build
# compiles theme/theme.config.ts → tokens.css
```

```ts [3. Consume — Vue]
import { useTheme } from '@themeon/vue'

const { theme, isDark, set, toggle, init } = useTheme({ themes: ['light', 'dark'] })
onMounted(() => init())
```

:::

→ [Full quick-start →](/introduction/quick-start) (Vue, Nuxt, Vite, Laravel targets)

## How it compares

| | ThemeOn | Raw CSS vars | Tailwind `@theme` alone |
|---|:---:|:---:|:---:|
| Typed token authoring (TS, compile-time checked) | ✅ | ❌ | ❌ |
| Runtime theme/tenant switching without rebuild | ✅ | ⚠️ manual | ⚠️ manual |
| UI-library adapters (Naive UI) | ✅ | ❌ | ❌ |
| APCA contrast-gated color scale generator | ✅ | ❌ | ❌ |
| CSS foundation (`@layer`, reset, layout primitives) | ✅ | ❌ | ⚠️ utilities only |

No direct competitor covers the same ground (RAG pass 2026-07-07, [`R-01..R-07`](https://github.com/axioma-studio/themeon/tree/main/plans/archive/2026.07.12-BASE/20_research)) — the closest, TokiForge, stops at token compilation and ships no adapters to component libraries.

→ [Why ThemeOn →](/introduction/why-themeon)
