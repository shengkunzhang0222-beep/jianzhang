import { useMemo, useState } from 'react'
import dayjs from 'dayjs'
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import Sheet from '../components/Sheet'
import {
  deleteFundEntry,
  deleteFundGoal,
  saveFundEntry,
  saveFundGoal,
} from '../db'
import {
  fundSaved,
  goalGap,
  goalMonthlyNeeded,
  goalProgress,
  goalSaved,
  monthDeposits,
  monthsUntil,
  sortGoals,
  suggestedMonthly,
} from '../fund'
import { useData } from '../store'
import type { FundEntry, FundGoal } from '../types'
import {
  centsToInput,
  currentMonth,
  formatCents,
  monthLabel,
  parseAmountInput,
  sanitizeAmountInput,
  todayStr,
  uid,
} from '../utils'

const FUND_PLAN_KEY = 'jz-fund-plan'
const DEFAULT_PLAN = 250_000

const GOAL_ICONS = ['🛡️', '🏔️', '⛰️', '🎒', '🧗', '🏕️', '✈️', '🌄', '🎯', '💰']

function readPlan(): number {
  const raw = localStorage.getItem(FUND_PLAN_KEY)
  const n = raw ? Number(raw) : NaN
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_PLAN
}

export default function FundPage() {
  const { fundGoals, fundEntries, reload } = useData()

  const [entryOpen, setEntryOpen] = useState(false)
  const [entryType, setEntryType] = useState<'deposit' | 'withdraw'>('deposit')
  const [entryAmount, setEntryAmount] = useState('')
  const [entryGoalId, setEntryGoalId] = useState('')
  const [entryDate, setEntryDate] = useState(todayStr())
  const [entryNote, setEntryNote] = useState('')

  const [goalOpen, setGoalOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<FundGoal | null>(null)
  const [goalName, setGoalName] = useState('')
  const [goalIcon, setGoalIcon] = useState('🏔️')
  const [goalTarget, setGoalTarget] = useState('')
  const [goalDate, setGoalDate] = useState('')
  const [goalNote, setGoalNote] = useState('')

  const [planOpen, setPlanOpen] = useState(false)
  const [planInput, setPlanInput] = useState('')
  const [plan, setPlan] = useState(readPlan)

  const [saving, setSaving] = useState(false)

  const goals = useMemo(() => sortGoals(fundGoals), [fundGoals])
  const goalById = useMemo(
    () => new Map(fundGoals.map((g) => [g.id, g])),
    [fundGoals],
  )
  const savedById = useMemo(
    () => new Map(fundGoals.map((g) => [g.id, goalSaved(g.id, fundEntries)])),
    [fundGoals, fundEntries],
  )

  const total = useMemo(() => fundSaved(fundEntries), [fundEntries])
  const totalTarget = useMemo(
    () => fundGoals.reduce((s, g) => s + g.targetAmount, 0),
    [fundGoals],
  )
  const progress = totalTarget > 0 ? Math.min(1, Math.max(0, total / totalTarget)) : 0
  const progressLabel = Math.round(progress * 100)
  const thisMonth = useMemo(
    () => monthDeposits(fundEntries, currentMonth()),
    [fundEntries],
  )
  const suggested = useMemo(
    () => suggestedMonthly(fundGoals, fundEntries),
    [fundGoals, fundEntries],
  )
  const recent = useMemo(
    () =>
      [...fundEntries]
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
        .slice(0, 20),
    [fundEntries],
  )

  function openEntry(type: 'deposit' | 'withdraw', goalId?: string) {
    if (goals.length === 0) {
      window.alert('先添加一个目标，再往里存钱。')
      openGoal(null)
      return
    }
    const nextGoal =
      goalId ??
      goals.find((g) => (savedById.get(g.id) ?? 0) < g.targetAmount)?.id ??
      goals[0].id
    setEntryType(type)
    setEntryGoalId(nextGoal)
    setEntryAmount('')
    setEntryDate(todayStr())
    setEntryNote('')
    setEntryOpen(true)
  }

  function openGoal(goal: FundGoal | null) {
    setEditingGoal(goal)
    setGoalName(goal?.name ?? '')
    setGoalIcon(goal?.icon ?? '🏔️')
    setGoalTarget(goal ? centsToInput(goal.targetAmount) : '')
    setGoalDate(goal?.targetDate ?? dayjs().add(6, 'month').format('YYYY-MM'))
    setGoalNote(goal?.note ?? '')
    setGoalOpen(true)
  }

  function openPlan() {
    setPlanInput(centsToInput(plan))
    setPlanOpen(true)
  }

  async function handleSaveEntry() {
    const cents = parseAmountInput(entryAmount)
    if (cents === null || cents <= 0) {
      window.alert('请输入金额')
      return
    }
    if (!entryGoalId) {
      window.alert('请选择目标')
      return
    }
    if (entryType === 'withdraw') {
      const saved = savedById.get(entryGoalId) ?? 0
      if (cents > saved) {
        window.alert(`这个目标目前只存了 ${formatCents(saved)}，不能取这么多。`)
        return
      }
    }
    const now = Date.now()
    const entry: FundEntry = {
      id: uid(),
      goalId: entryGoalId,
      type: entryType,
      amount: cents,
      date: entryDate || todayStr(),
      note: entryNote.trim(),
      createdAt: now,
      updatedAt: now,
    }
    setSaving(true)
    try {
      await saveFundEntry(entry)
      await reload()
      setEntryOpen(false)
    } catch (e) {
      window.alert(`保存失败：${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveGoal() {
    const name = goalName.trim()
    if (!name) {
      window.alert('请输入目标名称')
      return
    }
    const target = parseAmountInput(goalTarget)
    if (target === null || target <= 0) {
      window.alert('请输入目标金额')
      return
    }
    if (!/^\d{4}-\d{2}$/.test(goalDate)) {
      window.alert('请选择目标月份')
      return
    }
    const goal: FundGoal = {
      id: editingGoal?.id ?? uid(),
      name,
      icon: goalIcon,
      targetAmount: target,
      targetDate: goalDate,
      note: goalNote.trim(),
      priority:
        editingGoal?.priority ?? Math.max(0, ...fundGoals.map((g) => g.priority)) + 1,
      createdAt: editingGoal?.createdAt ?? Date.now(),
    }
    setSaving(true)
    try {
      await saveFundGoal(goal)
      await reload()
      setGoalOpen(false)
    } catch (e) {
      window.alert(`保存失败：${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteGoal() {
    if (!editingGoal) return
    if (fundEntries.some((e) => e.goalId === editingGoal.id)) {
      window.alert('这个目标已有存入记录，不能删除。可以保留它，或先删掉相关记录。')
      return
    }
    if (!window.confirm(`删除目标「${editingGoal.name}」？`)) return
    setSaving(true)
    try {
      await deleteFundGoal(editingGoal.id)
      await reload()
      setGoalOpen(false)
    } catch (e) {
      window.alert(`删除失败：${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteEntry(entry: FundEntry) {
    const goal = goalById.get(entry.goalId)
    const label = entry.type === 'deposit' ? '存入' : '取出'
    if (
      !window.confirm(
        `删除这笔${label}记录？${goal ? `（${goal.name}）` : ''}`,
      )
    ) {
      return
    }
    setSaving(true)
    try {
      await deleteFundEntry(entry.id)
      await reload()
    } catch (e) {
      window.alert(`删除失败：${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setSaving(false)
    }
  }

  function handleSavePlan() {
    const cents = parseAmountInput(planInput)
    if (cents === null) {
      window.alert('请输入有效的金额')
      return
    }
    localStorage.setItem(FUND_PLAN_KEY, String(cents))
    setPlan(cents)
    setPlanOpen(false)
  }

  return (
    <div className="page-inner">
      <div className="page-head">
        <h1>人生基金</h1>
        <button className="icon-btn" onClick={() => openGoal(null)} aria-label="添加目标">
          <Plus size={20} />
        </button>
      </div>

      <section className="hero-card">
        <div className="hero-label">基金总额</div>
        <div className={`hero-value${total < 0 ? ' negative' : ''}`}>
          {formatCents(total)}
        </div>
        <div className="hero-meta">
          总目标 {formatCents(totalTarget)} · 已完成 {progressLabel}%
        </div>
        <div className="fund-bar big" aria-hidden="true">
          <span style={{ width: `${progressLabel}%` }} />
        </div>
        <div className="hero-grid">
          <div>
            <div className="k">本月已存</div>
            <div className="v income">{formatCents(thisMonth)}</div>
          </div>
          <div>
            <div className="k">每月计划</div>
            <div className="v">{formatCents(plan)}</div>
          </div>
        </div>
        <div className="fund-plan-row">
          <span>
            {plan <= 0
              ? '还没有设置每月计划'
              : thisMonth >= plan
                ? '本月计划已完成'
                : `本月还差 ${formatCents(plan - thisMonth)}`}
          </span>
          <button className="mini-btn" onClick={openPlan}>
            调整
          </button>
        </div>
      </section>

      <div className="fund-actions">
        <button className="btn btn-primary" onClick={() => openEntry('deposit')}>
          <ArrowDownToLine size={17} />
          存入
        </button>
        <button className="btn btn-ghost" onClick={() => openEntry('withdraw')}>
          <ArrowUpFromLine size={17} />
          取出
        </button>
      </div>

      <div className="fund-section-head">
        <h2>目标</h2>
        <span>{goals.length} 个 · 点目标直接存入</span>
      </div>

      {goals.length === 0 ? (
        <div className="empty">
          <div className="empty-icon" aria-hidden="true">
            🎯
          </div>
          <p>还没有目标</p>
          <button className="btn btn-primary" onClick={() => openGoal(null)}>
            添加第一个目标
          </button>
        </div>
      ) : (
        <div className="fund-goals">
          {goals.map((g) => {
            const saved = savedById.get(g.id) ?? 0
            const gap = goalGap(g, fundEntries)
            const pct = Math.round(goalProgress(g, fundEntries) * 100)
            const monthly = goalMonthlyNeeded(g, fundEntries)
            return (
              <div className="fund-goal-wrap" key={g.id}>
                <button className="fund-goal" onClick={() => openEntry('deposit', g.id)}>
                  <span className="fund-goal-top">
                    <span className="fund-goal-icon" aria-hidden="true">
                      {g.icon}
                    </span>
                    <span className="fund-goal-main">
                      <span className="fund-goal-name">{g.name}</span>
                      <span className="fund-goal-sub">
                        {monthLabel(g.targetDate)} · 还有 {monthsUntil(g.targetDate)} 个月
                      </span>
                    </span>
                    <span className="fund-goal-amt">
                      <span>{formatCents(saved)}</span>
                      <span className="muted"> / {formatCents(g.targetAmount)}</span>
                    </span>
                  </span>
                  <span className="fund-bar" aria-hidden="true">
                    <span style={{ width: `${pct}%` }} />
                  </span>
                  <span className="fund-goal-foot">
                    <span>{gap <= 0 ? '已达成 🎉' : `还差 ${formatCents(gap)}`}</span>
                    <span>{gap <= 0 ? '可以出发了' : `每月 ${formatCents(monthly)}`}</span>
                  </span>
                </button>
                <button
                  className="fund-goal-edit"
                  onClick={() => openGoal(g)}
                  aria-label={`编辑${g.name}`}
                >
                  <Pencil size={14} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      <div className="fund-section-head">
        <h2>最近记录</h2>
        <span>{fundEntries.length} 笔</span>
      </div>

      {recent.length === 0 ? (
        <div className="card fund-empty">还没有存入记录，点上面的「存入」开始。</div>
      ) : (
        <div className="fund-entries">
          {recent.map((e) => {
            const goal = goalById.get(e.goalId)
            return (
              <div className="fund-entry" key={e.id}>
                <span className={`fund-entry-icon ${e.type}`} aria-hidden="true">
                  {e.type === 'deposit' ? '↑' : '↓'}
                </span>
                <span className="fund-entry-main">
                  <span className="fund-entry-title">
                    {goal?.name ?? '未知目标'}
                    {e.note ? ` · ${e.note}` : ''}
                  </span>
                  <span className="fund-entry-sub">{e.date}</span>
                </span>
                <span className={`fund-entry-amt ${e.type}`}>
                  {e.type === 'deposit' ? '+' : '-'}
                  {formatCents(e.amount)}
                </span>
                <button
                  className="fund-entry-del"
                  onClick={() => handleDeleteEntry(e)}
                  aria-label="删除记录"
                  disabled={saving}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      <Sheet
        open={entryOpen}
        onClose={() => setEntryOpen(false)}
        title={entryType === 'deposit' ? '存入基金' : '取出基金'}
        footer={
          <button
            className="btn btn-primary btn-block"
            onClick={handleSaveEntry}
            disabled={saving}
          >
            {saving ? '保存中…' : '保存'}
          </button>
        }
      >
        <div className="seg type-seg">
          <button
            className={entryType === 'deposit' ? 'active' : ''}
            onClick={() => setEntryType('deposit')}
          >
            存入
          </button>
          <button
            className={entryType === 'withdraw' ? 'active' : ''}
            onClick={() => setEntryType('withdraw')}
          >
            取出
          </button>
        </div>

        <div className="amount-box">
          <div className="amount-row">
            <span className="currency">¥</span>
            <input
              className="amount-input"
              inputMode="decimal"
              placeholder="0.00"
              value={entryAmount}
              onChange={(e) => setEntryAmount(sanitizeAmountInput(e.target.value))}
              aria-label="金额"
            />
          </div>
        </div>

        <section className="editor-section">
          <div className="section-label">目标</div>
          <div className="chips">
            {goals.map((g) => (
              <button
                key={g.id}
                className={`chip${entryGoalId === g.id ? ' active' : ''}`}
                onClick={() => setEntryGoalId(g.id)}
              >
                <span aria-hidden="true">{g.icon}</span>
                {g.name}
                <span className="chip-amt">
                  {formatCents(savedById.get(g.id) ?? 0)}
                </span>
              </button>
            ))}
          </div>
        </section>

        <div className="field">
          <label htmlFor="fund-date">日期</label>
          <input
            id="fund-date"
            className="input"
            type="date"
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="fund-note">备注</label>
          <input
            id="fund-note"
            className="input"
            type="text"
            placeholder="可选，如：11月工资转入"
            maxLength={40}
            value={entryNote}
            onChange={(e) => setEntryNote(e.target.value)}
          />
        </div>

        <p className="field-hint">
          基金是虚拟的专款账户：钱仍在原来的银行卡/余额里，这里只记录「这笔钱留给哪座山」。
        </p>
      </Sheet>

      <Sheet
        open={goalOpen}
        onClose={() => setGoalOpen(false)}
        title={editingGoal ? '编辑目标' : '添加目标'}
        footer={
          <button
            className="btn btn-primary btn-block"
            onClick={handleSaveGoal}
            disabled={saving}
          >
            {saving ? '保存中…' : '保存'}
          </button>
        }
      >
        <section className="editor-section">
          <div className="section-label">图标</div>
          <div className="emoji-grid emoji-grid-wide">
            {GOAL_ICONS.map((icon) => (
              <button
                key={icon}
                className={`emoji-cell${goalIcon === icon ? ' active' : ''}`}
                onClick={() => setGoalIcon(icon)}
              >
                {icon}
              </button>
            ))}
          </div>
        </section>

        <div className="field">
          <label htmlFor="goal-name">目标名称</label>
          <input
            id="goal-name"
            className="input"
            value={goalName}
            maxLength={12}
            placeholder="如：奥太娜"
            onChange={(e) => setGoalName(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="goal-target">目标金额</label>
          <input
            id="goal-target"
            className="input"
            inputMode="decimal"
            value={goalTarget}
            placeholder="如：3600"
            onChange={(e) => setGoalTarget(sanitizeAmountInput(e.target.value))}
          />
        </div>

        <div className="field">
          <label htmlFor="goal-date">目标月份</label>
          <input
            id="goal-date"
            className="input"
            type="month"
            value={goalDate}
            onChange={(e) => setGoalDate(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="goal-note">备注</label>
          <input
            id="goal-note"
            className="input"
            value={goalNote}
            maxLength={40}
            placeholder="可选，如：含往返高铁和装备租赁"
            onChange={(e) => setGoalNote(e.target.value)}
          />
        </div>

        {editingGoal ? (
          <button
            className="btn btn-danger-ghost btn-block editor-delete"
            onClick={handleDeleteGoal}
            disabled={saving}
          >
            删除目标
          </button>
        ) : null}
      </Sheet>

      <Sheet
        open={planOpen}
        onClose={() => setPlanOpen(false)}
        title="每月计划"
        footer={
          <button className="btn btn-primary btn-block" onClick={handleSavePlan}>
            保存
          </button>
        }
      >
        <div className="field">
          <label htmlFor="fund-plan">每月存入（元）</label>
          <input
            id="fund-plan"
            className="input"
            inputMode="decimal"
            value={planInput}
            placeholder="如：2500"
            onChange={(e) => setPlanInput(sanitizeAmountInput(e.target.value))}
          />
          <p className="field-hint">
            按当前目标测算，建议每月约 {formatCents(suggested)}。发薪日次日自动转账最省心；
            设成 0 表示暂不设目标。
          </p>
        </div>
      </Sheet>
    </div>
  )
}
