function clamp01(v: number) {
  return Math.min(1, Math.max(0, v))
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const h = hex.replace('#', '')
  if (h.length !== 6) return null
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return { r, g, b }
}

function rgbToHex(r: number, g: number, b: number): string {
  const to = (n: number) => n.toString(16).padStart(2, '0')
  return `#${to(Math.round(nClamp(nClamp(r))))}${to(Math.round(nClamp(nClamp(g))))}${to(Math.round(nClamp(nClamp(b))))}`
}

function nClamp(v: number) { return Math.min(255, Math.max(0, v)) }

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      case b: h = (r - g) / d + 4; break
    }
    h /= 6
  }
  return { h, s, l }
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  let r: number, g: number, b: number
  if (s === 0) { r = g = b = l; }
  else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1/6) return p + (q - p) * 6 * t
      if (t < 1/2) return q
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
      return p
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1/3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1/3)
  }
  return { r: r * 255, g: g * 255, b: b * 255 }
}

export function lightenHex(hex: string, amount: number): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
  const l = clamp01(hsl.l + amount)
  const out = hslToRgb(hsl.h, hsl.s, l)
  return rgbToHex(out.r, out.g, out.b)
}

export function applyCustomTheme(primary: string) {
  try {
    const p = primary || '#2fb888'
    const a1 = lightenHex(p, 0.08)
    const a2 = lightenHex(p, 0.28)
    const root = document.documentElement
    root.style.setProperty('--dwbg-primary', p)
    root.style.setProperty('--dwbg-accent-1', a1)
    root.style.setProperty('--dwbg-accent-2', a2)
  } catch {}
}