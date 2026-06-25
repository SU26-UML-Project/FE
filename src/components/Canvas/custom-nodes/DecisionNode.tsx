import { useCallback, useEffect, useRef } from 'react'
import { type Node, type NodeProps } from '@xyflow/react'
import { useCanvasStore } from '../../../stores/canvasStore'
import { BaseNode } from './BaseNode'

export interface DecisionNodeData {
  type: 'decisionNode'
  label?: string
  color?: string
  [key: string]: unknown
}

type DecisionNodeType = Node<DecisionNodeData, 'decisionNode'>

export function DecisionNode({ id, data }: NodeProps<DecisionNodeType>) {
  const editingNodeId = useCanvasStore((s) => s.editingNodeId)
  const setEditingNodeId = useCanvasStore((s) => s.setEditingNodeId)
  const setNodeData = useCanvasStore((s) => s.setNodeData)
  const isEditing = editingNodeId === id
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing) inputRef.current?.focus()
  }, [isEditing])

  const finishEdit = useCallback(() => setEditingNodeId(null), [setEditingNodeId])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'Escape') finishEdit()
  }, [finishEdit])

  return (
    <BaseNode className="decision-node">
      <div className="decision-diamond">
        {isEditing ? (
          <input
            ref={inputRef}
            className="decision-edit"
            value={data.label || ''}
            onChange={e => setNodeData(id, { label: e.target.value })}
            onKeyDown={handleKeyDown}
            onBlur={finishEdit}
          />
        ) : (
          <div className="decision-label">{data.label}</div>
        )}
      </div>
      <style>{`
        .decision-node {
          padding: 0;
          background: transparent;
        }
        .decision-diamond {
          width: 90px;
          height: 90px;
          background: ${data.color || '#fff'};
          border: 1.5px solid #334155;
          transform: rotate(45deg);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          box-shadow: 0 2px 5px rgba(0,0,0,0.08);
        }
        .decision-label {
          transform: rotate(-45deg);
          font-size: 12px;
          font-weight: 600;
          text-align: center;
          max-width: 65px;
          word-break: break-word;
          color: #1e293b;
        }
        .decision-edit {
          transform: rotate(-45deg);
          font-size: 11px;
          text-align: center;
          border: 1px solid #3b82f6;
          border-radius: 2px;
          padding: 2px;
          outline: none;
          width: 50px;
          background: #fff;
        }
      `}</style>
    </BaseNode>
  )
}
