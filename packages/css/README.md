# @themeon/css

CSS foundation for ThemeOn: `@layer` cascade, reset, base typography, layout composition
primitives, site blueprints and component skeletons — all on CSS custom properties
consumed from `@themeon/core`-generated themes.

> Full package overview (reset/base/composition/components/utilities, default theme) lands
> in P2.7. This README currently documents the **Blueprints** layer (P2.5).

## Blueprints

Site-blueprint classes (`@layer themeon.blueprints`) are CSS-only recipes for common page
zones — `@themeon/css` never ships markup or JavaScript, only the styling. Copy the HTML
snippets below into your templates/components.

### `.page-shell`

Page wrapper: a full-height flex column that pins the footer to the bottom, and declares
the named `page` container that `.site-header`'s burger threshold below queries via
`@container page (...)`.

```html
<body class="page-shell">
  <header class="site-header">…</header>
  <main>…</main>
  <footer class="site-footer">…</footer>
</body>
```

| Parameter | Default |
|:--|:--|
| — | (no local parameters; `container: page / inline-size` is fixed) |

### `.site-header` + `.site-nav` (burger menu)

Horizontal navigation on wide viewports; below a **48rem** inline-size threshold the nav
collapses into a burger button that opens a CSS-only popover panel. The panel uses the
native **Popover API** (`popover` / `popovertarget`): the browser provides light-dismiss,
<kbd>Esc</kbd>-to-close and top-layer stacking for free — no JavaScript required.

```html
<header class="site-header">
  <a href="/">Brand</a>
  <nav class="site-nav">
    <a href="/features">Features</a>
    <a href="/pricing">Pricing</a>
  </nav>
  <button class="nav-burger" popovertarget="site-menu" aria-label="Menu">☰</button>
  <nav id="site-menu" class="nav-menu" popover>
    <a href="/features">Features</a>
    <a href="/pricing">Pricing</a>
  </nav>
</header>
```

| Parameter | Default |
|:--|:--|
| `--header-gap` | `var(--spacing-md, 1rem)` |
| `--header-pad-block` | `var(--spacing-sm, 0.75rem)` |
| `--header-pad-inline` | `var(--spacing-md, 1rem)` |
| `--nav-gap` | `var(--spacing-md, 1rem)` |

**Overriding the 48rem threshold.** The breakpoint is a fixed value inside
`@container page (inline-size < 48rem) { … }` — `var()` is not allowed inside container-query
conditions per spec, so it cannot be parameterized with a custom property. To use a different
threshold, copy the `@container` block into your own (unlayered) stylesheet with your value:
an unlayered rule always wins over a `@layer`-scoped one, regardless of source order or
specificity, so your override applies without touching the package.

**Anchor Positioning degradation.** Pinning the open panel next to the burger button uses
CSS Anchor Positioning (`anchor-name` / `position-anchor`) as a progressive enhancement
behind `@supports (anchor-name: --nav)`. Without support, the menu still opens and is fully
usable — the browser's default Popover placement centers it in the top layer.

### `.hero`

Centered introductory section with a measure-limited content column.

```html
<section class="hero">
  <h1>Ship your design system, not another CSS reset</h1>
  <p>Typed tokens → CSS variables → adapters, in one package.</p>
</section>
```

| Parameter | Default |
|:--|:--|
| `--hero-pad-block` | `clamp(4rem, 12vi, 8rem)` |
| `--hero-max` | `60ch` |

### `.section`

Vertical rhythm for page sections, with a `.section--subtle` modifier for alternating
section backgrounds.

```html
<section class="section">…</section>
<section class="section section--subtle">…</section>
```

| Parameter | Default |
|:--|:--|
| `--section-pad-block` | `clamp(3rem, 8vi, 6rem)` |

### `.site-footer`

Muted-background footer with an auto-fit column grid (`.footer-cols`).

```html
<footer class="site-footer">
  <div class="footer-cols">
    <div>Product</div>
    <div>Company</div>
    <div>Legal</div>
  </div>
</footer>
```

| Parameter | Default |
|:--|:--|
| `--footer-pad-block` | `var(--spacing-2xl, 3rem)` |
| `--footer-pad-inline` | `var(--spacing-md, 1rem)` |
| `--footer-gap` | `var(--spacing-xl, 2rem)` |
