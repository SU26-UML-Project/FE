import { useEffect, useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'
import CanvasFrame from '../Canvas/CanvasFrame'
import type { WorkspaceSheet } from '../../types/workspace'

interface CanvasPanelProps {
  sheets: WorkspaceSheet[]
  activeSheetId: string | null
  onSheetSelect: (id: string) => void
  onSheetAdd: () => void
  onSheetDelete: (id: string) => void
  onSheetRename: (id: string, name: string) => void
  onXmlChange?: (sheetId: string, xml: string) => void
}

export default function CanvasPanel({
  sheets,
  activeSheetId,
  onSheetSelect,
  onSheetAdd,
  onSheetDelete,
  onSheetRename,
  onXmlChange,
}: CanvasPanelProps) {
  const activeSheet = sheets.find((s) => s.id === activeSheetId) ?? sheets[0]
  const [editingSheetId, setEditingSheetId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingSheetId && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingSheetId])

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

  const handleXmlChange = (xml: string) => {
    if (activeSheet && onXmlChange) {
      onXmlChange(activeSheet.id, xml)
    }
  }

  return (
    <div className="flex flex-col h-full bg-gray-100 p-2">
      <div className="flex-1 flex flex-col bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="flex items-center border-b border-gray-200 bg-gray-50/50 shrink-0 overflow-x-auto">
          {sheets.map((sheet) => (
            <div
              key={sheet.id}
              className={`group flex items-center gap-1.5 px-3 py-2 cursor-pointer border-r border-gray-200 text-sm transition-colors shrink-0 ${
                sheet.id === (activeSheetId ?? sheets[0]?.id)
                  ? 'bg-white text-black font-bold border-t-2 border-t-uml-blue'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
              }`}
              onClick={() => onSheetSelect(sheet.id)}
            >
              {editingSheetId === sheet.id ? (
                <input
                  ref={inputRef}
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onBlur={handleSheetNameSubmit}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSheetNameSubmit()
                    if (e.key === 'Escape') setEditingSheetId(null)
                  }}
                  className="text-xs font-bold bg-white border border-gray-300 rounded px-1 py-0.5 w-24 focus:outline-none focus:border-uml-blue"
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                <span
                  className="text-xs font-bold uppercase tracking-wider"
                  onDoubleClick={() => handleSheetDblClick(sheet)}
                >
                  {sheet.name}
                </span>
              )}
              {sheets.length > 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); onSheetDelete(sheet.id) }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-gray-200 text-gray-400 hover:text-red-500 transition"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={onSheetAdd}
            className="flex items-center gap-1 px-3 py-2 text-xs font-bold text-gray-400 hover:text-uml-blue hover:bg-gray-100 transition shrink-0"
          >
            <Plus size={14} />
            Add Sheet
          </button>
        </div>
        <div className="flex-1 relative">
          {activeSheet ? (
            <CanvasFrame
              xml={activeSheet.diagramXml || undefined}
              onXmlChange={handleXmlChange}
              onSave={handleXmlChange}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <p className="text-sm text-gray-400 font-medium mb-2">No sheets yet</p>
                <button
                  onClick={onSheetAdd}
                  className="px-4 py-2 bg-uml-blue text-white text-xs font-bold uppercase rounded-md hover:bg-blue-700 transition"
                >
                  Create First Sheet
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
