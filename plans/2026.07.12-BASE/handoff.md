# HANDOFF — 2026-07-15 — after P9.4

**Next:** `/task:plan-exec 2026.07.12-BASE P9.5` — финальная сборка сайта v0.1 (лендинг, аудит
мёртвых ссылок, ссылка из корневого `README.md`, git-тег `docs-v0.1.0`), item уже полностью
детализирован в `phases/P9.md` (Definition of Detailed от 2026-07-15), исполнять штатно.

| Параметр | Значение |
|:--|:--|
| Model | sonnet |
| Thinking | medium |
| Context | continue (/clear) — ручной item |
| Суть | Собрать лендинг `index.md`, прогнать полный аудит мёртвых ссылок по всему сайту (18+ страниц), добавить ссылку на сайт в корневой `README.md`, поставить git-тег `docs-v0.1.0` — последний item фазы P9, после него `/task:plan-close 2026.07.12-BASE P9` |

```
/task:plan-exec 2026.07.12-BASE P9.5
```

**Done:**

- P9.1 **исполнен и закрыт** (`/task:plan-exec 2026.07.12-BASE P9.1`, sonnet/medium): VitePress-
  скелет поднят целиком — конфиг с 14-путевой IA nav/sidebar, GH Pages CI, `docs/laravel.md` 3
  ссылки → GitHub-URL (D-P78). Item-коммит `aef56ce`.
- P9.2 **исполнен и закрыт** (`/task:plan-exec 2026.07.12-BASE P9.2`, sonnet/medium): 4 страницы
  Introduction — why-themeon/installation/quick-start/changelog, все code-block'ы quick-start —
  дословные копии рабочих примеров из README'ов пакетов. Item-коммит `4df479c`.
- P9.3 **исполнен и закрыт** (`/task:plan-exec 2026.07.12-BASE P9.3`, sonnet/medium): 9 страниц
  Basic Usage — `docs/basic-usage/{core,css,colors,vue,nuxt,vite,naive,tailwind,cli}.md`. Каждая:
  тэглайн из `README.md` таблицы пакетов, таблица главных экспортов (сверена грепом против
  `src/index.ts`), один code-example дословно из README пакета, ссылка «Full API & options» на
  GitHub. Item-коммит `35d1067`. Known Deviation: тэглайн `tailwind.md` — актуальный `@theme
  reference` вместо устаревшего `@theme inline` корневого `README.md`.
- P9.4 **исполнен и закрыт** (`/task:plan-exec 2026.07.12-BASE P9.4`, sonnet/medium): 2 Best
  Practices + 2 Recipes.
  - `docs/best-practices/fail-loud.md`: правило «throw `ThemeonError`, не тихий fallback». ✅ —
    дословная цитата `packages/naive/src/to-native.ts` (throw `BAD_COLOR`). ❌ — гипотетический
    антипаттерн, помечен «(illustrative — not real project history)».
  - `docs/best-practices/tailwind-reference.md`: правило «мост на `@theme reference`, не `@theme
    inline`». ✅ — текущий `packages/tailwind/src/bridge.ts`. ❌ — РЕАЛЬНЫЙ исторический код того
    же файла до коммита `caf5815` (`git show caf5815^:...`), не гипотетический — задокументирован
    как исходный дефект P8.3.
  - `docs/recipes/laravel-vite.md` — `git mv docs/laravel.md`, проза не переписана; исходящие
    ссылки уже были GitHub-URL (D-P78), не тронуты.
  - `docs/recipes/anti-fouc.md` — рецепт `themeInitScript()` вне Vue/Nuxt, обобщённый из
    `packages/vue/README.md` + Blade-примера бывшего `docs/laravel.md`.
  - Входящие ссылки на старый `docs/laravel.md` поправлены репо-wide (Impl Rule 3):
    `docs/basic-usage/core.md`, `packages/vite/README.md`. `.changeset/*.md` пропущен
    (исторические записи, исключение по ТЗ).
  - **Item-коммит `02984dc`** (6 файлов: 2 best-practices новых, `laravel-vite.md` rename,
    `anti-fouc.md` новый, правка 2 ссылок в `core.md`/`packages/vite/README.md`).
  - **Validation зелёная:** `pnpm docs:build` → exit 0 (4 новые страницы собраны); `grep -rn
    'docs/laravel.md' --include='*.md' .` — 0 результатов вне `plans/`/`.changeset/` (на
    `02984dc`); `grep -nE '\]\(\.\.?/' docs/recipes/laravel-vite.md` — 0 результатов.
  - **Known Deviation (material, не process):** ТЗ item'а перечислило для `fail-loud.md` 8 кодов
    как единый `ThemeonErrorCode` union `packages/core/src/errors.ts`, но 3 из них
    (`SEED_OUT_OF_BAND`/`CONTRAST_UNREACHABLE`/`ALPHA_NEEDS_BASE`) на деле принадлежат отдельному
    `ColorsErrorCode` в `packages/colors/src/errors.ts` — ТЗ смешало два разных union'а/класса
    ошибок под одним файловым якорем. Страница процитировала ФАКТИЧЕСКИЙ `ThemeonErrorCode` из
    `packages/core/src/errors.ts` целиком и точно (10 членов), не список из ТЗ. См. `phases/P9.md`
    P9.4 Known Deviations.
- Статусы: `phases/P9.md` P9.4 → 🟠 Done with deviations (Phase Status + item), `plan.md` §4
  Status Board P9 → 4/5, 🟡 In progress, Version bump 0.8.4→0.8.5, `## 6. Update Log` — новая
  строка.

**Remaining:**

1. Исполнить P9.5 (последний item фазы) — Routing = дефолт sonnet/medium, `Exec = plan-exec`, БЕЗ
   обязательного adversarial-review — `plan.md` §3.
2. После P9.5 — `/task:plan-close 2026.07.12-BASE P9` (фаза станет терминальна, 5/5).
3. P9.5 — финальный аудит мёртвых ссылок по ВСЕМУ сайту (18+ страниц): P9.2 forward-ссылки на
   `/best-practices/*`/`/recipes/*` из `quick-start.md`/`installation.md` теперь резолвятся (эти
   секции существуют с P9.4) — проверить, не пора ли вернуть их в вид markdown-ссылок (сейчас
   намеренно текстовые, см. предыдущий handoff). Не блокер — заметка для P9.5.
4. Владельцу/будущему item'у: корневой `README.md` таблица пакетов для `tailwind` устарела
   (`@theme inline` вместо актуального `@theme reference`) — вне Files P9.3/P9.4, см. Known
   Deviation P9.3.
5. P7 — спящий backlog (0/6 ⬜, без изменений).

**Sources of truth:**

- План: `~/projects/packages/themeon/plans/2026.07.12-BASE/` (repo = SSOT).
- P9.4 закрытие: `phases/P9.md` `### P9.4` Completion Notes/Validation/Known Deviations;
  item-коммит `02984dc`.
- P9.5 ТЗ (уже готово): `phases/P9.md` `### P9.5`.

**Git-факты:** item-коммит `02984dc` — `docs(site): Best Practices (fail-loud, @theme reference)
+ Recipes (laravel-vite, anti-fouc) (P9.4)` (6 файлов). Bookkeeping-коммит для этого HANDOFF —
следующий коммит после этой записи (`plans/2026.07.12-BASE/**` + `plans/ACTIVE.md`).

**Open risks:**

- GH Pages CI (P9.1) деплоит на каждый push в `main`, трогающий `docs/**` — сайт виден публично с
  неполной навигацией до P9.5 (осознанно принято, P-D76 / Phase Handoff P9). Не Known Deviation
  отдельных items.
- Корневой `README.md` таблица пакетов рассинхронизирована с `packages/tailwind/README.md` по
  форме Tailwind-моста (`@theme inline` vs актуальный `@theme reference`) — см. Remaining п. 4,
  Known Deviation P9.3.
- Предыдущие open risks (P9-дизайн, plan-lint pre-existing ERROR) — без изменений, см. git-историю
  handoff.

**Workarounds / Deferred / Open questions:** без изменений, см. `open-questions.md` (Q3/Q6/Q4/P7).
