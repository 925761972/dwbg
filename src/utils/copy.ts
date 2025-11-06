export async function copyHtmlToClipboard(html: string) {
  if (!html) return
  const blob = new Blob([html], { type: 'text/html' })
  const data = [new ClipboardItem({ 'text/html': blob })]
  try {
    await navigator.clipboard.write(data)
  } catch {
    // fallback: plain text
    await navigator.clipboard.writeText(html)
  }
}