import { useEffect, useRef, useState } from "react";
import { DIAGRAMS } from "../../../utils/diagrams";
import type { DiagramDef, DiagramType, PaletteItem } from "../../../types/diagrams";
import { useCanvasStore } from "../../../stores/canvasStore";
import { ShapeGlyph } from "./Glyphs";

const GLYPH = "#3f3f46";

function ConnectorGlyph({
  markerStart,
  markerEnd,
  dashed,
}: {
  markerStart?: string;
  markerEnd?: string;
  dashed: boolean;
}) {
  return (
    <svg width={56} height={14} viewBox="0 0 56 14">
      <line
        x1="8"
        y1="7"
        x2="48"
        y2="7"
        stroke={GLYPH}
        strokeWidth="1.5"
        strokeDasharray={dashed ? "5 4" : undefined}
        markerStart={markerStart || undefined}
        markerEnd={markerEnd || undefined}
      />
    </svg>
  );
}

function DiagramSwitcher({
  diagramType,
  onDiagramChange,
}: {
  diagramType: DiagramType;
  onDiagramChange: (id: DiagramType) => void;
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
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-left transition-colors hover:border-zinc-300 shadow-sm"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" />
            <path d="M10 6.5h4a3 3 0 0 1 3 3V14" />
          </svg>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-400">
            Diagram type
          </span>
          <span className="block truncate text-[14px] font-semibold text-zinc-900">
            {current.name}
          </span>
        </span>
        <svg
          className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="animate-pop absolute left-3 right-3 top-[60px] z-30 overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
          {DIAGRAMS.map((d) => {
            const active = d.id === diagramType;
            return (
              <button
                key={d.id}
                onClick={() => {
                  onDiagramChange(d.id);
                  setOpen(false);
                }}
                className={`flex w-full items-center px-3 py-2 text-left transition-colors ${
                  active ? "bg-zinc-100" : "hover:bg-zinc-50"
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-medium text-zinc-900">
                    {d.name}
                  </span>
                  <span className="block truncate text-[11px] text-zinc-400">
                    {d.hint}
                  </span>
                </span>
                {active && (
                  <svg className="ml-2 h-4 w-4 shrink-0 text-zinc-900" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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
  diagram,
  diagramType,
  onDiagramChange,
  onAddNode,
}: {
  diagram: DiagramDef;
  diagramType: DiagramType;
  onDiagramChange: (id: DiagramType) => void;
  onAddNode: (item: PaletteItem) => void;
}) {
  const activeEdgeId = useCanvasStore((s) => s.activeEdgeId);
  const setActiveEdgeId = useCanvasStore((s) => s.setActiveEdgeId);

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-zinc-200 bg-zinc-50/50 backdrop-blur-sm">
      <DiagramSwitcher
        diagramType={diagramType}
        onDiagramChange={onDiagramChange}
      />
      <div className="flex-1 overflow-y-auto custom-scrollbar px-3 pt-1 pb-4">
        <SectionLabel className="mt-6">Shapes</SectionLabel>
        <div className="grid grid-cols-2 gap-2">
          {diagram.nodes.map((item) => (
            <button
              key={item.type + item.label}
              draggable
              onDragStart={(e) => {
                // Set multiple formats for compatibility
                e.dataTransfer.setData("application/reactflow", item.type);
                e.dataTransfer.setData("shapeType", item.type);
                e.dataTransfer.setData("application/graphite", JSON.stringify(item));
                e.dataTransfer.setData("text/plain", item.type);
                e.dataTransfer.effectAllowed = "move";
              }}
              onClick={() => onAddNode(item)}
              className="group flex aspect-[5/4] cursor-grab flex-col items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white text-zinc-600 transition-all hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-[0_4px_14px_rgba(0,0,0,0.06)] active:cursor-grabbing active:translate-y-0"
              title={`Add ${item.label} (drag onto canvas)`}
            >
              <span className="opacity-80 transition-opacity group-hover:opacity-100">
                <ShapeGlyph type={item.type} />
              </span>
              <span className="text-[11px] font-medium leading-none text-zinc-500">
                {item.label}
              </span>
            </button>
          ))}
        </div>

        <SectionLabel className="mt-8">Connectors</SectionLabel>
        <div className="space-y-1.5">
          {diagram.edges.map((opt) => {
            const active = opt.id === activeEdgeId;
            return (
              <button
                key={opt.id}
                onClick={() => setActiveEdgeId(opt.id)}
                className={`flex w-full items-center gap-3 rounded-lg border px-2.5 py-2 text-left transition-colors ${
                  active
                    ? "border-zinc-900 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
                    : "border-transparent bg-white/60 hover:bg-white"
                }`}
              >
                <span className="flex h-4 w-14 shrink-0 items-center">
                  <ConnectorGlyph 
                    markerStart={opt.markerStart} 
                    markerEnd={opt.markerEnd} 
                    dashed={opt.dashed} 
                  />
                </span>
                <span
                  className={`text-[12px] font-medium ${
                    active ? "text-zinc-900" : "text-zinc-500"
                  }`}
                >
                  {opt.label}
                </span>
                {active && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-zinc-900" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-t border-zinc-200 px-4 py-4 bg-white/50">
        <p className="text-[11px] leading-relaxed text-zinc-400 italic">
          <span className="font-semibold text-zinc-500 not-italic">Tip:</span> drag a shape onto
          the canvas, or click to drop it in the center. Drag between handles to
          connect.
        </p>
      </div>
    </aside>
  );
}

function SectionLabel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={`mb-2.5 px-1 text-[10.5px] font-bold uppercase tracking-[0.12em] text-zinc-400/80 ${className}`}
    >
      {children}
    </p>
  );
}
