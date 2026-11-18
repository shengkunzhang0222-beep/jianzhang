import { useMemo, useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import Sheet from './Sheet'
import { deleteCategory, saveCategory } from '../db'
import { useData } from '../store'
import type { Category } from '../types'
import { uid } from '../utils'

const EXPENSE_EMOJIS = [
  '🍜', '🍚', '☕', '🍎', '🚇', '🚕', '⛽', '🛍️', '👕', '🏠',
  '💡', '🎮', '🎬', '🎵', '💊', '🏥', '📚', '✏️', '🎁', '📱',
  '🐱', '✈️', '🏋️', '💇', '📦',
]
const INCOME_EMOJIS = [
  '💼', '🏆', '📈', '💡', '🧧', '💰', '🏦', '🎁', '🪙', '📦',
  '🎯', '💻',
]

interface Props {
  open: boolean
  onClose: () => void
}

export default function CategoryManager({ open, onClose }: Props) {
  const { categories, txs, reload } = useData()
  const [type, setType] = useState<'expense' | 'income'>('expense')
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('🍜')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const list = useMemo(
    () =>
      categories
        .filter((c) => c.type === type)
        .sort((a, b) => a.order - b.order),
    [categories, type],
  )
  const counts = useMemo(() => {
    const m = new Map<string, number>()
    for (const t of txs) {
      if (!t.categoryId) continue
      m.set(t.categoryId, (m.get(t.categoryId) ?? 0) + 1)
    }
    return m
  }, [txs])

  const emojis = type === 'expense' ? EXPENSE_EMOJIS : INCOME_EMOJIS

  function resetForm(nextType: 'expense' | 'income' = type) {
    setEditingId(null)
    setName('')
    setIcon(nextType === 'expense' ? '🍜' : '💼')
  }

  function switchType(next: 'expense' | 'income') {
    setType(next)
    resetForm(next)
  }

  function startEdit(c: Category) {
    setEditingId(c.id)
    setName(c.name)
    setIcon(c.icon)
  }

  async function handleSave() {
    const trimmed = name.trim()
    if (!trimmed) {
      window.alert('请输入分类名称')
      return
    }
    setSaving(true)
    try {
      if (editingId) {
        const origin = categories.find((c) => c.id === editingId)
        if (!origin) return
        await saveCategory({ ...origin, name: trimmed, icon })
      } else {
        await saveCategory({
          id: uid(),
          name: trimmed,
          icon,
          type,
          builtin: false,
          order: Math.max(0, ...list.map((c) => c.order)) + 1,
        })
      }
      await reload()
      resetForm()
    } catch (e) {
      window.alert(`保存失败：${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(c: Category) {
    if (txs.some((t) => t.categoryId === c.id)) {
      window.alert('该分类下已有记账记录，无法删除。')
      return
    }
    if (!window.confirm(`删除分类「${c.name}」？`)) return
    try {
      await deleteCategory(c.id)
      await reload()
      if (editingId === c.id) resetForm()
    } catch (e) {
      window.alert(`删除失败：${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="分类管理">
      <div className="seg">
        <button
          className={type === 'expense' ? 'active' : ''}
          onClick={() => switchType('expense')}
        >
          支出分类
        </button>
        <button
          className={type === 'income' ? 'active' : ''}
          onClick={() => switchType('income')}
        >
          收入分类
        </button>
      </div>

      <div className="cat-list">
        {list.map((c) => (
          <div className="cat-row" key={c.id}>
            <span className="cat-row-icon" aria-hidden="true">
              {c.icon}
            </span>
            <div className="cat-row-main">
              <div className="cat-row-name">
                {c.name}
                {c.builtin ? <span className="badge">默认</span> : null}
              </div>
              <div className="cat-row-sub">{counts.get(c.id) ?? 0} 笔记录</div>
            </div>
            <button
              className="icon-btn"
              onClick={() => startEdit(c)}
              aria-label={`编辑${c.name}`}
            >
              <Pencil size={16} />
            </button>
            <button
              className="icon-btn danger"
              onClick={() => handleDelete(c)}
              aria-label={`删除${c.name}`}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        {list.length === 0 ? <p className="hint-text">暂无分类</p> : null}
      </div>

      <div className="form-card">
        <div className="form-title">{editingId ? '编辑分类' : '新建分类'}</div>
        <div className="field">
          <label>图标</label>
          <div className="emoji-grid">
            {emojis.map((e) => (
              <button
                key={e}
                className={`emoji-cell${icon === e ? ' active' : ''}`}
                onClick={() => setIcon(e)}
                aria-label={`选择图标 ${e}`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <label htmlFor="cat-name">名称</label>
          <input
            id="cat-name"
            className="input"
            value={name}
            maxLength={8}
            placeholder="如：宠物"
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="form-actions">
          {editingId ? (
            <button className="btn btn-ghost" onClick={() => resetForm()}>
              取消
            </button>
          ) : null}
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? '保存中…' : editingId ? '保存' : '添加'}
          </button>
        </div>
      </div>
    </Sheet>
  )
}
