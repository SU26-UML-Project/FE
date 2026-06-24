import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useWorkspaceStore } from '../stores/workspaceStore'
import { useCanvasStore } from '../stores/canvasStore'
import { projectService } from '../services/projectService'
import WorkspaceToolbar from '../components/Workspace/WorkspaceToolbar'
import WorkspaceLayout from '../components/Workspace/WorkspaceLayout'
import type { WorkspaceDocument, ChatMessage, Clarification } from '../types/workspace'
import toast from 'react-hot-toast'

export default function WorkspacePage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const store = useWorkspaceStore()

  const [aiEnabled, setAiEnabled] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [clarificationRound, setClarificationRound] = useState(0)

  useEffect(() => {
    if (!id) return
    const fetchWorkspace = async () => {
      try {
        const response = await projectService.getProjectById(id);
        const p = response.result;
        const workspaceData = {
          id: p.id,
          name: p.projectName,
          category: p.description || 'general',
          type: 'user' as const,
          documents: [],
          sheets: [
            {
              id: 'default-sheet',
              name: 'Diagram',
              diagramType: 'blank',
              canvasData: { nodes: [], edges: [] },
            }
          ],
          aiContext: { intent: '', clarifications: [], history: [] },
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        };
        store.setCurrentWorkspace(workspaceData);
        store.setActiveSheetId('default-sheet');
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
    toast.error('Multiple sheets are handled internally by the diagram editor.');
  }

  const handleSheetDelete = async (sheetId: string) => {
    toast.error('Sheet management is handled internally by the diagram editor.');
  }

  const handleSheetRename = async (sheetId: string, name: string) => {
    // Internally rename if needed
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
      const confirmed = window.confirm('You have unsaved changes. Do you want to save before leaving?')
      if (!confirmed) return
    }
    navigate('/dashboard')
  }, [hasUnsavedChanges, navigate])

  // TODO: API — POST /api/ai/chat
  const handleSendMessage = (message: string) => {
    if (!workspace) return
    const userMsg: ChatMessage = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    }
    const updatedHistory = [...workspace.aiContext.history, userMsg]
    store.updateWorkspace({
      aiContext: { ...workspace.aiContext, history: updatedHistory },
    })

    setIsProcessing(true)
    setTimeout(() => {
      const aiMsg: ChatMessage = {
        role: 'ai',
        content: `Thanks for your input. I understand you're interested in "${message}". Based on the project context, I can help you create UML diagrams. What specific aspect would you like to model?`,
        timestamp: new Date().toISOString(),
      }
      const newHistory = [...updatedHistory, aiMsg]
      store.updateWorkspace({
        aiContext: { ...workspace.aiContext, history: newHistory },
      })
      setIsProcessing(false)
    }, 1500)
  }

  // TODO: API — POST /api/ai/clarify
  const handleClarificationAnswer = (answer: string) => {
    if (!workspace) return
    const newRound = clarificationRound + 1
    setClarificationRound(newRound)

    const clarification: Clarification = {
      question: workspace.aiContext.clarifications[clarificationRound]?.question ?? '',
      options: workspace.aiContext.clarifications[clarificationRound]?.options ?? [],
      answer,
      answeredAt: new Date().toISOString(),
    }

    const updatedClarifications = [...workspace.aiContext.clarifications, clarification]
    store.updateWorkspace({
      aiContext: { ...workspace.aiContext, clarifications: updatedClarifications },
    })

    if (newRound < 3) {
      setTimeout(() => {
        const nextClarification: Clarification = {
          question: 'What type of diagram would best represent this part of your system?',
          options: ['Use Case', 'Class Diagram', 'Sequence Diagram', 'C4 Context'],
          answer: '',
          answeredAt: '',
        }
        const nextClarifications = [...updatedClarifications, nextClarification]
        store.updateWorkspace({
          aiContext: { ...workspace.aiContext, clarifications: nextClarifications },
        })
      }, 1000)
    }
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
    if (!workspace || !id) return

    // Snapshot current canvas into active sheet
    const canvasState = useCanvasStore.getState()
    const activeSheet = workspace.sheets.find(s => s.id === store.activeSheetId)
    if (activeSheet) {
      activeSheet.canvasData = {
        nodes: canvasState.nodes,
        edges: canvasState.edges,
      }
    }

    try {
      const response = await projectService.updateProject(id, {
        projectName: wsName,
        description: workspace.category,
        projectData: JSON.stringify(workspace.sheets.map(s => ({
          id: s.id,
          name: s.name,
          diagramType: s.diagramType,
          canvasData: s.canvasData,
        }))),
      });
      if (response.code === 200) {
        toast.success('Workspace saved');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to save');
    }
  }

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
    </div>
  )
}
