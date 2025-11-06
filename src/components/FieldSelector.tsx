import { useEffect, useState } from 'preact/hooks'
import { getFieldList, setFieldId } from '../feishu/bitable'

export function FieldSelector() {
  const [fields, setFields] = useState<Array<{ id: string; name: string }>>([])
  const [value, setValue] = useState<string>(localStorage.getItem('dwbg:fieldId') || 'content')

  useEffect(() => {
    getFieldList().then(setFields)
  }, [])

  return (
    <select
      class="dwbg-btn"
      value={value}
      onChange={async (e) => {
        const v = (e.target as HTMLSelectElement).value
        setValue(v)
        await setFieldId(v)
      }}
      title="选择字段"
    >
      {fields.map((f) => (
        <option key={f.id} value={f.id}>{f.name}</option>
      ))}
    </select>
  )
}