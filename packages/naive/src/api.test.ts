import { expect, test } from 'vitest'
import type { DeriveInput } from './color'
import type { ToNativeOptions } from './types'

/**
 * API-freeze (образец `packages/tailwind/src/api.test.ts`): snapshot публичной поверхности
 * пакета. Любое случайное добавление/удаление рантайм-экспорта делает diff видимым.
 */
test('публичная поверхность заморожена (рантайм-экспорты)', async () => {
  const mod = await import('./index')
  expect(Object.keys(mod).sort()).toMatchInlineSnapshot(`
    [
      "deriveInteractionStates",
      "mergeOverrides",
      "resolveResponsiveOverrides",
      "toHex",
      "toNative",
    ]
  `)
})

/**
 * `ToNativeOptions` — тип-only экспорт, рантайм-снапшот выше его не ловит. Литерал,
 * типизированный полностью заполненным `ToNativeOptions`, ловит удаление/переименование поля
 * на этапе `tsc` (excess/missing-property check); `Object.keys` замораживает набор ключей
 * снапшотом (P8.8, findings/P8-naive-color-canon.md §7 п.5 — appearance/onInvalidColor
 * «фиксируются api.test.ts»).
 */
test('ToNativeOptions — публичные поля заморожены (typecheck ловит переименование/удаление)', () => {
  const opts: Required<ToNativeOptions> = {
    theme: 'dark',
    appearance: 'light',
    onInvalidColor: 'skip',
    overrides: {},
  }
  expect(Object.keys(opts).sort()).toMatchInlineSnapshot(`
    [
      "appearance",
      "onInvalidColor",
      "overrides",
      "theme",
    ]
  `)
})

/**
 * `DeriveInput` — параметр `deriveInteractionStates` (P8.9, findings/P8-naive-color-canon.md
 * §5): та же дисциплина, что `ToNativeOptions` выше — типизированный литерал ловит tsc
 * excess/missing-property, снапшот ключей ловит переименование.
 */
test('DeriveInput — публичные поля заморожены (typecheck ловит переименование/удаление)', () => {
  const input: Required<DeriveInput> = {
    base: '#008a48',
    appearance: 'light',
    hover: '#007a40',
    pressed: '#0c7a43',
    suppl: '#008a48',
  }
  expect(Object.keys(input).sort()).toMatchInlineSnapshot(`
    [
      "appearance",
      "base",
      "hover",
      "pressed",
      "suppl",
    ]
  `)
})
