import { marked } from 'marked'
import hljs from 'highlight.js'
import DOMPurify from 'dompurify'

marked.setOptions({ gfm: true, breaks: false })
marked.use({
  renderer: {
    code(this: any, token: any) {
      const lang = (token?.lang || '').trim()
      const codeText: string = token?.text || ''
      const html = lang && hljs.getLanguage(lang)
        ? hljs.highlight(codeText, { language: lang }).value
        : hljs.highlightAuto(codeText).value
      const cls = lang ? ` class="hljs language-${lang}"` : ' class="hljs"'
      return `<pre><code${cls}>${html}</code></pre>`
    },
  },
})

export function parseMarkdownLight(md: string): { html: string; tokens: any[] } {
  if (!md) return { html: '', tokens: [] }
  const tokens = marked.lexer(md)
  const html = marked.parser(tokens)
  return { html, tokens }
}

export function sanitizeHtml(html: string): string {
  if (!html) return ''
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } })
}