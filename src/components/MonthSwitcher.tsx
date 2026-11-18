import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Sheet from './Sheet'
import { monthLabel, shiftMonth } from '../utils'

interface Props {
  month: string
  onChange: (month: string) => void
}

export default function MonthSwitcher({ month, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [year, setYear] = useState(() => Number(month.slice(0, 4)))
  const currentYear = new Date().getFullYear()

  function openPicker() {
    setYear(Number(month.slice(0, 4)))
    setOpen(true)
  }

  return (
    <>
      <div className="month-bar">
        <button
          className="icon-btn"
          onClick={() => onChange(shiftMonth(month, -1))}
          aria-label="上个月"
        >
          <ChevronLeft size={22} />
        </button>
        <button className="month-label" onClick={openPicker}>
          {monthLabel(month)}
        </button>
        <button
          className="icon-btn"
          onClick={() => onChange(shiftMonth(month, 1))}
          aria-label="下个月"
        >
          <ChevronRight size={22} />
        </button>
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title="选择月份">
        <div className="year-row">
          <button
            className="icon-btn"
            onClick={() => setYear((y) => y - 1)}
            aria-label="上一年"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="year-label">
            {year}年
            {year === currentYear ? <em>今年</em> : null}
          </span>
          <button
            className="icon-btn"
            onClick={() => setYear((y) => y + 1)}
            aria-label="下一年"
          >
            <ChevronRight size={20} />
          </button>
        </div>
        <div className="month-grid">
          {Array.from({ length: 12 }, (_, i) => {
            const value = `${year}-${String(i + 1).padStart(2, '0')}`
            return (
              <button
                key={value}
                className={`month-cell${value === month ? ' active' : ''}`}
                onClick={() => {
                  onChange(value)
                  setOpen(false)
                }}
              >
                {i + 1}月
              </button>
            )
          })}
        </div>
      </Sheet>
    </>
  )
}
