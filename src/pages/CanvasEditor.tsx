import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { GraphCanvas } from '../components/Canvas/GraphCanvas'
import { MermaidImportDialog } from '../components/Canvas/MermaidImportDialog'
import { ShapePanel } from '../components/Canvas/ShapePanel'
import { PropsPanel } from '../components/Canvas/PropsPanel'
import { useCanvasStore } from '../stores/canvasStore'
import { parseMermaid } from '../utils/mermaid/parser'
import { applyLayout } from '../utils/mermaid/layout'

const CanvasEditor = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [importOpen, setImportOpen] = useState(false)
  const [showProps, setShowProps] = useState(true)
  const diagramName = useCanvasStore((s) => s.diagramName)
  const setDiagramName = useCanvasStore((s) => s.setDiagramName)
  const loadDiagram = useCanvasStore((s) => s.loadDiagram)
  const clearCanvas = useCanvasStore((s) => s.clearCanvas)

  useEffect(() => {
    const templateId = searchParams.get('template')
    if (templateId) {
      import(`../templates/${templateId}/content.json`)
        .then((mod) => {
          const { nodes, edges, name } = mod.default
          loadDiagram(nodes, edges, name)
        })
        .catch(() => {})
      return
    }

    const importCode = searchParams.get('import')
    if (importCode) {
      try {
        const decoded = decodeURIComponent(importCode)
        const { nodes, edges, name, type } = parseMermaid(decoded)
        if (nodes.length > 0) {
          const laidOut = applyLayout(nodes, edges)
          loadDiagram(laidOut, edges, name, type)
        }
      } catch (e) {
        console.error('Failed to import from URL param:', e)
      }
    }
  }, [searchParams, loadDiagram])

  return (
    <div className="h-screen flex flex-col bg-white">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-200 bg-gray-50 shrink-0">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-1.5 hover:bg-gray-200 rounded transition-colors"
          title="Back"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5m7-7-7 7 7 7" />
          </svg>
        </button>
        <span className="w-px h-4 bg-gray-300" />
        <span className="text-xs font-bold text-gray-500 tracking-wider select-none mr-1">DiaUML Studio</span>
        <span className="w-px h-4 bg-gray-300" />
        <input
          value={diagramName}
          onChange={(e) => setDiagramName(e.target.value)}
          className="text-sm font-medium bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none px-1 py-0.5"
        />
        <div className="flex-1" />
        <button
          onClick={() => setImportOpen(true)}
          className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100 transition-colors flex items-center gap-1"
          title="Import Mermaid"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4m4-5 5 5 5-5m-5-5v12" />
          </svg>
          Mermaid
        </button>
        <button
          onClick={() => setShowProps(p => !p)}
          className={`text-xs px-2 py-1 rounded transition-colors ${showProps ? 'bg-gray-200 text-gray-700' : 'text-gray-500 hover:text-gray-700'}`}
          title={showProps ? 'Hide properties' : 'Show properties'}
        >
          Props
        </button>
        <button
          onClick={clearCanvas}
          className="text-xs px-2 py-1 text-gray-500 hover:text-red-500 transition-colors"
          title="Clear canvas"
        >
          Clear
        </button>
      </div>
      <div className="flex-1 flex overflow-hidden">
        <ShapePanel />
        <div className="flex-1 relative">
          <GraphCanvas />
        </div>
        {showProps && <PropsPanel />}
      </div>
      <div className="h-6 border-t border-gray-200 bg-gray-50/50 flex items-center justify-center shrink-0">
        <span className="text-[10px] text-gray-400 tracking-wider select-none">
          DiaUML Studio | Canvas
        </span>
      </div>
      <MermaidImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  )
}

export default CanvasEditor
