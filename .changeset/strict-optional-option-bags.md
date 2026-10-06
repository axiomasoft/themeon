---
"@themeon/core": patch
"@themeon/colors": patch
"@themeon/vue": patch
"@themeon/naive": patch
"@themeon/vite": patch
"@themeon/nuxt": patch
"@themeon/cli": patch
---

Public option interfaces (`ResolveOptions`, `SerializeCssOptions`, `CompilerOptions`,
`UseThemeOptions`, `ThemeInitScriptOptions`, `ThemeonViteOptions`, `ModuleOptions`,
`ContrastOptions`, `ToNativeOptions`, CLI `*Options`, …) now declare optional properties as
`?: T | undefined`. Consumers who enable `exactOptionalPropertyTypes` can forward a possibly
undefined value (`{ resolve: options.resolve }`) without a type error. Runtime behaviour is
unchanged. Structured outputs (DTCG and CLI diagnostics, migration hints, build results) no
longer carry keys explicitly set to `undefined`; their JSON is unchanged.
