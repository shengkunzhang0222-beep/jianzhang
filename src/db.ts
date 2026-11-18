import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Account, Category, Tx } from './types'
import { uid } from './utils'

export interface BackupFile {
  app: 'jianzhang'
  version: 1
  exportedAt: string
  accounts: Account[]
  categories: Category[]
  transactions: Tx[]
}

interface JZDB extends DBSchema {
  accounts: { key: string; value: Account }
  categories: { key: string; value: Category }
  transactions: { key: string; value: Tx; indexes: { 'by-date': string } }
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

export function getDB(): Promise<IDBPDatabase<JZDB>> {
  if (!dbPromise) {
    dbPromise = openDB<JZDB>('jianzhang', 1, {
      upgrade(db) {
        db.createObjectStore('accounts', { keyPath: 'id' })
        db.createObjectStore('categories', { keyPath: 'id' })
        const txStore = db.createObjectStore('transactions', { keyPath: 'id' })
        txStore.createIndex('by-date', 'date')
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
}> {
  const db = await getDB()
  const [accounts, categories, transactions] = await Promise.all([
    db.getAll('accounts'),
    db.getAll('categories'),
    db.getAll('transactions'),
  ])
  accounts.sort((a, b) => a.order - b.order)
  categories.sort((a, b) => a.type.localeCompare(b.type) || a.order - b.order)
  return { accounts, categories, transactions }
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

export async function exportBackup(): Promise<BackupFile> {
  const { accounts, categories, transactions } = await loadAll()
  return {
    app: 'jianzhang',
    version: 1,
    exportedAt: new Date().toISOString(),
    accounts,
    categories,
    transactions,
  }
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

function validateBackup(raw: unknown): BackupFile {
  if (!isObject(raw) || raw.app !== 'jianzhang') {
    throw new Error('不是「简账」的备份文件')
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
  return raw as unknown as BackupFile
}

export async function importBackup(raw: unknown): Promise<void> {
  const data = validateBackup(raw)
  const db = await getDB()
  const tx = db.transaction(['accounts', 'categories', 'transactions'], 'readwrite')
  await Promise.all([
    tx.objectStore('accounts').clear(),
    tx.objectStore('categories').clear(),
    tx.objectStore('transactions').clear(),
  ])
  for (const a of data.accounts) void tx.objectStore('accounts').put(a)
  for (const c of data.categories) void tx.objectStore('categories').put(c)
  for (const t of data.transactions) void tx.objectStore('transactions').put(t)
  await tx.done
  await seedIfEmpty(db)
}

export async function resetAllData(): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(['accounts', 'categories', 'transactions'], 'readwrite')
  await Promise.all([
    tx.objectStore('accounts').clear(),
    tx.objectStore('categories').clear(),
    tx.objectStore('transactions').clear(),
  ])
  await tx.done
  await seedIfEmpty(db)
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
