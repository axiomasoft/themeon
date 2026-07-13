---
title: R-10 — P0 pins: npm-имя + версии инструментов монорепо
project: THEMEON
phase: P0
type: research
method: npm-registry (ground truth) + perplexity-web (corroboration)
verified: 2026-07-07
reconfirmed: 2026-07-07 (P0.1 — npm registry HTTP 404×4 + search total 0 + `npm view` × 11 пакетов + nodejs.org/dist — все значения §1–2 совпали без расхождений, правок не потребовалось)
---

# R-10 — P0: доступность npm-имени и пины версий инструментов

> Источник истины версий — **npm registry `dist-tags.latest`** и **nodejs.org/dist**
> (запрошены напрямую 2026-07-07). perplexity-web использован для перекрёстной проверки
> и обнаружил расхождение (TypeScript: perplexity утверждал «7.0.0», registry даёт 6.0.3 —
> взят registry). Все пины — точные, exec-исполнитель (P0.1) обязан ПЕРЕПРОВЕРИТЬ их
> `npm view <pkg> version` на момент исполнения (registry живой, цифры дрейфуют).

---

## 1. npm-имя (D1) — проверка обязательна была

| Проверка | Метод | Результат (2026-07-07) |
|:--|:--|:--|
| Пакет `themeon` (unscoped) | `GET registry.npmjs.org/themeon` | **HTTP 404** → свободно |
| `@themeon/core` | `GET registry.npmjs.org/@themeon%2Fcore` | **HTTP 404** → свободно |
| `@themeon/cli` | `GET registry.npmjs.org/@themeon%2Fcli` | **HTTP 404** → свободно |
| Поиск `themeon` | `GET registry.npmjs.org/-/v1/search?text=themeon` | **total 0** → нет похожих опубликованных |
| Страницы npmjs.com (`/package/themeon`, `/org/themeon`, `/~themeon`) | `GET` | HTTP 403 (антибот Cloudflare) — **неинформативно**, registry-API авторитетнее |

**Вывод:** и unscoped `themeon`, и scope `@themeon` — свободны на npm. Ограничение: scope
привязан к **npm-организации/пользователю `themeon`** — она резервируется в момент
**первой публикации** (кто первым создаст org `themeon`, тот владеет scope). До момента
первого `npm publish` (фаза P4/release) гарантии нет — исполнитель release-фазы обязан
создать org `themeon` заранее (npmjs.com → Add Organization) и повторить проверку.

**Fallback-цепочка (D1, риск-таблица master §7)**, если на момент claim org занята:
1. scope `@theme-on/*` (пакет CLI `theme-on`);
2. vendor-scope `@axioma/themeon` (под существующей экосистемой);
3. unscoped `themeon` для CLI + `@axioma/*` для библиотек.

Решение D1 подтверждается провизорно (имя свободно сегодня); финальный claim — в release.

---

## 2. Пины версий инструментов (ground truth: npm registry `dist-tags.latest`, 2026-07-07)

| Инструмент | Пин | Дата релиза | Источник (registry / docs) |
|:--|:--|:--|:--|
| **pnpm** (package manager) | `11.10.0` | 2026-07-04 | https://registry.npmjs.org/pnpm · https://pnpm.io |
| **tsdown** (bundler, Rolldown) | `0.22.3` | 2026-06-16 | https://registry.npmjs.org/tsdown · https://tsdown.dev |
| **vitest** | `4.1.10` | 2026-07-06 | https://registry.npmjs.org/vitest · https://vitest.dev |
| **@vitest/coverage-v8** | `4.1.10` | 2026-07-06 | https://registry.npmjs.org/@vitest/coverage-v8 |
| **typescript** | `6.0.3` | 2026-04-16 | https://registry.npmjs.org/typescript · https://www.typescriptlang.org |
| **vite** (playground/vite-плагин L2) | `8.1.3` | 2026-07-02 | https://registry.npmjs.org/vite · https://vite.dev |
| **nuxt** (playground) | `4.4.8` | 2026-06-08 | https://registry.npmjs.org/nuxt · https://nuxt.com |
| **oxlint** (linter, VoidZero) | `1.73.0` | 2026-07-06 | https://registry.npmjs.org/oxlint · https://oxc.rs |
| **publint** (pack-gate) | `0.3.21` | 2026-05-13 | https://registry.npmjs.org/publint · https://publint.dev |
| **@arethetypeswrong/cli** (`attw`) | `0.18.4` | 2026-06-22 | https://registry.npmjs.org/@arethetypeswrong/cli · https://arethetypeswrong.github.io |
| **@changesets/cli** (release, P0.4) | `2.31.0` | 2026-04-17 | https://registry.npmjs.org/@changesets/cli · https://github.com/changesets/changesets |

**eslint** сознательно НЕ берём (10.6.0 существует) — линтер стека выбран oxlint (см. §3).

### Node.js (runtime / engines)

| Линия | Latest (2026-07-07) | Роль | Источник |
|:--|:--|:--|:--|
| Node 24 «Krypton» (Active LTS) | `v24.18.0` | `.node-version`, primary CI | https://nodejs.org/dist/index.json |
| Node 22 «Jod» (Maintenance LTS) | `v22.23.1` | floor CI-матрицы | https://nodejs.org/dist/index.json |

- **engines floor = `>=22.18.0`** — минимум сборочного окружения tsdown 0.22.x
  (tsdown требует Node ≥22.18.0; https://tsdown.dev — «Getting Started»).
- **CI-матрица = `[22, 24]`**; `.node-version = 24` (Active LTS).

---

## 3. Решения по инструментам (обоснование, фиксируются в plan.md Decision Log)

- **Linter = oxlint, не eslint.** oxlint из VoidZero/oxc — один стек с Rolldown/tsdown/Vite,
  zero-config, Rust-скорость, не требует typescript-eslint-парсера для базовых correctness-lint.
  Для P0 (базовый lint-гейт) достаточно; type-aware правила (если понадобятся в P1+) —
  добавить eslint+typescript-eslint точечно, не ломая oxlint-базу.
- **Пины централизованы через pnpm catalog** (`catalog:` в `pnpm-workspace.yaml`) — единый
  источник версий dev-тулинга для всех пакетов, обновление в одном месте. Стабильно с pnpm 9.5+.
- **tsdown 0.x — pre-1.0, но принят**: активный релиз-цикл, позиционирование «bundler for
  libraries», backing Rolldown. Риск edge-cases отмечен; митигируется pack-гейтами
  (publint + attw) в CI, которые ловят битые exports/types конструктивно.
- **@themeon/core создаётся как stub в P0** (один тривиальный export + один тест) —
  чтобы прогнать build→dts→test→publint→attw end-to-end до написания реальной логики (P1).

---

## 4. Провенанс и оговорки

- Все версии — `dist-tags.latest` npm registry на 2026-07-07 (живой источник; P0.1 обязан
  перепроверить `npm view` при исполнении — цифры сдвинутся).
- perplexity-web дал корректный порядок величин, но ошибся по TypeScript (называл «7.0.0
  от 2026-01-15»; registry — 6.0.3). Registry-число взято как истина. `[UNVERIFIED]`-меток
  не осталось: имя и версии проверены прямым запросом к первоисточникам.
- npmjs.com HTML-страницы под антибот-защитой (403) — для проверки имени бесполезны;
  авторитетен только registry-API (`registry.npmjs.org`).
