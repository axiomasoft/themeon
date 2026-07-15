# Why ThemeOn

## The problem

Theming was hand-rolled the same way in at least three separate projects (dterema, vintera,
octoclick): a copy-pasted pattern of ad-hoc token objects, ad-hoc CSS-variable naming, ad-hoc
dark-mode switching — reimplemented, and re-drifted, per project. Every copy diverges a little
further from the others, and every fix has to be re-applied by hand in each one.

ThemeOn extracts that pattern once into a typed, tested, versioned package.

## What it does

A typed design-token pipeline: author tokens in TypeScript
([`@themeon/core`](https://github.com/axioma-studio/themeon/tree/main/packages/core)), resolve
them once, and emit the exact same variable set through two channels — static CSS for the build
(anti-FOUC in `<head>`) and an inline runtime applier for theme/tenant switching without a
rebuild. On top of the engine: a CSS foundation (`@layer`, reset, layout primitives —
[`@themeon/css`](https://github.com/axioma-studio/themeon/tree/main/packages/css)), a color-scale
generator with an APCA contrast gate
([`@themeon/colors`](https://github.com/axioma-studio/themeon/tree/main/packages/colors)),
framework wiring for Vue/Nuxt/Vite, and UI-library adapters (Naive UI first).

## Where it fits

Researched against the landscape of token/theming tools (RAG pass 2026-07-07,
[`20_research/R-01..R-07`](https://github.com/axioma-studio/themeon/tree/main/plans/2026.07.12-BASE/20_research)):
no direct competitor covers the same ground — the closest, TokiForge, stops at token compilation
and ships no adapters to component libraries. ThemeOn's niche is the full chain: tokens → CSS
variables → the adapters that make a component library actually respect them.
