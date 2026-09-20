/**
 * Ambient types for ThemeOn Vite virtual modules (P3.3).
 *
 * @example
 * ```ts
 * /// <reference types="@themeon/vite/client" />
 * import themeCss from 'virtual:themeon.css'
 * ```
 */
declare module 'virtual:themeon.css' {
  const css: string
  export default css
}
