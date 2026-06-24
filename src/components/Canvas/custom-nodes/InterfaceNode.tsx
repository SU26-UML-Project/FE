import { useCallback, useEffect, useRef } from 'react'
import { type Node, type NodeProps } from '@xyflow/react'
import { useCanvasStore } from '../../../stores/canvasStore'
import { BaseNode } from './BaseNode'

export interface InterfaceNodeData {
  type: 'interfaceNode'
  label: string
  methods?: string[]
  color?: string
  [key: string]: unknown
}

type InterfaceNodeType = Node<InterfaceNodeData, 'interfaceNode'>

export function InterfaceNode({ id, data }: NodeProps<InterfaceNodeType>) {
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
    <BaseNode className="interface-node">
      <div className="interface-node-header">
        <div className="interface-node-stereotype">«interface»</div>
        {isEditing ? (
          <input
            ref={inputRef}
            className="interface-node-edit"
            value={data.label}
            onChange={e => setNodeData(id, { label: e.target.value })}
            onKeyDown={handleKeyDown}
            onBlur={finishEdit}
          />
        ) : (
          <div className="interface-node-title">{data.label}</div>
        )}
      </div>
      {data.methods && data.methods.length > 0 && (
        <div className="interface-node-section">
          {data.methods.map((m, i) => (
            <div key={i} className="interface-node-item">{m}</div>
          ))}
        </div>
      )}
      <style>{`
        .interface-node {
          background: ${data.color || '#fff'};
          border: 2px solid #000;
          border-radius: 2px;
          min-width: 180px;
          font-family: 'Consolas', 'Monaco', monospace;
          font-size: 12px;
        }
        .interface-node-header {
          padding: 6px 10px;
          text-align: center;
          border-bottom: 2px solid #000;
        }
        .interface-node-stereotype {
          font-size: 10px;
          color: #666;
          font-style: italic;
          margin-bottom: 2px;
        }
        .interface-node-title {
          font-weight: bold;
          font-size: 13px;
        }
        .interface-node-edit {
          font-weight: bold;
          font-size: 13px;
          text-align: center;
          border: 1px solid #3b82f6;
          border-radius: 2px;
          padding: 2px 4px;
          outline: none;
          width: 100%;
          box-sizing: border-box;
          font-family: inherit;
        }
        .interface-node-section {
          padding: 4px 10px;
        }
        .interface-node-item {
          padding: 2px 0;
          white-space: nowrap;
        }
      `}</style>
    </BaseNode>
  )
}
