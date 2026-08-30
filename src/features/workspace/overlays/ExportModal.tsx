import { useCallback, useMemo, useState } from "react";
import { toast } from "../../../shared/lib/toast";
import { toMermaid, toPlantUml } from "../../../shared/lib/exporters";
import type { DiagramType, FlowEdge, FlowNode } from "../../../types";

type ExportFormat = "mermaid" | "plantuml";

interface ExportModalProps {
  nodes: FlowNode[];
  edges: FlowEdge[];
  diagramType: DiagramType;
  onClose: () => void;
}

const STYLES = {
  overlay:
    "fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4",
  card:
    "w-full max-w-3xl overflow-hidden rounded-2xl border border-zinc-200/70 bg-white shadow-2xl animate-pop",
  header:
    "flex items-center justify-between border-b border-zinc-100 px-6 py-4 bg-zinc-50/50",
  title: "text-[16px] font-bold text-zinc-900",
  closeBtn:
    "rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors",
  body: "p-6",
  tabRow: "flex gap-1 mb-4",
  tab: (active: boolean) =>
    `rounded-lg px-4 py-1.5 text-[12px] font-bold transition-all ${
      active
        ? "bg-blue-600 text-white shadow-sm"
        : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
    }`,
  codeBlock:
    "h-80 w-full overflow-auto rounded-xl border border-zinc-200 bg-zinc-50 p-4 font-mono text-[12.5px] leading-relaxed text-zinc-800 whitespace-pre-wrap break-all",
  footer:
    "flex items-center justify-between gap-3 border-t border-zinc-100 bg-zinc-50/50 px-6 py-4",
  copyBtn:
    "rounded-lg bg-blue-600 px-5 py-2 text-[13px] font-bold text-white transition-all hover:bg-blue-700 disabled:opacity-50 shadow-sm flex items-center gap-2",
  closeBtn2:
    "rounded-lg px-4 py-2 text-[13px] font-bold text-zinc-500 hover:bg-zinc-100 transition-colors",
  badge: (active: boolean) =>
    `rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all ${
      active
        ? "bg-blue-100 text-blue-700"
        : "bg-zinc-100 text-zinc-400 hover:bg-zinc-200"
    }`,
  stats: "flex items-center gap-4 text-[12px] text-zinc-400",
};

export function ExportModal({ nodes, edges, diagramType, onClose }: ExportModalProps) {
  const [tab, setTab] = useState<ExportFormat>("mermaid");

  const code = useMemo(() => {
    switch (tab) {
      case "mermaid":
        return toMermaid(nodes, edges, diagramType);
      case "plantuml":
        return toPlantUml(nodes, edges, diagramType);
    }
  }, [nodes, edges, diagramType, tab]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Copied to clipboard!");
    } catch {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      toast.success("Copied to clipboard!");
    }
  }, [code]);

  const handleDownload = useCallback(() => {
    const ext = tab === "mermaid" ? "mmd" : "puml";
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `diagram-${diagramType}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }, [code, tab, diagramType]);

  const tabs: { id: ExportFormat; label: string; desc: string }[] = [
    { id: "mermaid", label: "Mermaid", desc: "Mermaid.js live editor" },
    { id: "plantuml", label: "PlantUML", desc: "PlantUML server" },
  ];

  return (
    <div className={STYLES.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={STYLES.card}>
        {/* ── Header ── */}
        <div className={STYLES.header}>
          <h2 className={STYLES.title}>Export Diagram Code</h2>
          <button onClick={onClose} className={STYLES.closeBtn}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Body ── */}
        <div className={STYLES.body}>
          <p className="mb-4 text-[13px] text-zinc-500">
            Export your diagram as <strong>Mermaid</strong> or{" "}
            <strong>PlantUML</strong> code. Copy or download for use in
            documentation, wikis, or other tools.
          </p>

          {/* Format tabs */}
          <div className={STYLES.tabRow}>
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={STYLES.tab(tab === t.id)}
              >
                {t.label}
              </button>
            ))}
            <span className="ml-auto flex items-center gap-2">
              <span className={STYLES.badge(true)}>
                {nodes.length} nodes
              </span>
              <span className={STYLES.badge(edges.length > 0)}>
                {edges.length} edges
              </span>
            </span>
          </div>

          {/* Code block */}
          <div className={STYLES.codeBlock}>{code}</div>

          {/* Compat hint */}
          {tab === "mermaid" && (
            <p className="mt-3 text-[11px] text-blue-600/80 flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
              Paste into{" "}
              <a href="https://mermaid.live" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-800">mermaid.live</a>
              {" "}or use with Mermaid renderers.
            </p>
          )}
          {tab === "plantuml" && (
            <p className="mt-3 text-[11px] text-green-600/80 flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
              Paste into{" "}
              <a href="https://plantuml.com/plantuml/uml" target="_blank" rel="noopener noreferrer" className="underline hover:text-green-800">PlantUML server</a>
              {" "}or render locally with PlantUML CLI.
            </p>
          )}
        </div>

        {/* ── Footer ── */}
        <div className={STYLES.footer}>
          <span className={STYLES.stats}>
            <span>Format: {tab.toUpperCase()}</span>
            <span>{(code.match(/\n/g) || []).length + 1} lines</span>
          </span>
          <div className="flex gap-2">
            <button onClick={onClose} className={STYLES.closeBtn2}>
              Close
            </button>
            <button onClick={handleDownload} className="rounded-lg border border-zinc-300 px-4 py-2 text-[13px] font-bold text-zinc-600 transition-all hover:bg-zinc-100 flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download
            </button>
            <button onClick={handleCopy} className={STYLES.copyBtn}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              Copy to Clipboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
