import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['es'],
  dts: true,
  clean: true,
  treeshake: true,
  outExtensions: () => ({ js: '.js' }),
})
