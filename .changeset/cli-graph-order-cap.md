---
"@themeon/cli": patch
---

`themeon graph --format json` now caps `order` at the same limit as `nodes` (4096). Before, the
payload was flagged `truncated` but `order` still grew with the size of the theme.
