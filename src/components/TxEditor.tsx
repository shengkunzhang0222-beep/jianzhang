import { useEffect, useRef, useState } from 'react'
import { ClipboardPaste } from 'lucide-react'
import Sheet from './Sheet'
import { parsePaymentText } from '../parse'
import { useData } from '../store'
import { deleteTx, saveTx } from '../db'
import type { Tx, TxDraft, TxType } from '../types'
import {
  centsToInput,
  formatCents,
  parseAmountInput,
  sanitizeAmountInput,
  todayStr,
  uid,
} from '../utils'

interface Props {
  open: boolean
  tx: Tx | null
  draft?: TxDraft | null
  onClose: () => void
  onSaved?: (tx: Tx, isNew: boolean) => void
}

const TYPE_LABELS: Record<TxType, string> = {
  expense: '支出',
  income: '收入',
  transfer: '转账',
}

export default function TxEditor({ open, tx, draft = null, onClose, onSaved }: Props) {
  const { accounts, categories, reload } = useData()
  const [type, setType] = useState<TxType>('expense')
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [accountId, setAccountId] = useState('')
  const [toAccountId, setToAccountId] = useState('')
  const [date, setDate] = useState(todayStr())
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [pasteHint, setPasteHint] = useState<string | null>(null)

  const accountsRef = useRef(accounts)
  accountsRef.current = accounts
  const categoriesRef = useRef(categories)
  categoriesRef.current = categories

  useEffect(() => {
    if (!open) return
    setPasteHint(null)
    const accs = accountsRef.current
    const cats = categoriesRef.current
    if (tx) {
      setType(tx.type)
      setAmount(centsToInput(tx.amount))
      setCategoryId(tx.categoryId ?? null)
      setAccountId(tx.accountId)
      setToAccountId(tx.toAccountId ?? '')
      setDate(tx.date)
      setNote(tx.note)
    } else if (draft) {
      const draftType = draft.type ?? 'expense'
      setType(draftType)
      setAmount(draft.amount !== undefined ? centsToInput(draft.amount) : '')
      const draftCatType = draftType === 'income' ? 'income' : 'expense'
      setCategoryId(
        draft.categoryId ?? cats.find((c) => c.type === draftCatType)?.id ?? null,
      )
      setAccountId(draft.accountId ?? accs[0]?.id ?? '')
      setToAccountId(draft.toAccountId ?? accs[1]?.id ?? accs[0]?.id ?? '')
      setDate(draft.date ?? todayStr())
      setNote(draft.note ?? '')
    } else {
      setType('expense')
      setAmount('')
      setCategoryId(cats.find((c) => c.type === 'expense')?.id ?? null)
      setAccountId(accs[0]?.id ?? '')
      setToAccountId(accs[1]?.id ?? accs[0]?.id ?? '')
      setDate(todayStr())
      setNote('')
    }
  }, [open, tx, draft])

  const catType = type === 'income' ? 'income' : 'expense'
  const visibleCategories = categories.filter((c) => c.type === catType)

  function changeType(next: TxType) {
    setType(next)
    if (next !== 'transfer') {
      const list = categories.filter((c) => c.type === next)
      if (!list.some((c) => c.id === categoryId)) {
        setCategoryId(list[0]?.id ?? null)
      }
    }
  }

  async function handlePasteRecognize() {
    let text = ''
    try {
      text = await navigator.clipboard.readText()
    } catch {
      text = window.prompt('无法读取剪贴板，请长按粘贴支付结果文字：') ?? ''
    }
    if (!text.trim()) return

    const parsed = parsePaymentText(text, accounts, categories)
    if (parsed.amount === undefined) {
      window.alert('没有识别到金额。请复制支付结果中的文字后再试，或手动填写。')
      return
    }

    const nextType = parsed.type ?? (type === 'transfer' ? 'expense' : type)
    setType(nextType)
    setAmount(centsToInput(parsed.amount))
    const nextCatType = nextType === 'income' ? 'income' : 'expense'
    setCategoryId(
      parsed.categoryId ?? categories.find((c) => c.type === nextCatType)?.id ?? null,
    )
    if (parsed.accountId) setAccountId(parsed.accountId)
    if (parsed.date) setDate(parsed.date)
    if (parsed.note) setNote(parsed.note)
    setPasteHint(
      `已识别 ${formatCents(parsed.amount)}${parsed.note ? ` · ${parsed.note}` : ''}，请核对后保存`,
    )
  }

  async function handleSave() {
    const cents = parseAmountInput(amount)
    if (cents === null || cents <= 0) {
      window.alert('请输入金额')
      return
    }
    if (!accountId) {
      window.alert('请先在「资产」页添加一个账户')
      return
    }
    if (type === 'transfer') {
      if (!toAccountId) {
        window.alert('请选择转入账户')
        return
      }
      if (toAccountId === accountId) {
        window.alert('转出和转入不能是同一个账户')
        return
      }
    } else if (!categoryId) {
      window.alert('请选择分类')
      return
    }

    const now = Date.now()
    const next: Tx = {
      id: tx?.id ?? uid(),
      type,
      amount: cents,
      accountId,
      date: date || todayStr(),
      note: note.trim(),
      createdAt: tx?.createdAt ?? now,
      updatedAt: now,
    }
    if (type === 'transfer') next.toAccountId = toAccountId
    else next.categoryId = categoryId ?? undefined

    setSaving(true)
    try {
      await saveTx(next)
      await reload()
      onSaved?.(next, !tx)
      onClose()
    } catch (e) {
      window.alert(`保存失败：${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!tx) return
    if (!window.confirm('删除这笔记录？')) return
    setSaving(true)
    try {
      await deleteTx(tx.id)
      await reload()
      onClose()
    } catch (e) {
      window.alert(`删除失败：${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={tx ? '编辑记录' : '记一笔'}
      footer={
        <button className="btn btn-primary btn-block" onClick={handleSave} disabled={saving}>
          {saving ? '保存中…' : '保存'}
        </button>
      }
    >
      <div className="seg type-seg">
        {(['expense', 'income', 'transfer'] as TxType[]).map((t) => (
          <button
            key={t}
            className={type === t ? 'active' : ''}
            onClick={() => changeType(t)}
          >
            {TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      <div className="amount-box">
        <div className="amount-row">
          <span className="currency">¥</span>
          <input
            className="amount-input"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(sanitizeAmountInput(e.target.value))}
            aria-label="金额"
          />
        </div>
      </div>

      <div className="paste-row">
        <button className="mini-btn" onClick={handlePasteRecognize}>
          <ClipboardPaste size={14} />
          粘贴识别
        </button>
      </div>
      {pasteHint ? <p className="paste-hint">{pasteHint}</p> : null}

      {type !== 'transfer' ? (
        <>
          <section className="editor-section">
            <div className="section-label">分类</div>
            {visibleCategories.length > 0 ? (
              <div className="cat-grid">
                {visibleCategories.map((c) => (
                  <button
                    key={c.id}
                    className={`cat-item${categoryId === c.id ? ' active' : ''}`}
                    onClick={() => setCategoryId(c.id)}
                  >
                    <span className="emoji" aria-hidden="true">
                      {c.icon}
                    </span>
                    <span className="name">{c.name}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="hint-text">还没有分类，请到「设置 → 分类管理」添加。</p>
            )}
          </section>

          <section className="editor-section">
            <div className="section-label">账户</div>
            {accounts.length > 0 ? (
              <div className="chips">
                {accounts.map((a) => (
                  <button
                    key={a.id}
                    className={`chip${accountId === a.id ? ' active' : ''}`}
                    onClick={() => setAccountId(a.id)}
                  >
                    <span aria-hidden="true">{a.icon}</span>
                    {a.name}
                  </button>
                ))}
              </div>
            ) : (
              <p className="hint-text">还没有账户，请到「资产」页添加。</p>
            )}
          </section>
        </>
      ) : (
        <>
          <section className="editor-section">
            <div className="section-label">从</div>
            <div className="chips">
              {accounts.map((a) => (
                <button
                  key={a.id}
                  className={`chip${accountId === a.id ? ' active' : ''}`}
                  onClick={() => setAccountId(a.id)}
                >
                  <span aria-hidden="true">{a.icon}</span>
                  {a.name}
                </button>
              ))}
            </div>
          </section>
          <section className="editor-section">
            <div className="section-label">转入</div>
            <div className="chips">
              {accounts.map((a) => (
                <button
                  key={a.id}
                  className={`chip${toAccountId === a.id ? ' active' : ''}`}
                  onClick={() => setToAccountId(a.id)}
                >
                  <span aria-hidden="true">{a.icon}</span>
                  {a.name}
                </button>
              ))}
            </div>
          </section>
        </>
      )}

      <div className="field">
        <label htmlFor="tx-date">日期</label>
        <input
          id="tx-date"
          className="input"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="tx-note">备注</label>
        <input
          id="tx-note"
          className="input"
          type="text"
          placeholder="可选"
          maxLength={60}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      {tx ? (
        <button
          className="btn btn-danger-ghost btn-block editor-delete"
          onClick={handleDelete}
          disabled={saving}
        >
          删除这笔记录
        </button>
      ) : null}
    </Sheet>
  )
}
