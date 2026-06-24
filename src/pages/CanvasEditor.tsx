import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Save } from 'lucide-react'
import { motion } from 'framer-motion'
import { GraphCanvas } from '../components/Canvas/GraphCanvas'
import { MermaidImportDialog } from '../components/Canvas/MermaidImportDialog'
import { ShapePanel } from '../components/Canvas/ShapePanel'
import { PropsPanel } from '../components/Canvas/PropsPanel'
import { useCanvasStore } from '../stores/canvasStore'
import { projectService } from '../services/projectService'
import { sheetService } from '../services/sheetService'
import { parseMermaid } from '../utils/mermaid/parser'
import { applyLayout } from '../utils/mermaid/layout'
import toast from 'react-hot-toast'

const CanvasEditor = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [importOpen, setImportOpen] = useState(false)
  const [showProps, setShowProps] = useState(true)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [wsName, setWsName] = useState('')
  const diagramName = useCanvasStore((s) => s.diagramName)
  const setDiagramName = useCanvasStore((s) => s.setDiagramName)
  const loadDiagram = useCanvasStore((s) => s.loadDiagram)
  const clearCanvas = useCanvasStore((s) => s.clearCanvas)

  const projectId = searchParams.get('projectId')
  const sheetId = searchParams.get('sheetId')
  const isDraft = searchParams.get('draft') === 'true'

  // Load existing draft from URL params
  useEffect(() => {
    if (!projectId || !sheetId) return

    const loadProject = async () => {
      try {
        const projRes = await projectService.getProjectById(projectId)
        const proj = projRes.result
        if (proj) {
          setDiagramName(proj.projectName)
        }

        const sheetRes = await sheetService.getSheetsByProject(projectId)
        const sheets = sheetRes.result || []
        const sheet = sheets.find(s => s.id === sheetId) || sheets[0]
        if (sheet) {
          const raw: any = sheet
          let canvasData = raw.canvasData || null
          if (raw.diagramData) {
            canvasData = typeof raw.diagramData === 'string' ? JSON.parse(raw.diagramData) : raw.diagramData
          }
          if (canvasData?.nodes) {
            loadDiagram(canvasData.nodes, canvasData.edges || [], proj?.projectName || sheet.name)
          }
        }
      } catch (e) {
        console.error('Failed to load draft project:', e)
      }
    }

    loadProject()
  }, [projectId, sheetId, loadDiagram, setDiagramName])

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
  }, []) // Only on mount

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
      const canvasState = useCanvasStore.getState()
      const diagramDataStr = JSON.stringify({
        nodes: canvasState.nodes,
        edges: canvasState.edges,
      })

      if (projectId && sheetId) {
        const res = await sheetService.updateSheet(sheetId, { diagramData: diagramDataStr })
        if (res.code === 200) {
          toast.success('Saved')
        }
      } else {
        setShowSaveDialog(true)
        return
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }, [projectId, sheetId])

  const handleSaveAsDraft = async () => {
    setIsSaving(true)
    try {
      const canvasState = useCanvasStore.getState()
      const diagramDataStr = JSON.stringify({
        nodes: canvasState.nodes,
        edges: canvasState.edges,
      })

      const projRes = await projectService.createProject({
        projectName: wsName.trim() || diagramName || 'Untitled Draft',
        description: 'draft',
        isDraft: true,
      })

      if (projRes.code === 200 && projRes.result) {
        const newProjectId = projRes.result.id
        const sheetRes = await sheetService.createSheet({
          projectId: newProjectId,
          name: diagramName || 'Diagram',
          diagramData: diagramDataStr,
        })

        if (sheetRes.code === 200 && sheetRes.result) {
          const newSheetId = sheetRes.result.id
          const params = new URLSearchParams(searchParams.toString())
          params.set('projectId', newProjectId)
          params.set('sheetId', newSheetId)
          params.set('draft', 'true')
          navigate(`/canvas?${params.toString()}`, { replace: true })
          toast.success('Draft saved')
        }
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to save as draft')
    } finally {
      setIsSaving(false)
      setShowSaveDialog(false)
    }
  }

  const handleCreateWorkspace = async () => {
    setIsSaving(true)
    try {
      const canvasState = useCanvasStore.getState()
      const diagramDataStr = JSON.stringify({
        nodes: canvasState.nodes,
        edges: canvasState.edges,
      })

      const projRes = await projectService.createProject({
        projectName: wsName.trim() || diagramName || 'Untitled Workspace',
        isDraft: false,
      })

      if (projRes.code === 200 && projRes.result) {
        const newProjectId = projRes.result.id
        const sheetRes = await sheetService.createSheet({
          projectId: newProjectId,
          name: diagramName || 'Diagram',
          diagramData: diagramDataStr,
        })

        if (sheetRes.code === 200 && sheetRes.result) {
          navigate(`/workspace/${newProjectId}`)
          toast.success('Workspace created')
        }
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to create workspace')
    } finally {
      setIsSaving(false)
      setShowSaveDialog(false)
    }
  }

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
          placeholder="Diagram name"
          className="text-sm font-medium bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none px-1 py-0.5"
        />
        {projectId && isDraft && (
          <>
            <span className="w-px h-4 bg-gray-300" />
            <span className="px-2 py-1 rounded-[4px] text-[10px] font-black uppercase tracking-widest border bg-amber-100 text-amber-700 border-amber-200 shadow-sm">
              Draft
            </span>
          </>
        )}
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
          onClick={handleSave}
          disabled={isSaving}
          className="text-xs px-2.5 py-1 bg-uml-blue text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-1 font-medium disabled:opacity-50"
        >
          <Save size={12} />
          Save
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

      {showSaveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowSaveDialog(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4"
          >
            <h2 className="text-base font-semibold text-black mb-2">Save Diagram</h2>
            <p className="text-sm text-gray-500 mb-4">This diagram hasn't been saved yet. Give it a name to continue.</p>
            <input
              value={wsName}
              onChange={e => setWsName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSaveAsDraft() }}
              placeholder="Diagram name"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-uml-blue focus:ring-1 focus:ring-uml-blue/20 mb-6"
              autoFocus
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 rounded-md hover:bg-gray-100 transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAsDraft}
                disabled={isSaving}
                className="px-4 py-2 text-sm font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-md hover:bg-amber-100 transition disabled:opacity-50"
              >
                Save as Draft
              </button>
              <button
                onClick={handleCreateWorkspace}
                disabled={isSaving}
                className="px-4 py-2 text-sm font-bold text-white bg-uml-blue rounded-md hover:bg-blue-700 transition disabled:opacity-50"
              >
                Create Workspace
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

export default CanvasEditor