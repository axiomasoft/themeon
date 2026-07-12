export default defineNuxtConfig({
  compatibilityDate: '2026-07-07',
  devtools: { enabled: true },
  // P2.7 — `tokens.css` first (declares the sys-layer vars), then the rest of the foundation.
  css: ['@themeon/css/tokens.css', '@themeon/css/index.css'],
})
