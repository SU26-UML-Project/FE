import { useCallback } from 'react'
import type { Node } from '@xyflow/react'
import type { ActionNodeData } from '../custom-nodes/ActionNode'

interface FormProps {
  node: Node
  setNodeData: (id: string, patch: Partial<any>) => void
}

export function ActionNodeForm({ node, setNodeData }: FormProps) {
  const data = node.data as ActionNodeData
  const onChange = useCallback((field: string, value: any) => {
    setNodeData(node.id, { [field]: value })
  }, [node.id, setNodeData])

  return (
    <div className="props-form">
      <div className="props-field">
        <label>Action Label</label>
        <input value={data.label} onChange={e => onChange('label', e.target.value)} />
      </div>
      <div className="props-field">
        <label>Color</label>
        <div className="props-color-row">
          {['#fff', '#ffe0e0', '#e0ffe0', '#e0e0ff', '#fff8dc', '#e0ffff'].map(c => (
            <button
              key={c}
              onClick={() => onChange('color', c === '#fff' ? undefined : c)}
              className={`props-color-swatch ${(data.color || '#fff') === c ? 'active' : ''}`}
              style={{ background: c, border: `2px solid ${c === '#fff' ? '#ccc' : c}` }}
            />
          ))}
        </div>
      </div>
      <style>{`
        .props-form { padding: 12px; display: flex; flex-direction: column; gap: 12px; font-size: 12px; }
        .props-field { display: flex; flex-direction: column; gap: 4px; }
        .props-field label { font-weight: 600; color: #555; font-size: 11px; text-transform: uppercase; letter-spacing: 0.3px; }
        .props-field input { border: 1px solid #d0d0d0; border-radius: 4px; padding: 6px 8px; font-size: 12px; outline: none; }
        .props-field input:focus { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,0.15); }
        .props-color-row { display: flex; gap: 6px; flex-wrap: wrap; }
        .props-color-swatch { width: 24px; height: 24px; border-radius: 4px; cursor: pointer; }
        .props-color-swatch.active { outline: 2px solid #3b82f6; outline-offset: 2px; }
      `}</style>
    </div>
  )
}
