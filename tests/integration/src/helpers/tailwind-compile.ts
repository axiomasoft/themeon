import { compile } from '@tailwindcss/node'

/**
 * Тонкий хелпер: настоящая компиляция Tailwind 4 (`@tailwindcss/node`, тот же движок, что
 * `@tailwindcss/vite`/`@tailwindcss/postcss`). `base` обязан лежать внутри пакета — см.
 * `fixture.ts`. Список кандидатов — часть контракта вызывающего теста, не хелпера.
 */
export async function tailwindCompile(entryCss: string, candidates: string[], base: string): Promise<string> {
  const result = await compile(entryCss, { base, onDependency: () => {} })
  return result.build(candidates)
}
