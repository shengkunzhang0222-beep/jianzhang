import { chromium } from 'playwright-core'

const browser = await chromium.launch({
  executablePath: 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  headless: true,
})
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  locale: 'zh-CN',
  timezoneId: 'Asia/Shanghai',
})
const page = await context.newPage()
const errors = []
page.on('console', (m) => {
  if (m.type() === 'error' && !m.location().url.endsWith('/favicon.ico')) {
    errors.push(`console: ${m.text()} @ ${JSON.stringify(m.location())}`)
  }
})
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
page.on('response', (r) => {
  if (r.status() >= 400) console.log('HTTP', r.status(), r.url())
})
page.on('requestfailed', (r) => console.log('FAILED', r.url(), r.failure()?.errorText))

// 先在一个不加载 App 的同源页面里造一个 v1 数据库
await page.goto('http://localhost:4173/manifest.webmanifest')
await page.evaluate(async () => {
  await new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase('jianzhang')
    req.onsuccess = () => resolve(undefined)
    req.onerror = () => reject(req.error)
    req.onblocked = () => resolve(undefined)
  })
  await new Promise((resolve, reject) => {
    const req = indexedDB.open('jianzhang', 1)
    req.onupgradeneeded = () => {
      const db = req.result
      const accounts = db.createObjectStore('accounts', { keyPath: 'id' })
      db.createObjectStore('categories', { keyPath: 'id' })
      const txs = db.createObjectStore('transactions', { keyPath: 'id' })
      txs.createIndex('by-date', 'date')
      accounts.add({
        id: 'old-account',
        name: '旧账户',
        kind: 'bank',
        icon: '💳',
        initialBalance: 12345,
        order: 0,
        createdAt: 1,
      })
    }
    req.onsuccess = () => {
      req.result.close()
      resolve(undefined)
    }
    req.onerror = () => reject(req.error)
  })
})

await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' })
await page.waitForTimeout(600)

const result = await page.evaluate(async () => {
  const db = await new Promise((resolve, reject) => {
    const req = indexedDB.open('jianzhang')
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  const getAll = (store) =>
    new Promise((resolve) => {
      const req = db.transaction(store).objectStore(store).getAll()
      req.onsuccess = () => resolve(req.result)
    })
  const count = (store) =>
    new Promise((resolve) => {
      const req = db.transaction(store).objectStore(store).count()
      req.onsuccess = () => resolve(req.result)
    })
  return {
    version: db.version,
    accounts: await getAll('accounts'),
    goals: await count('fundGoals'),
  }
})

await page.getByRole('button', { name: '资产' }).click()
await page.waitForTimeout(300)
const hasOld = (await page.getByText('旧账户').count()) > 0
console.log('DB version:', result.version)
console.log('old account kept:', result.accounts.some((a) => a.name === '旧账户'))
console.log('UI shows old account:', hasOld)
console.log('seed goals after upgrade:', result.goals)
console.log(errors.length ? `❌ ERRORS:\n${errors.join('\n')}` : '✅ 无控制台错误')

await browser.close()
