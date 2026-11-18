import { useEffect, useRef, useState } from 'react'
import {
  ChevronRight,
  Copy,
  Download,
  Link2,
  Moon,
  Smartphone,
  Sun,
  Tag,
  Trash2,
  Upload,
} from 'lucide-react'
import CategoryManager from '../components/CategoryManager'
import { exportBackup, importBackup, resetAllData } from '../db'
import { useData } from '../store'
import { todayStr } from '../utils'

type ThemeChoice = 'auto' | 'light' | 'dark'

function getStoredTheme(): ThemeChoice {
  const stored = localStorage.getItem('jz-theme')
  return stored === 'light' || stored === 'dark' ? stored : 'auto'
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const area = document.createElement('textarea')
      area.value = text
      area.style.position = 'fixed'
      area.style.opacity = '0'
      document.body.appendChild(area)
      area.focus()
      area.select()
      const ok = document.execCommand('copy')
      area.remove()
      return ok
    } catch {
      return false
    }
  }
}

/** 带示例参数的快捷指令链接 */
function shortcutLink(): string {
  const url = new URL(window.location.href)
  url.search = ''
  url.hash = ''
  url.searchParams.set('add', '1')
  url.searchParams.set('type', 'expense')
  url.searchParams.set('amount', '35.5')
  url.searchParams.set('note', '午餐')
  url.searchParams.set('category', '餐饮')
  return url.toString()
}

export default function SettingsPage() {
  const { categories, reload } = useData()
  const [theme, setTheme] = useState<ThemeChoice>(getStoredTheme)
  const [catOpen, setCatOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const toastTimer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(toastTimer.current), [])

  function showToast(message: string) {
    setToast(message)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2400)
  }

  function applyTheme(next: ThemeChoice) {
    setTheme(next)
    localStorage.setItem('jz-theme', next)
    const root = document.documentElement
    if (next === 'auto') delete root.dataset.theme
    else root.dataset.theme = next
  }

  async function handleCopyShortcut() {
    const link = shortcutLink()
    const ok = await copyText(link)
    if (ok) showToast('链接已复制')
    else window.prompt('复制下面的链接到快捷指令：', link)
  }

  async function handleExport() {
    try {
      const data = await exportBackup()
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `记账不是张备份_${todayStr()}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 5000)
      showToast('备份已导出')
    } catch (e) {
      window.alert(`导出失败：${e instanceof Error ? e.message : String(e)}`)
    }
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const text = await file.text()
      const data: unknown = JSON.parse(text)
      if (!window.confirm('导入将覆盖当前全部数据，确定继续？')) return
      await importBackup(data)
      await reload()
      showToast('导入成功')
    } catch (err) {
      window.alert(`导入失败：${err instanceof Error ? err.message : String(err)}`)
    }
  }

  async function handleReset() {
    if (
      !window.confirm(
        '将删除全部记账数据，并恢复默认账户和分类。此操作不可撤销，确定吗？',
      )
    ) {
      return
    }
    try {
      await resetAllData()
      await reload()
      showToast('已清空数据')
    } catch (e) {
      window.alert(`操作失败：${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return (
    <div className="page-inner">
      <div className="page-head">
        <h1>设置</h1>
      </div>

      <div className="settings-group">
        <h2>记账设置</h2>
        <div className="settings-card">
          <button className="setting-row" onClick={() => setCatOpen(true)}>
            <Tag size={19} className="setting-icon" />
            <span className="setting-main">
              <span className="setting-label">分类管理</span>
              <span className="setting-hint">{categories.length} 个分类</span>
            </span>
            <ChevronRight size={17} className="chev" />
          </button>
        </div>
      </div>

      <div className="settings-group">
        <h2>外观</h2>
        <div className="settings-card theme-card">
          <div className="seg theme-seg">
            <button
              className={theme === 'auto' ? 'active' : ''}
              onClick={() => applyTheme('auto')}
            >
              <Smartphone size={15} />
              跟随系统
            </button>
            <button
              className={theme === 'light' ? 'active' : ''}
              onClick={() => applyTheme('light')}
            >
              <Sun size={15} />
              浅色
            </button>
            <button
              className={theme === 'dark' ? 'active' : ''}
              onClick={() => applyTheme('dark')}
            >
              <Moon size={15} />
              深色
            </button>
          </div>
        </div>
      </div>

      <div className="settings-group">
        <h2>快捷记账</h2>
        <div className="settings-card">
          <button className="setting-row" onClick={handleCopyShortcut}>
            <Link2 size={19} className="setting-icon" />
            <span className="setting-main">
              <span className="setting-label">复制快捷指令链接</span>
              <span className="setting-hint">
                配合 iOS 快捷指令，一键打开预填的记账页
              </span>
            </span>
            <Copy size={16} className="chev" />
          </button>
          <div className="shortcut-help">
            <p>在 iPhone「快捷指令」App 里：</p>
            <ol>
              <li>新建快捷指令，用「询问输入」或「听写文本」取得金额</li>
              <li>添加「打开 URL」，粘贴上面的链接，把 amount 换成金额</li>
              <li>放到主屏幕、锁屏小组件或背面轻点</li>
            </ol>
            <p className="install-note">
              提示：也可以复制微信/支付宝的支付结果文字，回到记账不是张点「粘贴识别」
              自动填写。全部解析都在本机完成。
            </p>
          </div>
        </div>
      </div>

      <div className="settings-group">
        <h2>数据</h2>
        <div className="settings-card">
          <button className="setting-row" onClick={handleExport}>
            <Download size={19} className="setting-icon" />
            <span className="setting-main">
              <span className="setting-label">导出备份</span>
              <span className="setting-hint">保存为 JSON 文件</span>
            </span>
            <ChevronRight size={17} className="chev" />
          </button>
          <button className="setting-row" onClick={() => fileRef.current?.click()}>
            <Upload size={19} className="setting-icon" />
            <span className="setting-main">
              <span className="setting-label">导入备份</span>
              <span className="setting-hint">从 JSON 文件恢复</span>
            </span>
            <ChevronRight size={17} className="chev" />
          </button>
          <button className="setting-row" onClick={handleReset}>
            <Trash2 size={19} className="setting-icon danger" />
            <span className="setting-main">
              <span className="setting-label danger">清空数据</span>
              <span className="setting-hint">删除全部记录并恢复默认</span>
            </span>
            <ChevronRight size={17} className="chev" />
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={handleImportFile}
        />
      </div>

      <div className="settings-group">
        <h2>安装到 iPhone</h2>
        <div className="settings-card">
          <div className="install-card">
            <div className="install-step">
              <span className="step-num">1</span>
              <span>用 Safari 打开本页面</span>
            </div>
            <div className="install-step">
              <span className="step-num">2</span>
              <span>点击底部「分享」按钮</span>
            </div>
            <div className="install-step">
              <span className="step-num">3</span>
              <span>选择「添加到主屏幕」</span>
            </div>
            <p className="install-note">
              添加到主屏幕后可全屏使用，断网也能记账。数据只保存在本机，
              建议定期导出备份。
            </p>
          </div>
        </div>
      </div>

      <div className="settings-group">
        <h2>关于</h2>
        <div className="settings-card">
          <div className="about">
            <div className="about-logo" aria-hidden="true">
              ¥
            </div>
            <div>
              <div className="about-name">记账不是张</div>
              <div className="about-version">v0.2.0 · 数据仅保存在本机</div>
            </div>
          </div>
        </div>
      </div>

      {toast ? <div className="toast">{toast}</div> : null}

      <CategoryManager open={catOpen} onClose={() => setCatOpen(false)} />
    </div>
  )
}
