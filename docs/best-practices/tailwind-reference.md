# Bridge on `@theme reference`, not `@theme inline`

`@themeon/tailwind`'s bridge maps ThemeOn's CSS variables into Tailwind v4's `@theme` block so
utilities like `bg-action-primary` exist. The block form matters: `@theme reference` with
literal values is the only form that survives both a responsive variant (`md:bg-*`) and either
CSS `@import` order — `@theme inline` with a self-referential mapping breaks both, and did break
them in this project's own history (P8.3).

✅ **Current code** — `packages/tailwind/src/bridge.ts` emits `@theme reference` with literal
values (except `--shadow-*`, kept as a `var()` reference so dark-mode shadow swaps still reach
the utility):

```ts
export function tailwindBridge(resolved: ResolvedTheme, opts?: TailwindBridgeOptions): string {
  // ...
  const lines = filtered.map((name) => {
    const ns = matchNamespace(name, namespaces)!
    if (LITERAL_ONLY_NAMESPACES.has(ns)) return `  ${name}: ${literals.get(name)};`
    if (VALUE_PARSED_NAMESPACES.has(ns)) return `  ${name}: var(${name});`
    return `  ${name}: ${literals.get(name)};`
  })
  const body = `@theme reference {\n${lines.join('\n')}${lines.length > 0 ? '\n' : ''}}\n`
  // ...
}
```

❌ **The project's own former bridge** (pre-P8.3, `packages/tailwind/src/bridge.ts` before commit
`caf5815`) — `@theme inline` with a self-referential `--x: var(--x)` mapping:

```ts
// Historical code — replaced by the ✅ form above in P8.3
const lines = filtered.map((name) => `  ${name}: var(${name});`)
const body = `@theme inline {\n${lines.join('\n')}${lines.length > 0 ? '\n' : ''}}\n`
```

This form has two proven failure modes: on the reverse `@import` order the self-reference
resolves to a CSS-wide `invalid at computed-value time` cycle, blanking every ThemeOn variable in
`:root`/`[data-theme]`; and Tailwind's `variants.ts` substitutes `--breakpoint-*` as a **string**
into `@media (width >= …)`, where `var()` is not a valid media-feature value — every `md:`/`lg:`
utility silently stops matching (both reproduced live in Chromium, `findings/P8-tailwind-bridge-form.md`).

**Rule:** generate the Tailwind bridge with `@theme reference` and literal values (shadows
excepted); `@theme inline` and self-referential mappings are forbidden in this codebase.
