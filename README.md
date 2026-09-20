# ThemeOn

Typed design-token pipeline: TS tokens → CSS custom properties (build + runtime) → UI-library
adapters (Naive UI first) + CSS foundation (`@layer`, reset, layout primitives).

**Status:** pre-1.0 — packages are **not on the public npm registry yet** (registry check
2026-09-19: `npm view` returns `E404` for every `@themeon/*` workspace name). Release plumbing
(Changesets, `release.yml`, pack contract) is in place; workspace manifests stay at **`0.0.0`**
until the first `changeset version` / publish. Install from git or workspace links until then.

The engine, CSS foundation, framework adapters, and CLI are implemented and tested; the public API
is pinned by snapshot tests but not yet stable. Pilot migrations of real apps are in progress.

**Plan:** compiler-hardening completed — [`plans/archive/2026.09.19-№1-THEMEON-COMPILER-HARDENING/plan.md`](plans/archive/2026.09.19-№1-THEMEON-COMPILER-HARDENING/plan.md)
(see [`plans/ACTIVE.md`](plans/ACTIVE.md)). Earlier baseline:
[`plans/archive/2026.07.12-BASE/plan.md`](plans/archive/2026.07.12-BASE/plan.md).

**Docs:** https://axioma-studio.github.io/themeon/

**Roadmap:** [`ROADMAP.md`](ROADMAP.md) — trigger-gated future ideas, not yet designed or built.

**Architecture (durable):** [`docs/architecture/`](docs/architecture/index.md) — compiler
map, package graph, machine contracts, ADR index. Drift gate: `pnpm check:docs-architecture`.

## Packages

| Package | What it does |
|:--|:--|
| `@themeon/core` | Token model (`ref`/`sys`/`comp`), `defineTheme`, resolver, naming engine, CSS/DTCG serializers, runtime applier. Zero runtime deps. |
| `@themeon/css` | CSS foundation: `@layer` cascade, reset, base typography, layout composition, component skeletons. |
| `@themeon/colors` | Seed → 12-step OKLCH scale (Radix-shaped) + APCA contrast gate. |
| `@themeon/vue` | `useTheme()` (persist, `prefers-color-scheme`, N themes), Vue plugin, anti-FOUC script generator. |
| `@themeon/nuxt` | Nuxt module: CSS push, `useTheme()` auto-import, anti-FOUC head script, theme codegen + dev watcher. |
| `@themeon/vite` | Vite plugin: `virtual:themeon.css` with HMR, optional anti-FOUC injection — for Laravel/plain projects. |
| `@themeon/naive` | Naive UI adapter: `toNative(resolved)` → `GlobalThemeOverrides`. |
| `@themeon/tailwind` | Tailwind v4 bridge: `@theme inline` block so `[data-theme]` swaps reach generated utilities. |
| `@themeon/cli` | CLI package (`themeon` bin): `init` / `build` / `check` — scaffold a theme, compile it to `tokens.css`, lint token coverage, contrast and hardcoded values. |

- `apps/playground` — Nuxt smoke-consumer wiring `@themeon/nuxt` end to end.

## Commands

```sh
pnpm install
pnpm build
pnpm test
pnpm test:coverage
pnpm check:manifests
pnpm typecheck
pnpm lint
pnpm check:pack
pnpm check:docs-architecture
pnpm docs:build
```

MIT.
