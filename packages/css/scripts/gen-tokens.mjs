// gen-tokens.mjs — дефолт-тема пакета (P2.7): резолвит `defaultTheme` из
// `src/theme/default.ts`, гоняет APCA-гейт (fail-closed) и пишет `dist/tokens.css`
// байт-в-байт вывод `serializeThemeCss` core (БЕЗ lightningcss/minify — P-D22: детерминизм
// сериализатора — фундамент «пустого diff» пилота P5).
//
// `genTokens(theme, root)` — чистая функция, theme передаётся параметром (а не берётся из
// module-level импорта dist): позволяет вызывать её из vitest прямо на TS-источнике
// (`src/theme/default.ts`), не требуя, чтобы tsdown уже собрал `dist/theme/default.js` —
// та же self-sufficiency, что и у `buildCss()` в `build.mjs` (P2.3–P2.6). CLI-путь внизу
// файла — единственное место, где тема берётся из скомпилированного `dist` (ей неоткуда
// больше взяться при запуске голым `node`, без TS-strip-types — выбор `[VERIFY-ON-IMPL]`
// P2.7 ТЗ: tsdown-entry вместо `node --experimental-strip-types`).
import { resolveTheme, serializeThemeCss } from '@themeon/core/compiler'
import { checkThemeContrast } from '@themeon/colors'
import { mkdirSync, renameSync, writeFileSync } from 'node:fs'

/**
 * Плоский словарь varName→литеральное значение ОДНОЙ темы: база (`themeName` undefined,
 * `resolvedInline.vars`) или именованная тема (база + патч темы поверх, fail loudly, если
 * `themeName` не патчит ни одной переменной — молчаливое сравнение светлых значений под видом
 * тёмных было бы хуже, чем явная ошибка).
 */
function themeLookup(resolvedInline, themeName) {
  if (themeName === undefined) return resolvedInline.vars
  const patch = resolvedInline.themes[themeName]
  if (!patch || patch.length === 0) {
    throw new Error(`[themeon] APCA-гейт: тема "${themeName}" не патчит ни одной переменной`)
  }
  const lookup = { ...resolvedInline.vars }
  for (const { varName, value } of patch) lookup[varName] = value
  return lookup
}

/**
 * Резолвит `theme`, гоняет APCA-гейт (fail-closed: провал → файл НЕ пишется, `ok: false`),
 * при успехе пишет `${root}/dist/tokens.css` (атомарно — паттерн `build.mjs`).
 *
 * @param theme выход `defineTheme` (обычно `defaultTheme` из `src/theme/default.ts`)
 * @param root корень пакета (`.../packages/css`)
 * @returns `{ ok, reports, css }` — `css`/файл отсутствуют при `ok: false`
 */
export function genTokens(theme, root = new URL('..', import.meta.url).pathname) {
  // Два резолва одного и того же theme: `resolvedForCss` — дефолтный refLayer 'referenced'
  // (var-chain, как ожидает потребитель CSS-пакета, P-D13); `resolvedInline` — 'inline',
  // ТОЛЬКО для гейта: sys-переменные там несут финальные литеральные значения без var(),
  // которые нужны APCA-движку (`contrastAPCA` парсит CSS-цвет, не умеет `var(--x)`).
  const resolvedForCss = resolveTheme(theme)
  const resolvedInline = resolveTheme(theme, { refLayer: 'inline' })

  // SSOT (P8.6/P8.7, findings/P8-css-layers-cli-checks.md §3.4): `SEMANTIC_CONTRAST_PAIRS`/
  // `checkThemeContrast` из `@themeon/colors` — единственная таблица пар/порогов, потребляемая
  // и здесь, и `themeon` CLI (`checks/contrast.ts`, P8.13). Локальная таблица `gatePairs()`
  // удалена (Major #22 — раньше CLI и gen-tokens.mjs гоняли РАЗНЫЕ таблицы на один вопрос).
  const base = checkThemeContrast(themeLookup(resolvedInline, undefined))
  const dark = checkThemeContrast(themeLookup(resolvedInline, 'dark'))
  // File write stays the package APCA gate. After P0.2, `pass` is WCAG 2.2 AA (D3);
  // `apcaPass` is the historical fail-closed publisher this script documents.
  const pass = base.apcaPass && dark.apcaPass
  const reports = [...base.reports, ...dark.reports]

  if (!pass) {
    return { ok: false, reports, css: undefined }
  }

  // banner: false — тест/Validation требуют, чтобы dist/tokens.css НАЧИНАЛСЯ с
  // `@layer themeon.tokens`; дефолтный баннер-комментарий serializeThemeCss иначе идёт первой строкой.
  const css = serializeThemeCss(resolvedForCss, { banner: false })

  mkdirSync(`${root}/dist`, { recursive: true })
  const dest = `${root}/dist/tokens.css`
  const tmp = `${dest}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`
  writeFileSync(tmp, css)
  renameSync(tmp, dest)

  return { ok: true, reports, css }
}

// CLI-запуск (node scripts/gen-tokens.mjs, после tsdown — dist/theme/default.js обязан существовать).
if (import.meta.url === `file://${process.argv[1]}`) {
  const { defaultTheme } = await import('../dist/theme/default.js')
  const result = genTokens(defaultTheme)
  if (!result.ok) {
    console.error('[themeon] APCA-гейт провален — dist/tokens.css НЕ записан:')
    for (const report of result.reports.filter((r) => !r.pass)) {
      console.error(
        `  ${report.pair.label}: |Lc|=${Math.abs(report.lc).toFixed(1)} < требуется ${report.required}`,
      )
    }
    process.exitCode = 1
  } else {
    console.log(`[themeon] dist/tokens.css записан (APCA-гейт пройден, ${result.reports.length} пар).`)
  }
}
