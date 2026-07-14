# HANDOFF — 2026-07-14 — after P8.2

**Next:** Исполнить **P8.3 — `@themeon/tailwind`: мост на `@theme reference`** (третий item фазы P8,
следующий по порядку риск ∩ зависимости данных). ТЗ детерминировано `findings/P8-tailwind-bridge-form.md`
до эталонного кода. После коммита — ОБЯЗАТЕЛЬНЫЙ adversarial-review (opus/xhigh, P-D51).

| Параметр | Значение |
|:--|:--|
| Model | **sonnet** |
| Thinking | **medium** (пинится самим `/task:plan-exec`) |
| Context | **continue (/clear) — manual item** |
| Суть | Заменить форму Tailwind-моста на `@theme reference` + литеральные значения (Blocker #4 — `--breakpoint-*` в `@media` невалиден; Blocker #5 — self-referential `--x: var(--x)` цикл убивает токены при обратном порядке `@import`) |

```
/task:plan-exec 2026.07.12-BASE P8.3
```

**Cold-start reads (по порядку):**
1. `plans/2026.07.12-BASE/phases/P8.md` — Phase Context (инварианты фазы) + item **P8.3** целиком.
2. `plans/2026.07.12-BASE/findings/P8-tailwind-bridge-form.md` — канон фикса, матрица кандидатов,
   эталонный код §4, RAG §0.
3. `plans/2026.07.12-BASE/plan.md` — §3 Routing (строка P8.1–P8.14), §5 Decision Log (P-D54, P-D61),
   §4 Status Board.
4. `plans/2026.07.12-BASE/findings/P8-css-layers-cli-checks.md` §1 (порядок `@layer` — смежный канон,
   не противоречит).
5. `packages/tailwind/src/bridge.ts`, `packages/tailwind/src/namespaces.ts` (текущий код).

**Done:** (эта сессия)

- **P8.2 закрыт 🟢 Done.** `packages/vite/src/index.ts`: канал подключения — `import
  'virtual:themeon.css'` из JS-энтри (канон, P-D55; CSS-`@import` виртуального модуля физически
  невозможен — Blocker #1); `hotUpdate` возвращает `[mod]` вместо ручного `hot.send({type:'css-update'})`
  (supersedes P-D26, Major #18); `tokensFiles` резолвятся в абсолютные пути в новом хуке
  `configResolved` (D3-регресс — относительные пути из README раньше никогда не матчались). Добавлена
  доп. опция `cssImport?: boolean | {file}` — CSS-first канал без JS-энтри: плагин пишет CSS темы в
  реальный файл на диске и алиасит `virtualId` на него через `resolve.alias`.
- `packages/vite/README.md` переписан: 3 рецепта на JS-import, секция «Live HMR» (`jiti`-фабрика,
  честная оговорка про config-dependency/full-reload — D4), секция «CSS-only projects» (`cssImport`),
  секция «Why not CSS `@import`?».
- 7 новых интеграционных тестов через настоящую трубу (`tests/integration/`, хелперы P8.1 + новые
  `helpers/vite-dev.ts` и `chromium.ts::withPage`): `src/fast/vite-plugin.test.ts` (4) +
  `src/browser/vite-hmr.test.ts` (3, реальный `createServer()` + реальный Chromium). **4 из 7 были
  красными до фикса** (доказано `git stash` на `index.ts`/`types.ts` + ребилд + прогон) — `cssImport`
  T6/T7 (ENOENT/фича не существовала) и обе живые HMR-эффект пробы (таймаут 5000ms). T1 и регресс-тест
  на Blocker #1, а также T5 — регрессионные якоря контракта, ожидаемо зелёные и до, и после.
- Валидация item'а (все зелёные): `pnpm build && pnpm lint && pnpm typecheck && pnpm test && pnpm test:int`
  (887 unit + 12 integration); `pnpm --filter @themeon/vite typecheck` отдельно.
- **Known Deviation:** покрытие таблицы T1–T7 findings §7 не 1:1 по файлам — T2+T3+T4 объединены в
  один browser-тест (живой эффект через `getComputedStyle`, сильнее per Implementation Rule 4, чем
  снятие сырых WS-payload'ов), T5 — отдельный. Итоговое число тестов (7) и покрытие строк сохранены.

**Remaining:**

1. **P8.3–P8.14** — 12 items, порядок: P8.3 (tailwind) → P8.4 (nuxt) → P8.5/P8.6 (colors) →
   P8.7 (css) → P8.8/P8.9 (naive) → P8.10 (vue) → P8.11/P8.12 (DTCG) → P8.13 (CLI) → P8.14 (research +
   финальная сверка). Каждый — `/task:plan-exec` (sonnet/medium) + ОБЯЗАТЕЛЬНЫЙ adversarial-review
   (opus/xhigh) по коммиту.
2. **P5.9 / P5.11 / P5.10** (пилоты) — ЗАБЛОКИРОВАНЫ до закрытия ВСЕЙ P8 (решение владельца 2026-07-14).
3. **P6 / P7** — без изменений.

**Sources of truth:**

- План: `~/projects/packages/themeon/plans/2026.07.12-BASE/` (repo = SSOT; Vault — зеркало).
- Входы фазы P8 — `findings/P8-*.md`, НЕ `20_research/R-xx` (R-11 §1, R-13 §4.3/§4.4, R-14 §2.1 —
  ложные утверждения, P8.14 их размечает).
- Тест-стенд P8.1 — `tests/integration/` (см. Required Reads выше); `pnpm test:int` не идёт в `pnpm test`
  (отдельная команда), CI гоняет его отдельным шагом после `pnpm build`.
- Пакеты: `~/projects/packages/themeon/packages/*` — HEAD (после коммита P8.2), дерево чистое.
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
