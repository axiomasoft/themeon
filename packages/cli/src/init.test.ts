import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { runInit } from './commands/init'

/**
 * `themeon init` (P4.3): скаффолд стартового `theme.config.ts` на tmp-директории —
 * идемпотентность/force/tailwind-заготовка (Implementation Rules #4/#5/#8, обязательные тесты).
 */
describe('runInit', () => {
  let cwd: string

  beforeEach(() => {
    cwd = mkdtempSync(join(tmpdir(), 'themeon-cli-'))
  })

  afterEach(() => {
    rmSync(cwd, { recursive: true, force: true })
  })

  it('на пустой tmpdir создаёт theme.config.ts и возвращает его в created', () => {
    const result = runInit({ cwd })

    expect(result.created).toContain('theme.config.ts')
    expect(result.skipped).toEqual([])
    expect(statSync(join(cwd, 'theme.config.ts')).isFile()).toBe(true)
  })

  it('повторный вызов без force не перезаписывает файл (skipped, контент не меняется)', () => {
    runInit({ cwd })
    writeFileSync(join(cwd, 'theme.config.ts'), '// пользователь уже отредактировал\n', 'utf8')

    const result = runInit({ cwd })

    expect(result.created).toEqual([])
    expect(result.skipped).toContain('theme.config.ts')
    expect(readFileSync(join(cwd, 'theme.config.ts'), 'utf8')).toBe('// пользователь уже отредактировал\n')
  })

  it('force:true перезаписывает существующий файл', () => {
    runInit({ cwd })
    writeFileSync(join(cwd, 'theme.config.ts'), '// пользователь уже отредактировал\n', 'utf8')

    const result = runInit({ cwd, force: true })

    expect(result.created).toContain('theme.config.ts')
    expect(result.skipped).toEqual([])
    expect(readFileSync(join(cwd, 'theme.config.ts'), 'utf8')).toContain('defineTheme')
  })

  it('tailwind:true добавляет bridge-заготовку tailwind-bridge.css', () => {
    const result = runInit({ cwd, tailwind: true })

    expect(result.created).toEqual(expect.arrayContaining(['theme.config.ts', 'tailwind-bridge.css']))
    expect(statSync(join(cwd, 'tailwind-bridge.css')).isFile()).toBe(true)
    expect(readFileSync(join(cwd, 'tailwind-bridge.css'), 'utf8')).toContain('@theme inline')
  })

  it('содержимое theme.config.ts включает defineTheme', () => {
    runInit({ cwd })

    const content = readFileSync(join(cwd, 'theme.config.ts'), 'utf8')
    expect(content).toContain("import { defineTheme } from '@themeon/core'")
    expect(content).toContain('export default defineTheme(')
  })
})
