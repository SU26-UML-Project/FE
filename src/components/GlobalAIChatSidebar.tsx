import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
} from 'lucide-react';
import { 
  sendDiagramChat, 
  getChatSessions, 
  getChatHistory, 
  createChatSession,
  ChatMessage,
  ChatSession 
} from '../services/anythingllmService';
import { useAuthStore } from '../stores/useAuthStore';
import toast from 'react-hot-toast';

interface GlobalAIChatSidebarProps {
  isOpen: boolean;
  onToggle: (open: boolean) => void;
}

const GlobalAIChatSidebar: React.FC<GlobalAIChatSidebarProps> = ({ isOpen, onToggle }) => {
  const [showHistory, setShowHistory] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  const { isAuthenticated } = useAuthStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load sessions khi component mount và có auth
  useEffect(() => {
    if (isAuthenticated) {
      fetchSessions();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen && isAuthenticated && sessions.length === 0) {
      fetchSessions();
    }
  }, [isOpen, isAuthenticated]);

  const fetchSessions = async () => {
    try {
      const response = await getChatSessions();
      if (response.code === 200) {
        const fetchedSessions = response.result || [];
        setSessions(fetchedSessions);
        if (fetchedSessions.length === 0) {
          handleNewChat(true);
        } else if (!currentSessionId) {
          handleSelectSession(fetchedSessions[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    }
  };

  const handleSelectSession = async (sessionId: string) => {
    if (!sessionId) return;
    setCurrentSessionId(sessionId);
    setShowHistory(false);
    setLoadingHistory(true);
    try {
      const response = await getChatHistory(sessionId);
      if (response.code === 200) {
        // Phòng thủ tối đa: Kiểm tra nếu result là mảng hoặc nằm trong result.messages
        const data = response.result;
        if (Array.isArray(data)) {
          setMessages(data);
        } else if (data && typeof data === 'object' && Array.isArray((data as any).messages)) {
          setMessages((data as any).messages);
        } else {
          setMessages([]);
        }
      }
    } catch (error) {
      toast.error('Không thể tải lịch sử trò chuyện');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleNewChat = async (isAutoCreate = false) => {
    if (!isAutoCreate) setIsLoading(true);
    try {
      const response = await createChatSession();
      if (response.code === 200) {
        const newSession = response.result;
        setSessions(prev => [newSession, ...prev]);
        setCurrentSessionId(newSession.id);
        setMessages([]);
        if (!isAutoCreate) {
          setShowHistory(false);
          toast.success('Đã tạo đoạn chat mới');
        }
      }
    } catch (error) {
      if (!isAutoCreate) toast.error('Không thể tạo phiên chat mới');
    } finally {
      if (!isAutoCreate) setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMessage = input.trim();
    setInput('');
    const newUserMsg: ChatMessage = {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, newUserMsg]);
    setIsLoading(true);
    try {
      const response = await sendDiagramChat({
        message: userMessage,
        sessionId: currentSessionId || undefined
      });
      if (response.code === 200) {
        const { answer, sessionId } = response.result;
        if (!currentSessionId) {
          setCurrentSessionId(sessionId);
          fetchSessions();
        }
        const aiMsg: ChatMessage = {
          role: 'ai',
          content: answer,
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, aiMsg]);
      }
    } catch (error: any) {
      toast.error(error.message || 'Lỗi gửi tin nhắn');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) return null;

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
            className="fixed top-[88px] right-0 h-[calc(100vh-88px)] w-full max-w-[380px] bg-white z-[70] flex flex-col border-l border-gray-100 shadow-[-4px_0_12px_-2px_rgba(0,0,0,0.05)]"
          >
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-white/80 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className={`p-1.5 rounded-md transition-colors ${showHistory ? 'bg-uml-blue/10 text-uml-blue' : 'text-gray-500 hover:bg-gray-100'}`}
                  title="Lịch sử chat"
                >
                  <History size={18} />
                </button>
                <div className="h-4 w-[1px] bg-gray-200 mx-1" />
                <button
                  onClick={() => {
                    setShowHistory(false);
                    handleNewChat();
                  }}
                  className="p-1.5 text-gray-500 hover:bg-gray-100 hover:text-uml-blue rounded-md transition-colors"
                  title="Đoạn chat mới"
                >
                  <Plus size={18} />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-gray-50 border border-gray-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">AI Agent</span>
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
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <h4 className="text-sm font-bold text-gray-900">Lịch sử trò chuyện</h4>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50/50 custom-scrollbar">
                      {sessions.length === 0 ? (
                        <div className="text-center py-12">
                          <History size={32} className="text-gray-200 mx-auto mb-2" />
                          <p className="text-xs text-gray-400">Chưa có lịch sử</p>
                        </div>
                      ) : (
                        sessions.map((session) => {
                          const sessionId = (session as any).sessionId || session.id;
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
                              <div className="flex justify-between items-start">
                                <span className="text-xs font-bold text-gray-800 truncate pr-2">
                                  {session.title || 'Phiên chat mới'}
                                </span>
                                <span className="text-[9px] text-gray-400 whitespace-nowrap">
                                  {new Date(session.updatedAt).toLocaleDateString()}
                                </span>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {loadingHistory ? (
                  <div className="h-full flex flex-col items-center justify-center space-y-3">
                    <Loader2 className="w-8 h-8 text-uml-blue animate-spin" />
                    <p className="text-sm text-gray-400 font-medium">Đang tải...</p>
                  </div>
                ) : Array.isArray(messages) && messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4 px-6">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-uml-blue to-indigo-600 flex items-center justify-center shadow-lg shadow-uml-blue/20">
                      <Sparkles size={24} className="text-white" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">Bắt đầu trò chuyện</h4>
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                        Tôi là trợ lý AI, tôi có thể giúp bạn giải đáp thắc mắc về UML hoặc hỗ trợ bạn sử dụng ứng dụng.
                      </p>
                    </div>
                  </div>
                ) : (
                  Array.isArray(messages) && messages.map((msg, index) => (
                    <div
                      key={`${msg.role}-${msg.timestamp}-${index}`}
                      className={`flex items-start gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                    >
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                        msg.role === 'ai' ? 'bg-uml-blue/10 text-uml-blue' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {msg.role === 'ai' ? <Bot size={14} /> : <User size={14} />}
                      </div>
                      <div className={`max-w-[85%] group relative`}>
                        <div className={`px-3 py-2 rounded-xl text-xs leading-relaxed ${
                          msg.role === 'ai'
                            ? 'bg-gray-50 border border-gray-100 text-gray-800 rounded-tl-sm'
                            : 'bg-uml-blue text-white rounded-tr-sm shadow-sm'
                        }`}>
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        </div>
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
                        <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0 }} className="w-1 h-1 rounded-full bg-uml-blue" />
                        <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.2 }} className="w-1 h-1 rounded-full bg-uml-blue" />
                        <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.4 }} className="w-1 h-1 rounded-full bg-uml-blue" />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            <div className="p-4 bg-white border-t border-gray-100">
              <div className="relative group">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Nhập câu hỏi..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 pr-12 text-xs focus:outline-none focus:ring-2 focus:ring-uml-blue/10 focus:border-uml-blue transition-all resize-none min-h-[40px] max-h-[120px] placeholder:text-gray-400"
                  rows={1}
                  disabled={isLoading}
                />
                <button
                  onClick={handleSend}
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
  );
};

export default GlobalAIChatSidebar;
