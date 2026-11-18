import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Account, Category, FundEntry, FundGoal, Tx } from './types'
import { uid } from './utils'

export interface BackupFile {
  app: 'jianzhang'
  version: 1 | 2
  exportedAt: string
  accounts: Account[]
  categories: Category[]
  transactions: Tx[]
  fundGoals: FundGoal[]
  fundEntries: FundEntry[]
}

interface JZDB extends DBSchema {
  accounts: { key: string; value: Account }
  categories: { key: string; value: Category }
  transactions: { key: string; value: Tx; indexes: { 'by-date': string } }
  fundGoals: { key: string; value: FundGoal }
  fundEntries: {
    key: string
    value: FundEntry
    indexes: { 'by-date': string; 'by-goal': string }
  }
}

type DefaultCategory = Omit<Category, 'id'>
type DefaultAccount = Omit<Account, 'id' | 'createdAt' | 'order'>

const DEFAULT_CATEGORIES: DefaultCategory[] = [
  { name: '餐饮', icon: '🍜', type: 'expense', builtin: true, order: 0 },
  { name: '交通', icon: '🚇', type: 'expense', builtin: true, order: 1 },
  { name: '购物', icon: '🛍️', type: 'expense', builtin: true, order: 2 },
  { name: '居住', icon: '🏠', type: 'expense', builtin: true, order: 3 },
  { name: '娱乐', icon: '🎮', type: 'expense', builtin: true, order: 4 },
  { name: '医疗', icon: '💊', type: 'expense', builtin: true, order: 5 },
  { name: '教育', icon: '📚', type: 'expense', builtin: true, order: 6 },
  { name: '人情', icon: '🎁', type: 'expense', builtin: true, order: 7 },
  { name: '通讯', icon: '📱', type: 'expense', builtin: true, order: 8 },
  { name: '其他', icon: '📦', type: 'expense', builtin: true, order: 9 },
  { name: '工资', icon: '💼', type: 'income', builtin: true, order: 0 },
  { name: '奖金', icon: '🏆', type: 'income', builtin: true, order: 1 },
  { name: '理财', icon: '📈', type: 'income', builtin: true, order: 2 },
  { name: '兼职', icon: '💡', type: 'income', builtin: true, order: 3 },
  { name: '红包', icon: '🧧', type: 'income', builtin: true, order: 4 },
  { name: '其他', icon: '📦', type: 'income', builtin: true, order: 5 },
]

const DEFAULT_ACCOUNTS: DefaultAccount[] = [
  { name: '现金', kind: 'cash', icon: '💵', initialBalance: 0 },
  { name: '支付宝', kind: 'alipay', icon: '🔵', initialBalance: 0 },
  { name: '微信', kind: 'wechat', icon: '🟢', initialBalance: 0 },
  { name: '银行卡', kind: 'bank', icon: '💳', initialBalance: 0 },
]

type DefaultFundGoal = Omit<FundGoal, 'id' | 'createdAt'>

const DEFAULT_FUND_GOALS: DefaultFundGoal[] = [
  {
    name: '安全垫',
    icon: '🛡️',
    targetAmount: 1_000_000,
    targetDate: '2027-03',
    note: '3个月生活费 9,000 + 出行缓冲 1,000',
    priority: 1,
  },
  {
    name: '奥太娜',
    icon: '🏔️',
    targetAmount: 360_000,
    targetDate: '2027-05',
    note: '方案A 3,100 + 500 机动',
    priority: 2,
  },
  {
    name: '萨武神山',
    icon: '⛰️',
    targetAmount: 360_000,
    targetDate: '2027-10',
    note: '约 3,120 + 480 机动',
    priority: 3,
  },
  {
    name: '贴身装备',
    icon: '🎒',
    targetAmount: 50_000,
    targetDate: '2027-04',
    note: '速干衣、羊毛袜、抓绒帽、护膝等，可复用',
    priority: 4,
  },
]

let dbPromise: Promise<IDBPDatabase<JZDB>> | null = null

async function seedIfEmpty(db: IDBPDatabase<JZDB>): Promise<void> {
  const [accountCount, categoryCount] = await Promise.all([
    db.count('accounts'),
    db.count('categories'),
  ])
  if (accountCount > 0 || categoryCount > 0) return
  const now = Date.now()
  const tx = db.transaction(['accounts', 'categories'], 'readwrite')
  for (const c of DEFAULT_CATEGORIES) {
    void tx.objectStore('categories').add({ ...c, id: uid() })
  }
  DEFAULT_ACCOUNTS.forEach((a, i) => {
    void tx.objectStore('accounts').add({ ...a, id: uid(), order: i, createdAt: now })
  })
  await tx.done
}

export async function seedFundDefaults(db: IDBPDatabase<JZDB>): Promise<void> {
  const count = await db.count('fundGoals')
  if (count > 0) return
  const now = Date.now()
  const tx = db.transaction('fundGoals', 'readwrite')
  for (const g of DEFAULT_FUND_GOALS) {
    void tx.objectStore('fundGoals').add({ ...g, id: uid(), createdAt: now })
  }
  await tx.done
}

export function getDB(): Promise<IDBPDatabase<JZDB>> {
  if (!dbPromise) {
    dbPromise = openDB<JZDB>('jianzhang', 2, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore('accounts', { keyPath: 'id' })
          db.createObjectStore('categories', { keyPath: 'id' })
          const txStore = db.createObjectStore('transactions', { keyPath: 'id' })
          txStore.createIndex('by-date', 'date')
        }
        if (oldVersion < 2) {
          const goalStore = db.createObjectStore('fundGoals', { keyPath: 'id' })
          const entryStore = db.createObjectStore('fundEntries', { keyPath: 'id' })
          entryStore.createIndex('by-date', 'date')
          entryStore.createIndex('by-goal', 'goalId')
          const now = Date.now()
          for (const g of DEFAULT_FUND_GOALS) {
            void goalStore.add({ ...g, id: uid(), createdAt: now })
          }
        }
      },
    }).then(async (db) => {
      await seedIfEmpty(db)
      return db
    })
  }
  return dbPromise
}

export async function loadAll(): Promise<{
  accounts: Account[]
  categories: Category[]
  transactions: Tx[]
  fundGoals: FundGoal[]
  fundEntries: FundEntry[]
}> {
  const db = await getDB()
  const [accounts, categories, transactions, fundGoals, fundEntries] = await Promise.all([
    db.getAll('accounts'),
    db.getAll('categories'),
    db.getAll('transactions'),
    db.getAll('fundGoals'),
    db.getAll('fundEntries'),
  ])
  accounts.sort((a, b) => a.order - b.order)
  categories.sort((a, b) => a.type.localeCompare(b.type) || a.order - b.order)
  fundGoals.sort((a, b) => a.priority - b.priority || a.targetDate.localeCompare(b.targetDate))
  fundEntries.sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt)
  return { accounts, categories, transactions, fundGoals, fundEntries }
}

export async function saveTx(tx: Tx): Promise<void> {
  const db = await getDB()
  await db.put('transactions', tx)
}

export async function deleteTx(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('transactions', id)
}

export async function saveAccount(account: Account): Promise<void> {
  const db = await getDB()
  await db.put('accounts', account)
}

export async function deleteAccount(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('accounts', id)
}

export async function saveCategory(category: Category): Promise<void> {
  const db = await getDB()
  await db.put('categories', category)
}

export async function deleteCategory(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('categories', id)
}

export async function saveFundGoal(goal: FundGoal): Promise<void> {
  const db = await getDB()
  await db.put('fundGoals', goal)
}

export async function deleteFundGoal(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('fundGoals', id)
}

export async function saveFundEntry(entry: FundEntry): Promise<void> {
  const db = await getDB()
  await db.put('fundEntries', entry)
}

export async function deleteFundEntry(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('fundEntries', id)
}

export async function exportBackup(): Promise<BackupFile> {
  const { accounts, categories, transactions, fundGoals, fundEntries } = await loadAll()
  return {
    app: 'jianzhang',
    version: 2,
    exportedAt: new Date().toISOString(),
    accounts,
    categories,
    transactions,
    fundGoals,
    fundEntries,
  }
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

function validateBackup(raw: unknown): BackupFile {
  if (!isObject(raw) || raw.app !== 'jianzhang') {
    throw new Error('不是「记账不是张」的备份文件')
  }
  const accounts = raw.accounts
  const categories = raw.categories
  const transactions = raw.transactions
  if (!Array.isArray(accounts) || !Array.isArray(categories) || !Array.isArray(transactions)) {
    throw new Error('备份文件缺少数据')
  }
  for (const a of accounts) {
    if (
      !isObject(a) ||
      typeof a.id !== 'string' ||
      typeof a.name !== 'string' ||
      typeof a.initialBalance !== 'number' ||
      !Number.isFinite(a.initialBalance)
    ) {
      throw new Error('备份中的账户数据格式不正确')
    }
  }
  for (const c of categories) {
    if (!isObject(c) || typeof c.id !== 'string' || typeof c.name !== 'string') {
      throw new Error('备份中的分类数据格式不正确')
    }
  }
  for (const t of transactions) {
    if (
      !isObject(t) ||
      typeof t.id !== 'string' ||
      (t.type !== 'expense' && t.type !== 'income' && t.type !== 'transfer') ||
      typeof t.amount !== 'number' ||
      !Number.isFinite(t.amount) ||
      typeof t.accountId !== 'string' ||
      typeof t.date !== 'string'
    ) {
      throw new Error('备份中的流水数据格式不正确')
    }
  }

  const fundGoals: FundGoal[] = []
  const fundEntries: FundEntry[] = []
  if (raw.fundGoals !== undefined) {
    if (!Array.isArray(raw.fundGoals)) {
      throw new Error('备份中的基金目标数据格式不正确')
    }
    for (const g of raw.fundGoals) {
      if (
        !isObject(g) ||
        typeof g.id !== 'string' ||
        typeof g.name !== 'string' ||
        typeof g.targetAmount !== 'number' ||
        !Number.isFinite(g.targetAmount) ||
        typeof g.targetDate !== 'string'
      ) {
        throw new Error('备份中的基金目标数据格式不正确')
      }
      fundGoals.push({
        id: g.id,
        name: g.name,
        icon: typeof g.icon === 'string' ? g.icon : '🎯',
        targetAmount: g.targetAmount,
        targetDate: g.targetDate,
        note: typeof g.note === 'string' ? g.note : '',
        priority: typeof g.priority === 'number' ? g.priority : fundGoals.length,
        createdAt: typeof g.createdAt === 'number' ? g.createdAt : Date.now(),
      })
    }
  }
  if (raw.fundEntries !== undefined) {
    if (!Array.isArray(raw.fundEntries)) {
      throw new Error('备份中的基金记录格式不正确')
    }
    for (const e of raw.fundEntries) {
      if (
        !isObject(e) ||
        typeof e.id !== 'string' ||
        typeof e.goalId !== 'string' ||
        (e.type !== 'deposit' && e.type !== 'withdraw') ||
        typeof e.amount !== 'number' ||
        !Number.isFinite(e.amount) ||
        e.amount <= 0 ||
        typeof e.date !== 'string'
      ) {
        throw new Error('备份中的基金记录格式不正确')
      }
      fundEntries.push({
        id: e.id,
        goalId: e.goalId,
        type: e.type,
        amount: e.amount,
        date: e.date,
        note: typeof e.note === 'string' ? e.note : '',
        createdAt: typeof e.createdAt === 'number' ? e.createdAt : Date.now(),
        updatedAt: typeof e.updatedAt === 'number' ? e.updatedAt : Date.now(),
      })
    }
  }
  const goalIds = new Set(fundGoals.map((g) => g.id))
  for (const e of fundEntries) {
    if (!goalIds.has(e.goalId)) {
      throw new Error('备份中的基金记录找不到对应目标')
    }
  }

  return {
    app: 'jianzhang',
    version: raw.version === 2 ? 2 : 1,
    exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : '',
    accounts: accounts as Account[],
    categories: categories as Category[],
    transactions: transactions as Tx[],
    fundGoals,
    fundEntries,
  }
}

export async function importBackup(raw: unknown): Promise<void> {
  const data = validateBackup(raw)
  const db = await getDB()
  const tx = db.transaction(
    ['accounts', 'categories', 'transactions', 'fundGoals', 'fundEntries'],
    'readwrite',
  )
  await Promise.all([
    tx.objectStore('accounts').clear(),
    tx.objectStore('categories').clear(),
    tx.objectStore('transactions').clear(),
    tx.objectStore('fundGoals').clear(),
    tx.objectStore('fundEntries').clear(),
  ])
  for (const a of data.accounts) void tx.objectStore('accounts').put(a)
  for (const c of data.categories) void tx.objectStore('categories').put(c)
  for (const t of data.transactions) void tx.objectStore('transactions').put(t)
  for (const g of data.fundGoals) void tx.objectStore('fundGoals').put(g)
  for (const e of data.fundEntries) void tx.objectStore('fundEntries').put(e)
  await tx.done
  await seedIfEmpty(db)
  if (data.fundGoals.length === 0) await seedFundDefaults(db)
}

export async function resetAllData(): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(
    ['accounts', 'categories', 'transactions', 'fundGoals', 'fundEntries'],
    'readwrite',
  )
  await Promise.all([
    tx.objectStore('accounts').clear(),
    tx.objectStore('categories').clear(),
    tx.objectStore('transactions').clear(),
    tx.objectStore('fundGoals').clear(),
    tx.objectStore('fundEntries').clear(),
  ])
  await tx.done
  await seedIfEmpty(db)
  await seedFundDefaults(db)
}

export async function requestPersistence(): Promise<void> {
  try {
    if (navigator.storage && typeof navigator.storage.persist === 'function') {
      await navigator.storage.persist()
    }
  } catch {
    // 持久化失败不阻塞使用，用户仍可导出备份
  }
}
