// Audit probes show observed behavior, including defects. Exit 0 is not a product quality gate.
// Run after pnpm install and pnpm build. No repository source files are changed.
import { createRequire } from 'node:module'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineTheme, resolveTheme, serializeThemeCss, fromDTCG, toDTCG } from '../../packages/core/dist/index.js'
import { createCompiler, compileTheme } from '../../packages/core/dist/public/compiler.js'
import { checkThemeContrast } from '../../packages/colors/dist/index.js'

const results = []
function probe(id, work) {
  try { results.push({ id, result: work() }) }
  catch (error) { results.push({ id, exception: error.message, code: error.code }) }
}

const theme = defineTheme({
  base: { color: { text: '#111111' } },
  themes: { dark: { color: { text: '#ffffff' } } },
})

probe('mutable-compiler-options', () => {
  const resolve = { prefix: 'one' }
  const compiler = createCompiler({ resolve })
  const first = compiler.compile(theme)
  resolve.prefix = 'two'
  const second = compiler.compile(theme)
  return {
    sameFingerprint: first.fingerprint === second.fingerprint,
    differentCss: first.css !== second.css,
    firstVars: Object.keys(first.resolved.vars),
    secondVars: Object.keys(second.resolved.vars),
    context: compiler.context.resolve,
  }
})

probe('validator-error-emits-css', () => {
  const out = compileTheme(theme, { extensions: [{
    name: 'audit-reject', version: '1', apiVersion: 1, stage: 'validate-output',
    capability: 'validator', cacheKey: 'v1', deterministic: true,
    validate: () => [{ code: 'THEMEON_BAD_VALUE', severity: 'error', message: 'Rejected by validator' }],
  }] })
  return { cssEmitted: out.css.length > 0, errors: out.diagnostics.filter(d => d.severity === 'error') }
})

probe('mutable-compiled-theme-token', () => {
  const out = compileTheme(theme)
  const token = out.resolved.themes.dark[0]
  const frozen = Object.isFrozen(token)
  token.value = '#ff0000'
  return { frozen, cssChanged: serializeThemeCss(out.resolved) !== out.css, storedCssHasOldValue: out.css.includes('#ffffff') }
})

probe('mutable-authoring-patch', () => {
  const patch = { color: { text: '#ffffff' } }
  const def = defineTheme({ base: { color: { text: '#111111' } }, themes: { dark: patch } })
  const before = serializeThemeCss(resolveTheme(def))
  patch.color.text = '#ff0000'
  return { patchFrozen: Object.isFrozen(def.themes.dark), cssChanged: serializeThemeCss(resolveTheme(def)) !== before }
})

probe('dtcg-metadata-loss', () => {
  const doc = { color: { $type: 'color', text: {
    $value: '#111111', $description: 'Meaningful description', $deprecated: true,
  } } }
  const imported = fromDTCG(doc)
  const out = compileTheme(imported.definition)
  return { importDiagnostics: imported.diagnostics, irMetadata: out.document.tokens.map(t => t.metadata), exportResult: toDTCG(imported.definition) }
})

probe('self-alias', () => {
  const out = resolveTheme(defineTheme({ base: { color: { text: '#111111' } } }), { aliases: () => '--color-text' })
  return { vars: out.vars, css: serializeThemeCss(out) }
})

probe('proto-theme', () => {
  const def = defineTheme({ base: { color: { text: '#111111' } }, themes: JSON.parse('{"__proto__":{"color":{"text":"#ffffff"}}}') })
  const out = resolveTheme(def)
  return { definedThemes: Object.keys(def.themes), resolvedThemes: Object.keys(out.themes), css: serializeThemeCss(out) }
})

const cliRequire = createRequire(new URL('../../packages/cli/package.json', import.meta.url))
const { createJiti } = cliRequire('jiti')
const jiti = createJiti(fileURLToPath(new URL('../../packages/cli/package.json', import.meta.url)), { moduleCache: false, fsCache: false })
const { createThemeState } = await jiti.import(fileURLToPath(new URL('../../packages/vue/src/state.ts', import.meta.url)))
const vueRequire = createRequire(new URL('../../packages/vue/package.json', import.meta.url))
const { JSDOM } = vueRequire('jsdom')
const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>')
const oldDocument = globalThis.document
const oldWindow = globalThis.window
globalThis.document = dom.window.document
globalThis.window = dom.window
try {
  probe('transition-style-leak-on-error', () => {
    const state = createThemeState({ target: () => { throw new Error('Target unavailable') }, storageKey: null, media: () => ({ matches: false }) })
    try { state.init() } catch {}
    const count = document.querySelectorAll('style').length
    try { state.init() } catch {}
    return { stylesAfterFirstFailure: count, stylesAfterRetry: document.querySelectorAll('style').length, globalRule: document.querySelector('style')?.textContent }
  })
} finally {
  dom.window.close()
  if (oldDocument === undefined) delete globalThis.document
  else globalThis.document = oldDocument
  if (oldWindow === undefined) delete globalThis.window
  else globalThis.window = oldWindow
}

const { createTrailingDebounce } = await jiti.import(fileURLToPath(new URL('../../packages/vite/src/debounce.ts', import.meta.url)))
let calls = 0
let firstSettled = false
let secondSettled = false
const refresh = createTrailingDebounce(async () => ++calls, 10)
refresh().then(() => { firstSettled = true })
refresh().then(() => { secondSettled = true })
await new Promise(resolve => setTimeout(resolve, 80))
results.push({ id: 'debounce-unsettled-promise', result: { firstSettled, secondSettled, fnCalls: calls } })
probe('contrast-no-pairs', () => checkThemeContrast({ '--color-on-warning': '#ffff00', '--color-action-warning': '#ffff00' }))

const { loadThemeConfig } = await jiti.import(fileURLToPath(new URL('../../packages/cli/src/load-theme.ts', import.meta.url)))
const temporaryDirectory = mkdtempSync(join(tmpdir(), 'themeon-audit-reproduction-'))
try {
  const filename = join(temporaryDirectory, 'theme.config.ts')
  const coreEntry = fileURLToPath(new URL('../../packages/core/dist/index.js', import.meta.url))
  function config(value) {
    return `import {defineTheme} from ${JSON.stringify(coreEntry)}; export default defineTheme({base:{color:{text:${JSON.stringify(value)}}}})`
  }
  writeFileSync(filename, config('#111111'))
  const first = await loadThemeConfig(filename)
  writeFileSync(filename, config('#ffffff'))
  const second = await loadThemeConfig(filename)
  results.push({ id: 'cli-loader-cache', result: { first: first.sys.color.text.value, second: second.sys.color.text.value, sameInstance: first === second } })
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true })
}

const { checkCoverage } = await jiti.import(fileURLToPath(new URL('../../packages/cli/src/checks/coverage.ts', import.meta.url)))
probe('coverage-false-positives', () => checkCoverage(resolveTheme(defineTheme({ base: { color: { text: '#111111' } } })), [{
  file: 'app.css', content: '/* example: var(--removed-example) */\n:root { --card-gap: 1rem } .card { gap: var(--card-gap) }',
}]))

console.log(JSON.stringify(results, null, 2))
