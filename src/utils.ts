import dayjs from 'dayjs'

export function uid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

const moneyFmt = new Intl.NumberFormat('zh-CN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** 分 → ¥1,234.56（负数带 - 号） */
export function formatCents(cents: number, opts: { symbol?: boolean } = {}): string {
  const symbol = opts.symbol !== false
  const sign = cents < 0 ? '-' : ''
  const body = moneyFmt.format(Math.abs(cents) / 100)
  return `${sign}${symbol ? '¥' : ''}${body}`
}

function trim1(n: number): string {
  return (Math.round(n * 10) / 10).toString()
}

/** 图表坐标轴用紧凑金额：¥1.2万 */
export function formatCompact(cents: number): string {
  const yuan = Math.abs(cents) / 100
  if (yuan >= 1e8) return `¥${trim1(yuan / 1e8)}亿`
  if (yuan >= 1e4) return `¥${trim1(yuan / 1e4)}万`
  if (yuan >= 1000) return `¥${Math.round(yuan / 100) * 100}`
  return `¥${Math.round(yuan)}`
}

/** 用户输入 → 分；非法返回 null */
export function parseAmountInput(v: string): number | null {
  const clean = v.replace(/[^\d.]/g, '')
  if (!clean || clean === '.') return null
  const n = Number(clean)
  if (!Number.isFinite(n)) return null
  return Math.round(n * 100)
}

/** 分 → 金额输入框字符串（整数不带小数） */
export function centsToInput(cents: number): string {
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2)
}

/** 允许负数的金额输入（账户初始余额）→ 分 */
export function parseSignedAmountInput(v: string): number | null {
  const clean = v.replace(/[^\d.-]/g, '')
  if (!clean || clean === '-' || clean === '.' || clean === '-.') return null
  const n = Number(clean)
  if (!Number.isFinite(n)) return null
  return Math.round(n * 100)
}

/** 编辑金额输入框时限制为最多两位小数 */
export function sanitizeAmountInput(v: string): string {
  let s = v.replace(/[^\d.]/g, '')
  const parts = s.split('.')
  if (parts.length > 2) s = `${parts[0]}.${parts.slice(1).join('')}`
  const [whole, dec] = s.split('.')
  if (dec !== undefined) return `${whole.slice(0, 9)}.${dec.slice(0, 2)}`
  return whole.slice(0, 9)
}

export const todayStr = (): string => dayjs().format('YYYY-MM-DD')
export const currentMonth = (): string => dayjs().format('YYYY-MM')

export function monthLabel(month: string): string {
  return dayjs(`${month}-01`).format('YYYY年M月')
}

export function shiftMonth(month: string, delta: number): string {
  return dayjs(`${month}-01`).add(delta, 'month').format('YYYY-MM')
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

export function dayLabel(date: string): string {
  const d = dayjs(date)
  const today = dayjs()
  const base = d.format('M月D日')
  if (d.isSame(today, 'day')) return `今天 · ${base}`
  if (d.isSame(today.subtract(1, 'day'), 'day')) return `昨天 · ${base}`
  return `${base} · 周${WEEKDAYS[d.day()]}`
}

/** 坐标轴上取一个干净的上界 */
export function niceCeil(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 100
  const pow = 10 ** Math.floor(Math.log10(value))
  const n = value / pow
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10
  return step * pow
}
