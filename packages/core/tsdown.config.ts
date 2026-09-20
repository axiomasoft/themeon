import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'public/authoring': 'src/public/authoring.ts',
    'public/compiler': 'src/public/compiler.ts',
    'public/runtime': 'src/public/runtime.ts',
    'public/dtcg': 'src/public/dtcg.ts',
    'public/tenant': 'src/public/tenant.ts',
  },
  format: ['es'],
  dts: true,
  clean: true,
  treeshake: true,
  unbundle: true,
  outExtensions: () => ({ js: '.js' }),
})
