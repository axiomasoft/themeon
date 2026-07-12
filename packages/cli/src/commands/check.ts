/**
 * `themeon check` — заглушка (P4.3). Реализация — P4.5 (три линтера: token-coverage /
 * APCA-contrast / hardcode). Регистрируется в `subCommands` уже сейчас, чтобы `themeon --help`
 * показывал все три команды.
 */
import { defineCommand } from 'citty'
import { consola } from 'consola'

export const checkCommand = defineCommand({
  meta: {
    name: 'check',
    description: 'Lint token coverage, APCA contrast and hardcoded values (implemented in P4.5)',
  },
  run() {
    consola.warn('themeon check: implemented in P4.5')
    process.exitCode = 0
  },
})
