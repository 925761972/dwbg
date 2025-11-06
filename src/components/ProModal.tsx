import { useMemo } from 'preact/hooks'
import { activatePro, startTrial, getTrialRemainingDays, isPro } from '../utils/license'

type Props = {
  onClose: () => void
}

export function ProModal({ onClose }: Props) {
  const remaining = useMemo(() => getTrialRemainingDays(), [])
  const pro = useMemo(() => isPro(), [])

  return (
    <div class="dwbg-modal" role="dialog" aria-modal="true">
      <div class="dwbg-modal__content">
        <div class="dwbg-modal__header">Pro 专业版插件 – 限时特惠 🎉</div>
        <div class="dwbg-modal__body">
          <p>尊敬的用户，感谢您的支持与信任！解锁专业版，即可畅享所有强大功能：</p>
          <ul style={{ paddingLeft: '18px' }}>
            <li>✅ 专业级 Markdown 编辑与实时预览</li>
            <li>✅ 切换字段和切换记录无限制使用 ⚡</li>
            <li>✅ 个性化主题与样式，打造专属创作环境</li>
            <li>✅ 一键导出多种格式（图片、MD文档）</li>
            <li>✅ 优先技术支持，问题快速解决</li>
            <li>✅ 激活期内享受所有功能及更新 🔥</li>
          </ul>
          {pro ? (
            <p>当前状态：已激活 Pro（感谢支持！）</p>
          ) : remaining > 0 ? (
            <p>当前状态：试用中，剩余 {remaining} 天</p>
          ) : (
            <p>当前状态：免费版（可随时试用或激活）</p>
          )}
        </div>
        <div class="dwbg-modal__footer">
          <button class="dwbg-btn" onClick={() => { activatePro(); onClose(); }}>🚀 立即激活</button>
          <button class="dwbg-btn" onClick={() => { startTrial(3); onClose(); }}>🕒 立即试用 - 限时3天</button>
          <button class="dwbg-btn" onClick={onClose}>关闭</button>
        </div>
      </div>
    </div>
  )
}