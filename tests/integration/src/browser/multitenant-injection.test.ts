import { chromium, type Browser } from 'playwright'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { applyThemePatch } from '@themeon/core'
import {
  TENANT_STORE,
  base,
  renderTenantPage,
  renderTenantPageOrDefault,
} from './multitenant-render'

/**
 * P6.5 — капстоун-доказательство H3 end-to-end: сквозной multi-tenant флоу (schema→APCA→
 * serializeThemePatch→инъекция `<style nonce>`) проверен в РЕАЛЬНОМ Chromium (не jsdom — R-16 §2,
 * класс stored-XSS проверяется только настоящим HTML-парсером), три независимых кейса:
 * (1) легальный патч применился, без FOUC; (2) вредоносный патч отклонён и НЕ достиг страницы —
 * ДВОЙНАЯ страховка (schema-рубеж 1 бросает, И независимый core-рубеж 2 `applyThemePatch` тоже
 * бросает на том же значении — regression одного рубежа не открывает дыру); (3) низкоконтрастный
 * патч заблокирован fail-closed APCA-гейтом. См. `multitenant-README.md` — разбор флоу.
 */

let browser: Browser

beforeAll(async () => {
  browser = await chromium.launch()
})

afterAll(async () => {
  await browser.close()
})

describe('P6.5 — сквозной multi-tenant демо-стенд (капстоун H3)', () => {
  test('(1) легальный патч → tenant-цвет применился в реальном Chromium, без FOUC', async () => {
    const html = renderTenantPage('acme')
    const page = await browser.newPage()
    try {
      await page.setContent(html)
      const bg = await page.evaluate(() => getComputedStyle(document.getElementById('cta')!).backgroundColor)
      // '#5a1e8c' → rgb(90, 30, 140) — computed style уже темизирован на первом paint (инлайновый
      // `<style nonce>` в `<head>`, не async-подгрузка — FOUC структурно невозможен).
      expect(bg).toBe('rgb(90, 30, 140)')
    } finally {
      await page.close()
    }
  })

  test('(2) вредоносный патч (R-16 §2 вектор) отклонён ДВУМЯ независимыми рубежами, страницы не достигает', async () => {
    const evilPatch = TENANT_STORE.evil!

    // Рубеж 1 (schema — играет роль внешнего PHP/Flex*-валидатора, P6.2).
    expect(() => renderTenantPage('evil')).toThrow(/tenant schema violation|BAD_VALUE|UNSAFE_CSS_TOKEN/)

    // Рубеж 2 (core — `applyThemePatch`, P6.1) — НЕЗАВИСИМО от рубежа 1: если бы schema-рубеж
    // регрессировал и пропустил вектор, ядро всё равно бросает раньше, чем CSS/HTML вообще
    // собираются — скрипту физически неоткуда взяться в реальном документе.
    expect(() => applyThemePatch(base, evilPatch)).toThrow()

    // Fail-closed откат: страница НЕ публикуется под tenant-темой — сервер откатывается на
    // дефолт-тему (Implementation Rules). Загружаем РЕАЛЬНО ОТДАННУЮ страницу в Chromium и
    // подтверждаем — атака физически не достигла документа.
    const { html, usedDefaultFallback } = renderTenantPageOrDefault('evil')
    expect(usedDefaultFallback).toBe(true)
    expect(html).not.toContain('<script>window.__xss')

    const page = await browser.newPage()
    try {
      await page.setContent(html)
      const xss = await page.evaluate(() => (window as unknown as { __xss?: unknown }).__xss)
      const bodyText = await page.evaluate(() => document.documentElement.outerHTML)
      expect(xss).toBeUndefined()
      expect(bodyText).not.toContain('__xss')
    } finally {
      await page.close()
    }
  })

  test('(3) низкоконтрастный патч → fail-closed APCA-гейт блокирует публикацию (откат на дефолт-тему)', async () => {
    expect(() => renderTenantPage('lowContrast')).toThrow(/APCA contrast gate failed/)

    const { html, usedDefaultFallback } = renderTenantPageOrDefault('lowContrast')
    expect(usedDefaultFallback).toBe(true)

    const page = await browser.newPage()
    try {
      await page.setContent(html)
      // Дефолт-тема (`--color-text:#1a1a1a` на `--color-bg-page:#ffffff`) — высокий контраст,
      // сторожит, что откат реально произошёл на безопасную тему, а не на пустой/битый документ.
      const textColor = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--color-text').trim())
      expect(textColor).toBe('#1a1a1a')
    } finally {
      await page.close()
    }
  })
})
