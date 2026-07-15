# Anti-FOUC outside Vue/Nuxt

`@themeon/vite`'s `injectFouc` option and `@themeon/nuxt`'s per-request injection both cover the
Vue/Nuxt case automatically. Anywhere else — a plain server-rendered page, a Blade layout, a
static HTML shell — inline the same script yourself using the pure `@themeon/vue/anti-fouc`
subpath. It has **zero Vue imports**, so it's safe to use even in a project with no Vue in its
dependency graph at all.

`themeInitScript()` reads the persisted theme (or `prefers-color-scheme`) and sets `data-theme`
on `<html>` before the page paints, so the first frame is never the wrong theme:

```ts
import { themeInitScript } from '@themeon/vue/anti-fouc'

const script = themeInitScript({
  storageKey: 'themeon-theme',
  attribute: 'data-theme',
  themes: ['light', 'dark'],
  default: 'system',
})
// render `<script>${script}</script>` as early as possible in <head>, before any stylesheet
// or app script that reads `data-theme`
```

Inject the resulting string into your `<head>`, as early as possible — before any stylesheet or
script that reads `data-theme`. The exact injection point is framework-specific; for a Blade
layout, for example:

```php
{{-- resources/views/layouts/app.blade.php --}}
<head>
    <script>{!! $themeInitScript !!}</script>
    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>
```

Pass this script the **same** `storageKey`/`attribute`/`themes`/`default` you use on the
frontend side (e.g. `useTheme()` from `@themeon/vue`, if the same app also renders Vue) — the
script and the runtime composable are two channels of one piece of state, not two independent
configs. A mismatch here is a visible theme flash on hydration, not a silent bug: `@themeon/vue`
ships a test (`src/parity.test.ts`) that runs every combination of inputs through both channels
and asserts they agree.

Full option reference → [`packages/vue/README.md` on GitHub](https://github.com/axioma-studio/themeon/tree/main/packages/vue#readme).
