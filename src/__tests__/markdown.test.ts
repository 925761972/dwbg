import { describe, it, expect } from 'vitest'
import { parseMarkdownLight, sanitizeHtml } from '../utils/markdown'

describe('markdown parsing', () => {
  it('parses basic markdown and sanitizes scripts', () => {
    const md = `# Title\n\n<script>alert(1)</script>\n**bold**`
    const { html } = parseMarkdownLight(md)
    const safe = sanitizeHtml(html)
    expect(safe).toContain('<h1')
    expect(safe).toContain('<strong>bold</strong>')
    expect(safe).not.toContain('<script')
  })
})