import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import './app.css'
import './styles/theme.css'
import 'highlight.js/styles/github.css'
import { PreviewPanel } from './components/PreviewPanel'
import { subscribeSelectionChange, getSelectedCellMarkdown, isBitableAvailable } from './feishu/bitable'
import { debounce } from './utils/debounce'
import { applyCustomTheme } from './utils/color'

const DEFAULT_WIDTH = 300

export function App() {
  const [visible, setVisible] = useState<boolean>(() => {
    const v = localStorage.getItem('dwbg:panelVisible')
    return v === null ? true : v === '1'
  })
  const [panelWidth, setPanelWidth] = useState<number>(() => {
    const w = localStorage.getItem('dwbg:panelWidth')
    return w ? Math.max(240, Math.min(640, parseInt(w))) : DEFAULT_WIDTH
  })
  const [markdown, setMarkdown] = useState<string>('')
  const [sourceMeta, setSourceMeta] = useState<{ tableId?: string; recordId?: string; fieldId?: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number>(0)
  const resizeRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef<boolean>(false)
  const [theme, setTheme] = useState<string>(() => localStorage.getItem('dwbg:theme') || 'blue')
  const [customPrimary, setCustomPrimary] = useState<string>(() => localStorage.getItem('dwbg:customPrimary') || '#2fb888')

  // Handle selection updates with debounce
  const handleSelectionUpdate = useMemo(
    () =>
      debounce(async () => {
        try {
          const { md, meta } = await getSelectedCellMarkdown()
          setMarkdown(md || '')
          setSourceMeta(meta)
          setError(null)
          setLastUpdatedAt(Date.now())
        } catch (e: any) {
          setError(e?.message || '获取单元格内容失败')
        }
      }, 150),
    []
  )

  useEffect(() => {
    const off = subscribeSelectionChange(handleSelectionUpdate)
    // initial fetch
    handleSelectionUpdate()
    return () => off()
  }, [])

  // allow external refresh (e.g., from import modal)
  useEffect(() => {
    const onRefresh = () => handleSelectionUpdate()
    window.addEventListener('dwbg:refresh', onRefresh as unknown as EventListener)
    return () => window.removeEventListener('dwbg:refresh', onRefresh as unknown as EventListener)
  }, [handleSelectionUpdate])

  useEffect(() => {
    localStorage.setItem('dwbg:panelVisible', visible ? '1' : '0')
  }, [visible])

  useEffect(() => {
    localStorage.setItem('dwbg:panelWidth', String(panelWidth))
  }, [panelWidth])

  // reflect width to CSS var for grid column
  useEffect(() => {
    document.documentElement.style.setProperty('--dwbg-panel-width', `${panelWidth}px`)
  }, [panelWidth])

  // Theme apply
  useEffect(() => {
    localStorage.setItem('dwbg:theme', theme)
    localStorage.setItem('dwbg:customPrimary', customPrimary)
    const root = document.documentElement
    const classes = ['dwbg-theme-blue','dwbg-theme-green','dwbg-theme-purple','dwbg-theme-warm','dwbg-theme-dark']
    classes.forEach((c) => root.classList.remove(c))
    if (theme === 'custom') {
      applyCustomTheme(customPrimary)
    } else {
      root.classList.add(`dwbg-theme-${theme}`)
    }
  }, [theme, customPrimary])

  // Keyboard shortcut Cmd/Ctrl+Shift+M to toggle panel
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isToggle = (e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'm'
      if (isToggle) {
        e.preventDefault()
        setVisible((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Resize handling
  useEffect(() => {
    const el = resizeRef.current
    if (!el) return
    const onDown = (e: MouseEvent) => {
      draggingRef.current = true
      e.preventDefault()
    }
    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current) return
      const next = window.innerWidth - e.clientX
      setPanelWidth(Math.max(240, Math.min(640, next)))
    }
    const onUp = () => {
      draggingRef.current = false
    }
    el.addEventListener('mousedown', onDown)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      el.removeEventListener('mousedown', onDown)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  return (
    <div class="dwbg-container" data-bitable={isBitableAvailable() ? '1' : '0'}>
      {/* Main content placeholder; widget sits as right panel */}
      <div class="dwbg-main" />
      <div
        class="dwbg-resize-handle"
        ref={resizeRef}
        aria-label="resize"
        style={{ display: visible ? 'block' : 'none' }}
      />
      <PreviewPanel
        visible={visible}
        onToggleVisible={() => setVisible((v) => !v)}
        width={panelWidth}
        markdown={markdown}
        sourceMeta={sourceMeta}
        lastUpdatedAt={lastUpdatedAt}
        error={error}
        theme={theme}
        onChangeTheme={setTheme}
        onChangeCustomPrimary={setCustomPrimary}
      />
      {!visible && (
        <button class="dwbg-open-toggle" onClick={() => setVisible(true)} title="打开预览(⌘/Ctrl+Shift+M)">打开预览</button>
      )}
    </div>
  )
}
