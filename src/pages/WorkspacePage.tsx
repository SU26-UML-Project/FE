import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useWorkspaceStore } from '../stores/workspaceStore'
import { useCanvasStore } from '../stores/canvasStore'
import { projectService } from '../services/projectService'
import { sheetService } from '../services/sheetService'
import { anythingllmService } from '../services/anythingllmService'
import WorkspaceToolbar from '../components/Workspace/WorkspaceToolbar'
import WorkspaceLayout from '../components/Workspace/WorkspaceLayout'
import type { WorkspaceDocument, ChatMessage, Clarification } from '../types/workspace'
import type { DiagramChatRequest, DiagramChatResponse } from '../types/ai'
import toast from 'react-hot-toast'

export default function WorkspacePage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const store = useWorkspaceStore()

  const [aiEnabled, setAiEnabled] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [clarificationRound, setClarificationRound] = useState(0)
  const [sessionId, setSessionId] = useState<string | undefined>(undefined)
  const [showExitDialog, setShowExitDialog] = useState(false)
  const pendingNavigationRef = useRef<(() => void) | null>(null)

  const setLocked = useCanvasStore(s => s.setLocked)

  useEffect(() => {
    setLocked(isProcessing)
  }, [isProcessing, setLocked])

  useEffect(() => {
    if (!id) return
    const fetchWorkspace = async () => {
      try {
        const [projRes, sheetsRes] = await Promise.all([
          projectService.getProjectById(id),
          sheetService.getSheetsByProject(id)
        ]);

        const p = projRes.result;
        let sheets = (sheetsRes.result || []).map(s => ({
          ...s,
          canvasData: typeof s.diagramData === 'string' ? JSON.parse(s.diagramData) : (s.diagramData || { nodes: [], edges: [] })
        }));

        // If no sheets, create a default one via API to get a real UUID
        if (sheets.length === 0) {
          try {
            const createSheetRes = await sheetService.createSheet({
              projectId: id,
              name: 'Diagram 1',
              diagramType: 'blank',
              diagramData: JSON.stringify({ nodes: [], edges: [] })
            });
            if (createSheetRes.result) {
              const newSheet = createSheetRes.result;
              sheets = [{
                ...newSheet,
                canvasData: typeof newSheet.diagramData === 'string' ? JSON.parse(newSheet.diagramData) : (newSheet.diagramData || { nodes: [], edges: [] })
              }];
            }
          } catch (e) {
            console.error('Failed to create initial sheet:', e);
            // Fallback only if API fails, but user warned against this
            sheets = [{
              id: 'fallback-uuid-please-refresh',
              name: 'Diagram 1',
              diagramType: 'blank',
              canvasData: { nodes: [], edges: [] } as any,
            }];
          }
        }

        const workspaceData = {
          id: p.id,
          name: p.projectName,
          category: p.description || 'general',
          type: 'user' as const,
          documents: [],
          sheets: sheets,
          aiContext: { intent: '', clarifications: [], history: [] },
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        };
        store.setCurrentWorkspace(workspaceData);
        store.setActiveSheetId(sheets[0].id);
      } catch (error: any) {
        toast.error(error.message || 'Failed to load workspace');
        navigate('/dashboard');
      }
    };
    fetchWorkspace();
  }, [id])

  const workspace = store.currentWorkspace
  const wsName = workspace?.name ?? 'Untitled Workspace'

  const handleNameChange = async (name: string) => {
    if (!workspace || !id) return
    try {
      const response = await projectService.updateProject(id, {
        projectName: name,
        description: workspace.category,
      });
      if (response.code === 200) {
        store.updateWorkspace({ name });
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update project name');
    }
  }

  const handleSheetSelect = (sheetId: string) => {
    store.setActiveSheetId(sheetId)
  }

  const handleSheetAdd = async () => {
    if (!id) return
    try {
      const response = await sheetService.createSheet({
        projectId: id,
        name: `Diagram ${workspace?.sheets.length ? workspace.sheets.length + 1 : 1}`,
        diagramType: 'blank',
        diagramData: JSON.stringify({ nodes: [], edges: [] }),
      })
      if (response.code === 200 && response.result) {
        const newSheet = response.result
        const mappedSheet = {
          ...newSheet,
          canvasData: typeof newSheet.diagramData === 'string' ? JSON.parse(newSheet.diagramData) : (newSheet.diagramData || { nodes: [], edges: [] })
        }
        store.addSheet(mappedSheet)
        toast.success('Sheet added')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to add sheet')
    }
  }

  const handleSheetDelete = async (sheetId: string) => {
    if (workspace && workspace.sheets.length <= 1) {
      toast.error('Cannot delete the last sheet')
      return
    }
    try {
      const response = await sheetService.deleteSheet(sheetId)
      if (response.code === 200) {
        store.deleteSheet(sheetId)
        toast.success('Sheet deleted')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete sheet')
    }
  }

  const handleSheetRename = async (sheetId: string, name: string) => {
    try {
      const response = await sheetService.updateSheet(sheetId, { name })
      if (response.code === 200) {
        store.updateSheet(sheetId, { name })
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to rename sheet')
    }
  }

  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved')
  const loadedSnapshotRef = useRef<string>('')

  // Track loaded data snapshot for dirty detection
  useEffect(() => {
    if (!workspace) return
    const sheet = workspace.sheets.find(s => s.id === store.activeSheetId)
    if (sheet?.canvasData) {
      loadedSnapshotRef.current = JSON.stringify(sheet.canvasData)
    }
  }, [store.activeSheetId, workspace])

  const hasUnsavedChanges = useCallback((): boolean => {
    const { nodes, edges } = useCanvasStore.getState()
    const current = JSON.stringify({ nodes, edges })
    return current !== loadedSnapshotRef.current
  }, [])

  // Warn on tab close / refresh
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges()) {
        e.preventDefault()
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [hasUnsavedChanges])

  const handleBack = useCallback(() => {
    if (hasUnsavedChanges()) {
      pendingNavigationRef.current = () => navigate('/dashboard')
      setShowExitDialog(true)
      return
    }
    navigate('/dashboard')
  }, [hasUnsavedChanges, navigate])

  // Auto-save on node drag stop or any canvas change
  useEffect(() => {
    const handleCanvasChange = async (e: any) => {
      if (!workspace || !store.activeSheetId) return
      const { nodes, edges } = e.detail
      
      // Update local store state immediately
      const updatedSheets = workspace.sheets.map(s => {
        if (s.id === store.activeSheetId) {
          return { ...s, canvasData: { nodes, edges } }
        }
        return s
      })
      store.updateWorkspace({ sheets: updatedSheets })

      // Auto-save to Backend (PATCH /sheets/{id})
    setSaveStatus('saving')
    try {
      const diagramDataStr = JSON.stringify({ nodes, edges })
      const response = await sheetService.updateSheet(store.activeSheetId, {
        diagramData: diagramDataStr,
      })
      if (response.code === 200) {
        loadedSnapshotRef.current = diagramDataStr
        setSaveStatus('saved')
      }
    } catch (error) {
        console.error('Auto-save failed:', error)
        setSaveStatus('error')
      }
    }

    window.addEventListener('canvas-data-change', handleCanvasChange)
    return () => window.removeEventListener('canvas-data-change', handleCanvasChange)
  }, [workspace, store.activeSheetId, store.updateWorkspace])

  // API — POST /api/v1/chat
  const handleSendMessage = async (message: string) => {
    if (!workspace || !store.activeSheetId) return
    
    // Auto-save current canvas state to Backend before chatting
    // This ensures Backend has the latest positions for its Merger logic
    const canvasState = useCanvasStore.getState()
    const diagramDataStr = JSON.stringify({
      nodes: canvasState.nodes,
      edges: canvasState.edges,
    })

    try {
      await sheetService.updateSheet(store.activeSheetId, {
        diagramData: diagramDataStr,
      })
      // Update local snapshot to avoid prompt for unsaved changes if any
      loadedSnapshotRef.current = diagramDataStr
    } catch (e) {
      console.error('Pre-chat auto-save failed:', e)
      // We continue anyway, but the merger might use slightly older positions
    }

    // Check for "Other" option answer
    let finalMessage = message
    
    const userMsg: ChatMessage = {
      role: 'user',
      content: finalMessage,
      timestamp: new Date().toISOString(),
    }
    
    const updatedHistory = [...workspace.aiContext.history, userMsg]
    store.updateWorkspace({
      aiContext: { ...workspace.aiContext, history: updatedHistory },
    })

    setIsProcessing(true)
    
    try {
      const request: DiagramChatRequest = {
        message: finalMessage,
        sessionId,
        sheetId: store.activeSheetId,
      }
      
      const response = await anythingllmService.sendDiagramChat(request)
      
      if (response.code === 200 && response.result) {
        const { answer, sessionId: newSessionId, newState, questions } = response.result
        
        setSessionId(newSessionId)
        
        // Map questions from BE to clarifications format
        const newClarifications = (questions || []).map(q => ({
          question: q.title,
          options: q.options,
          answer: '',
          answeredAt: ''
        }))
        
        const aiMsg: ChatMessage = {
          role: 'ai',
          content: answer,
          timestamp: new Date().toISOString(),
        }
        
        const newHistory = [...updatedHistory, aiMsg]
        
        // Update workspace context with new history and questions
        store.updateWorkspace({
          aiContext: { 
            ...workspace.aiContext, 
            history: newHistory,
            clarifications: [...workspace.aiContext.clarifications, ...newClarifications]
          },
        })

        // Point to the latest unanswered clarification
        const allClarifications = [...workspace.aiContext.clarifications, ...newClarifications]
        const unansweredIndex = allClarifications.findIndex(c => !c.answer)
        if (unansweredIndex !== -1) {
          setClarificationRound(unansweredIndex)
        }

        // Update Canvas if newState is provided
        if (newState) {
          try {
            const parsedState = typeof newState === 'string' ? JSON.parse(newState) : newState
            if (parsedState && parsedState.nodes) {
              // We use setTimeout to ensure store updates don't conflict
              setTimeout(() => {
                useCanvasStore.getState().loadDiagram(
                  parsedState.nodes,
                  parsedState.edges || [],
                  useCanvasStore.getState().diagramName,
                  useCanvasStore.getState().diagramType
                )
              }, 0)
            }
          } catch (e) {
            console.error('Failed to parse newState JSON:', e)
          }
        }
      } else {
        toast.error(response.message || 'AI processing failed')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to connect to AI service')
    } finally {
      setIsProcessing(false)
    }
  }

  // API — Answer a question from AI
  const handleClarificationAnswer = (answer: string) => {
    if (!workspace) return

    // Update the answer in local state
    const updatedClarifications = [...workspace.aiContext.clarifications]
    if (updatedClarifications[clarificationRound]) {
      updatedClarifications[clarificationRound].answer = answer
      updatedClarifications[clarificationRound].answeredAt = new Date().toISOString()
    }

    store.updateWorkspace({
      aiContext: { ...workspace.aiContext, clarifications: updatedClarifications },
    })

    // Send the answer as a new message to continue the flow
    handleSendMessage(answer)
  }

  const handleAddDocuments = (docs: WorkspaceDocument[]) => {
    if (!workspace) return
    store.updateWorkspace({
      documents: [...workspace.documents, ...docs],
    })
  }

  const handleRemoveDocument = (docId: string) => {
    if (!workspace) return
    store.updateWorkspace({
      documents: workspace.documents.filter((d) => d.id !== docId),
    })
  }

  const handleSave = async () => {
    if (!workspace || !id || !store.activeSheetId) return

    // Snapshot current canvas into active sheet
    const canvasState = useCanvasStore.getState()
    const activeSheet = workspace.sheets.find(s => s.id === store.activeSheetId)
    
    if (!activeSheet) return

    const diagramDataStr = JSON.stringify({
      nodes: canvasState.nodes,
      edges: canvasState.edges,
    })

    try {
      const response = await sheetService.updateSheet(store.activeSheetId, {
        diagramData: diagramDataStr,
      })
      
      if (response.code === 200) {
        // Update local store
        activeSheet.canvasData = {
          nodes: canvasState.nodes,
          edges: canvasState.edges,
        }
        loadedSnapshotRef.current = diagramDataStr
        toast.success('Workspace saved')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to save diagram')
    }
  }

  const handleSaveAndExit = useCallback(async () => {
    await handleSave()
    setShowExitDialog(false)
    pendingNavigationRef.current?.()
    pendingNavigationRef.current = null
  }, [handleSave])

  const handleDiscardAndExit = useCallback(() => {
    setShowExitDialog(false)
    pendingNavigationRef.current?.()
    pendingNavigationRef.current = null
  }, [])

  const handleCancelExit = useCallback(() => {
    setShowExitDialog(false)
    pendingNavigationRef.current = null
  }, [])

  const handleStopGeneration = () => {
    setIsProcessing(false)
  }

  const handleExport = () => {
    // TODO: Export functionality
  }

  if (!workspace) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-uml-blue border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-500">Loading workspace...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <WorkspaceToolbar
        workspaceName={wsName}
        onNameChange={handleNameChange}
        onBack={handleBack}
        onSave={handleSave}
        onExport={handleExport}
        aiEnabled={aiEnabled}
        onAiToggle={setAiEnabled}
      />
      {saveStatus !== 'saved' && (
        <div className="bg-white px-4 py-1 border-b border-gray-200 flex items-center justify-end gap-2 fixed top-[72px] right-0 z-50 rounded-bl-lg shadow-sm">
          {saveStatus === 'saving' && (
            <span className="text-[10px] text-uml-blue font-bold uppercase animate-pulse">● Saving...</span>
          )}
          {saveStatus === 'error' && (
            <span className="text-[10px] text-red-500 font-bold uppercase">! Connection error</span>
          )}
        </div>
      )}
      <div className="flex-1 overflow-hidden">
        <WorkspaceLayout
          sheets={workspace.sheets}
          activeSheetId={store.activeSheetId}
          documents={workspace.documents}
          chatHistory={workspace.aiContext.history}
          clarification={workspace.aiContext.clarifications[clarificationRound] ?? null}
          clarificationRound={clarificationRound}
          aiIntent={workspace.aiContext.intent}
          aiClarifications={workspace.aiContext.clarifications}
          aiEnabled={aiEnabled}
          isProcessing={isProcessing}
          onSheetSelect={handleSheetSelect}
          onSheetAdd={handleSheetAdd}
          onSheetDelete={handleSheetDelete}
          onSheetRename={handleSheetRename}
          onSendMessage={handleSendMessage}
          onStopGeneration={handleStopGeneration}
          onClarificationAnswer={handleClarificationAnswer}
          onAddDocuments={handleAddDocuments}
          onRemoveDocument={handleRemoveDocument}
        />
      </div>
      <footer className="h-6 bg-gradient-to-r from-uml-blue/5 to-blue-700/5 border-t border-blue-200/20 flex items-center justify-center shrink-0 select-none">
        <span className="text-[10px] text-gray-400 font-medium tracking-wide">DiaUML Studio | Canvas</span>
      </footer>

      {showExitDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-96 mx-4">
            <h3 className="text-base font-semibold text-gray-800 mb-2">Unsaved Changes</h3>
            <p className="text-sm text-gray-500 mb-6">
              You have unsaved changes in your diagrams. Save before leaving?
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={handleCancelExit}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 rounded-md hover:bg-gray-100 transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDiscardAndExit}
                className="px-4 py-2 text-sm text-red-600 hover:text-red-800 rounded-md hover:bg-red-50 transition font-medium"
              >
                Discard
              </button>
              <button
                onClick={handleSaveAndExit}
                className="px-4 py-2 text-sm font-bold text-white bg-uml-blue rounded-md hover:bg-blue-700 transition shadow-sm"
              >
                Save & Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
