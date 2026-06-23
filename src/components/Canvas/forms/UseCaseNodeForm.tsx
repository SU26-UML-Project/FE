import { useCallback } from 'react'
import type { Node } from '@xyflow/react'
import type { UseCaseNodeData } from '../nodes/UseCaseNode'

interface FormProps {
  node: Node
  setNodeData: (id: string, patch: Partial<any>) => void
}

export function UseCaseNodeForm({ node, setNodeData }: FormProps) {
  const data = node.data as UseCaseNodeData
  const onChange = useCallback((field: string, value: any) => {
    setNodeData(node.id, { [field]: value })
  }, [node.id, setNodeData])

  return (
    <div className="props-form">
      <div className="props-field">
        <label>Label</label>
        <input value={data.label} onChange={e => onChange('label', e.target.value)} />
      </div>
      <style>{`
        .props-form { padding: 12px; display: flex; flex-direction: column; gap: 12px; font-size: 12px; }
        .props-field { display: flex; flex-direction: column; gap: 4px; }
        .props-field label { font-weight: 600; color: #555; font-size: 11px; text-transform: uppercase; letter-spacing: 0.3px; }
        .props-field input {
          border: 1px solid #d0d0d0; border-radius: 4px; padding: 6px 8px;
          font-size: 12px; font-family: inherit; outline: none;
        }
        .props-field input:focus { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,0.15); }
      `}</style>
    </div>
  )
}
