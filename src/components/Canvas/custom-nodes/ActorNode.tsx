import { useCallback, useEffect, useRef } from 'react'
import { type Node, type NodeProps } from '@xyflow/react'
import { useCanvasStore } from '../../../stores/canvasStore'
import { BaseNode } from './BaseNode'

export interface ActorNodeData {
  type: 'actorNode'
  label: string
  color?: string
  [key: string]: unknown
}

type ActorNodeType = Node<ActorNodeData, 'actorNode'>

export function ActorNode({ id, data }: NodeProps<ActorNodeType>) {
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
    <BaseNode className="actor-node">
      <div className="actor-node-svg">
        <svg viewBox="0 0 40 60" width="40" height="60">
          <circle cx="20" cy="10" r="7" fill="none" stroke="#000" strokeWidth="2" />
          <line x1="20" y1="17" x2="20" y2="35" stroke="#000" strokeWidth="2" />
          <line x1="6" y1="24" x2="34" y2="24" stroke="#000" strokeWidth="2" />
          <line x1="20" y1="35" x2="8" y2="52" stroke="#000" strokeWidth="2" />
          <line x1="20" y1="35" x2="32" y2="52" stroke="#000" strokeWidth="2" />
        </svg>
      </div>
      {isEditing ? (
        <input
          ref={inputRef}
          className="actor-node-edit"
          value={data.label}
          onChange={e => setNodeData(id, { label: e.target.value })}
          onKeyDown={handleKeyDown}
          onBlur={finishEdit}
        />
      ) : (
        <div className="actor-node-label">{data.label}</div>
      )}
      <style>{`
        .actor-node {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 8px 12px;
          min-width: 80px;
          position: relative;
        }
        .actor-node-svg {
          display: flex;
          justify-content: center;
        }
        .actor-node-label {
          font-size: 11px;
          font-weight: 500;
          text-align: center;
          font-family: 'Consolas', 'Monaco', monospace;
        }
        .actor-node-edit {
          font-size: 11px;
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
