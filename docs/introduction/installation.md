# Installation

Every package requires **Node `>= 22.18.0`** (root `package.json` `engines.node`) and is
ESM-only. Install only the packages your stack needs — the Basic Usage section (one page per
package) covers what each one does.

## Core (always needed)

```sh
pnpm add @themeon/core
# or: npm add @themeon/core
```

## CSS foundation and color scales

```sh
pnpm add @themeon/css @themeon/colors
# or: npm add @themeon/css @themeon/colors
```

## Vue (plain SPA or SSR)

```sh
pnpm add @themeon/vue @themeon/core vue
# or: npm add @themeon/vue @themeon/core vue
```

## Nuxt

```sh
pnpm add @themeon/nuxt
# or: npm add @themeon/nuxt
```

Requires `nuxt >= 4.0.0` as a peer.

## Vite (Laravel + Vite, plain Vue/vanilla SPAs — everything that isn't Nuxt)

```sh
pnpm add @themeon/vite @themeon/core vite
# or: npm add @themeon/vite @themeon/core vite
```

Requires `vite ^7 || ^8` as a peer. Does not require Vue.

## Naive UI adapter

```sh
pnpm add @themeon/naive
# or: npm add @themeon/naive
```

Requires `naive-ui ^2.44` and `vue ^3.5` as peers.

## Tailwind v4 bridge

```sh
pnpm add @themeon/tailwind
# or: npm add @themeon/tailwind
```

## CLI

The CLI ships under the bare `themeon` package name (not `@themeon/*`) — it's the umbrella tool,
not a scoped library adapter:

```sh
npm i -D themeon
```

Next: [Quick Start](/introduction/quick-start).
