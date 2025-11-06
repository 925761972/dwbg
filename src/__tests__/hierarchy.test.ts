import { describe, it, expect } from 'vitest'
import { marked } from 'marked'
import { buildHierarchy, type HierNode } from '../utils/hierarchy'

describe('hierarchy builder', () => {
  it('builds nodes from headings and lists', () => {
    const md = `# A\n\n## B\n\nText\n\n- i1\n- i2\n\n### C`
    const tokens = marked.lexer(md)
    const nodes = buildHierarchy(tokens)
    expect(nodes[0].type).toBe('heading')
    expect(nodes[0].children?.[0]?.type).toBe('heading')
    const hasList = (arr: HierNode[]): boolean =>
      arr.some((n) => n.type === 'list' || (n.children && hasList(n.children)))
    expect(hasList(nodes)).toBe(true)
  })
})