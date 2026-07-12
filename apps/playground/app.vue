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
        <p>@themeon/css tokens.css + index.css loaded via Nuxt <code>css</code> config.</p>
        <div class="cluster">
          <button class="btn">Primary</button>
          <button class="btn btn--outline">Outline</button>
          <span class="badge">Badge</span>
        </div>
      </section>
    </main>
    <footer class="site-footer">
      <p>ThemeOn P2.7 smoke</p>
    </footer>
  </body>
</template>
