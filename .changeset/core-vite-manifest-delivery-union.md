---
"@themeon/core": minor
"@themeon/vite": patch
---

The Vite delivery manifest's `css` block is now a discriminated union on `delivery`
(`ThemeonViteManifestVirtualCssV1 | ThemeonViteManifestFileCssV1`). `relativePath` is guaranteed
for `'file'` and `virtualModuleId` for `'virtual'`; previously both were optional, and a file
delivery without a path produced a manifest a PHP reader could not use.
`buildViteManifest({ delivery: 'file' })` now requires `cssRelativePath` (type error, plus a
runtime `BAD_VALUE` for JS callers). `@themeon/vite` writes `relativePath` with POSIX separators
on every OS. The JSON shape and field order of valid manifests are unchanged.
