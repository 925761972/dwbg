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
  const b = getBitable()
  // 若已经就绪，直接订阅
  if (b?.base) {
    const off = b.base.onSelectionChange(() => handler())
    return () => off?.()
  }
  // 未就绪：先轮询，待就绪后切换到原生订阅
  let offFn: (() => void) | null = null
  const interval = window.setInterval(async () => {
    handler()
    const ready = await waitBitableReady(0)
    if (ready?.base && !offFn) {
      offFn = ready.base.onSelectionChange(() => handler())
      clearInterval(interval)
    }
  }, 500)
  return () => { clearInterval(interval); offFn?.() }
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
    // local dev / 未就绪超时：返回占位文本
    const idx = parseInt(localStorage.getItem('dwbg:recordIndex') || '0')
    const fieldId = localStorage.getItem('dwbg:fieldId') || 'content'
    const md = sampleMarkdown(idx, fieldId)
    return { md, meta: { recordId: String(idx), fieldId } }
  }
  const selection = await b.base.getSelection()
  if (!selection) return { md: '', meta: {} }

  const { tableId, recordId, fieldId: selectedFieldId } = selection as any
  const base = b.base
  const table = tableId ? await base.getTableById(tableId) : await base.getActiveTable()

  // 改为：优先使用用户在 FieldSelector 选择的字段；若未设置，按候选字段名称匹配；最后兜底为第一个字段。
  // 优先级：1) 用户在 FieldSelector 指定的字段；2) 当前选中的字段；3) 候选名称；4) 第一个字段
  let targetFieldId = localStorage.getItem('dwbg:fieldId') || ''
  if (!targetFieldId) targetFieldId = selectedFieldId || ''
  if (!targetFieldId) {
    const metaList = await table.getFieldMetaList()
    const nameCandidates = ['content', '内容', '任务描述', '描述', '备注', 'Markdown', 'markdown']
    const found = metaList.find((f: any) => nameCandidates.includes((f?.name || '').trim()))
    targetFieldId = found?.id || metaList?.[0]?.id || ''
  }

  if (!targetFieldId) return { md: '', meta: { tableId, recordId } }
  const val = await table.getCellValue(targetFieldId, recordId)
  const md = extractMarkdownFromCell(val)
  // 记录调试信息，供侧栏诊断面板查看
  try {
    const metaList = await table.getFieldMetaList()
    const fieldName = (metaList.find((f: any) => f.id === targetFieldId)?.name) || ''
    const debug = {
      selectedFieldId,
      targetFieldId,
      fieldName,
      valueType: Array.isArray(val) ? 'array' : typeof val,
      sample: Array.isArray(val) ? (val?.slice?.(0, 3) || []) : (typeof val === 'object' ? Object.keys(val).slice(0, 8) : String(val).slice(0, 120)),
      mdLength: (md || '').length,
    }
    localStorage.setItem('dwbg:lastDebug', JSON.stringify(debug))
  } catch {}
  return { md, meta: { tableId, recordId, fieldId: targetFieldId } }
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

function sampleMarkdown(idx: number, fieldId: string): string {
  if (fieldId === 'notes') {
    return `### 记录 ${idx} 备注\n\n- 这是备注内容示例\n- 条目 ${idx}`
  }
  return `# 记录 ${idx}\n\n- 列表项 A\n- 列表项 B\n\n| 字段 | 值 |\n| --- | --- |\n| id | ${idx} |`
}