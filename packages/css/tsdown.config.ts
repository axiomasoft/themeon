import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/contract.ts', 'src/theme/default.ts'],
  format: ['es'],
  dts: true,
  clean: true,
  treeshake: true,
  outExtensions: () => ({ js: '.js' }),
  // `@themeon/core`/`@themeon/colors` — devDeps (workspace:*, P2.7), НЕ должны бандлиться в
  // dist/theme/default.js: бандлинг создаёт вторую копию core с собственным TOKEN_BRAND-
  // символом (module-instance hazard) — `isToken()` в реальном `@themeon/core`, вызванном из
  // gen-tokens.mjs, тогда не узнаёт Token-объекты из забандленной копии, и резолвер трактует
  // их как обычные подгруппы {type,path,value} вместо ссылок.
  deps: { neverBundle: ['@themeon/core', '@themeon/colors'] },
})
