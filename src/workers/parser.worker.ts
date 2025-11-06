// Web worker: heavy markdown parsing
import { marked } from 'marked'
import hljs from 'highlight.js'

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

type Req = { markdown: string }
type Res = { html: string; tokens: any[]; parseTime: number }

self.addEventListener('message', (e: MessageEvent<Req>) => {
  const md = e.data.markdown || ''
  const t0 = performance.now()
  const tokens = marked.lexer(md)
  const html = marked.parser(tokens)
  const t1 = performance.now()
  const res: Res = { html, tokens, parseTime: Math.round(t1 - t0) }
  ;(self as any).postMessage(res)
})