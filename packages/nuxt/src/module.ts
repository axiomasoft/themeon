import {
  addImports,
  addPlugin,
  addTemplate,
  createResolver,
  defineNuxtModule,
  importModule,
  resolvePath,
  updateTemplates,
} from '@nuxt/kit'
import { resolveTheme, serializeThemeCss, type ThemeDefinition } from '@themeon/core'
import { themeInitScript } from '@themeon/vue/anti-fouc'
import { dirname, resolve as resolveAbs } from 'node:path'
import { hashDir } from './internal/hash-dir'
import {
  buildFoucScriptOptions,
  FOUNDATION_CSS,
  MODULE_DEFAULTS,
  shouldPushCss,
  toPublicRuntimeConfig,
} from './internal/normalize'
import type { ModuleOptions } from './types'

export type { ModuleOptions } from './types'

/** Контракт файла пользовательской темы (`options.theme`, codegen P3.4). */
interface ThemeModuleExports {
  default?: ThemeDefinition
  theme?: ThemeDefinition
  defaultTheme?: ThemeDefinition
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: '@themeon/nuxt',
    configKey: 'themeon',
    compatibility: { nuxt: '>=4.0.0' },
  },
  defaults: {
    ...MODULE_DEFAULTS,
    default: undefined,
    // `themes` из defaults исключён намеренно: defu (getOptions) конкатенирует массивы,
    // а не заменяет их, поэтому наличие themes здесь дублирует пользовательский массив
    // (['light','dark'] + ['light','dark'] = 4 элемента). Фолбэк на MODULE_DEFAULTS.themes
    // при отсутствии пользовательской опции уже даёт toPublicRuntimeConfig.
    themes: undefined,
  },
  async setup(options, nuxt) {
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

    // ── Анти-FOUC head-скрипт (D6, P-D24, P-D50) ──
    // ОДИН генератор `themeInitScript`, переиспользован из `@themeon/vue/anti-fouc` (pure, без vue
    // в графе) — на обоих маршрутах.
    //
    // МАРШРУТ B (SSR, дефолт с P3.8): серверный плагин генерит скрипт на КАЖДЫЙ запрос из
    // `runtimeConfig` → `NUXT_PUBLIC_THEMEON_*`-override доезжает и до pre-paint скрипта, а не
    // только до рантайма (иначе каналы расходятся и страница перекрашивается после гидрации).
    //
    // МАРШРУТ A (SPA, `ssr: false`): сервера нет — скрипт обязан быть запечён в статический
    // `index.html`. Там и `runtimeConfig` запекается на сборке, поэтому env-override невозможен
    // в принципе и запекание скрипта ничего не теряет.
    if (options.fouc !== false) {
      if (nuxt.options.ssr === false) {
        nuxt.options.app.head ||= {}
        nuxt.options.app.head.script ||= []
        nuxt.options.app.head.script.push({
          key: 'themeon-fouc',
          innerHTML: themeInitScript(buildFoucScriptOptions(options)),
          tagPosition: 'head',
          tagPriority: 'critical',
        })
      } else {
        addPlugin({ src: resolver.resolve('./runtime/fouc.server'), mode: 'server' })
      }
    }

    // ── Codegen пользовательской темы + dev-watcher по хэшу директории (D13) ──
    if (options.theme) {
      // `resolvePath` (не `resolver.resolvePath`!) резолвит от `nuxt.options.rootDir` —
      // `options.theme` это путь пользовательского проекта, не путь внутри этого пакета.
      const themePath = await resolvePath(options.theme)

      // Перечитывает файл темы с диска при каждом вызове (fresh `importModule` → fresh jiti
      // instance, без переиспользования закэшированного модуля) — иначе `getContents`
      // сериализовал бы объект темы, захваченный один раз на `setup`, и dev-watcher (D13)
      // перезаписывал бы tokens.css БАЙТ-В-БАЙТ тем же контентом при каждом сохранении
      // файла темы (P3.4 code-review HIGH: token HMR мёртв).
      const loadTheme = async (): Promise<ThemeDefinition> => {
        const themeModule = await importModule<ThemeModuleExports>(themePath)
        const loaded = themeModule.default ?? themeModule.theme ?? themeModule.defaultTheme
        if (!loaded) {
          throw new Error(
            `[themeon] module: файл темы "${options.theme}" должен экспортировать тему ` +
              `(default export либо именованный "theme"/"defaultTheme")`,
          )
        }
        return loaded
      }

      // Ранняя валидация при setup — ошибка конфигурации всплывает сразу при старте `nuxt dev`,
      // а не отложенно на первой сборке шаблона.
      await loadTheme()

      const template = addTemplate({
        filename: 'themeon-tokens.css',
        write: true,
        getContents: async () => {
          try {
            return serializeThemeCss(resolveTheme(await loadTheme()))
          } catch (err) {
            // Fail loud (Rule 5): циклы/коллизии в пользовательской теме не должны молча
            // деградировать в пустой/старый CSS.
            console.error('[themeon] module: не удалось сериализовать пользовательскую тему:', err)
            throw err
          }
        },
      })

      // Сгенерированный CSS занимает МЕСТО статического tokens.css (тот же порядок
      // tokens→index), либо встаёт первым, если фундамент не подключался (`css:false`).
      const tokensIndex = nuxt.options.css.indexOf('@themeon/css/tokens.css')
      if (tokensIndex !== -1) nuxt.options.css[tokensIndex] = template.dst
      else nuxt.options.css.unshift(template.dst)

      if (nuxt.options.dev) {
        const tokensDir = options.tokensDir ? await resolvePath(options.tokensDir) : dirname(themePath)

        // Регистрация watch вне srcDir — Nuxt 4 поддерживает абсолютные пути в `watch`.
        nuxt.options.watch.push(tokensDir)

        let lastHash = hashDir(tokensDir)
        nuxt.hook('builder:watch', async (_event, path) => {
          // Nuxt 4 отдаёт `path` уже абсолютным (R-13 §3.4) — `resolve` относительно
          // `rootDir` идемпотентен для абс.путей, страхует от гипотетического относительного.
          const abs = resolveAbs(nuxt.options.rootDir, path)
          if (!abs.startsWith(tokensDir)) return

          // Хэш ДИРЕКТОРИИ, не хардкод-список файлов (D13-фикс донор-бага vintera
          // `SOURCE_REL` — список указывал на несуществующий путь, HMR был мёртв).
          const nextHash = hashDir(tokensDir)
          if (nextHash === lastHash) return
          lastHash = nextHash

          await updateTemplates({ filter: (t) => t.filename === 'themeon-tokens.css' })
        })
      }
    }
  },
})
