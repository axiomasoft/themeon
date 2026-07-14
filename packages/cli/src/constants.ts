/**
 * Единое дефолтное место темы (P8.13, `findings/P8-nuxt-vue-runtime.md` §2): НЕ rootDir —
 * тема в корне проекта лишает Nuxt-модуль granular CSS-HMR (dev-watcher вынужден
 * подписаться на файл темы целиком → полный рестарт, а `tokensDir` не может быть корнем).
 * Один канал для `init` (куда скаффолдит), `build`/`check` (где по умолчанию ищут) —
 * иначе `themeon init && themeon build && themeon check` без `--config` расходится.
 */
export const DEFAULT_THEME_CONFIG_PATH = 'theme/theme.config.ts'
