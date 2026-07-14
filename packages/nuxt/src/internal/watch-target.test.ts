import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { isWithinWatchTarget, resolveWatchTarget } from './watch-target'

const ROOT = '/app'
const SRC = '/app/app'
const BUILD = '/app/.nuxt'

describe('resolveWatchTarget', () => {
  it('тема в своей директории → watch на директорию (granular HMR, никогда не rootDir)', () => {
    const target = resolveWatchTarget({
      themePath: join(ROOT, 'theme', 'theme.config.ts'),
      tokensDir: undefined,
      rootDir: ROOT,
      srcDir: SRC,
      buildDir: BUILD,
    })
    expect(target).toEqual({ kind: 'directory', path: join(ROOT, 'theme') })
    expect(target.path).not.toBe(ROOT)
  })

  it('тема в rootDir → watch на САМ ФАЙЛ, не на директорию (иначе директория === rootDir)', () => {
    const themePath = join(ROOT, 'theme.config.ts')
    const target = resolveWatchTarget({
      themePath,
      tokensDir: undefined,
      rootDir: ROOT,
      srcDir: SRC,
      buildDir: BUILD,
    })
    expect(target).toEqual({ kind: 'file', path: themePath })
  })

  it('тема в srcDir (Nuxt 4 дефолт app/) → watch на САМ ФАЙЛ по той же причине', () => {
    const themePath = join(SRC, 'theme.config.ts')
    const target = resolveWatchTarget({
      themePath,
      tokensDir: undefined,
      rootDir: ROOT,
      srcDir: SRC,
      buildDir: BUILD,
    })
    expect(target).toEqual({ kind: 'file', path: themePath })
  })

  it('явный tokensDir побеждает dirname(theme)', () => {
    const target = resolveWatchTarget({
      themePath: join(ROOT, 'theme', 'theme.config.ts'),
      tokensDir: join(ROOT, 'tokens'),
      rootDir: ROOT,
      srcDir: SRC,
      buildDir: BUILD,
    })
    expect(target).toEqual({ kind: 'directory', path: join(ROOT, 'tokens') })
  })

  it('явный tokensDir === rootDir → бросает (не даёт вытеснить узкие подписки Nuxt)', () => {
    expect(() =>
      resolveWatchTarget({
        themePath: join(ROOT, 'theme.config.ts'),
        tokensDir: ROOT,
        rootDir: ROOT,
        srcDir: SRC,
        buildDir: BUILD,
      }),
    ).toThrow('[themeon] tokensDir не может быть rootDir/srcDir проекта')
  })

  it('явный tokensDir === srcDir → тоже бросает (адверсариальный ревью P8.4: granular-watcher вытеснил бы подписку на srcDir не только на rootDir)', () => {
    expect(() =>
      resolveWatchTarget({
        themePath: join(SRC, 'theme.config.ts'),
        tokensDir: SRC,
        rootDir: ROOT,
        srcDir: SRC,
        buildDir: BUILD,
      }),
    ).toThrow('[themeon] tokensDir не может быть rootDir/srcDir проекта')
  })

  it('явный tokensDir, содержащий buildDir → бросает (watch съел бы .nuxt/)', () => {
    expect(() =>
      resolveWatchTarget({
        themePath: join(ROOT, 'wide', 'theme.config.ts'),
        tokensDir: join(ROOT, 'wide'),
        rootDir: ROOT,
        srcDir: SRC,
        buildDir: join(ROOT, 'wide', '.nuxt'),
      }),
    ).toThrow('[themeon] tokensDir не может быть rootDir/srcDir проекта')
  })

  it('никогда не отдаёт rootDir ни в одном режиме', () => {
    const cases = [
      { themePath: join(ROOT, 'theme.config.ts'), tokensDir: undefined },
      { themePath: join(ROOT, 'theme', 'theme.config.ts'), tokensDir: undefined },
      { themePath: join(ROOT, 'theme', 'theme.config.ts'), tokensDir: join(ROOT, 'tokens') },
    ]
    for (const c of cases) {
      const target = resolveWatchTarget({ ...c, rootDir: ROOT, srcDir: SRC, buildDir: BUILD })
      expect(target.path).not.toBe(ROOT)
    }
  })
})

describe('isWithinWatchTarget', () => {
  it('директория: путь внутри неё → true', () => {
    const target = { kind: 'directory' as const, path: join(ROOT, 'theme') }
    expect(isWithinWatchTarget(join(ROOT, 'theme', 'palette.ts'), target)).toBe(true)
    expect(isWithinWatchTarget(target.path, target)).toBe(true)
  })

  it('директория: сиблинг с общим префиксом имени НЕ матчит (адверсариальный ревью P8.4: /app/theme-old не должен матчить target=/app/theme)', () => {
    const target = { kind: 'directory' as const, path: join(ROOT, 'theme') }
    expect(isWithinWatchTarget(join(ROOT, 'theme-old', 'x.ts'), target)).toBe(false)
    expect(isWithinWatchTarget(`${target.path}-old`, target)).toBe(false)
  })

  it('директория: путь вне неё → false', () => {
    const target = { kind: 'directory' as const, path: join(ROOT, 'theme') }
    expect(isWithinWatchTarget(join(ROOT, 'other', 'x.ts'), target)).toBe(false)
  })

  it('file: только точное совпадение', () => {
    const themePath = join(ROOT, 'theme.config.ts')
    const target = { kind: 'file' as const, path: themePath }
    expect(isWithinWatchTarget(themePath, target)).toBe(true)
    expect(isWithinWatchTarget(join(ROOT, 'other.ts'), target)).toBe(false)
  })
})
