import { addImports, addPlugin, createResolver, defineNuxtModule } from '@nuxt/kit'
import { FOUNDATION_CSS, MODULE_DEFAULTS, shouldPushCss, toPublicRuntimeConfig } from './internal/normalize'
import type { ModuleOptions } from './types'

export type { ModuleOptions } from './types'

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: '@themeon/nuxt',
    configKey: 'themeon',
    compatibility: { nuxt: '>=4.0.0' },
  },
  defaults: {
    ...MODULE_DEFAULTS,
    default: undefined,
  },
  setup(options, nuxt) {
    const resolver = createResolver(import.meta.url)

    // Фундамент пакета первым — объявляет sys-переменные до всего остального CSS
    // (порядок как в playground P2.7); явный сплайс в начало сохраняет относительный
    // порядок tokens.css → index.css независимо от того, что уже есть в nuxt.options.css.
    if (shouldPushCss(options)) {
      nuxt.options.css.unshift(...FOUNDATION_CSS)
    }

    // Публичный runtime-конфиг — единственный канал, которым опции модуля доезжают
    // до клиентского рантайм-плагина (build-time setup не имеет доступа к DOM/localStorage).
    nuxt.options.runtimeConfig.public.themeon = toPublicRuntimeConfig(options)

    addImports({ name: 'useTheme', from: '@themeon/vue' })

    addPlugin({ src: resolver.resolve('./runtime/plugin'), mode: 'all' })

    // Анти-FOUC head-скрипт, codegen пользовательской темы, dev-watcher по хэшу
    // директории (D13) — P3.4, ещё не реализованы в этом item'е.
  },
})
