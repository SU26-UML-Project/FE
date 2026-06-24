import { useState } from 'react'
import {
  Bot,
  Send,
  Square,
  User,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Target,
  MessageSquare,
  Paperclip,
  History,
  Plus,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import QuestionBox from './QuestionBox'
import FilePanel from './FilePanel'
import type { ChatMessage, WorkspaceDocument } from '../../types/workspace'
import type { ChatSession } from '../../types/ai'
import { useScrollToBottom } from '../../hooks/useScrollToBottom'

interface AIChatPanelProps {
  history: ChatMessage[]
  isProcessing: boolean
  intent: string
  clarifications: any[]
  documents: WorkspaceDocument[]
  sessions?: ChatSession[]
  currentSessionId?: string | null
  onSendMessage: (message: string) => void
  onStopGeneration: () => void
  onAddDocuments: (docs: WorkspaceDocument[]) => void
  onRemoveDocument: (id: string) => void
  onSessionSelect?: (id: string) => void
  onNewSession?: () => void
}

export default function AIChatPanel({
                                      history,
                                      isProcessing,
                                      intent,
                                      clarifications,
                                      documents,
                                      sessions = [],
                                      currentSessionId = null,
                                      onSendMessage,
                                      onStopGeneration,
                                      onAddDocuments,
                                      onRemoveDocument,
                                      onSessionSelect,
                                      onNewSession,
                                    }: AIChatPanelProps) {
  const [input, setInput] = useState('')
  const [contextOpen, setContextOpen] = useState(true)
  const [filesOpen, setFilesOpen] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [answeredQuestionKeys, setAnsweredQuestionKeys] = useState<Record<string, boolean>>({})

  const messagesEndRef = useScrollToBottom(history, isProcessing)

  const hasContext = Boolean(intent) || clarifications.length > 0

  const getSessionId = (session: any): string => {
    return session?.sessionId || session?.id || ''
  }

  const formatSessionDate = (updatedAt?: string) => {
    if (!updatedAt) return ''

    try {
      return new Date(updatedAt).toLocaleDateString()
    } catch {
      return ''
    }
  }

  const formatMessageTime = (timestamp?: string) => {
    if (!timestamp) return ''

    try {
      return new Date(timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return ''
    }
  }

  const getMessageKey = (msg: ChatMessage, index: number) => {
    return `${msg.timestamp}-${index}`
  }

  const handleSubmit = () => {
    if (input.trim() && !isProcessing) {
      onSendMessage(input.trim())
      setInput('')
    }
  }

  const handleQuestionSubmit = (msg: ChatMessage, index: number, answer: string) => {
    const key = getMessageKey(msg, index)

    setAnsweredQuestionKeys(prev => ({
      ...prev,
      [key]: true,
    }))

    onSendMessage(answer)
  }

  const handleTextareaInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }

  return (
      <div className="flex flex-col h-full bg-gray-100 p-2">
        <div className="flex-1 flex flex-col bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden min-h-0 relative">
          {/* Header */}
          <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between bg-white/80 backdrop-blur-md shrink-0">
            <div className="flex items-center gap-2">
              <button
                  onClick={() => setShowHistory(true)}
                  className={`p-1.5 rounded-md transition-colors ${
                      showHistory
                          ? 'bg-uml-blue/10 text-uml-blue'
                          : 'text-gray-500 hover:bg-gray-100'
                  }`}
                  title="Lịch sử chat"
              >
                <History size={18} />
              </button>

              <div className="h-4 w-[1px] bg-gray-200 mx-1" />

              <button
                  onClick={() => {
                    setShowHistory(false)
                    onNewSession?.()
                  }}
                  className="p-1.5 text-gray-500 hover:bg-gray-100 hover:text-uml-blue rounded-md transition-colors"
                  title="Đoạn chat mới"
                  disabled={isProcessing}
              >
                <Plus size={18} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-gray-50 border border-gray-100">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">
                AI Agent
              </span>
              </div>
            </div>
          </div>

          {/* History Overlay */}
          {showHistory && (
              <div className="absolute inset-0 bg-white z-20 flex flex-col">
                <div className="p-4 border-b border-gray-100 flex items-center gap-3 shrink-0">
                  <button
                      onClick={() => setShowHistory(false)}
                      className="p-1.5 hover:bg-gray-100 rounded-md text-gray-500 transition-colors"
                      title="Quay lại"
                  >
                    <ChevronLeft size={18} />
                  </button>

                  <h4 className="text-sm font-bold text-gray-900">
                    Lịch sử trò chuyện
                  </h4>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50/50 custom-scrollbar">
                  {sessions.length === 0 ? (
                      <div className="text-center py-12">
                        <History size={32} className="text-gray-200 mx-auto mb-2" />
                        <p className="text-xs text-gray-400">Chưa có lịch sử</p>
                      </div>
                  ) : (
                      sessions.map((session: any) => {
                        const sId = getSessionId(session)

                        if (!sId) return null

                        return (
                            <button
                                key={sId}
                                onClick={() => {
                                  onSessionSelect?.(sId)
                                  setShowHistory(false)
                                }}
                                className={`w-full text-left p-3 rounded-lg border transition-all ${
                                    currentSessionId === sId
                                        ? 'bg-white border-uml-blue shadow-sm ring-1 ring-uml-blue/5'
                                        : 'bg-white border-gray-100 hover:border-gray-200'
                                }`}
                            >
                              <div className="flex justify-between items-start gap-2">
                        <span className="text-xs font-bold text-gray-800 truncate pr-2">
                          {session.title || 'Phiên chat mới'}
                        </span>

                                <span className="text-[9px] text-gray-400 whitespace-nowrap">
                          {formatSessionDate(session.updatedAt)}
                        </span>
                              </div>
                            </button>
                        )
                      })
                  )}
                </div>
              </div>
          )}

          {/* Chat messages */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {/* Context */}
            {hasContext && (
                <div className="border-b border-gray-100 bg-gray-50/30">
                  <button
                      onClick={() => setContextOpen(!contextOpen)}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-[11px] font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition uppercase tracking-wider"
                  >
                    {contextOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    AI Context
                  </button>

                  {contextOpen && (
                      <div className="px-4 pb-3 space-y-2">
                        {intent && (
                            <div className="flex items-start gap-2 text-xs bg-blue-50/50 border border-blue-100 rounded-lg p-2.5">
                              <Target size={14} className="text-uml-blue shrink-0 mt-0.5" />
                              <div>
                        <span className="font-bold text-uml-blue">
                          Mục tiêu hiện tại:
                        </span>
                                <p className="text-gray-700 mt-0.5">{intent}</p>
                              </div>
                            </div>
                        )}

                        {clarifications.length > 0 && (
                            <div className="space-y-1.5">
                              {clarifications.map((c, i) =>
                                      c.answer ? (
                                          <div
                                              key={i}
                                              className="flex items-start gap-2 text-xs bg-amber-50/50 border border-amber-100 rounded-lg p-2.5"
                                          >
                                            <MessageSquare size={14} className="text-amber-500 shrink-0 mt-0.5" />
                                            <div>
                              <span className="font-bold text-amber-600">
                                Câu hỏi #{i + 1}:
                              </span>
                                              <span className="text-gray-600"> {c.question}</span>
                                              <p className="text-gray-800 font-medium mt-0.5">
                                                → {c.answer}
                                              </p>
                                            </div>
                                          </div>
                                      ) : null
                              )}
                            </div>
                        )}
                      </div>
                  )}
                </div>
            )}

            <div className="px-4 py-3 space-y-4">
              {history.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4 px-6 py-12">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-uml-blue to-indigo-600 flex items-center justify-center shadow-lg shadow-uml-blue/20">
                      <Bot size={24} className="text-white" />
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-gray-900">
                        Bắt đầu trò chuyện
                      </h4>
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                        Tôi là trợ lý AI, tôi có thể giúp bạn giải đáp thắc mắc về hệ thống hoặc hỗ trợ vẽ biểu đồ.
                      </p>
                    </div>
                  </div>
              )}

              {history.map((msg, index) => (
                  <div
                      key={`${msg.role}-${msg.timestamp}-${index}`}
                      className={`flex items-start gap-2.5 ${
                          msg.role === 'user' ? 'flex-row-reverse' : ''
                      }`}
                  >
                    <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                            msg.role === 'ai'
                                ? 'bg-uml-blue/10 text-uml-blue'
                                : 'bg-gray-100 text-gray-500'
                        }`}
                    >
                      {msg.role === 'ai' ? <Bot size={14} /> : <User size={14} />}
                    </div>

                    <div className="max-w-[85%] group relative">
                      <div
                          className={`px-3 py-2 rounded-xl text-xs leading-relaxed ${
                              msg.role === 'ai'
                                  ? 'bg-gray-50 border border-gray-100 text-gray-800 rounded-tl-sm'
                                  : 'bg-uml-blue text-white rounded-tr-sm shadow-sm'
                          }`}
                      >
                        {msg.role === 'ai' ? (
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  p: ({ children }) => (
                                      <p className="mb-1 last:mb-0">{children}</p>
                                  ),
                                  ul: ({ children }) => (
                                      <ul className="list-disc ml-4 mb-2 space-y-1">
                                        {children}
                                      </ul>
                                  ),
                                  ol: ({ children }) => (
                                      <ol className="list-decimal ml-4 mb-2 space-y-1">
                                        {children}
                                      </ol>
                                  ),
                                  li: ({ children }) => (
                                      <li className="mb-0.5">{children}</li>
                                  ),
                                  table: ({ children }) => (
                                      <div className="overflow-x-auto my-2 border border-gray-200 rounded-lg">
                                        <table className="w-full text-[11px] border-collapse">
                                          {children}
                                        </table>
                                      </div>
                                  ),
                                  thead: ({ children }) => (
                                      <thead className="bg-gray-100/50">{children}</thead>
                                  ),
                                  th: ({ children }) => (
                                      <th className="border border-gray-200 px-2 py-1.5 font-bold text-left">
                                        {children}
                                      </th>
                                  ),
                                  td: ({ children }) => (
                                      <td className="border border-gray-200 px-2 py-1.5">
                                        {children}
                                      </td>
                                  ),
                                  strong: ({ children }) => (
                                      <strong className="font-bold text-gray-900">
                                        {children}
                                      </strong>
                                  ),
                                  code: ({ children }) => (
                                      <code className="bg-gray-200/50 px-1 py-0.5 rounded text-[10px] font-mono">
                                        {children}
                                      </code>
                                  ),
                                }}
                            >
                              {msg.content}
                            </ReactMarkdown>
                        ) : (
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                        )}
                      </div>

                      <p
                          className={`text-[10px] mt-1 text-gray-400 ${
                              msg.role === 'user' ? 'text-right' : ''
                          }`}
                      >
                        {formatMessageTime(msg.timestamp)}
                      </p>

                      {msg.role === 'ai' &&
                          msg.questions &&
                          msg.questions.length > 0 &&
                          !answeredQuestionKeys[getMessageKey(msg, index)] && (
                              <QuestionBox
                                  questions={msg.questions}
                                  onSubmit={answer => handleQuestionSubmit(msg, index, answer)}
                                  isSubmitting={isProcessing}
                              />
                          )}
                    </div>
                  </div>
              ))}

              {isProcessing && (
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-uml-blue/10 flex items-center justify-center shrink-0">
                      <Bot size={14} className="text-uml-blue" />
                    </div>

                    <div className="bg-gray-50 border border-gray-100 px-3 py-2 rounded-xl rounded-tl-sm shadow-sm">
                      <div className="flex gap-1 items-center h-3">
                        <div className="w-1 h-1 rounded-full bg-uml-blue animate-bounce" />
                        <div
                            className="w-1 h-1 rounded-full bg-uml-blue animate-bounce"
                            style={{ animationDelay: '150ms' }}
                        />
                        <div
                            className="w-1 h-1 rounded-full bg-uml-blue animate-bounce"
                            style={{ animationDelay: '300ms' }}
                        />
                      </div>
                    </div>
                  </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Files */}
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

          {/* Input */}
          <div className="border-t border-gray-100 px-3 py-3 shrink-0 bg-white">
            <div className="relative group">
            <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onInput={handleTextareaInput}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmit()
                  }
                }}
                placeholder="Nhập câu hỏi..."
                disabled={isProcessing}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 pr-12 text-xs focus:outline-none focus:ring-2 focus:ring-uml-blue/10 focus:border-uml-blue transition-all resize-none min-h-[40px] max-h-[120px] placeholder:text-gray-400 disabled:opacity-50"
                rows={1}
            />

              {isProcessing ? (
                  <button
                      onClick={onStopGeneration}
                      className="absolute right-1.5 bottom-1.5 w-8 h-8 rounded-lg flex items-center justify-center transition-all bg-red-500 text-white shadow-md hover:bg-red-600"
                      title="Stop generating"
                  >
                    <Square size={14} />
                  </button>
              ) : (
                  <button
                      onClick={handleSubmit}
                      disabled={!input.trim()}
                      className={`absolute right-1.5 bottom-1.5 w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                          input.trim()
                              ? 'bg-uml-blue text-white shadow-md hover:bg-blue-600'
                              : 'bg-gray-100 text-gray-400'
                      }`}
                  >
                    <Send size={14} />
                  </button>
              )}
            </div>
          </div>
        </div>
      </div>
  )
}