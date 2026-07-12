import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { hashDir } from './hash-dir'

let dir: string

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'themeon-hash-dir-'))
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe('hashDir', () => {
  it('детерминирован — два вызова на одном содержимом дают одинаковый хэш', () => {
    writeFileSync(join(dir, 'a.css'), ':root{--x:1}')
    expect(hashDir(dir)).toBe(hashDir(dir))
  })

  it('изменение содержимого файла меняет хэш', () => {
    writeFileSync(join(dir, 'a.css'), ':root{--x:1}')
    const before = hashDir(dir)
    writeFileSync(join(dir, 'a.css'), ':root{--x:2}')
    expect(hashDir(dir)).not.toBe(before)
  })

  it('добавление файла меняет хэш', () => {
    writeFileSync(join(dir, 'a.css'), ':root{--x:1}')
    const before = hashDir(dir)
    writeFileSync(join(dir, 'b.css'), ':root{--y:2}')
    expect(hashDir(dir)).not.toBe(before)
  })

  it('несуществующая директория не бросает и возвращает стабильное значение', () => {
    const missing = join(dir, 'does-not-exist')
    expect(() => hashDir(missing)).not.toThrow()
    expect(hashDir(missing)).toBe(hashDir(missing))
  })

  it('порядок обхода (вложенные директории) не влияет на результат', () => {
    mkdirSync(join(dir, 'nested'))
    writeFileSync(join(dir, 'a.css'), ':root{--x:1}')
    writeFileSync(join(dir, 'nested', 'b.css'), ':root{--y:2}')
    const first = hashDir(dir)

    const dir2 = mkdtempSync(join(tmpdir(), 'themeon-hash-dir-'))
    // Записаны в обратном порядке — результат должен совпасть (сортировка внутри hashDir).
    mkdirSync(join(dir2, 'nested'))
    writeFileSync(join(dir2, 'nested', 'b.css'), ':root{--y:2}')
    writeFileSync(join(dir2, 'a.css'), ':root{--x:1}')
    const second = hashDir(dir2)
    rmSync(dir2, { recursive: true, force: true })

    expect(first).toBe(second)
  })
})
