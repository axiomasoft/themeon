import {
  ColorSpace,
  contrastAPCA as contrastApcaColorjs,
  HSL,
  HWB,
  Lab,
  LCH,
  OKLCH,
  P3,
  sRGB,
  to,
} from 'colorjs.io/fn'

import { ColorsError } from './errors'
import {
  WCAG22_AA_LARGE_TEXT_RATIO,
  WCAG22_AA_NON_TEXT_RATIO,
  WCAG22_AA_NORMAL_TEXT_RATIO,
  evaluateWcag22Policy,
  type Wcag22ContrastResult,
} from './wcag22'

// colorjs.io/fn (процедурный tree-shakeable вход) не регистрирует цветовые пространства
// автоматически — это обязана сделать сама библиотека-потребитель (colorjs.io/docs/procedural).
// Регистрируем весь набор синтаксисов, легальных в CSS Color 4/5, которые может прислать
// tenant-тема или CLI-пользователь: hex/rgb()/named (sRGB), oklch(), hsl(), hwb(), lab(), lch(),
// color(display-p3 ...). Регистрация — модульный синглтон (побочный эффект импорта), один раз
// на процесс. Найдено code-review P2.1 (MED): без этого валидные цвета типа hsl()/lab()/lch()/
// hwb()/color() бросали BAD_COLOR.
ColorSpace.register(sRGB)
ColorSpace.register(OKLCH)
ColorSpace.register(HSL)
ColorSpace.register(HWB)
ColorSpace.register(Lab)
ColorSpace.register(LCH)
ColorSpace.register(P3)

export type ContrastUsage = 'body' | 'text' | 'large' | 'non-text'

/** Минимальные |Lc| по назначению (APCA Nutshell): body 75, прочий текст 60, крупный/non-text 45. */
export const LC_THRESHOLDS: Readonly<Record<ContrastUsage, number>> = {
  body: 75,
  text: 60,
  large: 45,
  'non-text': 45,
}

export interface ContrastOptions {
  /**
   * Непрозрачная подложка под ПОЛУПРОЗРАЧНЫМ bg (обычно `--color-bg-page` проверяемой темы).
   * Обязателен, если у bg alpha < 1 — иначе `ColorsError('ALPHA_NEEDS_BASE')` (fail-closed:
   * молча подставить белый значило бы считать контраст против несуществующего фона).
   * Игнорируется при непрозрачном bg.
   */
  readonly base?: string
}

/**
 * Знаковый APCA Lc (fg поверх bg). Отрицательный — light-on-dark; сравнивать по |Lc|.
 *
 * @throws {ColorsError} code `BAD_COLOR` на непарсибельном цвете (fail-closed).
 * @throws {ColorsError} code `ALPHA_NEEDS_BASE` на полупрозрачном bg без `opts.base` (fail-closed).
 */
export function contrastAPCA(fg: string, bg: string, opts?: ContrastOptions): number {
  try {
    // APCA расcчитан на непрозрачные цвета; полупрозрачный fg/bg молча трактовался бы
    // colorjs.io как опаковый (canvas-«fail open» — найдено code-review P2.1, MED), поэтому
    // альфа-канал явно сплющивается до подложки перед вызовом contrastAPCA.
    const { bgOpaque, fgOpaque } = flattenAlpha(fg, bg, opts?.base)
    // colorjs.io/fn contrastAPCA(background, foreground) — порядок аргументов обратный
    // нашему публичному API (fg, bg); см. Required Reads item'а https://colorjs.io/docs/contrast.
    return contrastApcaColorjs(bgOpaque, fgOpaque)
  } catch (error) {
    // ALPHA_NEEDS_BASE — намеренный fail-closed из flattenAlpha, не ошибка парсинга;
    // перерасшифровывать её в BAD_COLOR значило бы прятать реальный код от вызывающей стороны.
    if (error instanceof ColorsError) throw error
    throw new ColorsError(
      'BAD_COLOR',
      `Could not parse color pair for APCA contrast: fg=${JSON.stringify(fg)}, bg=${JSON.stringify(bg)}`,
      { cause: error },
    )
  }
}

/** Непрозрачный sRGB-цвет как color object colorjs.io (для повторного использования как подложки/входа APCA). */
interface OpaqueSRGBColor {
  readonly space: 'srgb'
  readonly coords: [number, number, number]
  readonly alpha: 1
}

/**
 * Сплющивает альфа-канал fg/bg до непрозрачных sRGB-цветов перед APCA.
 *
 * Официальный контракт APCA (RAG apcaw3.myndex.com/docs/APCA-W3_FunctionsOverview.html,
 * раздел «RGBA text transparency», 2026-07-14): альфа допустима ТОЛЬКО у fg — bg обязан быть
 * непрозрачным, композит идёт на ФАКТИЧЕСКУЮ подложку `base`, не на безусловный белый (Major
 * #15 аудита P8 — старая реализация композитила bg на белое, гейт получал заниженный |Lc| в
 * тёмных темах). fg с альфой композитится на уже сплющенный bg — так «просвечивающий» текст
 * реально теряет контраст, а не считается как опаковый (fail-closed, не fail-open).
 */
function flattenAlpha(
  fg: string,
  bg: string,
  base: string | undefined,
): { fgOpaque: OpaqueSRGBColor; bgOpaque: OpaqueSRGBColor } {
  const bgSrgb = to(bg, 'srgb')
  const bgAlpha = bgSrgb.alpha ?? 1
  let bgCoords = bgSrgb.coords as [number, number, number]
  if (bgAlpha < 1) {
    if (base === undefined) {
      throw new ColorsError(
        'ALPHA_NEEDS_BASE',
        `Полупрозрачный bg (${JSON.stringify(bg)}) требует непрозрачную подложку: передай ` +
          'opts.base (обычно --color-bg-page проверяемой темы). Молчаливая подстановка белого ' +
          'дала бы контраст против несуществующего фона.',
      )
    }
    const baseSrgb = to(base, 'srgb')
    if ((baseSrgb.alpha ?? 1) < 1) {
      throw new ColorsError('ALPHA_NEEDS_BASE', `Подложка base сама полупрозрачна: ${JSON.stringify(base)}`)
    }
    bgCoords = compositeOver(bgCoords, bgAlpha, baseSrgb.coords as [number, number, number])
  }
  const fgSrgb = to(fg, 'srgb')
  const fgCoords = compositeOver(fgSrgb.coords as [number, number, number], fgSrgb.alpha ?? 1, bgCoords)
  return {
    fgOpaque: { space: 'srgb', coords: fgCoords, alpha: 1 },
    bgOpaque: { space: 'srgb', coords: bgCoords, alpha: 1 },
  }
}

/** Porter-Duff «src over opaque backdrop»: coords*alpha + backdrop*(1-alpha). При alpha=1 — тождество. */
function compositeOver(
  coords: readonly [number, number, number],
  alpha: number,
  backdrop: readonly [number, number, number],
): [number, number, number] {
  if (alpha >= 1) return [coords[0], coords[1], coords[2]]
  return [
    coords[0] * alpha + backdrop[0] * (1 - alpha),
    coords[1] * alpha + backdrop[1] * (1 - alpha),
    coords[2] * alpha + backdrop[2] * (1 - alpha),
  ]
}

export interface ContrastPair {
  readonly fg: string
  readonly bg: string
  readonly usage: ContrastUsage
  /** Человекочитаемая метка пары для отчёта: 'text on bg.page'. */
  readonly label?: string
  /** Подложка под полупрозрачный bg — прокидывается в `contrastAPCA`. */
  readonly base?: string
}

export interface ContrastReport {
  readonly pair: ContrastPair
  readonly lc: number
  readonly required: number
  readonly pass: boolean
}

export interface WcagContrastReport {
  readonly pair: ContrastPair
  readonly result: Wcag22ContrastResult
}

export interface ContrastCheckResult {
  /** Normative WCAG 2.2 AA gate (D3, P0.2). */
  readonly pass: boolean
  /** APCA experimental/advisory channel — does not drive `pass`. */
  readonly apcaPass: boolean
  readonly wcagReports: readonly WcagContrastReport[]
  readonly reports: readonly ContrastReport[]
}

function wcagPolicyForUsage(
  usage: ContrastUsage,
): { kind: 'wcag22-text'; context: { level: 'AA'; size: 'normal' | 'large' } } | { kind: 'wcag22-non-text' } {
  if (usage === 'non-text') return { kind: 'wcag22-non-text' }
  if (usage === 'large') return { kind: 'wcag22-text', context: { level: 'AA', size: 'large' } }
  return { kind: 'wcag22-text', context: { level: 'AA', size: 'normal' } }
}

/** Батч-гейт: `pass` = WCAG 2.2 AA; APCA в `apcaPass` (advisory). Непарсибельная пара = throw (fail-closed). */
export function checkContrast(pairs: readonly ContrastPair[]): ContrastCheckResult {
  const reports = pairs.map((pair): ContrastReport => {
    const lc = contrastAPCA(pair.fg, pair.bg, { base: pair.base })
    const required = LC_THRESHOLDS[pair.usage]
    return { pair, lc, required, pass: Math.abs(lc) >= required }
  })

  const wcagReports = pairs.map((pair): WcagContrastReport => {
    const policy = wcagPolicyForUsage(pair.usage)
    const result =
      policy.kind === 'wcag22-non-text'
        ? evaluateWcag22Policy(pair.fg, pair.bg, policy, { base: pair.base })
        : evaluateWcag22Policy(pair.fg, pair.bg, policy, { base: pair.base })
    return { pair, result }
  })

  const normativePass = wcagReports.every((report) => report.result.status === 'pass')
  const apcaPass = reports.every((report) => report.pass)

  return { pass: normativePass, apcaPass, wcagReports, reports }
}

export const WCAG_THRESHOLDS: Readonly<Record<ContrastUsage, number>> = {
  body: WCAG22_AA_NORMAL_TEXT_RATIO,
  text: WCAG22_AA_NORMAL_TEXT_RATIO,
  large: WCAG22_AA_LARGE_TEXT_RATIO,
  'non-text': WCAG22_AA_NON_TEXT_RATIO,
}

/** Роль пары в SSOT `SEMANTIC_CONTRAST_PAIRS` — fg/bg заданы именами CSS-переменных темы. */
export interface SemanticPairSpec {
  readonly fg: `--${string}`
  readonly bg: `--${string}`
  readonly usage: ContrastUsage
  readonly label: string
}

/**
 * SSOT семантических пар контраста дефолт-темы `@themeon/css` (аудит #22, Major #15) —
 * единственная таблица, потребляемая ОБОИМИ гейтами (`packages/css/scripts/gen-tokens.mjs` и
 * `packages/cli/src/checks/contrast.ts`, вынос дублей — P8.7/P8.13). Уровень назначен по роли:
 * `body` — колонки основного текста (S5 «minimum for columns of body text»); `text` — прочий
 * контентный текст (подписи, лейблы кнопок); `non-text` — несущий смысл UI-элемент (фокус-кольцо).
 * Канон таблицы и цифр — `findings/P8-css-layers-cli-checks.md` §3.2.
 */
export const SEMANTIC_CONTRAST_PAIRS: readonly SemanticPairSpec[] = [
  { fg: '--color-text', bg: '--color-bg-page', usage: 'body', label: 'text/bg.page' },
  { fg: '--color-text', bg: '--color-bg-subtle', usage: 'body', label: 'text/bg.subtle' },
  { fg: '--color-text', bg: '--color-bg-elevated', usage: 'body', label: 'text/bg.elevated' },
  { fg: '--color-text-muted', bg: '--color-bg-page', usage: 'text', label: 'textMuted/bg.page' },
  { fg: '--color-text-muted', bg: '--color-bg-subtle', usage: 'text', label: 'textMuted/bg.subtle' },
  { fg: '--color-text-muted', bg: '--color-bg-elevated', usage: 'text', label: 'textMuted/bg.elevated' },
  { fg: '--color-link', bg: '--color-bg-page', usage: 'body', label: 'link/bg.page' },
  { fg: '--color-link', bg: '--color-bg-subtle', usage: 'body', label: 'link/bg.subtle' },
  { fg: '--color-link-hover', bg: '--color-bg-page', usage: 'body', label: 'linkHover/bg.page' },
  { fg: '--color-on-primary', bg: '--color-action-primary', usage: 'text', label: 'onPrimary/action.primary' },
  {
    fg: '--color-on-primary',
    bg: '--color-action-primary-hover',
    usage: 'text',
    label: 'onPrimary/action.primaryHover',
  },
  { fg: '--color-focus-ring', bg: '--color-bg-page', usage: 'non-text', label: 'focusRing/bg.page' },
  { fg: '--color-focus-ring', bg: '--color-bg-subtle', usage: 'non-text', label: 'focusRing/bg.subtle' },
  { fg: '--color-focus-ring', bg: '--color-bg-elevated', usage: 'non-text', label: 'focusRing/bg.elevated' },
] as const

/**
 * Прогоняет `SEMANTIC_CONTRAST_PAIRS` по плоскому словарю `varName → литеральное значение`
 * ОДНОЙ темы (fail-closed через `checkContrast` — непарсибельная пара бросает, не skip'ается).
 * Подложка под альфу — `--color-bg-page` этой же темы (приоритет 2 резолва, `findings/
 * P8-colors-scale-apca.md` §3.4); пара, чья роль отсутствует в `lookup`, пропускается — тема
 * не обязана патчить каждую роль.
 */
export function checkThemeContrast(lookup: Readonly<Record<string, string>>): ContrastCheckResult {
  const base = lookup['--color-bg-page']
  const pairs: ContrastPair[] = []
  for (const spec of SEMANTIC_CONTRAST_PAIRS) {
    const fg = lookup[spec.fg]
    const bg = lookup[spec.bg]
    if (fg === undefined || bg === undefined) continue
    pairs.push({ fg, bg, usage: spec.usage, label: spec.label, base })
  }
  return checkContrast(pairs)
}
