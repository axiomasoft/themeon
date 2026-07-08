import { expect, test } from 'vitest'
import { THEMEON_CORE_STUB } from './index'

test('stub-экспорт доступен и типизирован как литерал', () => {
  expect(THEMEON_CORE_STUB).toBe(true)
})
