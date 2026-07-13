# HANDOFF — 2026-07-13 — after P3.7

**Next:** Обязательный adversarial-review (opus/xhigh) по коммиту `62e81e7` (P3.7 — фикс
`default: ''`), затем возврат к P5.9 (доисполнение vintera поверх свежего `dist`
`@themeon/vue`+`@themeon/nuxt`). Фаза **P7** задизайнена облегчённо в отдельной side-сессии
(см. Done ниже) — это НЕ меняет реальный следующий шаг.

| Параметр | Значение |
|:--|:--|
| Model | opus |
| Thinking | xhigh — обязательный adversarial-review прод-риск-фикса (Routing `plan.md` §3, строка P3.7) |
| Context | continue (/clear) — ручной item |
| Суть | Adversarial-review коммита `62e81e7`: корректность `normalizeThemeName`/`state.ts`/`anti-fouc.ts`/`nuxt/normalize.ts` по всем 7 инвариантам фазы P3 и Implementation Rules P3.7 (особенно правило 7 — api.test.ts снапшоты не двигаются). Читать `phases/P3.md` P3.7 целиком перед ревью. |

```
/task:review 2026.07.12-BASE P3.7
```

**Cold-start reads:** `plans/2026.07.12-BASE/plan.md` (§2 Execution Rules, §3 Routing, §4 Status Board)
→ `plans/2026.07.12-BASE/phases/P3.md` (Phase Context: фаза переоткрывалась, теперь снова терминальна
7/7; item **P3.7** целиком, включая Completion Notes) → код коммита `62e81e7`: `packages/vue/src/
{theme-name.ts,state.ts,anti-fouc.ts}`, `packages/nuxt/src/{internal/normalize.ts,types.ts}`.

**Done:**

- `packages/vue/src/theme-name.ts` (новый, pure) — `normalizeThemeName()`.
- `packages/vue/src/state.ts` — один резолв `explicitDefault`, нормализация персиста ДО
  `storedIsKnown`, guard в `set()` против пустого имени.
- `packages/vue/src/anti-fouc.ts` — ветвление `themeInitScript` по `normalizeThemeName`.
- `packages/nuxt/src/internal/normalize.ts` — `default: options.default ?? ''`.
- `packages/nuxt/src/types.ts` — `default: string` (было `string | undefined`).
- `packages/nuxt/README.md`, `apps/playground/nuxt.config.ts` (снят `default: 'light'`).
- Тесты: `theme-name.test.ts` (новый), дополнения `use-theme.test.ts` (+3)/`anti-fouc.test.ts` (+1),
  переписан контракт в `module.test.ts`. `pnpm test` — 505 тестов, все зелёные.
- `pnpm typecheck`/`pnpm build`/`pnpm lint`/`pnpm check:pack` — все exit 0.
- Живой смок playground (port 4177): HTTP 200, `prefers-color-scheme` в head, `__NUXT__`
  runtimeConfig `themeon.default:""`. Сервер остановлен.
- Коммит `62e81e7`. `plans/2026.07.12-BASE/{plan.md,phases/P3.md}` обновлены (Status Board 7/7,
  Update Log, Phase Handoff).
- **Фаза P7 задизайнена облегчённо** (`/task:plan-design 2026.07.12-BASE P7`, sonnet/high,
  P-D47): 6 trigger-gated backlog-items (`phases/P7.md`) — registry пресетов, Bootstrap/
  Vuetify/PrimeVue-адаптеры, Vue-обёртки, Blade-composer; ни один не начат (0/6 ⬜), реального
  потребителя ни у одного нет. `plan.md` Status Board/Decision Log/Update Log обновлены.

**Remaining:**

1. **Adversarial-review P3.7** (opus/xhigh, обязателен по Routing) — по коммиту `62e81e7`.
2. **P5.9** — доисполнение vintera поверх P3.7: yalc-обновление `@themeon/{vue,nuxt}` в ветке →
   гейты → живая матрица тем (строки 1 и 5 — прямые регресс-тесты блокера) → adversarial-review.
3. **P5.11** — dterema: то же yalc-обновление + матрица (dterema без тумблера: `matchMedia` —
   единственный путь в dark).
4. **P5.10** — снятие легаси-алиасов + `themeon check --coverage` + визуал (последний item фазы).
5. **P7** (низкий приоритет, не блокирует P5/P6) — 6 items ждут реального потребителя; при
   появлении любого триггера — `/task:plan-design 2026.07.12-BASE P7.m` заново (полный DoD +
   свежий RAG), облегчённый текст сегодня не заменяет это.

**Sources of truth:**

- План: `~/projects/packages/themeon/plans/2026.07.12-BASE/` (repo = SSOT во время exec; зеркало
  Vault — `rsync -a --delete` после правок, `/home/vostrikov/Vaults/Brain/05-Projects/03-Packages/
  ThemeOn/plans/2026.07.12-BASE/`).
- Пилоты: `~/projects/vintera/vintera` (ветка `themeon-migration/P5`, HEAD `4666633`),
  `~/projects/dterema/app` (ветка `themeon-migration/P5`, HEAD `821b561`) — обе ветки НЕ смёржены,
  ещё не обновлены на свежий `@themeon/{vue,nuxt}` (P5.9/P5.11).
- Пакеты: `~/projects/packages/themeon/packages/{vue,nuxt}` — фикс P3.7 закоммичен, `dist` свежий
  (`pnpm build` прогнан после правок), готов к yalc.

**Open risks:**

- **Дефект `default: ''` всё ещё сидит в коммитах ОБОИХ пилотов** до yalc-обновления в P5.9/P5.11 —
  merge веток в main раньше этого шага отдаст в прод сломанный system-preference-фолбэк.
- `Catalog.vue` 993–1023px drawer dead-band (P5.8 MED, не починена) — решение человека перед merge.
- Визуал-сайнофф человека (P-D29 Naive-состояния + сдвиг breakpoint-порогов P-D41) — до merge.
- `plans/` в репозитории пакета НЕ под git (`?? plans/`) — коммит-гейт протокола на неотслеживаемом
  плане не работает; см. `open-questions.md` Q5.
- Наследие P5.5–P5.7: GitHub CI не проверен живьём, npm-org может быть занята, ThemeOn-пакеты версии
  `0.0.0`, yalc-канал не-mergeable перед реальным merge.

**Workarounds / Deferred / Open questions:**

- **workarounds:** `NUXT_TYPECHECK=0` для `nuxt dev` в vintera (баг `vite-plugin-checker`, не связан
  с ThemeOn).
- **deferred:** `types/theme-tokens.ts` + большая часть `types/theme.ts` (vintera) осиротели —
  кандидаты на удаление в P5.10; короткие Tailwind-утилиты для 7 ключей; хардкод vintera за пределами
  именованного списка P5.7; `toNative()` var-name→role маппинг (генерализация пакета, найдено P5.4).
- **open_questions:** `open-questions.md` — Q3 (`@bg-dev/nuxt-naiveui`: оставить/снять/урезать) и Q5
  (`plans/` под git?) ждут владельца; Q4 (генерализация пакета: `toNative` `varMap`, `aliases`/
  `refLayer` в модуле, breakpoints-мост) — Exploration, кандидат в отдельную фазу после P5. **P7
  остаётся отдельным backlog** (не поглощает Q4 — так решил пользователь при дизайне P7 2026-07-13).
