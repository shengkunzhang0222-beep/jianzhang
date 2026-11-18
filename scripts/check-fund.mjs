import { chromium } from 'playwright-core'
import { mkdir, readFile } from 'node:fs/promises'
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
  await page.waitForTimeout(300)
  await page.screenshot({ path: path.join(out, name), fullPage })
  console.log('📸', name)
}

await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' })
console.log('title:', await page.title())

await page.getByRole('button', { name: '基金' }).click()
await page.waitForTimeout(400)
await shot('fund-01-overview.png', true)

for (const name of ['安全垫', '奥太娜', '萨武神山', '贴身装备']) {
  console.log('seed', name, await page.locator('.fund-goal', { hasText: name }).count())
}

// 存入 2,500 到奥太娜
await page.getByRole('button', { name: '存入', exact: true }).click()
await page.getByLabel('金额').fill('2500')
await page.locator('.chip', { hasText: '奥太娜' }).click()
await page.getByRole('button', { name: '保存', exact: true }).click()
await page.waitForTimeout(500)
console.log('total after deposit:', await page.locator('.hero-value').first().innerText())
console.log(
  'goal 奥太娜:',
  await page.locator('.fund-goal', { hasText: '奥太娜' }).locator('.fund-goal-amt').innerText(),
)
await shot('fund-02-after-deposit.png', true)

// 取出 500
await page.getByRole('button', { name: '取出', exact: true }).click()
await page.getByLabel('金额').fill('500')
await page.locator('.chip', { hasText: '奥太娜' }).click()
await page.getByRole('button', { name: '保存', exact: true }).click()
await page.waitForTimeout(500)
console.log('total after withdraw:', await page.locator('.hero-value').first().innerText())
await shot('fund-03-after-withdraw.png', true)

// 每月计划
await page.getByRole('button', { name: '调整' }).click()
await page.getByLabel('每月存入（元）').fill('2500')
await page.getByRole('button', { name: '保存', exact: true }).click()
await page.waitForTimeout(300)
console.log('plan row:', await page.locator('.fund-plan-row').innerText())

// 添加目标
await page.getByLabel('添加目标').click()
await page.getByLabel('目标名称').fill('哈巴雪山')
await page.getByLabel('目标金额').fill('4500')
await page.getByLabel('目标月份').fill('2028-05')
await page.getByRole('button', { name: '保存', exact: true }).click()
await page.waitForTimeout(500)
console.log('goal count:', await page.locator('.fund-goal').count())
console.log('哈巴 exists:', await page.locator('.fund-goal', { hasText: '哈巴雪山' }).count())
await shot('fund-04-add-goal.png', true)

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
    version: db.version,
    goals: await count('fundGoals'),
    entries: await count('fundEntries'),
    tx: await count('transactions'),
  }
})
console.log('DB:', JSON.stringify(counts))

// 设置页名称 + 备份导出/导入往返
await page.getByRole('button', { name: '设置' }).click()
await page.waitForTimeout(300)
await shot('fund-05-settings.png', true)
console.log('about name:', await page.locator('.about-name').innerText())

const [download] = await Promise.all([
  page.waitForEvent('download'),
  page.getByRole('button', { name: '导出备份' }).click(),
])
const backupPath = await download.path()
const backup = JSON.parse(await readFile(backupPath, 'utf8'))
console.log(
  'backup: version',
  backup.version,
  '| goals',
  backup.fundGoals.length,
  '| entries',
  backup.fundEntries.length,
)

page.on('dialog', (d) => d.accept())
const [chooser] = await Promise.all([
  page.waitForEvent('filechooser'),
  page.getByRole('button', { name: '导入备份' }).click(),
])
await chooser.setFiles(backupPath)
await page.waitForTimeout(800)
console.log(
  'toast:',
  await page
    .locator('.toast')
    .innerText()
    .catch(() => '无'),
)
await page.getByRole('button', { name: '基金' }).click()
await page.waitForTimeout(400)
console.log('after import total:', await page.locator('.hero-value').first().innerText())
console.log('after import goals:', await page.locator('.fund-goal').count())

console.log(errors.length ? `❌ ERRORS:\n${errors.join('\n')}` : '✅ 无控制台错误')

await browser.close()
