# @themeon/colors

> Packed `.d.ts` snapshot for public export map entries. Update with `pnpm api-report:update`.

## Export `.`

<!-- types: ./dist/index.d.ts -->

```dts
//#region src/errors.d.ts
/** Коды ошибок @themeon/colors (P2.1; SEED_OUT_OF_BAND/CONTRAST_UNREACHABLE — P8.5; ALPHA_NEEDS_BASE — P8.6). */
type ColorsErrorCode = 'BAD_COLOR' | 'BAD_SEED' | 'SEED_OUT_OF_BAND' | 'CONTRAST_UNREACHABLE' | 'ALPHA_NEEDS_BASE' | 'GRADIENT_UNSUPPORTED';
/** Ошибка @themeon/colors. Гейт fail-closed: непарсибельный вход всегда бросает, не пропускает. */
declare class ColorsError extends Error {
  readonly code: ColorsErrorCode;
  constructor(code: ColorsErrorCode, message: string, options?: ErrorOptions);
}
//#endregion
//#region src/wcag22.d.ts
/** WCAG 2.2 success criterion 1.4.3 — normal text at level AA. RAG:✅ https://www.w3.org/TR/WCAG22/#contrast-minimum (retrieved 2026-09-19) */
declare const WCAG22_AA_NORMAL_TEXT_RATIO = 4.5;
/** WCAG 2.2 — large text at level AA (1.4.3). RAG:✅ same primary source (retrieved 2026-09-19) */
declare const WCAG22_AA_LARGE_TEXT_RATIO = 3;
/** WCAG 2.2 success criterion 1.4.11 — non-text contrast at level AA. RAG:✅ https://www.w3.org/TR/WCAG22/#non-text-contrast (retrieved 2026-09-19) */
declare const WCAG22_AA_NON_TEXT_RATIO = 3;
type Wcag22TextSize = 'normal' | 'large';
type Wcag22IndeterminateReason = 'unparseable' | 'alpha_needs_base' | 'gradient' | 'non_solid';
interface Wcag22TextContext {
  readonly level: 'AA';
  readonly size: Wcag22TextSize;
}
type Wcag22Policy = {
  readonly kind: 'wcag22-text';
  readonly context: Wcag22TextContext;
} | {
  readonly kind: 'wcag22-non-text';
} | {
  readonly kind: 'apca-advisory';
};
interface Wcag22ContrastOk {
  readonly status: 'pass' | 'fail';
  readonly policy: 'wcag22-text' | 'wcag22-non-text';
  readonly ratio: number;
  readonly threshold: number;
  readonly pass: boolean;
}
interface Wcag22ContrastIndeterminate {
  readonly status: 'indeterminate';
  readonly policy: 'wcag22-text' | 'wcag22-non-text';
  readonly reason: Wcag22IndeterminateReason;
  readonly message: string;
}
type Wcag22ContrastResult = Wcag22ContrastOk | Wcag22ContrastIndeterminate;
/** Relative luminance for sRGB (WCAG 2.x definition). */
declare function relativeLuminanceSrgb(coords: readonly [number, number, number]): number;
declare function wcagContrastRatio(l1: number, l2: number): number;
/**
 * WCAG 2.2 contrast ratio for a foreground/background pair (opaque after alpha flattening).
 * @throws {ColorsError} `BAD_COLOR`, `ALPHA_NEEDS_BASE`, or `GRADIENT_UNSUPPORTED`
 */
declare function contrastWCAG22Ratio(fg: string, bg: string, opts?: ContrastOptions): number;
declare function wcag22Threshold(policy: Wcag22Policy): number | null;
declare function evaluateWcag22Policy(fg: string, bg: string, policy: Extract<Wcag22Policy, {
  kind: 'wcag22-text';
} | {
  kind: 'wcag22-non-text';
}>, opts?: ContrastOptions): Wcag22ContrastResult;
//#endregion
//#region src/contrast.d.ts
type ContrastUsage = 'body' | 'text' | 'large' | 'non-text';
/** Минимальные |Lc| по назначению (APCA Nutshell): body 75, прочий текст 60, крупный/non-text 45. */
declare const LC_THRESHOLDS: Readonly<Record<ContrastUsage, number>>;
interface ContrastOptions {
  /**
   * Непрозрачная подложка под ПОЛУПРОЗРАЧНЫМ bg (обычно `--color-bg-page` проверяемой темы).
   * Обязателен, если у bg alpha < 1 — иначе `ColorsError('ALPHA_NEEDS_BASE')` (fail-closed:
   * молча подставить белый значило бы считать контраст против несуществующего фона).
   * Игнорируется при непрозрачном bg.
   */
  readonly base?: string;
}
/**
 * Знаковый APCA Lc (fg поверх bg). Отрицательный — light-on-dark; сравнивать по |Lc|.
 *
 * @throws {ColorsError} code `BAD_COLOR` на непарсибельном цвете (fail-closed).
 * @throws {ColorsError} code `ALPHA_NEEDS_BASE` на полупрозрачном bg без `opts.base` (fail-closed).
 */
declare function contrastAPCA(fg: string, bg: string, opts?: ContrastOptions): number;
interface ContrastPair {
  readonly fg: string;
  readonly bg: string;
  readonly usage: ContrastUsage;
  /** Человекочитаемая метка пары для отчёта: 'text on bg.page'. */
  readonly label?: string;
  /** Подложка под полупрозрачный bg — прокидывается в `contrastAPCA`. */
  readonly base?: string;
}
interface ContrastReport {
  readonly pair: ContrastPair;
  readonly lc: number;
  readonly required: number;
  readonly pass: boolean;
}
interface WcagContrastReport {
  readonly pair: ContrastPair;
  readonly result: Wcag22ContrastResult;
}
interface ContrastCheckResult {
  /** Normative WCAG 2.2 AA gate (D3, P0.2). */
  readonly pass: boolean;
  /** APCA experimental/advisory channel — does not drive `pass`. */
  readonly apcaPass: boolean;
  readonly wcagReports: readonly WcagContrastReport[];
  readonly reports: readonly ContrastReport[];
}
/** Батч-гейт: `pass` = WCAG 2.2 AA; APCA в `apcaPass` (advisory). Непарсибельная пара = throw (fail-closed). */
declare function checkContrast(pairs: readonly ContrastPair[]): ContrastCheckResult;
declare const WCAG_THRESHOLDS: Readonly<Record<ContrastUsage, number>>;
/** Роль пары в SSOT `SEMANTIC_CONTRAST_PAIRS` — fg/bg заданы именами CSS-переменных темы. */
interface SemanticPairSpec {
  readonly fg: `--${string}`;
  readonly bg: `--${string}`;
  readonly usage: ContrastUsage;
  readonly label: string;
}
/**
 * SSOT семантических пар контраста дефолт-темы `@themeon/css` (аудит #22, Major #15) —
 * единственная таблица, потребляемая ОБОИМИ гейтами (`packages/css/scripts/gen-tokens.mjs` и
 * `packages/cli/src/checks/contrast.ts`, вынос дублей — P8.7/P8.13). Уровень назначен по роли:
 * `body` — колонки основного текста (S5 «minimum for columns of body text»); `text` — прочий
 * контентный текст (подписи, лейблы кнопок); `non-text` — несущий смысл UI-элемент (фокус-кольцо).
 * Канон таблицы и цифр — `findings/P8-css-layers-cli-checks.md` §3.2.
 */
declare const SEMANTIC_CONTRAST_PAIRS: readonly SemanticPairSpec[];
/**
 * Прогоняет `SEMANTIC_CONTRAST_PAIRS` по плоскому словарю `varName → литеральное значение`
 * ОДНОЙ темы (fail-closed через `checkContrast` — непарсибельная пара бросает, не skip'ается).
 * Подложка под альфу — `--color-bg-page` этой же темы (приоритет 2 резолва, `findings/
 * P8-colors-scale-apca.md` §3.4); пара, чья роль отсутствует в `lookup`, пропускается — тема
 * не обязана патчить каждую роль.
 */
declare function checkThemeContrast(lookup: Readonly<Record<string, string>>): ContrastCheckResult;
//#endregion
//#region src/scale.d.ts
interface ScaleOptions {
  /** Целевая тема шкалы. Деф. 'light'. */
  readonly appearance?: 'light' | 'dark';
  /** Гамма назначения gamut-маппинга. Деф. 'srgb'. */
  readonly gamut?: 'srgb' | 'p3';
  /**
   * Что делать, если L(seed) вне полосы solid-роли `[SEED_L_MIN, SEED_L_MAX]`:
   *  'error' (деф.) — `ColorsError('SEED_OUT_OF_BAND')` с actionable-сообщением (fail-closed, D15);
   *  'clamp'        — нормализовать L в полосу (C/H сохраняются) и сообщить об этом через `onSeedAdjusted`.
   */
  readonly seedPolicy?: 'error' | 'clamp';
  /** Вызывается при `seedPolicy:'clamp'`, когда seed действительно скорректирован. */
  readonly onSeedAdjusted?: (info: {
    readonly from: number;
    readonly to: number;
  }) => void;
}
interface ScaleStep {
  /** 1..12 (семантика Radix). */
  readonly index: number;
  readonly l: number;
  readonly c: number;
  readonly h: number;
  /** 'oklch(0.9931 0.0031 155.2)' — детерминированная сериализация. */
  readonly css: string;
  /** '#f8faf8' — всегда sRGB-маппинг (даже при gamut:'p3'), для legacy-потребителей. */
  readonly hex: string;
}
/** Ровно 12 элементов. */
type Scale = readonly ScaleStep[];
/** Роли шагов (Radix-семантика) — для доков/адаптеров. 12 английских строк. */
declare const STEP_ROLES: readonly string[];
/**
 * ΔL(oklch) между шагом 9 (solid) и шагом 10 (hover solid) — публичный экспорт (P8.9,
 * findings/P8-naive-color-canon.md §3.3): единственная внешняя константа, нужная адаптерам
 * для деривации interaction-состояний без доступа к самой шкале (см. `@themeon/naive`
 * `deriveInteractionStates`). Раньше жила только внутри `RAMP` — публикуем её же, не
 * дублируем число вторым источником правды.
 */
declare const STEP10_DELTA: Readonly<Record<'light' | 'dark', number>>;
/**
 * seed → 12-шаговая OKLCH-шкала формы Radix (роли — `STEP_ROLES`). Шаги 1-8, 11, 12 —
 * ФИКСИРОВАННЫЙ lightness-ramp (медианы 31 опубликованной шкалы Radix, `RAMP`); шаг 9 = seed;
 * шаг 10 — hover solid (`seed ± RAMP.d10`); chroma — гауссово распределение вокруг `mu`, база —
 * ПОСТ-gamut chroma шага 9, cap 1.0 (шаг 9 никогда не обгоняется шагами 1-8/10). Floor'ы Lc
 * 60 (шаг 11) / 90 (шаг 12) против шага 2 — ГАРАНТИЯ, обеспеченная бинарным поиском-гардом
 * (`enforceFloor`) по полному lightness-домену, а не цель генератора (findings §3.2).
 *
 * @throws {ColorsError} code `BAD_SEED` на непарсибельном seed.
 * @throws {ColorsError} code `SEED_OUT_OF_BAND` — L(seed) вне `[SEED_L_MIN, SEED_L_MAX]` и
 *   `opts.seedPolicy` не `'clamp'` (деф. `'error'`).
 * @throws {ColorsError} code `CONTRAST_UNREACHABLE` — floor 60/90 недостижим на всём домене
 *   (не должно случаться для seed'а внутри полосы; страховка, не штатный путь).
 */
declare function generateScale(seed: string, opts?: ScaleOptions): Scale;
/** Светлая + тёмная пара шкал из одного seed. */
declare function generateScalePair(seed: string, opts?: Omit<ScaleOptions, 'appearance'>): {
  readonly light: Scale;
  readonly dark: Scale;
};
/** Шаги → плоский словарь {'1': 'oklch(…)', …, '12': 'oklch(…)'} для defineTokens. */
declare function scaleToTokens(scale: Scale): Record<string, string>;
//#endregion
export { ColorsError, type ColorsErrorCode, type ContrastCheckResult, type ContrastOptions, type ContrastPair, type ContrastReport, type ContrastUsage, LC_THRESHOLDS, SEMANTIC_CONTRAST_PAIRS, STEP10_DELTA, STEP_ROLES, type Scale, type ScaleOptions, type ScaleStep, type SemanticPairSpec, WCAG22_AA_LARGE_TEXT_RATIO, WCAG22_AA_NON_TEXT_RATIO, WCAG22_AA_NORMAL_TEXT_RATIO, WCAG_THRESHOLDS, type Wcag22ContrastResult, type Wcag22IndeterminateReason, type Wcag22Policy, type Wcag22TextContext, type Wcag22TextSize, type WcagContrastReport, checkContrast, checkThemeContrast, contrastAPCA, contrastWCAG22Ratio, evaluateWcag22Policy, generateScale, generateScalePair, relativeLuminanceSrgb, scaleToTokens, wcag22Threshold, wcagContrastRatio };
```
