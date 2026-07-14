# HANDOFF — 2026-07-15 — after P5.9

**Next:** **ESCALATION-REQUIRED: P5.9 — конфликт правил (`@layer`-приоритет `themeon.tokens` vs
Tailwind-дефолты).** Требуется **plan-design** сессия, НЕ `plan-exec` — item P5.9 остаётся
`🔴 Blocked` до ре-дизайна.

| Параметр | Значение |
|:--|:--|
| Model | **opus** |
| Thinking | **xhigh** (Routing `plan.md` §3 «P5 (пилоты) — opus/xhigh») |
| Context | **NEW SESSION — шаг-не-item** |
| Суть | Разрешить конфликт правил: P-D40 предписывает `<link base-vars.css>` ПЕРВЫМ ради каскад-порядка (дименсия 1 обязательного review — app/Tailwind-CSS после токенов), но этот же порядок регистрирует `@layer themeon.tokens` РАНЬШЕ Tailwind-слоёв → структурно ГАРАНТИРУЕТ, что `@layer theme` (Tailwind-дефолты) бьёт любые ThemeOn-имена, совпадающие с built-in Tailwind-токенами (`--radius-*`, `--font-*`, `--text-*` — совпадение неслучайно, D5 намеренно зеркалит Tailwind-неймспейсы). Решить архитектурно: явный `@layer`-приоритет поверх link-порядка (напр. `@layer themeon.tokens, theme;` объявление раньше обоих файлов) / расширение `@theme inline`-моста P5.7 на `--radius-*`/`--font-*`/`--text-*` (по образцу фикса 7 `--color-*`-пар, P5.7 MED-1) / переименование коллидирующих ThemeOn-токенов — завести новый D#, решить, чья это фаза-владелец (P2 `@themeon/css` слой-контракт / P4 `@themeon/tailwind` / переоткрытие P5.7). |

```
/task:plan-design 2026.07.12-BASE P5.9
```

**Cold-start reads (по порядку):**

1. `plans/2026.07.12-BASE/phases/P5.md` — item **P5.9** целиком, включая ВСЕ blockquote (две
   ESCALATION 2026-07-13/2026-07-14 разрешены plan-design → эта, третья, 2026-07-15 — НОВАЯ,
   ещё не разрешена) и Completion Notes «Доисполнение 2026-07-15» (живая матрица + гейты +
   review-отчёт дословно).
2. `plans/2026.07.12-BASE/phases/P5.md` — item **P5.7** Completion Notes, MED-1 (тот же класс
   дефекта — самоссылочные `--color-*` в `@theme inline` били layer-приоритетом, там точечно
   починено удалением 7 пар из моста; новая находка — Tailwind СОБСТВЕННЫЕ built-in имена, не
   входящие в мост вообще).
3. `plans/2026.07.12-BASE/plan.md` §5 Decision Log — **P-D40** (полный текст: почему link-порядок
   обязателен) и **P-D36** (короткие Tailwind-классы vintera, контекст alias-моста).

**Суть находки (одним абзацем):** обязательный adversarial-review (opus/xhigh, read-only, по
`c8d5bee`) прошёл 4 измерения из 5 (каскад-порядок, Sass-грep, визуал/Naive/мёртвые копии,
конформанс P-D49 — все PASS). Измерение 2 (Computed-кросс-чек, P-D39) — **FAIL**: 13 `--*`-токенов
(`--radius-md/lg/xl`, `--font-sans/mono`, `--text-xs/sm/lg`+`--size-xs/sm/lg`) на живой странице
отдают Tailwind-дефолтные значения вместо значений `base-vars.css`, идентично в light/dark. Причина
(подтверждена по сгенерированному CSS): `tailwind.css` (`@import "tailwindcss"`) эмитит СВОИ
built-in `--radius-*`/`--font-*`/`--text-*` в `@layer theme`; `base-vars.css` — `@layer
themeon.tokens`. `base-vars.css` грузится ПЕРВЫМ (обязательно по P-D40 для дименсии 1), поэтому его
слой регистрируется РАНЬШЕ → получает НИЗШИЙ приоритет в CSS-каскаде → Tailwind-дефолты для
совпадающих имён побеждают. Реальные потребители задеты: border-radius на 7 компонентах
(Hero/WatchSection/Ads/PopularChannels/CurrentProgram/Meta) и **font-family всего сайта**
(`reset.sass:11`, `typography.sass:6` — брендовый `"Commissioner"` подменяется `ui-sans-serif`).
Код пилота НЕ трогался (дифф на `c8d5bee` пуст) — находка пред-существующая, впервые вскрыта именно
этим измерением review.

**Done:** (эта сессия — только живые проверки + review, ни строчки кода пилота/пакетов)

- Preflight: vintera чист по Scope (`HEAD c8d5bee`, ветка `themeon-migration/P5`, посторонний дифф
  не тронут), фикс P3.7 подтверждён в установленной yalc-копии (`trim()` присутствует).
- **Живая матрица тем (Playwright/Chromium 149, все 6 строк, обе колонки) — ЗЕЛЁНАЯ ЦЕЛИКОМ** по
  акцептансу P-D64/P-D65, включая новую строку 6 («живое следование за ОС», `emulateMedia` без
  reload) — ни разу раньше не снималась.
- **Детерминированные гейты (на `c8d5bee`)** — все зелёные: parity exit 0 (без `[added]`), `git diff
  --stat 6e84299 HEAD -- base-vars.css` пусто, typecheck/lint/test(37/37)/lint:css(0 errors/122
  warnings), SSR-head cascade-order, removed-files grep, Sass-грep.
- **Обязательный adversarial-review (opus/xhigh, read-only, `c8d5bee`) — ПРОВЕДЁН впервые.**
  4/5 PASS + 1×MAJOR (см. выше). Полный отчёт — `phases/P5.md` P5.9 Completion Notes «Доисполнение
  2026-07-15».
- `phases/P5.md` — P5.9: НОВЫЙ blockquote ESCALATION, Status → 🔴 Blocked, Escalation Needed → yes,
  Completion Notes дополнены дословными результатами. `## Phase Status` строка P5.9 → 🔴 Blocked.
- `plan.md` — Meta (Status/Last Updated), `## 4.` Status Board (P5 → 🔴 Blocked), Update Log.

**Remaining:**

1. **P5.9** — разрешить эскалацию (`plan-design`): архитектурное решение по `@layer`-приоритету
   ThemeOn vs Tailwind-дефолты, новый D#, синхронизация Scope Included/Code Guidance/Validation
   P5.9 под решение, снять эскалацию, вернуть Status в `🟡 In progress`. Затем доисполнить (сама
   правка + перепрогон дименсии 2 review + закрытие item'а).
2. **P5.11 / P5.10** — по-прежнему за P5.9 в очереди; P5.11 (dterema, без Tailwind) этой находкой
   НЕ затронут (коллизия специфична Tailwind-пилоту vintera).
3. **P6 / P7** — без изменений, скелет/backlog.

**Sources of truth:**

- План: `~/projects/packages/themeon/plans/2026.07.12-BASE/` (repo = SSOT; Vault — зеркало).
- vintera: `~/projects/vintera/vintera`, ветка `themeon-migration/P5`, **`HEAD` = `c8d5bee`**
  (не изменился этой сессией). Working tree несёт ПОСТОРОННИЙ дифф (`.agents/skills/**`,
  `.swissknifeman/config.json`, `skills-lock.json`, untracked `.claude/analyst/`) — НЕ трогать.
- Пакеты ThemeOn: `~/projects/packages/themeon/packages/*`, `HEAD` `782d568` (не изменился). Правка
  пакетов из пилота запрещена (P-D45) — находка живёт в пакете/мосте, чья фаза-владелец решит
  plan-design.
- Scratchpad не переживает сессию: `matrix.js` (Playwright-матрица), `themeon-parity.mjs` +
  `baseline-vintera-p5.9.json` воспроизводятся с нуля по Code Guidance P5.1/P5.9. Playwright/Chromium
  временная установка — тоже не переживает сессию.

**Open risks:**

- **Соблазн «починить» находку локальным обходом в пилоте** (напр. переименовать классы в
  компонентах на хардкод-px вместо `var(--radius-*)`) — запрещено: находка архитектурная, фикс —
  решение plan-design, не точечный патч P-D45-нарушающего типа.
- Находка, вероятно, СИСТЕМНАЯ для любого будущего Tailwind-пилота (не только vintera) — plan-design
  должен рассмотреть фикс на уровне пакета (`@themeon/css`/`@themeon/tailwind`), а не только vintera.
- Стале Vite dep-cache (см. предыдущие сессии) — не проявился этой сессией (кэш чистился ДО
  `nuxt dev`), но остаётся риском при повторном прогоне без очистки.

**Workarounds / Deferred / Open questions:**

- **Q6** — легаси-персист донора: чистить `localStorage['theme']` на мёрже? Владельцу, до merge
  веток. P5.9 не блокирует (P-D66).
- **Q3** — судьба `@bg-dev/nuxt-naiveui` (владельцу, до merge).
- P5.7/P5.8 — собственные merge-time эскалации (визуал-сайнофф сдвига порогов + мёртвая полоса
  `Catalog.vue` 993–1023px). Перед мёржем веток, не перед закрытием P5.9.
