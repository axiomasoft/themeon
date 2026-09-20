# ADR: IR immutability

**Status:** Accepted (P1.1)
**Item:** P1.1 → P1.2

## Context

Observed authoring freezes tokens, trees, and `ThemeDefinition`. `ResolvedTheme`
arrays and maps are frozen. There is no module-level registry. Runtime `applyTheme`
mutates a caller-supplied element's style, not the theme value.

## Decision

IR documents, tokens, graphs, and resolved outputs are readonly collections.
Builders return frozen (or equivalently readonly) values. Core exposes no
mutable global registry for parsers, plugins, or formats — instance-scoped
extension APIs wait for P1.5. Formatters must not mutate IR.

## Consequences

Tests freeze-check new IR objects. A consumer that mutates a resolved `vars`
copy (`themeVars` already returns a fresh object) stays valid. Adding a
runtime dependency or a process-wide plugin table requires a new D#.
