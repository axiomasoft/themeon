import { describe, expect, test } from 'vitest'
import { mkFixture, rmFixture } from '../helpers/fixture'
import { tailwindCompile } from '../helpers/tailwind-compile'

describe('tailwindCompile — хелпер гоняет настоящий Tailwind 4', () => {
  test('на тривиальном кандидате компилирует реальную утилиту', async () => {
    const dir = mkFixture('tw-self', {})
    try {
      const out = await tailwindCompile('@import "tailwindcss";\n', ['bg-red-500'], dir)
      expect(out).toMatch(/\.bg-red-500\s*\{[^}]*background-color:/)
    } finally {
      rmFixture(dir)
    }
  })
})
