/**
 * `@themeon/core/compiler` — staged compiler, resolve, and CSS emit.
 *
 * `compileTheme` / `createCompiler` are additive: they are not on the root entry.
 * `resolveTheme` and `serializeThemeCss` are the same functions as `@themeon/core`.
 */
export { COMPILER_STAGES, COMPILER_VERSION } from '../pipeline/types'
export type {
  Compiler,
  CompilerContext,
  CompilerExtension,
  CompilerOptions,
  CompilerStage,
  CompileResult,
  DeclaredExtension,
  ExtensionCapability,
  FormatInput,
} from '../pipeline/types'
export { normalizeDsl } from '../authoring/normalize-dsl'
export { createCompiler, compileTheme } from '../pipeline/compile'
export { canonicalId } from '../model/ir'
export {
  GRAPH_MAX_DEPTH,
  buildGraph,
  compareCanonicalId,
  comparePath,
  graphHasBlockingIssue,
} from '../graph/build'
export type { GraphEdge, GraphIssue, IrGraph } from '../graph/build'
export { buildFingerprint } from '../pipeline/fingerprint'
export { builtinExtensions } from '../pipeline/extensions'
export type { IrDocument, IrPath, IrToken } from '../model/ir'
export { resolveTheme } from '../resolve'
export type { ResolveOptions } from '../resolve'
export { serializeThemeCss } from '../serialize'
export type { SerializeCssOptions } from '../serialize'
export {
  THEMEON_CSP_ARTIFACT_SCHEMA_VERSION,
  THEMEON_VITE_ARTIFACT_OWNER,
  THEMEON_VITE_MANIFEST_SCHEMA_VERSION,
  buildCspArtifact,
  buildViteManifest,
  cspSha256Base64,
  deprecatedCssVariablesFromIr,
  serializeCspArtifact,
  serializeViteManifest,
  sha256Hex,
  sha256Integrity,
  sortedCssVariables,
  sortedThemeNames,
} from '../formats/vite-delivery'
export type {
  BuildCspArtifactInput,
  BuildViteManifestInput,
  ThemeonCspArtifactV1,
  ThemeonViteManifestCssV1,
  ThemeonViteManifestDeprecatedVarV1,
  ThemeonViteManifestV1,
} from '../formats/vite-delivery'
export { legacyV0Alias } from '../aliases/legacy-v0'
export type { AliasesOption, AliasRule } from '../aliases/legacy-v0'
export { ThemeonError, THEMEON_ERROR_CODES } from '../errors'
export type { ThemeonErrorCode, ThemeonErrorOptions } from '../errors'
export type { ResolvedTheme, ResolvedToken, ThemeDefinition, CssVarName } from '../types'
export {
  DIAGNOSTIC_SCHEMA_VERSION,
  DIAGNOSTIC_CODES,
  aggregateDiagnostics,
  diagnosticFromDtcg,
  diagnosticFromGraphIssue,
  diagnosticFromThemeonError,
  diagnosticFromUnknown,
  diagnosticsFromGraphIssues,
  formatDiagnostics,
} from '../diagnostics'
export type {
  Diagnostic,
  DiagnosticFormat,
  DiagnosticFormatter,
  DiagnosticProvenance,
  DiagnosticReport,
  DiagnosticSeverity,
  RelatedLocation,
  SourceLocation,
} from '../diagnostics'
