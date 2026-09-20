---
id: D6
date: 2026-09-19
status: accepted
item: P0
items: [P0, P1, P2, P3]
supersedes: []
superseded_by: null
---
# D6 — Execution is restricted to Composer 2.5 or Grok 4.6

**Actor:** repository owner
**Evidence:** `research/executor-model-selection.md`

## Почему

The owner requires an explicit choice between Grok 4.6 and Composer 2.5. Official Cursor/xAI
material confirms both are agentic coding models available in Cursor, with different context,
price and positioning. Perplexity was consulted as a secondary synthesis; primary sources remain
the evidence of record.

## Решение

Use Composer 2.5 by default for bounded, fixture-led implementation. Prefer Grok 4.6 for long
cross-package trajectories, architecture/security/adversarial investigation and complex external
integration. Every launch attests the exact selector and minimum route. If preferred is unavailable,
the other member of the pair is the only allowed fallback, at equal-or-higher effort/review, with
the deviation journaled. Auto-selection or a third model requires a new owner decision.

## Consequences

Official availability does not prove local entitlement or connectivity. A failed provider/model
preflight blocks that launch but does not silently weaken the route. The local Task provider map
currently names Composer 2.5 as Cursor's implementation route and does not canonically name Grok
4.6; Grok launches therefore require explicit provider attestation/manual routing until that map is
updated at its owning source.
