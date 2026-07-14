<script setup lang="ts">
// `useTheme` — auto-imported by `@themeon/nuxt` (addImports), не импортируется явно (P3.6).
const theme = useTheme()
</script>

<template>
  <body class="page-shell">
    <header class="site-header">
      <a href="/">ThemeOn</a>
      <nav class="site-nav">
        <a href="#foundation">Foundation</a>
        <a href="#components">Components</a>
      </nav>
    </header>
    <main>
      <section class="hero">
        <h1>ThemeOn playground</h1>
        <p>Typed tokens → CSS variables → adapters, in one package.</p>
      </section>
      <section id="components" class="section stack">
        <p>CSS foundation pushed by <code>@themeon/nuxt</code> (`css.push`, no manual `css: [...]`).</p>
        <div class="cluster">
          <button class="btn">Primary</button>
          <button class="btn btn--outline">Outline</button>
          <span class="badge">Badge</span>
          <button class="btn" @click="theme.toggle()">
            <!-- P3.6-фикс (MED): текст зависит от темы → на SSR не может знать про persisted-тему
                 из localStorage (инициализируется client-only в runtime/plugin.ts), поэтому
                 гидрация всегда рендерит другой текст, чем сервер. ClientOnly рендерит fallback
                 на сервере и переключается на реальный текст ПОСЛЕ mount (не hydration-патч
                 существующего текстового узла) — инвариант «SSR-разметка не зависит от темы»
                 соблюдён, data-theme-атрибут (анти-FOUC) не затронут. -->
            <ClientOnly fallback="Theme: …">
              Theme: {{ theme.theme.value }} ({{ theme.isDark.value ? 'dark' : 'light' }})
            </ClientOnly>
          </button>
          <!-- Догфуд P-D49: тумблер темы обязан различать НАМЕРЕНИЕ (preference) и РЕЗОЛВ (theme).
               "System" — полноценный выбор, а не скрытый дефолт: выбрав его, пользователь
               возвращается к живому следованию за темой ОС. Без этой кнопки в playground новая
               семантика не догфудится (ровно так P3.6 и спрятал дефект `default:''`). -->
          <ClientOnly>
            <div class="cluster" role="group" aria-label="Theme preference">
              <button
                v-for="p in ['light', 'dark', 'system']"
                :key="p"
                class="btn"
                :class="{ 'btn--outline': theme.preference.value !== p }"
                :aria-pressed="theme.preference.value === p"
                @click="theme.set(p)"
              >
                {{ p }}
              </button>
            </div>
          </ClientOnly>
        </div>
      </section>
    </main>
    <footer class="site-footer">
      <p>ThemeOn P3.6 smoke</p>
    </footer>
  </body>
</template>
