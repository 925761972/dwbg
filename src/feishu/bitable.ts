// Minimal Feishu Bitable integration with safe fallbacks for local dev
// 使用 window.bitable（侧栏/插件环境可用）；不再强制引入 block SDK，避免“Block client only running in Block host”异常。

type Selection = { tableId?: string; recordId?: string; fieldId?: string }

declare global {
  interface Window {
    bitable?: any
    __mdOverride?: string
  }
}

function getBitable(): any | undefined {
  // 环境直接注入的 window.bitable（侧栏/插件环境）
  if (typeof window !== 'undefined' && (window as any).bitable) return (window as any).bitable
  return undefined
}

async function waitBitableReady(maxWaitMs = 3000): Promise<any | undefined> {
  const start = Date.now()
  // 轮询直到 window.bitable.base 可用或超时
  while (Date.now() - start < maxWaitMs) {
    const b = getBitable()
    if (b?.base) return b
    // 某些环境需要触发一次 bridge 调用以初始化
    try { if (b?.bridge?.getEnv) await Promise.resolve(b.bridge.getEnv()) } catch {}
    await new Promise((r) => setTimeout(r, 120))
  }
  return getBitable()
}

export function isBitableAvailable(): boolean {
  const b = getBitable()
  return !!b?.base
}

export function subscribeSelectionChange(handler: () => void): () => void {
  // 仅使用原生事件订阅，符合“点击哪个就显示哪个”的预期
  let off: (() => void) | null = null
  const init = async () => {
    const ready = await waitBitableReady()
    if (ready?.base) {
      off = ready.base.onSelectionChange(() => handler())
      // 初次加载触发一次
      handler()
    } else {
      // 未就绪：仍触发一次，显示“暂无选区”
      handler()
    }
  }
  init()
  return () => off?.()
}

function segToString(seg: any): string {
  if (seg == null) return ''
  if (typeof seg === 'string') return seg
  if (typeof seg === 'object') {
    // 常见富文本段的字段兜底
    const direct = (seg.text ?? seg.value ?? seg.content ?? seg.plain_text ?? seg.plainText)
    if (typeof direct === 'string') return direct
    // 嵌套结构，如 { textRun: { text: '...' } }
    for (const key of Object.keys(seg)) {
      const v = (seg as any)[key]
      if (typeof v === 'string') return v
      if (v && typeof v === 'object' && typeof (v as any).text === 'string') return (v as any).text
    }
    try { return JSON.stringify(seg) } catch { return String(seg) }
  }
  return String(seg)
}

function extractMarkdownFromCell(val: any): string {
  if (val == null) return ''
  if (typeof val === 'string') return val
  if (Array.isArray(val)) {
    // 处理富文本段数组：拼接常见字段
    return val.map((seg: any) => segToString(seg)).join('')
  }
  if (typeof val === 'object') {
    // Common field value wrapper in Bitable
    if ('text' in val && typeof val.text === 'string') return val.text
    if ('value' in val && typeof val.value === 'string') return val.value
    if ('elements' in val && Array.isArray((val as any).elements)) {
      return ((val as any).elements as any[]).map(segToString).join('')
    }
    try {
      return JSON.stringify(val)
    } catch {
      return String(val)
    }
  }
  return String(val)
}

export async function getSelectedCellMarkdown(): Promise<{ md: string; meta: Selection }> {
  // 用户在文档侧栏无法读取表格时，可以通过本地覆盖粘贴 Markdown
  try {
    const override = (localStorage.getItem('dwbg:mdOverride') || (window as any).__mdOverride || '').trim()
    if (override) {
      return { md: override, meta: {} }
    }
  } catch {}
  let b = getBitable()
  if (!b?.base) b = await waitBitableReady()
  if (!b?.base) {
    // 未就绪：严格模式下返回空，提示用户在多维表格页面使用
    return { md: '', meta: {} }
  }
  const selection = await b.base.getSelection()
  if (!selection || !(selection as any).recordId || !(selection as any).fieldId) {
    // 严格模式：没有选区或字段/记录缺失则不读取
    return { md: '', meta: selection as any }
  }
  const { tableId, recordId, fieldId } = selection as any
  const base = b.base
  const table = tableId ? await base.getTableById(tableId) : await base.getActiveTable()
  const val = await table.getCellValue(fieldId, recordId)
  const md = extractMarkdownFromCell(val)
  // 记录调试信息，供侧栏诊断面板查看
  try {
    const metaList = await table.getFieldMetaList()
    const fieldName = (metaList.find((f: any) => f.id === fieldId)?.name) || ''
    const debug = {
      selectedFieldId: (selection as any)?.fieldId,
      targetFieldId: fieldId,
      fieldName,
      valueType: Array.isArray(val) ? 'array' : typeof val,
      sample: Array.isArray(val) ? (val?.slice?.(0, 3) || []) : (typeof val === 'object' ? Object.keys(val).slice(0, 8) : String(val).slice(0, 120)),
      mdLength: (md || '').length,
    }
    localStorage.setItem('dwbg:lastDebug', JSON.stringify(debug))
  } catch {}
  return { md, meta: { tableId, recordId, fieldId } }
}

export async function getFieldList(): Promise<Array<{ id: string; name: string }>> {
  let b = getBitable()
  if (!b?.base) b = await waitBitableReady()
  if (!b?.base) {
    return [
      { id: 'content', name: '内容' },
      { id: 'notes', name: '备注' },
    ]
  }
  const base = b.base
  const table = await base.getActiveTable()
  const fields = await table.getFieldMetaList()
  return fields.map((f: any) => ({ id: f.id, name: f.name }))
}

export async function getRecordIds(): Promise<string[]> {
  let b = getBitable()
  if (!b?.base) b = await waitBitableReady()
  if (!b?.base) {
    const count = parseInt(localStorage.getItem('dwbg:recordCount') || '5')
    return Array.from({ length: count }).map((_, i) => String(i))
  }
  const base = b.base
  const table = await base.getActiveTable()
  const records = await table.getRecordIdList()
  return records
}

export async function selectRecordByIndex(index: number): Promise<void> {
  let b = getBitable()
  if (!b?.base) b = await waitBitableReady()
  if (!b?.base) {
    localStorage.setItem('dwbg:recordIndex', String(index))
    window.dispatchEvent(new Event('dwbg:refresh'))
    return
  }
  const base = b.base
  const table = await base.getActiveTable()
  const ids = await table.getRecordIdList()
  const id = ids[Math.max(0, Math.min(ids.length - 1, index))]
  const selection = await base.getSelection()
  await base.setSelection({ tableId: selection.tableId, recordId: id, fieldId: selection.fieldId })
}

export async function selectNextRecord(): Promise<void> {
  const ids = await getRecordIds()
  const idx = parseInt(localStorage.getItem('dwbg:recordIndex') || '0')
  const next = Math.min(ids.length - 1, idx + 1)
  await selectRecordByIndex(next)
}

export async function selectPrevRecord(): Promise<void> {
  const idx = parseInt(localStorage.getItem('dwbg:recordIndex') || '0')
  const prev = Math.max(0, idx - 1)
  await selectRecordByIndex(prev)
}

export async function setFieldId(fieldId: string): Promise<void> {
  // 仅持久化选择的字段，不改变表格当前选区，避免打断用户操作
  localStorage.setItem('dwbg:fieldId', fieldId)
  window.dispatchEvent(new Event('dwbg:refresh'))
}