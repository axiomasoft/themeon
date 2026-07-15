# HANDOFF — 2026-07-15 — after P9.2

**Next:** `/task:plan-exec 2026.07.12-BASE P9.3` — Basic Usage: страница на каждый из 9
пакетов, сам item уже полностью детализирован в `phases/P9.md` (Definition of Detailed от
2026-07-15), исполнять штатно.

| Параметр | Значение |
|:--|:--|
| Model | sonnet |
| Thinking | medium |
| Context | continue (/clear) — ручной item |
| Суть | 9 тонких страниц Basic Usage (по одной на пакет), ссылка на README пакета за деталями, не дублирование API — закрыть штатной топологией 2 коммитов |

```
/task:plan-exec 2026.07.12-BASE P9.3
```

**Done:**

- P9.1 **исполнен и закрыт** (`/task:plan-exec 2026.07.12-BASE P9.1`, sonnet/medium): VitePress-
  скелет поднят целиком — конфиг с 14-путевой IA nav/sidebar, GH Pages CI, `docs/laravel.md` 3
  ссылки → GitHub-URL (D-P78). Item-коммит `aef56ce`.
- P9.2 **исполнен и закрыт** (`/task:plan-exec 2026.07.12-BASE P9.2`, sonnet/medium): 4 страницы
  Introduction — `docs/introduction/why-themeon.md` (проблема: паттерн темизации скопипащен в
  dterema/vintera/octoclick; ниша — RAG `20_research/R-01..R-07`, нет прямого конкурента,
  ближайший TokiForge без адаптеров), `installation.md` (`pnpm add`/`npm add` per-package
  сниппеты на все 9 пакетов, Node `>=22.18.0`), `quick-start.md` (`::: code-group` 4 вкладки
  Vue/Nuxt/Vite/Laravel, Define→Build→Consume, каждый code-block — дословная копия рабочего
  примера из README пакета/`docs/laravel.md`, источники `файл:строки` в Completion Notes),
  `changelog.md` (заглушка pre-1.0, 15 pending changesets одним списком тем + ссылка на GitHub
  commit history).
  - **Item-коммит `4df479c`** (4 файла, 273 insertions — только новые страницы, без побочных
    файлов).
  - **Validation зелёная:** `pnpm docs:build` → exit 0 (после правки — 3 forward-ссылки на ещё
    не существующие страницы `/basic-usage/*`/`/best-practices/*`/`/recipes/*` заменены на
    обычный текст, чтобы не ловить dead-link на несуществующих P9.3–P9.5 страницах); грепом
    подтверждены все экспортируемые символы (`defineTokens`/`defineTheme` из
    `packages/core/src/index.ts`, `useTheme` из `packages/vue/src/index.ts`, `themeon` из
    `packages/vite/src/index.ts`) — не пусто. `pnpm docs:dev` дошёл до `ready`.
  - **Known Deviation (process, не material):** curl на dev-порт вернул SPA-шелл без
    SSR-контента (VitePress dev не рендерит на сервере) — заменил на греп код-блоков в
    статичном `pnpm docs:build`-выводе (`docs/.vitepress/dist/introduction/quick-start.html` →
    11 `language-*`-блоков). См. `phases/P9.md` P9.2 Known Deviations.
- Статусы: `phases/P9.md` P9.2 → 🟢 Done (Phase Status + item), `plan.md` §4 Status Board P9 →
  2/5, 🟡 In progress, Version bump 0.8.2→0.8.3, `## 6. Update Log` — новая строка.

**Remaining:**

1. Исполнить P9.3 → P9.4 → P9.5, строго последовательно (все Routing = дефолт sonnet/medium,
   `Exec = plan-exec`, БЕЗ обязательного adversarial-review — `plan.md` §3).
2. P9.4 миграция `laravel.md` (`git mv` → `docs/recipes/laravel-vite.md` + frontmatter) — ссылки
   на `packages/vite/README.md` УЖЕ GitHub-URL после P9.1 (D-P78), миграция не должна их трогать
   повторно.
3. P9.3/P9.4 добавляют страницы `/basic-usage/*`, `/best-practices/*`, `/recipes/*` — как только
   они появятся, стоит проверить, не стоит ли вернуть forward-ссылки из P9.2 (`quick-start.md`,
   `installation.md`), которые сейчас намеренно текстовые (не markdown-ссылки), чтобы не ловить
   dead-link на несуществующих страницах. Не блокер закрытия P9.2 — заметка для P9.5 (финальный
   аудит ссылок).
4. P9.5 — финальный лендинг + аудит мёртвых ссылок + git-тег `docs-v0.1.0` + ссылка из корневого
   `README.md`; после P9.5 — `/task:plan-close 2026.07.12-BASE P9`.
5. P7 — спящий backlog (0/6 ⬜, без изменений).

**Sources of truth:**

- План: `~/projects/packages/themeon/plans/2026.07.12-BASE/` (repo = SSOT).
- P9.2 закрытие: `phases/P9.md` `### P9.2` Completion Notes/Validation/Known Deviations;
  item-коммит `4df479c`.
- P9.3 ТЗ (уже готово): `phases/P9.md` `### P9.3`.

**Git-факты:** item-коммит `4df479c` — `docs(site): Introduction — why/install/quick-start/
changelog (P9.2)` (4 файла: `docs/introduction/changelog.md`, `installation.md`,
`quick-start.md`, `why-themeon.md`). Bookkeeping-коммит для этого HANDOFF — следующий коммит
после этой записи (`plans/2026.07.12-BASE/**` + `plans/ACTIVE.md`).

**Open risks:**

- GH Pages CI (P9.1) деплоит на каждый push в `main`, трогающий `docs/**` — сайт виден публично с
  неполной навигацией между P9.1–P9.5 (осознанно принято, P-D76 / Phase Handoff P9). Не Known
  Deviation отдельных items.
- P9.2 намеренно не ссылается на `/basic-usage/*`/`/best-practices/*`/`/recipes/*` (страниц ещё
  нет) — см. Remaining п. 3.
- Предыдущие open risks (P9-дизайн, plan-lint pre-existing ERROR) — без изменений, см. git-историю
  handoff.

**Workarounds / Deferred / Open questions:** без изменений, см. `open-questions.md` (Q3/Q6/Q4/P7).
