import { useState, useRef, useEffect } from 'react'
import { Bot, Send, Square, User, ChevronDown, ChevronRight, Target, MessageSquare, Paperclip } from 'lucide-react'
import QuestionBox from './QuestionBox'
import FilePanel from './FilePanel'
import type { ChatMessage, Clarification, WorkspaceDocument } from '../../types/workspace'

interface AIChatPanelProps {
  history: ChatMessage[]
  clarification: Clarification | null
  clarificationRound: number
  isProcessing: boolean
  intent: string
  clarifications: Clarification[]
  documents: WorkspaceDocument[]
  onSendMessage: (message: string) => void
  onStopGeneration: () => void
  onClarificationAnswer: (answer: string) => void
  onAddDocuments: (docs: WorkspaceDocument[]) => void
  onRemoveDocument: (id: string) => void
}

const MAX_CLARIFICATION_ROUNDS = 3

export default function AIChatPanel({
  history,
  clarification,
  clarificationRound,
  isProcessing,
  intent,
  clarifications,
  documents,
  onSendMessage,
  onStopGeneration,
  onClarificationAnswer,
  onAddDocuments,
  onRemoveDocument,
}: AIChatPanelProps) {
  const [input, setInput] = useState('')
  const [contextOpen, setContextOpen] = useState(true)
  const [filesOpen, setFilesOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history, clarification])

  const handleSubmit = () => {
    if (input.trim() && !isProcessing) {
      onSendMessage(input.trim())
      setInput('')
    }
  }

  const hasContext = intent || clarifications.length > 0

  return (
    <div className="flex flex-col h-full bg-gray-100 p-2">
      <div className="flex-1 flex flex-col bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden min-h-0">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-uml-blue/10 flex items-center justify-center">
              <Bot size={15} className="text-uml-blue" />
            </div>
            <span className="text-sm font-bold text-gray-900">AI Assistant</span>
          </div>
        </div>

        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {hasContext && (
            <div className="border-b border-gray-100">
              <button
                onClick={() => setContextOpen(!contextOpen)}
                className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition"
              >
                {contextOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                AI Context
              </button>
              {contextOpen && (
                <div className="px-4 pb-3 space-y-2">
                  {intent && (
                    <div className="flex items-start gap-2 text-xs bg-blue-50 rounded-lg p-2.5">
                      <Target size={14} className="text-uml-blue shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-uml-blue">Detected Intent:</span>
                        <p className="text-gray-700 mt-0.5">{intent}</p>
                      </div>
                    </div>
                  )}
                  {clarifications.length > 0 && (
                    <div className="space-y-1.5">
                      {clarifications.map((c, i) => (
                        c.answer ? (
                          <div key={i} className="flex items-start gap-2 text-xs bg-amber-50 rounded-lg p-2.5">
                            <MessageSquare size={14} className="text-amber-500 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold text-amber-600">#{i + 1}:</span>
                              <span className="text-gray-600"> {c.question}</span>
                              <p className="text-gray-800 mt-0.5">→ {c.answer}</p>
                            </div>
                          </div>
                        ) : null
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          <div className="px-4 py-3 space-y-4">
            {history.length === 0 && !clarification && (
              <div className="text-center py-12">
                <Bot size={36} className="text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-400 font-medium">Describe your system or ask a question to get started.</p>
              </div>
            )}
            {history.map((msg, i) => (
              <div key={i} className={`flex items-start gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                  msg.role === 'ai' ? 'bg-uml-blue/10 text-uml-blue' : 'bg-gray-100 text-gray-500'
                }`}>
                  {msg.role === 'ai' ? <Bot size={14} /> : <User size={14} />}
                </div>
                <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm ${
                  msg.role === 'ai'
                    ? 'bg-gray-50 border border-gray-100 text-gray-800'
                    : 'bg-uml-blue text-white rounded-br-md'
                }`}>
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  <p className={`text-[10px] mt-1.5 ${
                    msg.role === 'ai' ? 'text-gray-400' : 'text-blue-200'
                  }`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            {isProcessing && (
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-full bg-uml-blue/10 flex items-center justify-center shrink-0">
                  <Bot size={14} className="text-uml-blue" />
                </div>
                <div className="w-14 h-10 rounded-xl bg-gradient-to-br from-blue-300/60 via-uml-blue/40 via-purple-400/30 via-emerald-300/30 to-blue-300/60 animate-gradient-swirl bg-[length:400%_400%] shadow-lg shadow-uml-blue/15 ring-1 ring-white/10" />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Files section - collapsible */}
        <div className="border-t border-gray-100 shrink-0">
          <button
            onClick={() => setFilesOpen(!filesOpen)}
            className="w-full flex items-center justify-between px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition"
          >
            <div className="flex items-center gap-2">
              <Paperclip size={13} />
              Attachments
              {documents.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-bold">
                  {documents.length}
                </span>
              )}
            </div>
            {filesOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          {filesOpen && (
            <div className="px-4 pb-3">
              <FilePanel
                documents={documents}
                onAddDocuments={onAddDocuments}
                onRemoveDocument={onRemoveDocument}
                compact
              />
            </div>
          )}
        </div>

        {/* Question Box */}
        {clarification && (
          <div className="shrink-0">
            <QuestionBox
              clarification={clarification}
              onAnswer={onClarificationAnswer}
              round={clarificationRound}
              maxRounds={MAX_CLARIFICATION_ROUNDS}
            />
          </div>
        )}

        {/* Input */}
        <div className="border-t border-gray-100 px-3 py-2.5 shrink-0">
          <div className="flex items-center gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() } }}
              placeholder="Ask anything..."
              disabled={isProcessing}
              className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-uml-blue focus:ring-1 focus:ring-uml-blue/20 disabled:opacity-50 placeholder-gray-400"
            />
            {isProcessing ? (
              <button
                onClick={onStopGeneration}
                className="p-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition shrink-0"
                title="Stop generating"
              >
                <Square size={15} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!input.trim()}
                className="p-2 rounded-lg bg-uml-blue text-white hover:bg-blue-700 transition disabled:opacity-50 shrink-0"
              >
                <Send size={15} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
