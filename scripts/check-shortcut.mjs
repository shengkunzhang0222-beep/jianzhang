import { chromium } from 'playwright-core'
import path from 'node:path'

const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', headless: true })
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'zh-CN' })
await context.grantPermissions(['clipboard-read', 'clipboard-write'])
const page = await context.newPage()
const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', (e) => errors.push(e.message))

// 1) URL 预填
await page.goto('http://localhost:4173/?add=1&type=expense&amount=35.5&note=午餐&category=交通&account=支付宝&date=2026-11-17', { waitUntil: 'networkidle' })
await page.waitForTimeout(700)
await page.screenshot({ path: path.resolve('.screenshots', '22-url-prefill.png') })
console.log('URL预填:', {
  amount: await page.getByLabel('金额').inputValue(),
  note: await page.getByLabel('备注').inputValue(),
  date: await page.getByLabel('日期').inputValue(),
  category: await page.locator('.cat-item.active .name').innerText(),
  account: (await page.locator('.chip.active').innerText()).trim(),
})
console.log('URL 已清理:', page.url())
await page.getByRole('button', { name: '保存', exact: true }).click()
await page.waitForTimeout(500)
const homeText = await page.locator('body').innerText()
console.log('保存并跳月:', homeText.includes('交通') && homeText.includes('¥35.50'))

// 2) 粘贴识别 - 微信
const wechat = '微信支付\n支付成功\n支付金额 ¥35.50\n商户全称 星巴克咖啡\n支付时间 2026年11月18日 12:34:56'
await page.evaluate((t) => navigator.clipboard.writeText(t), wechat)
await page.getByRole('button', { name: '记一笔' }).first().click()
await page.getByRole('button', { name: '粘贴识别' }).click()
await page.waitForTimeout(500)
await page.screenshot({ path: path.resolve('.screenshots', '23-paste-wechat.png') })
console.log('微信识别:', {
  amount: await page.getByLabel('金额').inputValue(),
  note: await page.getByLabel('备注').inputValue(),
  date: await page.getByLabel('日期').inputValue(),
  category: await page.locator('.cat-item.active .name').innerText(),
  account: (await page.locator('.chip.active').innerText()).trim(),
  hint: await page.locator('.paste-hint').innerText(),
})
await page.getByRole('button', { name: '关闭' }).click()

// 3) 粘贴识别 - 支付宝地铁
const alipay = '支付宝\n付款成功\n付款金额 128.00\n收款方 上海地铁\n付款时间 2026-11-17 09:12'
await page.evaluate((t) => navigator.clipboard.writeText(t), alipay)
await page.getByRole('button', { name: '记一笔' }).first().click()
await page.getByRole('button', { name: '粘贴识别' }).click()
await page.waitForTimeout(400)
console.log('支付宝识别:', {
  amount: await page.getByLabel('金额').inputValue(),
  note: await page.getByLabel('备注').inputValue(),
  date: await page.getByLabel('日期').inputValue(),
  category: await page.locator('.cat-item.active .name').innerText(),
  account: (await page.locator('.chip.active').innerText()).trim(),
})
await page.getByRole('button', { name: '关闭' }).click()

// 4) 粘贴识别 - 银行短信
const sms = '【招商银行】您尾号1234的卡11月18日12:34在星巴克消费人民币35.00元，余额1000.00元。'
await page.evaluate((t) => navigator.clipboard.writeText(t), sms)
await page.getByRole('button', { name: '记一笔' }).first().click()
await page.getByRole('button', { name: '粘贴识别' }).click()
await page.waitForTimeout(400)
console.log('银行短信识别:', {
  amount: await page.getByLabel('金额').inputValue(),
  note: await page.getByLabel('备注').inputValue(),
  date: await page.getByLabel('日期').inputValue(),
  category: await page.locator('.cat-item.active .name').innerText(),
  account: (await page.locator('.chip.active').innerText()).trim(),
})
await page.getByRole('button', { name: '关闭' }).click()

// 5) 粘贴识别 - 收款
const income = '支付宝\n收款成功\n收款金额 200.00\n付款方 张三\n收款时间 2026年11月18日 08:00'
await page.evaluate((t) => navigator.clipboard.writeText(t), income)
await page.getByRole('button', { name: '记一笔' }).first().click()
await page.getByRole('button', { name: '粘贴识别' }).click()
await page.waitForTimeout(400)
console.log('收款识别:', {
  type: await page.locator('.type-seg .active').innerText(),
  amount: await page.getByLabel('金额').inputValue(),
  note: await page.getByLabel('备注').inputValue(),
  category: await page.locator('.cat-item.active .name').innerText(),
  account: (await page.locator('.chip.active').innerText()).trim(),
})
await page.getByRole('button', { name: '关闭' }).click()

// 6) 设置页复制快捷指令链接
await page.getByRole('button', { name: '设置' }).click()
await page.getByRole('button', { name: '复制快捷指令链接' }).click()
await page.waitForTimeout(300)
const clip = await page.evaluate(() => navigator.clipboard.readText())
console.log('快捷指令链接:', clip)
await page.screenshot({ path: path.resolve('.screenshots', '24-settings-shortcut.png'), fullPage: true })

console.log(errors.length ? '❌ ' + errors.join('; ') : '✅ 无控制台错误')
await browser.close()
