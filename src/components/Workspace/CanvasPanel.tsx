import { useCallback, useEffect, useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { GraphCanvas } from '../Canvas/GraphCanvas'
import { ShapePanel } from '../Canvas/ShapePanel'
import { PropsPanel } from '../Canvas/PropsPanel'
import { MermaidImportDialog } from '../Canvas/MermaidImportDialog'
import { useCanvasStore } from '../../stores/canvasStore'
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
  const [importOpen, setImportOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const clearCanvas = useCanvasStore(s => s.clearCanvas)

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
        {/* Sheets Tab Bar */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 bg-gray-50/80 shrink-0">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap select-none">Sheets:</span>
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-thin flex-1 min-w-0">
            {sheets.map((sheet) => (
              <div
                key={sheet.id}
                onClick={() => handleTabClick(sheet.id)}
                onDoubleClick={() => handleSheetDblClick(sheet)}
                className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs cursor-pointer transition-all border shadow-sm whitespace-nowrap ${
                  sheet.id === activeSheetId
                    ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-sm font-medium'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-800'
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
                  <span className="truncate max-w-28">{sheet.name}</span>
                )}
                {sheets.length > 1 && (
                  <button
                    onClick={(e) => handleDelete(e, sheet.id)}
                    className="opacity-0 group-hover:opacity-60 hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-red-100 flex-shrink-0"
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={handleAdd}
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors flex-shrink-0 bg-white border border-gray-200 shadow-sm"
            title="Add sheet"
          >
            <Plus size={12} />
          </button>
          <button
            onClick={() => setImportOpen(true)}
            className="text-xs px-2.5 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors flex items-center gap-1 flex-shrink-0 shadow-sm"
            title="Import Mermaid"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4m4-5 5 5 5-5m-5-5v12" />
            </svg>
            Mermaid
          </button>
          <button
            onClick={clearCanvas}
            className="text-xs px-2.5 py-1.5 text-gray-500 hover:text-red-500 border border-gray-200 hover:border-red-200 bg-white rounded-md transition-colors flex-shrink-0 shadow-sm"
            title="Clear canvas"
          >
            Clear
          </button>
          <button
            onClick={() => setShowProps(p => !p)}
            className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all border shadow-sm flex-shrink-0 ${
              showProps
                ? 'bg-gray-200 text-gray-700 border-gray-300'
                : 'bg-white text-gray-500 hover:text-gray-700 border-gray-200 hover:border-gray-300'
            }`}
          >
            Props
          </button>
        </div>
        <div className="flex-1 flex overflow-hidden">
          <ShapePanel />
          <div className="flex-1 relative flex flex-col">
            <div className="flex-1 relative">
              {activeSheet ? (
                <>
                  <GraphCanvas />
                </>
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
          </div>
          {showProps && <PropsPanel />}
        </div>
      </div>
      <MermaidImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
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
