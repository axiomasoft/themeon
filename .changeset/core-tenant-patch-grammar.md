---
"@themeon/core": minor
---

New `applyThemePatch(base, patch, opts?)` / `serializeThemePatch(base, patch, opts?)` — validate
a multi-tenant sys-patch against a strict per-`TokenType` positive allowlist grammar
(`color`/`dimension`/`number`/`duration`/`fontFamily`/`fontWeight`/`text`, exported as
`ALLOWED_TENANT_TYPES`) and turn it into a variable dictionary plus ready-to-inject CSS
declarations (`:root { --token: value; }`, never a `<style>` tag). Fixes the confirmed
stored-XSS/CSS-injection design hole (final-audit H3, И1): a tenant-supplied value like
`red}</style><script>…` or `#fff;}` is now rejected loudly (`ThemeonError` with
`UNSAFE_CSS_TOKEN`/`BAD_VALUE`/`UNKNOWN_PATH`/`UNSAFE_PATH`/`UNSUPPORTED_TENANT_TYPE`) instead of
being escaped or silently dropped — `shadow`/`gradient`/`cubicBezier` stay operator-controlled in
v1 and are explicitly rejected, not silently skipped. Output order always follows the base
theme's token order (never the patch's own key order), so the same `(base, patch)` pair
serializes byte-for-byte identically.
