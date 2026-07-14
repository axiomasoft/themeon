/**
 * Аугментация `ComponentCustomProperties` для `$theme`, который `themeonPlugin` кладёт в
 * `app.config.globalProperties` (P3.2). Без неё `vue-tsc`/`nuxi typecheck` у потребителя падает
 * «Property '$theme' does not exist on type 'ComponentCustomProperties…'» — публично объявленная
 * фича непригодна в любом типизированном проекте.
 *
 * ФАЙЛ ОБЯЗАН БЫТЬ TS-МОДУЛЕМ (`export {}` ниже): аугментация вне модуля не дополняет, а
 * ПЕРЕЗАПИСЫВАЕТ типы `vue` (Vue docs, «Type Augmentation Placement»). Реэкспорт из `src/index.ts`
 * обязателен — иначе `declare module 'vue'` не попадёт в собранный `dist/index.d.ts`
 * (канон Pinia: `src/globalExtensions.ts` + `export * from './globalExtensions'`).
 */
import type { UseThemeReturn } from './types'

declare module 'vue' {
  interface ComponentCustomProperties {
    /** Per-app theme state provided by `themeonPlugin` (`app.use(themeonPlugin)`). */
    $theme: UseThemeReturn
  }
}

export {}
