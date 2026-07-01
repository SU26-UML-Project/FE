import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { DiagramType, FlowEdge, FlowNode } from "../../types";
import type { 
  ChatSession, 
  ChatMessage, 
  DiagramChatResponse, 
  ChatQuestion 
} from "../../types/ai";
import { detectAndParse, type ParseResult } from "../../lib/importers";
import { QuestionCard } from "../overlays/QuestionBox";
import { chatService } from "../../services/chatService";
import { toast } from "react-hot-toast";
import { useParams } from "react-router-dom";

interface Msg {
  id: string;
  role: "USER" | "ASSISTANT" | "card";
  text?: string;
  /** inline human-in-the-loop card */
  card?: { result: ParseResult; summary: string };
  timestamp?: string;
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
  "Chào bro! Tôi là trợ lý vẽ biểu đồ UML. Bro có thể yêu cầu tôi vẽ class, sequence, activity diagram hoặc dán code Mermaid/PlantUML vào đây nhé.";

/**
 * Right-side, collapsible AI assistant sidebar.
 */
export function AIChat({
  open,
  onToggle,
  diagramType,
  activeSheetId,
  onImport,
}: {
  open: boolean;
  onToggle: () => void;
  diagramType: DiagramType;
  activeSheetId: string;
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

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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
      setCurrentSessionId(res.result.anythingSessionId);
      setMsgs([{ id: "greeting", role: "ASSISTANT", text: GREETING }]);
      setView("chat");
    } catch (err: any) {
      toast.error(err.message || "Không thể tạo phiên chat mới");
    } finally {
      setBusy(false);
    }
  };

  const selectSession = async (session: ChatSession) => {
    try {
      setBusy(true);
      const res = await chatService.getHistory(session.anythingSessionId);
      setCurrentSessionId(session.anythingSessionId);
      
      const historyMsgs: Msg[] = res.result.messages.map((m, idx) => ({
        id: `hist-${idx}`,
        role: m.role,
        text: m.content,
        timestamp: m.createdAt
      }));
      
      setMsgs(historyMsgs.length ? historyMsgs : [{ id: "greeting", role: "ASSISTANT", text: GREETING }]);
      setView("chat");
    } catch (err: any) {
      toast.error(err.message || "Không thể tải lịch sử phiên chat");
    } finally {
      setBusy(false);
    }
  };

  const handleAiResponse = (res: DiagramChatResponse) => {
    let displayText = res.answer;
    let actions = res.actions;

    // --- FALLBACK & CLEANUP LOGIC ---
    try {
      // 1. Nếu answer là một JSON string thuần túy
      if (displayText.trim().startsWith('{') && displayText.trim().endsWith('}')) {
        const parsed = JSON.parse(displayText);
        if (parsed.message) displayText = parsed.message;
        if (!actions || actions.length === 0) actions = parsed.actions;
        if (!res.questions || res.questions.length === 0) res.questions = parsed.questions;
      } 
      // 2. Nếu answer chứa block JSON (Markdown hoặc Raw)
      else {
        const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/g;
        let match;
        let extractedMessage = "";
        
        while ((match = codeBlockRegex.exec(res.answer)) !== null) {
          try {
            const parsed = JSON.parse(match[1]);
            if (parsed.actions && (!actions || actions.length === 0)) actions = parsed.actions;
            if (parsed.questions && (!res.questions || res.questions.length === 0)) res.questions = parsed.questions;
            if (parsed.message) extractedMessage = parsed.message;
            
            displayText = displayText.replace(match[0], "").trim();
          } catch (e) {}
        }

        // Nếu sau khi xóa block mà text trống, dùng message trích xuất được
        if (!displayText && extractedMessage) {
          displayText = extractedMessage;
        }

        // Nếu vẫn còn JSON thô chưa bọc block
        if (displayText.includes('{')) {
          const rawMatches = displayText.match(/\{[\s\S]*\}/g);
          if (rawMatches) {
            rawMatches.forEach(m => {
              try {
                const parsed = JSON.parse(m);
                if (parsed.actions && (!actions || actions.length === 0)) actions = parsed.actions;
                if (parsed.questions && (!res.questions || res.questions.length === 0)) res.questions = parsed.questions;
                if (!displayText.replace(m, "").trim() && parsed.message) {
                  displayText = parsed.message;
                } else {
                  displayText = displayText.replace(m, "").trim();
                }
              } catch (e) {}
            });
          }
        }
      }
    } catch (e) {
      console.warn("FE Parser: Could not extract clean message or actions", e);
    }

    // Đảm bảo displayText không bao giờ rỗng
    if (!displayText.trim()) {
      displayText = "Bro xem thử sơ đồ tôi vừa cập nhật nhé!";
    }

    // 3. Cập nhật tin nhắn hiển thị cho người dùng (đã sạch JSON)
    const aiMsg: Msg = {
      id: `ai-${Date.now()}`,
      role: "ASSISTANT",
      text: displayText
    };
    setMsgs(prev => [...prev, aiMsg]);

    const detectDiagramType = (nodes: any[]): DiagramType | undefined => {
      if (!nodes || nodes.length === 0) return undefined;
      const types = nodes.map(n => n.type || n.data?.type).filter(Boolean);
      if (types.includes('lifeline')) return 'sequence';
      if (types.includes('cls')) return 'class';
      if (types.includes('usecase')) return 'usecase';
      if (types.includes('action') || types.includes('decision')) return 'activity';
      if (types.includes('component')) return 'component';
      return undefined;
    };

    // Hàm bổ trợ để chuẩn hóa dữ liệu node từ AI
    const sanitizeNodes = (nodes: any): FlowNode[] => {
      if (!Array.isArray(nodes)) return [];

      return nodes
        .filter(node => {
          if (!node) return false;
          // Lọc bỏ các node không phù hợp với loại biểu đồ hiện tại để tránh lỗi layout
          if (diagramType === 'usecase' || diagramType === 'activity' || diagramType === 'class') {
            if (node.type === 'lifeline') return false;
          }
          return true;
        })
        .map(node => {
          // Xử lý cấu trúc flatten từ backend (nếu có)
          const id = String(node.id || node.data?.id || `node-${Math.random().toString(36).substr(2, 9)}`);
          
          // Ưu tiên data có sẵn, nếu không thì lấy các trường ở root (flatten)
          const rawData = node.data || node || {};

          // Ưu tiên node.type, sau đó đến node.data.type
          // Nếu vẫn thiếu, tự động gán dựa trên diagramType
          let type = node.type || rawData.type;
          if (!type) {
            switch (diagramType) {
              case 'class': type = 'cls'; break;
              case 'usecase': type = 'usecase'; break;
              case 'sequence': type = 'lifeline'; break;
              case 'activity': type = 'action'; break;
              default: type = 'action';
            }
          }
          
          // Xác định kích thước mặc định dựa trên loại node (giúp layout chính xác hơn)
          // Đồng bộ chính xác với lib/diagrams.ts
          let w = 150;
          let h = 100;
          switch (type) {
            case 'actor': w = 76; h = 124; break;
            case 'usecase': w = 170; h = 82; break;
            case 'cls': 
              // Phân biệt Class và Interface dựa trên stereotype nếu có
              if (rawData.stereotype?.includes('interface')) {
                w = 200; h = 104;
              } else {
                w = 210; h = 150;
              }
              break;
            case 'action': w = 150; h = 54; break;
            case 'decision': w = 150; h = 104; break;
            case 'start': w = 38; h = 38; break;
            case 'final': w = 40; h = 40; break;
            case 'note': w = 170; h = 90; break;
            case 'lifeline': w = 150; h = 340; break;
            case 'package': w = 360; h = 240; break;
            case 'fork': w = 130; h = 12; break;
            case 'component': w = 180; h = 92; break;
          }
          
          const data = { 
            label: String(rawData.label || ""),
            stereotype: rawData.stereotype ? String(rawData.stereotype) : undefined,
            attributes: rawData.attributes,
            methods: rawData.methods,
            color: rawData.color ? String(rawData.color) : undefined,
            fill: rawData.fill ? String(rawData.fill) : undefined
          };

          // Đảm bảo attributes và methods luôn là string
          if (Array.isArray(data.attributes)) {
            data.attributes = data.attributes.join("\n");
          } else {
            data.attributes = data.attributes ? String(data.attributes) : "";
          }

          if (Array.isArray(data.methods)) {
            data.methods = data.methods.join("\n");
          } else {
            data.methods = data.methods ? String(data.methods) : "";
          }

          // Xử lý position
          const posRaw = node.position || {};
          const position = { 
            x: Number(posRaw.x ?? node.x ?? 0), 
            y: Number(posRaw.y ?? node.y ?? 0) 
          };

          const finalW = Number(node.width || w);
          const finalH = Number(node.height || h);

          return { 
            ...node,
            id,
            type,
            position,
            data,
            width: finalW,
            height: finalH,
            style: { width: finalW, height: finalH }
          } as FlowNode;
        });
    };

    const sanitizeEdges = (edges: any, validNodeIds: Set<string>): FlowEdge[] => {
      if (!Array.isArray(edges)) return [];
      
      return edges
        .filter(edge => {
          if (!edge) return false;
          const source = edge.source || edge.data?.source;
          const target = edge.target || edge.data?.target;
          // Chỉ giữ lại edge nối giữa các node tồn tại
          return source && target && validNodeIds.has(String(source)) && validNodeIds.has(String(target));
        })
        .map(edge => {
          const rawData = edge.data || edge || {};
          return {
            ...edge,
            id: String(edge.id || `edge-${Math.random().toString(36).substr(2, 9)}`),
            source: String(edge.source || edge.data?.source),
            target: String(edge.target || edge.data?.target),
            label: edge.label ? String(edge.label) : undefined,
            type: edge.type || 'smoothstep',
            data: {
              marker: rawData.marker,
              markerStart: rawData.markerStart,
              dashed: !!rawData.dashed,
              color: rawData.color
            }
          } as FlowEdge;
        });
    };

    // 2. Xử lý các câu hỏi làm rõ (HITL)
    if (res.questions && Array.isArray(res.questions) && res.questions.length > 0) {
      // Map ChatQuestion sang ImportQuestion format mà QuestionBox hiểu
      const importQuestions = res.questions.map((q: any, idx: number) => {
        // Hỗ trợ cả trường hợp q là string hoặc object
        const prompt = typeof q === 'string' ? q : (q.title || q.prompt || "AI cần bro xác nhận");
        const options = Array.isArray(q.options) ? q.options.map((opt: any) => ({ label: typeof opt === 'string' ? opt : opt.label })) : [];
        
        return {
          id: `q-${idx}`,
          prompt: prompt,
          multiple: q.type === "multi_select",
          options: options
        };
      });

      // Ở đây chúng ta tạm thời dùng logic parse thô từ text nếu backend chưa trả newState
      let result: ParseResult = { nodes: [], edges: [], format: "raw", questions: importQuestions };
      
      if (res.newState) {
        try {
          const data = JSON.parse(res.newState);
          const sanitizedNodes = sanitizeNodes(data.nodes || []);
          const nodeIds = new Set(sanitizedNodes.map(n => n.id));
          result.nodes = sanitizedNodes;
          result.edges = sanitizeEdges(data.edges || [], nodeIds);
        } catch (e) {
          console.error("Failed to parse newState", e);
        }
      }

      setMsgs(prev => [...prev, { 
        id: `card-${Date.now()}`, 
        role: "card", 
        card: { result, summary: "AI cần bro xác nhận một số thông tin" } 
      }]);
    } else if (res.newState || (actions && actions.length > 0)) {
      // 3. Nếu không có câu hỏi, cập nhật trực tiếp canvas
      if (res.newState) {
        try {
          const data = JSON.parse(res.newState);
          if (data.nodes || data.edges) {
            const detectedType = detectDiagramType(data.nodes || []);
            const sanitizedNodes = sanitizeNodes(data.nodes || []);
            const nodeIds = new Set(sanitizedNodes.map(n => n.id));
            onImport(sanitizedNodes, sanitizeEdges(data.edges || [], nodeIds), detectedType || diagramType);
          }
        } catch (e) {
          console.error("Failed to parse newState for import", e);
        }
      } else if (actions && actions.length > 0) {
        // FALLBACK: Nếu backend không trả newState nhưng có actions, FE tự xử lý logic ADD/UPDATE/DELETE
        const nodesFromActions = actions.filter(a => a.type === 'ADD_NODE').map(a => a.data);
        const detectedType = detectDiagramType(nodesFromActions);
        handleIncrementalActions(actions, detectedType);
      }
    }
  };

  /**
   * Xử lý các action đơn lẻ (ADD_NODE, ADD_EDGE, ...) khi BE không trả về newState hoàn chỉnh.
   */
  const handleIncrementalActions = (actions: any, detectedType?: DiagramType) => {
    if (!Array.isArray(actions)) return;
    
    const nodes: FlowNode[] = [];
    const edges: FlowEdge[] = [];
    const existingNodeIds = new Set<string>(); // Đây là hạn chế vì chúng ta không biết các node hiện có

    actions.forEach(act => {
      if (!act || !act.data) return;

      if (act.type === 'ADD_NODE') {
        const nodeRaw = act.data;
        const id = String(nodeRaw.id || `node-${Math.random().toString(36).substr(2, 9)}`);
        
        // Suy luận type cho incremental actions nếu thiếu
        let type = nodeRaw.type;
        if (!type) {
          const targetType = detectedType || diagramType;
          switch (targetType) {
            case 'class': type = 'cls'; break;
            case 'usecase': type = 'usecase'; break;
            case 'sequence': type = 'lifeline'; break;
            case 'activity': type = 'action'; break;
            default: type = 'action';
          }
        }
 
        const data = { 
          label: String(nodeRaw.label || ""),
          stereotype: nodeRaw.stereotype ? String(nodeRaw.stereotype) : undefined,
          attributes: nodeRaw.attributes,
          methods: nodeRaw.methods,
          color: nodeRaw.color ? String(nodeRaw.color) : undefined,
          fill: nodeRaw.fill ? String(nodeRaw.fill) : undefined
        };

        if (Array.isArray(data.attributes)) data.attributes = data.attributes.join("\n");
        else data.attributes = data.attributes ? String(data.attributes) : "";

        if (Array.isArray(data.methods)) data.methods = data.methods.join("\n");
        else data.methods = data.methods ? String(data.methods) : "";

        // Xác định kích thước mặc định dựa trên loại node
        // Đồng bộ chính xác với lib/diagrams.ts
        let w = 150;
        let h = 100;
        switch (type) {
          case 'actor': w = 76; h = 124; break;
          case 'usecase': w = 170; h = 82; break;
          case 'cls': 
            if (nodeRaw.stereotype?.includes('interface')) {
              w = 200; h = 104;
            } else {
              w = 210; h = 150;
            }
            break;
          case 'action': w = 150; h = 54; break;
          case 'decision': w = 150; h = 104; break;
          case 'start': w = 38; h = 38; break;
          case 'final': w = 40; h = 40; break;
          case 'note': w = 170; h = 90; break;
          case 'lifeline': w = 150; h = 340; break;
          case 'package': w = 360; h = 240; break;
          case 'fork': w = 130; h = 12; break;
          case 'component': w = 180; h = 92; break;
        }

        const finalW = Number(nodeRaw.width || w);
        const finalH = Number(nodeRaw.height || h);

        nodes.push({
          id,
          type,
          position: { 
            x: Number(nodeRaw.position?.x ?? nodeRaw.x ?? 0), 
            y: Number(nodeRaw.position?.y ?? nodeRaw.y ?? 0) 
          },
          data: data,
          width: finalW,
          height: finalH,
          style: { width: finalW, height: finalH }
        } as FlowNode);
        existingNodeIds.add(id);
      } else if (act.type === 'ADD_EDGE') {
        const edgeRaw = act.data;
        const source = String(edgeRaw.source || edgeRaw.data?.source);
        const target = String(edgeRaw.target || edgeRaw.data?.target);
        
        if (source && target) {
          edges.push({
            id: String(edgeRaw.id || `edge-${Math.random().toString(36).substr(2, 9)}`),
            source,
            target,
            label: edgeRaw.label ? String(edgeRaw.label) : undefined,
            type: edgeRaw.type || 'smoothstep',
            data: {
              marker: edgeRaw.marker || edgeRaw.data?.marker,
              markerStart: edgeRaw.markerStart || edgeRaw.data?.markerStart,
              dashed: !!(edgeRaw.dashed || edgeRaw.data?.dashed),
              color: edgeRaw.color || edgeRaw.data?.color
            }
          } as FlowEdge);
        }
      }
    });

    if (nodes.length > 0 || edges.length > 0) {
      // Lưu ý: Việc gọi onImport ở đây sẽ GHI ĐÈ sơ đồ hiện tại.
      // Vì AI thường trả về TOÀN BỘ các node mới cần thêm, nên onImport là ổn cho fallback.
      onImport(nodes, edges, detectedType || diagramType);
    }
  };

  const submit = async () => {
    const text = input.trim();
    if (!text || busy) return;

    setInput("");
    const userMsg: Msg = { id: `user-${Date.now()}`, role: "USER", text };
    setMsgs(prev => [...prev, userMsg]);
    setBusy(true);

    try {
      // 1. Đảm bảo có sessionId (sử dụng biến cục bộ để tránh stale state)
      let activeSessionId = currentSessionId;
      if (!activeSessionId) {
        const sessionRes = await chatService.createSession();
        // Backend trả về sessionId trong result (thường là uuid hoặc anythingSessionId)
        activeSessionId = sessionRes.result.sessionId || (sessionRes.result as any).anythingSessionId;
        setCurrentSessionId(activeSessionId);
      }

      // 2. Sử dụng activeSheetId từ props (UUID chuẩn từ Backend)
      const currentSheetId = activeSheetId;

      const res = await chatService.sendChat({
        message: text,
        sessionId: activeSessionId,
        sheetId: currentSheetId
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
        className="flex w-12 shrink-0 flex-col items-center gap-3 border-l border-[var(--line)] bg-[var(--bg-soft)] py-3 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white">
          <Sparkle size={15} />
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500" style={{ writingMode: "vertical-rl" }}>AI Assistant</span>
      </button>
    );
  }

  /* ---------- expanded sidebar ---------- */
  return (
    <aside
      className={`relative flex w-[360px] max-w-[44vw] shrink-0 flex-col border-l border-[var(--line)] bg-white ${dragOver ? "ring-2 ring-inset ring-zinc-900" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); }}
    >
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b border-[var(--line)] px-4 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900 text-white">
            <Sparkle size={14} />
          </div>
          <span className="font-semibold text-zinc-900">AI Assistant</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setView(view === "chat" ? "history" : "chat")}
            className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${view === "history" ? "bg-zinc-100 text-zinc-900" : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"}`}
          >
            {view === "chat" ? "History" : "Back to Chat"}
          </button>
          <button onClick={onToggle} className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
      </div>

      {view === "chat" ? (
        <>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth">
            {msgs.map((m) => (
              <div key={m.id} className={`flex flex-col ${m.role === "USER" ? "items-end" : "items-start"}`}>
                {m.role === "card" && m.card ? (
                  <div className="w-full max-w-[320px]">
                    <QuestionCard
                      result={m.card.result}
                      summary={m.card.summary}
                      onApply={(res) => {
                        onImport(res.nodes, res.edges, res.type);
                        setMsgs(prev => prev.filter(x => x.id !== m.id));
                        setMsgs(prev => [...prev, { id: `sys-${Date.now()}`, role: "ASSISTANT", text: "Đã cập nhật biểu đồ theo lựa chọn của bro!" }]);
                      }}
                    />
                  </div>
                ) : (
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-[13.5px] leading-relaxed shadow-sm prose prose-sm prose-zinc ${
                    m.role === "USER" 
                      ? "bg-zinc-900 text-white rounded-tr-none prose-invert" 
                      : "bg-zinc-100 text-zinc-800 rounded-tl-none border border-zinc-200/50"
                  }`}>
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
                        ul: ({children}) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
                        ol: ({children}) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
                        li: ({children}) => <li className="mb-1">{children}</li>,
                        table: ({children}) => (
                          <div className="overflow-x-auto my-2">
                            <table className="min-w-full border-collapse border border-zinc-300 text-xs">
                              {children}
                            </table>
                          </div>
                        ),
                        th: ({children}) => <th className="border border-zinc-300 px-2 py-1 bg-zinc-200 font-bold">{children}</th>,
                        td: ({children}) => <td className="border border-zinc-300 px-2 py-1">{children}</td>,
                        code: ({children}) => <code className="bg-zinc-200 px-1 rounded font-mono text-xs text-zinc-900">{children}</code>,
                        strong: ({children}) => <strong className="font-bold">{children}</strong>
                      }}
                    >
                      {m.text || ""}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            ))}
            {busy && (
              <div className="flex items-center gap-2 text-zinc-400">
                <div className="flex gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-300"></span>
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-300 [animation-delay:0.2s]"></span>
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-300 [animation-delay:0.4s]"></span>
                </div>
                <span className="text-xs font-medium italic">AI đang suy nghĩ...</span>
              </div>
            )}
          </div>

          <div className="border-t border-[var(--line)] bg-white p-4 shrink-0">
            <div className="relative flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="Hỏi AI hoặc yêu cầu vẽ..."
                disabled={busy}
                className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-[13.5px] transition-all focus:border-zinc-900 focus:bg-white focus:outline-none focus:ring-4 focus:ring-zinc-900/5 disabled:opacity-50"
              />
              <button
                onClick={submit}
                disabled={!input.trim() || busy}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-30 disabled:hover:scale-100"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
              </button>
            </div>
            <p className="mt-2.5 text-center text-[10px] text-zinc-400">
              AI có thể nhầm lẫn. Bro nên kiểm tra lại kỹ trước khi dùng nhé.
            </p>
          </div>
        </>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-zinc-900">Lịch sử trò chuyện</h3>
            <button
              onClick={startNewChat}
              className="flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-[11px] font-bold text-white transition-transform hover:scale-105"
            >
              <span>+ New Chat</span>
            </button>
          </div>
          {sessions.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center text-zinc-400">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-2 opacity-20"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              <p className="text-xs">Chưa có phiên chat nào</p>
            </div>
          ) : (
            sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => selectSession(s)}
                className={`group flex w-full flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all hover:border-zinc-900 hover:bg-zinc-50 ${currentSessionId === s.anythingSessionId ? "border-zinc-900 bg-zinc-50" : "border-zinc-100 bg-white"}`}
              >
                <span className="text-[13px] font-semibold text-zinc-900 line-clamp-1">{s.title || "Untitled Session"}</span>
                <span className="text-[10px] text-zinc-400">{new Date(s.updatedAt).toLocaleString()}</span>
              </button>
            ))
          )}
        </div>
      )}
    </aside>
  );
}
