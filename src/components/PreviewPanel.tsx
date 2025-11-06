import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { sanitizeHtml } from '../utils/markdown.ts'
import ParserWorker from '../workers/parser.worker?worker'
import { buildHierarchy, type HierNode } from '../utils/hierarchy.ts'
import { copyHtmlToClipboard } from '../utils/copy.ts'
import { IconCopy, IconEye, IconEyeOff, IconUpload, IconTrash, IconPalette } from '../icons'
import { replaceEmojiShortcodes, EMOJI_LIST } from '../utils/emoji.ts'
import { isPro } from '../utils/license'
import { exportHtml, exportMarkdown } from '../utils/export'
import { ProModal } from './ProModal'
import { askAI } from '../utils/ai'
import { RecordNavigator } from './RecordNavigator'
import { FieldSelector } from './FieldSelector'

type Props = {
  visible: boolean
  onToggleVisible: () => void
  width: number
  markdown: string
  sourceMeta: { tableId?: string; recordId?: string; fieldId?: string } | null
  lastUpdatedAt: number
  error: string | null
  theme?: string
  onChangeTheme?: (theme: string) => void
  onChangeCustomPrimary?: (hex: string) => void
}

type ParseResult = { html: string; tokens: any[]; parseTime: number }

export function PreviewPanel(props: Props) {
  const { visible, onToggleVisible, width, markdown, sourceMeta, lastUpdatedAt, error, theme = 'blue', onChangeTheme, onChangeCustomPrimary } = props
  const [html, setHtml] = useState<string>('')
  const [hier, setHier] = useState<HierNode[]>([])
  const [parseTime, setParseTime] = useState<number>(0)
  const [renderTime, setRenderTime] = useState<number>(0)
  const [activeTab, setActiveTab] = useState<'preview' | 'structure'>('preview')
  const [mode, setMode] = useState<'render' | 'ai'>('render')
  const [aiLoading, setAiLoading] = useState<boolean>(false)
  const [aiAnswer, setAiAnswer] = useState<string>('')
  const [aiQuestion, setAiQuestion] = useState<string>('')
  const [expandAll, setExpandAll] = useState<boolean>(true)
  const [expandKey, setExpandKey] = useState<number>(0)
  const [importOpen, setImportOpen] = useState<boolean>(false)
  const [importText, setImportText] = useState<string>('')
  const [appearanceOpen, setAppearanceOpen] = useState<boolean>(false)
  const [proOpen, setProOpen] = useState<boolean>(false)
  const workerRef = useRef<Worker | null>(null)
  const panelRef = useRef<HTMLElement>(null)

  // init worker
  useEffect(() => {
    workerRef.current = new ParserWorker()
    const w = workerRef.current
    const onMsg = (e: MessageEvent<ParseResult>) => {
      const t0 = performance.now()
      const sanitized = sanitizeHtml(e.data.html)
      setHtml(sanitized)
      setParseTime(e.data.parseTime)
      setHier(buildHierarchy(e.data.tokens))
      const t1 = performance.now()
      setRenderTime(Math.round(t1 - t0))
    }
    w.addEventListener('message', onMsg)
    return () => {
      w.removeEventListener('message', onMsg)
      w.terminate()
      workerRef.current = null
    }
  }, [])

  // parse when markdown changes
  useEffect(() => {
    const t0 = performance.now()
    const heavy = markdown && markdown.length > 8000
    const mdPrepared = replaceEmojiShortcodes(markdown)
    if (workerRef.current && heavy) {
      workerRef.current.postMessage({ markdown: mdPrepared })
      return
    }
    // light path: parse in main thread using marked
    import('../utils/markdown.ts').then(({ parseMarkdownLight }) => {
      const { html, tokens } = parseMarkdownLight(mdPrepared)
      const sanitized = sanitizeHtml(html)
      setHtml(sanitized)
      setHier(buildHierarchy(tokens))
      const t1 = performance.now()
      setParseTime(Math.round(t1 - t0))
      setRenderTime(0)
    })
  }, [markdown, lastUpdatedAt])

  const metaText = useMemo(() => {
    if (!sourceMeta) return '未检测到单元格选择'
    const { tableId, recordId, fieldId } = sourceMeta
    return `表 ${tableId || '-'} | 记录 ${recordId || '-'} | 字段 ${fieldId || '-'}`
  }, [sourceMeta])

  const onCopy = async () => {
    await copyHtmlToClipboard(html)
  }

  return (
    <aside ref={panelRef as any} class={`dwbg-panel`} style={{ width: `${width}px`, display: visible ? 'block' : 'none' }}>
      <div class="dwbg-panel__header">
        <div class="dwbg-panel__title">Markdown 结构化预览</div>
        <div class="dwbg-panel__actions" />
      </div>
      {appearanceOpen && (
        <div class="dwbg-modal" role="dialog" aria-modal="true">
          <div class="dwbg-modal__content">
            <div class="dwbg-modal__header">主题与配色</div>
            <div class="dwbg-modal__body">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <label style={{ color: 'var(--dwbg-subtext)' }}>主题</label>
                <select
                  class="dwbg-btn"
                  style={{ padding: '4px 6px' }}
                  value={theme}
                  onChange={(e) => onChangeTheme?.((e.target as HTMLSelectElement).value)}
                  title="主题配色"
                >
                  <option value="blue">蓝色</option>
                  <option value="green">绿色</option>
                  <option value="purple">紫色</option>
                  <option value="warm">暖色</option>
                  <option value="dark">深色</option>
                  <option value="custom">自定义</option>
                </select>
                {theme === 'custom' && (
                  <>
                    <input
                      type="color"
                      class="dwbg-btn"
                      style={{ padding: '3px', width: '40px', height: '28px' }}
                      onInput={(e) => {
                        if (!isPro()) { setProOpen(true); return }
                        onChangeCustomPrimary?.((e.target as HTMLInputElement).value)
                      }}
                      title="选择主色"
                    />
                    <button class="dwbg-btn" title="绿色预设" onClick={() => { if (!isPro()) { setProOpen(true); return } onChangeCustomPrimary?.('#2fb888') }}>绿色</button>
                    <button class="dwbg-btn" title="粉色预设" onClick={() => { if (!isPro()) { setProOpen(true); return } onChangeCustomPrimary?.('#ff69b4') }}>粉色</button>
                  </>
                )}
              </div>
            </div>
            <div class="dwbg-modal__footer">
              <button class="dwbg-btn" onClick={() => setAppearanceOpen(false)}>关闭</button>
            </div>
          </div>
        </div>
      )}
      {proOpen && <ProModal onClose={() => { setProOpen(false); window.dispatchEvent(new Event('dwbg:refresh')) }} />}
      <div class="dwbg-panel__meta">
        <span class="dwbg-meta">{metaText}</span>
        <span class="dwbg-meta">解析 {parseTime}ms{renderTime ? ` / 渲染 ${renderTime}ms` : ''}</span>
      </div>
      <div class="dwbg-control-bar">
        <button class="dwbg-btn dwbg-btn--sm" title="复制格式化内容" onClick={onCopy}><IconCopy /> 复制</button>
        <button class="dwbg-btn dwbg-btn--sm" title="显示/隐藏 (⌘/Ctrl+Shift+M)" onClick={onToggleVisible}>{visible ? (<><IconEyeOff /> 隐藏</>) : (<><IconEye /> 显示</>)}</button>
        <button class="dwbg-btn dwbg-btn--sm" title="导出HTML (Pro)" onClick={() => { if (!isPro()) { setProOpen(true); return } exportHtml(html) }}>导出HTML</button>
        <button
          class="dwbg-btn dwbg-btn--sm"
          title="导入测试 Markdown（本地覆盖）"
          onClick={() => {
            const existing = (localStorage.getItem('dwbg:mdOverride') || '')
            setImportText(existing)
            setImportOpen(true)
          }}
        >
          <IconUpload /> 导入Markdown
        </button>
        <button
          class="dwbg-btn dwbg-btn--sm"
          title="清除本地覆盖"
          onClick={() => {
            localStorage.removeItem('dwbg:mdOverride')
            ;(window as any).__mdOverride = ''
            window.dispatchEvent(new Event('dwbg:refresh'))
          }}
        >
          <IconTrash /> 清除覆盖
        </button>
        <button class="dwbg-btn dwbg-btn--sm" title="主题与配色" onClick={() => setAppearanceOpen(true)}>
          <IconPalette /> 主题
        </button>
        <RecordNavigator />
        <FieldSelector />
        <span class="dwbg-control-spacer" />
        {activeTab === 'structure' && (
          <>
            <button
              class="dwbg-btn dwbg-btn--sm"
              title="全部展开"
              onClick={() => {
                setExpandAll(true)
                setExpandKey((k) => k + 1)
              }}
            >
              全部展开
            </button>
            <button
              class="dwbg-btn dwbg-btn--sm"
              title="全部折叠"
              onClick={() => {
                setExpandAll(false)
                setExpandKey((k) => k + 1)
              }}
            >
              全部折叠
            </button>
          </>
        )}
      </div>
      <div class="dwbg-panel__tabs">
        <button class={`dwbg-tab ${mode === 'render' ? 'is-active' : ''}`} onClick={() => { setMode('render'); setActiveTab('preview') }}>预览模式</button>
        <button class={`dwbg-tab ${mode === 'ai' ? 'is-active' : ''}`} onClick={() => setMode('ai')}>AI问答模式</button>
        {mode === 'render' && (
          <>
            <button class={`dwbg-tab ${activeTab === 'structure' ? 'is-active' : ''}`} onClick={() => setActiveTab('structure')}>结构</button>
          </>
        )}
      </div>
      {error && <div class="dwbg-error">{error}</div>}
      <div class="dwbg-panel__content">
        {mode === 'render' ? (
          activeTab === 'preview' ? (
            <div class="dwbg-markdown" dangerouslySetInnerHTML={{ __html: html }} />
          ) : (
            <StructureView nodes={hier} expandAll={expandAll} expandKey={expandKey} />
          )
        ) : (
          <AIView
            loading={aiLoading}
            question={aiQuestion}
            answer={aiAnswer}
            onAsk={async (q) => {
              setAiQuestion(q)
              setAiLoading(true)
              const res = await askAI(q || '请总结当前记录')
              setAiAnswer(res.answer)
              setAiLoading(false)
            }}
          />
        )}
      </div>
      {importOpen && (
        <div class="dwbg-modal" role="dialog" aria-modal="true">
          <div class="dwbg-modal__content">
            <div class="dwbg-modal__header">导入测试 Markdown（本地覆盖）</div>
            <div class="dwbg-modal__body">
              <textarea
                class="dwbg-textarea"
                value={importText}
                onInput={(e) => setImportText((e.target as HTMLTextAreaElement).value)}
                placeholder="在此粘贴你的 Markdown 文本"
              />
              <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {EMOJI_LIST.map((e: { name: string; char: string }) => (
                  <button
                    key={e.name}
                    class="dwbg-btn"
                    title={`:${e.name}:`}
                    onClick={() => {
                      setImportText((t) => (t || '') + ' ' + e.char)
                    }}
                  >
                    {e.char}
                  </button>
                ))}
              </div>
            </div>
            <div class="dwbg-modal__footer">
              <button class="dwbg-btn" onClick={() => setImportOpen(false)}>取消</button>
              <button
                class="dwbg-btn"
                onClick={() => {
                  localStorage.setItem('dwbg:mdOverride', importText || '')
                  ;(window as any).__mdOverride = importText || ''
                  setImportOpen(false)
                  window.dispatchEvent(new Event('dwbg:refresh'))
                }}
              >
                确定导入
              </button>
              <button class="dwbg-btn" title="导出MD (Pro)" onClick={() => { if (!isPro()) { setProOpen(true); return } exportMarkdown(importText || markdown) }}>导出MD</button>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}

function StructureView({ nodes, expandAll, expandKey }: { nodes: HierNode[]; expandAll: boolean; expandKey: number }) {
  return (
    <div class="dwbg-structure">
      {nodes.length === 0 && <div class="dwbg-empty">无结构化内容（请使用标题、列表等）</div>}
      {nodes.map((n: HierNode) => (
        <StructNode key={n.id} node={n} depth={0} expandAll={expandAll} expandKey={expandKey} />
      ))}
    </div>
  )
}

function AIView({ loading, question, answer, onAsk }: { loading: boolean; question: string; answer: string; onAsk: (q: string) => void }) {
  return (
    <div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
        <input
          type="text"
          value={question}
          onInput={(e) => setTimeout(() => onAsk((e.target as HTMLInputElement).value), 0)}
          placeholder="输入你的问题（本地为示例回答）"
          style={{ flex: 1 }}
        />
        <button class="dwbg-btn" onClick={() => onAsk(question)}>询问</button>
      </div>
      {loading ? (
        <div class="dwbg-empty">AI 正在思考...</div>
      ) : (
        <div class="dwbg-markdown" dangerouslySetInnerHTML={{ __html: sanitizeHtml(answer) }} />
      )}
    </div>
  )
}

function StructNode({ node, depth, expandAll, expandKey }: { node: HierNode; depth: number; expandAll: boolean; expandKey: number }) {
  const [open, setOpen] = useState(true)
  useEffect(() => {
    setOpen(expandAll)
  }, [expandKey, expandAll])
  return (
    <div class="dwbg-struct-node" style={{ marginLeft: `${depth * 12}px` }}>
      <div class="dwbg-struct-row">
        <button class="dwbg-collapse" onClick={() => setOpen((o) => !o)}>{open ? '▾' : '▸'}</button>
        <span class={`dwbg-struct-type type-${node.type}`}>{node.type}</span>
        <span class="dwbg-struct-text">{node.text}</span>
      </div>
      {open && node.children?.length ? (
        <div class="dwbg-struct-children">
          {node.children!.map((c: HierNode) => (
            <StructNode key={c.id} node={c} depth={depth + 1} expandAll={expandAll} expandKey={expandKey} />
          ))}
        </div>
      ) : null}
    </div>
  )
}