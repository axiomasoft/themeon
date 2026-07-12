import { describe, expect, test } from 'vitest'
import { themeInitScript } from './anti-fouc'

describe('themeInitScript', () => {
  test('дефолтные опции дают детерминированную строку', () => {
    expect(themeInitScript()).toMatchInlineSnapshot(
      `"(function(){try{var e=document.documentElement,s=localStorage.getItem('themeon-theme'),t=s||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');e.setAttribute('data-theme',t)}catch(_){}})()"`,
    )
  })

  test('кастомные опции подставляются в строку', () => {
    const script = themeInitScript({
      storageKey: 'my-theme',
      attribute: 'data-mode',
      darkTheme: 'night',
      lightTheme: 'day',
    })
    expect(script).toContain(`localStorage.getItem('my-theme')`)
    expect(script).toContain(`e.setAttribute('data-mode',t)`)
    expect(script).toContain(`?'night':'day'`)
  })

  test.each([
    ["it's"],
    ['"quoted"'],
    ['back`tick'],
    ['<script>'],
    ['back\\slash'],
    ['line\nbreak'],
  ])('assertSafeScriptToken бросает на опасный токен %s', (unsafe) => {
    expect(() => themeInitScript({ storageKey: unsafe })).toThrow(/must not contain/)
  })

  test('результат — единственный statement без переносов строк (минифицирован)', () => {
    expect(themeInitScript()).not.toMatch(/\n/)
  })
})
