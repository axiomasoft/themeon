/**
 * `themeon build` — заглушка (P4.3). Реализация — P4.4 (jiti-загрузка `theme.config.ts` →
 * `resolveTheme`/`serializeThemeCss` ядра → `tokens.css`). Регистрируется в `subCommands`
 * уже сейчас, чтобы `themeon --help` показывал все три команды.
 */
import { defineCommand } from 'citty'
import { consola } from 'consola'

export const buildCommand = defineCommand({
  meta: {
    name: 'build',
    description: 'Compile theme.config.ts to tokens.css (implemented in P4.4)',
  },
  run() {
    consola.warn('themeon build: implemented in P4.4')
    process.exitCode = 0
  },
})
