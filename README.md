# ThemeOn

Typed design-token pipeline: TS tokens → CSS custom properties (build + runtime) → UI-library
adapters (Naive UI first) + CSS foundation (`@layer`, reset, layout primitives).

**Status:** WIP — P0 skeleton (monorepo scaffold, no theming logic yet).

## Packages

- `packages/core` — token model, resolver, naming engine, serializers (stub in P0).
- `apps/playground` — Nuxt smoke-consumer of `@themeon/core`.

## Commands

```sh
pnpm install
pnpm build
pnpm test
pnpm typecheck
pnpm lint
pnpm check:pack
```

MIT.
