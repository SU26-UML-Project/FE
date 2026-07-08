import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { DiagramType, FlowEdge, FlowNode } from "../../types";
import type { 
  ChatSession, 
  ChatMessage, 
  DiagramChatResponse,
  AiResponseKind
} from "../../types/ai";
import { chatService } from "../../services/chatService";
import { toast } from "react-hot-toast";
import { QuestionCard } from "../overlays/QuestionBox";
import { aiResponseToCanvas, type ParseResult, type Answer, type ImportQuestion } from "../../lib/importers";

interface Msg {
  id: string;
  role: "USER" | "ASSISTANT";
  text?: string;
  timestamp?: string;
  kind?: AiResponseKind;
  result?: ParseResult;
  summary?: string;
  initialAnswers?: Record<string, Answer>;
  initialDone?: boolean;
  initialNotes?: string;
}

function Sparkle({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2z" />
      <path d="M19 14l.9 2.6L22.5 17.5 19.9 18.4 19 21l-.9-2.6L15.5 17.5l2.6-.9L19 14z" opacity="0.6" />
    </svg>
  );
}

const GREETING =
  "Chào bro! Tôi là trợ lý AI. Bro cần hỗ trợ gì về nghiệp vụ hay thiết kế UML không?";

/**
 * Right-side, collapsible AI assistant sidebar.
 */
export function AIChat({
  open,
  onToggle,
  diagramType,
  activeSheetId,
  currentNodes,
  currentEdges,
  onImport,
}: {
  open: boolean;
  onToggle: () => void;
  diagramType: DiagramType;
  activeSheetId: string;
  currentNodes: FlowNode[];
  currentEdges: FlowEdge[];
  onImport: (
    nodes: FlowNode[],
    edges: FlowEdge[],
    type?: DiagramType
  ) => void;
}) {
  const [msgs, setMsgs] = useState<Msg[]>([
    { id: "greeting", role: "ASSISTANT", text: GREETING }
  ]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [view, setView] = useState<"chat" | "history">("chat");
  const [sidebarWidth, setSidebarWidth] = useState(360);
  const [isResizing, setIsResizing] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Resize handler
  useEffect(() => {
    if (!isResizing) return;

    let animationFrameId: number;

    const onMouseMove = (e: MouseEvent) => {
      // Use requestAnimationFrame to sync with browser's refresh rate
      animationFrameId = requestAnimationFrame(() => {
        const newWidth = window.innerWidth - e.clientX;
        if (newWidth > 280 && newWidth < 800) {
          setSidebarWidth(newWidth);
        }
      });
    };

    const onMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = "default";
    };

    document.addEventListener("mousemove", onMouseMove, { passive: true });
    document.addEventListener("mouseup", onMouseUp);
    document.body.style.cursor = "col-resize";

    return () => {
      cancelAnimationFrame(animationFrameId);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "default";
    };
  }, [isResizing]);

  const getDisplayMarkdown = (m: ChatMessage | DiagramChatResponse): string => {
    // If it's a user message, return content as is
    if ('role' in m && m.role === 'USER') return m.content;

    // For assistant, try to parse JSON if content looks like it
    let content = 'content' in m ? m.content : m.answer;
    const kind = m.kind;
    const summary = m.summary;

    if (content?.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(content);
        if (parsed.answer) return parsed.answer;
        if (parsed.summary) return parsed.summary;
      } catch (e) {
        // Not JSON or invalid, continue to fallback
      }
    }

    if (kind === 'diagram') return summary || "Bro xem thử sơ đồ tôi vừa vẽ nhé!";
    if (kind === 'questions') return summary || "Tôi có một vài câu hỏi cần làm rõ:";
    
    return content || "";
  };

  // Load sessions when switching to history view
  useEffect(() => {
    if (view === "history") {
      loadSessions();
    }
  }, [view]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current && view === "chat")
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [msgs, open, view]);

  const loadSessions = async () => {
    try {
      const res = await chatService.getSessions();
      setSessions(res.result);
    } catch (err: any) {
      toast.error(err.message || "Không thể tải lịch sử chat");
    }
  };

  const startNewChat = async () => {
    try {
      setBusy(true);
      const res = await chatService.createSession();
      // Đồng bộ ID: ưu tiên anythingSessionId, fallback về id hoặc sessionId
      const sid = res.result.anythingSessionId || res.result.id || (res.result as any).sessionId;
      setCurrentSessionId(sid);
      setMsgs([{ id: "greeting", role: "ASSISTANT", text: GREETING }]);
      setView("chat");
    } catch (err: any) {
      toast.error(err.message || "Không thể tạo phiên chat mới");
    } finally {
      setBusy(false);
    }
  };

  const parseConfirmedAnswers = (text: string, questions: ImportQuestion[]): { 
    answers: Record<string, Answer>, 
    notes: string 
  } => {
    const result: Record<string, Answer> = {};
    let notes = "";
  
    if (!text.startsWith("Đã xác nhận thông tin:")) return { answers: {}, notes: "" };

    const parts = text.split("Ghi chú thêm:");
    const mainPart = parts[0].replace("Đã xác nhận thông tin:", "").trim();
    if (parts.length > 1) {
      notes = parts[1].trim().replace(/^"|"$/g, "");
    }
  
    const pairs = mainPart.split(";");
    for (const pair of pairs) {
      const match = pair.trim().match(/Q: (.*) -> A: (.*)/);
      if (match && match[1] && match[2]) {
        const prompt = match[1].trim();
        const answerLabel = match[2].trim();
        
        const q = questions.find(qq => qq.prompt === prompt);
        if (q) {
          if (q.multiple) {
            const labels = answerLabel.split(",").map(l => l.trim());
            const matchedOptions = q.options.filter(o => labels.includes(o.label));
            const otherLabel = labels.find(l => !q.options.some(o => o.label === l));
            result[q.id] = { 
              kind: "multiple", 
              options: matchedOptions, 
              other: (otherLabel && otherLabel !== "—") ? otherLabel : undefined 
            };
          } else {
            const matchedOption = q.options.find(o => o.label === answerLabel);
            if (matchedOption) {
              result[q.id] = { kind: "option", option: matchedOption };
            } else if (answerLabel !== "—") {
              result[q.id] = { kind: "other", text: answerLabel };
            }
          }
        }
      }
    }
    return { answers: result, notes };
  };

  const selectSession = async (session: ChatSession) => {
    try {
      setBusy(true);
      // Lỗi undefined sessionId: Kiểm tra mọi khả năng của ID trường hợp backend trả về khác nhau
      const sid = session.anythingSessionId || session.id || (session as any).sessionId;
      
      if (!sid) {
        throw new Error("Không tìm thấy ID phiên chat hợp lệ");
      }

      const res = await chatService.getHistory(sid);
      setCurrentSessionId(sid);
      
      const historyMsgs: Msg[] = res.result.messages.map((m, idx) => {
        const parsed = aiResponseToCanvas({
          kind: m.kind || 'reply',
          answer: m.content,
          summary: m.summary,
          nodes: m.nodes,
          edges: m.edges,
          questions: m.questions,
          sessionId: sid
        });

        let initialAnswers: Record<string, Answer> = {};
        let initialNotes = "";
        let initialDone = false;

        if (m.kind === "questions" && parsed.questions) {
          const nextMsg = res.result.messages[idx + 1];
          if (nextMsg && nextMsg.role === "USER" && nextMsg.content.startsWith("Đã xác nhận thông tin:")) {
            const resolved = parseConfirmedAnswers(nextMsg.content, parsed.questions);
            initialAnswers = resolved.answers;
            initialNotes = resolved.notes;
            initialDone = true;
          }
        }

        return {
          id: `hist-${idx}`,
          role: m.role,
          text: getDisplayMarkdown(m),
          timestamp: m.createdAt,
          kind: m.kind,
          summary: m.summary,
          result: parsed,
          initialAnswers,
          initialDone,
          initialNotes
        };
      });
      
      setMsgs(historyMsgs.length ? historyMsgs : [{ id: "greeting", role: "ASSISTANT", text: GREETING }]);
      setView("chat");
    } catch (err: any) {
      console.error("Select Session Error:", err);
      toast.error(err.message || "Không thể tải lịch sử phiên chat");
    } finally {
      setBusy(false);
    }
  };

  const handleAiResponse = (res: DiagramChatResponse) => {
    const parsed = aiResponseToCanvas({
      kind: res.kind || 'reply',
      answer: res.answer,
      summary: res.summary,
      nodes: res.nodes,
      edges: res.edges,
      questions: res.questions,
      sessionId: currentSessionId || ""
    });

    const aiMsg: Msg = {
      id: `ai-${Date.now()}`,
      role: "ASSISTANT",
      text: getDisplayMarkdown(res),
      kind: res.kind,
      summary: res.summary,
      result: parsed
    };

    setMsgs(prev => [...prev, aiMsg]);

    // Nếu là diagram, apply kết quả (kể cả rỗng - ví dụ lệnh "xóa hết")
    if (res.kind === 'diagram') {
      onImport(parsed.nodes, parsed.edges, parsed.type);
    }
  };

  const submit = async (overrideText?: string | any) => {
    // If overrideText is a MouseEvent (from onClick={submit}), ignore it
    const actualText = (typeof overrideText === 'string') ? overrideText : undefined;
    const rawInput = actualText || input || "";
    const text = rawInput.trim();
    if (!text || busy) return;

    if (typeof overrideText !== 'string') setInput("");
    
    // Nếu là text tự động từ HITL, chúng ta có thể muốn hiển thị nó khác đi hoặc không hiển thị
    // Nhưng để luồng chat tự nhiên, ta vẫn hiển thị như tin nhắn người dùng
    const userMsg: Msg = { id: `user-${Date.now()}`, role: "USER", text };
    setMsgs(prev => [...prev, userMsg]);
    setBusy(true);

    try {
      // 1. Đảm bảo có sessionId (sử dụng biến cục bộ để tránh stale state)
      let activeSessionId = currentSessionId;
      if (!activeSessionId) {
        const sessionRes = await chatService.createSession();
        // Đồng bộ ID: ưu tiên anythingSessionId, fallback về id hoặc sessionId
        activeSessionId = sessionRes.result.anythingSessionId || sessionRes.result.id || (sessionRes.result as any).sessionId;
        setCurrentSessionId(activeSessionId);
      }

      // 2. Sử dụng activeSheetId từ props (UUID chuẩn từ Backend)
      const currentSheetId = activeSheetId;

      // Map current nodes and edges to DTO format
      const mappedNodes = currentNodes.map(n => ({
        id: n.id,
        type: n.type || 'cls',
        label: n.data.label || '',
        stereotype: n.data.stereotype,
        attributes: n.data.attributes?.split('\n').filter(Boolean),
        methods: n.data.methods?.split('\n').filter(Boolean),
      }));

      const mappedEdges = currentEdges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
        relation: (e.data as any)?.relation || '',
        label: e.label as string || '',
      }));

      const res = await chatService.sendChat({
        message: text,
        sessionId: activeSessionId,
        sheetId: currentSheetId,
        currentNodes: mappedNodes,
        currentEdges: mappedEdges,
      });

      handleAiResponse(res.result);
    } catch (err: any) {
      console.error("AI Chat Error:", err);
      toast.error(err.message || "AI đang bận, bro thử lại sau nhé");
      setMsgs(prev => [...prev, { 
        id: `err-${Date.now()}`, 
        role: "ASSISTANT", 
        text: `Lỗi: ${err.message || "Không thể kết nối với AI Architect."}` 
      }]);
    } finally {
      setBusy(false);
    }
  };

  /* ---------- collapsed rail ---------- */
  if (!open) {
    return (
      <button onClick={onToggle} title="Open AI assistant"
        className="flex w-12 shrink-0 flex-col items-center gap-3 border-l border-admin-outline/30 bg-admin-bg/50 py-3 text-admin-secondary transition-colors hover:bg-admin-bg hover:text-admin-primary">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-admin-primary text-white shadow-sm">
          <Sparkle size={15} />
        </span>
        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-admin-secondary" style={{ writingMode: "vertical-rl" }}>AI Assistant</span>
      </button>
    );
  }

  /* ---------- expanded sidebar ---------- */
  return (
    <aside
      className={`relative flex shrink-0 flex-col border-l border-admin-outline/30 bg-white ${isResizing ? "" : "transition-all"} ${open ? "translate-x-0" : "translate-x-full"} ${dragOver ? "ring-2 ring-inset ring-admin-primary/10" : ""}`}
      style={{ width: open ? sidebarWidth : 0, minWidth: open ? 280 : 0 }}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); }}
    >
      {/* Resize handle */}
      <div
        onMouseDown={() => setIsResizing(true)}
        className={`absolute left-0 top-0 z-50 h-full w-1.5 cursor-col-resize transition-colors hover:bg-admin-primary/30 active:bg-admin-primary/50 ${isResizing ? "bg-admin-primary/40" : ""}`}
      />

      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b border-admin-outline/30 px-4 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-admin-primary text-white shadow-sm">
            <Sparkle size={14} />
          </div>
          <span className="font-bold text-admin-on-surface">AI Assistant</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setView(view === "chat" ? "history" : "chat")}
            className={`rounded-md px-2.5 py-1.5 text-xs font-bold transition-colors ${view === "history" ? "bg-admin-bg text-admin-primary" : "text-admin-secondary hover:bg-admin-bg hover:text-admin-primary"}`}
          >
            {view === "chat" ? "History" : "Back to Chat"}
          </button>
          <button onClick={onToggle} className="rounded-md p-1.5 text-admin-secondary/50 hover:bg-admin-bg hover:text-admin-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
      </div>

      {view === "chat" ? (
        <>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth">
            {msgs.map((m) => (
              <div key={m.id} className={`flex flex-col ${m.role === "USER" ? "items-end" : "items-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-[13.5px] leading-relaxed shadow-sm prose prose-sm prose-zinc ${
                  m.role === "USER" 
                    ? "bg-admin-primary text-white rounded-tr-none prose-invert shadow-blue-500/20 shadow-md" 
                    : "bg-admin-bg text-admin-on-surface rounded-tl-none border border-admin-outline/10"
                }`}>
                  {m.text && (
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
                        ul: ({children}) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
                        ol: ({children}) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
                        li: ({children}) => <li className="mb-1">{children}</li>,
                        table: ({children}) => (
                          <div className="overflow-x-auto my-2">
                            <table className="min-w-full border-collapse border border-admin-outline/30 text-xs">
                              {children}
                            </table>
                          </div>
                        ),
                        th: ({children}) => <th className="border border-admin-outline/30 px-2 py-1 bg-admin-surface font-bold text-admin-on-surface">{children}</th>,
                        td: ({children}) => <td className="border border-admin-outline/30 px-2 py-1 text-admin-secondary">{children}</td>,
                        code: ({children}) => <code className="bg-admin-surface px-1 rounded font-mono text-xs text-admin-primary">{children}</code>,
                        strong: ({children}) => <strong className="font-bold">{children}</strong>
                      }}
                    >
                      {m.text}
                    </ReactMarkdown>
                  )}

                  {/* Render QuestionCard if kind is questions */}
                  {m.role === "ASSISTANT" && m.kind === "questions" && m.result && (
                    <div className="mt-3">
                      <QuestionCard 
                        result={m.result}
                        summary={m.summary || ""}
                        onApply={onImport}
                        onResolved={(answerText) => submit(answerText)}
                        initialAnswers={m.initialAnswers}
                        initialDone={m.initialDone}
                        initialNotes={m.initialNotes}
                      />
                    </div>
                  )}

                  {/* Render Diagram Summary if kind is diagram */}
                  {m.role === "ASSISTANT" && m.kind === "diagram" && m.result && (
                    <div className="mt-3 rounded-lg border border-admin-primary/20 bg-admin-primary/5 p-2 text-[11px] text-admin-primary">
                      <div className="flex items-center gap-2 font-bold">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                        Diagram Generated
                      </div>
                      <p className="mt-1 opacity-70">
                        {m.result.nodes.length} nodes, {m.result.edges.length} edges. Applied to canvas.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex items-center gap-2 text-admin-secondary/50">
                <div className="flex gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-admin-primary/30"></span>
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-admin-primary/30 [animation-delay:0.2s]"></span>
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-admin-primary/30 [animation-delay:0.4s]"></span>
                </div>
                <span className="text-xs font-bold italic">AI đang suy nghĩ...</span>
              </div>
            )}
          </div>

          <div className="border-t border-admin-outline/30 bg-white p-4 shrink-0">
            <div className="relative flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="Hỏi AI hoặc yêu cầu vẽ..."
                disabled={busy}
                className="flex-1 rounded-xl border border-admin-outline/30 bg-admin-bg px-4 py-2.5 text-[13.5px] font-medium transition-all focus:border-admin-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-admin-primary/5 disabled:opacity-50"
              />
              <button
                onClick={() => submit()}
                disabled={!input.trim() || busy}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-admin-primary text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-30 disabled:hover:scale-100 shadow-md shadow-blue-500/10"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
              </button>
            </div>
            <p className="mt-2.5 text-center text-[10px] text-admin-secondary/60">
              AI có thể nhầm lẫn. Bro nên kiểm tra lại kỹ trước khi dùng nhé.
            </p>
          </div>
        </>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-admin-on-surface">Lịch sử trò chuyện</h3>
            <button
              onClick={startNewChat}
              className="flex items-center gap-1.5 rounded-lg bg-admin-primary px-3 py-1.5 text-[11px] font-bold text-white transition-transform hover:scale-105 shadow-md shadow-blue-500/10"
            >
              <span>+ New Chat</span>
            </button>
          </div>
          {sessions.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center text-admin-secondary/30">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-2 opacity-20"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              <p className="text-xs">Chưa có phiên chat nào</p>
            </div>
          ) : (
            sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => selectSession(s)}
                className={`group flex w-full flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all hover:border-admin-primary hover:bg-admin-bg/50 ${currentSessionId === s.anythingSessionId ? "border-admin-primary bg-admin-bg/50 ring-1 ring-admin-primary/10" : "border-admin-outline/10 bg-white"}`}
              >
                <span className="text-[13px] font-bold text-admin-on-surface line-clamp-1 group-hover:text-admin-primary">{s.title || "Untitled Session"}</span>
                <span className="text-[10px] text-admin-secondary/50">{new Date(s.updatedAt).toLocaleString()}</span>
              </button>
            ))
          )}
        </div>
      )}
    </aside>
  );
}
