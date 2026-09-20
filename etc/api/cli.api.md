# @themeon/cli

> Packed `.d.ts` snapshot for public export map entries. Update with `pnpm api-report:update`.

## Export `.`

<!-- types: ./dist/index.d.ts -->

```dts
import { ThemeDefinition } from "@themeon/core/authoring";
import { Diagnostic, ResolvedTheme } from "@themeon/core";
import { JsonSchema } from "@themeon/core/tenant";

//#region src/commands/init.d.ts
interface InitOptions {
  cwd: string;
  force?: boolean;
  tailwind?: boolean;
}
interface InitResult {
  created: string[];
  skipped: string[];
}
/** Scaffold a starter theme.config.ts (+ optional Tailwind bridge stub). Idempotent unless force. */
declare function runInit(opts: InitOptions): InitResult;
//#endregion
//#region src/commands/build.d.ts
interface BuildOptions {
  cwd: string;
  config: string;
  out: string;
  tailwind?: string;
  refLayer?: 'referenced' | 'all' | 'inline';
  aliases?: string;
  tailwindLayers?: boolean;
}
interface BuildResult {
  outPath: string;
  bridgePath?: string;
}
declare function runBuild(opts: BuildOptions): Promise<BuildResult>;
//#endregion
//#region src/checks/types.d.ts
/**
 * `themeon check` (P4.5) — общие типы трёх линтеров (token-coverage / APCA-contrast /
 * hardcode). `Finding` — единый формат находки, печатается CLI-раннером и проверяется тестами
 * буквально (уровень/правило/сообщение/файл:строка).
 */
type Level = 'error' | 'warning';
type Rule = 'token-coverage' | 'contrast' | 'hardcode';
interface Finding {
  readonly level: Level;
  readonly rule: Rule;
  readonly message: string;
  /** Stable machine code (P0.2 contrast diagnostics). */
  readonly code?: string;
  readonly file?: string;
  readonly line?: number;
}
/** Прочитанный исходник потребителя (`scanSources`) — вход coverage/hardcode-линтеров. */
interface SourceFile {
  readonly file: string;
  readonly content: string;
}
//#endregion
//#region src/commands/check.d.ts
interface CheckResult {
  readonly findings: Finding[];
  readonly diagnostics: readonly Diagnostic[];
  readonly ok: boolean;
}
interface CheckOptions {
  cwd: string;
  config: string;
  src?: readonly string[];
  /** Фактический выход `themeon build --out`, исключается из скана (default `tokens.css`, как у `build`). */
  out?: string;
  /** Фактический выход `themeon build --tailwind`, исключается из скана, если передан. */
  tailwind?: string;
  /** Доп. glob-паттерны, исключённые из скана (Major #23 defense-in-depth #1). */
  ignore?: readonly string[];
  coverage?: boolean;
  contrast?: boolean;
  hardcode?: boolean;
  allowPx?: readonly number[];
  /** `--`-префиксы project-owned/third-party переменных, исключённые из coverage dead-ref (P4.5 code-review MED). */
  coverageIgnorePrefixes?: readonly string[];
  /**
   * Путь к JSON-файлу tenant-патча (P6.3, H3 И2) — переключает `runCheck` на fail-closed
   * APCA-гейт публикации ВМЕСТО сканирования coverage/hardcode: base-тема + провалидированный
   * патч (`applyThemePatch`, P6.1) резолвятся в эффективный `lookup`, гоняется
   * `checkThemeContrast` (`@themeon/colors`). Любая ошибка на пути (нечитаемый/невалидный JSON,
   * throw валидации значения, throw парсинга цвета, `pass===false`) — `error`-finding, `ok:false`.
   */
  tenant?: string;
}
/**
 * Loads `opts.config`, resolves it through the core resolver, scans `opts.src` (default
 * `**\/*.{css,vue}`) and runs the three enabled linters. `ok` is `false` only when a linter
 * reported a `'error'`-level finding — warnings never flip exit status (Rule 5).
 *
 * `opts.tenant` set → delegates entirely to {@link runTenantCheck} (fail-closed APCA
 * publication gate, P6.3): source scanning/coverage/hardcode linters do not apply to a tenant
 * patch publication decision.
 */
declare function runCheck(opts: CheckOptions): Promise<CheckResult>;
//#endregion
//#region src/commands/schema.d.ts
interface SchemaOptions {
  cwd: string;
  config: string;
  out?: string;
}
interface SchemaResult {
  schema: JsonSchema;
  outPath?: string;
}
/** Loads `opts.config`, resolves it and builds the tenant-patch JSON Schema; optionally writes `opts.out`. */
declare function runSchema(opts: SchemaOptions): Promise<SchemaResult>;
//#endregion
//#region src/query/types.d.ts
type CliOutputFormat = 'pretty' | 'json' | 'github';
//#endregion
//#region src/commands/inspect.d.ts
interface InspectOptions {
  cwd: string;
  config: string;
  format: CliOutputFormat;
  refLayer?: 'referenced' | 'all' | 'inline';
  aliases?: string;
}
declare function runInspect(opts: InspectOptions): Promise<{
  exitCode: number;
  output: string;
}>;
//#endregion
//#region src/commands/explain.d.ts
interface ExplainOptions {
  cwd: string;
  config: string;
  token: string;
  format: CliOutputFormat;
  refLayer?: 'referenced' | 'all' | 'inline';
  aliases?: string;
}
declare function runExplain(opts: ExplainOptions): Promise<{
  exitCode: number;
  output: string;
}>;
//#endregion
//#region src/commands/graph.d.ts
interface GraphOptions {
  cwd: string;
  config: string;
  format: CliOutputFormat;
  refLayer?: 'referenced' | 'all' | 'inline';
  aliases?: string;
}
declare function runGraph(opts: GraphOptions): Promise<{
  exitCode: number;
  output: string;
}>;
//#endregion
//#region src/commands/diff.d.ts
interface DiffOptions {
  cwd: string;
  oldConfig: string;
  newConfig: string;
  format: CliOutputFormat;
  refLayer?: 'referenced' | 'all' | 'inline';
  aliases?: string;
}
declare function runDiff(opts: DiffOptions): Promise<{
  exitCode: number;
  output: string;
}>;
//#endregion
//#region src/commands/doctor.d.ts
interface DoctorOptions {
  cwd: string;
  config: string;
  baseline?: string;
  format: CliOutputFormat;
  refLayer?: 'referenced' | 'all' | 'inline';
  aliases?: string;
}
declare function runDoctor(opts: DoctorOptions): Promise<{
  exitCode: number;
  output: string;
}>;
//#endregion
//#region src/commands/migrate.d.ts
interface MigrateOptions {
  cwd: string;
  fromConfig: string;
  toConfig: string;
  format: CliOutputFormat;
  refLayer?: 'referenced' | 'all' | 'inline';
  aliases?: string;
}
declare function runMigrate(opts: MigrateOptions): Promise<{
  exitCode: number;
  output: string;
}>;
//#endregion
//#region src/load-theme.d.ts
/**
 * Loads a `theme.config.ts` at `absPath` via jiti and extracts its `ThemeDefinition` export
 * (`default` → `theme` → `defaultTheme`, same priority as the Nuxt module's `loadTheme`).
 * Fails loudly (throws `ThemeonError`) when the loaded module does not look like a theme
 * definition (missing `.sys`) — a build must not silently emit an empty `tokens.css`.
 */
declare function loadThemeConfig(absPath: string): Promise<ThemeDefinition>;
//#endregion
//#region src/checks/coverage.d.ts
interface CoverageOptions {
  /** `--`-префиксы (напр. `--reka-`, `--tw-`), исключённые из dead-ref error (не ThemeOn-токены). */
  ignorePrefixes?: readonly string[];
}
declare function checkCoverage(resolved: ResolvedTheme, sources: readonly SourceFile[], opts?: CoverageOptions): Finding[];
//#endregion
//#region src/checks/contrast.d.ts
declare function checkContrastPairs(resolved: ResolvedTheme): Finding[];
//#endregion
//#region src/checks/hardcode.d.ts
interface HardcodeOptions {
  /** Разрешённые px-значения (не флагаются). Default `[0, 1]` (нулевые/однопиксельные бордеры). */
  allowPx?: readonly number[];
}
declare function checkHardcode(sources: readonly SourceFile[], opts?: HardcodeOptions): Finding[];
//#endregion
//#region src/checks/scan.d.ts
declare function scanSources(cwd: string, patterns: readonly string[], ignore: readonly string[]): Promise<SourceFile[]>;
//#endregion
export { type BuildOptions, type BuildResult, type CheckOptions, type CoverageOptions, type DiffOptions, type DoctorOptions, type ExplainOptions, type Finding, type GraphOptions, type HardcodeOptions, type InitOptions, type InitResult, type InspectOptions, type Level, type MigrateOptions, type Rule, type SchemaOptions, type SchemaResult, type SourceFile, checkContrastPairs, checkCoverage, checkHardcode, loadThemeConfig, runBuild, runCheck, runDiff, runDoctor, runExplain, runGraph, runInit, runInspect, runMigrate, runSchema, scanSources };
```
