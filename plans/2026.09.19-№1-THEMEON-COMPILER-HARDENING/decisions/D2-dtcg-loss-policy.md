---
id: D2
date: 2026-09-19
status: accepted
item: P0.1
items: [P0.1, P1, P2]
supersedes: []
superseded_by: null
---
# D2 — DTCG is loss-aware interchange

**Actor:** plan-designer/gpt-5.6-sol/high
**Evidence:** [UNVERIFIED] DTCG 2025.10 claims in `audits/2026-09-19-audit.md`; RAG:— `packages/core/src/dtcg/**`

## Решение

DTCG remains an interchange format, not ThemeOn's mandatory authoring model. Unknown metadata and
extensions are preserved opaquely when safe; a lossy conversion fails by default and may proceed
only through an explicit option that emits a structured diagnostic.

## Почему

Silent loss makes round trips untrustworthy and prevents forward compatibility. Rejecting every
unknown field would also make ThemeOn brittle against future DTCG evolution. Opaque preservation
plus explicit loss policy keeps both constraints visible.

## Consequences

P0.1 records actual support without overclaiming. P1's IR must carry metadata/source/original
values where needed; P2 must prove semantic round trips and expected diagnostics.

