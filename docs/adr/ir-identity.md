# ADR: IR token identity

**Status:** Accepted (P1.1)
**Item:** P1.1 → P1.2

## Context

Observed tokens identify themselves by a `path` string array
(`['color','forest','600']`). The resolver already treats that tuple as the
map key via `JSON.stringify(path)`, because a segment may contain `.`. The
public `Token` type has no separate `id` field. CSS names are a *projection*
of the path through `naming.ts`, not identity.

## Decision

Canonical IR identity is the path tuple. The stable string form is
`JSON.stringify(path)` (the same function the resolver uses today). CSS
variable names, DTCG dotted names, and display strings are derived views.

Two tokens with the same path in one document are a `NAME_COLLISION` (already
thrown). Identity does not include value, type, or source.

## Consequences

P1.2 builders assign `id` as that canonical string. P1.3 sorts and keys the
graph by `id`, never by object insertion order. Compatibility facades keep
exposing `path` on `Token` / `ResolvedToken`.
