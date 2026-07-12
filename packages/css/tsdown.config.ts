import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/contract.ts'],
  format: ['es'],
  dts: true,
  clean: true,
  treeshake: true,
  outExtensions: () => ({ js: '.js' }),
})
