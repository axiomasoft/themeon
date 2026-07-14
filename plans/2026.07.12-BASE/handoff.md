# HANDOFF — 2026-07-14 — after P8.6

**Next:** Исполнить **P8.7 — `@themeon/css`: роли `--color-on-*`, рецепт соседства с Tailwind,
самодостаточность примитивов** (седьмой item фазы). ТЗ детерминировано `findings/
P8-css-layers-cli-checks.md` §1/§2/§3 (готовый README-блок порядка `@layer`, box-sizing фиксы,
14-парная SSOT-таблица из P8.6). После коммита — ОБЯЗАТЕЛЬНЫЙ adversarial-review (opus/xhigh,
P-D51).

| Параметр | Значение |
|:--|:--|
| Model | **sonnet** |
| Thinking | **medium** (пинится самим `/task:plan-exec`) |
| Context | **continue (/clear) — manual item** |
| Суть | `packages/css/src/layers.css`+новый `layers-tailwind.css` (рабочий порядок `@layer`), `_base-body.css` (`font-weight` на h1..h4), composition `box-sizing`, `theme/default.ts` (роли `--color-on-{success,warning,error,info}` + регенерация на новой шкале P8.5), `gen-tokens.mjs` переводится на `checkThemeContrast` (P8.6 SSOT) — дубль `gatePairs()` удаляется |

```
/task:plan-exec 2026.07.12-BASE P8.7
```

**Cold-start reads (по порядку):**
1. `plans/2026.07.12-BASE/phases/P8.md` — Phase Context (инварианты фазы) + item **P8.7** целиком.
2. `plans/2026.07.12-BASE/findings/P8-css-layers-cli-checks.md` §1 (порядок `@layer`), §2 (box-sizing),
   §3 (SSOT пар/порогов — уже частично читан в P8.6, но §1/§2 в P8.6 НЕ применялись).
3. `plans/2026.07.12-BASE/findings/P8-colors-scale-apca.md` §4 (эффект регенерации на дефолт-тему).
4. `plans/2026.07.12-BASE/plan.md` — §3 Routing (строка P8.1–P8.14), §5 Decision Log, §4 Status Board.
5. `packages/css/src/layers.css`, `packages/css/README.md`, `packages/css/src/theme/default.ts`,
   `packages/css/scripts/gen-tokens.mjs` (текущий код).

**Done:** (эта сессия)

- **P8.6 закрыт 🟢 Done.** `@themeon/colors`: `flattenAlpha` больше не композитит полупрозрачный bg
  на безусловное белое — `contrastAPCA(fg, bg, opts?: ContrastOptions)` принимает `opts.base`; без
  `base` на полупрозрачном bg → `throw ColorsError('ALPHA_NEEDS_BASE')` (fail-loud, Major #15 аудита).
  `ContrastPair.base` — новое поле, прокидывается через `checkContrast`. Новый SSOT: `SemanticPairSpec`
  + `SEMANTIC_CONTRAST_PAIRS` (14 пар, 1:1 `findings/P8-css-layers-cli-checks.md` §3.2) +
  `checkThemeContrast(lookup)` — единственная таблица пар контраста дефолт-темы (Major #22 — раньше
  CLI и gen-tokens.mjs гоняли РАЗНЫЕ таблицы с разными usage-уровнями на один и тот же вопрос).
  `packages/colors/src/errors.ts`: новый код `ALPHA_NEEDS_BASE`. `index.ts`: экспорты `ContrastOptions`,
  `SemanticPairSpec`, `SEMANTIC_CONTRAST_PAIRS`, `checkThemeContrast`. `api.test.ts` усилен до freeze
  формы типов (`Exact<T,Keys>`, образец P3.8/P-D48).
- `packages/colors/src/contrast.test.ts`: 8 новых тестов (throw без base; |Lc|≈89 с base против
  white-composite ~60; base сама полупрозрачна → throw; `checkContrast` прокидывает `pair.base`;
  `checkThemeContrast` на всех 14 парах; паритет вручную-собранных пар из SSOT vs `checkThemeContrast`;
  skip отсутствующей роли).
- Валидация (все зелёные): `pnpm build && pnpm lint && pnpm typecheck && pnpm test` (1147 unit, было
  1139; `gen-tokens.mjs` гейт прошёл без изменений — дефолт-тема пакета не содержит полупрозрачных bg,
  новая сигнатура опциональна и обратно совместима).
- **Adversarial-review (opus) по коммиту `452e9bd`**: 0 Blocker/Major/Minor. 3 Low/informational без
  правок кода (детали — `phases/P8.md` P8.6 Completion Notes): (1) typo-риск в `SEMANTIC_CONTRAST_PAIRS`
  varName без защиты (дрейф-тест против `CSS_CONTRACT` заведён как Pending Work → P8.7); (2)
  `BAD_COLOR`-сообщение при непарсибельной `base` не упоминает `base` в тексте; (3) `checkThemeContrast`-
  тесты не гоняют alpha-путь напрямую (покрыт отдельными тестами `contrastAPCA`/`checkContrast`).

**Remaining:**

1. **P8.7–P8.14** — 8 items, порядок: P8.7 (css: layers/box-sizing/roles/SSOT-потребление) →
   P8.8/P8.9 (naive) → P8.10 (vue) → P8.11/P8.12 (DTCG) → P8.13 (CLI: SSOT-потребление + исключения
   скана) → P8.14 (research + финальная сверка). Каждый — `/task:plan-exec` (sonnet/medium) +
   ОБЯЗАТЕЛЬНЫЙ adversarial-review (opus/xhigh).
2. **P5.9 / P5.11 / P5.10** (пилоты) — ЗАБЛОКИРОВАНЫ до закрытия ВСЕЙ P8 (решение владельца
   2026-07-14).
3. **P6 / P7** — без изменений.

**Sources of truth:**

- План: `~/projects/packages/themeon/plans/2026.07.12-BASE/` (repo = SSOT; Vault — зеркало).
- Входы фазы P8 — `findings/P8-*.md`, НЕ `20_research/R-xx` (R-11 §1, R-13 §4.3/§4.4, R-14 §2.1 —
  ложные утверждения, P8.14 их размечает).
- Тест-стенд P8.1 — `tests/integration/` (4 яруса: `src/fast`, `src/browser`, `src/e2e`); `pnpm
  test:int`/`test:int:slow` не идут в `pnpm test` (отдельные команды).
- Пакеты: `~/projects/packages/themeon/packages/*` — HEAD (после коммита `de39591`), дерево чистое.
  `dist` БРАТЬ В ПИЛОТЫ НЕЛЬЗЯ до закрытия P8.
- `@themeon/colors` теперь несёт SSOT контраста (`SEMANTIC_CONTRAST_PAIRS`/`checkThemeContrast`,
  P8.6) — P8.7 обязан перевести `gen-tokens.mjs` на него и удалить локальный `gatePairs()` (5 пар);
  P8.13 — то же для CLI `checks/contrast.ts` (`CONTRAST_PAIRS`, 3 пары).
- `packages/colors/dist/tokens.css` (через `packages/css` build) — дефолт-тема пакета изменилась
  на 20/24 color-переменных после P8.5 (findings §4); публичный changeset — вне скоупа P8.6, входит
  в Scope P8.7 (тема — публичный артефакт этой фазы).

**Open risks:**

- dark `link`/`focus-ring` пары §3.2 остаются FAIL до P8.7 (пороги пересчитываются на новой шкале
  P8.5 внутри P8.7, не в P8.6 — Scope Excluded item'а P8.6 явно это откладывал).
- Дрейф имён `SEMANTIC_CONTRAST_PAIRS.fg/bg` против `CSS_CONTRACT` пока не защищён тестом (защита
  живёт в `packages/css/test/contract.test.ts`, заводится вместе с подключением потребителя в P8.7).
- `@themeon/vite`: двойной инстанс `@themeon/core` в графе (наблюдение разведки P8.2, вне скоупа) —
  зафиксирована в Pending Work P8.2, отдельная проверка не заведена как item.

**Workarounds / Deferred / Open questions:**

- **workarounds:** `spawnNuxtDev` выбирает порт сам и ждёт HTTP-поллингом вместо парсинга stdout
  (P8.1 Known Deviation, подтверждено ещё раз в P8.4) — специфика этой среды исполнения,
  пересмотреть при переносе в CI.
- **deferred:** дубль таблиц пар в `gen-tokens.mjs`/CLI `checks/contrast.ts` (P8.6 Pending Work →
  удаляется в P8.7/P8.13 соответственно); дрейф-тест `SEMANTIC_CONTRAST_PAIRS` vs `CSS_CONTRACT`
  (→ P8.7); `dispose()` у `UseThemeReturn` (P3.8); перевод русских JSDoc публичных типов на
  английский (репо-широкий долг); структурный DTCG-эмит `shadow`/`gradient` (в P8 — `$extensions`-
  мост); `@themeon/vite`: двойной инстанс core; `experimental.bundledDev` (Vite 8.1.x, открытый
  апстрим-баг); CJS-тем поддержка/документация (P8.4 review finding); e2e granular-vs-restart
  различение (P8.4 review finding); changeset на breaking change дефолт-темы `@themeon/css` (эффект
  20/24 переменных P8.5 — публикуется в P8.7).
- **open_questions:** `open-questions.md` — Q3 (`@bg-dev/nuxt-naiveui`, нужен владелец до merge
  веток пилотов), Q4 (генерализация — частично поглощена P8). Q1/Q2/Q5 закрыты.
