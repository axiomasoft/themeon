---
"@themeon/nuxt": minor
---

Fix `themeon.theme` never loading, at all — this is the module's core feature and it never
worked on a live `nuxt dev` run (audit-adjacent finding, not in the original audit list). `@nuxt/
kit`'s `importModule` runs every loaded namespace through mlly's `interopDefault`, which tries to
attach a synthetic `default` via `Object.defineProperty` inside a swallowed `try/catch` — but
`defineTheme()` returns a frozen object, so the assignment throws, the catch swallows it, and
`.default` comes back `undefined`. Every real project (including the one `themeon init`
scaffolds) hit this on the very first `nuxt dev`. Theme loading is now done with a dedicated
`jiti` loader (`interopDefault: false`) that accepts both `export default defineTheme(...)` and
`export const theme = defineTheme(...)`, and throws a clear error naming the file if neither
export is found (rather than the previous silent misload).

Fix the dev-watcher regenerating byte-identical CSS on every save regardless of whether the
theme actually changed (audit #20, Major): dedup now compares the *generated CSS output*, not a
hash of the whole tokens directory — the `hashDir` mechanism (181ms on the playground, ~3.6s on
the monorepo root, run synchronously on every filesystem save) is removed entirely. The watch
scope is now always the theme's own directory (or the theme file itself, if it lives at the
project/src root) — never the whole `rootDir`/`srcDir`.
