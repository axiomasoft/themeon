import { describe, expect, test } from 'vitest'
import { themeInitScript } from './anti-fouc'

describe('themeInitScript', () => {
  test('дефолтные опции дают детерминированную строку', () => {
    expect(themeInitScript()).toMatchInlineSnapshot(
      `"(function(){try{var e=document.documentElement,s=(localStorage.getItem('themeon-theme')||'').trim(),t=s?s:(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');e.setAttribute('data-theme',t)}catch(_){}})()"`,
    )
  })

  test('themes задан → скрипт принимает персист только из набора (как storedIsKnown в init())', () => {
    const script = themeInitScript({ themes: ['light', 'dark'] })
    expect(script).toContain(`['light','dark'].indexOf(s)!==-1?s:`)
    expect(script).toContain('matchMedia')
  })

  test('themes НЕ задан → открытый набор, доверяем персисту любое непустое имя (как init())', () => {
    expect(themeInitScript()).toContain(`t=s?s:`)
  })

  test('пробельный персист не считается темой — trim на чтении (как normalizeThemeName)', () => {
    expect(themeInitScript()).toContain(`s=(localStorage.getItem('themeon-theme')||'').trim()`)
  })

  test('имена тем проходят injection-guard', () => {
    expect(() => themeInitScript({ themes: ["it's"] })).toThrow(/must not contain/)
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

  test('default перебивает системную ветку — согласовано с init() (P3-P3.2-MED)', () => {
    const script = themeInitScript({ default: 'light' })
    expect(script).not.toContain('matchMedia')
    expect(script).toContain(`t=s?s:'light'`)
    expect(script).toContain(`e.setAttribute('data-theme',t)`)
  })

  test("default:'' даёт ту же matchMedia-ветку, что и незаданный default (P3.7)", () => {
    expect(themeInitScript({ default: '' })).toBe(themeInitScript({}))
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

/**
 * Поведенческие тесты: сгенерированный IIFE РЕАЛЬНО исполняется с фейковыми глобалами
 * (строковый ассерт не доказывает, что скрипт делает то, что задумано). Правила резолва
 * обязаны совпадать с `init()` (`state.ts`) — расхождение = вспышка темы после гидрации.
 */
describe('themeInitScript — исполнение сгенерированного скрипта', () => {
  /** Выполняет скрипт с подставными `document`/`localStorage`/`matchMedia`, возвращает выставленный атрибут. */
  function run(
    script: string,
    { stored, systemDark = false }: { stored?: string | null; systemDark?: boolean },
  ): string | undefined {
    const attrs: Record<string, string> = {}
    const document = { documentElement: { setAttribute: (n: string, v: string) => void (attrs[n] = v) } }
    const localStorage = { getItem: () => stored ?? null }
    const matchMedia = (): { matches: boolean } => ({ matches: systemDark })
    new Function('document', 'localStorage', 'matchMedia', script)(document, localStorage, matchMedia)
    return attrs['data-theme']
  }

  test('нет персиста + системная dark → dark (системный фолбэк жив)', () => {
    expect(run(themeInitScript({ themes: ['light', 'dark'] }), { stored: null, systemDark: true })).toBe('dark')
  })

  test('валидный персист выигрывает у системы', () => {
    expect(run(themeInitScript({ themes: ['light', 'dark'] }), { stored: 'light', systemDark: true })).toBe('light')
  })

  test('протухший персист (темы больше нет в themes) → системный фолбэк, а не мёртвое имя', () => {
    // до фикса скрипт красил `data-theme="sepia"`, а init() уходил в системную тему → вспышка
    expect(run(themeInitScript({ themes: ['light', 'dark'] }), { stored: 'sepia', systemDark: true })).toBe('dark')
  })

  test('отравленный персист "" / "   " → фолбэк, а не пустой атрибут (P3.7, симметрично init())', () => {
    const script = themeInitScript({ themes: ['light', 'dark'] })
    expect(run(script, { stored: '', systemDark: true })).toBe('dark')
    expect(run(script, { stored: '   ', systemDark: true })).toBe('dark')
  })

  test('открытый набор (themes не задан) → любое непустое имя персиста принимается', () => {
    expect(run(themeInitScript(), { stored: 'tenant-42', systemDark: true })).toBe('tenant-42')
  })

  test('default перебивает систему, когда персиста нет', () => {
    expect(run(themeInitScript({ default: 'light' }), { stored: null, systemDark: true })).toBe('light')
  })
})
