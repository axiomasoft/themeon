# Compiler compatibility (P1.6)

`@themeon/core` keeps the existing root entry. Advanced seams are additive
subpaths. Old and new imports resolve to the **same module instance**.

## Entries

| Import | Role | Root? |
|:--|:--|:--|
| `@themeon/core` | Happy-path authoring, resolve, serialize, apply, tenant, DTCG, diagnostics | yes |
| `@themeon/core/authoring` | `defineTheme` / `defineTokens`, token types, naming helpers | same functions |
| `@themeon/core/compiler` | Staged `compileTheme` / `createCompiler`, `resolveTheme`, `serializeThemeCss` | resolve/serialize only |
| `@themeon/core/runtime` | `applyTheme` / `clearTheme` / `themeVars` | same functions |
| `@themeon/core/dtcg` | `fromDTCG` / `toDTCG` / color parse | same functions |
| `@themeon/core/tenant` | Tenant patch, policy, JSON Schema | same functions |

The staged compiler is **new** public API. It is not re-exported from `.`.
`serializeThemeCss` still does not resolve; `compileTheme` runs the staged
pipeline.

## Same implementation

```ts
import { defineTheme as root } from '@themeon/core'
import { defineTheme as sub } from '@themeon/core/authoring'

root === sub // true — one `ThemeonError` class, one `TOKEN_BRAND`
```

Subpath files are export facades. They import the same source modules as the
root barrel. The package is unbundled so packed ESM entries share those
modules instead of duplicating them.

## Not public

These stay package-private (no root export, no subpath export, no `exports`
wildcard):

- `TOKEN_BRAND`
- IR normalizers (`normalizeDsl`, `normalizeDtcg`)
- graph internals, walkers, fingerprint primitives
- DTCG document AST types
- tenant grammar regexes

Node only exposes paths listed in `package.json` `exports`. `files: ["dist"]`
still packs the unbundled graph; consumers cannot import it.

## Migration

Root imports keep working. Prefer a subpath when a file has a single seam:

| Consumer | Prefer |
|:--|:--|
| Theme config / `defineTheme` | `.` or `./authoring` |
| Vite / Nuxt / CLI build | `./compiler` |
| Vue `applyTheme` | `./runtime` |
| DTCG interchange | `./dtcg` |
| Tenant JSON / schema | `./tenant` |

Do not mix two copies of `@themeon/core` in one process (for example a
bundled copy next to a live workspace copy). `instanceof ThemeonError` and
`isToken` depend on module identity.

## Packaging

ESM-only (`type: module`). Each subpath lists `types` then `import`. There is
no `require` condition and no `./*` map. Older TypeScript that ignores
`exports` can use `typesVersions`.

Unpackaged internals under `dist/` are not a public contract. The next
physical package split (if any) needs a major-version decision; this document
does not authorize root-export removal.
