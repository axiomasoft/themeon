---
"@themeon/vite": minor
---

Fix the plugin's only documented connection method (audit #1, Blocker): `@import
'virtual:themeon.css'` inside a CSS file can never work — Vite's CSS pipeline resolves `@import`
through `postcss-import`'s filesystem-only resolver, which never consults plugin `resolveId`/
`load` hooks. The canonical channel is now a **JS-entry import** (`import
'virtual:themeon.css'` from a `.ts`/`.js` file); the README no longer shows the broken CSS-only
recipe as the primary path.

Fix HMR (audit #18, Major): the plugin's `hotUpdate` hook now returns `[mod]` instead of manually
calling `hot.send({type: 'css-update', ...})` — the virtual module's internal `\0`-prefixed id
never matches the client's HMR module map, so the hand-rolled payload was a silent no-op. Letting
Vite build and send its own update payload is the only form that's robust to the id normalization.
`tokensFiles` entries are now resolved to absolute paths once, in `configResolved`, fixing HMR for
projects that (per the README's own example) pass relative paths.

New `cssImport?: boolean | { file?: string }` option for CSS-only setups with no JS entry point
(e.g. a plain Blade layout): the plugin writes the theme CSS to a real file on disk and aliases
`virtualId` to it, so `@import 'virtual:themeon.css'` resolves as an ordinary file import — this
is an additional channel, not a replacement for the canonical JS-import one.
