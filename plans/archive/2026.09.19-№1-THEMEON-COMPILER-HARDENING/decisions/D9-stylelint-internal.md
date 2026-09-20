---
id: D9
date: 2026-09-20
status: accepted
item: P3.5
items: [P3.5]
supersedes: []
superseded_by: null
---
# D9 — Keep Stylelint rules internal until external reuse

**Actor:** plan-run/composer-2.5/high  
**Evidence:** `packages/core/src/formats/vite-delivery.ts`; `packages/vite/src/artifacts.ts`;
`findings/stylelint-verdict.md`; `decisions/D4-consumer-gated-ecosystem.md`

## Решение

Do **not** create or publish `@themeon/stylelint-plugin` in P3.5. Ship an **internal** Stylelint
plugin under `tests/stylelint-internal/` that reads an explicit `.themeon/manifest.json` path.
Extend manifest v1 additively with `deprecatedCssVariables` when IR carries `$deprecated`.

## Почему

Manifest/IR evidence is sufficient for editor-time checks without duplicating the compiler, but audit
value ≠ consumer proof (D4). No in-repo or external Stylelint integration exists yet; publishing now
would cement a co-evolving API.

## Consequences

- P3.5 closed **internal** branch: rules + rule-tester fixtures + schema-mismatch handling; no npm package.
- Vite continues to emit manifest fields from one `compileTheme` pass (deprecated metadata included).
- External adopters copy `docs/testing/stylelint-internal-kit.md` until promotion triggers fire.
