import { chromium } from 'playwright-core'
import path from 'node:path'
import { mkdir, readFile } from 'node:fs/promises'

const out = path.resolve('.screenshots')
await mkdir(out, { recursive: true })
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', headless: true })
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'zh-CN', acceptDownloads: true })
const page = await context.newPage()
const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', (e) => errors.push(e.message))
page.on('dialog', (d) => d.accept())

const countTx = () => page.evaluate(async () => {
  const db = await new Promise((res, rej) => { const r = indexedDB.open('jianzhang'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error) })
  return await new Promise((res) => { const r = db.transaction('transactions').objectStore('transactions').count(); r.onsuccess = () => res(r.result) })
})

await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' })
await page.waitForTimeout(1200)
console.log('SW controller after first load:', await page.evaluate(() => !!navigator.serviceWorker?.controller))
await page.reload({ waitUntil: 'networkidle' })
console.log('SW controller after reload:', await page.evaluate(() => !!navigator.serviceWorker?.controller))

// 离线测试
await context.setOffline(true)
try {
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(800)
  console.log('offline body has 记一笔:', (await page.getByText('记一笔').count()) > 0 || (await page.locator('body').innerText()).includes('记一笔'))
  await page.screenshot({ path: path.join(out, '17-offline.png') })
} catch (e) {
  console.log('❌ offline reload failed:', e.message)
}
await context.setOffline(false)

// 记一笔
await page.getByRole('button', { name: '记一笔' }).first().click()
await page.getByLabel('金额').fill('66.60')
await page.getByLabel('备注').fill('备份测试')
await page.getByRole('button', { name: '保存', exact: true }).click()
await page.waitForTimeout(400)
console.log('tx count after add:', await countTx())

// 导出
await page.getByRole('button', { name: '设置' }).click()
const [download] = await Promise.all([
  page.waitForEvent('download'),
  page.getByRole('button', { name: '导出备份' }).click(),
])
const backupPath = path.join(out, 'backup.json')
await download.saveAs(backupPath)
const backup = JSON.parse(await readFile(backupPath, 'utf8'))
console.log('exported:', { accounts: backup.accounts.length, categories: backup.categories.length, txs: backup.transactions.length })

// 清空
await page.getByRole('button', { name: '清空数据' }).click()
await page.waitForTimeout(600)
console.log('tx count after reset:', await countTx())

// 导入
const fileInput = page.locator('input[type=file]')
await fileInput.setInputFiles(backupPath)
await page.waitForTimeout(800)
console.log('tx count after import:', await countTx())
await page.screenshot({ path: path.join(out, '18-settings-after-import.png') })

// 分类增删
await page.getByRole('button', { name: '分类管理' }).click()
await page.getByPlaceholder('如：宠物').fill('宠物')
await page.getByRole('button', { name: '添加', exact: true }).click()
await page.waitForTimeout(500)
console.log('category 宠物 added:', await page.getByText('宠物').count())
await page.getByRole('button', { name: '删除宠物' }).click()
await page.waitForTimeout(500)
console.log('category 宠物 after delete:', await page.getByText('宠物').count())
await page.getByRole('button', { name: '关闭' }).click()

// 账户增删
await page.getByRole('button', { name: '资产' }).click()
await page.getByRole('button', { name: '添加账户' }).last().click()
await page.getByLabel('账户名称').fill('测试卡')
await page.getByLabel('初始余额').fill('1000')
await page.getByRole('button', { name: '保存', exact: true }).click()
await page.waitForTimeout(500)
console.log('account 测试卡 added:', await page.getByText('测试卡').count())
await page.getByRole('button', { name: '测试卡' }).click()
await page.getByRole('button', { name: '删除账户' }).click()
await page.waitForTimeout(500)
console.log('account 测试卡 after delete:', await page.getByText('测试卡').count())

console.log(errors.length ? '❌ console errors:\n' + errors.join('\n') : '✅ 无控制台错误')
await browser.close()
