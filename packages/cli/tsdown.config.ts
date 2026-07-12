import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/cli.ts', 'src/index.ts'],
  format: ['es'],
  dts: true,
  clean: true,
  treeshake: true,
  outExtensions: () => ({ js: '.js' }),
})
