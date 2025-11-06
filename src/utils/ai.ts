// AI 问答服务适配层（可替换为真实后端）
export type AIAnswer = {
  id: string
  question: string
  answer: string
  ms: number
}

export async function askAI(question: string): Promise<AIAnswer> {
  const t0 = performance.now()
  // 本地开发环境：返回模拟答案
  const canned = `> 问：${question}\n\n答：这是模拟的 AI 回答内容。你可以在 src/utils/ai.ts 接入真实服务（如 DeepSeek），并将结果以 Markdown 返回。\n\n- 支持列表\n- 代码块\n\n\`\`\`ts\nconsole.log('hello ai')\n\`\`\``
  const t1 = performance.now()
  return { id: Math.random().toString(36).slice(2), question, answer: canned, ms: Math.round(t1 - t0) }
}