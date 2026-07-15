---
"@themeon/vite": patch
---

Docs-only: added `docs/laravel.md` at the repo root, giving Laravel projects a single page that
distinguishes the three Laravel-facing channels — the shipped-default-theme static `@import`
(`@themeon/css/tokens.css`), this plugin's own custom-theme JS-import channel
(`virtual:themeon.css`), and the `cssImport` pure-Blade channel — plus the Blade anti-FOUC
snippet using `@themeon/vue/anti-fouc`. `packages/vite/README.md` gained one cross-link to it.
No public API changed in any package.

A new integration test (`tests/integration/src/browser/laravel-css-import.test.ts`) proves the
static `@import` recipe resolves on a real `vite build` (not a mocked resolver), and that the
opposite recipe — `@import "virtual:themeon.css"` with no plugin in the graph — fails the build,
guarding that the two channels are not interchangeable.
