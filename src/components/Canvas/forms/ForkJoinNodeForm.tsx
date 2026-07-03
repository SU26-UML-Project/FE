import { useCallback } from 'react'
import type { Node } from '@xyflow/react'
import type { ForkJoinNodeData } from '../custom-nodes/ForkJoinNode'

interface FormProps {
  node: Node
  setNodeData: (id: string, patch: Partial<any>) => void
}

export function ForkJoinNodeForm({ node, setNodeData }: FormProps) {
  const data = node.data as ForkJoinNodeData
  const onChange = useCallback((field: string, value: any) => {
    setNodeData(node.id, { [field]: value })
  }, [node.id, setNodeData])

  return (
    <div className="props-form">
      <div className="props-field">
        <label>Orientation</label>
        <select 
          value={data.orientation || 'horizontal'} 
          onChange={e => onChange('orientation', e.target.value)}
          className="props-select"
        >
          <option value="horizontal">Horizontal</option>
          <option value="vertical">Vertical</option>
        </select>
      </div>
      <div className="props-field">
        <label>Color</label>
        <div className="props-color-row">
          {['#000', '#3b82f6', '#ef4444', '#10b981'].map(c => (
            <button
              key={c}
              onClick={() => onChange('color', c)}
              className={`props-color-swatch ${(data.color || '#000') === c ? 'active' : ''}`}
              style={{ background: c, border: `2px solid ${c}` }}
            />
          ))}
        </div>
      </div>
      <style>{`
        .props-form { padding: 12px; display: flex; flex-direction: column; gap: 12px; font-size: 12px; }
        .props-field { display: flex; flex-direction: column; gap: 4px; }
        .props-field label { font-weight: 600; color: #555; font-size: 11px; text-transform: uppercase; letter-spacing: 0.3px; }
        .props-select { border: 1px solid #d0d0d0; border-radius: 4px; padding: 6px 8px; font-size: 12px; outline: none; background: #fff; }
        .props-color-row { display: flex; gap: 6px; flex-wrap: wrap; }
        .props-color-swatch { width: 24px; height: 24px; border-radius: 4px; cursor: pointer; }
        .props-color-swatch.active { outline: 2px solid #3b82f6; outline-offset: 2px; }
      `}</style>
    </div>
  )
}
