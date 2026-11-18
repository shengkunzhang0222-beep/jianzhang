import { useEffect, useRef, useState } from 'react'
import TabBar, { type Tab } from './components/TabBar'
import TxEditor from './components/TxEditor'
import AssetsPage from './pages/AssetsPage'
import FundPage from './pages/FundPage'
import HomePage from './pages/HomePage'
import SettingsPage from './pages/SettingsPage'
import StatsPage from './pages/StatsPage'
import { draftFromSearch } from './parse'
import { DataProvider, useData } from './store'
import type { Tx, TxDraft } from './types'
import { currentMonth } from './utils'

function Shell() {
  const { loading, error, accounts, categories } = useData()
  const [tab, setTab] = useState<Tab>('home')
  const [month, setMonth] = useState(currentMonth)
  const [editor, setEditor] = useState<{
    open: boolean
    tx: Tx | null
    draft: TxDraft | null
  }>({
    open: false,
    tx: null,
    draft: null,
  })
  const urlChecked = useRef(false)

  useEffect(() => {
    const stored = localStorage.getItem('jz-theme')
    const root = document.documentElement
    if (stored === 'light' || stored === 'dark') root.dataset.theme = stored
    else delete root.dataset.theme
  }, [])

  useEffect(() => {
    if (loading || urlChecked.current) return
    urlChecked.current = true
    const params = new URLSearchParams(window.location.search)
    const draft = draftFromSearch(params, accounts, categories)
    if (!draft) return
    if (draft.date) setMonth(draft.date.slice(0, 7))
    setEditor({ open: true, tx: null, draft })
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${window.location.hash}`,
    )
  }, [loading, accounts, categories])

  const openAdd = () => setEditor({ open: true, tx: null, draft: null })
  const openEdit = (tx: Tx) => setEditor({ open: true, tx, draft: null })

  function handleSaved(saved: Tx, isNew: boolean) {
    setMonth(saved.date.slice(0, 7))
    if (isNew) setTab('home')
  }

  if (loading) {
    return (
      <div className="splash">
        <div className="splash-logo">¥</div>
        <div className="splash-name">记账不是张</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="splash">
        <p className="splash-error">数据加载失败：{error}</p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>
          重试
        </button>
      </div>
    )
  }

  return (
    <div className="app">
      <main className="page" key={tab}>
        {tab === 'home' ? (
          <HomePage
            month={month}
            onMonthChange={setMonth}
            onEditTx={openEdit}
            onAdd={openAdd}
          />
        ) : null}
        {tab === 'stats' ? (
          <StatsPage month={month} onMonthChange={setMonth} />
        ) : null}
        {tab === 'fund' ? <FundPage /> : null}
        {tab === 'assets' ? <AssetsPage /> : null}
        {tab === 'settings' ? <SettingsPage /> : null}
      </main>

      <TabBar tab={tab} onChange={setTab} onAdd={openAdd} />

      <TxEditor
        open={editor.open}
        tx={editor.tx}
        draft={editor.draft}
        onClose={() => setEditor({ open: false, tx: null, draft: null })}
        onSaved={handleSaved}
      />
    </div>
  )
}

export default function App() {
  return (
    <DataProvider>
      <Shell />
    </DataProvider>
  )
}
