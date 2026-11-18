import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import Sheet from '../components/Sheet'
import { deleteAccount, saveAccount } from '../db'
import { accountBalance } from '../stats'
import { useData } from '../store'
import type { Account } from '../types'
import { formatCents, parseSignedAmountInput, uid } from '../utils'

const ACCOUNT_ICONS = ['💵', '💳', '🔵', '🟢', '🏦', '📱', '💰', '🪙']

export default function AssetsPage() {
  const { accounts, txs, reload } = useData()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Account | null>(null)
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('💵')
  const [balance, setBalance] = useState('0')
  const [saving, setSaving] = useState(false)

  const total = useMemo(
    () => accounts.reduce((s, a) => s + accountBalance(a, txs), 0),
    [accounts, txs],
  )

  function openNew() {
    setEditing(null)
    setName('')
    setIcon('💵')
    setBalance('0')
    setOpen(true)
  }

  function openEdit(a: Account) {
    setEditing(a)
    setName(a.name)
    setIcon(a.icon)
    setBalance(
      a.initialBalance % 100 === 0
        ? String(a.initialBalance / 100)
        : (a.initialBalance / 100).toFixed(2),
    )
    setOpen(true)
  }

  async function handleSave() {
    const trimmed = name.trim()
    if (!trimmed) {
      window.alert('请输入账户名称')
      return
    }
    const cents = parseSignedAmountInput(balance)
    if (cents === null) {
      window.alert('请输入有效的初始余额')
      return
    }
    const account: Account = {
      id: editing?.id ?? uid(),
      name: trimmed,
      kind: editing?.kind ?? 'other',
      icon,
      initialBalance: cents,
      order: editing?.order ?? Math.max(0, ...accounts.map((a) => a.order)) + 1,
      createdAt: editing?.createdAt ?? Date.now(),
    }
    setSaving(true)
    try {
      await saveAccount(account)
      await reload()
      setOpen(false)
    } catch (e) {
      window.alert(`保存失败：${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!editing) return
    if (txs.some((t) => t.accountId === editing.id || t.toAccountId === editing.id)) {
      window.alert('该账户已有记账记录，无法删除。')
      return
    }
    if (!window.confirm(`删除账户「${editing.name}」？`)) return
    setSaving(true)
    try {
      await deleteAccount(editing.id)
      await reload()
      setOpen(false)
    } catch (e) {
      window.alert(`删除失败：${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page-inner">
      <div className="page-head">
        <h1>资产</h1>
        <button className="icon-btn" onClick={openNew} aria-label="添加账户">
          <Plus size={20} />
        </button>
      </div>

      <section className="hero-card">
        <div className="hero-label">总资产</div>
        <div className={`hero-value${total < 0 ? ' negative' : ''}`}>
          {formatCents(total)}
        </div>
        <div className="hero-meta">共 {accounts.length} 个账户</div>
      </section>

      <section className="card account-card">
        {accounts.map((a) => {
          const bal = accountBalance(a, txs)
          return (
            <button className="account-row" key={a.id} onClick={() => openEdit(a)}>
              <span className="account-icon" aria-hidden="true">
                {a.icon}
              </span>
              <span className="account-main">
                <span className="account-name">{a.name}</span>
              </span>
              <span className={`account-bal${bal < 0 ? ' negative' : ''}`}>
                {formatCents(bal)}
              </span>
            </button>
          )
        })}
        <button className="account-row add-account" onClick={openNew}>
          <span className="account-icon add-icon" aria-hidden="true">
            <Plus size={18} />
          </span>
          <span className="account-main">
            <span className="account-name">添加账户</span>
          </span>
        </button>
      </section>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? '编辑账户' : '添加账户'}
        footer={
          <button
            className="btn btn-primary btn-block"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? '保存中…' : '保存'}
          </button>
        }
      >
        <section className="editor-section">
          <div className="section-label">图标</div>
          <div className="emoji-grid emoji-grid-wide">
            {ACCOUNT_ICONS.map((e) => (
              <button
                key={e}
                className={`emoji-cell${icon === e ? ' active' : ''}`}
                onClick={() => setIcon(e)}
              >
                {e}
              </button>
            ))}
          </div>
        </section>

        <div className="field">
          <label htmlFor="acc-name">账户名称</label>
          <input
            id="acc-name"
            className="input"
            value={name}
            maxLength={12}
            placeholder="如：招商银行卡"
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="acc-balance">初始余额</label>
          <input
            id="acc-balance"
            className="input"
            inputMode="decimal"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
          />
          <p className="field-hint">只用于计算资产，日常收支会自动增减余额。</p>
        </div>

        {editing ? (
          <button
            className="btn btn-danger-ghost btn-block editor-delete"
            onClick={handleDelete}
            disabled={saving}
          >
            删除账户
          </button>
        ) : null}
      </Sheet>
    </div>
  )
}
