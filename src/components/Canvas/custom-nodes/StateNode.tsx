import { useCallback, useEffect, useRef } from 'react'
import { type Node, type NodeProps } from '@xyflow/react'
import { useCanvasStore } from '../../../stores/canvasStore'
import { BaseNode } from './BaseNode'

export interface StateNodeData {
  type: 'stateNode'
  label: string
  entry?: string
  do?: string
  exit?: string
  color?: string
  [key: string]: unknown
}

type StateNodeType = Node<StateNodeData, 'stateNode'>

export function StateNode({ id, data }: NodeProps<StateNodeType>) {
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
    <BaseNode className="state-node">
      <div className="state-node-header">
        {isEditing ? (
          <input
            ref={inputRef}
            className="state-node-edit"
            value={data.label}
            onChange={e => setNodeData(id, { label: e.target.value })}
            onKeyDown={handleKeyDown}
            onBlur={finishEdit}
          />
        ) : (
          <div className="state-node-title">{data.label}</div>
        )}
      </div>
      {(data.entry || data.do || data.exit) && (
        <div className="state-node-body">
          {data.entry && <div className="state-action">entry / {data.entry}</div>}
          {data.do && <div className="state-action">do / {data.do}</div>}
          {data.exit && <div className="state-action">exit / {data.exit}</div>}
        </div>
      )}
      <style>{`
        .state-node {
          background: ${data.color || '#fff'};
          border: 1.5px solid #334155;
          border-radius: 14px;
          min-width: 140px;
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          overflow: hidden;
          box-shadow: 0 2px 6px rgba(0,0,0,0.06);
          transition: all 0.2s ease;
        }
        .state-node:hover {
          border-color: #3b82f6;
          box-shadow: 0 4px 15px rgba(59,130,246,0.12);
        }
        .state-node-header {
          padding: 10px 14px;
          text-align: center;
          font-weight: 700;
          color: #1e293b;
          border-bottom: ${(data.entry || data.do || data.exit) ? '1.5px solid #334155' : 'none'};
        }
        .state-node-title {
          font-size: 13px;
        }
        .state-node-edit {
          font-weight: bold;
          font-size: 13px;
          text-align: center;
          border: 1px solid #3b82f6;
          border-radius: 2px;
          padding: 2px 4px;
          outline: none;
          width: 100%;
          box-sizing: border-box;
        }
        .state-node-body {
          padding: 6px 10px;
          font-size: 11px;
          text-align: left;
        }
        .state-action {
          margin-bottom: 2px;
        }
      `}</style>
    </BaseNode>
  )
}
