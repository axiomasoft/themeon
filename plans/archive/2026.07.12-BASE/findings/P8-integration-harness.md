# P8 — Слой интеграционных тестов «настоящая труба»: стенд, архитектура, прототипы

**Дата:** 2026-07-14 · **Повод:** системный вывод `90_audit/AUDIT_2026-07-14_research-conformance.md`
(«пакет сломан на документированных happy-path'ах, потому что каждый тест мокает границу») ·
**Потребители:** фаза P8 (ремедиация) · **Метод:** только эмпирика — всё ниже прогнано на стенде,
прототипы в `scratchpad/int` реально запускаются (вывод приложен).

**Рекомендация одной фразой:** завести отдельный workspace-пакет `tests/integration` с четырьмя
ярусами труб (vite build · tailwind compile · naive render · nuxt dev), линкующий пакеты **через
`dist`**, гонять его командой `pnpm test:int` отдельным CI-job'ом после `pnpm build` — и **починить
порядок шагов в текущем CI**, потому что build там стоит ПОСЛЕДНИМ и из-за этого CI красный.

---

## 0. Что прототипы нашли за 771 мс (главный аргумент за слой)

Четыре прототипа воспроизвели **три Blocker'а аудита** и вскрыли **два дефекта, которых в аудите
нет**. Юнит-тесты (886 штук, все зелёные) не видят ни одного из пяти.

| # | Труба | Что показала | Статус в аудите |
|:--|:--|:--|:--|
| 1 | реальный `vite build` | `@import 'virtual:themeon.css'` из CSS → `[postcss] ENOENT: no such file or directory, open 'virtual:themeon.css'`. Канал JS-import при этом **работает** | Blocker #1 — воспроизведён |
| 2 | реальный Tailwind 4 | `md:bg-*` → `@media (width >= var(--breakpoint-md))` | Blocker #4 — воспроизведён |
| 3 | реальный Chromium | тот же `md:`-класс: `rgba(0, 0, 0, 0)` и на 500px, и на 1000px — браузер **выбрасывает** правило. Светлая/тёмная тема при этом реально перекрашивается | следствие #4, **user-visible доказательство** |
| 4 | реальный naive-ui | на **документированном** пути резолва `toNative()` отдаёт `primaryColor: "var(--color-forest-600)"` | Blocker #2 — воспроизведён |
| 5 | живой `nuxt dev` | **codegen-ветка падает на старте**, а theme-HMR не срабатывает вовсе | **НОВОЕ — в аудите нет** |

### 5a. НОВОЕ (Blocker): codegen-ветка `@themeon/nuxt` не стартует ни на одной теме с `export default`

`@nuxt/kit` `importModule()` **уже делает interop-default**: для файла с `export default
defineTheme(...)` он возвращает саму тему (`{ sys, themes, schemes }`), а не namespace. Поэтому
`module.ts:105` (`themeModule.default ?? themeModule.theme ?? themeModule.defaultTheme`) не находит
ничего и модуль падает на `setup()`:

```
ERROR  [themeon] module: файл темы "./theme.config.ts" должен экспортировать тему
       (default export либо именованный "theme"/"defaultTheme")
    at loadTheme (packages/nuxt/dist/module.mjs:113:17)
```

Проверено напрямую (`importModule` на валидном файле темы): `keys(mod) = ['sys','themes','schemes']`,
`mod.default = UNDEFINED`, `mod.theme = UNDEFINED`.

**Убийственное следствие:** `themeon init` скаффолдит `export default defineTheme({...})`
(`packages/cli/src/templates.ts` — `THEME_CONFIG_TEMPLATE`). Т.е. **штатная связка `themeon init` +
`themeon: { theme: './theme.config.ts' }` не стартует вообще** — единственная форма, на которой Nuxt
поднимается, это именованный `export const theme`. CLI и Nuxt-модуль взаимно несовместимы на
документированном happy-path'е.

**Почему не поймали:** `packages/nuxt/src/module.test.ts` не тестирует `loadTheme`/codegen **ни
одним тестом** — только чистые хелперы `internal/normalize` (MODULE_DEFAULTS и т.п.).

### 5b. НОВОЕ (Blocker): theme-HMR в Nuxt мёртв

С корректной (именованной) формой экспорта Nuxt поднимается, codegen отрабатывает — в
`.nuxt/themeon-tokens.css` лежат и база, и патч темы. Но правка `theme.config.ts`
(`oklch(0.55 …)` → `oklch(0.11 …)`) **не приводит ни к чему**: файл не перезаписан (mtime не
изменился за 12 с), в dev-логе — ноль новых строк. Т.е. dev-watcher (D13, `hashDir` +
`updateTemplates`) на правку темы не реагирует.

---

## 1. Факты стенда (проверено, не предположено)

### 1.1 Пины (`pnpm-workspace.yaml` catalog + фактический `node_modules`)

| Пакет | Catalog | Фактически в сторе |
|:--|:--|:--|
| `vite` | 8.1.4 | 8.1.4, **8.1.3**, **7.3.6** (Nuxt тянет свой vite 7.3.6) |
| `vitest` / `@vitest/coverage-v8` | 4.1.10 | 4.1.10 |
| `tailwindcss` / `@tailwindcss/node` / `@tailwindcss/vite` | 4.3.2 | 4.3.2 |
| `naive-ui` | 2.44.1 | 2.44.1 |
| `nuxt` / `@nuxt/kit` / `@nuxt/schema` | 4.4.8 | 4.4.8 |
| `vue` | 3.5.39 | 3.5.39 |
| `lightningcss` | 1.32.0 | 1.32.0 |
| jsdom / happy-dom / playwright / puppeteer | — | **не установлены** |

Node `>=22.18` (локально v24.12), pnpm 11.10.0, ESM-only, сборка — tsdown (кроме `nuxt`:
`nuxt-module-build`, и `css`: tsdown + свои `scripts/*.mjs`).

### 1.2 Тестовый стенд

- Корневой `vitest.config.ts`: `projects: ['packages/*']`, coverage v8. Никаких per-package
  `vitest.config.ts` **нет** — все 9 проектов идут на дефолтном (node) окружении.
- `pnpm test` = `vitest run` из корня. Per-package скрипт — `vitest run --root ../.. --project <name>`.
- Базовый прогон: **44 файла, 886 тестов, 1.06 s** (wall 1.66 s), всё зелёное.
- `apps/playground` — Nuxt-приложение (`modules: ['@themeon/nuxt']`, `themeon: { themes: [...] }`),
  **без своей темы** → идёт статической веткой, codegen-ветку не трогает. Тестов не имеет,
  в `pnpm test` не участвует.

### 1.3 CI (`.github/workflows/ci.yml`) — **красный, и это не флейк**

```
pnpm install → lint → typecheck → test → build → check:pack     (node 22 и 24)
```

Последние 4 прогона — **все `failure`**, падают на шаге `pnpm typecheck` (до `test` дело не
доходит). Причина установлена экспериментом, а не догадкой:

- `dist` — **gitignored** (`.gitignore:2`), на свежем клоне его нет;
- все пакеты экспортируют себя через `exports → ./dist/*`, поэтому кросс-пакетные импорты
  (и типы, и рантайм) идут **через `dist`**;
- `pnpm build` в CI стоит **после** `typecheck` и `test`.

Проверка (убрал `packages/tailwind/dist`, `dist` остальных на месте):
```
src/commands/build.ts(14,32): error TS2307: Cannot find module '@themeon/tailwind'
                              or its corresponding type declarations.
```
Тот же механизм ломает и `test`: с убранным `packages/core/dist` падает
`tailwind-compile.test.ts` (`Failed to resolve import '@themeon/core'`). Локально всё зелёное
только потому, что `dist` лежит от прошлой ручной сборки.

> **Обязательный фикс P8 (вне зависимости от интеграционного слоя):** порядок шагов CI —
> `install → build → lint → typecheck → test → test:int → check:pack`.

### 1.4 Раскладка `node_modules` (важно для размещения тестов)

pnpm strict, `.npmrc` = только `engine-strict=true`, **никакого hoisting**. В корневом
`node_modules` лежат лишь корневые devDeps (vitest, typescript, oxlint, publint, changesets).
`vite`, `naive-ui`, `tailwindcss`, `nuxt` живут **в `node_modules` своих пакетов**.

**Следствие:** тест, лежащий вне пакета, который объявил зависимость, эту зависимость не
разрезолвит. Интеграционный слой обязан быть **пакетом со своим `package.json`** — иначе
`import { build } from 'vite'` просто не найдётся.

---

## 2. Ключевое решение: линковать `dist`, а не `src`

**Рекомендация: `dist`.** Обоснование — не вкусовое:

1. **Так уже устроен монорепо.** Кросс-пакетные импорты и сегодня резолвятся в `dist` (доказано
   выше). Алиасить интеграционный слой на `src` значило бы тестировать конфигурацию, которой не
   существует ни у одного потребителя.
2. **Класс багов «работает в src, ломается в dist» ловится только на dist**, а у пакета все
   поверхности — как раз те, где это вылезает: `exports`-мапы (9 пакетов, у `css` — 10 подпутей),
   `bin` у CLI, `nuxt-module-build` у `nuxt` (собирает `module.mjs` + `runtime/`, форма которого
   вообще отличается от `src`), сайд-эффектные CSS-файлы у `css`.
3. **Nuxt-баг 5a виден только на dist-форме** — трасса падения идёт через
   `packages/nuxt/dist/module.mjs:113`; модуль исполняется Nuxt'ом как собранный `module.mjs`,
   а не как TS-исходник.
4. `check:pack` (publint + attw) уже валидирует dist-контракт — интеграционный слой становится его
   поведенческим продолжением.

**Цена:** интеграционный слой требует `pnpm build` перед прогоном (+4.9 s, замер ниже) и не даёт
watch-режима «поправил src → сразу увидел». Это приемлемо: юнит-ярус (886 тестов, 1 s) остаётся
на `src` и покрывает быструю петлю разработки.

**Не рекомендую** дублировать слой в двух вариантах (src+dist) — удвоение времени ради ловли
расхождения, которое `check:pack` уже ловит статически.

---

## 3. Рекомендованная архитектура

### 3.1 Где живёт

Новый workspace-пакет **`tests/integration`** (добавить `tests/*` в `pnpm-workspace.yaml`).

Почему не альтернативы:
- **per-package `*.int.test.ts`** — не проходит по разделению зависимостей: интеграционный тест
  naive-моста хочет `naive-ui` + `vue` + `jsdom` + `playwright`, и всё это пришлось бы вписать в
  `devDependencies` продуктового пакета, раздув его установку и смешав «зависимости пакета» с
  «зависимостями его тестов». Плюс `@themeon/vite` пришлось бы заставить зависеть от собственного
  `dist` — циклическая мерзость.
- **`apps/smoke`** — приложение не даёт ассертов и не запускается в CI как тест; playground уже
  показал свою бесполезность как контроля (он живой и при этом codegen-ветка в нём мертва).
- **`tests/integration`** — один `package.json`, где честно объявлены все «потребительские»
  зависимости (`vite`, `tailwindcss`, `naive-ui`, `nuxt`, `playwright`), а пакеты ThemeOn
  подключены как `workspace:*` → резолвятся через `exports` → **dist**, ровно как у внешнего
  потребителя.

```
tests/integration/
  package.json          # workspace:* на пакеты ThemeOn + vite/tailwind/naive-ui/nuxt/playwright
  vitest.config.ts      # projects: fast (node) | browser | e2e-nuxt
  src/
    vite-build.int.test.ts
    tailwind-effect.int.test.ts
    naive-render.int.test.ts     # environment: jsdom
    browser-computed.int.test.ts # playwright
    nuxt-dev.int.test.ts         # живой nuxt dev  → проект "slow"
  fixtures/
    nuxt-app/           # ОБЯЗАТЕЛЬНО со своей темой — иначе codegen-ветка не исполняется
```

**Фикстуры держать внутри пакета, не в `os.tmpdir()`.** Проверено: `@tailwindcss/node` резолвит
`@import "tailwindcss"` нодовой резолюцией от `base`-директории, и из `/tmp` он его не находит
(`Can't resolve 'tailwindcss' in /tmp/themeon-tw-XXXX`). Временные директории — под
`tests/integration/.tmp-*` (уже покрыто `.gitignore`: `.tmp-*`).

### 3.2 Ярусы и что каждый ОБЯЗАН доказывать

| Ярус | Труба | Обязан доказывать | Не доказывает |
|:--|:--|:--|:--|
| **1. build** | `vite build` (programmatic) | плагин грузится настоящим Vite; **каждый документированный способ подключения** (JS-import И CSS-`@import`) доводит токены до выходного CSS; в CSS есть `[data-theme=…]`-своп | что браузер это применит |
| **2. compile** | `@tailwindcss/node` `compile()` | утилита эмитит `var(…)`; своп темы меняет **значение** переменной по каскаду; **responsive-варианты** (`md:`) компилируются в валидный `@media` | что `@media` валиден для браузера (см. ярус 4) |
| **3. render** | реальный `naive-ui` + `vue`, jsdom | `toNative()` на **дефолтном** пути резолва даёт цвета, а не `var(…)`; seemly не бросает; компонент получает реальный цвет в `--n-*` | вычисленный стиль, каскад, `@media` |
| **4. browser** | Chromium (playwright) | **конечный эффект**: `getComputedStyle` до/после `data-theme`; `md:`-класс реально применяется на широком вьюпорте | ничего сверх — это верхний ярус истины |
| **5. e2e** | живой `nuxt dev` | codegen-ветка **стартует** (на форме темы из `themeon init`!); токены доезжают в отдаваемый CSS; правка темы → CSS изменился (HMR) | прод-сборку (`nuxt build`) |

Ярус 2 без яруса 4 — ровно та ловушка, в которую уже попал `tailwind-compile.test.ts`: он
компилирует настоящим Tailwind, но собирает только `['bg-action-primary']`, без единого
responsive-кандидата, и потому Blocker #4 проходит мимо. **Список кандидатов — часть контракта
трубы**, а не деталь.

### 3.3 Команды и CI

```jsonc
// package.json (root)
"test":      "vitest run",                                  // юнит, как сейчас (1 s)
"test:int":  "vitest run --project int-fast --project int-browser",
"test:e2e":  "vitest run --project int-e2e",                // живой nuxt, «slow»
"test:all":  "pnpm build && pnpm test && pnpm test:int"
```

CI — **два job'а**, чтобы медленный ярус не удлинял основную петлю:

```yaml
jobs:
  build:            # существующий, с ИСПРАВЛЕННЫМ порядком
    steps: [install, build, lint, typecheck, test, check:pack]
  integration:
    needs: build
    steps:
      - install
      - run: pnpm build
      - run: npx playwright install --with-deps chromium   # ~30-60 s, кэшируется
      - run: pnpm test:int
      - run: pnpm test:e2e        # можно оставить только на push в main, если станет флейким
```

`test:e2e` (живой `nuxt dev`) держать **отдельным проектом vitest**, а не подмешивать в общий
прогон: он один стоит дороже всего остального слоя вместе взятого (3.4 s boot против 0.8 s на
все четыре быстрых яруса) и он единственный, где реально возможны флейки (порты, watch-таймауты).
В `pnpm test` его не включать никогда.

---

## 4. Стоимость (замерено на этом стенде)

| Операция | Время |
|:--|:--|
| `pnpm test` (юнит, 886 тестов) | **1.06 s** (wall 1.66 s) |
| `pnpm build` (все 9 пакетов, тёплый) | **4.9 s** |
| `pnpm typecheck` | 4.1 s |
| Прототипы a+b+c+d (4 файла, 7 тестов, **включая запуск Chromium**) | **0.77 s** (wall 1.1 s) |
| — из них: vite build ×2 | 30 ms + 19 ms |
| — из них: tailwind compile ×2 | 21 ms + 14 ms |
| — из них: naive render (jsdom) | 6 ms |
| — из них: browser (2 теста + launch) | 98 ms + 51 ms (+ ~280 ms launch в `beforeAll`) |
| Chromium launch + `getComputedStyle` (голый замер) | 283 ms |
| `nuxt dev` boot до первого 200 (codegen-фикстура) | **3.4 s** |
| `pnpm install` интеграционного пакета (тёплый store) | 5.2 s |
| `pnpm add -D playwright` (браузеры уже в кэше) | 3.1 s |

**Итого ожидаемая цена слоя в CI:** ~5 s (build) + ~1 s (4 быстрых яруса) + ~4 s (nuxt e2e) ≈
**10 s** сверх текущего, плюс однократный `playwright install` (кэшируемый). Это ничтожно на фоне
того, что слой ловит 5 Blocker'ов.

---

## 5. Возможности среды: браузер ЕСТЬ

- `playwright` / `puppeteer` **не установлены в репо**, но:
  - npm-реестр доступен (`npm view playwright version` → `1.61.1`);
  - браузеры **уже скачаны**: `~/.cache/ms-playwright` (`chromium-1208`, `chromium-1228`,
    `chromium_headless_shell-*`), `~/.cache/puppeteer` (`chrome`, `chrome-headless-shell`);
  - в системе есть `/usr/bin/google-chrome`, `/usr/bin/chromium-browser`, `/usr/bin/firefox`.
- **Проверено запуском:** `pnpm add -D playwright@1.61.1` (3.1 s) → `chromium.launch()` → страница →
  `getComputedStyle` вернул `oklch(0.55 0.15 155)` / после `data-theme=dark` — `oklch(0.75 0.15 155)`.
  Полный цикл 283 ms. **Chromium корректно резолвит `var()`-цепочки и `oklch`.**

Т.е. деградация **не нужна**: computed-стили и эффект `@media` проверяются фактически. Для
полноты — чего стоили бы альтернативы, если бы браузера не было:

| Замена | Что НЕ докажет |
|:--|:--|
| jsdom / happy-dom + `getComputedStyle` | **не резолвит `var()`** и не применяет `@media`/каскад → Blocker #4 (мёртвые `md:`-классы) остался бы невидим; годится только для «naive положил в инлайновый стиль реальный цвет» (ярус 3) |
| ручной разбор каскада регуляркой (как в прототипе b) | проверяет **модель каскада, написанную автором теста**, а не браузерную; невалидный `@media` она молча «разрешит», потому что автор не знал, что `var()` в media-query запрещён — т.е. ровно тот баг, что и ищем, она и пропускает |
| lightningcss-парсинг | синтаксическую валидность даст, применимость правила — нет |

**Вывод:** ярус 4 (браузер) обязателен, потому что он единственный поймал, что `md:`-классы мертвы.
HMR-эффект (`nuxt dev` + правка темы) на этом стенде тоже проверяется фактически — прототип
показал, что он **не наступает**.

---

## 6. Прототипы (готовы к переносу)

Живут в `scratchpad/int/` (standalone pnpm-проект, `link:` на пакеты репо → резолв через `dist`,
т.е. в точности будущий `tests/integration`). Прогон:

```
$ pnpm vitest run --reporter=verbose
 ✓ a-vite-build   > канал JS-import: `import "virtual:themeon.css"` доезжает до выходного CSS  30ms
 × a-vite-build   > канал CSS-import (документированный в README)                              19ms
   → [postcss] ENOENT: no such file or directory, open 'virtual:themeon.css'
 ✓ b-tailwind     > утилита bg-action-primary даёт РАЗНЫЕ цвета в light и dark                 21ms
 × b-tailwind     > брейкпоинт доезжает в @media реальной длиной, а не var()                   14ms
   → expected 'width >= var(--breakpoint-md' not to contain 'var('
 ✓ d-browser      > data-theme=dark реально перекрашивает утилиту Tailwind                     98ms
 × d-browser      > responsive-вариант md: реально применяется на широком вьюпорте             51ms
   → expected 'rgba(0, 0, 0, 0)' not to be 'rgba(0, 0, 0, 0)'
 × c-naive-render > дефолтный путь резолва (README): naive не падает и красит кнопку            6ms
   → expected '{"common":{"primaryColor":"var(--colo…' not to contain 'var(--'

 Test Files  4 failed (4) | Tests  4 failed | 3 passed (7) | Duration 771ms
```

**3 passed — это важно:** труба не «красная на всём подряд», она различает. Работающее (JS-канал
Vite, цветовой своп Tailwind, перекраска в браузере) остаётся зелёным; красное — ровно те пять
дефектов.

### (a) `vite-build.int.test.ts` — настоящий `vite build`

```ts
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { build } from 'vite'
import { defineTheme } from '@themeon/core'
import { themeon } from '@themeon/vite'
import { describe, expect, test } from 'vitest'
import type { RollupOutput } from 'rollup'

const theme = defineTheme({
  base: { color: { action: { primary: 'oklch(0.55 0.15 255)' }, bg: { page: 'oklch(1 0 0)' } } },
  themes: { dark: { color: { action: { primary: 'oklch(0.7 0.15 255)' } } } },
})

function fixture(files: Record<string, string>): string {
  const dir = mkdtempSync(join(import.meta.dirname, '.tmp-vite-'))
  for (const [name, content] of Object.entries(files)) {
    const full = join(dir, name)
    mkdirSync(join(full, '..'), { recursive: true })
    writeFileSync(full, content)
  }
  return dir
}

/** Гоняет настоящий production-билд Vite и возвращает конкатенацию всех CSS-ассетов. */
async function buildCss(root: string): Promise<string> {
  const out = (await build({
    root,
    logLevel: 'silent',
    configFile: false,
    plugins: [themeon({ theme })],
    build: { write: false, minify: false },
  })) as RollupOutput

  return out.output
    .filter((c) => c.type === 'asset' && c.fileName.endsWith('.css'))
    .map((c) => String((c as { source: string | Uint8Array }).source))
    .join('\n')
}

const INDEX_HTML =
  '<!doctype html><html><body><script type="module" src="/main.js"></script></body></html>'

describe('@themeon/vite — настоящий vite build', () => {
  test('канал JS-import: `import "virtual:themeon.css"` доезжает до выходного CSS', async () => {
    const css = await buildCss(
      fixture({ 'index.html': INDEX_HTML, 'main.js': `import 'virtual:themeon.css'\n` }),
    )
    expect(css).toMatch(/--color-action-primary:\s*oklch\(0\.55 0\.15 255\)/)
    expect(css).toMatch(/\[data-theme="dark"\][^}]*--color-action-primary:\s*oklch\(0\.7 0\.15 255\)/)
  })

  // Blocker #1: документированный в README способ. Сейчас падает.
  test('канал CSS-import: `@import "virtual:themeon.css"`', async () => {
    const css = await buildCss(
      fixture({
        'index.html': INDEX_HTML,
        'main.js': `import './style.css'\n`,
        'style.css': `@import 'virtual:themeon.css';\nbody { background: var(--color-bg-page); }\n`,
      }),
    )
    expect(css).toContain('--color-action-primary')
  })
})
```

### (b) `tailwind-effect.int.test.ts` — настоящий Tailwind 4, ассерт на ЭФФЕКТ

```ts
import { mkdtempSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { compile } from '@tailwindcss/node'
import { defineTheme, resolveTheme, serializeThemeCss } from '@themeon/core'
import { tailwindBridge } from '@themeon/tailwind'
import { describe, expect, test } from 'vitest'

const theme = defineTheme({
  base: { color: { action: { primary: 'oklch(0.55 0.15 155)' } }, breakpoint: { md: '768px' } },
  themes: { dark: { color: { action: { primary: 'oklch(0.75 0.15 155)' } } } },
})

async function compileUtilities(candidates: string[]): Promise<string> {
  // Фикстура ВНУТРИ пакета: `@import "tailwindcss"` резолвится нодовой резолюцией от `base`,
  // а у /tmp нет node_modules → в os-tmpdir компиляция падает «Can't resolve 'tailwindcss'».
  const dir = mkdtempSync(join(import.meta.dirname, '.tmp-tw-'))
  const resolved = resolveTheme(theme)
  writeFileSync(join(dir, 'tokens.css'), serializeThemeCss(resolved))
  writeFileSync(join(dir, 'bridge.css'), tailwindBridge(resolved))

  const result = await compile(
    `@import "tailwindcss";\n@import "./tokens.css";\n@import "./bridge.css";\n`,
    { base: dir, onDependency: () => {} },
  )
  return result.build(candidates)
}

/** Мини-резолвер каскада: значение кастом-проперти в скоупе, с раскруткой цепочек var(). */
function cssVarValue(css: string, scope: string, varName: string, depth = 0): string | undefined {
  if (depth > 10) return undefined
  const blocks = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter((m) =>
    m[1].split(',').some((s) => s.trim() === scope),
  )
  let raw: string | undefined
  for (const b of blocks) {
    const m = new RegExp(`(?:^|;)\\s*${varName}\\s*:\\s*([^;}]+)`).exec(b[2])
    if (m) raw = m[1].trim()
  }
  if (raw === undefined) return undefined
  const ref = /^var\(\s*(--[\w-]+)\s*\)$/.exec(raw)
  return ref
    ? (cssVarValue(css, scope, ref[1], depth + 1) ?? cssVarValue(css, ':root', ref[1], depth + 1))
    : raw
}

describe('@themeon/tailwind — эффект настоящей компиляции', () => {
  test('bg-action-primary даёт РАЗНЫЕ цвета в light и dark', async () => {
    const out = await compileUtilities(['bg-action-primary'])
    expect(out).toMatch(/\.bg-action-primary\s*\{[^}]*background-color:\s*var\(--color-action-primary\)/)

    const light = cssVarValue(out, ':root', '--color-action-primary')
    const dark = cssVarValue(out, '[data-theme="dark"]', '--color-action-primary')
    expect(light).toBe('oklch(0.55 0.15 155)')
    expect(dark).toBe('oklch(0.75 0.15 155)')
  })

  // Blocker #4. Кандидат с responsive-вариантом ОБЯЗАТЕЛЕН — без него баг невидим.
  test('брейкпоинт доезжает в @media реальной длиной, а не var()', async () => {
    const out = await compileUtilities(['md:bg-action-primary'])
    const media = /@media\s*\(([^)]*)\)/.exec(out)?.[1] ?? ''
    expect(media).not.toContain('var(') // var() в media-query невалиден → правило выброшено
    expect(media).toMatch(/768px|48rem/)
  })
})
```

### (c) `naive-render.int.test.ts` — настоящий naive-ui (jsdom)

```ts
/** @vitest-environment jsdom */
import { createApp, h, nextTick } from 'vue'
import { NButton, NConfigProvider } from 'naive-ui'
import { defineTheme, defineTokens, resolveTheme } from '@themeon/core'
import { toNative } from '@themeon/naive'
import { afterEach, describe, expect, test } from 'vitest'

// Документированная форма (core README «Quickstart»): палитра — ref-слой, sys ссылается на неё.
const palette = defineTokens('color', {
  forest: { 600: 'oklch(0.55 0.13 155)' },
  neutral: { 0: 'oklch(0.99 0 0)', 900: 'oklch(0.15 0 0)' },
})

const theme = defineTheme({
  base: {
    color: {
      action: { primary: palette.forest[600] },
      bg: { page: palette.neutral[0], subtle: palette.neutral[0], elevated: palette.neutral[0] },
      text: palette.neutral[900],
      border: palette.neutral[900],
    },
    radius: { md: '0.5rem' },
  },
  themes: { dark: { color: { bg: { page: palette.neutral[900] } } } },
})

let app: ReturnType<typeof createApp> | undefined
afterEach(() => {
  app?.unmount()
  app = undefined
  document.body.innerHTML = ''
})

function mountWithOverrides(overrides: object): HTMLElement {
  const host = document.createElement('div')
  document.body.appendChild(host)
  app = createApp(() =>
    h(NConfigProvider, { themeOverrides: overrides }, () =>
      h(NButton, { type: 'primary' }, () => 'Buy'),
    ),
  )
  app.mount(host)
  return host
}

describe('@themeon/naive — настоящий naive-ui', () => {
  // Blocker #2. Ключевое: resolveTheme() БЕЗ опций — дефолтный refLayer:'referenced'.
  test('дефолтный путь резолва: naive не падает и красит кнопку реальным цветом', async () => {
    const overrides = toNative(resolveTheme(theme))

    expect(JSON.stringify(overrides)).not.toContain('var(--') // JS-канал Naive не понимает var()

    const host = mountWithOverrides(overrides) // seemly бросит на var()-строке
    await nextTick()

    const button = host.querySelector('.n-button') as HTMLElement | null
    expect(button).not.toBeNull()
    const style = button!.getAttribute('style') ?? ''
    expect(style).toMatch(/--n-color[^:]*:\s*(#[0-9a-f]{3,8}|rgba?\()/i)
  })
})
```

### (d) `browser-computed.int.test.ts` — Chromium, реальный `getComputedStyle`

```ts
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { compile } from '@tailwindcss/node'
import { defineTheme, resolveTheme, serializeThemeCss } from '@themeon/core'
import { tailwindBridge } from '@themeon/tailwind'
import { chromium, type Browser } from 'playwright'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

const theme = defineTheme({
  base: { color: { action: { primary: 'oklch(0.55 0.15 155)' } }, breakpoint: { md: '768px' } },
  themes: { dark: { color: { action: { primary: 'oklch(0.75 0.15 155)' } } } },
})

let browser: Browser
let dir: string

beforeAll(async () => {
  browser = await chromium.launch()
  dir = mkdtempSync(join(import.meta.dirname, '.tmp-br-'))
})
afterAll(async () => {
  await browser?.close()
  rmSync(dir, { recursive: true, force: true })
})

async function buildCss(candidates: string[]): Promise<string> {
  const resolved = resolveTheme(theme)
  writeFileSync(join(dir, 'tokens.css'), serializeThemeCss(resolved))
  writeFileSync(join(dir, 'bridge.css'), tailwindBridge(resolved))
  const result = await compile(
    `@import "tailwindcss";\n@import "./tokens.css";\n@import "./bridge.css";\n`,
    { base: dir, onDependency: () => {} },
  )
  return result.build(candidates)
}

async function computed(
  css: string,
  klass: string,
  prop: string,
  opts: { theme?: string; width?: number } = {},
): Promise<string> {
  const page = await browser.newPage({ viewport: { width: opts.width ?? 1280, height: 600 } })
  try {
    await page.setContent(
      `<!doctype html><html${opts.theme ? ` data-theme="${opts.theme}"` : ''}>` +
        `<head><style>${css}</style></head><body><div id="t" class="${klass}">x</div></body></html>`,
    )
    return await page.evaluate(
      ([p]) => getComputedStyle(document.getElementById('t')!).getPropertyValue(p),
      [prop],
    )
  } finally {
    await page.close()
  }
}

describe('браузерный ярус — реальный getComputedStyle', () => {
  test('data-theme=dark реально перекрашивает утилиту Tailwind', async () => {
    const css = await buildCss(['bg-action-primary'])
    const light = await computed(css, 'bg-action-primary', 'background-color')
    const dark = await computed(css, 'bg-action-primary', 'background-color', { theme: 'dark' })
    expect(dark).not.toBe(light)
  })

  // Единственный ассерт, доказывающий ПОЛЬЗОВАТЕЛЬСКОЕ следствие Blocker #4.
  test('responsive-вариант md: реально применяется на широком вьюпорте', async () => {
    const css = await buildCss(['md:bg-action-primary'])
    const narrow = await computed(css, 'md:bg-action-primary', 'background-color', { width: 500 })
    const wide = await computed(css, 'md:bg-action-primary', 'background-color', { width: 1000 })
    expect(narrow).toBe('rgba(0, 0, 0, 0)')
    expect(wide).not.toBe(narrow) // сейчас ПАДАЕТ: браузер выбросил невалидный @media
  })
})
```

### (e) Ярус 5 — живой `nuxt dev` (эскиз, стоимость 3.4 s)

Схема, отработанная на прототипе-скрипте (`scratchpad/nuxt-hmr-probe.sh`):

1. фикстура `fixtures/nuxt-app` **со своей темой** (`themeon: { theme: './theme.config.ts' }`) —
   иначе исполняется статическая ветка и codegen не проверяется;
2. `nuxt dev --port <free>` через `execa`, `NUXT_IGNORE_LOCK=1` (иначе конфликт с dev-сервером
   разработчика — наступили на это), порт брать **из stdout** (`http://localhost:(\d+)`), а не
   из запрошенного: при занятом порте Nuxt молча уходит на альтернативный;
3. поллинг `GET /` до 200 → ассерт: сервер поднялся (**сейчас падает на `export default`-теме**);
4. ассерт: `.nuxt/themeon-tokens.css` содержит токены базы и патч темы;
5. правка `theme.config.ts` → поллинг до появления нового значения → ассерт HMR
   (**сейчас не наступает: файл не перезаписывается**);
6. `teardown`: kill dev-сервера, восстановление файла темы.

Держать **отдельным vitest-проектом `int-e2e`** (`testTimeout: 60_000`), не в `pnpm test`.

---

## 7. Риски и как их снять

| Риск | Оценка | Митигация |
|:--|:--|:--|
| `playwright install` в CI | ~30–60 s на холодном раннере | кэш `~/.cache/ms-playwright` по `actions/cache`; ставить **только chromium** |
| Флейки живого `nuxt dev` | средний: порты, watch-таймауты | отдельный job/проект; порт из stdout; поллинг с дедлайном вместо `sleep`; при нестабильности — только на push в `main` |
| Два vite в дереве (8.1.4 + 7.3.6 у Nuxt) | низкий | ярусы 1 и 5 изолированы: плагин `@themeon/vite` в Nuxt-канале не участвует (свой модуль) |
| `tests/*` в workspace ломает `pnpm -r build` / `check:pack` | низкий | пакет `private: true`, без `build`; фильтры уже сужены до `./packages/*` |
| Интеграционный слой требует свежий `dist` | средний: забудешь собрать — красное «на ровном месте» | `"test:int": "pnpm build && vitest run --project int-*"`, и в CI `build` перед `test` (всё равно обязателен — см. §1.3) |
| Кэш jiti/`importModule` в HMR-ярусе | низкий | ассерт — на **эффект в файле**, а не на факт вызова хука |

---

## 8. Чек-лист P8 (что делать по итогам)

1. **Починить порядок CI** (`build` до `typecheck`/`test`) — CI красный уже 4 прогона подряд, и это
   не связано с интеграционным слоем.
2. Завести `tests/integration` (`tests/*` в `pnpm-workspace.yaml`), перенести прототипы a–d.
3. Добавить ярус 5 (`nuxt dev`) отдельным проектом; фикстура — **с темой в форме, которую
   генерирует `themeon init`**.
4. Завести в трекер два НОВЫХ Blocker'а: 5a (codegen-ветка не стартует; `themeon init`
   несовместим с `@themeon/nuxt`) и 5b (theme-HMR не срабатывает).
5. Прогонять ярусы на **`dist`**; для `naive` — обязательно на **дефолтном** `resolveTheme()`,
   без `refLayer`.
6. Список Tailwind-кандидатов в ярусе 2 обязан содержать responsive-вариант (`md:*`) — иначе
   Blocker #4 снова станет невидимым.
