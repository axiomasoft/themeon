---
id: D11
date: 2026-09-20
status: accepted
item: P0
items: [P0, P1, P2, P3]
supersedes: []
superseded_by: null
---
# D11 — Owner-gated friction exceptions for early journal rows

**Actor:** plan-designer / owner-invoked design-finish after RED design audit F2  
**Evidence:** `journal.jsonl:4-7,12`; `findings/design-audit-2026-09-20.md` F2

## Решение

Authorize `journal-exceptions.jsonl` waivers for historical `friction` values outside the sealed
enum on `journal.jsonl` lines 4, 5, 6, 7 and 12. The rows stay byte-identical. The sidecar may waive
only `friction`. It does not create status, Next, or GREEN proof.

## Почему

Those rows were written before the closed friction enum was applied consistently (`route-fallback`,
`tooling-blocked`, `network-slow`). D51 forbids rewriting them. Without the sidecar, plan-lint cannot
read the rest of the evidence graph.

## Consequences

- Exceptions are recorded with this D# via `task.journal exception`.
- Route mismatch, missing fields, and stale spec bindings remain separate and are owned by D12.
