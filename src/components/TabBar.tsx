import { ChartColumn, House, Plus, Settings, Wallet } from 'lucide-react'

export type Tab = 'home' | 'stats' | 'assets' | 'settings'

interface Props {
  tab: Tab
  onChange: (tab: Tab) => void
  onAdd: () => void
}

export default function TabBar({ tab, onChange, onAdd }: Props) {
  return (
    <nav className="tabbar" aria-label="主导航">
      <button
        className={`tab${tab === 'home' ? ' active' : ''}`}
        onClick={() => onChange('home')}
      >
        <House size={22} strokeWidth={1.9} />
        <span>明细</span>
      </button>
      <button
        className={`tab${tab === 'stats' ? ' active' : ''}`}
        onClick={() => onChange('stats')}
      >
        <ChartColumn size={22} strokeWidth={1.9} />
        <span>统计</span>
      </button>
      <button className="tab-add" onClick={onAdd} aria-label="记一笔">
        <Plus size={26} strokeWidth={2.2} />
      </button>
      <button
        className={`tab${tab === 'assets' ? ' active' : ''}`}
        onClick={() => onChange('assets')}
      >
        <Wallet size={22} strokeWidth={1.9} />
        <span>资产</span>
      </button>
      <button
        className={`tab${tab === 'settings' ? ' active' : ''}`}
        onClick={() => onChange('settings')}
      >
        <Settings size={22} strokeWidth={1.9} />
        <span>设置</span>
      </button>
    </nav>
  )
}
