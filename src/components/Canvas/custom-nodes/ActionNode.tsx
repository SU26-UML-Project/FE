import { useCallback, useEffect, useRef } from 'react'
import { type Node, type NodeProps } from '@xyflow/react'
import { useCanvasStore } from '../../../stores/canvasStore'
import { BaseNode } from './BaseNode'

export interface ActionNodeData {
  type: 'actionNode'
  label: string
  color?: string
  [key: string]: unknown
}

type ActionNodeType = Node<ActionNodeData, 'actionNode'>

export function ActionNode({ id, data }: NodeProps<ActionNodeType>) {
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
    <BaseNode className="action-node">
      <div className="action-node-content">
        {isEditing ? (
          <input
            ref={inputRef}
            className="action-node-edit"
            value={data.label}
            onChange={e => setNodeData(id, { label: e.target.value })}
            onKeyDown={handleKeyDown}
            onBlur={finishEdit}
          />
        ) : (
          <div className="action-node-title">{data.label}</div>
        )}
      </div>
      <style>{`
        .action-node {
          background: ${data.color || '#fff'};
          border: 1.5px solid #334155;
          border-radius: 24px;
          min-width: 120px;
          padding: 10px 20px;
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 5px rgba(0,0,0,0.08);
          transition: all 0.2s ease;
        }
        .action-node:hover {
          border-color: #3b82f6;
          box-shadow: 0 4px 12px rgba(59,130,246,0.15);
        }
        .action-node-title {
          font-weight: 600;
          text-align: center;
          color: #1e293b;
        }
        .action-node-edit {
          font-size: 12px;
          text-align: center;
          border: 1px solid #3b82f6;
          border-radius: 2px;
          padding: 2px 4px;
          outline: none;
          width: 100%;
          box-sizing: border-box;
        }
      `}</style>
    </BaseNode>
  )
}
