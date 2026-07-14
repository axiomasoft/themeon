import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { resolveWatchTarget } from './watch-target'

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
    ).toThrow('[themeon] tokensDir не может быть корнем проекта')
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
    ).toThrow('[themeon] tokensDir не может быть корнем проекта')
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
