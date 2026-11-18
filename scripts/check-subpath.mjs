import { chromium } from 'playwright-core'
import path from 'node:path'

const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', headless: true })
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'zh-CN' })
const page = await context.newPage()
const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', (e) => errors.push(e.message))

await page.goto('http://localhost:4180/jianzhang/', { waitUntil: 'networkidle' })
await page.waitForTimeout(1200)
console.log('controller:', await page.evaluate(() => !!navigator.serviceWorker?.controller))
console.log('scope:', await page.evaluate(() => navigator.serviceWorker?.controller?.scriptURL))
await page.reload({ waitUntil: 'networkidle' })
console.log('controller after reload:', await page.evaluate(() => !!navigator.serviceWorker?.controller))
console.log('manifest href:', await page.evaluate(() => document.querySelector('link[rel=manifest]')?.getAttribute('href')))

await context.setOffline(true)
try {
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1000)
  const text = await page.locator('body').innerText()
  console.log('offline subpath renders:', text.includes('本月支出') || text.includes('记一笔'))
  await page.screenshot({ path: path.resolve('.screenshots', '19-subpath-offline.png') })
} catch (e) {
  console.log('❌ offline subpath failed:', e.message)
}
await context.setOffline(false)
console.log(errors.length ? '❌ errors:\n' + errors.join('\n') : '✅ 无控制台错误')
await browser.close()
