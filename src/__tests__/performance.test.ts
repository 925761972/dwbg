import { describe, it, expect } from 'vitest'
import { parseMarkdownLight } from '../utils/markdown'

function bigMd(len = 10000): string {
  const base = '# Title\n\n' + 'Paragraph text '.repeat(20) + '\n\n' +
    '```ts\n' + 'const x = 1; '.repeat(50) + '\n```\n\n' +
    '| A | B |\n| --- | --- |\n| 1 | 2 |\n\n'
  const times = Math.ceil(len / base.length)
  return Array(times).fill(base).join('')
}

describe('performance', () => {
  it('parses 10k+ chars quickly', () => {
    const md = bigMd(12000)
    const t0 = performance.now()
    const { html } = parseMarkdownLight(md)
    const t1 = performance.now()
    const dt = t1 - t0
    expect(html.length).toBeGreaterThan(1000)
    // target <200ms; allow some buffer in CI
    expect(dt).toBeLessThan(300)
  })
})