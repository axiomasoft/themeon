import type { GlobalThemeOverrides } from 'naive-ui'
import { mergeOverrides } from './merge'
import type { BreakpointOverrides } from './types'

/**
 * Сводит `base` overrides с патчами активных брейкпоинтов, в порядке `activeBreakpoints`
 * (от узкого к широкому — источник списка активных имён внешний, vueuse/JS-экспорт D14, НЕ
 * Naive-медиазапросы). Каждый следующий патч мёржится поверх предыдущего результата, поэтому
 * более широкий (более поздний в массиве) брейкпоинт побеждает при конфликте ключей.
 * Реактивность — забота потребителя (обернуть вызов в `computed()`).
 */
export function resolveResponsiveOverrides(
  base: GlobalThemeOverrides,
  breakpointOverrides: BreakpointOverrides,
  activeBreakpoints: readonly string[],
): GlobalThemeOverrides {
  let result = base
  for (const name of activeBreakpoints) {
    const patch = breakpointOverrides[name]
    if (patch === undefined) continue
    result = mergeOverrides(result, patch)
  }
  return result
}
