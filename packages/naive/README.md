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
**before** handing it to Naive, and computes `hover`/`pressed`/`suppl` itself whenever the theme
does not define them explicitly — an explicit role (`--color-action-primary-hover/-pressed/
-suppl`, and the same suffixes on `--color-status-{success,warning,error,info}`) always wins
byte-for-byte over the derived value.

The derivation follows the theme's own scale rather than a fixed shift: `hover = base +
Δ(appearance)`, where `Δ` is `STEP10_DELTA` from `@themeon/colors` (the same step 9→10
lightness delta the colour scale itself uses — light themes get a darker hover, dark themes a
lighter one, matching Radix step 10). `pressed`, absent an explicit role, extrapolates the
`base → hover` vector one more step (`k=2`) in OKLCH — this works for any theme's scale, not
just Radix-shaped ones, because the direction comes from the vector itself. `suppl`, absent an
explicit role, is `base` unchanged: Naive's own dark-theme `*ColorSuppl` sits in roughly the
same lightness band ThemeOn's solid accent already occupies, so no shift is needed.

## Literals, not `var()` — and fail-loud on the rest

`toNative` reads colours from `resolved.tokens[].value` (the resolver's final, reference-
collapsed literal), never from `resolved.vars` — the latter is CSS-emit transport and carries
`var(--ref)` chains at the default `refLayer`. A colour role that still resolves to something
`colorjs.io`/seemly cannot parse (`var()`, `color-mix()`, `light-dark()`, relative-color syntax,
`currentColor`, `calc()`, …) makes `toNative()` throw `ThemeonError('BAD_COLOR')` listing every
offending role, unless you pass `{ onInvalidColor: 'skip' }` — then the role is simply omitted
and Naive keeps its own stock value (same tolerance as a partial theme).

## Ink is per-component, not `common.baseColor`

Naive's `common.baseColor` (`#FFF`/`#000`) is simultaneously the canvas extreme, the
`composite()` fallback surface, and — in dark — the stock text colour on every solid-coloured
component. ThemeOn's solid accent (Radix step 9) keeps roughly the same lightness in both
themes, so there is no single `baseColor` substitute that works for both roles at once. This
adapter therefore leaves `common.baseColor` untouched and instead paints ink onto each
component that actually uses it: `Button.textColor{,Hover,Pressed,Focus,Disabled}{Primary,
Success,Warning,Error,Info}`, `Checkbox.checkMarkColor`, `Tag.textColorChecked`, and others,
from `--color-on-<role>` (falling back to `--color-on-primary` when a status-specific ink role
is absent) — only for roles your theme actually defines. A second table paints "canvas" text
(menu items, anchors, tabs, ghost/text buttons) from `--color-link`, because Naive's
`primaryColor` doubles as both a fill and canvas-text ink, and the fill-tuned `--color-on-
primary` reads poorly there in a dark theme.

A handful of ink targets (`Radio.buttonTextColorActive`, `FloatButton.textColorPrimary`,
`Switch.iconColor`) only apply in dark — Naive's own light-mode stock values for these are
already correct. `toNative` picks the branch from `opts.appearance`, falling back to
`resolved.schemes[opts.theme]`, falling back to `'light'`. The `schemes` fallback only resolves
to `'dark'` when the theme key is literally named `'dark'` (ThemeOn's naming convention) — if
your dark theme has a different key (e.g. `'night'`), pass `{ appearance: 'dark' }` explicitly,
or those three overrides silently stay on their (wrong) light-mode ink.

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
  /**
   * Light/dark branch for the accent/ink override tables. Defaults to
   * `resolved.schemes[opts.theme]`, falling back to `'light'` when unresolved.
   */
  appearance?: 'light' | 'dark'
  /**
   * What to do when a colour role resolves to something colorjs.io/seemly cannot parse.
   * `'throw'` (default) fails loud with every offending role; `'skip'` drops the role.
   */
  onInvalidColor?: 'throw' | 'skip'
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
| `--color-action-primary-hover/-pressed/-suppl` | `primaryColorHover`/`primaryColorPressed`/`primaryColorSuppl` (derived if absent — see above) |
| `--color-status-success/warning/error/info` | `successColor`/`warningColor`/`errorColor`/`infoColor` |
| `--color-status-{success,warning,error,info}-hover/-pressed/-suppl` | same, `{status}ColorHover/Pressed/Suppl` (derived if absent) |
| `--color-bg-page` | `bodyColor` |
| `--color-bg-subtle` | `actionColor`, `tableHeaderColor`, `tabColor` |
| `--color-bg-elevated` | `cardColor`, `modalColor`, `popoverColor`, `tableColor` |
| `--color-text` | `textColorBase`, `textColor1` |
| `--color-text-muted` | `textColor2`, `textColor3` |
| `--color-border` | `borderColor`, `dividerColor` |
| `--radius-md` / `--radius-sm` | `borderRadius` / `borderRadiusSmall` |
| `--shadow-sm/md/lg` | `boxShadow1`/`boxShadow2`/`boxShadow3` |
| `--font-sans` | `fontFamily` |
| `--text-xs/sm/base/lg` | `fontSizeMini`/`fontSizeSmall`/`fontSizeMedium`/`fontSizeLarge` |

`common.baseColor` is intentionally **not** mapped — see "Ink is per-component" above.
Roles absent from your theme are simply skipped — `toNative` does not error on a partial theme
(unless a role it *does* find is an unparsable colour, see "fail-loud" above).

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
