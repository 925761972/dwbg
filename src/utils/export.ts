export function exportHtml(html: string, filename = 'preview.html') {
  const blob = new Blob([`<!doctype html><meta charset="utf-8">${html}`], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function exportMarkdown(md: string, filename = 'content.md') {
  const blob = new Blob([md || ''], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export async function exportPng(element: HTMLElement, filename = 'preview.png', opts?: { textOnly?: boolean }) {
  // 使用 scroll 尺寸导出整页内容
  const width = element.scrollWidth || element.clientWidth || element.offsetWidth
  const height = element.scrollHeight || element.clientHeight || element.offsetHeight

  const clone = element.cloneNode(true) as HTMLElement
  const wrapper = document.createElement('div')
  wrapper.style.width = `${width}px`
  wrapper.style.height = `${height}px`
  wrapper.style.background = 'white'
  wrapper.appendChild(clone)

  // Inline images and CSS background images to avoid canvas taint
  const toDataUrl = async (url: string) => {
    const tryFetch = async (u: string) => {
      const res = await fetch(u, { mode: 'cors' })
      if (!res.ok) throw new Error(`fetch ${u} failed: ${res.status}`)
      const blob = await res.blob()
      return await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.readAsDataURL(blob)
      })
    }
    try {
      return await tryFetch(url)
    } catch {
      // 通过公共图片代理服务兜底，便于开发环境内联跨域图片
      const proxied = `https://images.weserv.nl/?url=${encodeURIComponent(url)}`
      return await tryFetch(proxied)
    }
  }

  const inlineResources = async (root: HTMLElement) => {
    // inline <img>
    const imgs = Array.from(root.querySelectorAll('img')) as HTMLImageElement[]
    for (const img of imgs) {
      const src = img.getAttribute('src') || ''
      if (!src || src.startsWith('data:')) continue
      try {
        img.setAttribute('crossorigin', 'anonymous')
        const data = await toDataUrl(src)
        img.src = data
      } catch {
        // 如果跨域无法获取，降级为空占位避免污染画布
        img.removeAttribute('src')
      }
    }
    // inline CSS background-image
    const all = Array.from(root.querySelectorAll('*')) as HTMLElement[]
    for (const el of all) {
      const style = window.getComputedStyle(el)
      const bgImg = style.backgroundImage || ''
      const match = bgImg.match(/url\(["']?(.*?)["']?\)/)
      const url = match?.[1]
      if (url && !url.startsWith('data:')) {
        try {
          const data = await toDataUrl(url)
          const newStyle = (el.getAttribute('style') || '') + `background-image:url(${data});`
          el.setAttribute('style', newStyle)
        } catch {
          // 移除可能污染画布的背景图
          const newStyle = (el.getAttribute('style') || '') + 'background-image:none;'
          el.setAttribute('style', newStyle)
        }
      }
    }
  }

  if (opts?.textOnly) {
    // 去除所有图片与背景，保证纯文本导出
    const imgs = Array.from(wrapper.querySelectorAll('img'))
    imgs.forEach((img) => img.parentElement?.removeChild(img))
    const all = Array.from(wrapper.querySelectorAll('*')) as HTMLElement[]
    all.forEach((el) => el.setAttribute('style', ((el.getAttribute('style') || '') + 'background-image:none;'))) 
  } else {
    await inlineResources(wrapper)
  }

  // Inline computed styles to reduce对外部CSS依赖
  const inlineComputedStyles = (src: Element, dest: Element) => {
    const style = window.getComputedStyle(src as HTMLElement)
    let cssText = ''
    for (const prop of Array.from(style)) {
      cssText += `${prop}:${style.getPropertyValue(prop)};`
    }
    (dest as HTMLElement).setAttribute('style', ((dest as HTMLElement).getAttribute('style') || '') + cssText)
    const srcChildren = Array.from(src.children)
    const destChildren = Array.from(dest.children)
    for (let i = 0; i < srcChildren.length; i++) inlineComputedStyles(srcChildren[i], destChildren[i])
  }
  inlineComputedStyles(element, clone)

  const serialized = new XMLSerializer().serializeToString(wrapper)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject width="100%" height="100%">${serialized}</foreignObject></svg>`
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  const img = new Image()
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = (e) => reject(e)
    img.src = url
  })

  const ratio = Math.max(1, Math.floor(window.devicePixelRatio || 1))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, width * ratio)
  canvas.height = Math.max(1, height * ratio)
  const ctx = canvas.getContext('2d')!
  ctx.scale(ratio, ratio)
  ctx.drawImage(img, 0, 0)
  URL.revokeObjectURL(url)

  try {
    const dataUrl = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
  } catch (e) {
    // 先尝试纯文本导出一次（移除图片与背景）
    if (!opts?.textOnly) {
      return await exportPng(element, filename, { textOnly: true })
    }
    // 如果仍然因为跨域污染失败，降级导出为 SVG
    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject width="100%" height="100%">${new XMLSerializer().serializeToString(wrapper)}</foreignObject></svg>`
    const svgBlob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' })
    const url2 = URL.createObjectURL(svgBlob)
    const a2 = document.createElement('a')
    a2.href = url2
    a2.download = filename.replace(/\.png$/i, '.svg')
    document.body.appendChild(a2)
    a2.click()
    a2.remove()
    URL.revokeObjectURL(url2)
    console.warn('PNG 导出失败（跨域资源导致画布污染），已降级为 SVG 导出。')
  }
}


