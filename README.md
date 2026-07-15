# ThemeOn

Typed design-token pipeline: TS tokens → CSS custom properties (build + runtime) → UI-library
adapters (Naive UI first) + CSS foundation (`@layer`, reset, layout primitives).

**Status:** pre-1.0, unpublished — the engine, the CSS foundation, the framework adapters and the
CLI are implemented and tested; the public API is pinned by snapshot tests but not yet stable.
Pilot migrations of real apps are in progress.

**Plan:** [`plans/archive/2026.07.12-BASE/plan.md`](plans/archive/2026.07.12-BASE/plan.md) —
archived 2026-07-15, all phases terminal (design rationale: `00_MASTER_PLAN.md`, research:
`20_research/`, both in the same archived folder). No plan is currently active
(`plans/ACTIVE.md`); ongoing trigger-gated ideas live in [`ROADMAP.md`](ROADMAP.md).

**Docs:** https://axioma-studio.github.io/themeon/

**Roadmap:** [`ROADMAP.md`](ROADMAP.md) — trigger-gated future ideas, not yet designed or built.

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
| `themeon` (CLI) | `init` / `build` / `check` — scaffold a theme, compile it to `tokens.css`, lint token coverage, contrast and hardcoded values. |

- `apps/playground` — Nuxt smoke-consumer wiring `@themeon/nuxt` end to end.

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
