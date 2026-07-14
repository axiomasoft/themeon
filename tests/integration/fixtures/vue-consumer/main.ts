// Тянет модуль в граф компиляции — TS применяет `declare module 'vue'` из `@themeon/vue`
// только к файлам, из которых он транзитивно достижим (findings/P8-nuxt-vue-runtime.md §4).
import '@themeon/vue'
