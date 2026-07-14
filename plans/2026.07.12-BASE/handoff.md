# HANDOFF — 2026-07-14 — after P8.3

**Next:** Исполнить **P8.4 — `@themeon/nuxt`: загрузка темы + живой dev-watcher** (четвёртый item фазы
P8). ТЗ детерминировано `findings/P8-nuxt-vue-runtime.md` до эталонного кода. После коммита —
ОБЯЗАТЕЛЬНЫЙ adversarial-review (opus/xhigh, P-D51).

| Параметр | Значение |
|:--|:--|
| Model | **sonnet** |
| Thinking | **medium** (пинится самим `/task:plan-exec`) |
| Context | **continue (/clear) — manual item** |
| Суть | Починить `themeon.theme`, который в Nuxt не грузился НИКОГДА (`interopDefault` давится на замороженном объекте `defineTheme`); удалить `hash-dir.ts`, дедуп — по сгенерированному CSS |

```
/task:plan-exec 2026.07.12-BASE P8.4
```

**Cold-start reads (по порядку):**
1. `plans/2026.07.12-BASE/phases/P8.md` — Phase Context (инварианты фазы) + item **P8.4** целиком.
2. `plans/2026.07.12-BASE/findings/P8-nuxt-vue-runtime.md` — канон фикса, эталонный код, RAG.
3. `plans/2026.07.12-BASE/plan.md` — §3 Routing (строка P8.1–P8.14), §5 Decision Log (P-D63), §4 Status
   Board.
4. `packages/nuxt/src/module.ts`, `packages/nuxt/src/internal/hash-dir.ts`, `packages/nuxt/src/types.ts`
   (текущий код).

**Done:** (эта сессия)

- **P8.3 закрыт 🟢 Done.** `packages/tailwind/src/bridge.ts`: мост переписан на `@theme reference` +
  литеральные значения (P-D54, supersedes P-D31) — Tailwind при `reference` НИКОГДА не эмитит
  переменные ThemeOn в `:root, :host`, порядок подключения CSS больше не проблема. `--breakpoint-*` —
  литерал ВСЕГДА (Blocker #4: `var()` невалиден в `@media`); `--shadow-*` — единственное исключение,
  остаётся `var()` (иначе dark-своп теней не доходит). Companion (`--x--line-height`) уже был включён
  в прежнем коде, поведение не менялось.
- `packages/tailwind/src/bridge.test.ts` переписан под новую форму (13 тестов); `tailwind-compile.test.ts`
  — старый ассерт `selfRefCount===1` (закреплял цикл-баг) заменён на «var(--x, литерал)» + «Tailwind не
  эмитит сам».
- 8 новых интеграционных тестов через настоящую трубу: `tests/integration/src/fast/tailwind-bridge.test.ts`
  (6: `md:`-литерал в `@media`, нулевая эмиссия, анти-цикл, инвариантность порядка O1/O2/O3, companion,
  форма bridge.css) + `tests/integration/src/browser/tailwind-bridge.test.ts` (2: реальный Chromium —
  dark-своп/spacing/text-companion/`md:` на 1000px vs 400px; `shadow-md` своп в dark). **7 тестов были
  красными до фикса** (доказано `git stash packages/tailwind/src/bridge.ts` + ребилд + прогон, включая
  живой Chromium: `md:bg-action-primary` на 1000px давал `rgba(0,0,0,0)`).
- `packages/tailwind/README.md` переписан (секция "Why `@theme reference`", "Limitation: breakpoints…").
- Downstream-правка отдельным коммитом (`5110a87`): `packages/cli/{templates.ts, commands/build.ts,
  README.md, src/build.test.ts, src/init.test.ts}` — ссылались текстом/ассертом на устаревший
  `@theme inline`.
- Валидация item'а (все зелёные): `pnpm build && pnpm lint && pnpm typecheck && pnpm test && pnpm test:int -- tailwind`
  (890 unit + 20 integration, 9 файлов).
- **Known Deviations:** тесты положены по конвенции `tests/integration/src/{fast,browser}/*.test.ts`
  (не `tests/integration/tailwind/**` из буквального текста ТЗ — такой директории в репо нет, это
  устаревший путь плана); тест «инвариантность к порядку» использует 3 перестановки import'ов среди
  `{tailwindcss, bridge.css, tokens.css}` без реального `@themeon/css` (не входит в зависимости
  `tests/integration/package.json`) — фундаментальное свойство `@theme reference` делает результат
  порядко-независимым по построению, полный `@themeon/css`-layered O3 не добавляет доказательной силы.

**Remaining:**

1. **P8.4–P8.14** — 11 items, порядок: P8.4 (nuxt) → P8.5/P8.6 (colors) → P8.7 (css) → P8.8/P8.9
   (naive) → P8.10 (vue) → P8.11/P8.12 (DTCG) → P8.13 (CLI) → P8.14 (research + финальная сверка).
   Каждый — `/task:plan-exec` (sonnet/medium) + ОБЯЗАТЕЛЬНЫЙ adversarial-review (opus/xhigh) по коммиту.
2. **P5.9 / P5.11 / P5.10** (пилоты) — ЗАБЛОКИРОВАНЫ до закрытия ВСЕЙ P8 (решение владельца 2026-07-14).
3. **P6 / P7** — без изменений.

**Sources of truth:**

- План: `~/projects/packages/themeon/plans/2026.07.12-BASE/` (repo = SSOT; Vault — зеркало).
- Входы фазы P8 — `findings/P8-*.md`, НЕ `20_research/R-xx` (R-11 §1, R-13 §4.3/§4.4, R-14 §2.1 —
  ложные утверждения, P8.14 их размечает).
- Тест-стенд P8.1 — `tests/integration/` (см. Required Reads выше); `pnpm test:int` не идёт в `pnpm test`
  (отдельная команда), CI гоняет его отдельным шагом после `pnpm build`.
- Пакеты: `~/projects/packages/themeon/packages/*` — HEAD (после коммита P8.3), дерево чистое.
  `dist` БРАТЬ В ПИЛОТЫ НЕЛЬЗЯ до закрытия P8.

**Open risks:**

- Прочие риски фазы (Naive dark APCA, `textMuted` запас над floor'ом) — без изменений, см.
  `phases/P8.md`.
- `@themeon/vite`: двойной инстанс `@themeon/core` в графе (наблюдение разведки P8.2, вне скоупа) —
  тихая деградация `resolveTheme` до пустого CSS при дублировании core в монорепо/линковке; отдельная
  проверка не заведена как item, только зафиксирована в Pending Work P8.2.

**Workarounds / Deferred / Open questions:**

- **workarounds:** `spawnNuxtDev` выбирает порт сам и ждёт HTTP-поллингом вместо парсинга stdout
  (P8.1 Known Deviation) — специфика этой среды исполнения, пересмотреть при переносе в CI.
- **deferred:** `dispose()` у `UseThemeReturn` (P3.8); перевод русских JSDoc публичных типов на английский
  (репо-широкий долг); структурный DTCG-эмит `shadow`/`gradient` (в P8 — `$extensions`-мост);
  `@themeon/vite`: двойной инстанс core (см. Open risks выше); `experimental.bundledDev` (Vite 8.1.x,
  открытый апстрим-баг) — не покрыто тестом/README.
- **open_questions:** `open-questions.md` — Q3 (`@bg-dev/nuxt-naiveui`, нужен владелец до merge веток
  пилотов), Q4 (генерализация — частично поглощена P8); Q1/Q2/Q5 закрыты.
