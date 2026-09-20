---
id: D1
date: 2026-09-19
status: accepted
item: P1
items: [P1]
supersedes: []
superseded_by: null
---
# D1 — Compatibility-first compiler architecture

**Actor:** plan-designer/gpt-5.6-sol/high
**Evidence:** RAG:— `packages/core/src/**`, `packages/core/package.json`, `packages/core/src/index.ts`

## Решение

ThemeOn introduces canonical IR, staged compiler seams, diagnostics and instance-scoped extensions
inside `@themeon/core` before any physical package split. Existing root exports remain compatible;
new advanced surfaces are added through internal modules and additive subpath exports.

## Почему

The repository already has coherent package boundaries and a tested public facade. A rewrite or
immediate split would mix semantic change with package migration and make regressions harder to
attribute. The alternative—keep adding branches to the current resolver—does not create the
independent model and diagnostics needed by DTCG, CLI and adapters.

## Consequences

P1 must preserve current behavior with characterization tests, keep core dependency-free at
runtime, forbid DOM/CSS concerns in IR, and expose an explicit compatibility migration path.

