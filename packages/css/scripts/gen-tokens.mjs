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
import { resolveTheme, serializeThemeCss } from '@themeon/core'
import { checkContrast } from '@themeon/colors'
import { mkdirSync, renameSync, writeFileSync } from 'node:fs'

/**
 * Литеральное значение переменной, патченной темой `themeName` (fail loudly, если не
 * патчена — гейт не должен молча сравнивать светлые значения под видом тёмных).
 */
function themeVarValue(resolved, themeName, varName) {
  const patched = resolved.themes[themeName]?.find((t) => t.varName === varName)
  if (!patched) {
    throw new Error(
      `[themeon] APCA-гейт: переменная "${varName}" не патчится темой "${themeName}" — добавь её в src/theme/default.ts`,
    )
  }
  return patched.value
}

/**
 * APCA-пары гейта (P2.7 Code Guidance): body/text/text/text/text — для базы (themeName
 * undefined, читает `resolved.vars`) и для именованной темы (читает патч темы).
 */
function gatePairs(resolvedInline, themeName) {
  const v = (name) => (themeName ? themeVarValue(resolvedInline, themeName, name) : resolvedInline.vars[name])
  const suffix = themeName ? ` (${themeName})` : ''
  return [
    { fg: v('--color-text'), bg: v('--color-bg-page'), usage: 'body', label: `text/bg.page${suffix}` },
    {
      fg: v('--color-text-muted'),
      bg: v('--color-bg-page'),
      usage: 'text',
      label: `textMuted/bg.page${suffix}`,
    },
    { fg: v('--color-text'), bg: v('--color-bg-subtle'), usage: 'body', label: `text/bg.subtle${suffix}` },
    {
      fg: v('--color-on-primary'),
      bg: v('--color-action-primary'),
      usage: 'text',
      label: `onPrimary/action.primary${suffix}`,
    },
    { fg: v('--color-link'), bg: v('--color-bg-page'), usage: 'text', label: `link/bg.page${suffix}` },
  ]
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

  const pairs = [...gatePairs(resolvedInline, undefined), ...gatePairs(resolvedInline, 'dark')]
  const { pass, reports } = checkContrast(pairs)

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
