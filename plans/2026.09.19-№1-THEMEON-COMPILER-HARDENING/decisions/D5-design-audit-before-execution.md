---
id: D5
date: 2026-09-19
status: accepted
item: P0
items: [P0, P1, P2, P3]
supersedes: []
superseded_by: null
---
# D5 — Complete design and whole-plan audit precede execution

**Actor:** repository owner
**Evidence:** owner correction, 2026-09-19

## Почему

The initial plan used phase-first design. The owner explicitly corrected the lifecycle: design the
whole plan, audit it as one artifact, and only then execute.

## Решение

All P0–P3 item specifications and routes are frozen before execution. A separate cold-start session
runs `task:plan-audit 2026.09.19-№1-THEMEON-COMPILER-HARDENING design`. Until its receipt is GREEN
with no blocking finding, no execution command is permitted. The generated P0.1 bundle exists only
as the layout-v2 lint carrier and grants no authority; the audit must validate its freshness.

## Consequences

Cross-phase assumptions are auditable before code changes. Any material post-audit redesign
invalidates the receipt and requires re-audit of the affected whole plan.
