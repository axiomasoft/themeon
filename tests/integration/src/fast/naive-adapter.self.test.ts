import { describe, expect, test } from 'vitest'
import { changeColor } from 'seemly'
import { defineTheme, resolveTheme } from '@themeon/core'
import { contrastAPCA } from '@themeon/colors'
import { toNative } from '@themeon/naive'

import { anchorDark, anchorLight } from 'naive-ui/es/anchor/styles/index'
import { alertDark, alertLight } from 'naive-ui/es/alert/styles/index'
import { badgeDark, badgeLight } from 'naive-ui/es/badge/styles/index'
import { buttonDark, buttonLight } from 'naive-ui/es/button/styles/index'
import { calendarDark, calendarLight } from 'naive-ui/es/calendar/styles/index'
import { checkboxDark, checkboxLight } from 'naive-ui/es/checkbox/styles/index'
import { commonDark, commonLight } from 'naive-ui/es/_styles/common/index'
import { datePickerDark, datePickerLight } from 'naive-ui/es/date-picker/styles/index'
import { dropdownDark, dropdownLight } from 'naive-ui/es/dropdown/styles/index'
import { floatButtonDark, floatButtonLight } from 'naive-ui/es/float-button/styles/index'
import { iconWrapperDark, iconWrapperLight } from 'naive-ui/es/icon-wrapper/styles/index'
import { inputDark, inputLight } from 'naive-ui/es/input/styles/index'
import { menuDark, menuLight } from 'naive-ui/es/menu/styles/index'
import { paginationDark, paginationLight } from 'naive-ui/es/pagination/styles/index'
import { radioDark, radioLight } from 'naive-ui/es/radio/styles/index'
import { sliderDark, sliderLight } from 'naive-ui/es/slider/styles/index'
import { stepsDark, stepsLight } from 'naive-ui/es/steps/styles/index'
import { switchDark, switchLight } from 'naive-ui/es/switch/styles/index'
import { tabsDark, tabsLight } from 'naive-ui/es/tabs/styles/index'
import { tagDark, tagLight } from 'naive-ui/es/tag/styles/index'
import { tooltipDark, tooltipLight } from 'naive-ui/es/tooltip/styles/index'
import { typographyDark, typographyLight } from 'naive-ui/es/typography/styles/index'

/**
 * `@themeon/naive` — реальная труба (P8.8, Blocker #2/#3 + новые находки §4.1/§4.2,
 * findings/P8-naive-color-canon.md §6). Настоящий naive-ui 2.44.1 + seemly 0.3.10: вход
 * строится ТОЛЬКО через `resolveTheme(theme)` с дефолтным `refLayer` (README-quickstart),
 * не самодельной `vars`-фикстурой — ровно эта дыра пропустила Blocker #2 мимо старых юнит-
 * тестов (`to-native.test.ts` строил `vars` из литералов напрямую).
 *
 * T8/T9/T10 (findings §6) в этот файл не входят — они проверяют деривацию `*Hover/*Pressed/
 * *Suppl` по новому канону §3, которая Scope Excluded этого item'а (P8.9, `phases/P8.md`
 * P8.8 Scope Excluded).
 */

const HEX_RE = /^#[0-9a-f]{6}([0-9a-f]{2})?$/i

// Литералы — те же, что реальная дефолт-тема `@themeon/css` резолвит в `dist/tokens.css`
// (accent-9/10/11, neutral-шкала); `status.*` дефолт-тема не несёт (P8.7) — добавлены здесь,
// чтобы упражнять STATUS_INK_SOURCES для success/error/info (warning — Pending Work, §4.2
// «жёлтая полоса», не покрыта этим фикстуром намеренно: L подобрана так, чтобы не попасть в
// зону APCA <60 ни с одним из чернил, иначе T7 ловил бы уже известную, вне-скоупа находку).
function fixtureTheme() {
  return defineTheme({
    base: {
      color: {
        bg: {
          page: 'oklch(0.9930 0.0019 260.00)',
          subtle: 'oklch(0.9820 0.0022 260.00)',
          elevated: 'oklch(0.9930 0.0019 260.00)',
        },
        text: 'oklch(0.3100 0.0090 260.00)',
        textMuted: 'oklch(0.5000 0.0180 260.00)',
        border: 'oklch(0.8600 0.0073 260.00)',
        borderStrong: 'oklch(0.7410 0.0153 260.00)',
        action: { primary: 'oklch(0.5546 0.1427 153.03)', primaryHover: 'oklch(0.5219 0.1313 154.11)' },
        status: {
          success: 'oklch(0.5546 0.1427 153.03)',
          warning: 'oklch(0.5546 0.15 75)',
          error: 'oklch(0.55 0.2 25)',
          info: 'oklch(0.5 0.15 250)',
        },
        onPrimary: 'oklch(1 0 0)',
        onSuccess: 'oklch(1 0 0)',
        onWarning: 'oklch(1 0 0)',
        onError: 'oklch(1 0 0)',
        onInfo: 'oklch(1 0 0)',
        focusRing: 'oklch(0.695 0.12 155)',
        link: 'oklch(0.4849 0.1235 153.49)',
        linkHover: 'oklch(0.3100 0.0642 155.00)',
      },
      font: { sans: 'system-ui, sans-serif' },
      text: {
        xs: { size: '0.75rem' },
        sm: { size: '0.875rem' },
        base: { size: '1rem' },
        lg: { size: '1.125rem' },
      },
      radius: { sm: '0.25rem', md: '0.5rem' },
      shadow: {
        sm: '0 1px 3px rgb(0 0 0 / 0.08)',
        md: '0 4px 12px rgb(0 0 0 / 0.10)',
        lg: '0 8px 24px rgb(0 0 0 / 0.12)',
      },
    },
    themes: {
      dark: {
        color: {
          bg: {
            page: 'oklch(0.1870 0.0008 260.00)',
            subtle: 'oklch(0.2120 0.0011 260.00)',
            elevated: 'oklch(0.1870 0.0008 260.00)',
          },
          text: 'oklch(0.9227 0.0060 260.00)',
          textMuted: 'oklch(0.7810 0.0180 260.00)',
          border: 'oklch(0.3860 0.0076 260.00)',
          borderStrong: 'oklch(0.5320 0.0187 260.00)',
          action: { primary: 'oklch(0.5546 0.1427 153.03)', primaryHover: 'oklch(0.5910 0.1427 155.00)' },
          status: {
            success: 'oklch(0.5546 0.1427 153.03)',
            warning: 'oklch(0.5546 0.15 75)',
            error: 'oklch(0.55 0.2 25)',
            info: 'oklch(0.5 0.15 250)',
          },
          focusRing: 'oklch(0.670 0.12 155)',
          link: 'oklch(0.838 0.127 155)',
          linkHover: 'oklch(0.9177 0.0428 155.00)',
        },
      },
    },
  })
}

/** Наивовский `mergedCommon = merge({}, builtinCommon, out.common)` — здесь common плоский. */
function merged(builtin: Record<string, unknown>, out: Record<string, unknown>): Record<string, unknown> {
  return { ...builtin, ...(out.common as object) }
}

/** `Theme.self` типизирован под конкретный `CommonThemeVars` — здесь гоняем произвольный merge. */
function callSelf(theme: { self?: (vars: never) => unknown }, vars: Record<string, unknown>): unknown {
  return (theme.self as unknown as (v: Record<string, unknown>) => unknown)(vars)
}

const SELF_COMPONENTS: ReadonlyArray<{ light: object; dark: object }> = [
  { light: buttonLight, dark: buttonDark },
  { light: checkboxLight, dark: checkboxDark },
  { light: radioLight, dark: radioDark },
  { light: dropdownLight, dark: dropdownDark },
  { light: anchorLight, dark: anchorDark },
  { light: alertLight, dark: alertDark },
  { light: inputLight, dark: inputDark },
  { light: tagLight, dark: tagDark },
  { light: tooltipLight, dark: tooltipDark },
  { light: sliderLight, dark: sliderDark },
  { light: switchLight, dark: switchDark },
  { light: badgeLight, dark: badgeDark },
  { light: menuLight, dark: menuDark },
  { light: iconWrapperLight, dark: iconWrapperDark },
  { light: stepsLight, dark: stepsDark },
  { light: calendarLight, dark: calendarDark },
  { light: datePickerLight, dark: datePickerDark },
  { light: floatButtonLight, dark: floatButtonDark },
  { light: tabsLight, dark: tabsDark },
  { light: paginationLight, dark: paginationDark },
  { light: typographyLight, dark: typographyDark },
]

describe('@themeon/naive — toNative(resolveTheme(theme)) через настоящий naive-ui 2.44.1', () => {
  test('T1: каждое цветовое значение common — валидный hex, ни одной var(-строки', () => {
    const resolved = resolveTheme(fixtureTheme())
    const out = toNative(resolved) as unknown as { common: Record<string, unknown> }
    for (const [key, value] of Object.entries(out.common)) {
      if (typeof value !== 'string') continue
      if (!/color$/i.test(key)) continue
      expect(value, `common.${key}`).toMatch(HEX_RE)
      expect(value, `common.${key}`).not.toContain('var(')
    }
  })

  test('T2: self() всех компонентов (light+dark) — ноль throw', () => {
    const resolved = resolveTheme(fixtureTheme())
    const outLight = toNative(resolved) as unknown as { common: Record<string, unknown> }
    const outDark = toNative(resolved, { theme: 'dark' }) as unknown as { common: Record<string, unknown> }
    for (const { light, dark } of SELF_COMPONENTS) {
      expect(() => callSelf(light, merged(commonLight, outLight))).not.toThrow()
      expect(() => callSelf(dark, merged(commonDark, outDark))).not.toThrow()
    }
  })

  test('T3: changeColor(out.common.primaryColor, {alpha:.5}) — не бросает (прямой контракт seemly)', () => {
    const out = toNative(resolveTheme(fixtureTheme())) as unknown as { common: { primaryColor: string } }
    expect(() => changeColor(out.common.primaryColor, { alpha: 0.5 })).not.toThrow()
  })

  test('T4: непарсибельная роль → ThemeonError(BAD_COLOR) с именем var; onInvalidColor:"skip" — не бросает, ключ отсутствует', () => {
    const theme = defineTheme({
      base: { color: { action: { primary: 'oklch(0.5 0.15 155)' }, bg: { page: 'color-mix(in oklch, red, blue)' } } },
    })
    const resolved = resolveTheme(theme)
    let thrown: unknown
    try {
      toNative(resolved)
    } catch (e) {
      thrown = e
    }
    expect((thrown as { code?: string } | undefined)?.code).toBe('BAD_COLOR')
    expect((thrown as Error).message).toContain('--color-bg-page')

    const skipped = toNative(resolved, { onInvalidColor: 'skip' }) as unknown as { common: Record<string, unknown> }
    expect(skipped.common.bodyColor).toBeUndefined()
    expect(skipped.common.primaryColor).toMatch(HEX_RE)
  })

  test('T5: Blocker #3 — Button.textColorPrimary (наш INK-оверрайд) красится --color-on-primary, APCA ≥ 60 против colorPrimary (было 32.7)', () => {
    const resolved = resolveTheme(fixtureTheme())
    const outDark = toNative(resolved, { theme: 'dark' }) as unknown as {
      common: Record<string, unknown>
      Button?: Record<string, string>
    }
    // `Button.textColorPrimary` — оверрайд из INK-таблицы (§2.5), НЕ поле, вычисляемое
    // self() (self() читает его из общего `common`, а не из per-component overrides —
    // те применяются Naive'ом ПОСЛЕ self(), на стадии use-theme.mjs `mergedSelf`).
    const ink = outDark.Button?.textColorPrimary
    expect(ink).toMatch(HEX_RE)
    const self = callSelf(buttonDark, merged(commonDark, outDark)) as { colorPrimary: string }
    expect(Math.abs(contrastAPCA(ink!, self.colorPrimary))).toBeGreaterThanOrEqual(60)
  })

  test('T6: common.baseColor не мапится — канва/composite-подложка Naive целы', () => {
    const resolved = resolveTheme(fixtureTheme())
    const outLight = toNative(resolved) as unknown as { common: Record<string, string> }
    expect(outLight.common.baseColor).toBeUndefined()

    const mergedLight = merged(commonLight, outLight)
    const checkboxSelf = callSelf(checkboxLight, mergedLight) as { color: string }
    expect(checkboxSelf.color).toBe('#FFF')

    // baseColor цел ⇒ composite()-подложка Alert.colorInfo не сдвинулась (infoColor у нас
    // задан явно — сравниваем со stock-прогоном на ТОМ ЖЕ infoColor, а не на стоковом, иначе
    // тест ловил бы разницу нашей заливки, а не регресс baseColor).
    const alertOurs = callSelf(alertLight, mergedLight) as { colorInfo: string }
    const alertStockSameInfo = callSelf(alertLight, { ...commonLight, infoColor: outLight.common.infoColor }) as {
      colorInfo: string
    }
    expect(alertOurs.colorInfo).toBe(alertStockSameInfo.colorInfo)
  })

  test('T7: каждая эмитированная (ink, fill) пара — |APCA| ≥ 60, обе темы', () => {
    const resolved = resolveTheme(fixtureTheme())
    for (const [theme, common, button, checkbox, appearance] of [
      [undefined, commonLight, buttonLight, checkboxLight, 'light'],
      ['dark', commonDark, buttonDark, checkboxDark, 'dark'],
    ] as const) {
      const out = toNative(resolved, { theme }) as unknown as {
        common: Record<string, string>
        Button?: Record<string, string>
        Checkbox?: Record<string, string>
      }
      const m = merged(common, out)
      const btn = callSelf(button, m) as Record<string, string>
      for (const suffix of ['Primary', 'Success', 'Error', 'Info'] as const) {
        const ink = out.Button?.[`textColor${suffix}`]
        if (ink === undefined) continue
        expect(Math.abs(contrastAPCA(ink, btn[`color${suffix}`]!)), `Button ${suffix} ${appearance}`).toBeGreaterThanOrEqual(60)
      }
      if (out.Checkbox?.checkMarkColor !== undefined) {
        const chk = callSelf(checkbox, m) as Record<string, string>
        expect(Math.abs(contrastAPCA(out.Checkbox.checkMarkColor, chk.colorChecked!)), `Checkbox ${appearance}`).toBeGreaterThanOrEqual(60)
      }
    }
  })

  test('T11: dark — меню/канва: ACCENT-INK Menu.itemTextColorActive на bodyColor ≥ 60 (было 30.8, §4.1)', () => {
    const resolved = resolveTheme(fixtureTheme())
    const outDark = toNative(resolved, { theme: 'dark' }) as unknown as {
      common: Record<string, string>
      Menu?: Record<string, string>
    }
    const ink = outDark.Menu?.itemTextColorActive
    expect(ink).toMatch(HEX_RE)
    expect(Math.abs(contrastAPCA(ink!, outDark.common.bodyColor!))).toBeGreaterThanOrEqual(60)
  })

  test('T12: паритет каналов — выход toNative не зависит от refLayer (корень Blocker #2)', () => {
    const theme = fixtureTheme()
    const referenced = toNative(resolveTheme(theme, { refLayer: 'referenced' }))
    const all = toNative(resolveTheme(theme, { refLayer: 'all' }))
    const inline = toNative(resolveTheme(theme, { refLayer: 'inline' }))
    expect(referenced).toEqual(inline)
    expect(all).toEqual(inline)

    const referencedDark = toNative(resolveTheme(theme, { refLayer: 'referenced' }), { theme: 'dark' })
    const inlineDark = toNative(resolveTheme(theme, { refLayer: 'inline' }), { theme: 'dark' })
    expect(referencedDark).toEqual(inlineDark)
  })
})
