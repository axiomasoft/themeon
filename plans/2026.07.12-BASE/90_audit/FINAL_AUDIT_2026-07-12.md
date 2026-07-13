# THEMEON — Final Audit (2026-07-12)

**Кто:** themeon-final-audit / Fable (principal-режим), 4 линзы: architecture, security-integrity, phase-facts, oss-readiness.
**Скоуп:** `~/projects/packages/themeon` (main, HEAD `89c6ae6`) + план `plans/2026.07.12-BASE/` (vault).
**Метод:** verified findings — все HIGH/CRITICAL прошли verify-проход, опровергнутые исключены.

---

## Вердикт: 🔴 RED

Выжили **3 HIGH** (0 CRITICAL), 8 MED, 12 LOW.

Ключевой мета-факт: **аудит запущен до терминальности фаз** — по plan.md §2б `themeon-final-audit` предполагался после закрытия фаз, а фактическое состояние: P1 = 3/8, P2–P7 = 0. Значительная часть решений D2/D4/D6–D17 не проверяема кодом по построению — их «соблюдение» было бы вердиктом по отсутствию. Этот RED — не «архитектура провалена», а «релизная готовность отсутствует + в уже написанном ядре есть подтверждённая порча дерева токенов + в дизайне P6 дыра класса stored-XSS».

---

## 1. Таблица находок

### HIGH

| # | Линза | Summary | Failure scenario | File |
|:--|:--|:--|:--|:--|
| H1 | architecture | Финальный аудит запущен до терминальности фаз: P1 = 3/8 (нет resolve.ts / CSS-сериализатора / runtime applier / DTCG-моста / API-freeze); `index.ts` экспортирует `THEMEON_CORE_STUB` и НЕ экспортирует `defineTokens`/`defineTheme`/naming — публичного API-контракта P1 не существует. D2 (микро-резолвер), D4 (один naming-движок build+runtime), P-D13/14/15/16 и все D6–D17 невозможно подтвердить кодом | plan.md §2б требует запуск после терминальности (plan.md:74-78), Status Board показывает P1 In progress. naming.ts написан, но ни один потребитель его не вызывает — D4-паритет недоказуем; публикация пакета сейчас дала бы потребителю stub-константу и типы без реализации | `packages/core/src/index.ts` |
| H2 | security-integrity | `assignByPath` (define.ts:126,129) молча портит дерево токенов на ключе `__proto__`: присваивание `node[key] = {}` идёт через унаследованный setter и ПОДМЕНЯЕТ прототип вместо own-property. `Object.hasOwn`-гейт защищает чтение, но не сток записи. Воспроизведено эмпирически | `defineTokens('color', JSON.parse('{"__proto__":{"x":"#fff"},"primary":"#00f"}'))` (путь через будущий `fromDTCG` — недоверенный внешний JSON) → токен `x` исчезает из `Object.entries`/`walkTree`/`freezeDeep`/сериализации, но читается через prototype chain — тема молча теряет переменные, код с ссылками на них компилируется. Лист `__proto__` делает замороженный Token прототипом группы: соседи наследуют `.type`/`.path`/`.value` (verified). Фикс: reject/`Object.defineProperty` для `__proto__`/`constructor`/`prototype` или null-prototype/Map | `packages/core/src/define.ts` |
| H3 | security-integrity | Дизайн-дыра P6 (P6.md — пустой скелет; D15): `serializeThemePatch` → CSS, инжектируемый сервером в `<head>` до paint, НЕ имеет закреплённого требования экранировать/отклонять CSS/HTML-метасимволы в значениях тенанта; у APCA-гейта публикации нет заявленной fail-closed семантики | Значение цвета тенанта `red}</style><script>alert(document.cookie)</script>`, сериализованное в `<style>` — stored XSS на субдомене тенанта; одиночная `}` — произвольная CSS-инъекция (эксфильтрация через `url()`/attribute selectors). «APCA-чек при публикации» без явного «провал БЛОКИРУЕТ публикацию». Оба инварианта обязаны войти в Definition of Detailed P6 + JSON-schema (строгая грамматика значений per TokenType); в core сейчас ноль валидации значений (`BAD_VALUE` объявлен в errors.ts:5, не используется) | `plans/.../phases/P6.md`, `00_MASTER_PLAN.md §4.9/D15` |

### MED

| # | Линза | Summary | Failure scenario | File |
|:--|:--|:--|:--|:--|
| M1 | architecture | Дрейф P-D7/D12 без нового D#: stub-канон package.json содержит `sideEffects:false`, тогда как D12 фиксирует `sideEffects:["**/*.css"]` как канон против tree-shake-багов (R-06) | P2 копирует «канон» в `@themeon/css` — bundler вырезает `import '@themeon/css/reset.css'`, приложение молча остаётся без reset/@layer-каркаса — ровно тот класс багов, от которого D12 защищался | `packages/core/package.json:6` |
| M2 | architecture | `validatePatchPaths` (define.ts:216-238) проверяет только существование ключей, но пропускает патч-лист поверх подгруппы базы — инвариант структуры (D3) нарушается молча; тест-кейса нет | Тенант-патч `{ color: { bg: '#0f0' } }` при базе `color.bg = { page, subtle }` проходит гейт; резолвер P1.4 эмитнет `--color-bg` вместо `--color-bg-page`/`--color-bg-subtle` — тема тенанта молча теряет переменные до paint | `packages/core/src/define.ts` |
| M3 | architecture | Предикат `TextStyleValue` продублирован: walk.ts:23,36-41 и define.ts:55-66 (две копии `TEXT_STYLE_KEYS`), синхронизация — только комментарием — класс «две копии расходятся» (R-01 §1), против которого написан сам walk.ts | P1.5+ расширяет TextStyleValue правкой одного Set → `walkTree` и `isTextStyleValue` расходятся: композит клеймится как dimension, не замораживается, companion-var не эмитится; не ловится ни компилятором, ни тестами | `packages/core/src/internal/walk.ts` |
| M4 | phase-facts | Working tree не чист и противоречит правилу плана: M README.md + untracked `plans/2026.07.12-BASE/` (копия vault-папки) в код-репо, тогда как plan.md §2 / P0.md фиксируют «Vault-файлы — источники, в код-репо не копируются»; механизм `brain sync plans ThemeOn` нигде не оформлен решением | Сверки plan-close P1.2/P1.3 «дерево чистое» теперь ложны; следующий коммит молча уводит внутренние план-документы в публичный MIT-репозиторий; двусторонний sync без протокола = два расходящихся источника истины | `README.md` (M) + `plans/` (untracked) |
| M5 | phase-facts | P0 закрыта при невыполненном критерии завершения «CI-workflow зелёный на матрице Node [22,24]»: git remote отсутствует, workflow ни разу не исполнялся | Ошибка окружения GitHub-раннера обнаружится только при первом push — уже поверх закрытых P1+ фаз, ретроактивно ломая «зелёный» статус P0 | `phases/P0.md` (P0.4 Validation), `.github/workflows/ci.yml` |
| M6 | oss-readiness | README.md:8-10 ссылается на `plans/2026.07.12-BASE/plan.md` (untracked) и упоминает приватный Brain-vault workflow | На GitHub/npm ссылка 404 для любого посетителя; README светит приватный тулинг автора — урон первому впечатлению на landing-странице репо | `README.md:8` |
| M7 | oss-readiness | В `packages/core/package.json` нет discovery-метаданных (description/repository/keywords/author/homepage/bugs), нет README в пакете — tarball без README (verified) | npm-страница `@themeon/core` полностью пустая, provenance/repository-верификация невозможна, пакет не находится поиском | `packages/core/package.json:1` |
| M8 | oss-readiness | `apps/playground` невидим для CI: root `build` фильтрует только `./packages/*`, нет typecheck-скрипта, при этом импортирует `THEMEON_CORE_STUB`, помеченный «Removed in P1.8» | P1.8 удаляет stub → `app.vue:2` ломается, CI остаётся зелёным; единственный smoke-потребитель ядра молча гниёт до ручного `nuxt dev` | `apps/playground/app.vue:2` |
| M9 | security-integrity | `validatePatchPaths` — половина гейта: проверяет что путь СУЩЕСТВУЕТ, но не что адресует ЛИСТ (дубль-подтверждение M2 с security-стороны: это тот самый runtime-рубеж, на который опирается D15) | Патч заменяет подгруппу скаляром → токены поддерева молча отсутствуют в блоке темы и фолбэчатся на `:root` — тёмная тема тихо показывает светлые фоны. Гейт обязан утверждать «лист патча ↔ лист базы» (+ совместимость типов значений, когда появится BAD_VALUE) | `packages/core/src/define.ts:216-238` |
| M10 | security-integrity | Naming engine (naming.ts:55-101) — назначенный ЕДИНСТВЕННЫЙ path→CSS-var трансформер — без allowlist символов: `;{}<>()/*:` проходят в branded `CssVarName`/`CssVarRef` (verified); `NAME_COLLISION` (errors.ts:6) объявлен, не реализован | Ключ токена из недоверенного источника (fromDTCG, P1.7) вида `foo;}html{background:url(//evil)}` → прямая инъекция в stylesheet через «типобезопасный» CssVarName при эмите `${varName}: ${value};`. Отдельно: `bgBase` / `bg.base` / `bg_base` коллапсируют в один var без ошибки — молчаливый last-writer-wins. Закрепить в P1.4/P1.5: грамматика сегмента `[a-z0-9-]` post-kebab + collision-чек включая алиасы | `packages/core/src/naming.ts:55-101` |
| M11 | security-integrity | `defineTheme` (define.ts:206) замораживает record тем только ПОВЕРХНОСТНО; вложенные патч-объекты — мутабельные ссылки вызывающего — TOCTOU-зазор против UNKNOWN_PATH-гейта | Сервер валидирует патчи на старте, позже код мутирует исходный объект патча — мутация обходит `validatePatchPaths`; инвариант «ключи ⊆ базы», заверенный на define-time, не держится на resolve-time. Патчам нужен `freezeDeep` (или ре-валидация в `resolveTheme`); type-level Readonly не защищает multi-tenant JS runtime | `packages/core/src/define.ts:206` |

*(M9 пересекается с M2 — одна дыра, две линзы; фиксится одним изменением гейта.)*

### LOW

| # | Линза | Summary | Failure scenario | File |
|:--|:--|:--|:--|:--|
| L1 | architecture | P-D8 закодирован только в корневом private package.json: у публикуемого `@themeon/core` нет `engines` — floor >=22.18.0 не попадает в артефакт публикации | Потребитель на Node 20 ставит пакет без предупреждения; падение в рантайме у потребителя, а не на install. Требует явного решения: floor — требование сборки или контракт потребителя | `packages/core/package.json` |
| L2 | architecture | Дрейф P-D5: `apps/playground` пинует nuxt `'4.4.8'` хардкодом мимо pnpm catalog | P3 добавляет `@themeon/nuxt` со своим пином в catalog — две копии версии Nuxt расходятся, playground тестирует модуль не на той версии | `apps/playground/package.json` |
| L3 | architecture | `pnpm-workspace.yaml:16-36`: `minimumReleaseAgeExclude` (20 строк) без самой настройки `minimumReleaseAge` в репо | Либо мёртвый конфиг-шум, либо опора на глобальный `~/.npmrc` конкретной машины — CI ставит пакеты по другим правилам; ни один P-D# это не фиксирует | `pnpm-workspace.yaml:16-36` |
| L4 | architecture | Status Board рассинхронизирован: plan.md:99 показывает P1 «1/8» при фактических 3/8 (Update Log + git) — нарушение Execution Rule «статус обновляется В ПЛАНЕ» | Следующая exec-сессия/скрипт переисполняет закрытые P1.1–P1.3 поверх кода либо неверно оценивает готовность для гейтов §2б | `plans/2026.07.12-BASE/plan.md:99` |
| L5 | phase-facts | `phases/P1.md` повреждён: NUL-байт (строка 433, code-block P1.4) — `file(1)` видит 'data', `grep` без `-a` молча возвращает пусто | Скриптовый парсинг плана (themeon-phase-dev.js, plan-close grep-сверки) видит «ничего не найдено» вместо содержимого — воспроизведено в этом аудите; ложная запись уже попала в recon-факты | `plans/.../phases/P1.md:433` |
| L6 | phase-facts | Пост-review фикс `72749c5` закрывает prototype-chain доступ не полностью, хотя commit-message заявляет закрытие «prototype pollution» (детализация H2 в разрезе фактов фазы) | Own-ключ `__proto__` из JSON.parse → поддерево пишется в прототип: невидимо для walkTree/Object.keys, не замораживается — ровно тот класс порчи, который фикс декларирует устранённым | `packages/core/src/define.ts:126-128` |
| L7 | phase-facts | Scope drift P0.5: коммит `ab06b0c` правит `pnpm-workspace.yaml` (allowBuilds: esbuild/@parcel/watcher) вне Files item'а; отражено только в Completion Notes, Known Deviations = «—» | Item закрыт 🟢 «без отклонений» при фактической правке вне Scope; allowBuilds действует на весь workspace — прецедент для нативных build-скриптов, аудитор по полю Known Deviations его не видит | `phases/P0.md` (P0.5) vs `ab06b0c` |
| L8 | oss-readiness | Нет `publishConfig.access:'public'` в package.json скоуп-пакета; public access только в `.changeset/config.json` | Любой publish-путь кроме `changeset publish` падает с E402 — или misconfigured flow публикует ничего при зелёном CI | `packages/core/package.json:3` |
| L9 | oss-readiness | SemVer-поток не задействован: версия 0.0.0, `.changeset/` пуст — три feature-коммита (P1.1–P1.3) без единого pending changeset | Первый `changeset version` не даёт bump → релиз публикует v0.0.0; changelog всей P1-работы теряется без backfill | `.changeset/config.json:1` |
| L10 | oss-readiness | `engines` только в корне монорепо; `packages/core` не декларирует floor (пересекается с L1 — одна правка) | Пакет ставится на Node 18/20 без предупреждения; контракт поддержки не заявлен, баг-репорты не триажатся против floor | `packages/core/package.json:1` |
| L11 | oss-readiness | Публикуемые .d.ts несут русскоязычный JSDoc (28 строк кириллицы в dist/index.d.ts) | Международный потребитель MIT-пакета видит русские hover-доки в IDE на каждом экспортируемом типе — нужен EN-проход до публикации | `packages/core/src/types.ts:3` |
| L12 | oss-readiness | README статус-строка устарела («P0 skeleton, no theming logic yet») при закоммиченных P1.1–P1.3; нет release/publish workflow (только ci.yml); npm-имя не перепроверено офлайн (не блокер, unverified) | Контрибьюторы/ранние пользователи по README считают, что логики нет; первый релиз — ad-hoc ручной publish со всеми access/metadata-проблемами выше | `README.md:6` |
| L13 | security-integrity | `inferByValue` (define.ts:77-90): молчаливая мисклассификация неизвестных групп (строка на `s` → duration, `ex`/`ch` → dimension) без warning; при этом легитимный fallback шумит безусловным `console.warn` в prod с user-controlled текстом пути | `{ brandFont: { body: 'sans' } }` → токен молча типирован duration; ошибка всплывает далеко от источника (неверный DTCG `$type`, сломанный адаптер). Prod-warn с влияемыми атакующим строками пути — шум/инъекция в серверные логи | `packages/core/src/define.ts:77-90` |
| L14 | security-integrity | `legacyV0Alias` (legacy-v0.ts:53-63) эмитит беспрефиксные алиасы в глобальный namespace (`--bg-page`, `--primary`) без collision-чека с каноническими именами других групп | Цветовая роль `z.10` / `ease.out` → алиас `--z-10`/`--ease-out` коллидирует с каноном групп z/ease; при эмите обоих в один `:root` последняя декларация молча побеждает. NAME_COLLISION в P1.4 обязан покрывать и `ResolvedTheme.aliases` | `packages/core/src/aliases/legacy-v0.ts:53-63` |

---

## 2. Разбор решений D1–D17 (00_MASTER_PLAN.md §5)

| D# | Решение (кратко) | Статус | Комментарий |
|:--|:--|:--|:--|
| D1 | `@themeon/*`, MIT, репо | ⚠️ Дрейф (MED/LOW) | Имя подтверждено свободным (P-D9, офлайн не перепроверено — L12). Но OSS-упаковка публикуемого пакета не соответствует MIT-амбиции: пустая npm-страница (M7), нет publishConfig (L8), русский JSDoc (L11), README со ссылками на приватный vault (M6) |
| D2 | TS-first, микро-резолвер, DTCG-мост | ❓ Не подтверждаемо | `defineTokens`/`defineTheme` есть (P1.2), но resolve.ts и to/fromDTCG не существуют (H1). Написанная часть TS-first соблюдена (typed refs через leaf-wrapping, P-D12 — реализовано) |
| D3 | ref→sys→comp; темы мутируют только sys | ⚠️ Дрейф (MED) | Форма патча sys-слоя реализована, но гейт `validatePatchPaths` — половинчатый: пропускает лист-поверх-подгруппы (M2/M9), инвариант структуры нарушается молча |
| D4 | CSS vars; ОДИН naming-движок build+runtime | ❓ Не подтверждаемо + ⚠️ | naming.ts единственный (grep подтвердил отсутствие второго kebab), но ни один потребитель его не вызывает — паритет недоказуем по построению (H1). Плюс: без allowlist и без NAME_COLLISION (M10) движок не готов быть «единственным доверенным» |
| D5 | Tailwind-v4 namespaces + легаси-алиасы | ✅/⚠️ | Реализовано в P1.3 (NAMESPACE_TABLE, double-dash companion, legacyV0Alias изолирован). Дрейф: беспрефиксные алиасы без collision-чека (L14) |
| D6 | `data-theme`, N тем, color-scheme sync | ❓ Не реализовано | P1.4–P1.6 отсутствуют; P-D16 (конвенция dark) не проверяемо |
| D7 | OKLCH, `@themeon/colors`, APCA | ❓ + 🔴 дизайн-дыра | P2 не начата. APCA-гейт в D15/P6 без fail-closed семантики — вошло в H3 |
| D8 | `@layer themeon.*` | ❓ Не реализовано | P2 не начата |
| D9 | Layout-примитивы в `@layer composition` | ❓ Не реализовано | P2 не начата |
| D10 | Контракт адаптера `toNative()`+`cssBridge()` | ❓ Не реализовано | P3/P4 не начаты |
| D11 | Orphan-риск Naive UI изолирован | ❓ Не проверяемо | Архитектурное решение без кода |
| D12 | pnpm+tsdown, ESM-only, `sideEffects:["**/*.css"]` | 🔶 ДРЕЙФ (MED) | Стек соблюдён (tsdown, ESM-only, exports-map, attw/publint зелёные), но канон-файл содержит `sideEffects:false` вопреки букве D12 — изменение без нового D# (M1). Для core эквивалентно, для P2-копий — тот самый R-06-баг |
| D13 | Nuxt-модуль, dev-watcher по хэшу | ❓ Не реализовано | P3 не начата; смежный дрейф: playground пинует nuxt мимо catalog (L2, P-D5) |
| D14 | Breakpoints: один источник | ❓ Не реализовано | — |
| D15 | Multi-tenant: JSONB-патч, `serializeThemePatch`, инжект до paint, APCA-чек | 🔴 Дизайн-дыра (HIGH) | P6.md — пустой скелет. Нет требований экранирования значений (stored XSS / CSS-инъекция) и fail-closed для APCA (H3); runtime-рубеж, на который D15 опирается уже сейчас, половинчат (M9) и обходим мутацией (M11); BAD_VALUE объявлен, не используется |
| D16 | Без Sass, native CSS | ❓ Не реализовано | CSS-эмита ещё нет |
| D17 | Пилот-порядок dterema→vintera→octoclick | ❓ Не начато | P7 = 0/1 |

**Итог по решениям:** явных дрейфов, требующих нового D# или правки: **D12 (sideEffects)**, **D15 (escaping + fail-closed APCA — обязаны войти в Definition of Detailed P6)**, D3/D4 — правки гейтов в оставшихся item'ах P1. Остальное — не проверяемо до исполнения фаз.

## 3. Состояние фаз (recon)

| Фаза | Статус | Items | Примечания аудита |
|:--|:--|:--|:--|
| P0 | 🟠 Done with deviations | 3/5 🟢 + 2/5 🟠 | Критерий «CI зелёный на GitHub» фактически не выполнен — remote отсутствует (M5); scope drift P0.5 (L7) |
| P1 | 🟡 In progress | 3/8 факт (Board врёт «1/8» — L4) | P1.1 🟠, P1.2 🟠, P1.3 🟢; P1.4–P1.8 не начаты; P1.md повреждён NUL-байтом (L5) |
| P2 | ⬜ Not started | 0/7 | — |
| P3 | ⬜ Not started | 0/6 | — |
| P4 | ⬜ Not started | 0/6 | — |
| P5 | ⬜ Not started | 0/4 | — |
| P6 | ⬜ Not started | 0/4 | Пустой скелет + дизайн-дыра H3 — детализация обязана закрепить security-инварианты |
| P7 | ⬜ Not started | 0/1 | — |

## 4. Suggested Command

Вердикт **RED** → пересборка/детализация затронутых фаз через plan-design:

```
/task:plan-design THEMEON P1   # ре-детализация оставшихся P1.4–P1.8 с закреплением инвариантов:
                               #  - фикс H2 (__proto__-sink в assignByPath: reject/defineProperty/null-prototype) — до P1.4
                               #  - M10: allowlist [a-z0-9-] post-kebab + NAME_COLLISION включая алиасы (L14) — в P1.4/P1.5
                               #  - M2/M9: гейт «лист патча ↔ лист базы» + тест; M11: freezeDeep патчей или ре-валидация в resolveTheme
                               #  - M3: один предикат TextStyleValue; L13: dev-gate у console.warn
/task:plan-design THEMEON P6   # Definition of Detailed с пином H3: строгая грамматика значений per TokenType
                               # (OKLCH/hex-only для color), reject метасимволов в serializeThemePatch,
                               # fail-closed APCA-гейт публикации
```

Сопутствующее (вне plan-design, до следующего exec): починить NUL-байт в P1.md (L5), синхронизировать Status Board (L4), решить судьбу `plans/` в код-репо и M README (M4/M6 — оформить P-D# про brain sync), канонизировать `sideEffects` (M1 → новый D# или правка файла). Финальный аудит **перезапустить после терминальности фаз** (H1) — текущий вердикт не является вердиктом по архитектуре целиком.

---
*Отчёт сгенерирован themeon-final-audit (Fable), 2026-07-12. Источник находок: 4 линзы + verify-проход; опровергнутые HIGH/CRITICAL исключены до синтеза.*
