# @themeon/naive

Naive UI adapter for ThemeOn: `toNative(resolved)` builds a Naive UI `GlobalThemeOverrides`
object from a resolved ThemeOn theme — feed it straight into `<NConfigProvider
:theme-overrides>`.

## Why a JS bridge, not CSS vars

Naive UI does not read CSS custom properties for its theming (a CSS-var input was rejected
upstream, naive-ui#4515) — the only supported channel is a JS `GlobalThemeOverrides` object
passed to `<NConfigProvider>`. `toNative` builds that object from the same resolved theme
`@themeon/tailwind` and `serializeThemeCss` consume, so all three stay in sync with a single
source of truth.

## Colours are hex/rgba, not oklch

Naive derives interaction states (`*Hover`/`*Pressed`/`*Suppl`) internally via `seemly`, whose
oklch support is not confirmed. To avoid depending on unverified upstream colour math, this
adapter converts every colour to hex (or hex8 when the source has alpha) via `colorjs.io`
**before** handing it to Naive, and computes `hover`/`pressed`/`suppl` itself — from an OKLCH
lightness shift — whenever the theme does not define them explicitly. An explicit role in the
theme (e.g. `--color-action-primary-hover`) always wins over the derived value.

## Quickstart

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

## API

```ts
export interface ToNativeOptions {
  /** Theme key in resolved.themes to overlay onto the base; omitted → base (:root) values. */
  theme?: string
  /** Extra per-component / peers overrides, deep-merged over the generated `common`. */
  overrides?: GlobalThemeOverrides
}

export function toNative(resolved: ResolvedTheme, opts?: ToNativeOptions): GlobalThemeOverrides
```

`toNative` fills Naive's `common` overrides from a fixed ThemeOn-role → Naive-key map (primary
action colour, backgrounds, text, borders, radii, shadows, font family/sizes — see the mapping
table below), converts every colour through `toHex`, and derives any missing
`*Hover`/`*Pressed`/`*Suppl` suffix. Pass `opts.overrides` for anything this package does not
map — per-component "chrome" (Input/DatePicker/Popover styling, dark surfaces, etc.) is
intentionally **not** hardcoded here; it is your theme's concern, deep-merged on top.

### Mapping table (default-theme roles → Naive `common`)

| ThemeOn var | Naive key(s) |
|:--|:--|
| `--color-action-primary` | `primaryColor` |
| `--color-action-primary-hover` | `primaryColorHover` |
| `--color-status-success/warning/error/info` | `successColor`/`warningColor`/`errorColor`/`infoColor` |
| `--color-bg-page` | `bodyColor` |
| `--color-bg-subtle` | `baseColor` |
| `--color-bg-elevated` | `cardColor`, `modalColor`, `popoverColor` |
| `--color-text` | `textColorBase`, `textColor1` |
| `--color-text-muted` | `textColor2`, `textColor3` |
| `--color-border` | `borderColor`, `dividerColor` |
| `--radius-md` / `--radius-sm` | `borderRadius` / `borderRadiusSmall` |
| `--shadow-sm/md/lg` | `boxShadow1`/`boxShadow2`/`boxShadow3` |
| `--font-sans` | `fontFamily` |
| `--text-xs/sm/base/lg` | `fontSizeMini`/`fontSizeSmall`/`fontSizeMedium`/`fontSizeLarge` |

Roles absent from your theme are simply skipped — `toNative` does not error on a partial theme.

## Merging overrides — `mergeOverrides`

```ts
export function mergeOverrides(...layers: (GlobalThemeOverrides | undefined)[]): GlobalThemeOverrides
```

A small (~20 LOC) recursive deep-merge for `GlobalThemeOverrides` layers: nested objects
(`peers`, per-component keys) are merged key-by-key, arrays and primitives are replaced
wholesale by the right-most layer, `undefined` layers are skipped, and `__proto__` /
`constructor` / `prototype` keys are dropped (prototype-pollution guard). Plain
`Object.assign`/spread would silently wipe out `peers` and other nested per-component objects
instead of merging them — this is why `toNative` and `resolveResponsiveOverrides` both use
`mergeOverrides` internally, and why you should too when layering your own overrides.

## Responsive overrides — `resolveResponsiveOverrides`

```ts
export function resolveResponsiveOverrides(
  base: GlobalThemeOverrides,
  breakpointOverrides: BreakpointOverrides,
  activeBreakpoints: readonly string[],
): GlobalThemeOverrides
```

Folds `breakpointOverrides[name]` onto `base` for each name in `activeBreakpoints`, in order —
so a later (wider) breakpoint in the array wins over an earlier one on conflicting keys. The
list of active breakpoint names is **your** responsibility to compute (e.g. via VueUse's
`useBreakpoints` or any other JS media-query watcher) — Naive's own breakpoints are not
consulted. Wrap the call in `computed()` for reactivity:

```ts
const overrides = computed(() =>
  resolveResponsiveOverrides(toNative(resolved), breakpointPatches, activeBreakpoints.value),
)
```

## Naming

`toNative` does not name anything — every ThemeOn var it reads comes straight out of
`ResolvedTheme` (ThemeOn's single naming engine, applied once in the resolver). This package
only maps and converts; there is no second kebab/namespace transform here.
