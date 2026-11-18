import { useState } from 'react'
import { ChartColumn, Table2 } from 'lucide-react'
import { formatCents, formatCompact, niceCeil } from '../utils'

export interface RankItem {
  id: string
  name: string
  icon: string
  value: number
  share: number
}

/** 分类排行：同一色相的水平条，金额直接标注在行内 */
export function RankedBars({ items }: { items: RankItem[] }) {
  const max = Math.max(...items.map((i) => i.value), 1)
  return (
    <div className="rank-list">
      {items.map((it) => (
        <div className="rank-row" key={it.id}>
          <div className="rank-top">
            <span className="rank-name">
              <span className="rank-emoji" aria-hidden="true">
                {it.icon}
              </span>
              {it.name}
            </span>
            <span className="rank-amt">
              {formatCents(it.value)}
              <span className="rank-share">{Math.round(it.share * 100)}%</span>
            </span>
          </div>
          <div className="rank-bar">
            <div
              className="rank-fill"
              style={{ width: `${Math.max(2, (it.value / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

export interface TrendPoint {
  month: string
  label: string
  fullLabel: string
  value: number
}

/** 近几个月支出柱状图，点选月份看数值；可切换表格 */
export function MonthlyTrend({ points }: { points: TrendPoint[] }) {
  const [selected, setSelected] = useState(points.length - 1)
  const [showTable, setShowTable] = useState(false)
  const max = niceCeil(Math.max(...points.map((p) => p.value), 1))
  const selIndex = Math.min(selected, points.length - 1)
  const sel = points[selIndex]
  const ticks = [1, 0.75, 0.5, 0.25]

  if (!sel) return null

  return (
    <div className="trend-block">
      <div className="trend-toolbar">
        <div className="trend-readout">
          <span>{sel.fullLabel}</span>
          <strong>{formatCents(sel.value)}</strong>
        </div>
        <button className="mini-btn" onClick={() => setShowTable((v) => !v)}>
          {showTable ? <ChartColumn size={14} /> : <Table2 size={14} />}
          {showTable ? '图表' : '表格'}
        </button>
      </div>

      {showTable ? (
        <table className="trend-table">
          <thead>
            <tr>
              <th scope="col">月份</th>
              <th scope="col">支出</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.month} className={p.month === sel.month ? 'sel' : ''}>
                <td>{p.fullLabel}</td>
                <td>{formatCents(p.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="trend-chart">
          <div className="trend-row">
            <div className="trend-y" aria-hidden="true">
              {[0, ...ticks].map((t) => (
                <span key={t} style={{ bottom: `${t * 100}%` }}>
                  {formatCompact(max * t)}
                </span>
              ))}
            </div>
            <div className="trend-plot">
              {ticks.map((t) => (
                <div key={t} className="gridline" style={{ bottom: `${t * 100}%` }} />
              ))}
              <div className="trend-cols">
                {points.map((p, i) => {
                  const pct = (p.value / max) * 100
                  const isSel = i === selIndex
                  return (
                    <button
                      key={p.month}
                      className={`trend-col${isSel ? ' selected' : ''}`}
                      onClick={() => setSelected(i)}
                      aria-pressed={isSel}
                      aria-label={`${p.fullLabel} 支出 ${formatCents(p.value)}`}
                    >
                      {p.value > 0 ? (
                        <div
                          className="trend-bar"
                          style={{ height: `${Math.max(pct, 1.5)}%` }}
                        />
                      ) : null}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
          <div className="trend-x">
            {points.map((p, i) => (
              <button
                key={p.month}
                className={i === selIndex ? 'sel' : ''}
                onClick={() => setSelected(i)}
                tabIndex={-1}
                aria-hidden="true"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
