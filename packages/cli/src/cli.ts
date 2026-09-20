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
    schema: () => import('./commands/schema').then((m) => m.schemaCommand),
    inspect: () => import('./commands/inspect').then((m) => m.inspectCommand),
    explain: () => import('./commands/explain').then((m) => m.explainCommand),
    graph: () => import('./commands/graph').then((m) => m.graphCommand),
    diff: () => import('./commands/diff').then((m) => m.diffCommand),
    doctor: () => import('./commands/doctor').then((m) => m.doctorCommand),
    migrate: () => import('./commands/migrate').then((m) => m.migrateCommand),
  },
})

runMain(main)
