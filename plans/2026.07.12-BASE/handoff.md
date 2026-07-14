# HANDOFF — 2026-07-14 — after P8.1

**Next:** Исполнить **P8.2 — `@themeon/vite`: рабочий канал подключения + живой HMR** (второй item фазы
P8, следующий по порядку риск ∩ зависимости данных). ТЗ детерминировано `findings/P8-vite-channel-hmr.md`
до эталонного кода. После коммита — ОБЯЗАТЕЛЬНЫЙ adversarial-review (opus/xhigh, P-D51).

| Параметр | Значение |
|:--|:--|
| Model | **sonnet** |
| Thinking | **medium** (пинится самим `/task:plan-exec`) |
| Context | **continue (/clear) — manual item** |
| Суть | Починить оба документированных канала подключения `@themeon/vite` (JS-import и CSS-`@import`, Blocker #1) и живой HMR (используя тест-стенд P8.1: `tests/integration` — 4 яруса линкуют пакеты через `dist`) |

```
/task:plan-exec 2026.07.12-BASE P8.2
```

**Cold-start reads (по порядку):**
1. `plans/2026.07.12-BASE/phases/P8.md` — Phase Context (инварианты фазы) + item **P8.2** целиком.
2. `plans/2026.07.12-BASE/findings/P8-vite-channel-hmr.md` — канон фикса, эталонный код.
3. `plans/2026.07.12-BASE/plan.md` — §3 Routing (строка P8.1–P8.14), §5 Decision Log (P-D51..P-D63),
   §4 Status Board.
4. `tests/integration/` (P8.1, этот item) — стенд, которым P8.2 обязан доказать свой фикс: хелперы
   `src/helpers/vite-build.ts` (`viteBuild`) + `src/helpers/fixture.ts` (`mkFixture`/`rmFixture`);
   пример self-теста — `src/fast/vite-build.self.test.ts`.

**Done:** (эта сессия)

- **P8.1 закрыт 🟠 Done with deviations.** Новый workspace-пакет `tests/integration` (`pnpm-workspace.yaml`:
  `tests/*`): 4 быстрых яруса (`vite build`/Tailwind/`naive-ui`/Chromium) + slow-ярус живого `nuxt dev`,
  все — тонкие хелперы + self-тесты хелперов (зелёные на текущем сломанном коде пакетов, как и требует
  Code Guidance item'а — красные тесты ПАКЕТОВ несут P8.2–P8.13 вместе со своими фиксами).
- Починен порядок CI: `install → build → lint → typecheck → test → test:int → check:pack` (+ отдельный
  job `integration-slow` на `test:int:slow`) — было `install → lint → typecheck → test → build →
  check:pack`, из-за чего CI был красным 4 прогона подряд (кросс-пакетные импорты идут через
  `exports → dist`, а `dist` собирался ПОСЛЕ typecheck/test).
- Валидация item'а (все зелёные): `pnpm build && pnpm lint && pnpm typecheck && pnpm test && pnpm test:int`;
  `pnpm test:int:slow`; регрессия порядка воспроизведена и починена (`rm -rf packages/*/dist && pnpm
  typecheck` → `TS2307` на 3 пакетах; `pnpm build && pnpm typecheck` → зелёное). Замеры: `pnpm build`
  ~5.3 с; `pnpm test` ~1.1 с; `pnpm test:int` ~7.1 с (build+4 теста); `pnpm test:int:slow` ~8.5 с
  (build+живой nuxt dev).
- **Known Deviation (см. `phases/P8.md` P8.1 Completion Notes):** регекс-парсинг URL из stdout `nuxt dev`
  (findings §6e) в этой среде исполнения недостижим — дочерний процесс реально поднимается и слушает порт
  (доказано прямым `curl`), но не доставляет ни байта в переданный pipe stdout/stderr родителя. Хелпер
  `spawnNuxtDev` вместо этого сам выбирает свободный порт и ждёт готовности HTTP-поллингом — функционально
  эквивалентно цели findings, без зависимости от захвата stdout.

**Remaining:**

1. **P8.2–P8.14** — 13 items, порядок: P8.2 (vite) → P8.3 (tailwind) → P8.4 (nuxt) → P8.5/P8.6 (colors) →
   P8.7 (css) → P8.8/P8.9 (naive) → P8.10 (vue) → P8.11/P8.12 (DTCG) → P8.13 (CLI) → P8.14 (research +
   финальная сверка). Каждый — `/task:plan-exec` (sonnet/medium) + ОБЯЗАТЕЛЬНЫЙ adversarial-review
   (opus/xhigh) по коммиту.
2. **P5.9 / P5.11 / P5.10** (пилоты) — ЗАБЛОКИРОВАНЫ до закрытия ВСЕЙ P8 (решение владельца 2026-07-14).
3. **P6 / P7** — без изменений.

**Sources of truth:**

- План: `~/projects/packages/themeon/plans/2026.07.12-BASE/` (repo = SSOT; Vault — зеркало).
- Входы фазы P8 — `findings/P8-*.md`, НЕ `20_research/R-xx` (R-11 §1, R-13 §4.3/§4.4, R-14 §2.1 — ложные
  утверждения, P8.14 их размечает).
- Тест-стенд P8.1 — `tests/integration/` (см. Required Reads выше); `pnpm test:int` не идёт в `pnpm test`
  (отдельная команда), CI гоняет его отдельным шагом после `pnpm build`.
- Пакеты: `~/projects/packages/themeon/packages/*` — HEAD (после коммита P8.1), дерево чистое кроме
  P8.1-коммита. `dist` БРАТЬ В ПИЛОТЫ НЕЛЬЗЯ до закрытия P8.

**Open risks:**

- P8.1 сам по себе не чинит НИ ОДНОГО блокера — только даёт стенду, которым P8.2–P8.13 обязаны доказать
  свои фиксы. Пока P8.2 не закрыт, `tests/integration` детектирует Blocker #1 (`virtual:themeon.css`
  `@import` не резолвится) только имплицитно (через `viteBuild`/`mkFixture`, использованных в self-тестах
  P8.1 без утверждений про блокер) — явный красный/зелёный тест на Blocker #1 появится вместе с P8.2.
- Прочие риски фазы (Naive dark APCA, `textMuted` запас над floor'ом) — без изменений, см. предыдущую
  версию этого файла / `phases/P8.md`.

**Workarounds / Deferred / Open questions:**

- **workarounds:** `spawnNuxtDev` выбирает порт сам и ждёт HTTP-поллингом вместо парсинга stdout
  (см. Known Deviation выше) — специфика этой среды исполнения, пересмотреть при переносе в CI (GitHub
  Actions), где парсинг stdout может снова заработать штатно; сохранить текущий (env-независимый) подход,
  если не появится причина вернуться.
- **deferred:** `dispose()` у `UseThemeReturn` (P3.8); перевод русских JSDoc публичных типов на английский
  (репо-широкий долг); структурный DTCG-эмит `shadow`/`gradient` (в P8 — `$extensions`-мост).
- **open_questions:** `open-questions.md` — Q3 (`@bg-dev/nuxt-naiveui`, нужен владелец до merge веток
  пилотов), Q4 (генерализация — частично поглощена P8); Q1/Q2/Q5 закрыты.
