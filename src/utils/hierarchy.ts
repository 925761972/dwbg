export type HierNode = {
  id: string
  type: 'heading' | 'list' | 'list_item' | 'table' | 'code' | 'paragraph' | 'blockquote'
  level?: number
  text: string
  children?: HierNode[]
}

function uid() {
  return Math.random().toString(36).slice(2)
}

// Build a hierarchy from marked tokens focusing on headings and nested lists
export function buildHierarchy(tokens: any[]): HierNode[] {
  const roots: HierNode[] = []
  const stack: { node: HierNode; level: number }[] = []
  const pushNode = (node: HierNode) => {
    if (node.type === 'heading' && node.level) {
      // pop until stack top level < node.level
      while (stack.length && (stack[stack.length - 1].level >= node.level!)) {
        stack.pop()
      }
      if (stack.length) {
        const parent = stack[stack.length - 1].node
        parent.children = parent.children || []
        parent.children.push(node)
      } else {
        roots.push(node)
      }
      stack.push({ node, level: node.level! })
    } else {
      if (stack.length) {
        const parent = stack[stack.length - 1].node
        parent.children = parent.children || []
        parent.children.push(node)
      } else {
        roots.push(node)
      }
    }
  }

  for (const t of tokens || []) {
    if (t.type === 'heading') {
      pushNode({ id: uid(), type: 'heading', level: t.depth, text: t.text })
    } else if (t.type === 'list') {
      const listNode: HierNode = { id: uid(), type: 'list', text: '列表' }
      pushNode(listNode)
      for (const it of t.items || t.tokens || []) {
        const text = it.text || (it.tokens ? it.tokens.map((x: any) => x.raw || x.text || '').join('') : '')
        listNode.children = listNode.children || []
        listNode.children.push({ id: uid(), type: 'list_item', text })
      }
    } else if (t.type === 'table') {
      pushNode({ id: uid(), type: 'table', text: '表格' })
    } else if (t.type === 'code') {
      const text = (t.lang ? `[${t.lang}] ` : '') + (t.text?.slice(0, 60) || '')
      pushNode({ id: uid(), type: 'code', text })
    } else if (t.type === 'blockquote') {
      pushNode({ id: uid(), type: 'blockquote', text: '引用' })
    } else if (t.type === 'paragraph') {
      const txt = (t.text || '').slice(0, 80)
      pushNode({ id: uid(), type: 'paragraph', text: txt })
    }
  }

  return roots
}