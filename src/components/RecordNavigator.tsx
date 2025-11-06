import { useEffect, useState } from 'preact/hooks'
import { getRecordIds, selectNextRecord, selectPrevRecord } from '../feishu/bitable'

export function RecordNavigator() {
  const [ids, setIds] = useState<string[]>([])
  const [idx, setIdx] = useState<number>(parseInt(localStorage.getItem('dwbg:recordIndex') || '0'))

  useEffect(() => {
    getRecordIds().then(setIds)
    const onRefresh = () => setIdx(parseInt(localStorage.getItem('dwbg:recordIndex') || '0'))
    window.addEventListener('dwbg:refresh', onRefresh as unknown as EventListener)
    return () => window.removeEventListener('dwbg:refresh', onRefresh as unknown as EventListener)
  }, [])

  return (
    <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
      <button class="dwbg-btn" onClick={() => selectPrevRecord()}>上一条</button>
      <span class="dwbg-meta">{idx + 1} / {ids.length || '?'}</span>
      <button class="dwbg-btn" onClick={() => selectNextRecord()}>下一条</button>
    </div>
  )
}