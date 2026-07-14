import { describe, expect, it } from 'vitest'
import { asThemeName } from './theme-name'

describe('asThemeName', () => {
  it.each(['', '   ', undefined, null, 42, {}])(
    '%p → undefined (пустая/пробельная строка или не-строка — не тема)',
    (value) => {
      expect(asThemeName(value)).toBeUndefined()
    },
  )

  it("'dark' → 'dark' (валидное имя возвращается как есть)", () => {
    expect(asThemeName('dark')).toBe('dark')
  })

  it("' dark' → ' dark' (классифицирует, но НЕ переписывает — иначе второй источник истины)", () => {
    expect(asThemeName(' dark')).toBe(' dark')
  })
})
