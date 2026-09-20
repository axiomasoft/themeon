# @themeon/css

> Packed `.d.ts` snapshot for public export map entries. Update with `pnpm api-report:update`.

## Export `.`

<!-- types: ./dist/contract.d.ts -->

```dts
//#region src/contract.d.ts
/** Один потребляемый sys-var: имя, литеральный fallback, модули-потребители. */
interface CssContractEntry {
  readonly varName: `--${string}`;
  readonly fallback: string;
  readonly usedBy: readonly string[];
}
/**
 * Machine-readable CSS custom-property contract of `@themeon/css` — the set of `sys`-layer
 * variables the package's own CSS consumes (with literal fallbacks). Input for the
 * token-coverage linter in `themeon check` (P4).
 */
declare const CSS_CONTRACT: readonly CssContractEntry[];
/** Порядок каскада ThemeOn (P-D20) — то же перечисление, что и в `layers.css`. */
declare const THEMEON_LAYERS: readonly ["themeon.tokens", "themeon.reset", "themeon.base", "themeon.composition", "themeon.blueprints", "themeon.components", "themeon.utilities"];
//#endregion
export { CSS_CONTRACT, CssContractEntry, THEMEON_LAYERS };
```
