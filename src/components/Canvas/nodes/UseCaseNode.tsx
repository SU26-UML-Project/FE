import { useCallback, useEffect, useRef } from 'react'
import { type Node, type NodeProps } from '@xyflow/react'
import { useCanvasStore } from '../../../stores/canvasStore'
import { BaseNode } from './BaseNode'

export interface UseCaseNodeData {
  type: 'useCaseNode'
  label: string
  stereotype?: 'include' | 'extend'
  color?: string
  [key: string]: unknown
}

type UseCaseNodeType = Node<UseCaseNodeData, 'useCaseNode'>

export function UseCaseNode({ id, data }: NodeProps<UseCaseNodeType>) {
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
    <BaseNode className="usecase-node">
      {isEditing ? (
        <input
          ref={inputRef}
          className="usecase-node-edit"
          value={data.label}
          onChange={e => setNodeData(id, { label: e.target.value })}
          onKeyDown={handleKeyDown}
          onBlur={finishEdit}
        />
      ) : (
        <div className="usecase-node-label">{data.label}</div>
      )}
      <style>{`
        .usecase-node {
          background: ${data.color || '#fff'};
          border: 2px solid #000;
          border-radius: 50%;
          min-width: 140px;
          min-height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px 24px;
          font-family: 'Consolas', 'Monaco', monospace;
        }
        .usecase-node-label {
          font-size: 12px;
          font-weight: 500;
          text-align: center;
          word-break: break-word;
        }
        .usecase-node-edit {
          font-size: 12px;
          font-weight: 500;
          text-align: center;
          border: 1px solid #3b82f6;
          border-radius: 2px;
          padding: 2px 4px;
          outline: none;
          width: 100%;
          box-sizing: border-box;
          font-family: inherit;
        }
      `}</style>
    </BaseNode>
  )
}
