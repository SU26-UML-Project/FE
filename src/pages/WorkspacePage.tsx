import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useWorkspaceStore } from '../stores/workspaceStore'
import { getWorkspace, upsertWorkspace, generateId } from '../utils/workspaceStore'
import WorkspaceToolbar from '../components/Workspace/WorkspaceToolbar'
import WorkspaceLayout from '../components/Workspace/WorkspaceLayout'
import type { WorkspaceSheet, WorkspaceDocument, ChatMessage, Clarification } from '../types/workspace'

export default function WorkspacePage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const store = useWorkspaceStore()

  const [aiEnabled, setAiEnabled] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [clarificationRound, setClarificationRound] = useState(0)

  useEffect(() => {
    if (!id) return
    const ws = getWorkspace(id)
    if (ws) {
      store.setCurrentWorkspace(ws)
    }
  }, [id])

  const workspace = store.currentWorkspace
  const wsName = workspace?.name ?? 'Untitled Workspace'

  const persist = useCallback(() => {
    if (workspace) {
      upsertWorkspace({
        ...workspace,
        updatedAt: new Date().toISOString(),
      })
    }
  }, [workspace])

  const handleNameChange = (name: string) => {
    if (!workspace) return
    const updated = { ...workspace, name }
    store.setCurrentWorkspace(updated)
    upsertWorkspace({ ...updated, updatedAt: new Date().toISOString() })
  }

  const handleSheetSelect = (sheetId: string) => {
    store.setActiveSheetId(sheetId)
  }

  const handleSheetAdd = () => {
    if (!workspace) return
    const newSheet: WorkspaceSheet = {
      id: generateId(),
      name: `Sheet ${workspace.sheets.length + 1}`,
      diagramType: 'blank',
      diagramXml: '',
    }
    store.addSheet(newSheet)
    persist()
  }

  const handleSheetDelete = (sheetId: string) => {
    if (!workspace || workspace.sheets.length <= 1) return
    store.deleteSheet(sheetId)
    persist()
  }

  const handleSheetRename = (sheetId: string, name: string) => {
    store.updateSheet(sheetId, { name })
    persist()
  }

  const handleXmlChange = (sheetId: string, xml: string) => {
    store.updateSheet(sheetId, { diagramXml: xml })
  }

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
    persist()
  }

  const handleRemoveDocument = (docId: string) => {
    if (!workspace) return
    store.updateWorkspace({
      documents: workspace.documents.filter((d) => d.id !== docId),
    })
    persist()
  }

  const handleSave = () => {
    persist()
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
        onBack={() => navigate('/dashboard')}
        onSave={handleSave}
        onExport={handleExport}
        aiEnabled={aiEnabled}
        onAiToggle={setAiEnabled}
      />
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
        onXmlChange={handleXmlChange}
        onSendMessage={handleSendMessage}
        onStopGeneration={handleStopGeneration}
        onClarificationAnswer={handleClarificationAnswer}
        onAddDocuments={handleAddDocuments}
        onRemoveDocument={handleRemoveDocument}
      />
    </div>
  )
}
