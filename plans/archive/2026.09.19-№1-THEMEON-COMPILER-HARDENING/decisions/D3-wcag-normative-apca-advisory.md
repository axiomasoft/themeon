---
id: D3
date: 2026-09-19
status: accepted
item: P0.2
items: [P0.2]
supersedes: []
superseded_by: null
---
# D3 — WCAG normative, APCA advisory

**Actor:** plan-designer/gpt-5.6-sol/high
**Evidence:** [UNVERIFIED] WCAG/APCA claims in `audits/2026-09-19-audit.md`; RAG:— `packages/colors/src/contrast.ts`, `packages/cli/src/checks/contrast.ts`

## Решение

ThemeOn's normative accessibility result uses explicitly selected WCAG 2.2 text/non-text
criteria. APCA remains available but is labelled experimental/advisory and cannot be the sole
compliance gate.

## Почему

The current package description and CLI path center APCA, while the audit identifies a mismatch
with normative WCAG expectations. Keeping both result channels preserves useful experimentation
without presenting it as legal or standards conformance.

## Consequences

P0.2 introduces a structured multi-policy result, stable diagnostics and tests for thresholds,
alpha/gradient unknowns and CLI severity/exit behavior.

