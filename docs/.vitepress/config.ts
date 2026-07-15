import { defineConfig } from 'vitepress'

// Available at build time (Node) without pulling in @types/node.
declare const process: { env: Record<string, string | undefined> }

// GitHub Pages serves a project site under /<repo>/. CI sets VITEPRESS_BASE to
// the repo name; falls back to '/' for local builds.
const base = process.env.VITEPRESS_BASE || '/'

// ─── Sidebar factories ────────────────────────────────────────────────────

function introSidebar() {
  return [
    {
      text: 'Introduction',
      items: [
        { text: 'Why ThemeOn', link: '/introduction/why-themeon' },
        { text: 'Installation', link: '/introduction/installation' },
        { text: 'Quick Start', link: '/introduction/quick-start' },
        { text: 'Changelog', link: '/introduction/changelog' },
      ],
    },
  ]
}

function basicUsageSidebar() {
  return [
    {
      text: 'Basic Usage',
      items: [
        { text: '@themeon/core', link: '/basic-usage/core' },
        { text: '@themeon/css', link: '/basic-usage/css' },
        { text: '@themeon/colors', link: '/basic-usage/colors' },
        { text: '@themeon/vue', link: '/basic-usage/vue' },
        { text: '@themeon/nuxt', link: '/basic-usage/nuxt' },
        { text: '@themeon/vite', link: '/basic-usage/vite' },
        { text: '@themeon/naive', link: '/basic-usage/naive' },
        { text: '@themeon/tailwind', link: '/basic-usage/tailwind' },
        { text: 'CLI (themeon)', link: '/basic-usage/cli' },
      ],
    },
  ]
}

function bestPracticesSidebar() {
  return [
    {
      text: 'Best Practices',
      items: [
        { text: 'Fail loud', link: '/best-practices/fail-loud' },
        { text: '@theme reference', link: '/best-practices/tailwind-reference' },
      ],
    },
  ]
}

function recipesSidebar() {
  return [
    {
      text: 'Recipes',
      items: [
        { text: 'Laravel + Vite', link: '/recipes/laravel-vite' },
        { text: 'Anti-FOUC', link: '/recipes/anti-fouc' },
      ],
    },
  ]
}

function makeSidebarMap(factory: () => any[], pages: string[]) {
  return Object.fromEntries(pages.map(p => [p, factory()]))
}

const introPages = [
  '/introduction/why-themeon', '/introduction/installation',
  '/introduction/quick-start', '/introduction/changelog',
]
const basicUsagePages = [
  '/basic-usage/core', '/basic-usage/css', '/basic-usage/colors', '/basic-usage/vue',
  '/basic-usage/nuxt', '/basic-usage/vite', '/basic-usage/naive', '/basic-usage/tailwind',
  '/basic-usage/cli',
]
const bestPracticesPages = [
  '/best-practices/fail-loud', '/best-practices/tailwind-reference',
]
const recipesPages = [
  '/recipes/laravel-vite', '/recipes/anti-fouc',
]

// ─── Config ────────────────────────────────────────────────────────────────

export default defineConfig({
  lang: 'en-US',
  title: 'ThemeOn',
  description: 'Typed design-token pipeline: TS tokens → CSS custom properties → UI-library adapters.',

  base,
  cleanUrls: true,
  ignoreDeadLinks: false,
  lastUpdated: true,

  sitemap: {
    hostname: 'https://axioma-studio.github.io/themeon/',
  },

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: `${base}favicon.svg` }],
  ],

  themeConfig: {
    siteTitle: 'ThemeOn',

    nav: [
      { text: 'Introduction', link: '/introduction/why-themeon', activeMatch: '/introduction/' },
      { text: 'Basic Usage', link: '/basic-usage/core', activeMatch: '/basic-usage/' },
      { text: 'Best Practices', link: '/best-practices/fail-loud', activeMatch: '/best-practices/' },
      { text: 'Advanced', link: '/recipes/laravel-vite', activeMatch: '/recipes/' },
      { text: 'GitHub', link: 'https://github.com/axioma-studio/themeon' },
    ],

    sidebar: {
      ...makeSidebarMap(introSidebar, introPages),
      ...makeSidebarMap(basicUsageSidebar, basicUsagePages),
      ...makeSidebarMap(bestPracticesSidebar, bestPracticesPages),
      ...makeSidebarMap(recipesSidebar, recipesPages),
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/axioma-studio/themeon' },
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026-present Axioma Studio',
    },

    search: {
      provider: 'local',
    },

    editLink: {
      pattern: 'https://github.com/axioma-studio/themeon/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },
  },
})
