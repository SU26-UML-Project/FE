import { useCanvasStore } from '../../stores/canvasStore'
import { getDiagram } from '../../utils/diagrams'
import type { FlowNode, FlowEdge, FlowNodeData } from '../../types/diagrams'

const NODE_NAMES: Record<string, string> = {
  action: "Action",
  decision: "Decision",
  start: "Start node",
  final: "Final node",
  fork: "Fork / Join",
  cls: "Class",
  component: "Component",
  usecase: "Use case",
  actor: "Actor",
  lifeline: "Lifeline",
  note: "Note",
  text: "Label",
  package: "Container",
};

const inputCls =
  "w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[13px] text-zinc-900 outline-none transition-shadow placeholder:text-zinc-300 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10";
const labelCls =
  "mb-1 block text-[11px] font-semibold uppercase tracking-[0.07em] text-zinc-400";

export function PropsPanel({ onClose }: { onClose: () => void }) {
  const diagramType = useCanvasStore(s => s.diagramType)
  const selectedNodes = useCanvasStore(s => s.selectedNodes)
  const selectedEdges = useCanvasStore(s => s.selectedEdges)
  const setNodeData = useCanvasStore(s => s.setNodeData)
  const setEdgeLabel = useCanvasStore(s => s.setEdgeLabel)
  const setEdgeType = useCanvasStore(s => s.setEdgeType)
  const setEdgeMarker = useCanvasStore(s => s.setEdgeMarker)
  const setEdgeDashed = useCanvasStore(s => s.setEdgeDashed)
  const flipEdge = useCanvasStore(s => s.flipEdge)
  const deleteNode = useCanvasStore(s => s.deleteNode)
  const deleteEdge = useCanvasStore(s => s.deleteEdge)
  const duplicateNode = useCanvasStore(s => s.duplicateNode)
  const alignNodes = useCanvasStore(s => s.alignNodes)

  const multi = selectedNodes.length + selectedEdges.length > 1
  const node = selectedNodes[0]
  const edge = selectedEdges[0]
  const nodesCount = useCanvasStore(s => s.nodes.length)
  const edgesCount = useCanvasStore(s => s.edges.length)

  return (
    <aside className="flex w-72 shrink-0 flex-col border-l border-zinc-200 bg-zinc-50/50 backdrop-blur-sm">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-zinc-200 pl-4 pr-2">
        <span className="text-[13px] font-semibold text-zinc-900 uppercase tracking-wider">Inspector</span>
        <button
          title="Hide panel"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-200/60 hover:text-zinc-900"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-thin">
        {multi ? (
          <MultiEditor
            nodeCount={selectedNodes.length}
            edgeCount={selectedEdges.length}
            onAlign={alignNodes}
            onDelete={() => {
                selectedNodes.forEach(n => deleteNode(n.id))
                selectedEdges.forEach(e => deleteEdge(e.id))
            }}
          />
        ) : node ? (
          <NodeEditor
            node={node}
            onChange={(patch) => setNodeData(node.id, patch)}
            onDelete={() => deleteNode(node.id)}
            onDuplicate={() => duplicateNode(node.id)}
          />
        ) : edge ? (
          <EdgeEditor
            edge={edge}
            diagramType={diagramType}
            onChange={(patch) => {
              if (patch.label !== undefined) setEdgeLabel(edge.id, patch.label)
              if (patch.type !== undefined) setEdgeType(edge.id, patch.type as any)
              if (patch.markerEnd !== undefined || patch.markerStart !== undefined) {
                setEdgeMarker(edge.id, { markerStart: patch.markerStart, markerEnd: patch.markerEnd })
              }
              if (patch.dashed !== undefined) setEdgeDashed(edge.id, patch.dashed)
              if (patch.color !== undefined) {
                useCanvasStore.getState().setEdgeStyle(edge.id, { stroke: patch.color });
                useCanvasStore.getState().setNodeData(edge.id, { color: patch.color });
              }
            }}
            onFlip={() => flipEdge(edge.id)}
            onDelete={() => deleteEdge(edge.id)}
          />
        ) : (
          <EmptyState nodesLen={nodesCount} edgesLen={edgesCount} />
        )}
      </div>
    </aside>
  );
}

function EdgePreview({ markerEnd, markerStart, dashed }: { markerEnd?: string; markerStart?: string; dashed?: boolean }) {
  // Extract ID from url(#id) or use as is
  const getMarkerId = (m?: string) => {
    if (!m) return "";
    const match = m.match(/url\(#(.+)\)/);
    return match ? match[1] : m;
  };

  const mid = getMarkerId(markerEnd);
  const sid = getMarkerId(markerStart);

  return (
    <svg width="80" height="30" viewBox="0 0 80 30" fill="none" className="text-zinc-500">
      <path
        d="M15 15 H65"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeDasharray={dashed ? "4 3" : undefined}
      />
      
      {/* Target Markers (End) */}
      {mid === "m-arrow" && <path d="M60 10 L66 15 L60 20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />}
      {mid === "m-arrow-open" && <path d="M60 10 L66 15 L60 20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />}
      {mid === "m-triangle" && <path d="M58 8 L68 15 L58 22 Z" fill="white" stroke="currentColor" strokeWidth="1.5" />}
      {mid === "m-diamond-filled" && <path d="M58 15 L63 10 L68 15 L63 20 Z" fill="currentColor" />}
      {mid === "m-diamond-open" && <path d="M58 15 L63 10 L68 15 L63 20 Z" fill="white" stroke="currentColor" strokeWidth="1.5" />}
      
      {/* Source Markers (Start) */}
      {sid === "m-arrow-start" && <path d="M20 10 L14 15 L20 20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />}
      {sid === "m-arrow-open-start" && <path d="M20 10 L14 15 L20 20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />}
      {sid === "m-triangle-start" && <path d="M22 8 L12 15 L22 22 Z" fill="white" stroke="currentColor" strokeWidth="1.5" />}
      {sid === "m-diamond-filled-start" && <path d="M22 15 L17 10 L12 15 L17 20 Z" fill="currentColor" />}
      {sid === "m-diamond-open-start" && <path d="M22 15 L17 10 L12 15 L17 20 Z" fill="white" stroke="currentColor" strokeWidth="1.5" />}
    </svg>
  );
}

function NodeEditor({
  node,
  onChange,
  onDelete,
  onDuplicate,
}: {
  node: FlowNode;
  onChange: (patch: Partial<FlowNodeData>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const d = node.data as FlowNodeData;
  const isClass = node.type === "cls";
  const colors = ["#ffffff", "#fef9c3", "#dcfce7", "#dbeafe", "#fce7f3", "#f3f4f6"];

  return (
    <div className="animate-in fade-in slide-in-from-right-2 duration-300 space-y-5">
      <div className="flex items-center gap-2">
        <span className="rounded-md bg-zinc-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">
          {NODE_NAMES[node.type || ""] ?? node.type}
        </span>
      </div>

      <div className="space-y-4">
        <div>
          <label className={labelCls}>Label</label>
          <input
            className={inputCls}
            value={d.label ?? ""}
            placeholder="Untitled"
            onChange={(e) => onChange({ label: e.target.value })}
          />
        </div>

        <div>
          <label className={labelCls}>Fill Color</label>
          <div className="flex flex-wrap gap-1.5">
            {colors.map((c) => (
              <button
                key={c}
                onClick={() => onChange({ color: c })}
                className="h-6 w-6 rounded-md border border-zinc-200 shadow-sm transition-transform hover:scale-110 active:scale-95"
                style={{ backgroundColor: c, ring: d.color === c ? "2px solid #000" : "none" }}
              />
            ))}
          </div>
        </div>

        {isClass && (
          <>
            <div>
              <label className={labelCls}>Stereotype</label>
              <input
                className={inputCls}
                value={d.stereotype ?? ""}
                placeholder="«interface»"
                onChange={(e) => onChange({ stereotype: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls}>Attributes</label>
              <textarea
                rows={4}
                className={inputCls + " font-mono text-[11px] resize-y leading-relaxed"}
                value={d.attributes ?? ""}
                placeholder={"- name: String\n- age: int"}
                onChange={(e) => onChange({ attributes: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls}>Methods</label>
              <textarea
                rows={4}
                className={inputCls + " font-mono text-[11px] resize-y leading-relaxed"}
                value={d.methods ?? ""}
                placeholder={"+ method(): void"}
                onChange={(e) => onChange({ methods: e.target.value })}
              />
            </div>
          </>
        )}

        {(node.type === "note" || node.type === "text") && (
          <div>
            <label className={labelCls}>Content</label>
            <textarea
              rows={5}
              className={inputCls + " resize-y leading-relaxed"}
              value={d.label ?? ""}
              placeholder="Write something..."
              onChange={(e) => onChange({ label: e.target.value })}
            />
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-4 border-t border-zinc-100">
        <SecondaryBtn onClick={onDuplicate}>Duplicate</SecondaryBtn>
        <DangerBtn onClick={onDelete}>Delete</DangerBtn>
      </div>
    </div>
  );
}

function EdgeEditor({
  edge,
  diagramType,
  onChange,
  onFlip,
  onDelete,
}: {
  edge: FlowEdge;
  diagramType: string;
  onChange: (patch: Partial<any>) => void;
  onFlip: () => void;
  onDelete: () => void;
}) {
  const diagram = getDiagram(diagramType);
  const opts = diagram.edges;
  const colors = ["#27272a", "#ef4444", "#3b82f6", "#10b981", "#f59e0b"];
  
  const markerEnd = (edge.data as any)?.marker || edge.markerEnd || "";
  const markerStart = (edge.data as any)?.markerStart || edge.markerStart || "";
  const dashed = !!(edge.data as any)?.dashed || !!edge.style?.strokeDasharray;
  const edgeColor = (edge.data as any)?.color || edge.style?.stroke || "#27272a";
  
  const currentIdx = opts.findIndex(
    (o) =>
      o.markerEnd === markerEnd &&
      (o.markerStart ?? "") === markerStart &&
      o.dashed === dashed &&
      o.path === edge.type
  );

  return (
    <div className="animate-in fade-in slide-in-from-right-2 duration-300 space-y-5">
      <span className="inline-block rounded-md bg-zinc-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">
        Connector
      </span>

      <div className="space-y-4">
        <div>
          <label className={labelCls}>Label</label>
          <input
            className={inputCls}
            value={(edge.label as string) ?? ""}
            placeholder="guard / message…"
            onChange={(e) => onChange({ label: e.target.value })}
          />
        </div>

        <div>
          <label className={labelCls}>Stroke Color</label>
          <div className="flex flex-wrap gap-1.5">
            {colors.map((c) => (
              <button
                key={c}
                onClick={() => onChange({ color: c })}
                className="h-6 w-6 rounded-md border border-zinc-200 shadow-sm transition-transform hover:scale-110 active:scale-95"
                style={{ backgroundColor: c, ring: edgeColor === c ? "2px solid #000" : "none" }}
              />
            ))}
          </div>
        </div>

        <div>
          <label className={labelCls}>Presets</label>
          <div className="grid grid-cols-2 gap-2">
            {opts.map((o, i) => (
              <button
                key={o.id}
                onClick={() => {
                  onChange({
                    label: o.autoLabel || (edge.label as string),
                    markerEnd: o.markerEnd,
                    markerStart: o.markerStart,
                    dashed: o.dashed,
                    type: o.path
                  });
                }}
                className={`flex flex-col items-center gap-2 rounded-lg border p-2 transition-all hover:bg-white ${
                   currentIdx === i ? "border-zinc-900 bg-white ring-1 ring-zinc-900" : "border-zinc-200 bg-zinc-50/50"
                 }`}
               >
                 <div className="flex h-8 w-full items-center justify-center opacity-60">
                   <EdgePreview markerEnd={o.markerEnd} markerStart={o.markerStart} dashed={o.dashed} />
                 </div>
                 <span className="text-[10px] font-medium text-zinc-600">{o.label}</span>
               </button>
            ))}
          </div>
        </div>

        <div>
          <label className={labelCls}>Path Style</label>
          <div className="grid grid-cols-3 gap-1">
            {(['smoothstep', 'bezier', 'straight'] as const).map(p => (
              <button
                key={p}
                onClick={() => onChange({ type: p })}
                className={`px-2 py-1.5 text-[11px] font-medium border rounded-md transition-all ${
                  (edge.type || 'smoothstep') === p 
                    ? 'bg-zinc-900 border-zinc-900 text-white' 
                    : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300'
                }`}
              >
                {p === 'smoothstep' ? 'Orth' : p === 'bezier' ? 'Curve' : 'Line'}
              </button>
            ))}
          </div>
        </div>

        <label className="flex cursor-pointer items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2 transition-colors hover:border-zinc-300">
          <span className="text-[13px] font-medium text-zinc-700">Dashed line</span>
          <Toggle on={dashed} onClick={() => onChange({ dashed: !dashed })} />
        </label>

        <button
          onClick={onFlip}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white py-2 text-[13px] font-medium text-zinc-700 transition-all hover:border-zinc-900 hover:bg-zinc-50 shadow-sm active:scale-95"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m7 21-4-4 4-4" />
            <path d="M3 17h18" />
            <path d="m17 3 4 4-4 4" />
            <path d="M21 7H3" />
          </svg>
          Flip direction
        </button>
      </div>

      <div className="pt-4 border-t border-zinc-100">
        <DangerBtn onClick={onDelete}>Delete connector</DangerBtn>
      </div>
    </div>
  );
}

function EmptyState({ nodesLen, edgesLen }: { nodesLen: number; edgesLen: number }) {
  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Nodes" value={nodesLen} />
        <Stat label="Edges" value={edgesLen} />
      </div>
      
      <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <h4 className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">Quick Hints</h4>
        <div className="space-y-2.5">
          <Hint k="Double-click" v="Quick add / Rename" />
          <Hint k="Drag handle" v="Connect nodes" />
          <Hint k="Right-click" v="Context menu" />
          <Hint k="Delete" v="Remove selected" />
          <Hint k="Space+Drag" v="Pan canvas" />
        </div>
      </div>
    </div>
  );
}

function MultiEditor({ 
  nodeCount, 
  edgeCount, 
  onAlign, 
  onDelete 
}: { 
  nodeCount: number; 
  edgeCount: number; 
  onAlign: (mode: any) => void;
  onDelete: () => void;
}) {
  return (
    <div className="animate-in fade-in slide-in-from-right-2 duration-300 space-y-6">
      <div className="flex items-center gap-2">
        <span className="rounded-md bg-zinc-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">
          Multiple Selection
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Nodes" value={nodeCount} />
        <Stat label="Edges" value={edgeCount} />
      </div>

      {nodeCount >= 2 && (
        <div>
          <label className={labelCls}>Alignment</label>
          <div className="grid grid-cols-4 gap-1">
            <AlignBtn mode="left" title="Align left" onAlign={onAlign} />
            <AlignBtn mode="centerH" title="Align center horizontal" onAlign={onAlign} />
            <AlignBtn mode="right" title="Align right" onAlign={onAlign} />
            <AlignBtn mode="distH" title="Distribute horizontal" onAlign={onAlign} />
            <AlignBtn mode="top" title="Align top" onAlign={onAlign} />
            <AlignBtn mode="centerV" title="Align center vertical" onAlign={onAlign} />
            <AlignBtn mode="bottom" title="Align bottom" onAlign={onAlign} />
            <AlignBtn mode="distV" title="Distribute vertical" onAlign={onAlign} />
          </div>
        </div>
      )}

      <div className="pt-4 border-t border-zinc-100">
        <DangerBtn onClick={onDelete}>Delete selection</DangerBtn>
      </div>
    </div>
  );
}

function AlignBtn({ mode, title, onAlign }: { mode: string; title: string; onAlign: (m: any) => void }) {
  return (
    <button
      onClick={() => onAlign(mode)}
      title={title}
      className="flex h-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-500 transition-all hover:border-zinc-900 hover:bg-zinc-50 hover:text-zinc-900 shadow-sm active:scale-95"
    >
      <AlignIcon mode={mode as any} />
    </button>
  );
}

function AlignIcon({ mode }: { mode: 'left' | 'centerH' | 'right' | 'top' | 'centerV' | 'bottom' | 'distH' | 'distV' }) {
    const line = { stroke: "currentColor", strokeWidth: 1.3 } as const;
    const bar = { fill: "currentColor", opacity: 0.85 } as const;
    const common = {
      width: 16,
      height: 16,
      viewBox: "0 0 16 16",
      fill: "none",
    } as const;
    switch (mode) {
      case "left":
        return (
          <svg {...common}>
            <line x1="3" y1="2" x2="3" y2="14" {...line} />
            <rect x="4.5" y="3" width="7.5" height="2.6" rx="0.8" {...bar} />
            <rect x="4.5" y="8.4" width="5" height="2.6" rx="0.8" {...bar} />
          </svg>
        );
      case "centerH":
        return (
          <svg {...common}>
            <line x1="8" y1="1" x2="8" y2="15" {...line} />
            <rect x="3.5" y="3" width="9" height="2.6" rx="0.8" {...bar} />
            <rect x="5" y="8.4" width="6" height="2.6" rx="0.8" {...bar} />
          </svg>
        );
      case "right":
        return (
          <svg {...common}>
            <line x1="13" y1="2" x2="13" y2="14" {...line} />
            <rect x="4" y="3" width="7.5" height="2.6" rx="0.8" {...bar} />
            <rect x="6.5" y="8.4" width="5" height="2.6" rx="0.8" {...bar} />
          </svg>
        );
      case "top":
        return (
          <svg {...common}>
            <line x1="2" y1="3" x2="14" y2="3" {...line} />
            <rect x="3" y="4.5" width="8" height="2.6" rx="0.8" {...bar} />
            <rect x="8.5" y="4.5" width="4.5" height="2.6" rx="0.8" {...bar} />
          </svg>
        );
      case "centerV":
        return (
          <svg {...common}>
            <line x1="1" y1="8" x2="15" y2="8" {...line} />
            <rect x="3.5" y="5.5" width="3" height="5" rx="0.8" {...bar} />
            <rect x="8.5" y="3" width="3" height="10" rx="0.8" {...bar} />
          </svg>
        );
      case "bottom":
        return (
          <svg {...common}>
            <line x1="2" y1="13" x2="14" y2="13" {...line} />
            <rect x="3" y="6.4" width="8" height="2.6" rx="0.8" {...bar} />
            <rect x="8.5" y="6.4" width="4.5" height="2.6" rx="0.8" {...bar} />
          </svg>
        );
      case "distH":
        return (
          <svg {...common}>
            <rect x="2" y="5" width="3" height="6" rx="0.8" {...bar} />
            <rect x="6.5" y="5" width="3" height="6" rx="0.8" {...bar} />
            <rect x="11" y="5" width="3" height="6" rx="0.8" {...bar} />
          </svg>
        );
      case "distV":
        return (
          <svg {...common}>
            <rect x="5" y="2" width="6" height="3" rx="0.8" {...bar} />
            <rect x="5" y="6.5" width="6" height="3" rx="0.8" {...bar} />
            <rect x="5" y="11" width="6" height="3" rx="0.8" {...bar} />
          </svg>
        );
    }
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3 text-center shadow-sm">
      <div className="text-[24px] font-bold tabular-nums text-zinc-900 leading-none">
        {value}
      </div>
      <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
        {label}
      </div>
    </div>
  );
}

function Hint({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center gap-3 text-[12px]">
      <span className="shrink-0 rounded-md border border-zinc-200 bg-white px-1.5 py-0.5 font-mono text-[10px] font-bold text-zinc-500 shadow-sm">
        {k}
      </span>
      <span className="text-zinc-500 font-medium">{v}</span>
    </div>
  );
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={`relative h-5 w-9 rounded-full transition-colors ${
        on ? "bg-zinc-900" : "bg-zinc-200"
      }`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
          on ? "translate-x-4.5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function DangerBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-[12px] font-bold text-zinc-700 transition-all hover:border-red-500 hover:bg-red-50 hover:text-red-600"
    >
      {children}
    </button>
  );
}

function SecondaryBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-[12px] font-bold text-zinc-700 transition-all hover:border-zinc-900 hover:bg-zinc-50"
    >
      {children}
    </button>
  );
}
