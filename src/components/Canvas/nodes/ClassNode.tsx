import { useCallback, useEffect, useRef } from 'react'
import { type Node, type NodeProps } from '@xyflow/react'
import { useCanvasStore } from '../../../stores/canvasStore'
import { BaseNode } from './BaseNode'

export interface ClassNodeData {
  type: 'classNode'
  label: string
  stereotype?: string
  attributes?: string[]
  methods?: string[]
  color?: string
  [key: string]: unknown
}

type ClassNodeType = Node<ClassNodeData, 'classNode'>

export function ClassNode({ id, data }: NodeProps<ClassNodeType>) {
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
    <BaseNode className="class-node">
      <div className="class-node-header">
        {data.stereotype && <div className="class-node-stereotype">«{data.stereotype}»</div>}
        {isEditing ? (
          <input
            ref={inputRef}
            className="class-node-edit"
            value={data.label}
            onChange={e => setNodeData(id, { label: e.target.value })}
            onKeyDown={handleKeyDown}
            onBlur={finishEdit}
          />
        ) : (
          <div className="class-node-title">{data.label}</div>
        )}
      </div>
      {data.attributes && data.attributes.length > 0 && (
        <div className="class-node-section">
          {data.attributes.map((a, i) => (
            <div key={i} className="class-node-item">{a}</div>
          ))}
        </div>
      )}
      {data.methods && data.methods.length > 0 && (
        <div className="class-node-section">
          {data.methods.map((m, i) => (
            <div key={i} className="class-node-item">{m}</div>
          ))}
        </div>
      )}
      <style>{`
        .class-node {
          background: ${data.color || '#fff'};
          border: 2px solid #000;
          border-radius: 2px;
          min-width: 180px;
          font-family: 'Consolas', 'Monaco', monospace;
          font-size: 12px;
        }
        .class-node-header {
          padding: 6px 10px;
          text-align: center;
          border-bottom: 2px solid #000;
        }
        .class-node-stereotype {
          font-size: 10px;
          color: #666;
          margin-bottom: 2px;
        }
        .class-node-title {
          font-weight: bold;
          font-size: 13px;
        }
        .class-node-edit {
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
        .class-node-section {
          padding: 4px 10px;
          border-top: 1px solid #000;
        }
        .class-node-item {
          padding: 2px 0;
          white-space: nowrap;
        }
      `}</style>
    </BaseNode>
  )
}
