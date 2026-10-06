# themeon: аудит типизации, архитектуры и безопасности

- Репозиторий: https://github.com/axiomasoft/themeon (публичный)
- База: `main` @ `4604eda` (2026-09-26, 162 коммита).
- Рабочая ветка: `improve/typing-architecture-1`, 15 коммитов поверх `main`. 102 файла, +1355/−556 строк, включая регенерированные API-отчёты.
- Дата аудита: 2026-10-06.
- PR не открывался. `main` не менялся, force-push и переписывания истории не было.

---

## 1. Кратко

themeon — зрелый монорепозиторий на 9 публикуемых пакетов: core, cli, colors, css, naive, nuxt, tailwind, vite и vue. Инфраструктура качества сильная:
- API-отчёты;
- матрица типов на упакованных tarball'ах;
- property-тесты и Stryker;
- гейт критического покрытия;
- perf-бюджеты;
- ADR и архитектурная документация с автоматической проверкой манифеста.

Главные проблемы оказались не в стиле, а в конкретных дефектах:

1. **CSS-инъекция через данные токенов (security, высокий).** Значения и ключи токенов, включая импорт из DTCG-JSON и имена тем, попадали в `tokens.css` без проверки. Строка вида `red; } body { display:none } :root { --x: 1` выходила из декларации и добавляла произвольные правила. Для `@themeon/core` это канал доставки CSS в публичные сайты. Исправлено токенайзером-гардом, fail-loud `UNSAFE_CSS_TOKEN`.
2. **CI на `main` красный минимум с 2026-09-20.** Job `verify` падает на шаге `Build`: `@themeon/nuxt` не собирается из чистого клона, потому что нет `.nuxt/tsconfig.json`. Падает и `Release packages`. Пример: https://github.com/axiomasoft/themeon/actions/runs/36217427639. Исправлено, сборка из чистого клона проверена.
3. **Эвристика вывода типа токена по суффиксу.** `'sans'` → `duration` (оканчивается на `s`), `'system'` → `dimension` (на `em`), `'#hashtag'` → `color`. Исправлено: тип выводится только из целого литерала.
4. **Невалидные листья молча сериализовались.** `undefined`, `null` и `true` превращались в `--x: undefined;`. Обычно это опечатка в ссылке на токен. Теперь `BAD_VALUE` с подсказкой.
5. **Типизация контракта темы была «плоской».** `defineTheme` терял литеральные имена тем, а `sys` типизировался как `Token<TokenType>`. Теперь у каждой группы точный `Token<'color'>`, `Token<'dimension'>` и т. д. Имена тем идут литеральным union'ом через `ThemeDefinition` → `ResolvedTheme` → `themeVars`. Во Vue появилась opt-in регистрация `ThemeonRegister`.
6. **Самые строгие флаги TS по всему workspace.** `exactOptionalPropertyTypes`, `noImplicitOverride`, `noUnused*` и другие; около 91 опциональное поле публичных опций приведено к `?: T | undefined`. В итоге 0 ошибок.
7. **Lint ничего не гейтил.** oxlint без конфига выдавал только warnings, exit 0. Добавлен `.oxlintrc.json`: correctness → error, `no-explicit-any` → error в исходниках.
8. **Секреты: чисто.** gitleaks: 0 находок по 173 коммитам всех веток. trufflehog: 0 verified и 0 unverified.
9. **Машинно-локальные файлы AI-агентов были в индексе публичного репо.** Это hooks с абсолютными путями и `fail-closed`, state-логи и memory-файлы. Сняты с индекса и добавлены в `.gitignore`. `CLAUDE.md` и общие конфиги оставлены.

После изменений все проверки зелёные, тестов стало больше на 82, сгенерированный CSS на бенчмарк-корпусе байт-в-байт совпадает с `main` (одинаковый `cssSha256`).

---

## 2. Находки (file:line — по `main` @ 4604eda, если не указано иное)

### 2.1 Безопасность

| # | Серьёзность | Где | Суть | Статус |
|---|---|---|---|---|
| S1 | Высокая | `packages/core/src/resolve.ts:169`, `:188` (значения), `:128` `claim()` (имена переменных) | Значение токена интерполируется в `--name: value;` как есть. `;`, `}` и `{` в значении или ключе (в том числе из DTCG-импорта) дают инъекцию правил в `tokens.css`. Существующий `assertSafeCssToken` (`serialize.ts:79`) покрывал только селектор, layer, banner и имена брейкпоинтов, но не декларации. | Исправлено (`f2c8cb5`) |
| S2 | Средняя | `packages/core/src/serialize.ts:179` | Имя темы подставляется в `[data-theme="${themeName}"]`. Кавычка в имени ломает селектор (`a"],html[x="`), а `{`/`}` отлавливались только частично. | Исправлено: `assertSafeAttributeValue` в `resolve.ts:285` (HEAD) и `serialize.ts:125` (HEAD) |
| S3 | Низкая (гигиена) | `.cursor/hooks.json`, `.codex/hooks.json`, `.cursor/hooks/lifecycle.py`, `.swissknifeman/**`, `.claude/memory.env.ini`, `.cursor/memory.env.ini`, `.codex/state/**` | В публичном репо лежали локальные hooks с абсолютными путями `/home/<user>/...` и политикой fail-closed, а также логи сессий агентов. Секретов там нет, но есть путь к домашней директории и имя пользователя. У любого, кто клонирует репо с тем же агентом, hook вызовет несуществующий скрипт и, будучи fail-closed, может заблокировать работу. | Исправлено (`cd1f2a3`) |
| S4 | Инфо | История git | gitleaks 8.x (`git log --all`, 173 коммита): 0. trufflehog `git file://` (все ветки): 0 verified и 0 unverified. | Чисто |

Как устроен новый гард (`packages/core/src/css-safety.ts`, HEAD):
- `assertSafeCustomPropertyName` (`:37`): имя должно соответствовать `/^--[\w\-\u00A0-\u{10FFFF}]+$/u`, то есть ident custom property по CSS Variables L1.
- `assertSafeDeclarationValue` (`:48`): однопроходный токенайзер. Он учитывает строки, экранирование и баланс `()`/`[]`. Отвергаются:
  - `;` на верхнем уровне;
  - любые `{`/`}` вне строк;
  - комментарии `/*`;
  - незакрытые кавычки и скобки;
  - висячий `\`;
  - управляющие символы;
  - `</` и `<!--`, на случай инлайна в `<style>` при SSR.
- `assertSafeAttributeValue` (`:104`) для значений внутри `"…"` в атрибутных селекторах.

Ошибки обрезают payload в сообщении, чтобы не засорять логи. Валидный CSS (`color-mix(...)`, `url("a;b")`, `var(--a, 1px)`, `"Inter", sans-serif`) проходит. Это покрыто тестами, а CSS бенчмарк-корпуса совпадает байт-в-байт.

### 2.2 Дефекты корректности

| # | Где | Суть | Коммит |
|---|---|---|---|
| D1 | `packages/core/src/define.ts:84-85` | `/(px\|rem\|em\|%\|…)$/` и `/(ms\|s)$/` без якоря начала дают ложные совпадения: `'sans'` → duration, `'system'` → dimension. Ещё `:71`: `/^(#\|rgb…)/`, где `'#hashtag'` → color. | `b21b39a`: `DIMENSION_RE`, `DURATION_RE` и `COLOR_RE` по целому trimmed-литералу (HEAD `define.ts:93-104`) |
| D2 | `define.ts:108` `makeToken`, `:240` `validatePatchPaths` | `undefined`/`null`/`boolean`/`NaN`/функции принимались как лист → `--x: undefined;` | `682c572`: `assertValidLeaf` (HEAD `define.ts:157`), `BAD_VALUE` |
| D3 | `packages/core/src/formats/vite-delivery.ts:18-20`, `:136-154` | В манифесте `virtualModuleId?` и `relativePath?` были оба опциональными, и `delivery: 'file'` проходил без пути. | `1128b88`: дискриминированный union и runtime-гард (HEAD `:158`, `:178`) |
| D4 | `packages/cli/src/query/graph.ts:13`, `:18-20` | `capGraphPayload` обрезал `nodes` и `edges`, но не `order`, хотя параметр приходил: oxlint видел unused param. На больших графах payload не ограничивался. | `59b7887` (HEAD `:28-30`) |
| D5 | `packages/nuxt/package.json:40`, `:42` | `build`/`prepack` = `nuxt-module-build build` без `prepare`, а `tsconfig.json` расширяет `./.nuxt/tsconfig.json`. На чистом клоне и в CI сборка падает. Локально это маскировалось оставшейся `.nuxt/`. | `b6f23c4` |
| D6 | `define.ts:224` | Конвенция «тема `dark` → `color-scheme: dark`» проверялась через индексацию/`in`. | `5439ec7`: `Object.hasOwn` (HEAD `:297`) |
| D7 | `packages/core/src/model/build.ts:60` | `...(input.schemes ?? {})` — лишний fallback. | `7b37bcf` |

### 2.3 Типизация и архитектура

| # | Где | Суть | Что сделано |
|---|---|---|---|
| T1 | `packages/core/src/types.ts:91-92` | `ThemeDefinition<TSys>` со `sys: Tokenized<TSys>`: все токены `Token<TokenType>`, и тип группы терялся. | `WellKnownGroupTypes`, `GroupTokenType<G>`, `Tokenized<T, TType>`, `TokenizedSys<TSys>` (HEAD `types.ts:66-111`). `GROUP_TYPE_MAP … as const satisfies WellKnownGroupTypes` плюс type-guard полноты ключей, чтобы runtime и типы не расходились. |
| T2 | `define.ts` `defineTheme` / `types.ts` | Имена тем были `string`, `schemes` — `Record<string, …>`. | `defineTheme<const TSys, const TTheme extends string = never>`, `schemes?: Partial<Record<NoInfer<TTheme> \| 'base', …>>`. Опечатка в `schemes` даёт ошибку компиляции. `ResolvedTheme<TTheme>`, `themeVars(resolved, theme?: NoInfer<TTheme>)`. |
| T3 | `packages/core/src/internal/walk.ts:49`, `:56` | `walkTree(tree: TokenTreeInput)` вынуждал делать двойные касты `as unknown as TokenTreeInput` в resolve, to-dtcg, from-dtcg и model/*. | `TokenTreeLike` и guard `isSubtree`; касты удалены (`38a8a0a`). |
| T4 | `packages/vue/src/*` | `useTheme()` возвращал `string`. | `ThemeonRegister`, `ThemeNameOf<R>`, `ThemeName`, `ThemePreference` (HEAD `vue/src/types.ts:35-40`). Это паттерн module augmentation, как `Register` в TanStack Router и `RouteNamedMap` во vue-router. Без аугментации поведение прежнее (`string`). |
| T5 | `tsconfig.base.json` | Не было `exactOptionalPropertyTypes` и `noUnused*`; в коде встречались мёртвые параметры и импорты (13 warnings oxlint). | Строжайший набор флагов (`af498c9`). Опции на входе — `?: T \| undefined`, на выходе — условные spread'ы. |
| T6 | Корень репо | Lint без конфига: всё warning, exit 0. | `.oxlintrc.json` (`04e2504`). |

### 2.4 DX, документация и CI (не исправлялось, см. §6)

- Все scheduled workflow'ы на `main` красные, и это не только Build:
  - Performance (2026-10-06): бюджеты в `performance-baseline.json` сняты на более быстрой машине, а ceiling'и абсолютные.
  - Mutation (2026-10-05).
  - Browser (2026-09-30).
- 14 открытых dependabot-PR, все с красным CI. Они наследуют сломанный Build. Среди них мажоры TypeScript 7.0.2 и vitest 5.0.1.
- `pnpm typecheck` до `pnpm build` падает в `tests/integration`: `Cannot find module '@themeon/vite'`, тесты резолвят пакеты через `dist`. В CI порядок верный (build → typecheck), но локально это ловушка. Варианты: project references или `customConditions: ["source"]`.

---

## 3. Коммиты → обоснование

| # | Коммит | Concern | Почему |
|---|---|---|---|
| 1 | `b6f23c4 fix(nuxt): generate .nuxt types before building the module` | build | D5: чинит красный CI `verify` и `release` на `main`. |
| 2 | `cd1f2a3 chore(repo): stop tracking machine-local AI-agent state` | hygiene | S3. Удалено через `git rm --cached`, файлы на диске остались, `.gitignore` с комментарием (см. §3.1). |
| 3 | `b21b39a fix(core): infer dimension/duration only from whole numeric literals` | correctness | D1 + регрессионные тесты: `'Helvetica, Arial, sans'`, `'system'`, `'items'`, `'#hashtag'`, а также позитивные `'-0.5rem'`, `'.25em'`, `'1e2px'`, `'10cqi'`, `'2S'`, `'  16px  '`. Changeset `core-infer-type-whole-literal`. |
| 4 | `682c572 fix(core): reject undefined/null/boolean/non-finite token leaves` | correctness | D2, fail-loud `BAD_VALUE` с подсказкой «ссылка на несуществующий токен?». Changeset `core-reject-invalid-leaves`. |
| 5 | `f2c8cb5 fix(core): guard emitted CSS declarations against injection` | security | S1/S2: новый `css-safety.ts`, вызовы в `claim()`/`materialize()`/имени темы, раздел «Build channel» в `docs/architecture/security-model.md`. Changeset `core-css-declaration-guard`. |
| 6 | `38a8a0a refactor(core): let walkTree accept any readonly tree and drop double casts` | types | T3, без изменения поведения. |
| 7 | `5439ec7 feat(core): precise per-group token types for defineTokens/defineTheme` | types | T1, D6. Changeset `core-precise-token-types`. |
| 8 | `b80bc8a feat(core): carry literal theme names through ThemeDefinition and ResolvedTheme` | types | T2. Changeset `core-typed-theme-names`. |
| 9 | `1128b88 fix(core,vite): model the manifest CSS block as a discriminated union` | types + correctness | D3. Порядок полей JSON сохранён, так что манифест байт-совместим. Changeset `core-vite-manifest-delivery-union`. |
| 10 | `59b7887 fix(cli): cap graph payload order together with nodes` | correctness | D4, тест на 4200 токенов. Changeset `cli-graph-order-cap`. |
| 11 | `af498c9 build(ts): enable the strictest compiler flags across the workspace` | types | T5: около 91 поля опций, мёртвые параметры и импорты. Changeset `strict-optional-option-bags`. |
| 12 | `db99ce1 feat(vue): opt-in ThemeonRegister for typed theme names` | types/DX | T4: `types.test.ts`, новая ячейка матрицы типов `positive-typed-themes` (EOPT-потребитель), документация. Changeset `vue-theme-register`. |
| 13 | `7b37bcf chore: drop unused bindings and a redundant spread fallback` | hygiene | D7 и unused-находки oxlint. |
| 14 | `04e2504 build(lint): make oxlint correctness findings gating` | CI | T6. |
| 15 | `docs(audits): …` | docs | Копия этого отчёта в `audits/2026-10-06-typing-architecture.md`. |

API-отчёты (`etc/api/*.api.md`) регенерированы в тех коммитах, где меняется публичная поверхность: core, cli, colors, naive, vite и vue.

### 3.1 Решение по файлам AI-агентов

**Сняты с индекса и добавлены в `.gitignore`** (явно локальные или эфемерные):
- `.cursor/hooks.json` и `.cursor/hooks/`, `.codex/hooks.json` и `.codex/hooks/`: абсолютные пути машины автора, политика fail-closed;
- `.cursor/memory.env.ini`, `.claude/memory.env.ini`: локальная память агента;
- `.codex/state/` (jsonl-логи tool-вызовов сессии), `.swissknifeman/` (lock-файл и events.jsonl);
- превентивно: `.cursor/logs/`, `.cursor/state/`, `.claude/settings.local.json`.

**Оставлены:**
- `CLAUDE.md`: проектные инструкции для агентов с managed-блоками (`maind`, `swissknifeman`). Файл ведётся инструментами автора намеренно и секретов не содержит. Нужен ли он в публичном репо, решает владелец (см. вопрос 4).
- `.serena/project.yml` и `.serena/.gitignore`: проектный конфиг; собственный `.gitignore` Serena уже исключает кэш.
- `.swissknife.json`: общий конфиг инструмента, в отличие от его runtime-каталога `.swissknifeman/`.

**Оговорка:** у тех, кто уже клонировал репо, после pull эти файлы будут удалены из рабочей копии, так как git удаляет снятые с отслеживания файлы при merge. Если автору hooks нужны локально, их надо сохранить до pull или восстановить через `git show <old>:path`.

---

## 4. Эксперименты

1. **Строжайший tsconfig.** Включены `exactOptionalPropertyTypes`, `noImplicitOverride`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `noUnusedLocals`, `noUnusedParameters`, `allowUnreachableCode: false` и `allowUnusedLabels: false`. Для `packages/nuxt` дополнительно `noUncheckedIndexedAccess`: в остальных пакетах он уже был. **Принято.** EOPT нашёл реальные места, где `undefined` явно прокидывался в опции (`diagnostics/from-legacy`, `dtcg/diagnostics`, `cli build/semantic-diff`).
2. **`noPropertyAccessFromIndexSignature`.** **Отклонено.** Пробное включение дало большой объём механических правок `obj.x` → `obj['x']`, в основном в тестах и скриптах, и ни одного найденного дефекта. Шум перевешивает пользу; при `noUncheckedIndexedAccess` безопасность уже обеспечена.
3. **oxlint с категориями correctness + suspicious.**
   - correctness: 13 находок, все исправлены или аннотированы. **Принято как error.**
   - suspicious: около 100 warnings, в основном `unicorn/no-array-sort` (56 шт.), где `toSorted` упирается в target и копирование. **Отклонено** как шумное.
   - `no-explicit-any`: 31 находка, все в тестах naive и `docs/.vitepress/config.ts`, в исходниках пакетов ни одной. В исходниках это **error**, тесты и docs исключены.
4. **Типизированный реестр тем во Vue (Register pattern) против генерика на `useTheme<T>()`.** Генерик требует передавать тип в каждом вызове и легко расходится с реальными темами. Глобальная аугментация задаётся один раз и совместима с будущей кодогенерацией в Nuxt (`addTypeTemplate`). **Выбран Register.**
5. **Проверка CSS-гарда на реальном выходе.** CSS бенчмарк-корпуса `small` совпадает байт-в-байт с `main`: `cssSha256` идентичен. На корпусе нет ложных срабатываний, вывод не изменился.
6. **Perf-сравнение `main` и ветки на одной машине** (два чередующихся прогона, медианы в мс):

| Сценарий | main | ветка |
|---|---|---|
| small.compileWarm | 10.9 / 10.0 | 11.0 / 11.9 |
| medium.compileWarm | 100.8 / 95.6 | 134.5 / 105.7 |
| large.compileWarm | 529 / 514 | 525 / 603 |
| wideComponent.compileWarm | 200.5 / 189.4 | 192.5 / 190.7 |
| tenantPatch.compileWarm | 138.2 / 100.6 | 98.5 / 100.7 |
| small.dtcgRoundTrip | 3.76 / 3.83 | 3.58 / 3.04 |

Разброс между прогонами (±30% на одном и том же коде) больше разницы между ветками. Систематического регресса нет. `check:perf` падает **и на `main`** на этой машине (абсолютные бюджеты, см. §6).

---

## 5. Baseline и результат после изменений

| Проверка | `main` (baseline) | Ветка (после) |
|---|---|---|
| `pnpm build`, чистый клон | ❌ nuxt: `failed to resolve "extends":"./.nuxt/tsconfig.json"` (так же в CI) | ✅ (проверено `git clone` → `install --frozen-lockfile` → `build`) |
| `pnpm lint` | ⚠️ 13 warnings, exit 0, ничего не гейтит | ✅ 0 находок, correctness = error |
| `pnpm typecheck` (после build) | ✅ | ✅ на строжайших флагах |
| `pnpm test` / `test:coverage` | ✅ 1462 passed + 1 skipped (73 файла) | ✅ **1544** passed + 1 skipped (75 файлов) |
| Coverage-сводка (scope vitest config) | Stmts 82.71%, Branch 72.49%, Funcs 90.47%, Lines 83.43% | Stmts 82.79%, Branch 72.49%, Funcs 90.47%, Lines 83.52% |
| Гейт критического покрытия | ✅ 12 файлов | ✅ 12 файлов |
| `check:api` | ✅ 9 пакетов | ✅ 9 пакетов (отчёты обновлены) |
| `test:types` (матрица) | ✅ 6 | ✅ **7** (+ `positive-typed-themes`) |
| int-fast | ✅ 41 | ✅ 41 |
| `test:stylelint` | ✅ 5 | ✅ 5 |
| `check:docs-architecture` | ✅ 12 arch + 5 ADR | ✅ |
| `check:manifests` | ✅ | ✅ |
| `check:pack` (attw/publint) | ✅ | ✅ |
| `check:perf` | ❌ на этой машине (абсолютные бюджеты) | ❌ так же; паритет с `main`, см. §4.6 |
| gitleaks / trufflehog | — | 0 / 0 |

Не запускались: `test:int` browser/e2e (Playwright), `test:mutation` (Stryker, долго), `test:consumers`.

---

## 6. Отложенные идеи

1. **Nuxt: выводить `themes` из определения и кодогенерировать аугментацию `ThemeonRegister`** через `addTypeTemplate`. Тогда типизированные имена тем во Vue/Nuxt появятся без ручной аугментации.
2. **Nuxt: прокинуть опции resolve/serialize** (`layer`, `selector`, `themeAttribute`) в опции модуля.
3. **Проверка ссылок между группами на уровне типов.** Например, `'{color.brand}'` в `sys` проверяется по ключам `ref` через template literal types. Риск — время компиляции на больших деревьях; нужен бенчмарк `tsc --extendedDiagnostics`.
4. **DTCG `$type` теряется у неизвестных групп при round-trip.** Стоит хранить исходный `$type` в `$extensions`, по аналогии с `studio.tokens.originalType` в sd-transforms.
5. Хелпер **`themeNames(def)`**, возвращающий `readonly TTheme[]` для UI-переключателей.
6. **Требование TS ≥ 5.4 у потребителей**, потому что в публичных `.d.ts` теперь есть `NoInfer`. Нужно зафиксировать в README или `peerDependenciesMeta` и в матрице типов, сейчас там текущий TS.
7. **Perf-бюджеты.** Перейти на относительное сравнение с `main` в одном job (как `hyperfine`/`tinybench` A/B) или на нормировку по калибровочному прогону. Абсолютные ceiling'и гарантированно краснеют на других раннерах.
8. **Починить scheduled Mutation и Browser**, сейчас они красные. Затем прогнать 14 dependabot-веток. Мажоры TS 7 (нативный компилятор) и vitest 5 — отдельными ветками.
9. **`typecheck` без предварительного build:** project references или `customConditions: ["source"]` с экспортом `source` в пакетах.
10. **Расхождения README и npm:** заявленный в README статус пакетов не совпадает с фактическим состоянием в npm. Нужно сверить.
11. oxlint: позже включить выборочные правила из `suspicious` и `typescript/consistent-type-imports`.
12. Перевести hooks AI-агентов в шаблон, например `.cursor/hooks.example.json` с относительными путями, если команде они нужны.

---

## 7. Вопросы ревьюеру

1. **Fail-loud изменения поведения.** `BAD_VALUE` на `undefined`/`null`/`boolean` и `UNSAFE_CSS_TOKEN` на опасные значения теперь бросают исключения там, где раньше молча генерировался (битый) CSS. Устраивает ли это как patch/minor в pre-1.0, или нужен режим `warn` на один релиз?
2. **Строгие имена тем.** `themeVars(resolved, 'typo')` и `schemes: { typo: 'dark' }` теперь не компилируются, если имена тем выведены литерально. Код, который передаёт `string` из рантайма, должен расширить тип: `ResolvedTheme<string>` или проверка `name in resolved.themes`. Нужен ли более мягкий overload?
3. **Изменения типа вывода (D1).** Значения вроде `'Helvetica, Arial, sans'` или `'items'` в неизвестных группах больше не получают `duration`. Они уходят в документированный fallback (`dimension` + warn), как любое нераспознанное значение. `'#hashtag'` больше не `color`. Это влияет на `$type` в DTCG-экспорте. Нужна ли запись в migration guide? И не пора ли заменить fallback `dimension` на явную ошибку или `string`-тип (вне DTCG)?
4. **AI-agent hooks и `CLAUDE.md`.** Хранить ли hooks в репо как шаблоны (п. 6.12) или они строго локальные? Должен ли `CLAUDE.md` с инструкциями под локальные `maind`/`swissknifeman` оставаться в публичном репо?
5. **Минимальная версия TS для потребителей** (п. 6.6): 5.4 подходит?
6. Нужно ли гейтить `check:perf` в CI до перехода на относительные бюджеты?

---

## 8. Источники

- DTCG Format Module 2025.10, первая стабильная версия: https://www.designtokens.org/TR/2025.10/format/ и анонс https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/
- Style Dictionary и DTCG: https://styledictionary.com/info/dtcg/
- Tokens Studio sd-transforms (`originalType` в `$extensions`): https://github.com/tokens-studio/sd-transforms
- Panda CSS tokens и semantic tokens: https://panda-css.com/docs/theming/tokens
- Vanilla Extract `createThemeContract`, типобезопасный контракт темы: https://vanilla-extract.style/documentation/api/create-theme-contract/
- Tailwind CSS v4 `@theme`: https://tailwindcss.com/docs/theme
- Radix Themes: https://www.radix-ui.com/themes/docs/theme/overview ; shadcn/ui theming (CSS variables, OKLCH): https://ui.shadcn.com/docs/theming
- Material Color Utilities: https://github.com/material-foundation/material-color-utilities ; OKLCH: https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/oklch
- `@property`: https://developer.mozilla.org/en-US/docs/Web/CSS/@property ; `@layer`: https://developer.mozilla.org/en-US/docs/Web/CSS/@layer
- CSS Syntax L3, токенизация (основа гарда): https://www.w3.org/TR/css-syntax-3/#tokenization ; CSS Variables L1, имя custom property: https://www.w3.org/TR/css-variables-1/#defining-variables
- Vite Plugin API, virtual modules: https://vite.dev/guide/api-plugin
- Nuxt Kit `addTypeTemplate`: https://nuxt.com/docs/api/kit/templates#addtypetemplate
- TypeScript: `exactOptionalPropertyTypes` https://www.typescriptlang.org/tsconfig/#exactOptionalPropertyTypes ; `NoInfer` (5.4) https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-4.html ; `const` type parameters (5.0) https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-0.html
- Register pattern: https://tanstack.com/router/latest/docs/framework/react/guide/type-safety
- oxlint config: https://oxc.rs/docs/guide/usage/linter/config.html
