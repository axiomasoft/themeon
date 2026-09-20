# Diagnostics and errors

Structured diagnostics are the cross-surface contract for compiler, DTCG, graph, tenant, and
CLI checks.

## Schema

- Type: `Diagnostic` in `packages/core/src/diagnostics/types.ts`
- Catalog: `DIAGNOSTIC_CODES` in `packages/core/src/diagnostics/catalog.ts` (additive evolution only)
- Legacy bridge: `ThemeonError` → diagnostic via `diagnosticFromThemeonError`

## Formats

| Format | Owner | Consumers |
|:--|:--|:--|
| `pretty` | `packages/core/src/diagnostics/format.ts` | CLI default, local dev |
| `plain` | same | logs |
| `json` | same | CI artifacts |
| `github` | not shipped in P3.1 | deferred |

CLI, Vite, and Nuxt map diagnostics to their surfaces without re-implementing codes
(`packages/cli/src/checks/diagnostics.ts`, Vite/Nuxt internal diagnostics helpers).

## Contrast policy (D3)

- **Normative:** WCAG 2.2 ratio gates (`THEMEON_CONTRAST_WCAG_*`)
- **Advisory:** APCA (`THEMEON_CONTRAST_APCA_ADVISORY`) — cannot be the sole compliance gate

## Tests

- Catalog stability: exercises in `packages/core/src/diagnostics/` and CLI `check` tests
- Do not rename published codes without a compatibility plan (`ir-compatibility.md` discipline)
