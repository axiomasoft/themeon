---
"@themeon/cli": minor
---

New CLI flag `themeon check --tenant <patch.json>` — fail-closed APCA publication gate for a
tenant patch (H3 И2). Resolves the base theme, validates the patch through `applyThemePatch`
(`@themeon/core`, P6.1 — one validation pass, no re-validation), builds the effective
`varName → value` lookup and runs `checkThemeContrast` (`@themeon/colors`). Blocks publication
(non-zero exit, `error`-level finding) on ANY of: an unreadable/invalid patch JSON file, a
patch value that fails grammar validation, an unparseable color pair during APCA, or a failed
contrast pair — there is no path where an error is silently downgraded to a pass. When
`--tenant` is set, `check` runs this gate instead of the source-scanning coverage/hardcode
linters.
