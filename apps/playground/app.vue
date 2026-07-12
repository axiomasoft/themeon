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
            Theme: {{ theme.theme.value }} ({{ theme.isDark.value ? 'dark' : 'light' }})
          </button>
        </div>
      </section>
    </main>
    <footer class="site-footer">
      <p>ThemeOn P3.6 smoke</p>
    </footer>
  </body>
</template>
