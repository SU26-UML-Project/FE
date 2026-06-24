import { useCallback, useEffect, useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { GraphCanvas } from '../Canvas/GraphCanvas'
import { ShapePanel } from '../Canvas/ShapePanel'
import { PropsPanel } from '../Canvas/PropsPanel'
import { CodePanel } from '../Canvas/CodePanel'
import CanvasToolbar from '../Canvas/CanvasToolbar'
import { useCanvasStore } from '../../stores/canvasStore'
import { useAutoLayout } from '../../hooks/useAutoLayout'
import type { WorkspaceSheet } from '../../types/workspace'
import { ReactFlowProvider } from '@xyflow/react'

interface CanvasPanelProps {
  sheets: WorkspaceSheet[]
  activeSheetId: string | null
  onSheetSelect: (id: string) => void
  onSheetAdd: () => void
  onSheetDelete: (id: string) => void
  onSheetRename: (id: string, name: string) => void
}

function CanvasPanelInner({
  sheets,
  activeSheetId,
  onSheetSelect,
  onSheetAdd,
  onSheetDelete,
  onSheetRename,
}: CanvasPanelProps) {
  const [editingSheetId, setEditingSheetId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [showProps, setShowProps] = useState(false)
  const [showCode, setShowCode] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { layout } = useAutoLayout()
  const isLocked = useCanvasStore(s => s.isLocked)
  const diagramName = useCanvasStore(s => s.diagramName)
  const setDiagramName = useCanvasStore(s => s.setDiagramName)
  const nodes = useCanvasStore(s => s.nodes)
  const edges = useCanvasStore(s => s.edges)

  const handleLayout = useCallback(() => {
    layout(nodes, edges)
  }, [layout, nodes, edges])

  useEffect(() => {
    if (editingSheetId && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingSheetId])

  // Load sheet data into canvasStore when active sheet/workspace changes
  useEffect(() => {
    if (!activeSheetId || sheets.length === 0) return
    const sheet = sheets.find(s => s.id === activeSheetId) || sheets[0]
    const data = sheet.canvasData || { nodes: [], edges: [] }
    useCanvasStore.setState({
      nodes: data.nodes,
      edges: data.edges,
      diagramName: sheet.name,
      diagramType: sheet.diagramType || 'custom',
    })
  }, [activeSheetId, sheets])

  const handleSheetDblClick = (sheet: WorkspaceSheet) => {
    setEditingSheetId(sheet.id)
    setEditName(sheet.name)
  }

  const handleSheetNameSubmit = () => {
    if (editingSheetId && editName.trim()) {
      onSheetRename(editingSheetId, editName.trim())
    }
    setEditingSheetId(null)
  }

  const handleAdd = () => {
    onSheetAdd()
  }

  const handleDelete = (e: React.MouseEvent, sheetId: string) => {
    e.stopPropagation()
    const { nodes, edges } = useCanvasStore.getState()
    const currentSheet = sheets.find(s => s.id === activeSheetId)
    if (currentSheet) {
      currentSheet.canvasData = { nodes, edges }
    }
    onSheetDelete(sheetId)
  }

  const handleTabClick = useCallback((sheetId: string) => {
    const { nodes, edges } = useCanvasStore.getState()
    if (activeSheetId && activeSheetId !== sheetId) {
      const prevSheet = sheets.find(s => s.id === activeSheetId)
      if (prevSheet) {
        prevSheet.canvasData = { nodes, edges }
      }
    }
    const targetSheet = sheets.find(s => s.id === sheetId)
    if (targetSheet) {
      const data = targetSheet.canvasData || { nodes: [], edges: [] }
      useCanvasStore.setState({
        nodes: data.nodes,
        edges: data.edges,
        diagramName: targetSheet.name,
        diagramType: targetSheet.diagramType || 'custom',
      })
    }
    onSheetSelect(sheetId)
  }, [activeSheetId, sheets, onSheetSelect])

  const activeSheet = sheets.find((s) => s.id === activeSheetId) ?? sheets[0]

  return (
    <div className="flex flex-col h-full bg-gray-100 p-2">
      <div className="flex-1 flex flex-col bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        {/* Canvas Toolbar */}
        <CanvasToolbar
          diagramName={diagramName}
          onNameChange={setDiagramName}
          onBack={() => {}} // WorkspaceToolbar handles this
          onToggleCode={() => setShowCode(!showCode)}
          onToggleProps={() => setShowProps(!showProps)}
          onLayout={handleLayout}
          isCodePanelOpen={showCode}
          isPropsPanelOpen={showProps}
          isLocked={isLocked}
        />

        {/* Sheets Tab Bar */}
        <div className="flex items-center gap-1 px-2 py-1 border-b border-gray-200 bg-gray-50 shrink-0">
          {sheets.map((sheet) => (
            <div
              key={sheet.id}
              onClick={() => handleTabClick(sheet.id)}
              onDoubleClick={() => handleSheetDblClick(sheet)}
              className={`group flex items-center gap-1 px-2 py-1 rounded text-xs cursor-pointer transition-colors ${
                sheet.id === activeSheetId
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              {editingSheetId === sheet.id ? (
                <input
                  ref={inputRef}
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onBlur={handleSheetNameSubmit}
                  onKeyDown={e => { if (e.key === 'Enter') handleSheetNameSubmit(); if (e.key === 'Escape') setEditingSheetId(null) }}
                  className="w-20 text-xs bg-white border border-blue-300 rounded px-1 py-0 outline-none"
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                <span className="truncate max-w-24">{sheet.name}</span>
              )}
              {sheets.length > 1 && (
                <button
                  onClick={(e) => handleDelete(e, sheet.id)}
                  className="opacity-0 group-hover:opacity-60 hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-red-100"
                >
                  <X size={10} />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={handleAdd}
            className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
            title="Add sheet"
          >
            <Plus size={12} />
          </button>
        </div>
        <div className="flex-1 flex overflow-hidden">
          <ShapePanel />
          <div className="flex-1 relative flex flex-col">
            <div className="flex-1 relative">
              {activeSheet ? (
                <GraphCanvas />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                  <div className="text-center">
                    <p className="text-sm text-gray-400 font-medium mb-2">No sheets yet</p>
                    <button
                      onClick={handleAdd}
                      className="px-4 py-2 bg-uml-blue text-white text-xs font-bold uppercase rounded-md hover:bg-blue-700 transition"
                    >
                      Create First Sheet
                    </button>
                  </div>
                </div>
              )}
            </div>
            {showCode && (
              <div className="h-1/3 border-t border-gray-200">
                <CodePanel />
              </div>
            )}
          </div>
          {showProps && <PropsPanel />}
        </div>
      </div>
    </div>
  )
}

export default function CanvasPanel(props: CanvasPanelProps) {
  return (
    <ReactFlowProvider>
      <CanvasPanelInner {...props} />
    </ReactFlowProvider>
  )
}
