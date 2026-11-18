import { chromium } from 'playwright-core'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

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
  if (m.type() === 'error') errors.push(`console: ${m.text()}`)
})
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))

const shot = async (name, fullPage = false) => {
  await page.waitForTimeout(350)
  await page.screenshot({ path: path.join(out, name), fullPage })
  console.log('📸', name)
}

await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' })
await shot('01-home-empty.png')

// 月份选择
await page.getByRole('button', { name: /2026年11月/ }).click()
await shot('02-month-picker.png')
await page.getByRole('button', { name: '关闭' }).click()

// 记一笔支出
await page.getByRole('button', { name: '记一笔' }).first().click()
await shot('03-editor.png')
await page.getByLabel('金额').fill('45.50')
await page.getByLabel('备注').fill('午饭')
await page.getByRole('button', { name: '保存', exact: true }).click()

// 记一笔收入
await page.getByRole('button', { name: '记一笔' }).first().click()
await page.getByRole('button', { name: '收入', exact: true }).click()
await page.getByLabel('金额').fill('8000')
await page.getByRole('button', { name: '工资' }).click()
await page.getByLabel('备注').fill('11月工资')
await page.getByRole('button', { name: '保存', exact: true }).click()

// 更多支出
for (const [cat, amt, note] of [
  ['交通', '12.5', '地铁'],
  ['购物', '199', '日用品'],
  ['娱乐', '68', '电影'],
]) {
  await page.getByRole('button', { name: '记一笔' }).first().click()
  await page.getByLabel('金额').fill(amt)
  await page.getByRole('button', { name: cat }).click()
  await page.getByLabel('备注').fill(note)
  await page.getByRole('button', { name: '保存', exact: true }).click()
}
await shot('04-home-list.png')

// 编辑一笔
await page.getByRole('button', { name: /午饭/ }).click()
await shot('05-edit-tx.png')
await page.getByRole('button', { name: '关闭' }).click()

// 统计
await page.getByRole('button', { name: '统计' }).click()
await shot('06-stats-expense.png', true)
await page.getByRole('button', { name: '收入', exact: true }).click()
await shot('07-stats-income.png')
await page.getByRole('button', { name: '表格' }).click()
await shot('08-stats-table.png')

// 资产
await page.getByRole('button', { name: '资产' }).click()
await shot('09-assets.png')
await page.getByRole('button', { name: '现金' }).click()
await shot('10-account-editor.png')
await page.getByRole('button', { name: '关闭' }).click()

// 设置
await page.getByRole('button', { name: '设置' }).click()
await shot('11-settings.png', true)
await page.getByRole('button', { name: '分类管理' }).click()
await shot('12-category-manager.png')
await page.getByRole('button', { name: '关闭' }).click()

// 深色模式
await page.getByRole('button', { name: '深色' }).click()
await page.getByRole('button', { name: '明细' }).click()
await shot('13-home-dark.png')
await page.getByRole('button', { name: '统计' }).click()
await shot('14-stats-dark.png')

// 数据检查
const counts = await page.evaluate(async () => {
  const db = await new Promise((resolve, reject) => {
    const req = indexedDB.open('jianzhang')
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  const count = (store) =>
    new Promise((resolve) => {
      const req = db.transaction(store).objectStore(store).count()
      req.onsuccess = () => resolve(req.result)
    })
  return {
    transactions: await count('transactions'),
    accounts: await count('accounts'),
    categories: await count('categories'),
  }
})
console.log('📊 DB counts:', counts)
console.log(errors.length ? `❌ ERRORS:\n${errors.join('\n')}` : '✅ 无控制台错误')

await browser.close()
