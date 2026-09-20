---
id: D12
date: 2026-09-20
status: accepted
item: P0
items: [P0, P1, P2, P3]
supersedes: []
superseded_by: null
---
# D12 — Recover unproved terminals without rewriting meaning or faking GREEN

**Actor:** plan-designer / owner-invoked design-finish after RED design audit F1–F3  
**Evidence:** `findings/design-audit-2026-09-20.md`; `findings/journal-pre-design-finish-2026-09-20.jsonl`

## Решение

1. **Keep Routing.** Do not rewrite historical `command`/`result` to match §3. Route-mismatched
   terminals (P0.5, P0.6, P2.3, P2.5, P2.6, P3.1, P3.4, P3.5, P3.6) are unproved.
2. **Schema-complete informal rows 36–47** by adding missing required P1.1 fields with `null` or
   `[]` only, and `decision.recovered: false` when that evidence field was absent. `command`,
   `result`, `note`, `ts`, `actor`, `item_id` and other decision fields stay unchanged.
   Original bytes are snapshotted. This is schema recovery, not a compliance rewrite.
3. **Reopen** unproved items with `plan-design` + `in-progress` so generated state is not GREEN:
   P0.4–P0.6, P2.1–P2.3, P2.5–P2.6, P3.1–P3.6. P2.1/P2.2 reopen because Required Reads were
   retargeted at `P1.closed.md`, staling their terminals. P2.4 never had a journal event and stays
   `⬜ Not started`.
4. **Keep** schema-valid, route-matching terminals: P0.1–P0.3, P1.1–P1.6. Stamp missing write-site
   FORM codes by a non-position `plan-design` `no-op` note.
5. Informal closed rows also receive `terminal_evidence.repair_exhausted: null` and, when
   `spec_sha256` is missing or not 64 hex, the unbound digest `0{64}`. This makes historical
   structure readable; it is **not** current spec binding or GREEN proof.
6. **Invalidate** `phases/P3/P3.closed.md` (manual `inputs_sha256`). P1 closure remains. P0/P2 have
   no phase closure until their remaining items are re-admitted in dependency order.
7. Product tests already on disk are reusable evidence after owning-route re-admission; they are
   not current acceptance.

## Почему

F2 forbids a bookkeeping-only status rewrite. F3 forbids rewriting rows to look route-compliant.
Informal incomplete JSONL otherwise permanently poisons plan-lint, and leaving those rows as
current `closed-green` would archive unproved work.

## Consequences

- Earliest unproved item after the next GREEN design audit is P0.4 (D10), then B0-HYGIENE, then
  remaining P2/P3 items under compiled Routing.
- P3 is not terminal. P2 remains in progress. Do not archive this plan as GREEN.
