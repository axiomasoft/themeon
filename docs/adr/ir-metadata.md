# ADR: IR source and metadata

**Status:** Accepted (P1.1)
**Item:** P1.1 → P1.2

## Context

The public `Token` type carries `type`, `path`, and `value` only. DTCG
`$description`, `$deprecated`, and `$extensions` are dropped on import
(P0.1 matrix). DSL authoring has no file or span. Diagnostics today attach an
optional `path` on `ThemeonError` / `DTCGDiagnostic`.

## Decision

Every IR node carries:

- `source`: `{ kind: 'dsl' | 'dtcg', file?: string, pointer?: string }`
- `metadata`: `{ description?, deprecated?, extensions? }` (readonly)

Unknown-but-safe DTCG extensions stay in `metadata.extensions`. Unsupported
features keep the P0.1 loss policy: reject by default, warn when `allowLossy`.
Public `Token` may omit these fields until P1.6 subpaths; the IR must still
hold them so round-trips can stop being lossy.

## Consequences

`fromDTCG` / `toDTCG` become IR normalizers rather than parallel models.
P1.4 diagnostics use `source` + `path` instead of message parsing. No DOM,
CSS, or package names belong on `source`.
