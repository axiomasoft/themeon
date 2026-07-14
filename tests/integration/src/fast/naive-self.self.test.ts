/** @vitest-environment jsdom */
import { afterEach, describe, expect, test } from 'vitest'
import { naiveSelf } from '../helpers/naive-self'

describe('naiveSelf — хелпер монтирует настоящий naive-ui', () => {
  let unmount: (() => void) | undefined

  afterEach(() => {
    unmount?.()
    unmount = undefined
  })

  test('на тривиальном overrides реально рендерит кнопку с инлайновым naive-стилем', () => {
    const result = naiveSelf({ common: { primaryColor: '#ff0000' } })
    unmount = result.unmount

    const button = result.host.querySelector('.n-button')
    expect(button).not.toBeNull()
    expect(button!.getAttribute('style')).toMatch(/--n-/)
  })
})
