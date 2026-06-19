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
        {/* Hidden Sheet Tabs UI as per user request to use draw.io's internal pages */}
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
