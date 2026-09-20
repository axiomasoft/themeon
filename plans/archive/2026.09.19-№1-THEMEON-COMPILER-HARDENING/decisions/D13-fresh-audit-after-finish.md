---
id: D13
date: 2026-09-20
status: accepted
item: P0
items: [P0, P1, P2, P3]
supersedes: []
superseded_by: null
---
# D13 — 2026-09-19 GREEN design receipt is spent; finish candidate needs a new audit

**Actor:** plan-designer / owner-invoked design-finish  
**Evidence:** `findings/design-audit-2026-09-20.md` (RED); D5; D10–D12

## Решение

The 2026-09-19 `audit-green` receipt is not current execution admission. This design-finish produces
a new whole-plan candidate (D10–D12, recovered journal, regenerated views). D5 still forbids
`plan-exec`/`plan-run` until a **fresh** independent `task:plan-audit <ID> design` is GREEN with no
blocking finding against that candidate. The candidate must be git-committed before that audit.

## Почему

D5 required a frozen committed candidate before execution. F1 found the plan directory untracked
and the prior receipt pointing at a commit without `plan.md`. Spec, journal, and decision delta
after the first audit spent that receipt.

## Consequences

- Next after this finish is `audit-design`, not item execution.
- A GREEN 2026-09-20+ receipt must confirm plan-lint, Routing coverage, D10–D12, and that unproved
  items are not GREEN.
