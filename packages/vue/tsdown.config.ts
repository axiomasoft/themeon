import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts', 'src/anti-fouc.ts'],
  format: ['es'],
  dts: true,
  clean: true,
  treeshake: true,
  outExtensions: () => ({ js: '.js' }),
})
