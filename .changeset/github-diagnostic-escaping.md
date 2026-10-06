---
"@themeon/core": patch
"@themeon/cli": patch
---

Escape percent signs and line breaks in GitHub Actions diagnostic messages, and also colons
and commas in file properties. Hostile token paths, messages or source filenames cannot create
additional workflow commands or annotation properties.
