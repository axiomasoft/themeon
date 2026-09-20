---
id: D8
date: 2026-09-20
status: accepted
item: P2.6
items: [P2.6, P3.4]
supersedes: []
superseded_by: null
---
# D8 — Keep testing helpers internal until P3.4

**Actor:** plan-exec/composer-2.5/high  
**Evidence:** `docs/testing/conformance.md`; `tests/integration/src/conformance/**`; `tests/consumers/src/harness/**`; `findings/testing-kit-verdict.md`

## Решение

Do **not** create or publish `@themeon/testing` in P2.6. Consolidate adapter/browser conformance
fixtures and vocabulary under `tests/integration` (and reuse the existing packed-consumer harness).
P3.4 may promote a package only if two independent reuse sites and a small stable public API exist.

## Почему

Audit recommendation ≠ consumer proof (D4). Internal reuse is real (integration + consumer matrix),
but there is no second external adapter and no frozen public contract yet — publishing now would
cement helpers that still co-evolve with core IR.

## Consequences

- P3.4 closed **internal** branch: shared pack harness under `tests/internal/pack-harness/`; no `@themeon/testing` package.
- External adapter authors may copy patterns from `docs/testing/conformance.md` and `docs/testing/internal-kit.md`, not from an npm package.
- Duplication between consumer/types matrices is limited to lane-specific runners; install/digest primitives are single-sourced.
