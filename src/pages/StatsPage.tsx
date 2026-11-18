import { useMemo, useState } from 'react'
import { MonthlyTrend, RankedBars } from '../components/Charts'
import MonthSwitcher from '../components/MonthSwitcher'
import { categoryBreakdown, recentMonths, totals, txsInMonth } from '../stats'
import { useData } from '../store'
import { formatCents, monthLabel, shiftMonth } from '../utils'

interface Props {
  month: string
  onMonthChange: (month: string) => void
}

function deltaText(prev: number, cur: number): string {
  if (prev <= 0) return cur > 0 ? '上月无记录' : '—'
  const pct = ((cur - prev) / prev) * 100
  return `较上月 ${pct >= 0 ? '+' : ''}${pct.toFixed(0)}%`
}

export default function StatsPage({ month, onMonthChange }: Props) {
  const { txs, categories } = useData()
  const [catType, setCatType] = useState<'expense' | 'income'>('expense')

  const monthTx = useMemo(() => txsInMonth(txs, month), [txs, month])
  const sum = useMemo(() => totals(monthTx), [monthTx])
  const prev = useMemo(
    () => totals(txsInMonth(txs, shiftMonth(month, -1))),
    [txs, month],
  )
  const breakdown = useMemo(
    () => categoryBreakdown(monthTx, categories, catType),
    [monthTx, categories, catType],
  )
  const trend = useMemo(
    () =>
      recentMonths(month, 6).map((m) => ({
        month: m,
        label: `${Number(m.slice(5, 7))}月`,
        fullLabel: monthLabel(m),
        value: totals(txsInMonth(txs, m)).expense,
      })),
    [txs, month],
  )

  return (
    <div className="page-inner">
      <MonthSwitcher month={month} onChange={onMonthChange} />

      <section className="card stat-card">
        <div className="stat-row">
          <span className="stat-k">支出</span>
          <span className="stat-d">{deltaText(prev.expense, sum.expense)}</span>
          <strong className="stat-v">{formatCents(sum.expense)}</strong>
        </div>
        <div className="stat-row">
          <span className="stat-k">收入</span>
          <span className="stat-d">{deltaText(prev.income, sum.income)}</span>
          <strong className="stat-v income">{formatCents(sum.income)}</strong>
        </div>
        <div className="stat-row">
          <span className="stat-k">结余</span>
          <span className="stat-d">收入 − 支出</span>
          <strong className={`stat-v${sum.balance < 0 ? ' negative' : ''}`}>
            {formatCents(sum.balance)}
          </strong>
        </div>
      </section>

      <section className="card chart-card">
        <div className="card-head">
          <div>
            <div className="card-title">
              {catType === 'expense' ? '支出构成' : '收入构成'}
            </div>
            <div className="card-sub">{monthLabel(month)} · 按分类</div>
          </div>
          <div className="seg seg-small">
            <button
              className={catType === 'expense' ? 'active' : ''}
              onClick={() => setCatType('expense')}
            >
              支出
            </button>
            <button
              className={catType === 'income' ? 'active' : ''}
              onClick={() => setCatType('income')}
            >
              收入
            </button>
          </div>
        </div>
        {breakdown.length > 0 ? (
          <RankedBars
            items={breakdown.map((b) => ({
              id: b.category.id,
              name: b.category.name,
              icon: b.category.icon,
              value: b.total,
              share: b.share,
            }))}
          />
        ) : (
          <p className="hint-text">
            本月暂无{catType === 'expense' ? '支出' : '收入'}记录
          </p>
        )}
      </section>

      <section className="card chart-card">
        <div className="card-head">
          <div>
            <div className="card-title">支出趋势</div>
            <div className="card-sub">近 6 个月</div>
          </div>
        </div>
        <MonthlyTrend points={trend} />
      </section>
    </div>
  )
}
