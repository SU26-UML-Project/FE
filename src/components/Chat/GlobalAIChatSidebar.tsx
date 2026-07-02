import LoadingOverlay from '../ui/LoadingOverlay'
import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send,
  Bot,
  User,
  Loader2,
  History,
  Plus,
  ChevronLeft,
  Sparkles,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react'
import { anythingllmService } from '../../services/anythingllmService'
import type { ChatMessage, ChatSession } from '../../types/ai'
import { useAuthStore } from '../../stores/useAuthStore'
import toast from 'react-hot-toast'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useScrollToBottom } from '../../hooks/useScrollToBottom'

interface GlobalAIChatSidebarProps {
  isOpen: boolean
  onToggle: (open: boolean) => void
}

export interface ChatMessageWithExtra extends ChatMessage {
  isAnswered?: boolean
}

const normalizeChatRole = (role: unknown): 'user' | 'ai' => {
  const value = String(role ?? '').trim().toLowerCase()

  if (value === 'user') return 'user'
  if (value === 'assistant') return 'ai'
  if (value === 'ai') return 'ai'

  return 'ai'
}

const normalizeChatMessage = (msg: any): ChatMessageWithExtra => {
  return {
    role: normalizeChatRole(msg?.role),
    content: msg?.content ?? '',
    timestamp: msg?.timestamp || msg?.createdAt || new Date().toISOString(),
    questions: Array.isArray(msg?.questions) ? msg.questions : [],
  }
}

const getSessionId = (session: ChatSession | any): string => {
  return session?.sessionId || session?.id || ''
}

const formatSessionDate = (updatedAt?: string): string => {
  if (!updatedAt) return ''

  try {
    return new Date(updatedAt).toLocaleDateString()
  } catch {
    return ''
  }
}

const formatMessageTime = (timestamp?: string): string => {
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

const GlobalAIChatSidebar: React.FC<GlobalAIChatSidebarProps> = ({
                                                                   isOpen,
                                                                   onToggle,
                                                                 }) => {
  const [showHistory, setShowHistory] = useState(false)
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessageWithExtra[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)

  const { isAuthenticated } = useAuthStore()
  const messagesEndRef = useScrollToBottom(messages, isLoading)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const handleSelectSession = async (sessionId: string) => {
    if (!sessionId) return

    setCurrentSessionId(sessionId)
    setShowHistory(false)
    setLoadingHistory(true)

    try {
      const response = await anythingllmService.getChatHistory(sessionId)

      if (response.code === 200) {
        const data = response.result as unknown

        if (Array.isArray(data)) {
          setMessages(data.map(normalizeChatMessage))
        } else if (
            data &&
            typeof data === 'object' &&
            'messages' in data &&
            Array.isArray((data as any).messages)
        ) {
          setMessages((data as any).messages.map(normalizeChatMessage))
        } else {
          setMessages([])
        }
      }
    } catch (error) {
      toast.error('Không thể tải lịch sử trò chuyện')
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleNewChat = async (isAutoCreate = false) => {
    if (!isAutoCreate) setIsLoading(true)

    try {
      const response = await anythingllmService.createChatSession()

      if (response.code === 200 && response.result) {
        const newSession = response.result
        const newSessionId = getSessionId(newSession)

        setSessions(prev => [newSession, ...prev])
        setCurrentSessionId(newSessionId)
        setMessages([])

        if (!isAutoCreate) {
          setShowHistory(false)
          toast.success('Đã tạo đoạn chat mới')
        }
      }
    } catch (error) {
      if (!isAutoCreate) {
        toast.error('Không thể tạo phiên chat mới')
      }
    } finally {
      if (!isAutoCreate) setIsLoading(false)
    }
  }

  const fetchSessions = async () => {
    try {
      const response = await anythingllmService.getChatSessions()

      if (response.code === 200) {
        const fetchedSessions = response.result || []
        setSessions(fetchedSessions)

        if (fetchedSessions.length === 0) {
          await handleNewChat(true)
          return
        }

        if (!currentSessionId) {
          const firstSessionId = getSessionId(fetchedSessions[0])
          await handleSelectSession(firstSessionId)
        }
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error)
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      fetchSessions()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  useEffect(() => {
    if (isOpen && isAuthenticated && sessions.length === 0) {
      fetchSessions()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isAuthenticated])

  useEffect(() => {
    if (isOpen) {
      window.setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  const handleSend = async (overrideMessage?: string, messageIndex?: number) => {
    const userMessage = overrideMessage || input.trim()

    if (!userMessage || isLoading) return

    if (!overrideMessage) {
      setInput('')
    }

    if (messageIndex !== undefined) {
      setMessages(prev =>
          prev.map((msg, index) =>
              index === messageIndex ? { ...msg, isAnswered: true } : msg
          )
      )
    }

    const newUserMsg: ChatMessageWithExtra = {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    }

    setMessages(prev => [...prev, newUserMsg])
    setIsLoading(true)

    try {
      const response = await anythingllmService.sendDiagramChat({
        message: userMessage,
        sessionId: currentSessionId || undefined,
      })

      if (response.code === 200 && response.result) {
        const { answer, sessionId, questions } = response.result

        if (sessionId && sessionId !== currentSessionId) {
          setCurrentSessionId(sessionId)
          fetchSessions()
        }

        const aiMsg: ChatMessageWithExtra = {
          role: 'ai',
          content: answer || 'Không có phản hồi từ AI.',
          timestamp: new Date().toISOString(),
          questions: Array.isArray(questions) ? questions : [],
        }

        setMessages(prev => [...prev, aiMsg])
      } else {
        toast.error(response.message || 'AI không trả về phản hồi hợp lệ')
      }
    } catch (error: any) {
      toast.error(error.message || 'Lỗi gửi tin nhắn')
    } finally {
      setIsLoading(false)
    }
  }

  const handleTextareaInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }

  if (!isAuthenticated) return null

  return (
      <>
        {!isOpen && (
            <motion.button
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onToggle(true)}
                className="fixed top-1/2 -right-1 -translate-y-1/2 w-8 h-20 bg-white border border-gray-200 border-r-0 rounded-l-xl shadow-lg flex items-center justify-center z-50 hover:bg-gray-50 text-gray-400 hover:text-uml-blue transition-all"
                aria-label="Mở AI chat"
            >
              <PanelRightOpen size={18} />
            </motion.button>
        )}

        <AnimatePresence>
          {isOpen && (
              <motion.div
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  className="fixed top-[72px] right-0 h-[calc(100vh-72px)] w-full max-w-[380px] bg-white z-[70] flex flex-col border-l border-gray-100 shadow-[-4px_0_12px_-2px_rgba(0,0,0,0.05)]"
              >
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
                          handleNewChat()
                        }}
                        className="p-1.5 text-gray-500 hover:bg-gray-100 hover:text-uml-blue rounded-md transition-colors"
                        title="Đoạn chat mới"
                        disabled={isLoading}
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

                    <button
                        onClick={() => onToggle(false)}
                        className="p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-500 rounded-md transition-colors"
                        title="Thu gọn"
                    >
                      <PanelRightClose size={18} />
                    </button>
                  </div>
                </div>

                <div className="flex-1 relative overflow-hidden flex flex-col">
                  <AnimatePresence>
                    {showHistory && (
                        <motion.div
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'tween', duration: 0.25 }}
                            className="absolute inset-0 bg-white z-20 flex flex-col"
                        >
                          <div className="p-4 border-b border-gray-100 flex items-center gap-3">
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
                                  <p className="text-xs text-gray-400">
                                    Chưa có lịch sử
                                  </p>
                                </div>
                            ) : (
                                sessions.map(session => {
                                  const sessionId = getSessionId(session)

                                  return (
                                      <button
                                          key={sessionId}
                                          onClick={() => handleSelectSession(sessionId)}
                                          className={`w-full text-left p-3 rounded-lg border transition-all ${
                                              currentSessionId === sessionId
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
                        </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {loadingHistory ? (
                        <LoadingOverlay message="Đang tải..." absolute={false} />
                    ) : messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-4 px-6">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-uml-blue to-indigo-600 flex items-center justify-center shadow-lg shadow-uml-blue/20">
                            <Sparkles size={24} className="text-white" />
                          </div>

                          <div>
                            <h4 className="text-sm font-bold text-gray-900">
                              Bắt đầu trò chuyện
                            </h4>
                            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                              Tôi là trợ lý AI, tôi có thể giúp bạn giải đáp thắc mắc
                              về UML hoặc hỗ trợ bạn sử dụng ứng dụng.
                            </p>
                          </div>
                        </div>
                    ) : (
                        messages.map((msg, index) => (
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
                                {msg.role === 'ai' ? (
                                    <Bot size={14} />
                                ) : (
                                    <User size={14} />
                                )}
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
                                                <thead className="bg-gray-100/50">
                                                {children}
                                                </thead>
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
                                      <p className="whitespace-pre-wrap">
                                        {msg.content}
                                      </p>
                                  )}
                                </div>

                                <p
                                    className={`text-[10px] mt-1 text-gray-400 ${
                                        msg.role === 'user' ? 'text-right' : ''
                                    }`}
                                >
                                  {formatMessageTime(msg.timestamp)}
                                </p>
                              </div>
                            </div>
                        ))
                    )}

                    {isLoading && (
                        <div className="flex items-start gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-uml-blue/10 flex items-center justify-center shrink-0">
                            <Bot size={14} className="text-uml-blue" />
                          </div>

                          <div className="bg-gray-50 border border-gray-100 px-3 py-2 rounded-xl rounded-tl-sm shadow-sm">
                            <div className="flex gap-1 items-center h-3">
                              <motion.span
                                  animate={{ opacity: [0.3, 1, 0.3] }}
                                  transition={{
                                    repeat: Infinity,
                                    duration: 1.2,
                                    delay: 0,
                                  }}
                                  className="w-1 h-1 rounded-full bg-uml-blue"
                              />
                              <motion.span
                                  animate={{ opacity: [0.3, 1, 0.3] }}
                                  transition={{
                                    repeat: Infinity,
                                    duration: 1.2,
                                    delay: 0.2,
                                  }}
                                  className="w-1 h-1 rounded-full bg-uml-blue"
                              />
                              <motion.span
                                  animate={{ opacity: [0.3, 1, 0.3] }}
                                  transition={{
                                    repeat: Infinity,
                                    duration: 1.2,
                                    delay: 0.4,
                                  }}
                                  className="w-1 h-1 rounded-full bg-uml-blue"
                              />
                            </div>
                          </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>
                </div>

                <div className="p-4 bg-white border-t border-gray-100 shrink-0">
                  <div className="relative group">
                <textarea
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onInput={handleTextareaInput}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSend()
                      }
                    }}
                    placeholder="Nhập câu hỏi..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 pr-12 text-xs focus:outline-none focus:ring-2 focus:ring-uml-blue/10 focus:border-uml-blue transition-all resize-none min-h-[40px] max-h-[120px] placeholder:text-gray-400 disabled:opacity-50"
                    rows={1}
                    disabled={isLoading}
                />

                    <button
                        onClick={() => handleSend()}
                        disabled={!input.trim() || isLoading}
                        className={`absolute right-1.5 bottom-1.5 w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                            input.trim() && !isLoading
                                ? 'bg-uml-blue text-white shadow-md hover:bg-blue-600'
                                : 'bg-gray-100 text-gray-400'
                        }`}
                    >
                      {isLoading ? (
                          <Loader2 size={16} className="animate-spin" />
                      ) : (
                          <Send size={16} />
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
          )}
        </AnimatePresence>
      </>
  )
}

export default GlobalAIChatSidebar