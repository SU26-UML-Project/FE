import { useCallback, useEffect, useRef } from 'react'
import { type Node, type NodeProps } from '@xyflow/react'
import { useCanvasStore } from '../../../stores/canvasStore'
import { BaseNode } from './BaseNode'

export interface NoteNodeData {
    type: 'noteNode'
    label: string
    color?: string
    [key: string]: unknown
}

type NoteNodeType = Node<NoteNodeData, 'noteNode'>

export function NoteNode({ id, data }: NodeProps<NoteNodeType>) {
    const editingNodeId = useCanvasStore((s) => s.editingNodeId)
    const setEditingNodeId = useCanvasStore((s) => s.setEditingNodeId)
    const setNodeData = useCanvasStore((s) => s.setNodeData)

    const isEditing = editingNodeId === id
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    useEffect(() => {
        if (isEditing) textareaRef.current?.focus()
    }, [isEditing])

    const finishEdit = useCallback(() => {
        setEditingNodeId(null)
    }, [setEditingNodeId])

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Escape') finishEdit()
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                finishEdit()
            }
        },
        [finishEdit]
    )

    return (
        <BaseNode className="note-node">
            <div className="note-node-fold" />

            {isEditing ? (
                <textarea
                    ref={textareaRef}
                    className="note-node-edit"
                    value={data.label}
                    onChange={(e) => setNodeData(id, { label: e.target.value })}
                    onKeyDown={handleKeyDown}
                    onBlur={finishEdit}
                />
            ) : (
                <div className="note-node-label">{data.label}</div>
            )}

            <style>{`
        .note-node {
          background: ${data.color || '#fff7cc'};
          border: 1.5px solid #000;
          min-width: 140px;
          min-height: 80px;
          padding: 12px;
          position: relative;
          font-family: 'Consolas', 'Monaco', monospace;
          box-sizing: border-box;
        }

        .note-node-fold {
          position: absolute;
          top: -1.5px;
          right: -1.5px;
          width: 18px;
          height: 18px;
          background: linear-gradient(
            135deg,
            transparent 0%,
            transparent 50%,
            rgba(0, 0, 0, 0.2) 50%,
            rgba(0, 0, 0, 0.2) 100%
          );
          border-left: 1.5px solid #000;
          border-bottom: 1.5px solid #000;
        }

        .note-node-label {
          font-size: 12px;
          white-space: pre-wrap;
          word-break: break-word;
          padding-right: 12px;
        }

        .note-node-edit {
          width: 100%;
          min-height: 60px;
          resize: none;
          border: 1px solid #3b82f6;
          border-radius: 2px;
          padding: 4px;
          outline: none;
          font-size: 12px;
          font-family: inherit;
          box-sizing: border-box;
          background: #fff;
        }
      `}</style>
        </BaseNode>
    )
}