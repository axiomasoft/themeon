---
id: D10
date: 2026-09-20
status: accepted
item: P0.4
items: [P0.4]
supersedes: []
superseded_by: null
---
# D10 — P0.4 in-plan outcome is repository plumbing; trusted publisher stays owner-gated

**Actor:** plan-designer / owner-invoked design-finish after RED design audit F4  
**Evidence:** `artifacts/P0.4/external-trust.json` (`predicate_satisfied: false`); `artifacts/P0.4/owner-requested-new-session.json`; `findings/design-audit-2026-09-20.md` F4

## Решение

P0.4's **in-plan** acceptance is the repository+CI trusted-release plumbing already on disk:
reusable `verify.yml`, SHA-pinned workflows, OIDC publish job, documented token fallback, and no
publish/tag side effect. The item's machine `Authority` is `routine`. The owner-gated npm
trusted-publisher configuration and GitHub protected `release` environment are **residual work
outside this plan**. They remain `[OWNER-GATE:NPM-TRUSTED-PUBLISHER]` only on `roadmap.md` /
owner-gates, not as P0.4's compiled gate, and must not be reported as undeviated GREEN.

Re-admission after the next GREEN design audit closes P0.4 as `🟠 Done with deviations`, naming this
decision. Later phases do not wait for the external grant. Launching P0.4 does not grant residual
npm/GitHub configure scope.

## Почему

The owner deferred the external grant and kept the token fallback. The previous GREEN close treated
that unmet gate as satisfied. F4 forbids undeviated GREEN against the old acceptance contract.

## Consequences

- P0.4 spec `Authority` is `routine` (in-plan plumbing + this deviation). Residual
  `NPM-TRUSTED-PUBLISHER` lives only on roadmap/owner-gates.
- Historical P0.4 `closed-green` is not current acceptance; the item is reopened for re-admission.
- No npm/GitHub mutation is authorized by this decision or by launching P0.4.
