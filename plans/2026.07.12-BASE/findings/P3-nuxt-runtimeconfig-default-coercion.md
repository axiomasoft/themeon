# P3 — Nuxt runtimeConfig: `undefined` → `""` и почему ключ обязан присутствовать

**Дата верификации:** 2026-07-13 · **Повод:** ESCALATION P5.9 (`default: ""` убивает
system-preference-фолбэк на обоих пилотах) · **Потребители:** items P3.7, P5.9, P5.11.

## Факт 1 — Nuxt коерсит незаданное значение public runtimeConfig в пустую строку

**Статус:** RAG:✅ эмпирика (живой SSR vintera, `nuxt dev`, 2026-07-13) — в `__NUXT__`-пейлоаде
`themeon:{storageKey:"theme",default:"",themes:[...],attribute:"data-theme"}`, при том что
`@themeon/nuxt` кладёт `default: options.default` (= `undefined`,
`packages/nuxt/src/internal/normalize.ts:29`), а `nuxt.config.ts` пилота опцию `default` не задаёт.
Источник истины — наблюдение рантайма, не документация: докстраница про `undefined` молчит.

**Следствие:** любой потребитель `runtimeConfig.public.*`, который резолвит опцию через `??`
(nullish), получает НЕ фолбэк, а пустую строку — `''` не nullish. Ровно этот путь и сломал
`@themeon/vue` `state.ts` (`options.default ?? systemMap[system.value]`).

## Факт 2 — ключ обязан быть объявлен в runtimeConfig, иначе env-override невозможен

**Статус:** RAG:✅ 2026-07-13, https://nuxt.com/docs/guide/going-further/runtime-config
(fetched 2026-07-13). Дословно из докстраницы:

> "Your desired variables must be defined in your `nuxt.config`. This ensures that arbitrary
> environment variables are not exposed to your application code."

> "apiSecret: '', // can be overridden by NUXT_API_SECRET environment variable"

**Вердикт:** пустая строка — ДОКУМЕНТИРОВАННАЯ конвенция Nuxt для «ключ объявлен, значение придёт
из env». Значит правильный фикс НЕ «не эмитить ключ при `undefined`» (это выключило бы
`NUXT_PUBLIC_THEMEON_DEFAULT` для приложений, не задавших `default` в конфиге), а «эмитить
`default: options.default ?? ''` + трактовать `''` как отсутствие на стороне рантайма».
Отсюда P-D44 (фикс в `@themeon/vue` — нормализация пустого имени темы; `@themeon/nuxt` — честный
тип `default: string` и явный `?? ''`).

## Факт 3 — генератор анти-FOUC уже ветвится по `default`

`packages/vue/src/anti-fouc.ts:69` — `if (options.default !== undefined)` → скрипт БЕЗ
`matchMedia`. На пилотах опция не задана, поэтому build-time скрипт был корректным
(`matchMedia`-ветка) — и именно клиентский `init()` затирал выставленный им `data-theme`
пустой строкой. То есть каналы разъезжались: скрипт видел `undefined` (build-time
`ModuleOptions`), рантайм — `''` (runtimeConfig). Проверка `!== undefined` обязана стать
проверкой «непустая строка», иначе тот же разъезд вернётся при `default: ''` в конфиге.
