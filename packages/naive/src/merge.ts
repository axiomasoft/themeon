import type { GlobalThemeOverrides } from 'naive-ui'

/** Заблокированные ключи — guard против прототип-загрязнения (урок HIGH final-audit `assignByPath`). */
const BLOCKED = new Set(['__proto__', 'constructor', 'prototype'])

function isPlain(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/**
 * Рекурсивный deep-merge слоёв `GlobalThemeOverrides` (P-D30): вложенные объекты (`peers`,
 * per-component-ключи) мёржатся рекурсивно, массивы и примитивы — правый слой побеждает целиком.
 * Не мутирует входы, `undefined`-слои пропускаются. `Object.assign`/spread не годятся — они
 * затирают `peers`/вложенные per-component объекты целиком вместо мёржа (R-14 §1.4).
 */
export function mergeOverrides(
  ...layers: (GlobalThemeOverrides | undefined)[]
): GlobalThemeOverrides {
  const out: Record<string, unknown> = {}
  for (const layer of layers) {
    if (!isPlain(layer)) continue
    for (const [k, v] of Object.entries(layer)) {
      if (BLOCKED.has(k) || v === undefined) continue
      out[k] = isPlain(v) && isPlain(out[k]) ? mergeOverrides(out[k] as GlobalThemeOverrides, v as GlobalThemeOverrides) : v
    }
  }
  return out as GlobalThemeOverrides
}
