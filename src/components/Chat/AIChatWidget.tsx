import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useId,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle,
  X,
  Send,
  Bot,
  User,
  Loader2,
  AlertTriangle,
  Minimize2,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { anythingllmService } from '../../services/anythingllmService';
import type { ChatMessage } from '../../types/ai';
import { generateId } from '../../utils/workspaceStorage';
import { useScrollToBottom } from '../../hooks/useScrollToBottom';



const TypingIndicator = () => (
  <div className="flex items-end gap-2 mb-3">
    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-md">
      <Bot size={14} className="text-white" />
    </div>
    <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
      <div className="flex gap-1 items-center h-4">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-gray-400"
            style={{
              animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  </div>
);

interface MessageBubbleProps {
  msg: ChatMessage;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ msg }) => {
  const isUser = msg.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className={`flex items-end gap-2 mb-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar */}
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow-md ${
          isUser
            ? 'bg-gradient-to-br from-uml-blue to-indigo-600'
            : 'bg-gradient-to-br from-blue-500 to-indigo-600'
        }`}
      >
        {isUser ? (
          <User size={13} className="text-white" />
        ) : (
          <Bot size={14} className="text-white" />
        )}
      </div>

      {/* Bubble */}
      <div
        className={`max-w-[75%] px-4 py-2.5 shadow-sm text-sm leading-relaxed whitespace-pre-wrap break-words ${
          isUser
            ? 'bg-gradient-to-br from-uml-blue to-indigo-600 text-white rounded-2xl rounded-br-sm'
            : msg.error
            ? 'bg-red-50 border border-red-200 text-red-700 rounded-2xl rounded-bl-sm'
            : 'bg-white border border-gray-100 text-gray-800 rounded-2xl rounded-bl-sm'
        }`}
      >
        {msg.error && (
          <div className="flex items-center gap-1.5 mb-1 text-red-500">
            <AlertTriangle size={12} />
            <span className="text-[11px] font-bold uppercase tracking-wider">Error</span>
          </div>
        )}
        {msg.content}
        <div
          className={`text-[10px] mt-1 ${
            isUser ? 'text-blue-100/70 text-right' : 'text-gray-400'
          }`}
        >
          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </motion.div>
  );
};

// ─── Main Widget ─────────────────────────────────────────────────────────────

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    'Xin chào! Tôi là AI Assistant được tích hợp với AnythingLLM. Tôi có thể giúp bạn trả lời câu hỏi về dự án, UML diagrams, và nhiều hơn nữa. Bắt đầu nhé! 🚀',
  timestamp: new Date(),
};

const AIChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const messagesEndRef = useScrollToBottom(messages, isLoading, isOpen, isMinimized);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const widgetId = useId();

  // Check AnythingLLM health on mount
  useEffect(() => {
    anythingllmService.checkHealth().then(setIsOnline);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, isMinimized]);

  // Unread badge logic
  useEffect(() => {
    if (!isOpen) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg && lastMsg.role === 'assistant' && lastMsg.id !== 'welcome') {
        setUnreadCount((n) => n + 1);
      }
    }
  }, [messages]);

  const handleOpen = () => {
    setIsOpen(true);
    setIsMinimized(false);
    setUnreadCount(0);
  };

  const handleClose = () => {
    setIsOpen(false);
    setUnreadCount(0);
  };

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const replyText = await anythingllmService.sendChatMessage(trimmed);
      const aiMsg: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: replyText,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: unknown) {
      const errMsg: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content:
          err instanceof Error
            ? err.message
            : 'Không thể kết nối đến server. Vui lòng kiểm tra BE đang chạy tại localhost:8088.',
        timestamp: new Date(),
        error: true,
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleReset = () => {
    setMessages([WELCOME_MESSAGE]);
  };

  return (
    <>
      {/* Bounce keyframes injected once */}
      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-5px); }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.9); opacity: 0.8; }
          70% { transform: scale(1.3); opacity: 0; }
          100% { transform: scale(0.9); opacity: 0; }
        }
      `}</style>

      {/* ── Floating Trigger Button ── */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-3">
        <AnimatePresence>
          {/* Chat Panel */}
          {isOpen && (
            <motion.div
              key="chat-panel"
              initial={{ opacity: 0, scale: 0.85, y: 20 }}
              animate={
                isMinimized
                  ? { opacity: 1, scale: 1, y: 0, height: 56 }
                  : { opacity: 1, scale: 1, y: 0, height: 520 }
              }
              exit={{ opacity: 0, scale: 0.85, y: 20 }}
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              id={`ai-chat-widget-${widgetId}`}
              className="w-[360px] bg-white rounded-2xl shadow-2xl shadow-blue-500/15 border border-gray-100 overflow-hidden flex flex-col"
              style={{ height: isMinimized ? 56 : 520 }}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-uml-blue to-indigo-600 px-4 py-3 flex items-center gap-3 shrink-0">
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                    <Sparkles size={16} className="text-white" />
                  </div>
                  {/* Online indicator */}
                  {isOnline !== null && (
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
                        isOnline ? 'bg-emerald-400' : 'bg-red-400'
                      }`}
                    />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-bold text-[13px] leading-none">AI Assistant</h3>
                  <p className="text-blue-100/70 text-[10px] mt-0.5">
                    {isOnline === null
                      ? 'Connecting…'
                      : isOnline
                      ? 'Online · AnythingLLM'
                      : 'Offline — check server'}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={handleReset}
                    title="Clear chat"
                    className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/20 transition-colors"
                  >
                    <RotateCcw size={14} />
                  </button>
                  <button
                    onClick={() => setIsMinimized((m) => !m)}
                    title={isMinimized ? 'Expand' : 'Minimize'}
                    className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/20 transition-colors"
                  >
                    <Minimize2 size={14} />
                  </button>
                  <button
                    onClick={handleClose}
                    title="Close"
                    className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/20 transition-colors"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* Messages */}
              {!isMinimized && (
                <>
                  <div className="flex-1 overflow-y-auto px-4 py-4 space-y-0 bg-gray-50/60 scrollbar-thin scrollbar-thumb-gray-200">
                    {messages.map((msg) => (
                      <MessageBubble key={msg.id} msg={msg} />
                    ))}
                    {isLoading && <TypingIndicator />}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input */}
                  <div className="shrink-0 px-3 py-3 border-t border-gray-100 bg-white">
                    <div className="flex items-end gap-2 bg-gray-50 rounded-xl border border-gray-200 px-3 py-2 focus-within:border-uml-blue focus-within:ring-2 focus-within:ring-uml-blue/10 transition-all">
                      <textarea
                        ref={inputRef}
                        id={`ai-chat-input-${widgetId}`}
                        rows={1}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Nhập tin nhắn… (Enter để gửi)"
                        disabled={isLoading || isOnline === false}
                        className="flex-1 bg-transparent resize-none text-sm text-gray-800 placeholder-gray-400 outline-none max-h-28 overflow-y-auto leading-relaxed disabled:opacity-50"
                        style={{ minHeight: '22px' }}
                        onInput={(e) => {
                          const el = e.currentTarget;
                          el.style.height = 'auto';
                          el.style.height = `${Math.min(el.scrollHeight, 112)}px`;
                        }}
                      />
                      <button
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading || isOnline === false}
                        id={`ai-chat-send-${widgetId}`}
                        className="p-1.5 rounded-lg bg-uml-blue text-white disabled:opacity-40 hover:bg-blue-700 active:scale-95 transition-all shrink-0"
                      >
                        {isLoading ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <Send size={15} />
                        )}
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-400 text-center mt-1.5">
                      Powered by{' '}
                      <span className="font-bold text-uml-blue">AnythingLLM</span> · Shift+Enter
                      xuống dòng
                    </p>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Fab button */}
        <motion.button
          id="ai-chat-fab"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={isOpen ? handleClose : handleOpen}
          className="relative w-14 h-14 rounded-full bg-gradient-to-br from-uml-blue to-indigo-600 text-white shadow-lg shadow-blue-500/30 flex items-center justify-center"
          aria-label="Toggle AI Chat"
        >
          {/* Pulse ring (only when closed) */}
          {!isOpen && (
            <span
              className="absolute inset-0 rounded-full bg-uml-blue/30"
              style={{ animation: 'pulse-ring 2s ease-out infinite' }}
            />
          )}

          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.span
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <X size={22} />
              </motion.span>
            ) : (
              <motion.span
                key="open"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <MessageCircle size={22} />
              </motion.span>
            )}
          </AnimatePresence>

          {/* Unread badge */}
          {!isOpen && unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center border-2 border-white"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.span>
          )}
        </motion.button>
      </div>
    </>
  );
};

export default AIChatWidget;
