# Installation

Every package requires **Node `>= 22.18.0`** (root `package.json` `engines.node`) and is
ESM-only. Install only the packages your stack needs — the Basic Usage section (one page per
package) covers what each one does.

## npm availability

Workspace manifests use **`0.0.0`** as a [Changesets](https://github.com/changesets/changesets)
placeholder until `changeset version` assigns real semver. That **does not** mean the packages are
already installable from npm: as of **2026-09-19**, `npm view @themeon/<package>` returns `E404`
for every public workspace package. Use a git dependency or monorepo `workspace:*` link until the
first release lands on npmjs.

After publish, scoped installs look like:

```sh
pnpm add @themeon/core
# or: npm add @themeon/core
```

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

The CLI ships as **`@themeon/cli`** (binary name `themeon`) — not a bare `themeon` npm name until
that package exists on the registry:

```sh
pnpm add -D @themeon/cli
# or: npm add -D @themeon/cli
```

Next: [Quick Start](/introduction/quick-start).
