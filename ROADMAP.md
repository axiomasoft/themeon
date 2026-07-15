# Roadmap

Speculative, trigger-gated ideas — deliberately **not** designed or built yet. Each item waits
for a concrete real-world consumer/signal before design work starts; building any of these
without that signal would be overengineering a solo package (see `00_MASTER_PLAN.md` §7 risk
table). This list replaces phase P7 of the (now archived) master plan
[`2026.07.12-BASE`](plans/archive/2026.07.12-BASE/plan.md) — relocated here 2026-07-15
(`P-D79`) so it stays visible without keeping a plan artifact open indefinitely. Relocation is
not abandonment: nothing here is cancelled, each idea keeps its trigger condition.

When a trigger fires, open a fresh design session for that item (a new focused plan, or a
lightweight `plan-design` phase) — do not start implementing straight from this list.

## Preset registry

Ship-ready theme presets, installable by copy (shadcn `add`-style) via a new `themeon add
<preset>` CLI subcommand, backed by a `registry-item.json`-shaped manifest.

- **Trigger:** ≥1 real third-party consumer (not dterema/vintera/Flex\*) asks for a ready-made
  theme preset.
- **Why not now:** no such consumer exists yet; value is unproven without one.

## Bootstrap adapter (`@themeon/bootstrap`)

Adapter translating a resolved ThemeOn theme into Bootstrap variables (Sass variables or CSS
custom properties, `@themeon/naive`'s architecture as the reference: pure functions, derived
shades computed independently via colorjs.io).

- **Trigger:** a real Bootstrap project consumer appears.
- **Why not now:** no Bootstrap project found in the donor/pilot projects (dterema/vintera).

## Vuetify adapter (`@themeon/vuetify`)

Adapter translating a resolved ThemeOn theme into a Vuetify `ThemeDefinition`, same
architecture as `@themeon/naive`.

- **Trigger:** a real Vuetify project consumer appears.
- **Why not now:** stage-2 candidate, no consumer today.

## PrimeVue adapter (`@themeon/primevue`)

Adapter translating a resolved ThemeOn theme into a PrimeVue theme preset (`definePreset`/
design-token API), same architecture as `@themeon/naive`.

- **Trigger:** a real PrimeVue project consumer appears.
- **Why not now:** stage-2 candidate, no consumer today.

## Vue wrapper components (`<ToStack>`, etc.)

Thin Vue SFC wrappers over the `@themeon/css` composition-primitive classes (`.stack`,
`.cluster`, …) — pure syntactic sugar, no own state/logic.

- **Trigger:** a real consumer explicitly states *why* plain CSS classes aren't enough for
  them (not hypothetical convenience).
- **Why not now:** explicit **do-not-build-in-v1** call (`00_MASTER_PLAN.md` §6.5) — ThemeOn is
  positioned as utilities, not a UI kit; Vue components would turn it into a component library
  competing with Naive/Vuetify/PrimeVue instead of theming them. Default answer on revisit is
  still "no" unless the trigger is strong.

## Composer package of Blade components (FlexCMS)

A Composer package with Blade components/directives wrapping the `@themeon/css` CSS foundation,
for a future FlexCMS (or other Laravel) consumer.

- **Trigger:** FlexCMS (or another Laravel consumer) actually starts integrating ThemeOn.
- **Precondition:** the Laravel delivery channel (formerly plan phase P6, `docs/recipes/
  laravel-vite.md`) must already be in place — it is.
- **Why not now:** no FlexCMS integration has started yet.
