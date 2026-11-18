import type { Account, Category, Tx } from './types'
import { shiftMonth } from './utils'

export interface Totals {
  income: number
  expense: number
  balance: number
}

export function txsInMonth(txs: Tx[], month: string): Tx[] {
  return txs.filter((t) => t.date.startsWith(month))
}

export function totals(txs: Tx[]): Totals {
  let income = 0
  let expense = 0
  for (const t of txs) {
    if (t.type === 'income') income += t.amount
    else if (t.type === 'expense') expense += t.amount
  }
  return { income, expense, balance: income - expense }
}

export function accountBalance(account: Account, txs: Tx[]): number {
  let balance = account.initialBalance
  for (const t of txs) {
    if (t.type === 'expense' && t.accountId === account.id) balance -= t.amount
    else if (t.type === 'income' && t.accountId === account.id) balance += t.amount
    else if (t.type === 'transfer') {
      if (t.accountId === account.id) balance -= t.amount
      if (t.toAccountId === account.id) balance += t.amount
    }
  }
  return balance
}

export interface CategorySlice {
  category: Category
  total: number
  share: number
}

export function categoryBreakdown(
  txs: Tx[],
  categories: Category[],
  type: 'expense' | 'income',
): CategorySlice[] {
  const sums = new Map<string, number>()
  let total = 0
  for (const t of txs) {
    if (t.type !== type) continue
    const key = t.categoryId ?? '__none__'
    sums.set(key, (sums.get(key) ?? 0) + t.amount)
    total += t.amount
  }
  const byId = new Map(categories.map((c) => [c.id, c]))
  const rows: CategorySlice[] = []
  for (const [id, amount] of sums) {
    const category: Category = byId.get(id) ?? {
      id,
      name: '未分类',
      icon: '📦',
      type,
      builtin: false,
      order: 999,
    }
    rows.push({ category, total: amount, share: total > 0 ? amount / total : 0 })
  }
  rows.sort((a, b) => b.total - a.total)
  return rows
}

/** 最近 count 个月（含 month 本身），从早到晚 */
export function recentMonths(month: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => shiftMonth(month, i - (count - 1)))
}

/** 按日期倒序分组的流水 */
export function groupByDay(txs: Tx[]): Array<{ date: string; txs: Tx[] }> {
  const sorted = [...txs].sort(
    (a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt,
  )
  const groups: Array<{ date: string; txs: Tx[] }> = []
  for (const t of sorted) {
    const last = groups[groups.length - 1]
    if (last && last.date === t.date) last.txs.push(t)
    else groups.push({ date: t.date, txs: [t] })
  }
  return groups
}
