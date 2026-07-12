#!/usr/bin/env node
/**
 * bin-точка входа `themeon`. Никакой логики здесь — только сборка `main` (агрегатор
 * подкоманд, lazy-import) и запуск через citty `runMain` (Rule 3).
 */
import { defineCommand, runMain } from 'citty'

const main = defineCommand({
  meta: { name: 'themeon', description: 'ThemeOn design-token CLI' },
  subCommands: {
    init: () => import('./commands/init').then((m) => m.initCommand),
    build: () => import('./commands/build').then((m) => m.buildCommand),
    check: () => import('./commands/check').then((m) => m.checkCommand),
  },
})

runMain(main)
