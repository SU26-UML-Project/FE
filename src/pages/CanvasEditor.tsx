import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { GraphCanvas } from '../components/Canvas/GraphCanvas'
import { MermaidImportDialog } from '../components/Canvas/MermaidImportDialog'
import { PropsPanel } from '../components/Canvas/PropsPanel'
import { Sidebar } from '../components/Canvas/features/Sidebar'
import { HelpOverlay } from '../components/Canvas/features/HelpOverlay'
import CanvasToolbar from '../components/Canvas/CanvasToolbar'
import { useCanvasStore } from '../stores/canvasStore'
import { projectService } from '../services/projectService'
import { sheetService } from '../services/sheetService'
import { parseMermaid } from '../utils/mermaid/parser'
import { applyLayout } from '../utils/mermaid/layout'
import { getDiagram } from '../utils/diagrams'
import toast from 'react-hot-toast'

const CanvasEditor = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [importOpen, setImportOpen] = useState(false)
  const [showProps, setShowProps] = useState(true)
  const [showHelp, setShowHelp] = useState(false)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [showWsDialog, setShowWsDialog] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [wsName, setWsName] = useState('')

  // Canvas State
  const [zoom, setZoom] = useState(1)
  const [showGrid, setShowGrid] = useState(true)
  const [showMinimap, setShowMinimap] = useState(true)
  const [snap, setSnap] = useState(false)

  const diagramName = useCanvasStore((s) => s.diagramName)
  const diagramType = useCanvasStore((s) => s.diagramType)
  const setDiagramName = useCanvasStore((s) => s.setDiagramName)
  const setDiagramType = useCanvasStore((s) => s.setDiagramType)
  const loadDiagram = useCanvasStore((s) => s.loadDiagram)
  const clearCanvas = useCanvasStore((s) => s.clearCanvas)
  const addNode = useCanvasStore((s) => s.addNode)

  const handleSidebarAddNode = (item: any) => {
    // In a real scenario, we'd want to add to the center of the viewport
    // For now, we'll use a reasonable default or let the user drag.
    addNode(item.type, { x: 100, y: 100 })
  }

  const diagram = getDiagram(diagramType as any)

  const projectId = searchParams.get('projectId')
  const sheetId = searchParams.get('sheetId')
  const isDraft = searchParams.get('draft') === 'true'

  // Global key listener for help
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "?" && (e.target as HTMLElement).tagName !== "INPUT") {
        setShowHelp(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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
        const sheet = sheets.find((s: any) => s.id === sheetId) || sheets[0]
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

  const getDiagramDataStr = () => {
    const canvasState = useCanvasStore.getState()
    return JSON.stringify({
      nodes: canvasState.nodes,
      edges: canvasState.edges,
    })
  }

  const handleSaveAsDraft = async () => {
    setIsSaving(true)
    try {
      const diagramDataStr = getDiagramDataStr()

      const projRes = await projectService.createProject({
        projectName: wsName.trim() || diagramName || 'Untitled Draft',
        description: 'draft',
        isDraft: true,
      })

      if (projRes.code === 200 && projRes.result) {
        const newProjectId = projRes.result.id
        const defaultSheet = (projRes.result as any).sheets?.[0]

        if (defaultSheet) {
          await sheetService.updateSheet(defaultSheet.id, {
            name: diagramName || 'Diagram',
            diagramData: diagramDataStr,
          })

          clearCanvas()
          setDiagramName('Untitled Diagram')
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
      const diagramDataStr = getDiagramDataStr()

      const projRes = await projectService.createProject({
        projectName: wsName.trim() || diagramName || 'Untitled Workspace',
        isDraft: false,
      })

      if (projRes.code === 200 && projRes.result) {
        const newProjectId = projRes.result.id
        const defaultSheet = (projRes.result as any).sheets?.[0]

        if (defaultSheet) {
          await sheetService.updateSheet(defaultSheet.id, {
            name: diagramName || 'Diagram',
            diagramData: diagramDataStr,
          })
        }

        navigate(`/workspace/${newProjectId}`)
        toast.success('Workspace created')
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to create workspace')
    } finally {
      setIsSaving(false)
      setShowSaveDialog(false)
    }
  }

  const handleSaveAsWorkspace = async () => {
    if (!projectId || !sheetId) return
    setIsSaving(true)
    try {
      const diagramDataStr = getDiagramDataStr()

      await sheetService.updateSheet(sheetId, { diagramData: diagramDataStr })

      const res = await projectService.updateProject(projectId, {
        projectName: wsName.trim() || diagramName || 'Untitled Workspace',
        description: 'general',
        isDraft: false,
      })

      if (res.code === 200) {
        navigate(`/workspace/${projectId}`)
        toast.success('Workspace created')
      } else {
        toast.error('Failed to update project: unexpected response')
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to save as workspace')
    } finally {
      setIsSaving(false)
      setShowWsDialog(false)
    }
  }

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      <CanvasToolbar 
        diagramName={diagramName}
        onNameChange={setDiagramName}
        onBack={() => navigate('/dashboard')}
        onToggleCode={() => setImportOpen(true)}
        onToggleProps={() => setShowProps(!showProps)}
        onLayout={() => {}}
        isCodePanelOpen={importOpen}
        isPropsPanelOpen={showProps}
        onExportPng={() => {}}
        zoom={zoom}
        onZoomIn={() => setZoom(z => Math.min(z + 0.1, 2))}
        onZoomOut={() => setZoom(z => Math.max(z - 0.1, 0.1))}
        onZoomReset={() => setZoom(1)}
        showGrid={showGrid}
        onToggleGrid={() => setShowGrid(!showGrid)}
        showMinimap={showMinimap}
        onToggleMinimap={() => setShowMinimap(!showMinimap)}
        snap={snap}
        onToggleSnap={() => setSnap(!snap)}
        onHelp={() => setShowHelp(true)}
      />
      
      <div className="flex-1 flex overflow-hidden">
        <Sidebar 
          diagram={diagram}
          diagramType={diagramType as any}
          onDiagramChange={setDiagramType}
          onAddNode={handleSidebarAddNode}
        />
        
        <main className="flex-1 relative bg-[#fafafa]">
          <GraphCanvas 
            zoom={zoom}
            onZoomChange={setZoom}
            showGrid={showGrid}
            showMinimap={showMinimap}
            snap={snap}
          />
        </main>

        {showProps && <PropsPanel onClose={() => setShowProps(false)} />}
      </div>

      <div className="h-7 border-t border-zinc-200 bg-white flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
            DiaUML Studio
          </span>
          <button 
            onClick={() => setShowHelp(true)}
            className="text-[10px] font-bold text-zinc-400 hover:text-zinc-900 transition-colors uppercase tracking-widest"
          >
            Help / Shortcuts (?)
          </button>
        </div>
        <span className="text-[10px] text-zinc-300 font-medium">
          Ready
        </span>
      </div>

      {showHelp && <HelpOverlay onClose={() => setShowHelp(false)} />}
      
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
              placeholder="Workspace name"
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

      {showWsDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowWsDialog(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4"
          >
            <h2 className="text-base font-semibold text-black mb-2">Save to Workspace?</h2>
            <p className="text-sm text-gray-500 mb-4">This diagram is currently a draft. Create a workspace to save permanently?</p>
            <input
              value={wsName}
              onChange={e => setWsName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSaveAsWorkspace() }}
              placeholder="Workspace name"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-uml-blue focus:ring-1 focus:ring-uml-blue/20 mb-6"
              autoFocus
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowWsDialog(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 rounded-md hover:bg-gray-100 transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAsWorkspace}
                disabled={isSaving}
                className="px-4 py-2 text-sm font-bold text-white bg-uml-blue rounded-md hover:bg-blue-700 transition disabled:opacity-50"
              >
                Save as Workspace
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

export default CanvasEditor
