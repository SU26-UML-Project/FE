import { useEffect, useRef, useState } from "react";
import { DIAGRAMS } from "../../lib/diagrams";
import type { DiagramDef, DiagramType, PaletteItem } from "../../types";

const GLYPH = "#565e74"; // admin-secondary

export function ShapeGlyph({ type }: { type: string }) {
  const common = {
    width: 26, height: 20, viewBox: "0 0 26 20", fill: "none" as const,
    stroke: GLYPH, strokeWidth: 1.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
  };
  switch (type) {
    case "start":
      return (<svg {...common}><circle cx="13" cy="10" r="6" fill={GLYPH} stroke="none" /></svg>);
    case "final":
      return (<svg {...common}><circle cx="13" cy="10" r="7" fill="#fff" /><circle cx="13" cy="10" r="3.4" fill={GLYPH} stroke="none" /></svg>);
    case "action":
      return (<svg {...common}><rect x="2.5" y="5" width="21" height="10" rx="3" fill="#fff" /></svg>);
    case "decision":
      return (<svg {...common}><polygon points="13,2 24,10 13,18 2,10" fill="#fff" /></svg>);
    case "fork":
      return (<svg {...common}><rect x="2" y="8.5" width="22" height="3" rx="1.5" fill={GLYPH} stroke="none" /></svg>);
    case "cls":
      return (<svg {...common}><rect x="3" y="3" width="20" height="14" rx="2" fill="#fff" /><line x1="3" y1="8" x2="23" y2="8" /><line x1="3" y1="12" x2="23" y2="12" /></svg>);
    case "component":
      return (<svg {...common}><rect x="6" y="4" width="16" height="12" rx="2" fill="#fff" /><rect x="2" y="6.5" width="5" height="3" fill="#fff" /><rect x="2" y="10.5" width="5" height="3" fill="#fff" /></svg>);
    case "usecase":
      return (<svg {...common}><ellipse cx="13" cy="10" rx="10.5" ry="6" fill="#fff" /></svg>);
    case "actor":
      return (<svg {...common}><circle cx="13" cy="4.5" r="2.4" fill="#fff" /><line x1="13" y1="7" x2="13" y2="13.5" /><line x1="8" y1="9.5" x2="18" y2="9.5" /><line x1="13" y1="13.5" x2="10" y2="18" /><line x1="13" y1="13.5" x2="16" y2="18" /></svg>);
    case "lifeline":
      return (<svg {...common}><rect x="4" y="2.5" width="18" height="6" rx="2" fill="#fff" /><line x1="13" y1="8.5" x2="13" y2="18" strokeDasharray="2 2" /></svg>);
    case "note":
      return (<svg {...common}><path d="M3 3 H17 L23 8 V18 H3 Z" fill="#f6f6f7" /><path d="M17 3 V8 H23" /></svg>);
    case "text":
      return (<svg {...common}><text x="13" y="14" fontSize="9" textAnchor="middle" fill={GLYPH} stroke="none" fontFamily="Inter">Aa</text></svg>);
    case "package":
      return (<svg {...common}><path d="M3 6 V17 H23 V8 H12 L10 6 Z" fill="#fff" /></svg>);
    default:
      return (<svg {...common}><rect x="4" y="4" width="18" height="12" rx="2" fill="#fff" /></svg>);
  }
}

function ConnectorGlyph({ markerEnd, markerStart, dashed }: {
  markerEnd?: string; markerStart?: string; dashed: boolean;
}) {
  return (
    <svg width={56} height={14} viewBox="0 0 56 14">
      <line x1="9" y1="7" x2="47" y2="7" stroke={GLYPH} strokeWidth="1.5"
        strokeDasharray={dashed ? "5 4" : undefined}
        markerStart={markerStart || undefined} markerEnd={markerEnd || undefined} />
    </svg>
  );
}

function DiagramSwitcher({ diagramType, onDiagramChange }: {
  diagramType: DiagramType; onDiagramChange: (id: DiagramType) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = DIAGRAMS.find((d) => d.id === diagramType) ?? DIAGRAMS[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0 px-3 pt-3">
      <button onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 rounded-xl border border-admin-outline/30 bg-white px-3 py-2.5 text-left transition-colors hover:border-admin-primary">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-admin-primary text-white">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" />
            <path d="M10 6.5h4a3 3 0 0 1 3 3V14" />
          </svg>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-bold uppercase tracking-[0.1em] text-admin-secondary/60">Diagram type</span>
          <span className="block truncate text-[14px] font-bold text-admin-on-surface">{current.name}</span>
        </span>
        <svg className={`h-4 w-4 shrink-0 text-admin-secondary/50 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="animate-pop absolute left-3 right-3 top-[60px] z-30 overflow-hidden rounded-xl border border-admin-outline/30 bg-white py-1 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
          {DIAGRAMS.map((d) => {
            const active = d.id === diagramType;
            return (
              <button key={d.id}
                onClick={() => { onDiagramChange(d.id); setOpen(false); }}
                className={`flex w-full items-center px-3 py-2 text-left transition-colors ${active ? "bg-admin-bg text-admin-primary" : "hover:bg-admin-bg/50"}`}>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-bold text-admin-on-surface">{d.name}</span>
                  <span className="block truncate text-[11px] text-admin-secondary/70">{d.hint}</span>
                </span>
                {active && (
                  <svg className="ml-2 h-4 w-4 shrink-0 text-admin-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Sidebar({
  diagram, diagramType, onDiagramChange, activeEdgeId, onPickEdge, onAddNode, open, onToggle,
}: {
  diagram: DiagramDef;
  diagramType: DiagramType;
  onDiagramChange: (id: DiagramType) => void;
  activeEdgeId: string;
  onPickEdge: (id: string) => void;
  onAddNode: (item: PaletteItem) => void;
  open: boolean;
  onToggle: () => void;
}) {
  // Collapsed — slim launcher rail (mirrors the right AI rail).
  if (!open) {
    return (
      <button onClick={onToggle} title="Show shapes & connectors"
        className="flex w-12 shrink-0 flex-col items-center gap-3 border-r border-admin-outline/30 bg-admin-bg/50 py-3 text-admin-secondary transition-colors hover:bg-admin-bg hover:text-admin-primary">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-admin-primary text-white">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
            <line x1="14" y1="4" x2="21" y2="4" />
            <line x1="14" y1="8" x2="21" y2="8" />
            <line x1="14" y1="15" x2="21" y2="15" />
            <line x1="14" y1="19" x2="21" y2="19" />
          </svg>
        </span>
        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-admin-secondary" style={{ writingMode: "vertical-rl" }}>Shapes</span>
      </button>
    );
  }

  return (
    <aside className="relative flex w-60 shrink-0 flex-col border-r border-admin-outline/30 bg-admin-bg/30">
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-admin-outline/30 px-3">
        <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-admin-secondary/50">Library</span>
        <button onClick={onToggle} title="Collapse"
          className="flex h-6 w-6 items-center justify-center rounded-md text-admin-secondary/50 transition-colors hover:bg-admin-surface hover:text-admin-on-surface">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
      </div>
      <DiagramSwitcher diagramType={diagramType} onDiagramChange={onDiagramChange} />
      <div className="flex-1 overflow-y-auto scroll-thin px-3 pt-3 pb-4">
        <SectionLabel>Shapes</SectionLabel>
        <div className="grid grid-cols-2 gap-2">
          {diagram.nodes.map((item) => (
            <button key={item.type + item.label} draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("application/graphite", JSON.stringify(item));
                e.dataTransfer.effectAllowed = "move";
              }}
              onClick={() => onAddNode(item)}
              className="group flex aspect-[5/4] cursor-grab flex-col items-center justify-center gap-1.5 rounded-xl border border-admin-outline/30 bg-white text-admin-secondary transition-all hover:-translate-y-0.5 hover:border-admin-primary hover:shadow-[0_4px_14px_rgba(0,0,0,0.06)] active:cursor-grabbing active:translate-y-0"
              title={`Add ${item.label} (drag onto canvas)`}>
              <span className="opacity-80 transition-opacity group-hover:opacity-100">
                <ShapeGlyph type={item.type} />
              </span>
              <span className="text-[11px] font-bold leading-none text-admin-secondary/80 group-hover:text-admin-primary">{item.label}</span>
            </button>
          ))}
        </div>

        <SectionLabel className="mt-6">Connectors</SectionLabel>
        <div className="space-y-1.5">
          {diagram.edges.map((opt) => {
            const active = opt.id === activeEdgeId;
            return (
              <button key={opt.id} onClick={() => onPickEdge(opt.id)}
                className={`flex w-full items-center gap-3 rounded-lg border px-2.5 py-2 text-left transition-colors ${active ? "border-admin-primary bg-white shadow-[0_2px_8px_rgba(0,74,198,0.08)]" : "border-transparent bg-white/60 hover:bg-white"}`}>
                <span className="flex h-4 w-14 shrink-0 items-center">
                  <ConnectorGlyph markerEnd={opt.markerEnd} markerStart={opt.markerStart} dashed={opt.dashed} />
                </span>
                <span className={`text-[12px] font-bold ${active ? "text-admin-primary" : "text-admin-secondary/70"}`}>{opt.label}</span>
                {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-admin-primary" />}
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

function SectionLabel({ children, className = "" }: {
  children: React.ReactNode; className?: string;
}) {
  return (
    <p className={`mb-2.5 px-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-zinc-400 ${className}`}>
      {children}
    </p>
  );
}
