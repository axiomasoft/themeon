import { expect, test } from 'vitest'
import type { ThemeInitScriptOptions } from './anti-fouc'
import type { UseThemeOptions, UseThemeReturn } from './types'

/**
 * API-freeze (P3.2, образец `packages/core/src/api.test.ts`): snapshot публичной поверхности.
 *
 * P3.8 — freeze усилен по итогам ревью P3.7. Прежняя версия снапшотила ТОЛЬКО `Object.keys()`
 * рантайм-экспортов корневого entry, поэтому новая публичная опция `ThemeInitScriptOptions.themes`
 * (подпуть `./anti-fouc`, ФОРМА типа) выросла молча и была поймана только глазами ревьюера.
 * Теперь заморожены три вещи: рантайм-экспорты `.`, рантайм-экспорты `./anti-fouc` и ФОРМА
 * публичных типов — последняя краснеет на `pnpm typecheck`, а не ждёт человека.
 */
test('публичная поверхность заморожена (рантайм-экспорты `.`)', async () => {
  const mod = await import('./index')
  expect(Object.keys(mod).sort()).toMatchInlineSnapshot(`
    [
      "SYSTEM_PREFERENCE",
      "THEME_INJECTION_KEY",
      "themeonPlugin",
      "useTheme",
    ]
  `)
})

test('публичная поверхность заморожена (рантайм-экспорты подпути `./anti-fouc`)', async () => {
  const mod = await import('./anti-fouc')
  expect(Object.keys(mod).sort()).toMatchInlineSnapshot(`
    [
      "themeInitScript",
    ]
  `)
})

/**
 * Компайл-тайм freeze ФОРМЫ публичных типов: `Exact<T, Keys>` резолвится в `true`, только если
 * набор ключей `T` совпадает с `Keys` ТОЧНО — добавили поле в публичный интерфейс и не обновили
 * список здесь → `pnpm typecheck` красный. Это и есть предохранитель, которого не хватало.
 */
type Exact<T, Keys extends string> = [Exclude<keyof T, Keys>] extends [never]
  ? [Exclude<Keys, keyof T>] extends [never]
    ? true
    : false
  : false

const useThemeOptionsFrozen: Exact<
  UseThemeOptions,
  'themes' | 'default' | 'storageKey' | 'attribute' | 'system' | 'disableTransition' | 'runtimeVars' | 'target' | 'storage' | 'media'
> = true

const useThemeReturnFrozen: Exact<
  UseThemeReturn,
  'preference' | 'theme' | 'system' | 'isDark' | 'set' | 'toggle' | 'init'
> = true

const themeInitScriptOptionsFrozen: Exact<
  ThemeInitScriptOptions,
  'storageKey' | 'attribute' | 'darkTheme' | 'lightTheme' | 'default' | 'themes'
> = true

test('форма публичных типов заморожена (проверяется компилятором)', () => {
  expect([useThemeOptionsFrozen, useThemeReturnFrozen, themeInitScriptOptionsFrozen]).toEqual([true, true, true])
})
