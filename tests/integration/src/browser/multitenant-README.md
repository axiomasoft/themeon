# P6.5 — сквозной multi-tenant демо-стенд (капстоун H3)

Самодостаточный демо-стенд, доказывающий END-TO-END в реальном Chromium (не jsdom), что
tenant-патч, применяемый в multi-tenant white-label флоу (CoreX/Flex*-паттерн, master §4.9),
не открывает stored-XSS/CSS-инъекцию (H3, `90_audit/FINAL_AUDIT_2026-07-12.md`) и не публикует
недостаточно контрастную тему (H3 И2). Стенд НЕ интегрируется в реальный CoreX/Flex*-репо
(P-D71) — mock-хранилище, framework-agnostic Node-стаб.

## Файлы

- `multitenant-render.ts` — стаб `renderTenantPage(tenantId)` + mock-хранилище `TENANT_STORE`.
- `multitenant-injection.test.ts` — три Chromium e2e-кейса.

## Канонический флоу (defense-in-depth, каждый рубеж fail-closed)

```
tenant-патч (mock-store)
  │
  ▼
Рубеж 1 — schema-валидация (P6.2 `tenantThemeSchema`, играет роль ВНЕШНЕГО PHP/Flex*-сервера)
  │  throw → страница НЕ рендерится
  ▼
Рубеж 2 — APCA-гейт (P6.3-композиция: `applyThemePatch` (P6.1, НЕЗАВИСИМЫЙ проход валидации
  │        ядра) + `checkThemeContrast` (@themeon/colors))
  │  throw / pass===false → страница НЕ рендерится
  ▼
Рубеж 3 — `serializeThemePatch` (P6.1 публичный контракт)
  │
  ▼
Инъекция: `serializeThemeCss(base)` (статика) + tenant-патч CSS ПОСЛЕ неё, ОБА — ТОЛЬКО
внутри `<style nonce>` в `<head>`, плюс анти-FOUC `themeInitScript()`
```

Любой throw на рубеже 1 или 2 → `renderTenantPageOrDefault` откатывается на дефолт-тему
(`renderDefaultPage()`), НЕ прокидывает исключение наружу до вызывающего кода "сервера".

## Почему рубеж 1 — самодельный валидатор, а не ajv

`@themeon/core` остаётся zero-dep (D12) — `tenantThemeSchema()` строит ДАННЫЕ (JSON Schema
draft 2020-12), не валидирует их рантаймом (P6.2 Scope Excluded). В реальном Flex*/PHP-сервере
эту роль играет ajv/opis. Здесь — минимальный walker (`validateAgainstSchemaNode`) поднадмножества
JSON Schema, которое реально эмитит `tenantThemeSchema` (`object`/`additionalProperties`/
`required`/`pattern`/`anyOf`/`number` min-max-multipleOf). Он НЕ претендует на полноту ajv — это
стенд-заглушка, доказывающая контракт схемы работает как ожидается на реальных tenant-патчах.

## Три кейса

1. **Легальный патч** (`acme`) — бренд-цвет + скругление проходят оба рубежа; Chromium
   подтверждает computed `background-color` кнопки = патченный цвет. Первый paint уже
   темизирован (инлайновый `<style>` в `<head>`, не async-подгрузка) — FOUC структурно
   невозможен.
2. **Вредоносный патч** (`evil`, R-16 §2 вектор `red}</style><script>window.__xss=1</script>`) —
   **двойная страховка**: (а) рубеж 1 (schema) бросает; (б) рубеж 2 (`applyThemePatch`,
   НЕЗАВИСИМЫЙ от рубежа 1) тоже бросает на том же значении — если бы рубеж 1 регрессировал,
   рубеж 2 всё равно не даёт CSS/HTML собраться. Реально отданная (fallback) страница
   загружается в Chromium — `window.__xss` не определён, полезная нагрузка физически не
   достигла документа.
3. **Низкоконтрастный патч** (`lowContrast`) — рубеж 2 (fail-closed APCA-гейт, Major #15
   сторож) блокирует публикацию; откат на дефолт-тему подтверждён в Chromium (высокий
   контраст `--color-text`/`--color-bg-page` дефолта).
