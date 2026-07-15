# @themeon/css

CSS foundation: `@layer` cascade, reset, base typography, layout composition, component
skeletons.

## Main exports (entry points)

| Entry | What it does |
|:--|:--|
| `./tokens.css` | Generated default theme (light base + `dark` theme) — `@themeon/core`+`@themeon/colors` dogfood. |
| `./layers.css` / `./layers-tailwind.css` | `@layer` order declaration — plain, or co-existing with Tailwind v4. |
| `./reset.css` / `./base.css` | Minimal reset + tag typography on contract variables. |
| `./composition.css` | 8 layout primitives: `.container`/`.stack`/`.cluster`/`.with-sidebar`/`.center`/`.cover`/`.switcher`/`.grid`. |
| `./blueprints.css` | Site-zone recipes: `.page-shell`/`.site-header`+`.site-nav`/`.hero`/`.section`/`.site-footer`. |
| `./components.css` / `./utilities.css` | `.btn`/`.badge`/`.card` skeletons + 6 intentional utilities. |
| `./index.css` | Convenience aggregate — everything but `tokens` (bring your own theme). |
| `.` (JS) | `CSS_CONTRACT` / `THEMEON_LAYERS` — machine-readable variable contract, input for `themeon check`. |

## Example

```html
<link rel="stylesheet" href="node_modules/@themeon/css/dist/tokens.css" />
<link rel="stylesheet" href="node_modules/@themeon/css/dist/index.css" />
```

or, with a bundler resolving package exports:

```css
@import "@themeon/css/tokens.css";
@import "@themeon/css/index.css";
```

`tokens.css` must be imported **before** `index.css` — it declares the `sys`-layer custom
properties every other layer falls back to.

Full API & options → [`packages/css/README.md` on GitHub](https://github.com/axioma-studio/themeon/tree/main/packages/css#readme).
