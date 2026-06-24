import { Group, Panel, Separator } from 'react-resizable-panels'
import CanvasPanel from './CanvasPanel'
import AIChatPanel from './AIChatPanel'
import type { WorkspaceSheet, WorkspaceDocument, ChatMessage, Clarification } from '../../types/workspace'
import type { ChatSession } from '../../types/ai'

interface WorkspaceLayoutProps {
  sheets: WorkspaceSheet[]
  activeSheetId: string | null
  documents: WorkspaceDocument[]
  chatHistory: ChatMessage[]
  clarification: Clarification | null
  clarificationRound: number
  aiEnabled: boolean
  aiIntent: string
  aiClarifications: Clarification[]
  isProcessing: boolean
  sessions?: ChatSession[]
  currentSessionId?: string | null
  onSheetSelect: (id: string) => void
  onSheetAdd: () => void
  onSheetDelete: (id: string) => void
  onSheetRename: (id: string, name: string) => void
  onSendMessage: (message: string) => void
  onStopGeneration: () => void
  onClarificationAnswer: (answer: string) => void
  onAddDocuments: (docs: WorkspaceDocument[]) => void
  onRemoveDocument: (id: string) => void
  onSessionSelect?: (id: string) => void
  onNewSession?: () => void
}

export default function WorkspaceLayout({
  sheets,
  activeSheetId,
  documents,
  chatHistory,
  clarification,
  clarificationRound,
  aiEnabled,
  aiIntent,
  aiClarifications,
  isProcessing,
  sessions = [],
  currentSessionId = null,
  onSheetSelect,
  onSheetAdd,
  onSheetDelete,
  onSheetRename,
  onSendMessage,
  onStopGeneration,
  onClarificationAnswer,
  onAddDocuments,
  onRemoveDocument,
  onSessionSelect,
  onNewSession,
}: WorkspaceLayoutProps) {
  return (
    <Group orientation="horizontal" className="flex-1 overflow-hidden">
      <Panel id="canvas-area" defaultSize={72} minSize={40}>
        <CanvasPanel
          sheets={sheets}
          activeSheetId={activeSheetId}
          onSheetSelect={onSheetSelect}
          onSheetAdd={onSheetAdd}
          onSheetDelete={onSheetDelete}
          onSheetRename={onSheetRename}
        />
      </Panel>
      <Separator className="w-1 bg-gray-100 hover:bg-uml-blue/30 transition cursor-col-resize" />
      {aiEnabled && (
        <Panel id="ai-chat" defaultSize={28} minSize={18}>
          <AIChatPanel
              history={chatHistory}
              isProcessing={isProcessing}
              intent={aiIntent}
              clarifications={aiClarifications}
              documents={documents}
              sessions={sessions}
              currentSessionId={currentSessionId}
              onSendMessage={onSendMessage}
              onStopGeneration={onStopGeneration}
              onAddDocuments={onAddDocuments}
              onRemoveDocument={onRemoveDocument}
              onSessionSelect={onSessionSelect}
              onNewSession={onNewSession}
          />
        </Panel>
      )}
    </Group>
  )
}
