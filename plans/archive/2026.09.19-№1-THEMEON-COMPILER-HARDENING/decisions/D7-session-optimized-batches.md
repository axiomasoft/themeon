---
id: D7
date: 2026-09-19
status: accepted
item: P0
items: [P0, P1, P2, P3]
supersedes: []
superseded_by: null
---
# D7 — Session-optimized execution batches

**Actor:** repository owner
**Evidence:** owner request to reduce execution-session count, 2026-09-19

## Решение

Execute the 24 items in 12 recommended batches/sessions: four in P0, two in P1, three in P2 and
three in P3. Adjacent items share a session only when they reuse producer/consumer context, setup
or validation. The batch runs at the maximum route/review of its members, so bounded P1.2/P1.4/
P1.6, P2.4 and P3.1 intentionally inherit Grok 4.6/frontier/high from their batch.

## Почему

This removes eight cold starts without creating an unsafe phase-sized context. Item-specific
validation, deliverables, journal closure and review remain separate inside the batch. P0.4 stays
solo because of its owner/irreversible gate; phase boundaries and P3.3's distinct Vite/Laravel/CSP
capability remain session boundaries.

## Consequences

Session count falls from 20 to 12, while some bounded work uses the more expensive Grok route to
retain context. If a batch approaches context limits, continuity may cold-start only at an item
boundary with a durable batch receipt; it must not silently change membership or model policy.
