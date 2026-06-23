import { useState, useCallback } from 'react'
import { useCanvasStore } from '../../stores/canvasStore'
import { parseMermaid } from '../../utils/mermaid/parser'
import { applyLayout } from '../../utils/mermaid/layout'

interface MermaidImportDialogProps {
  open: boolean
  onClose: () => void
}

export function MermaidImportDialog({ open, onClose }: MermaidImportDialogProps) {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const loadDiagram = useCanvasStore(s => s.loadDiagram)

  const handleImport = useCallback(() => {
    if (!code.trim()) {
      setError('Please paste Mermaid code')
      return
    }
    try {
      setError(null)
      const { nodes, edges, name, type } = parseMermaid(code)
      if (nodes.length === 0) {
        setError('Could not parse any nodes from the code. Check the syntax.')
        return
      }
      const laidOutNodes = applyLayout(nodes, edges)
      loadDiagram(laidOutNodes, edges, name, type)
      onClose()
    } catch (e: any) {
      setError(e.message || 'Failed to parse Mermaid code')
    }
  }, [code, loadDiagram, onClose])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleImport()
    }
  }, [handleImport])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-[640px] max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800">Import Mermaid Diagram</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-5 space-y-3 flex-1 overflow-auto">
          <textarea
            value={code}
            onChange={e => setCode(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Paste Mermaid code...\n\ne.g.\nclassDiagram\n  class User {\n    -id: UUID\n    +login(pwd): Token\n  }\n  User --> PaymentService : uses`}
            rows={14}
            className="w-full border border-gray-300 rounded-md p-3 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
            spellCheck={false}
          />
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </div>
          )}
          <div className="text-xs text-gray-400">
            Supports: classDiagram, useCaseDiagram, sequenceDiagram, flowchart, stateDiagram, erDiagram, C4
            <span className="ml-2 text-gray-300">|</span>
            <span className="ml-2">Ctrl+Enter to import</span>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
            disabled={!code.trim()}
          >
            Import
          </button>
        </div>
      </div>
    </div>
  )
}
