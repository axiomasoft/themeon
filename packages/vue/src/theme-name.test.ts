import { describe, expect, it } from 'vitest'
import { normalizeThemeName } from './theme-name'

describe('normalizeThemeName', () => {
  it.each(['', '   ', undefined, null, 42, {}])(
    '%p → undefined (пустая/пробельная строка или не-строка — не тема)',
    (value) => {
      expect(normalizeThemeName(value)).toBeUndefined()
    },
  )

  it("'dark' → 'dark' (валидное имя возвращается как есть)", () => {
    expect(normalizeThemeName('dark')).toBe('dark')
  })

  it("' dark' → ' dark' (не переписываем — только классифицируем)", () => {
    expect(normalizeThemeName(' dark')).toBe(' dark')
  })
})
