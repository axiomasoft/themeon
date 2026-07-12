/**
 * Минимальные структурные типы DTCG-документа (P1.7).
 *
 * Это НЕ публичная поверхность пакета (P1.8 их не реэкспортирует) — только внутренний
 * контракт мостов `to-dtcg`/`from-dtcg` и микро-парсера цвета. Форма — по DTCG Format
 * Module 2025.10 (https://www.designtokens.org/TR/2025.10/format/), скоуп v1 — P-D15.
 */

/**
 * Структурная форма цвета DTCG 2025.10 (Color module).
 * `colorSpace` — идентификатор CSS Color 4 (`srgb`, `oklch`, `display-p3`, …);
 * `components` — числа, длина/диапазоны зависят от colorSpace (srgb: 3 × [0,1]);
 * `alpha` — опционален (деф. 1); `hex` — опциональный 6-значный fallback без альфы.
 */
export interface DTCGColorValue {
  colorSpace: string
  components: number[]
  alpha?: number
  hex?: string
}

/** Структурная форма размерности/длительности: `{ value, unit }` (спека 2025.10 — MUST). */
export interface DTCGDimensionValue {
  value: number
  unit: string
}

/** Узел-токен DTCG: `$value` + опциональные метаданные. */
export interface DTCGToken {
  $type?: string
  $value: unknown
  $description?: string
  $extensions?: Record<string, unknown>
}

/** DTCG-документ: дерево групп/токенов/`$`-полей. */
export type DTCGDocument = Record<string, unknown>
