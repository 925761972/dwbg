// Minimal Feishu Bitable integration with safe fallbacks for local dev
// Prefer official SDK handshake; fallback to window.bitable when unavailable

import { bitable as sdkBitable } from '@lark-opdev/block-bitable-api'

type Selection = { tableId?: string; recordId?: string; fieldId?: string }

declare global {
  interface Window {
    bitable?: any
    __mdOverride?: string
  }
}

function getBitable(): any | undefined {
  // SDK 提供的 bitable（推荐）
  if (sdkBitable && sdkBitable.base) return sdkBitable
  // 环境直接注入的 window.bitable（回退）
  if (typeof window !== 'undefined' && (window as any).bitable?.base) return (window as any).bitable
  return undefined
}

export function isBitableAvailable(): boolean {
  const b = getBitable()
  return !!b?.base
}

export function subscribeSelectionChange(handler: () => void): () => void {
  const b = getBitable()
  if (b?.base) {
    const off = b.base.onSelectionChange(handler)
    return () => off?.()
  }
  // local dev: simulate no-op
  const interval = window.setInterval(handler, 2000)
  return () => clearInterval(interval)
}

function extractMarkdownFromCell(val: any): string {
  if (val == null) return ''
  if (typeof val === 'string') return val
  if (Array.isArray(val)) return val.map((v) => (typeof v === 'string' ? v : JSON.stringify(v))).join('\n')
  if (typeof val === 'object') {
    // Common field value wrapper in Bitable
    if ('text' in val && typeof val.text === 'string') return val.text
    if ('value' in val && typeof val.value === 'string') return val.value
    try {
      return JSON.stringify(val)
    } catch {
      return String(val)
    }
  }
  return String(val)
}

export async function getSelectedCellMarkdown(): Promise<{ md: string; meta: Selection }> {
  const b = getBitable()
  if (!b?.base) {
    // local dev: return placeholder text to preview UI
    const idx = parseInt(localStorage.getItem('dwbg:recordIndex') || '0')
    const fieldId = localStorage.getItem('dwbg:fieldId') || 'content'
    const md = sampleMarkdown(idx, fieldId)
    return { md, meta: { recordId: String(idx), fieldId } }
  }
  const selection = await b.base.getSelection()
  if (!selection) return { md: '', meta: {} }

  const { tableId, recordId } = selection
  const base = b.base
  const table = await base.getTableById(tableId)

  // 改为：优先使用用户在 FieldSelector 选择的字段；若未设置，按候选字段名称匹配；最后兜底为第一个字段。
  // 不再优先使用当前选中的字段，避免用户点击了其他列导致预览为空。
  let targetFieldId = localStorage.getItem('dwbg:fieldId') || ''
  if (!targetFieldId) {
    const metaList = await table.getFieldMetaList()
    const nameCandidates = ['content', '内容', '任务描述', '描述', '备注', 'Markdown', 'markdown']
    const found = metaList.find((f: any) => nameCandidates.includes((f?.name || '').trim()))
    targetFieldId = found?.id || metaList?.[0]?.id || ''
  }

  if (!targetFieldId) return { md: '', meta: { tableId, recordId } }
  const val = await table.getCellValue(targetFieldId, recordId)
  const md = extractMarkdownFromCell(val)
  return { md, meta: { tableId, recordId, fieldId: targetFieldId } }
}

export async function getFieldList(): Promise<Array<{ id: string; name: string }>> {
  const b = getBitable()
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
  const b = getBitable()
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
  const b = getBitable()
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