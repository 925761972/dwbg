export function debounce<T extends (...args: any[]) => any>(fn: T, wait = 200) {
  let timer: number | null = null
  return (...args: Parameters<T>) => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    timer = window.setTimeout(() => {
      fn(...args)
    }, wait)
  }
}