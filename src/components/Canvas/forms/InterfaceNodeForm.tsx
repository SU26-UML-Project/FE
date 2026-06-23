import { useCallback } from 'react'
import type { Node } from '@xyflow/react'
import type { InterfaceNodeData } from '../nodes/InterfaceNode'

interface FormProps {
  node: Node
  setNodeData: (id: string, patch: Partial<any>) => void
}

export function InterfaceNodeForm({ node, setNodeData }: FormProps) {
  const data = node.data as InterfaceNodeData
  const onChange = useCallback((field: string, value: any) => {
    setNodeData(node.id, { [field]: value })
  }, [node.id, setNodeData])

  return (
    <div className="props-form">
      <div className="props-field">
        <label>Label</label>
        <input value={data.label} onChange={e => onChange('label', e.target.value)} />
      </div>
      <div className="props-field">
        <label>Methods</label>
        <textarea
          value={(data.methods || []).join('\n')}
          onChange={e => onChange('methods', e.target.value.split('\n'))}
          onBlur={e => onChange('methods', e.target.value.split('\n').filter(Boolean))}
          rows={10}
          placeholder="+ method(): Type"
        />
      </div>
      <style>{`
        .props-form { padding: 12px; display: flex; flex-direction: column; gap: 12px; font-size: 12px; }
        .props-field { display: flex; flex-direction: column; gap: 4px; }
        .props-field label { font-weight: 600; color: #555; font-size: 11px; text-transform: uppercase; letter-spacing: 0.3px; }
        .props-field input, .props-field textarea {
          border: 1px solid #d0d0d0; border-radius: 4px; padding: 6px 8px;
          font-size: 12px; font-family: inherit; outline: none;
        }
        .props-field input:focus, .props-field textarea:focus { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,0.15); }
        .props-field textarea { resize: vertical; font-family: 'Consolas', 'Monaco', monospace; }
      `}</style>
    </div>
  )
}
