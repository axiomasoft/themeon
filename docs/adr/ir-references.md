# ADR: IR references

**Status:** Accepted (P1.1)
**Item:** P1.1 → P1.3

## Context

Observed aliases are a `Token` whose `value` is another `Token`. Resolution
walks that chain, records `CYCLE` with the full display path, and optionally
emits a `ref` CSS name (`refLayer`: `referenced` | `all` | `inline`). DTCG
curly-brace aliases become those Token objects during `fromDTCG`. There is no
graph type and no edge list.

## Decision

IR represents an alias as a discriminated value `{ kind: 'alias', ref: path }`,
not as a nested live object. Graph construction (P1.3) turns alias edges and
composite child edges into an explicit adjacency list. Evaluation may follow
edges only with bounded, cycle-aware state. `resolveTheme` remains a facade
over that graph.

## Consequences

Normalizers must not wrap an alias as a primitive string. Cycle, missing
target, and dependency-policy failures get stable codes/paths for P1.4.
Insertion order of object keys must not change which edge exists — only (until
P1.3) the emit order of an already-built set.
