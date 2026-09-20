# Compiler module map (terminal P1–P3)

Observed `@themeon/core` layout after the compiler-hardening plan. Target IR contracts are in
`docs/adr/ir-*.md`; this file tracks **where code lives today**.

## Flow

See [overview.md](./overview.md). `compileTheme` is the staged entry; `resolveTheme` remains the
compatibility adapter used inside the pipeline and by legacy call sites.

## Seams

| Seam | Location | Role |
|:--|:--|:--|
| Authoring | `define.ts`, `authoring/normalize-dsl.ts` | DSL → `ThemeDefinition` / IR |
| IR model | `model/` | Frozen `IrDocument`, metadata, `toThemeDefinition` |
| Graph | `graph/build.ts` | Reference graph, cycle/missing/depth |
| Resolve | `resolve.ts` | `ResolvedTheme`, naming once (P-D14) |
| Pipeline | `pipeline/compile.ts` | Stages, fingerprint, extensions |
| Serialize | `serialize.ts` | CSS from `ResolvedTheme` |
| Diagnostics | `diagnostics/` | Structured codes + format adapters |
| DTCG | `dtcg/` | Import/export + DTCG diagnostics |
| Tenant | `patch*.ts`, `patch-policy.ts`, `schema.ts` | Untrusted JSON envelope |
| Delivery formats | `formats/vite-delivery.ts` | Manifest + CSP artifact builders |
| Public | `index.ts`, `public/*.ts` | Root + subpath exports |

`TOKEN_BRAND` stays package-internal (not on root export).

## Subpath exports

Documented in [compiler-compatibility.md](./compiler-compatibility.md). Prefer `./compiler` in
build tooling (Vite, Nuxt, CLI) and `./runtime` in browser code.

## Production consumers (high level)

| Package | Typical imports |
|:--|:--|
| `cli` | `compiler`, `tenant`, diagnostics |
| `vite` | `compiler`, manifest writers |
| `nuxt` | `compiler`, serialize |
| `vue` | `runtime` |
| `css`, `tailwind` | root define/resolve/serialize |
| `naive` | `ResolvedTheme` types, errors |

Executable inventory: `packages/core/src/characterization.test.ts`.

## Metadata

DTCG `$deprecated` is preserved on IR and surfaced in the Vite manifest as
`deprecatedCssVariables` when present (`machine-contracts.md`).
