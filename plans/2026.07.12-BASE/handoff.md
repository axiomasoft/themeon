# HANDOFF — 2026-07-14 — after P8.8

**Next:** Исполнить **P8.9 — `@themeon/naive`: деривация hover/pressed/suppl**
(девятый item фазы). ТЗ детерминировано `findings/P8-naive-color-canon.md` §3 (канон
деривации, эталонные числа §3.4, отвергнутые варианты §3.5) + `phases/P8.md` P8.9 целиком.
После коммита — ОБЯЗАТЕЛЬНЫЙ adversarial-review (opus/xhigh, P-D51).

| Параметр | Значение |
|:--|:--|
| Model | **sonnet** |
| Thinking | **medium** (пинится самим `/task:plan-exec`) |
| Context | **continue (/clear) — manual item** |
| Суть | `packages/naive/src/color.ts`: `deriveInteractionStates` переписать под канон §3.3 (hover/pressed/suppl — явная роль темы приоритетна; иначе `hover = base + Δ(appearance)`, `pressed` = экстраполяция `base→hover` k=2 если есть явный hover, иначе `base + 2·Δ`, `suppl = base` identity); `STEP10_DELTA` перенести в публичный экспорт `@themeon/colors` (сейчас приватен в `scale.ts:60-63`), `@themeon/naive` добавляет `@themeon/colors` в `dependencies`. `to-native.ts`: `DERIVABLE_BASES`-петля должна научиться читать явные `-pressed`/`-suppl` роли темы (сейчас в `NAIVE_COMMON_MAP` есть вход только под `-hover`) — Rule 4 (явная роль > деривация) для T10. Тесты T8/T9/T10 из findings §6 (перенесены из P8.8, не поставлены там намеренно — числа канона §3.4 требуют этой формулы) |

```
/task:plan-exec 2026.07.12-BASE P8.9
```

**Cold-start reads (по порядку):**
1. `plans/2026.07.12-BASE/phases/P8.md` — Phase Context (инварианты фазы) + item **P8.9** целиком.
2. `plans/2026.07.12-BASE/findings/P8-naive-color-canon.md` §3 целиком (деривация: §3.1 текущая
   поломка, §3.2 наивовские состояния в OKLCH, §3.3 КАНОН формулы, §3.4 эталонные числа, §3.5
   остаточный риск в dark — порог `body` 75 не держится, только `text` 60), §5 (эталонный код
   `deriveInteractionStates`/`DeriveInput`), §6 таблица T8/T9/T10.
3. `packages/naive/src/color.ts`, `packages/naive/src/common-map.ts` (`DERIVABLE_BASES`),
   `packages/naive/src/to-native.ts` (текущий код после P8.8 — literal-lookup/fail-loud/INK уже
   на месте, деривация НЕ тронута).
4. `packages/colors/src/scale.ts:55-70` (`APPEARANCE_PARAMS`, приватный — источник `STEP10_DELTA`).
5. `plans/2026.07.12-BASE/plan.md` — §3 Routing, §5 Decision Log (P-D51..P-D63).

**Done:** (эта сессия)

- **P8.8 закрыт 🟢 Done.** `@themeon/naive`: `toNative()` читает `resolved.tokens[].value`
  вместо `resolved.vars` (Blocker #2 — на дефолтном `refLayer` адаптер отдавал Naive
  `var(--…)`-строки, seemly падал на первом же нетривиальном компоненте). `common.baseColor`
  убран из маппинга (Blocker #3 — `baseColor` у Naive одновременно экстремум канвы И чернила на
  солид-заливках, ни одна роль ThemeOn не годится сразу на обе); заменён per-component
  INK-таблицей (`ink-map.ts`, новый файл): `--color-on-<role>` (фолбэк на `--color-on-primary`
  ТОЛЬКО когда своя роль отсутствует, не когда невалидна) → `Button.textColor{state}{suffix}` +
  Checkbox/Tag/IconWrapper/Steps/Calendar/DatePicker (обе темы), Radio/FloatButton/Switch
  (только dark); ACCENT-INK из `--color-link` (находка §4.1: `primaryColor` у Naive — И заливка,
  И чернила на канве, в dark даёт Lc 30.8) → Button ghost/text + Anchor/Menu/Tabs/Pagination/
  Typography/Dropdown. Fail-loud: `ThemeonError('BAD_COLOR')` (новый код в `@themeon/core`) со
  списком плохих ролей, `ToNativeOptions.onInvalidColor: 'throw'|'skip'` (деф. throw);
  `ToNativeOptions.appearance` для выбора light/dark-ветки INK. `--color-bg-subtle` →
  `actionColor`/`tableHeaderColor`/`tabColor`; `--color-bg-elevated` += `tableColor`.
  Деривация `*Hover/*Pressed/*Suppl` (`deriveInteractionStates`, формула `+0.06/-0.06/+0.10 L`)
  НЕ тронута — Scope Excluded, это P8.9.
  9 новых интеграционных тестов через настоящий `naive-ui@2.44.1`+`seemly@0.3.10` (T1-T7, T11,
  T12; T8/T9/T10 перенесены в P8.9 — тестируют канон деривации §3, которого здесь ещё нет), T2
  прогоняет `self()` по всем 88 style-директориям установленного naive-ui (дискавери через
  `fs.readdirSync`, не curated-подмножество). 14 новых unit-тестов в `to-native.test.ts`.
  Коммиты `9c7e333` (реализация) → `f12dc29` (фиксы ревью) → `e5c952e` (T2 расширен до полного
  дискавери, после ревью).
- Валидация (все зелёные): `pnpm build && pnpm test && pnpm test:int` — 1161 unit-тест (45
  файлов), 35 int-fast тестов (12 файлов); `pnpm typecheck && pnpm lint` — чисто.
- **Adversarial-review (opus/xhigh) по коммиту `9c7e333`**: 0 Blocker. 1 Major — `api.test.ts` не
  фиксировал новые публичные поля `ToNativeOptions` (`appearance`/`onInvalidColor`) — устранено
  `f12dc29` (typed-literal тест + snapshot ключей, ловит tsc excess-property check). 3 Minor:
  дублирующиеся записи в `bad[]`-списке при чтении одной роли разными таблицами (устранено —
  `Map` вместо `array`); `onInvalidColor:'skip'` тихо подставлял `--color-on-primary` вместо
  пропуска роли, когда своя on-роль статуса присутствовала, но была невалидна (устранено —
  фолбэк только когда роль ОТСУТСТВУЕТ); dark-only INK-цели молча пропадают для тем с dark-веткой
  не под именем `'dark'` без явного `opts.appearance` (README-документация, поведение —
  осознанный дефолт, не баг). 2 Informational подтвердили честность интеграционного теста
  (реальный naive-ui/seemly) и корректность ~60 INK-ключей против установленного пакета
  (0 опечаток).

**Remaining:**

1. **P8.9–P8.14** — 6 items, порядок: P8.9 (naive деривация) → P8.10 (vue) → P8.11/P8.12 (DTCG)
   → P8.13 (CLI: SSOT-потребление + исключения скана) → P8.14 (research + финальная сверка).
   Каждый — `/task:plan-exec` (sonnet/medium) + ОБЯЗАТЕЛЬНЫЙ adversarial-review (opus/xhigh).
2. **P5.9 / P5.11 / P5.10** (пилоты) — ЗАБЛОКИРОВАНЫ до закрытия ВСЕЙ P8 (решение владельца
   2026-07-14).
3. **P6 / P7** — без изменений.

**Sources of truth:**

- План: `~/projects/packages/themeon/plans/2026.07.12-BASE/` (repo = SSOT; Vault — зеркало).
- Входы фазы P8 — `findings/P8-*.md`, НЕ `20_research/R-xx` (R-11 §1, R-13 §4.3/§4.4, R-14 §2.1 —
  ложные утверждения, P8.14 их размечает).
- Тест-стенд P8.1 — `tests/integration/` (4 яруса: `src/fast`, `src/browser`, `src/e2e`); `pnpm
  test:int`/`test:int:slow` не идут в `pnpm test` (отдельные команды). `tests/integration/
  package.json` теперь несёт `@themeon/colors` (APCA в тестах) и `seemly` (прямой `changeColor`)
  как devDependencies (P8.8).
- Пакеты: `~/projects/packages/themeon/packages/*` — HEAD (после коммита `e5c952e`), дерево чистое.
  `dist` БРАТЬ В ПИЛОТЫ НЕЛЬЗЯ до закрытия P8.
- `@themeon/naive/src/ink-map.ts` (новый, P8.8) — источник per-component INK-таблиц
  (`STATUS_INK_SOURCES`, `PRIMARY_INK_TARGETS_*`, `ACCENT_INK_*`); P8.9 их не трогает.
- `@themeon/naive/src/color.ts` — `toHexStrict` (внутренняя, не в `index.ts`) добавлена P8.8 для
  fail-loud lookup; `deriveInteractionStates`/`HOVER_DELTA`/`PRESSED_DELTA`/`SUPPL_DELTA`
  (старая формула) — точка входа P8.9.
- `packages/core/src/errors.ts` несёt `ThemeonErrorCode` с новым `'BAD_COLOR'` (P8.8) — публичный
  тип-only экспорт, api-freeze тестов (core/naive) не касается напрямую.
- Changeset `naive-literal-lookup-fail-loud-ink.md` (`@themeon/naive`+`@themeon/core`, minor) —
  выпущен вместе с кодом P8.8, ещё не зарелижен (репо не в npm, P-D53).

**Open risks:**

- Тонкий APCA-запас (0.9–1.7 Lc) против `--color-bg-subtle` у пар `focusRing`/`link` в дефолт-теме
  (P8.7 review finding) — сдвиг нейтральной/акцентной шкалы `@themeon/colors` может увести их в FAIL;
  гейт fail-closed поймает на сборке, не сформирован как отдельный item.
- `@themeon/vite`: двойной инстанс `@themeon/core` в графе (наблюдение разведки P8.2, вне скоупа) —
  зафиксирована в Pending Work P8.2, отдельная проверка не заведена как item.
- P8.9 наследует остаточный риск §3.5: в dark лестница `base→hover→pressed` идёт вверх по L ⇒
  контраст белых чернил падает 75.6→69.0→62.0 — порог `text` (60) держится, `body` (75) нет.
  Это неизбежно при Radix-направлении и белых чернилах, не баг реализации — рекомендованный
  тест-инвариант (§3.5) уже в T7-подобном виде описан findings §6, реализовать в P8.9.

**Workarounds / Deferred / Open questions:**

- **workarounds:** `spawnNuxtDev` выбирает порт сам и ждёт HTTP-поллингом вместо парсинга stdout
  (P8.1 Known Deviation) — специфика этой среды исполнения, пересмотреть при переносе в CI.
- **deferred:** дубль таблицы пар в CLI `checks/contrast.ts` (→ P8.13); `dispose()` у
  `UseThemeReturn` (P3.8); перевод русских JSDoc публичных типов на английский (репо-широкий долг);
  структурный DTCG-эмит `shadow`/`gradient` (в P8 — `$extensions`-мост); `@themeon/vite`: двойной
  инстанс core; `experimental.bundledDev` (Vite 8.1.x, открытый апстрим-баг); CJS-тем поддержка/
  документация (P8.4 review finding); e2e granular-vs-restart различение (P8.4 review finding);
  тонкий APCA-запас против `bg-subtle` (P8.7 review finding, см. Open risks); «жёлтая полоса»
  APCA для warning-заливок (P8.8, findings §4.2 — не решается тихой подгонкой, Q владельцу).
- **open_questions:** `open-questions.md` — Q3 (`@bg-dev/nuxt-naiveui`, нужен владелец до merge
  веток пилотов), Q4 (генерализация — частично поглощена P8). Q1/Q2/Q5 закрыты.
