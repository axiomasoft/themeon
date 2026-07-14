import {
  addImports,
  addPlugin,
  addTemplate,
  createResolver,
  defineNuxtModule,
  resolvePath,
  updateTemplates,
  useLogger,
} from '@nuxt/kit'
import { resolveTheme, serializeThemeCss } from '@themeon/core'
import { themeInitScript } from '@themeon/vue/anti-fouc'
import { resolve as resolveAbs } from 'node:path'
import {
  buildFoucScriptOptions,
  FOUNDATION_CSS,
  MODULE_DEFAULTS,
  shouldPushCss,
  toPublicRuntimeConfig,
} from './internal/normalize'
import { createThemeLoader } from './internal/theme-loader'
import { isWithinWatchTarget, resolveWatchTarget } from './internal/watch-target'
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

    // ── Codegen пользовательской темы + живой dev-watcher (P8.4) ──
    if (options.theme) {
      // `resolvePath` (не `resolver.resolvePath`!) резолвит от `nuxt.options.rootDir` —
      // `options.theme` это путь пользовательского проекта, не путь внутри этого пакета.
      const themePath = await resolvePath(options.theme)
      const { loadTheme } = createThemeLoader(themePath, options.theme, nuxt.options.alias)

      // Ранняя валидация при setup — ошибка конфигурации всплывает сразу при старте `nuxt dev`,
      // а не отложенно на первой сборке шаблона.
      await loadTheme()

      // Дедуп по СГЕНЕРИРОВАННОМУ CSS (P8.4 канон, findings/P8-nuxt-vue-runtime.md §2) — не по
      // хэшу входной директории: единственный вопрос, на который обязан ответить watcher —
      // «изменился ли CSS», а не «изменилось ли что-то во входе».
      let cachedCss: string | undefined
      const buildCss = async (): Promise<string> => {
        try {
          return serializeThemeCss(resolveTheme(await loadTheme()))
        } catch (err) {
          // Fail loud (Rule 5): циклы/коллизии в пользовательской теме не должны молча
          // деградировать в пустой/старый CSS.
          console.error('[themeon] module: не удалось сериализовать пользовательскую тему:', err)
          throw err
        }
      }

      const template = addTemplate({
        filename: 'themeon-tokens.css',
        write: true,
        getContents: async () => (cachedCss ??= await buildCss()),
      })

      // Сгенерированный CSS занимает МЕСТО статического tokens.css (тот же порядок
      // tokens→index), либо встаёт первым, если фундамент не подключался (`css:false`).
      const tokensIndex = nuxt.options.css.indexOf('@themeon/css/tokens.css')
      if (tokensIndex !== -1) nuxt.options.css[tokensIndex] = template.dst
      else nuxt.options.css.unshift(template.dst)

      if (nuxt.options.dev) {
        const explicitTokensDir = options.tokensDir ? await resolvePath(options.tokensDir) : undefined
        const target = resolveWatchTarget({
          themePath,
          tokensDir: explicitTokensDir,
          rootDir: nuxt.options.rootDir,
          srcDir: nuxt.options.srcDir,
          buildDir: nuxt.options.buildDir,
        })

        nuxt.options.watch.push(target.path)

        if (target.kind === 'directory') {
          // Директория => granular CSS-HMR без рестарта (nuxt.options.watch сравнивает пути
          // строго по строке, поэтому только САМ путь директории даёт этот режим).
          nuxt.hook('builder:watch', async (_event, path) => {
            // Nuxt 4 отдаёт `path` уже абсолютным (R-13 §3.4) — `resolve` относительно `srcDir`
            // (не `rootDir`: канон Nuxt, `index.mjs:7401`) идемпотентен для абс.путей, страхует
            // от гипотетического относительного.
            const abs = resolveAbs(nuxt.options.srcDir, path)
            if (!isWithinWatchTarget(abs, target)) return

            const next = await buildCss()
            if (next === cachedCss) return
            cachedCss = next
            await updateTemplates({ filter: (t) => t.filename === 'themeon-tokens.css' })
          })
        } else {
          // Тема в корне => подписываемся на САМ ФАЙЛ; Nuxt делает полный рестарт dev-сервера
          // (документированная семантика `watch`), setup() исполняется заново, загрузчик читает
          // свежий файл. `builder:watch`-ветка здесь не нужна.
          useLogger('themeon').info(
            '[themeon] тема лежит в корне проекта — правка перезапускает dev-сервер. ' +
              'Для CSS-HMR перенесите тему в свою директорию (например `theme/`) или задайте `themeon.tokensDir`.',
          )
        }
      }
    }
  },
})
