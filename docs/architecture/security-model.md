# Tenant patch security model (P0.3)

Tenant JSON is hostile input. `@themeon/core` treats every `applyThemePatch` /
`serializeThemePatch` / `tenantThemeSchema` call as an untrusted boundary: reject
over-limit input **before** deep recursion or graph work, use one policy table for
runtime and JSON Schema, and never echo a secret or a full hostile payload in
diagnostics.

## Trust levels

| Level | Who | What may be patched | When |
|:--|:--|:--|:--|
| `branding` | public / SaaS tenant (default) | Semantic colors, fonts, radii, logos | Implicit default |
| `extended` | privileged tenant | All `ALLOWED_TENANT_TYPES` except primitive palettes and internal paths | Explicit `policy: 'extended'` |
| `trusted` | system owner | Primitive and internal paths as well; still not free-form CSS | Explicit `policy: 'trusted'` only |

`trusted` is never implied. Shadow, gradient and cubic-bezier stay operator-controlled
at every level (P-D70).

Bounds (depth / key count / value length) live in `TENANT_PATCH_POLICIES` and are
consumed by the envelope inspector, JSON Schema (`maxLength`, `maxProperties`,
`propertyNames`) and tests. Changing a number in that table moves every consumer.

## Threat model (STRIDE)

| Threat | Category | Control |
|:--|:--|:--|
| Prototype pollution via `__proto__` / `constructor` / `prototype` | T / E | Reserved keys rejected from own properties (`Object.getOwnPropertyNames`) before assignment |
| Deep / wide JSON (DoS) | D | Iterative envelope: `maxDepth`, `maxKeys`; abort at limit+1 |
| Very long CSS values | D / T | `maxValueLength` before grammar |
| `url()`, `@import`, CSS breakout, unclosed quotes/comments | T / I | Positive type grammar + metachar / `url(` / `/*` reject; `@` is a metachar |
| Unicode controls and lone surrogates | T | `PATCH_UNICODE` on keys and values |
| Alias / reference cycles after patch | T | Token-object leaves forbidden unless `trusted`; then cycle-checked (`PATCH_CYCLE`) |
| Patch of primitive / internal tokens | E | Path policy: branding ⊆ semantic roles; primitives need `trusted` |
| Schema vs runtime divergence | T / E | One policy + one grammar; parity tests fail on split verdicts |
| Cross-tenant bleed | I | Pure function, no module cache; each call starts from the caller-supplied `base` |
| Diagnostic exfiltration | I | Stable `code` + `path` + `hint`; messages do not include the payload |

## Out of scope (explicit)

- General-purpose CSS sanitizer or HTML rewriter.
- Fetching or validating external resources behind `url()` (those values are rejected, not fetched).
- Tenant storage, authentication, or tenancy routing.
- Applying one tenant’s output as another tenant’s `base` (caller must keep bases separate).
- Canonical IR / compiler pipeline (P1).
- Trusted owner-authored arbitrary stylesheets (still not a CSS dump).

## Public contract

```ts
applyThemePatch(base, patch)                          // branding
applyThemePatch(base, patch, { policy: 'extended' })
tenantThemeSchema(base, { policy: 'trusted' })
TENANT_PATCH_POLICIES.branding.bounds.maxDepth        // 6
```

Rejection is a `ThemeonError` with `code` (`PATCH_LIMIT` | `PATCH_POLICY` |
`PATCH_UNICODE` | `PATCH_CYCLE` | existing `UNSAFE_*` / `BAD_VALUE` / …), optional
frozen `path`, and a short `hint`.
