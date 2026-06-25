import { useCallback, useEffect, useRef, useState } from 'react'
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

type EditingSection = 'label' | 'attributes' | 'methods' | null

function normalizeLines(text: string): string[] {
  return text
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
}

export function ClassNode({ id, data }: NodeProps<ClassNodeType>) {
  const editingNodeId = useCanvasStore((s) => s.editingNodeId)
  const setEditingNodeId = useCanvasStore((s) => s.setEditingNodeId)
  const setNodeData = useCanvasStore((s) => s.setNodeData)

  const [editingSection, setEditingSection] = useState<EditingSection>(null)
  const [attributesDraft, setAttributesDraft] = useState('')
  const [methodsDraft, setMethodsDraft] = useState('')

  const labelInputRef = useRef<HTMLInputElement>(null)
  const attributesTextareaRef = useRef<HTMLTextAreaElement>(null)
  const methodsTextareaRef = useRef<HTMLTextAreaElement>(null)

  const attributes = (data.attributes || []).filter(Boolean)
  const methods = (data.methods || []).filter(Boolean)

  const isEditingThisNode = editingNodeId === id

  useEffect(() => {
    if (!isEditingThisNode) {
      setEditingSection(null)
      return
    }

    // Nếu GraphCanvas gọi setEditingNodeId(id) do double click node,
    // mặc định vẫn edit tên class như behavior cũ.
    if (editingSection === null) {
      setEditingSection('label')
    }
  }, [isEditingThisNode, editingSection])

  useEffect(() => {
    if (editingSection === 'label') {
      labelInputRef.current?.focus()
      labelInputRef.current?.select()
    }

    if (editingSection === 'attributes') {
      attributesTextareaRef.current?.focus()
      attributesTextareaRef.current?.select()
    }

    if (editingSection === 'methods') {
      methodsTextareaRef.current?.focus()
      methodsTextareaRef.current?.select()
    }
  }, [editingSection])

  const startEditLabel = useCallback(
      (e?: React.MouseEvent) => {
        e?.stopPropagation()
        setEditingNodeId(id)
        setEditingSection('label')
      },
      [id, setEditingNodeId]
  )

  const startEditAttributes = useCallback(
      (e?: React.MouseEvent) => {
        e?.stopPropagation()
        setAttributesDraft(attributes.join('\n'))
        setEditingNodeId(id)
        setEditingSection('attributes')
      },
      [attributes, id, setEditingNodeId]
  )

  const startEditMethods = useCallback(
      (e?: React.MouseEvent) => {
        e?.stopPropagation()
        setMethodsDraft(methods.join('\n'))
        setEditingNodeId(id)
        setEditingSection('methods')
      },
      [methods, id, setEditingNodeId]
  )

  const finishEdit = useCallback(() => {
    if (editingSection === 'attributes') {
      setNodeData(id, {
        attributes: normalizeLines(attributesDraft),
      })
    }

    if (editingSection === 'methods') {
      setNodeData(id, {
        methods: normalizeLines(methodsDraft),
      })
    }

    setEditingSection(null)
    setEditingNodeId(null)
  }, [
    attributesDraft,
    editingSection,
    id,
    methodsDraft,
    setEditingNodeId,
    setNodeData,
  ])

  const handleLabelKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === 'Escape') {
          e.preventDefault()
          finishEdit()
        }
      },
      [finishEdit]
  )

  const handleTextareaKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault()
          finishEdit()
        }

        // Enter: lưu giống input tên class.
        // Shift + Enter: xuống dòng để nhập nhiều attributes/methods.
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault()
          finishEdit()
        }
      },
      [finishEdit]
  )

  return (
      <BaseNode className="class-node">
        <div className="class-node-header" onDoubleClick={startEditLabel}>
          {data.stereotype && (
              <div className="class-node-stereotype">«{data.stereotype}»</div>
          )}

          {editingSection === 'label' ? (
              <input
                  ref={labelInputRef}
                  className="class-node-edit nodrag nowheel"
                  value={data.label}
                  onChange={(e) => setNodeData(id, { label: e.target.value })}
                  onKeyDown={handleLabelKeyDown}
                  onBlur={finishEdit}
              />
          ) : (
              <div className="class-node-title">{data.label}</div>
          )}
        </div>

        <div
            className="class-node-section class-node-attributes"
            onDoubleClick={startEditAttributes}
        >
          {editingSection === 'attributes' ? (
              <textarea
                  ref={attributesTextareaRef}
                  className="class-node-textarea nodrag nowheel"
                  value={attributesDraft}
                  onChange={(e) => setAttributesDraft(e.target.value)}
                  onKeyDown={handleTextareaKeyDown}
                  onBlur={finishEdit}
                  placeholder="- id: UUID&#10;- email: String"
                  rows={Math.max(2, attributesDraft.split('\n').length)}
              />
          ) : attributes.length > 0 ? (
              attributes.map((a, i) => (
                  <div key={i} className="class-node-item">
                    {a}
                  </div>
              ))
          ) : (
              <div className="class-node-placeholder">
                Double click to add attributes
              </div>
          )}
        </div>

        <div
            className="class-node-section class-node-methods"
            onDoubleClick={startEditMethods}
        >
          {editingSection === 'methods' ? (
              <textarea
                  ref={methodsTextareaRef}
                  className="class-node-textarea nodrag nowheel"
                  value={methodsDraft}
                  onChange={(e) => setMethodsDraft(e.target.value)}
                  onKeyDown={handleTextareaKeyDown}
                  onBlur={finishEdit}
                  placeholder="+ login(password): Token"
                  rows={Math.max(2, methodsDraft.split('\n').length)}
              />
          ) : methods.length > 0 ? (
              methods.map((m, i) => (
                  <div key={i} className="class-node-item">
                    {m}
                  </div>
              ))
          ) : (
              <div className="class-node-placeholder">
                Double click to add methods
              </div>
          )}
        </div>

        <style>{`
        .class-node {
          background: ${data.color || '#fff'};
          border: 2px solid #000;
          border-radius: 2px;
          min-width: 180px;
          font-family: 'Consolas', 'Monaco', monospace;
          font-size: 12px;
          box-sizing: border-box;
        }

        .class-node-header {
          padding: 6px 10px;
          text-align: center;
          min-height: 34px;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          justify-content: center;
          cursor: text;
        }

        .class-node-stereotype {
          font-size: 10px;
          color: #666;
          margin-bottom: 2px;
        }

        .class-node-title {
          font-weight: bold;
          font-size: 13px;
          word-break: break-word;
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
          border-top: 1.5px solid #000;
          min-height: 32px;
          box-sizing: border-box;
          cursor: text;
        }

        .class-node-section:hover .class-node-placeholder {
          opacity: 1;
        }

        .class-node-item {
          padding: 2px 0;
          white-space: nowrap;
        }

        .class-node-placeholder {
          height: 20px;
          line-height: 20px;
          color: #999;
          font-size: 10px;
          font-style: italic;
          opacity: 0;
          user-select: none;
        }

        .class-node-textarea {
          width: 100%;
          min-height: 44px;
          resize: none;
          border: 1px solid #3b82f6;
          border-radius: 2px;
          padding: 4px;
          outline: none;
          font-size: 12px;
          font-family: inherit;
          box-sizing: border-box;
          background: #fff;
          line-height: 1.4;
        }
      `}</style>
      </BaseNode>
  )
}