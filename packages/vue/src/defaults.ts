/**
 * Общие дефолты ключа персиста/атрибута темы (P3.2, Implementation Rule 3): и `state.ts`
 * (`createThemeState`, P3.1), и `anti-fouc.ts` (`themeInitScript`, pure-модуль) обязаны
 * подставлять ОДИН и тот же `storageKey`/`attribute`/имена тем по умолчанию — иначе
 * сгенерированный анти-FOUC скрипт и рантайм-composable молча разъедутся по ключу.
 * Файл — только литералы, без импортов (переиспользуется pure-подпутём `./anti-fouc`).
 */
export const DEFAULT_STORAGE_KEY = 'themeon-theme'
export const DEFAULT_ATTRIBUTE = 'data-theme'
export const DEFAULT_DARK_THEME = 'dark'
export const DEFAULT_LIGHT_THEME = 'light'

/**
 * Зарезервированное имя ПРЕДПОЧТЕНИЯ (не темы!) «следовать за системой» — персистится вместо
 * резолвнутой темы (P-D49, канон VueUse `useColorMode.store: 'auto'` / next-themes `theme: 'system'`,
 * research R-13 §2.1). Хранить в `localStorage` резолвнутый результат вместо намерения — значит
 * убить «следовать за ОС»: пользователь навсегда приколачивается к теме первого визита.
 * Имя НЕ может быть именем темы (`themes` его не содержит) — `state.ts` предупреждает о коллизии.
 */
export const SYSTEM_PREFERENCE = 'system'
