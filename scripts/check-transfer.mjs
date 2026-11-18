import { chromium } from 'playwright-core'
import path from 'node:path'

const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', headless: true })
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'zh-CN' })).newPage()
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' })

// 收入 1000 到现金
await page.getByRole('button', { name: '记一笔' }).first().click()
await page.getByRole('button', { name: '收入', exact: true }).click()
await page.getByLabel('金额').fill('1000')
await page.getByRole('button', { name: '工资' }).click()
await page.getByRole('button', { name: '保存', exact: true }).click()
await page.waitForTimeout(400)

// 转账 现金 → 支付宝 300
await page.getByRole('button', { name: '记一笔' }).first().click()
await page.getByRole('button', { name: '转账', exact: true }).click()
await page.getByLabel('金额').fill('300')
await page.getByRole('button', { name: '保存', exact: true }).click()
await page.waitForTimeout(500)
await page.screenshot({ path: path.resolve('.screenshots', '20-home-transfer.png') })

await page.getByRole('button', { name: '资产' }).click()
await page.waitForTimeout(300)
await page.screenshot({ path: path.resolve('.screenshots', '21-assets-after-transfer.png') })
const text = await page.locator('body').innerText()
console.log(text.includes('¥700.00'), text.includes('¥300.00') ? '✅ 余额正确（现金 700 / 支付宝 300）' : '❌ 余额异常')
console.log(errors.length ? '❌ ' + errors.join('; ') : '✅ 无控制台错误')
await browser.close()
