# HANDOFF — 2026-07-15 — after P9.3

**Next:** `/task:plan-exec 2026.07.12-BASE P9.4` — Best Practices + Recipes (миграция
`docs/laravel.md`), item уже полностью детализирован в `phases/P9.md` (Definition of Detailed
от 2026-07-15), исполнять штатно.

| Параметр | Значение |
|:--|:--|
| Model | sonnet |
| Thinking | medium |
| Context | continue (/clear) — ручной item |
| Суть | 2 гайдлайн-страницы Best Practices (✅/❌, реальный канон пакетов) + `git mv docs/laravel.md → docs/recipes/laravel-vite.md` (frontmatter, без переписывания содержания) + 1 новый рецепт anti-FOUC — закрыть штатной топологией 2 коммитов |

```
/task:plan-exec 2026.07.12-BASE P9.4
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
  `packages/<pkg>/src/index.ts`, для `css` — `contract.ts`, для `nuxt` — `module.ts` default
  export), один code-example дословно из README пакета, ссылка «Full API & options» на
  `https://github.com/axioma-studio/themeon/tree/main/packages/<pkg>#readme`.
  - **Item-коммит `35d1067`** (9 файлов, 336 insertions — только новые страницы).
  - **Validation зелёная:** `pnpm docs:build` → exit 0, все 9 страниц в `dist/basic-usage/`;
    греп-сверка экспортов против каждого `packages/<pkg>/src/index.ts` — 0 расхождений по всем 9
    пакетам (на `35d1067`); все 9 GitHub-ссылок используют реальный `<pkg>` — 0 опечаток.
  - **Known Deviation (material, не process):** тэглайн `tailwind.md` использует актуальную
    формулировку `@theme reference` (пакетный README, P8-подтверждённый фикс) вместо буквального
    `@theme inline` из корневого `README.md` (устарело с P8) — публикация заведомо неработающей
    формы противоречила бы инварианту фазы «ни один пример не расходится с реальным API».
    Корневая таблица `README.md` осталась несинхронизированной — вне `Files` item'а, заметка для
    владельца/будущего item'а. См. `phases/P9.md` P9.3 Known Deviations.
- Статусы: `phases/P9.md` P9.3 → 🟠 Done with deviations (Phase Status + item), `plan.md` §4
  Status Board P9 → 3/5, 🟡 In progress, Version bump 0.8.3→0.8.4, `## 6. Update Log` — новая
  строка.

**Remaining:**

1. Исполнить P9.4 → P9.5, строго последовательно (Routing = дефолт sonnet/medium,
   `Exec = plan-exec`, БЕЗ обязательного adversarial-review — `plan.md` §3).
2. P9.4 миграция `laravel.md` (`git mv` → `docs/recipes/laravel-vite.md` + frontmatter) — ссылки
   на `packages/vite/README.md` УЖЕ GitHub-URL после P9.1 (D-P78), миграция не должна их трогать
   повторно.
3. P9.4 добавляет страницы `/best-practices/*`, `/recipes/*` — как только они появятся, стоит
   проверить, не вернуть ли forward-ссылки из P9.2 (`quick-start.md`, `installation.md`), которые
   сейчас намеренно текстовые (не markdown-ссылки), чтобы не ловить dead-link на несуществующих
   страницах. `/basic-usage/*` уже резолвится после P9.3. Не блокер закрытия — заметка для P9.5
   (финальный аудит ссылок).
4. Владельцу/будущему item'у: корневой `README.md` таблица пакетов для `tailwind` устарела
   (`@theme inline` вместо актуального `@theme reference`) — вне Files P9.3, см. Known Deviation.
5. P9.5 — финальный лендинг + аудит мёртвых ссылок + git-тег `docs-v0.1.0` + ссылка из корневого
   `README.md`; после P9.5 — `/task:plan-close 2026.07.12-BASE P9`.
6. P7 — спящий backlog (0/6 ⬜, без изменений).

**Sources of truth:**

- План: `~/projects/packages/themeon/plans/2026.07.12-BASE/` (repo = SSOT).
- P9.3 закрытие: `phases/P9.md` `### P9.3` Completion Notes/Validation/Known Deviations;
  item-коммит `35d1067`.
- P9.4 ТЗ (уже готово): `phases/P9.md` `### P9.4`.

**Git-факты:** item-коммит `35d1067` — `docs(site): Basic Usage — страница на каждый из 9
пакетов (P9.3)` (9 файлов: `docs/basic-usage/{core,css,colors,vue,nuxt,vite,naive,tailwind,
cli}.md`). Bookkeeping-коммит для этого HANDOFF — следующий коммит после этой записи
(`plans/2026.07.12-BASE/**` + `plans/ACTIVE.md`).

**Open risks:**

- GH Pages CI (P9.1) деплоит на каждый push в `main`, трогающий `docs/**` — сайт виден публично с
  неполной навигацией между P9.1–P9.5 (осознанно принято, P-D76 / Phase Handoff P9). Не Known
  Deviation отдельных items.
- Корневой `README.md` таблица пакетов рассинхронизирована с `packages/tailwind/README.md` по
  форме Tailwind-моста (`@theme inline` vs актуальный `@theme reference`) — см. Remaining п. 4,
  Known Deviation P9.3.
- Предыдущие open risks (P9-дизайн, plan-lint pre-existing ERROR) — без изменений, см. git-историю
  handoff.

**Workarounds / Deferred / Open questions:** без изменений, см. `open-questions.md` (Q3/Q6/Q4/P7).
