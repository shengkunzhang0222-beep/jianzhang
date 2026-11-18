import { useMemo } from 'react'
import MonthSwitcher from '../components/MonthSwitcher'
import { useData } from '../store'
import { groupByDay, totals, txsInMonth } from '../stats'
import type { Tx } from '../types'
import { dayLabel, formatCents, shiftMonth } from '../utils'

interface Props {
  month: string
  onMonthChange: (month: string) => void
  onEditTx: (tx: Tx) => void
  onAdd: () => void
}

export default function HomePage({ month, onMonthChange, onEditTx, onAdd }: Props) {
  const { txs, categories, accounts } = useData()

  const monthTx = useMemo(() => txsInMonth(txs, month), [txs, month])
  const summary = useMemo(() => totals(monthTx), [monthTx])
  const prev = useMemo(() => totals(txsInMonth(txs, shiftMonth(month, -1))), [txs, month])
  const groups = useMemo(() => groupByDay(monthTx), [monthTx])
  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])
  const accountById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts])

  const delta =
    prev.expense > 0 ? ((summary.expense - prev.expense) / prev.expense) * 100 : null

  return (
    <div className="page-inner">
      <MonthSwitcher month={month} onChange={onMonthChange} />

      <section className="hero-card">
        <div className="hero-label">本月支出</div>
        <div className="hero-value">{formatCents(summary.expense)}</div>
        <div className="hero-meta">
          {delta === null
            ? '上月暂无支出'
            : `较上月 ${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%`}
        </div>
        <div className="hero-grid">
          <div>
            <div className="k">收入</div>
            <div className="v income">{formatCents(summary.income)}</div>
          </div>
          <div>
            <div className="k">结余</div>
            <div className={`v${summary.balance < 0 ? ' negative' : ''}`}>
              {formatCents(summary.balance)}
            </div>
          </div>
        </div>
      </section>

      {groups.length === 0 ? (
        <div className="empty">
          <div className="empty-icon" aria-hidden="true">
            📒
          </div>
          <p>本月还没有记录</p>
          <button className="btn btn-primary" onClick={onAdd}>
            记一笔
          </button>
        </div>
      ) : (
        groups.map((group) => {
          const day = totals(group.txs)
          return (
            <section className="day-group" key={group.date}>
              <div className="day-head">
                <span>{dayLabel(group.date)}</span>
                <span className="day-sum">
                  {day.expense > 0 ? (
                    <span>支 {formatCents(day.expense)}</span>
                  ) : null}
                  {day.income > 0 ? (
                    <span className="income">收 {formatCents(day.income)}</span>
                  ) : null}
                </span>
              </div>
              <div className="tx-list">
                {group.txs.map((t) => {
                  const cat = t.categoryId ? catById.get(t.categoryId) : undefined
                  const fromName = accountById.get(t.accountId)?.name ?? '账户'
                  const toName = t.toAccountId
                    ? (accountById.get(t.toAccountId)?.name ?? '账户')
                    : ''
                  const isTransfer = t.type === 'transfer'
                  const icon = isTransfer ? '🔄' : (cat?.icon ?? '📦')
                  const title = isTransfer ? '转账' : (cat?.name ?? '未分类')
                  const sub = isTransfer
                    ? `${fromName} → ${toName}${t.note ? ` · ${t.note}` : ''}`
                    : [t.note, fromName].filter(Boolean).join(' · ')
                  const amt = isTransfer
                    ? formatCents(t.amount)
                    : `${t.type === 'income' ? '+' : '-'}${formatCents(t.amount)}`
                  const amtClass = isTransfer
                    ? ' transfer'
                    : t.type === 'income'
                      ? ' income'
                      : ''
                  return (
                    <button className="tx-row" key={t.id} onClick={() => onEditTx(t)}>
                      <span className="tx-icon" aria-hidden="true">
                        {icon}
                      </span>
                      <span className="tx-main">
                        <span className="tx-title">{title}</span>
                        <span className="tx-sub">{sub}</span>
                      </span>
                      <span className={`tx-amt${amtClass}`}>{amt}</span>
                    </button>
                  )
                })}
              </div>
            </section>
          )
        })
      )}
    </div>
  )
}
