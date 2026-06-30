import { useEffect, useRef, useState } from "react";
import type { ChatMsg, ChatSession, DiagramType, FlowEdge, FlowNode } from "../../types";
import { detectAndParse, EXAMPLES, type ParseResult } from "../../lib/importers";
import { QuestionCard } from "../overlays/QuestionBox";
import {
  deriveTitle,
  loadActive,
  loadChats,
  newSession,
  saveActive,
  saveChats,
} from "../../store/chatStore";

interface Msg {
  id: number;
  role: "user" | "assistant" | "card";
  text?: string;
  /** inline human-in-the-loop card */
  card?: { result: ParseResult; summary: string };
}

let mid = 0;
const nid = () => ++mid;

const GREETING =
  "Hi! I'm your diagram assistant. Paste Mermaid or PlantUML code (or use ```mermaid blocks) and I'll render it on the canvas. You can also upload a .mmd / .puml / .md / .txt file.";

function extractCode(text: string) {
  const fence = text.match(
    /```(?:mermaid|plantuml|mmd|pu|puml)?\s*\n([\s\S]*?)```/i
  );
  if (fence) return fence[1];
  if (/@startuml|classDiagram|flowchart|sequenceDiagram|graph\s+(TD|LR|TB|RL|BT)/i.test(text))
    return text;
  return null;
}

function Sparkle({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2z" />
      <path d="M19 14l.9 2.6L22.5 17.5 19.9 18.4 19 21l-.9-2.6L15.5 17.5l2.6-.9L19 14z" opacity="0.6" />
    </svg>
  );
}

/** Flatten chat messages to a storable shape (drop inline cards, keep text). */
const toStore = (msgs: Msg[]): ChatMsg[] =>
  msgs.flatMap<ChatMsg>((m) =>
    m.role === "user" || m.role === "assistant"
      ? [{ role: m.role, text: m.text ?? "" }]
      : []
  );

/**
 * Right-side, collapsible AI assistant sidebar. Import (Mermaid / PlantUML /
 * file upload) renders real nodes & edges. When relationships are ambiguous a
 * Human-in-the-loop QuestionBox appears. Chat sessions are saved to history.
 */
export function AIChat({
  open,
  onToggle,
  diagramType,
  onImport,
}: {
  open: boolean;
  onToggle: () => void;
  diagramType: DiagramType;
  onImport: (
    nodes: FlowNode[],
    edges: FlowEdge[],
    type?: DiagramType
  ) => void;
}) {
  const [msgs, setMsgs] = useState<Msg[]>(() => {
    const saved = loadActive();
    return saved?.length
      ? saved.map((m) => ({ ...m, id: nid() }))
      : [{ id: nid(), role: "assistant", text: GREETING }];
  });
  const [history, setHistory] = useState<ChatSession[]>(() => loadChats());
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [view, setView] = useState<"chat" | "history">("chat");

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // persist active session
  useEffect(() => {
    saveActive(toStore(msgs));
  }, [msgs]);

  useEffect(() => {
    if (scrollRef.current && view === "chat")
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [msgs, open, view]);

  const push = (role: Msg["role"], text: string) =>
    setMsgs((m) => [...m, { id: nid(), role, text }]);

  /* ---------- session management ---------- */
  const startNewChat = () => {
    const userMsgs = msgs.filter((m) => m.role === "user");
    if (userMsgs.length) {
      const session: ChatSession = {
        ...newSession(),
        title: deriveTitle(toStore(msgs)),
        messages: toStore(msgs),
        createdAt: Date.now(),
      };
      const next = [session, ...history].slice(0, 40);
      setHistory(next);
      saveChats(next);
    }
    setMsgs([{ id: nid(), role: "assistant", text: GREETING }]);
    setView("chat");
  };

  const loadSession = (id: string) => {
    const s = history.find((h) => h.id === id);
    if (!s) return;
    setHistory((h) => h.filter((x) => x.id !== id));
    const next = [...history.filter((x) => x.id !== id)];
    saveChats(next);
    setMsgs(s.messages.map((m) => ({ ...m, id: nid() })));
    setView("chat");
  };

  const deleteSession = (id: string) => {
    const next = history.filter((h) => h.id !== id);
    setHistory(next);
    saveChats(next);
  };

  /* ---------- import (with HITL) ---------- */
  const commitImport = (res: ParseResult, summary: string) => {
    if (res.questions && res.questions.length > 0) {
      push(
        "assistant",
        `I parsed ${res.nodes.length} shapes, but ${res.questions.length} relationship${res.questions.length === 1 ? "" : "s"} need your confirmation. Answer below to finalize.`
      );
      setMsgs((m) => [...m, { id: nid(), role: "card", card: { result: res, summary } }]);
      return;
    }
    onImport(res.nodes, res.edges, res.type);
    push("assistant", summary + ".");
  };

  const handleImport = (text: string) => {
    const code = extractCode(text) ?? text;
    try {
      const res = detectAndParse(code);
      if (!res.nodes.length) {
        push("assistant", "I couldn't find any shapes in that. Try pasting a Mermaid `classDiagram`, `flowchart`, or `sequenceDiagram`, or a PlantUML `@startuml` block.");
        return;
      }
      const summary = `Imported ${res.nodes.length} shapes and ${res.edges.length} connectors as a ${res.format} ${res.type ?? diagramType} diagram`;
      commitImport(res, summary);
    } catch {
      push("assistant", "Sorry, I couldn't parse that code. Double-check the Mermaid / PlantUML syntax.");
    }
  };

  const submit = () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    push("user", text);
    setBusy(true);
    setTimeout(() => {
      const code = extractCode(text);
      if (code) {
        handleImport(text);
      } else {
        const lower = text.toLowerCase();
        const match =
          lower.includes("class") && lower.includes("plant") ? "classPlant"
            : lower.includes("class") ? "classMermaid"
            : lower.includes("flow") || lower.includes("activity") ? "flowMermaid"
            : lower.includes("sequence") ? "sequenceMermaid"
            : null;
        if (match && EXAMPLES[match]) {
          handleImport(EXAMPLES[match].code);
        } else {
          push("assistant", "Paste Mermaid or PlantUML code and I'll draw it. Examples: a `classDiagram`, `flowchart TD`, `sequenceDiagram`, or PlantUML `@startuml ... @enduml`.");
        }
      }
      setBusy(false);
    }, 320);
  };

  const onPickExample = (key: string) => {
    const ex = EXAMPLES[key];
    if (!ex) return;
    push("user", `Show a ${ex.title} example`);
    setBusy(true);
    setTimeout(() => {
      handleImport(ex.code);
      setBusy(false);
    }, 260);
  };

  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result ?? "");
      push("user", `Uploaded “${file.name}”`);
      const lower = file.name.toLowerCase();
      if (lower.endsWith(".json")) {
        try {
          const data = JSON.parse(content);
          if (Array.isArray(data.nodes)) {
            onImport(data.nodes, data.edges ?? [], data.diagramType);
            push("assistant", `Loaded ${data.nodes.length} shapes from your Graphite JSON file.`);
            return;
          }
        } catch { /* fall through */ }
        push("assistant", "That JSON didn't look like a Graphite diagram.");
        return;
      }
      handleImport(content);
    };
    reader.readAsText(file);
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
      onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) readFile(f); }}
    >
      {dragOver && (
        <div className="pointer-events-none absolute inset-3 z-20 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-900 bg-white/80 text-center backdrop-blur-sm">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-700">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M17 8l-5-5-5 5" /><path d="M12 3v12" />
          </svg>
          <p className="text-[13px] font-semibold text-zinc-800">Drop to import</p>
          <p className="text-[11px] text-zinc-500">.mmd · .puml · .md · .txt · .json</p>
        </div>
      )}

      {/* header */}
      <div className="flex h-12 shrink-0 items-center gap-1.5 border-b border-[var(--line)] px-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white">
          <Sparkle size={15} />
        </span>
        <div className="leading-tight">
          <div className="text-[13px] font-semibold text-zinc-900">{view === "history" ? "Chat history" : "Assistant"}</div>
          <div className="text-[10px] text-zinc-400">{view === "history" ? `${history.length} saved` : "Mermaid · PlantUML · files"}</div>
        </div>

        <div className="ml-auto flex items-center gap-0.5">
          {view === "history" ? (
            <button onClick={() => setView("chat")} title="Back to chat"
              className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
            </button>
          ) : (
            <>
              <button onClick={startNewChat} title="New chat"
                className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
              </button>
              <button onClick={() => setView("history")} title="Chat history" disabled={history.length === 0}
                className="relative flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-35">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l3 2" />
                </svg>
                {history.length > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-zinc-900 px-1 text-[8px] font-bold text-white">{history.length}</span>
                )}
              </button>
            </>
          )}
          <button onClick={onToggle} title="Collapse (reopen from the right rail)"
            className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
      </div>

      {/* body */}
      {view === "history" ? (
        <div className="flex-1 overflow-y-auto scroll-thin px-2 py-2">
          {history.length === 0 ? (
            <p className="px-3 py-8 text-center text-[12.5px] text-zinc-400">No saved chats yet. Start a conversation and it'll appear here.</p>
          ) : (
            history.map((s) => (
              <div key={s.id} className="group flex items-center gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-zinc-50">
                <button onClick={() => loadSession(s.id)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-zinc-500">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-medium text-zinc-800">{s.title}</span>
                    <span className="block text-[10.5px] text-zinc-400">{new Date(s.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                  </span>
                </button>
                <button onClick={() => deleteSession(s.id)} title="Delete"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M9 7V5h6v2M6.5 7l1 13h9l1-13" /></svg>
                </button>
              </div>
            ))
          )}
        </div>
      ) : (
        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto scroll-thin px-3 py-3">
          {msgs.map((m) =>
            m.role === "card" && m.card ? (
              <div key={m.id} className="flex justify-start">
                <div className="w-full">
                  <QuestionCard result={m.card.result} summary={m.card.summary} onApply={(nodes, edges, type) => onImport(nodes, edges, type)} onResolved={(text) => push("assistant", text)} />
                </div>
              </div>
            ) : (
              <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-[12.5px] leading-relaxed ${m.role === "user" ? "rounded-br-sm bg-zinc-900 text-white" : "rounded-bl-sm bg-zinc-100 text-zinc-700"}`}>
                  {m.text}
                </div>
              </div>
            )
          )}
          {busy && (
            <div className="flex justify-start">
              <div className="flex gap-1 rounded-2xl rounded-bl-sm bg-zinc-100 px-3 py-2.5">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400" style={{ animationDelay: `${i * 0.12}s` }} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* composer (only in chat view) */}
      {view === "chat" && (
        <div className="shrink-0 border-t border-[var(--line)] px-3 py-2">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {Object.keys(EXAMPLES).map((k) => (
              <button key={k} onClick={() => onPickExample(k)}
                className="rounded-full border border-[var(--line)] bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-500 transition-colors hover:border-zinc-900 hover:text-zinc-900">
                {EXAMPLES[k].title}
              </button>
            ))}
          </div>
          <div className="flex items-end gap-2">
            <button onClick={() => fileRef.current?.click()} title="Upload file (.mmd, .puml, .md, .txt, .json)"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--line)] text-zinc-500 transition-colors hover:border-zinc-900 hover:text-zinc-900">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 17.93 8.83l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
            </button>
            <input ref={fileRef} type="file" accept=".mmd,.puml,.pu,.md,.txt,.json" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) readFile(f); e.target.value = ""; }} />
            <textarea rows={1} value={input} placeholder="Paste Mermaid / PlantUML, or ask…"
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
              className="max-h-28 min-h-[36px] flex-1 resize-none rounded-lg border border-[var(--line)] bg-white px-2.5 py-2 text-[12.5px] text-zinc-900 outline-none transition-shadow placeholder:text-zinc-300 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 scroll-thin" />
            <button onClick={submit} disabled={!input.trim() || busy} title="Send"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white transition-colors hover:bg-zinc-800 disabled:opacity-35">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
