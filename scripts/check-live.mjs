import { chromium } from 'playwright-core'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

const url = 'https://shengkunzhang0222-beep.github.io/jianzhang/?v=' + Date.now()
const out = path.resolve('.screenshots')
await mkdir(out, { recursive: true })

const browser = await chromium.launch({
  executablePath: 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  headless: true,
})
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  locale: 'zh-CN',
  timezoneId: 'Asia/Shanghai',
})
const page = await context.newPage()
const errors = []
page.on('console', (m) => {
  if (m.type() === 'error' && !m.location().url.endsWith('/favicon.ico')) {
    errors.push(`console: ${m.text()}`)
  }
})
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))

await page.goto(url, { waitUntil: 'networkidle' })
console.log('title:', await page.title())
await page.getByRole('button', { name: '基金' }).click()
await page.waitForTimeout(500)
console.log('goals:', await page.locator('.fund-goal').count())
console.log('total target:', await page.locator('.hero-meta').first().innerText())
await page.screenshot({ path: path.join(out, 'fund-live.png'), fullPage: false })

// 线上存入 100 元验证
await page.getByRole('button', { name: '存入', exact: true }).click()
await page.getByLabel('金额').fill('100')
await page.locator('.chip', { hasText: '奥太娜' }).click()
await page.getByRole('button', { name: '保存', exact: true }).click()
await page.waitForTimeout(500)
console.log('live total after deposit:', await page.locator('.hero-value').first().innerText())
console.log(errors.length ? `❌ ERRORS:\n${errors.join('\n')}` : '✅ 无控制台错误')

await browser.close()
