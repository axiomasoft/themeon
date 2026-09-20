# ADR: Compatibility adapter for the current public facade

**Status:** Accepted (P1.1)
**Item:** P1.1 → P1.6
**Depends on:** D1

## Context

`packages/core/src/index.ts` re-exports authoring, resolve, serialize, apply,
tenant, naming, aliases, and DTCG helpers. Production packages import that
root only. `api.test.ts` freezes the runtime export list. D1 forbids a
physical split and forbids removing root exports in this plan.

## Decision

P1.2–P1.5 implement IR, graph, and compiler **behind** the existing functions.
`defineTokens`, `defineTheme`, `fromDTCG`, `resolveTheme`, `serializeThemeCss`,
and `applyTheme` keep their current call shapes and observable results except
where an accepted ADR (identity order in P1.3) changes a documented
non-public ordering. P1.6 adds subpath exports; it does not delete the root.

The compatibility adapter maps IR → today's `Token` / `ThemeDefinition` /
`ResolvedTheme`. Public unions grow only additively.

## Consequences

Characterization snapshots (`api.test.ts`, serialize CSS fixture,
`characterization.test.ts`) are the regression gate. A public narrowing needs
a new decision and a major-version plan, not a silent refactor.
