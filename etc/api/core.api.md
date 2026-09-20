# @themeon/core

> Packed `.d.ts` snapshot for public export map entries. Update with `pnpm api-report:update`.

## Export `.`

<!-- types: ./dist/index.d.ts -->

```dts
import { AutoComplete, CssVarName, CssVarRef, ResolvedTheme, ResolvedToken, SysPatch, SysTreeInput, TextStyleValue, ThemeDefinition, Token, TokenLeafInput, TokenTreeInput, TokenType, Tokenized, WellKnownSys, isToken } from "./types.js";
import { ThemeConfig, defineTheme, defineTokens } from "./define.js";
import { NAMESPACE_TABLE, NamingOptions, cssVar, formatVarName, kebabSegment } from "./naming.js";
import { AliasRule, AliasesOption, legacyV0Alias } from "./aliases/legacy-v0.js";
import { ResolveOptions, resolveTheme } from "./resolve.js";
import { SerializeCssOptions, serializeThemeCss } from "./serialize.js";
import { ElementLike, applyTheme, clearTheme, themeVars } from "./apply.js";
import { DEFAULT_TENANT_TRUST, TENANT_PATCH_POLICIES, TenantPatchPolicy, TenantTrustLevel, resolveTenantPatchPolicy } from "./patch-policy.js";
import { ApplyPatchOptions, ApplyPatchResult, SerializePatchOptions, applyThemePatch, serializeThemePatch } from "./patch.js";
import { ALLOWED_TENANT_TYPES, TextStyleTenantValue } from "./patch-grammar.js";
import { JsonSchema, JsonSchemaNode, TenantSchemaOptions, tenantThemeSchema } from "./schema.js";
import { DTCGExport, ToDTCGOptions, toDTCG } from "./dtcg/to-dtcg.js";
import { FromDTCGResult, fromDTCG } from "./dtcg/from-dtcg.js";
import { formatColor, parseColor } from "./dtcg/color.js";
import { THEMEON_ERROR_CODES, ThemeonError, ThemeonErrorCode, ThemeonErrorOptions } from "./errors.js";
import { DIAGNOSTIC_SCHEMA_VERSION, Diagnostic, DiagnosticFormat, DiagnosticFormatter, DiagnosticProvenance, DiagnosticReport, DiagnosticSeverity, RelatedLocation, SourceLocation } from "./diagnostics/types.js";
import { DIAGNOSTIC_CODES } from "./diagnostics/catalog.js";
import { aggregateDiagnostics } from "./diagnostics/aggregate.js";
import { formatDiagnostics } from "./diagnostics/format.js";
import { diagnosticFromDtcg, diagnosticFromGraphIssue, diagnosticFromThemeonError, diagnosticFromUnknown, diagnosticsFromGraphIssues } from "./diagnostics/from-legacy.js";
export { ALLOWED_TENANT_TYPES, type AliasRule, type AliasesOption, type ApplyPatchOptions, type ApplyPatchResult, type AutoComplete, type CssVarName, type CssVarRef, DEFAULT_TENANT_TRUST, DIAGNOSTIC_CODES, DIAGNOSTIC_SCHEMA_VERSION, type DTCGExport, type Diagnostic, type DiagnosticFormat, type DiagnosticFormatter, type DiagnosticProvenance, type DiagnosticReport, type DiagnosticSeverity, type ElementLike, type FromDTCGResult, type JsonSchema, type JsonSchemaNode, NAMESPACE_TABLE, type NamingOptions, type RelatedLocation, type ResolveOptions, type ResolvedTheme, type ResolvedToken, type SerializeCssOptions, type SerializePatchOptions, type SourceLocation, type SysPatch, type SysTreeInput, TENANT_PATCH_POLICIES, THEMEON_ERROR_CODES, type TenantPatchPolicy, type TenantSchemaOptions, type TenantTrustLevel, type TextStyleTenantValue, type TextStyleValue, type ThemeConfig, type ThemeDefinition, ThemeonError, type ThemeonErrorCode, type ThemeonErrorOptions, type ToDTCGOptions, type Token, type TokenLeafInput, type TokenTreeInput, type TokenType, type Tokenized, type WellKnownSys, aggregateDiagnostics, applyTheme, applyThemePatch, clearTheme, cssVar, defineTheme, defineTokens, diagnosticFromDtcg, diagnosticFromGraphIssue, diagnosticFromThemeonError, diagnosticFromUnknown, diagnosticsFromGraphIssues, formatColor, formatDiagnostics, formatVarName, fromDTCG, isToken, kebabSegment, legacyV0Alias, parseColor, resolveTenantPatchPolicy, resolveTheme, serializeThemeCss, serializeThemePatch, tenantThemeSchema, themeVars, toDTCG };
```

## Export `./authoring`

<!-- types: ./dist/public/authoring.d.ts -->

```dts
import { AutoComplete, CssVarName, CssVarRef, SysPatch, SysTreeInput, TextStyleValue, ThemeDefinition, Token, TokenLeafInput, TokenTreeInput, TokenType, Tokenized, WellKnownSys, isToken } from "../types.js";
import { ThemeConfig, defineTheme, defineTokens } from "../define.js";
import { NAMESPACE_TABLE, NamingOptions, cssVar, formatVarName, kebabSegment } from "../naming.js";
import { THEMEON_ERROR_CODES, ThemeonError, ThemeonErrorCode, ThemeonErrorOptions } from "../errors.js";
export { type AutoComplete, type CssVarName, type CssVarRef, NAMESPACE_TABLE, type NamingOptions, type SysPatch, type SysTreeInput, THEMEON_ERROR_CODES, type TextStyleValue, type ThemeConfig, type ThemeDefinition, ThemeonError, type ThemeonErrorCode, type ThemeonErrorOptions, type Token, type TokenLeafInput, type TokenTreeInput, type TokenType, type Tokenized, type WellKnownSys, cssVar, defineTheme, defineTokens, formatVarName, isToken, kebabSegment };
```

## Export `./compiler`

<!-- types: ./dist/public/compiler.d.ts -->

```dts
import { CssVarName, ResolvedTheme, ResolvedToken, ThemeDefinition } from "../types.js";
import { AliasRule, AliasesOption, legacyV0Alias } from "../aliases/legacy-v0.js";
import { ResolveOptions, resolveTheme } from "../resolve.js";
import { SerializeCssOptions, serializeThemeCss } from "../serialize.js";
import { THEMEON_ERROR_CODES, ThemeonError, ThemeonErrorCode, ThemeonErrorOptions } from "../errors.js";
import { DIAGNOSTIC_SCHEMA_VERSION, Diagnostic, DiagnosticFormat, DiagnosticFormatter, DiagnosticProvenance, DiagnosticReport, DiagnosticSeverity, RelatedLocation, SourceLocation } from "../diagnostics/types.js";
import { IrDocument, IrPath, IrToken, canonicalId } from "../model/ir.js";
import { GRAPH_MAX_DEPTH, GraphEdge, GraphIssue, IrGraph, buildGraph, compareCanonicalId, comparePath, graphHasBlockingIssue } from "../graph/build.js";
import { DIAGNOSTIC_CODES } from "../diagnostics/catalog.js";
import { aggregateDiagnostics } from "../diagnostics/aggregate.js";
import { formatDiagnostics } from "../diagnostics/format.js";
import { diagnosticFromDtcg, diagnosticFromGraphIssue, diagnosticFromThemeonError, diagnosticFromUnknown, diagnosticsFromGraphIssues } from "../diagnostics/from-legacy.js";
import { COMPILER_STAGES, COMPILER_VERSION, CompileResult, Compiler, CompilerContext, CompilerExtension, CompilerOptions, CompilerStage, DeclaredExtension, ExtensionCapability, FormatInput } from "../pipeline/types.js";
import { normalizeDsl } from "../authoring/normalize-dsl.js";
import { compileTheme, createCompiler } from "../pipeline/compile.js";
import { buildFingerprint } from "../pipeline/fingerprint.js";
import { builtinExtensions } from "../pipeline/extensions.js";
import { BuildCspArtifactInput, BuildViteManifestInput, THEMEON_CSP_ARTIFACT_SCHEMA_VERSION, THEMEON_VITE_ARTIFACT_OWNER, THEMEON_VITE_MANIFEST_SCHEMA_VERSION, ThemeonCspArtifactV1, ThemeonViteManifestCssV1, ThemeonViteManifestDeprecatedVarV1, ThemeonViteManifestV1, buildCspArtifact, buildViteManifest, cspSha256Base64, deprecatedCssVariablesFromIr, serializeCspArtifact, serializeViteManifest, sha256Hex, sha256Integrity, sortedCssVariables, sortedThemeNames } from "../formats/vite-delivery.js";
export { type AliasRule, type AliasesOption, type BuildCspArtifactInput, type BuildViteManifestInput, COMPILER_STAGES, COMPILER_VERSION, type CompileResult, type Compiler, type CompilerContext, type CompilerExtension, type CompilerOptions, type CompilerStage, type CssVarName, DIAGNOSTIC_CODES, DIAGNOSTIC_SCHEMA_VERSION, type DeclaredExtension, type Diagnostic, type DiagnosticFormat, type DiagnosticFormatter, type DiagnosticProvenance, type DiagnosticReport, type DiagnosticSeverity, type ExtensionCapability, type FormatInput, GRAPH_MAX_DEPTH, type GraphEdge, type GraphIssue, type IrDocument, type IrGraph, type IrPath, type IrToken, type RelatedLocation, type ResolveOptions, type ResolvedTheme, type ResolvedToken, type SerializeCssOptions, type SourceLocation, THEMEON_CSP_ARTIFACT_SCHEMA_VERSION, THEMEON_ERROR_CODES, THEMEON_VITE_ARTIFACT_OWNER, THEMEON_VITE_MANIFEST_SCHEMA_VERSION, type ThemeDefinition, type ThemeonCspArtifactV1, ThemeonError, type ThemeonErrorCode, type ThemeonErrorOptions, type ThemeonViteManifestCssV1, type ThemeonViteManifestDeprecatedVarV1, type ThemeonViteManifestV1, aggregateDiagnostics, buildCspArtifact, buildFingerprint, buildGraph, buildViteManifest, builtinExtensions, canonicalId, compareCanonicalId, comparePath, compileTheme, createCompiler, cspSha256Base64, deprecatedCssVariablesFromIr, diagnosticFromDtcg, diagnosticFromGraphIssue, diagnosticFromThemeonError, diagnosticFromUnknown, diagnosticsFromGraphIssues, formatDiagnostics, graphHasBlockingIssue, legacyV0Alias, normalizeDsl, resolveTheme, serializeCspArtifact, serializeThemeCss, serializeViteManifest, sha256Hex, sha256Integrity, sortedCssVariables, sortedThemeNames };
```

## Export `./dtcg`

<!-- types: ./dist/public/dtcg.d.ts -->

```dts
import { ThemeDefinition } from "../types.js";
import { DTCGExport, ToDTCGOptions, toDTCG } from "../dtcg/to-dtcg.js";
import { FromDTCGOptions, FromDTCGResult, fromDTCG } from "../dtcg/from-dtcg.js";
import { formatColor, parseColor } from "../dtcg/color.js";
import { THEMEON_ERROR_CODES, ThemeonError, ThemeonErrorCode, ThemeonErrorOptions } from "../errors.js";
export { type DTCGExport, type FromDTCGOptions, type FromDTCGResult, THEMEON_ERROR_CODES, type ThemeDefinition, ThemeonError, type ThemeonErrorCode, type ThemeonErrorOptions, type ToDTCGOptions, formatColor, fromDTCG, parseColor, toDTCG };
```

## Export `./runtime`

<!-- types: ./dist/public/runtime.d.ts -->

```dts
import { CssVarName, ResolvedTheme } from "../types.js";
import { ElementLike, applyTheme, clearTheme, themeVars } from "../apply.js";
import { THEMEON_ERROR_CODES, ThemeonError, ThemeonErrorCode, ThemeonErrorOptions } from "../errors.js";
export { type CssVarName, type ElementLike, type ResolvedTheme, THEMEON_ERROR_CODES, ThemeonError, type ThemeonErrorCode, type ThemeonErrorOptions, applyTheme, clearTheme, themeVars };
```

## Export `./tenant`

<!-- types: ./dist/public/tenant.d.ts -->

```dts
import { ResolvedTheme } from "../types.js";
import { DEFAULT_TENANT_TRUST, TENANT_PATCH_POLICIES, TenantPatchPolicy, TenantTrustLevel, resolveTenantPatchPolicy } from "../patch-policy.js";
import { ApplyPatchOptions, ApplyPatchResult, SerializePatchOptions, applyThemePatch, serializeThemePatch } from "../patch.js";
import { ALLOWED_TENANT_TYPES, TextStyleTenantValue } from "../patch-grammar.js";
import { JsonSchema, JsonSchemaNode, TenantSchemaOptions, tenantThemeSchema } from "../schema.js";
import { THEMEON_ERROR_CODES, ThemeonError, ThemeonErrorCode, ThemeonErrorOptions } from "../errors.js";
export { ALLOWED_TENANT_TYPES, type ApplyPatchOptions, type ApplyPatchResult, DEFAULT_TENANT_TRUST, type JsonSchema, type JsonSchemaNode, type ResolvedTheme, type SerializePatchOptions, TENANT_PATCH_POLICIES, THEMEON_ERROR_CODES, type TenantPatchPolicy, type TenantSchemaOptions, type TenantTrustLevel, type TextStyleTenantValue, ThemeonError, type ThemeonErrorCode, type ThemeonErrorOptions, applyThemePatch, resolveTenantPatchPolicy, serializeThemePatch, tenantThemeSchema };
```
