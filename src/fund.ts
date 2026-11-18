import dayjs from 'dayjs'
import type { FundEntry, FundGoal } from './types'

/** 某个目标已攒金额（分） */
export function goalSaved(goalId: string, entries: FundEntry[]): number {
  let saved = 0
  for (const e of entries) {
    if (e.goalId !== goalId) continue
    saved += e.type === 'deposit' ? e.amount : -e.amount
  }
  return saved
}

/** 基金总额（分） */
export function fundSaved(entries: FundEntry[]): number {
  let saved = 0
  for (const e of entries) saved += e.type === 'deposit' ? e.amount : -e.amount
  return saved
}

/** 某月存入合计（分），month 为 YYYY-MM */
export function monthDeposits(entries: FundEntry[], month: string): number {
  let total = 0
  for (const e of entries) {
    if (e.type === 'deposit' && e.date.startsWith(month)) total += e.amount
  }
  return total
}

/** 距离目标月份还有几个月，至少按 1 个月算 */
export function monthsUntil(targetDate: string): number {
  const target = dayjs(`${targetDate}-01`)
  if (!target.isValid()) return 1
  const now = dayjs().startOf('month')
  return Math.max(1, target.diff(now, 'month'))
}

/** 目标缺口（分），已达成返回 0 */
export function goalGap(goal: FundGoal, entries: FundEntry[]): number {
  return Math.max(0, goal.targetAmount - goalSaved(goal.id, entries))
}

/** 按剩余月份折算的每月需存（分） */
export function goalMonthlyNeeded(goal: FundGoal, entries: FundEntry[]): number {
  const gap = goalGap(goal, entries)
  if (gap <= 0) return 0
  return Math.ceil(gap / monthsUntil(goal.targetDate))
}

/** 进度 0–1 */
export function goalProgress(goal: FundGoal, entries: FundEntry[]): number {
  if (goal.targetAmount <= 0) return 0
  return Math.min(1, Math.max(0, goalSaved(goal.id, entries) / goal.targetAmount))
}

/** 目标按优先级、日期排序 */
export function sortGoals(goals: FundGoal[]): FundGoal[] {
  return [...goals].sort(
    (a, b) => a.priority - b.priority || a.targetDate.localeCompare(b.targetDate),
  )
}

/** 按当前所有目标测算的每月建议存入合计（分） */
export function suggestedMonthly(goals: FundGoal[], entries: FundEntry[]): number {
  return goals.reduce((sum, g) => sum + goalMonthlyNeeded(g, entries), 0)
}
