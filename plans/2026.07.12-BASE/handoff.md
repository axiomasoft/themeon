# HANDOFF — 2026-07-15 — after P8.15

**Next:** **P5.9 (доисполнение)** — регенерировать `base-vars.css` живой vintera с
`--tailwind-layers`, перепрогнать дименсию 2 review (Computed-кросс-чек), закрыть item.
Гейт P8.15 снят (🟢 Done, `de86c7b`).

| Параметр | Значение |
|:--|:--|
| Model | **sonnet** |
| Thinking | **medium** (Routing `plan.md` §3: P5.9 — sonnet/medium, + ОБЯЗАТЕЛЬНЫЙ adversarial-review opus/xhigh + parity-гейт по CSS-переменным; ВРУЧНУЮ, не `themeon-p5-pilots.js`) |
| Context | **continue (/clear) — ручной item** |
| Суть | yalc-подтяжка `@themeon/{tailwind,cli}` (несут P8.15) в vintera, добавить `--tailwind-layers` в `gen:styles`/сборочную команду base-vars.css, регенерировать `base-vars.css` (ветка `themeon-migration/P5`, HEAD `c8d5bee` до коммита), закоммитить, перепрогнать живую матрицу (6 строк, акцептанс P-D64/P-D65 уже PASS) + дименсию 2 review (обязана стать PASS — 13 токенов резолвятся в значения темы), обязательный adversarial-review (opus/xhigh) по новому коммиту, закрыть item. ТЗ — `phases/P5.md` P5.9 (три ✅-blockquote эскалации сверху — провенанс, читать целиком) + `plan.md` §5 P-D67. |

```
/task:plan-exec 2026.07.12-BASE P5.9
```

**Cold-start reads (по порядку):**

1. `plans/2026.07.12-BASE/plan.md` §5 — **P-D67** (первопричина + решение + отклонённые
   альтернативы + pre-mortem-риск), **P-D61** (канон statement), **P-D64/P-D65/P-D66**
   (акцептанс живой матрицы, уже PASS — не переделывать).
2. `plans/2026.07.12-BASE/phases/P5.md` — item **P5.9** целиком: три ✅-blockquote эскалации
   (провенанс решений) + Scope/Files/Inputs/Code Guidance/Validation актуальной версии.
3. `plans/2026.07.12-BASE/phases/P8.md` — P8.15 Completion Notes (флаг/эмиттер/канон-строка,
   ручная проверка канала).
4. Код: живая vintera `~/projects/vintera/vintera` (ветка `themeon-migration/P5`, HEAD
   `c8d5bee`) — генератор `base-vars.css`, `tailwind.css` (P5.7 мост), `nuxt.config.ts`.

**Суть находки и решения (одним абзацем):** обязательный adversarial-review P5.9 (opus/xhigh,
по `c8d5bee`) нашёл РЕАЛЬНЫЙ дефект — 13 токенов (`--radius-*`/`--font-*`/`--text-*`) на живой
vintera отдавали Tailwind-дефолты вместо `base-vars.css`. Первопричина — не пилот, а канал:
`themeon build` не эмитил layer-order-преамбулу; `base-vars.css` грузится ПЕРВЫМ (P-D40) →
его слой регистрируется раньше Tailwind-`@layer theme` → проигрывает по каскад-приоритету.
Фикс канонизирован P-D61/P8.7 (`layers-tailwind.css`) для import-потребителя, но пробел для
статик-канала пилота закрыт **этой сессией**: **P8.15** добавил `themeon build
--tailwind-layers` (opt-in флаг, `@themeon/tailwind` `tailwindLayerPreamble()`/
`TAILWIND_LAYER_ORDER`), доказано интеграционным тестом на реальной Tailwind-компиляции +
Chromium (с преамбулой токены резолвятся в тему, без — в Tailwind-дефолты; манипуляция
проверена и вручную через CLI). Item-коммит `de86c7b`, обязательный adversarial-review
(opus/xhigh) — 0 Blocker/Major/Minor. Гейт P5.9 снят.

**Done:** (эта сессия — `/task:plan-exec 2026.07.12-BASE P8.15`)

- **P8.15 закрыт 🟢 Done.** Новый `packages/tailwind/src/layers.ts`
  (`TAILWIND_LAYER_ORDER`+`tailwindLayerPreamble()`, zero-dep зеркало `layers-tailwind.css`) +
  анти-дрейф-тест `layers.test.ts`; реэкспорт из `index.ts`; `api.test.ts` snapshot дополнен.
  CLI `themeon build --tailwind-layers` (`packages/cli/src/commands/build.ts`, opt-in, default
  false, byte-идентичный вывод без флага — регресс-гейт dterema/P5.11 подтверждён);
  `build.test.ts` +2 теста. Интеграционный тест `tests/integration/src/browser/
  tailwind-tokens-layers.test.ts` (реальный `@tailwindcss/node` compile + Chromium computed на
  `:root`, порядок фикстуры tokens.css→tailwindcss как в реальном канале P-D34/P-D40).
  Changeset `.changeset/tailwind-layers-preamble-cli-flag.md` (`@themeon/tailwind`+`themeon`
  minor).
- Валидация: `pnpm build` — passed; `pnpm test` — 1208/1208 (на `de86c7b`); `pnpm test:int` —
  50/50; `pnpm typecheck` — чисто (11/11); `pnpm lint` — чисто. Ручная проверка канала
  (`node dist/cli.js build --tailwind-layers`) — первая строка байт-в-байт канон-statement,
  diff с/без флага = ровно одна строка.
- Обязательный adversarial-review (opus/xhigh, read-only, по `de86c7b`): 0 Blocker/Major/Minor;
  1 Low/informational (JSDoc `layers.ts` на русском — но тот же паттерн уже у `bridge.ts`/
  `namespaces.ts` пакета, конвенция пакетом не соблюдается системно; правка не внесена, не
  регрессия этого item'а).
- Bookkeeping: `phases/P8.md` (Status P8.15 🟢, Phase Status таблица, Completion Notes);
  `plan.md` (§4 Status Board P8 11/15→12/15, Meta Status/Last Updated, §6 Update Log).
  Формальное перезакрытие фазы P8 (Phase Handoff, снятие маркера УСТАРЕЛ) — отдельным шагом
  `/task:plan-close 2026.07.12-BASE P8`, НЕ частью этого item'а (P8.15 — ремедиация-item, не
  «финальная сверка фазы»).

**Remaining:**

1. **P5.9** (СЛЕДУЮЩИЙ) — регенерация base-vars.css с флагом, перепрогон дименсии 2, закрытие.
2. **P5.11 / P5.10** — за P5.9. P5.11 (dterema, без Tailwind) находкой P-D67 НЕ затронут (флаг
   opt-in, не применяется на non-Tailwind пилоте). P5.10 — снятие алиасов.
3. **`/task:plan-close 2026.07.12-BASE P8`** — формальное перезакрытие фазы (снятие маркера
   УСТАРЕЛ в Phase Handoff), не блокирует P5.9 — можно сделать в любой момент до архивации
   плана.
4. **P6 / P7** — без изменений, скелет/backlog.

**Sources of truth:**

- План: `~/projects/packages/themeon/plans/2026.07.12-BASE/` (repo = SSOT; Vault — зеркало).
- Пакеты ThemeOn: `~/projects/packages/themeon/packages/*`, `HEAD` `de86c7b` (item-коммит
  P8.15; `layers-tailwind.css`/`THEMEON_LAYERS`/`TAILWIND_LAYER_ORDER`/`tailwindLayerPreamble`
  = канон порядка слоёв, P8.7+P8.15).
- vintera: `~/projects/vintera/vintera`, ветка `themeon-migration/P5`, **`HEAD` = `c8d5bee`**
  (не менялся). Working tree несёт ПОСТОРОННИЙ дифф (`.agents/skills/**`,
  `.swissknifeman/config.json`, `skills-lock.json`, untracked `.claude/analyst/`) — НЕ
  трогать. `base-vars.css` git-трекается — регенерация P5.9 даст реальный дифф (+1 строка
  преамбулы).

**Open risks:**

- **P8.15 pre-mortem (P-D67):** Tailwind 5 сменит набор дефолт-слоёв → statement устареет;
  сторож — интеграционный тест на реальной компиляции (`tailwind-tokens-layers.test.ts`,
  тот же сентинел, что P8.7 Правило 2). Красный тест, не тихий проигрыш.
- **Соблазн «починить» находку в пилоте** (хардкод-px, переименование классов, ручной
  `@layer`) — запрещён P-D67/P-D45: фикс УЖЕ в канале `themeon build`, P5.9 только потребляет
  флаг.
- Стале Vite dep-cache (прошлые сессии) — чистить `node_modules/.cache .nuxt` ДО `nuxt dev`
  в P5.9.

**Workarounds / Deferred / Open questions:**

- **Q6** — легаси-персист донора: чистить `localStorage['theme']` на мёрже? Владельцу, до
  merge веток (P-D66). P5.9 не блокирует.
- **Q3** — судьба `@bg-dev/nuxt-naiveui` (владельцу, до merge).
- P5.7/P5.8 — собственные merge-time эскалации (визуал-сайнофф сдвига порогов + мёртвая
  полоса `Catalog.vue` 993–1023px). Перед мёржем веток, не перед закрытием P5.9/P8.15.
