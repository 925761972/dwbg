// Minimal Feishu Bitable integration with safe fallbacks for local dev

type Selection = { tableId?: string; recordId?: string; fieldId?: string }

declare global {
  interface Window {
    bitable?: any
    __mdOverride?: string
  }
}

export function isBitableAvailable(): boolean {
  return typeof window.bitable !== 'undefined' && !!window.bitable?.base
}

export function subscribeSelectionChange(handler: () => void): () => void {
  if (isBitableAvailable()) {
    const off = window.bitable.base.onSelectionChange(handler)
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
  if (!isBitableAvailable()) {
    // local dev: return placeholder text to preview UI
    const idx = parseInt(localStorage.getItem('dwbg:recordIndex') || '0')
    const fieldId = localStorage.getItem('dwbg:fieldId') || 'content'
    const md = sampleMarkdown(idx, fieldId)
    return { md, meta: { recordId: String(idx), fieldId } }
  }
  const selection = await window.bitable.base.getSelection()
  if (!selection) return { md: '', meta: {} }

  const { tableId, recordId } = selection
  const base = window.bitable.base
  const table = await base.getTableById(tableId)

  // 优先使用选中的字段，其次使用用户在 FieldSelector 选择的字段，最后使用候选字段名称匹配
  let targetFieldId = selection.fieldId || localStorage.getItem('dwbg:fieldId') || ''
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
  if (!isBitableAvailable()) {
    return [
      { id: 'content', name: '内容' },
      { id: 'notes', name: '备注' },
    ]
  }
  const base = window.bitable.base
  const table = await base.getActiveTable()
  const fields = await table.getFieldMetaList()
  return fields.map((f: any) => ({ id: f.id, name: f.name }))
}

export async function getRecordIds(): Promise<string[]> {
  if (!isBitableAvailable()) {
    const count = parseInt(localStorage.getItem('dwbg:recordCount') || '5')
    return Array.from({ length: count }).map((_, i) => String(i))
  }
  const base = window.bitable.base
  const table = await base.getActiveTable()
  const records = await table.getRecordIdList()
  return records
}

export async function selectRecordByIndex(index: number): Promise<void> {
  if (!isBitableAvailable()) {
    localStorage.setItem('dwbg:recordIndex', String(index))
    window.dispatchEvent(new Event('dwbg:refresh'))
    return
  }
  const base = window.bitable.base
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
  if (!isBitableAvailable()) {
    localStorage.setItem('dwbg:fieldId', fieldId)
    window.dispatchEvent(new Event('dwbg:refresh'))
    return
  }
  const base = window.bitable.base
  const selection = await base.getSelection()
  await base.setSelection({ tableId: selection.tableId, recordId: selection.recordId, fieldId })
}

function sampleMarkdown(idx: number, fieldId: string): string {
  if (fieldId === 'notes') {
    return `### 记录 ${idx} 备注\n\n- 这是备注内容示例\n- 条目 ${idx}`
  }
  return `# 记录 ${idx}\n\n- 列表项 A\n- 列表项 B\n\n| 字段 | 值 |\n| --- | --- |\n| id | ${idx} |`
}