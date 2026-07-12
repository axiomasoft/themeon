import Color from 'colorjs.io'

/**
 * Эмпирические дельты OKLCH-lightness для derived interaction-состояний (P-D29): согласованы
 * с типичным seemly-поведением Naive (hover/suppl светлее solid-акцента, pressed темнее); при
 * необходимости — тюнинг per-адаптер, не претендуют на универсальную формулу.
 */
const HOVER_DELTA = 0.06
const SUPPL_DELTA = 0.1
const PRESSED_DELTA = -0.06

function clampLightness(l: number): number {
  return Math.min(1, Math.max(0, l))
}

/**
 * Парсит любой CSS-цвет (hex/rgb/oklch/hsl/…) через colorjs.io и возвращает hex (или hex8 при
 * альфе < 1) — единственный формат, в котором цвета попадают в Naive `common` (инвариант 3,
 * P-D29: не полагаемся на seemly-поддержку oklch). Непарсибельное значение возвращается как
 * есть — адаптер не логирует (нет consola-зависимости), невалидный цвет ловит `themeon check`
 * (P4.5), не рантайм адаптера.
 */
export function toHex(value: string): string {
  try {
    // collapse:false — запрещает colorjs.io схлопывать до 3/4-значного shorthand-hex
    // (`#35f`), Naive/consumers ожидают полноразрядный `#rrggbb[aa]`.
    return new Color(value).toString({ format: 'hex', collapse: false })
  } catch {
    return value
  }
}

/**
 * Деривит hover/pressed/suppl из одной базовой hex-точки по OKLCH-lightness (colorjs.io),
 * gamut-safe (`toGamut({space:'srgb'})` перед сериализацией в hex).
 */
export function deriveInteractionStates(baseHex: string): {
  hover: string
  pressed: string
  suppl: string
} {
  const base = new Color(baseHex).to('oklch')
  const shift = (delta: number): string => {
    const shifted = base.clone()
    shifted.oklch.l = clampLightness((shifted.oklch.l as number) + delta)
    return shifted.toGamut({ space: 'srgb' }).toString({ format: 'hex', collapse: false })
  }
  return {
    hover: shift(HOVER_DELTA),
    pressed: shift(PRESSED_DELTA),
    suppl: shift(SUPPL_DELTA),
  }
}
