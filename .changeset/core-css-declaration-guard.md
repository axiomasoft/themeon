---
"@themeon/core": minor
---

Security: `resolveTheme` now rejects token values, variable names and theme names that could break
out of their CSS declaration (`ThemeonError('UNSAFE_CSS_TOKEN')`, with the token path). A DTCG file
with `$value: "red; } body { background: url(//evil) } :root {"`, a key such as `"x;}*{a"`, or a
theme named `d"],*[y="` used to be written into `tokens.css` verbatim. The value guard is
syntax-aware: `;` inside `url(...)`, functions or quoted strings (data URIs, font stacks) remains
valid. Because the check sits in the resolver, every emitter is covered: the static serializer,
the Tailwind bridge, the runtime applier and the UI-kit adapters.
