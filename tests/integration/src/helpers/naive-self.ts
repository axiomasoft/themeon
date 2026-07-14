import { createApp, h } from 'vue'
import { NButton, NConfigProvider } from 'naive-ui'

export interface NaiveSelfResult {
  host: HTMLElement
  unmount: () => void
}

/**
 * Тонкий хелпер: монтирует реальный `NConfigProvider`+`NButton` (настоящий naive-ui+Vue) с
 * переданными `themeOverrides` в jsdom. Вызывающий тест сам решает, что передать (сырые
 * значения или выход `toNative()`) и что ассертить.
 */
export function naiveSelf(overrides: object): NaiveSelfResult {
  const host = document.createElement('div')
  document.body.appendChild(host)

  const app = createApp(() =>
    h(NConfigProvider, { themeOverrides: overrides }, () => h(NButton, { type: 'primary' }, () => 'x')),
  )
  app.mount(host)

  return {
    host,
    unmount: () => {
      app.unmount()
      host.remove()
    },
  }
}
