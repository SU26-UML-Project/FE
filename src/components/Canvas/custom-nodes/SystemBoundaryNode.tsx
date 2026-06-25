import { useCallback, useEffect, useRef } from 'react'
import { type Node, type NodeProps, NodeResizer } from '@xyflow/react'
import { useCanvasStore } from '../../../stores/canvasStore'
import { BaseNode } from './BaseNode'

export interface SystemBoundaryNodeData {
    type: 'systemBoundaryNode'
    label: string
    color?: string
    [key: string]: unknown
}

type SystemBoundaryNodeType = Node<SystemBoundaryNodeData, 'systemBoundaryNode'>

export function SystemBoundaryNode({ id, data, selected }: NodeProps<SystemBoundaryNodeType>) {
    const editingNodeId = useCanvasStore((s) => s.editingNodeId)
    const setEditingNodeId = useCanvasStore((s) => s.setEditingNodeId)
    const setNodeData = useCanvasStore((s) => s.setNodeData)

    const isEditing = editingNodeId === id
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (isEditing) inputRef.current?.focus()
    }, [isEditing])

    const finishEdit = useCallback(() => {
        setEditingNodeId(null)
    }, [setEditingNodeId])

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === 'Escape') finishEdit()
        },
        [finishEdit]
    )

    return (
        <BaseNode className="system-boundary-node" showHandles={false}>
            <NodeResizer
                isVisible={selected}
                minWidth={240}
                minHeight={160}
            />

            <div className="system-boundary-header">
                {isEditing ? (
                    <input
                        ref={inputRef}
                        className="system-boundary-edit"
                        value={data.label}
                        onChange={(e) => setNodeData(id, { label: e.target.value })}
                        onKeyDown={handleKeyDown}
                        onBlur={finishEdit}
                    />
                ) : (
                    <div className="system-boundary-title">{data.label}</div>
                )}
            </div>

            <style>{`
        .system-boundary-node {
          width: 100%;
          height: 100%;
          min-width: 240px;
          min-height: 160px;
          background: ${data.color || 'rgba(255, 255, 255, 0.35)'};
          border: 2px solid #000;
          border-radius: 4px;
          position: relative;
          font-family: 'Consolas', 'Monaco', monospace;
          box-sizing: border-box;
        }

        .system-boundary-header {
          position: absolute;
          top: 8px;
          left: 12px;
          right: 12px;
          height: 24px;
          display: flex;
          align-items: center;
        }

        .system-boundary-title {
          font-size: 13px;
          font-weight: bold;
          background: rgba(255, 255, 255, 0.85);
          padding: 2px 6px;
          border-radius: 2px;
        }

        .system-boundary-edit {
          font-size: 13px;
          font-weight: bold;
          border: 1px solid #3b82f6;
          border-radius: 2px;
          padding: 2px 6px;
          outline: none;
          width: 180px;
          font-family: inherit;
          box-sizing: border-box;
          background: #fff;
        }
      `}</style>
        </BaseNode>
    )
}