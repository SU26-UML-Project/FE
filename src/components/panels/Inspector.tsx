import type { DiagramType, FlowEdge, FlowNode, FlowNodeData } from "../../types";
import { getDiagram, patchFromOption } from "../../lib/diagrams";
import {
    COLOR_PALETTE,
    ConnectorGlyph,
    MARKER_SHAPES,
    type MarkerShape,
} from "../shared/Glyphs";
import { resolveEdgeMultiplicity } from "../../utils/edgeMultiplicity";

const NODE_NAMES: Record<string, string> = {
    action: "Action", decision: "Decision", start: "Start node", final: "Final node",
    fork: "Fork / Join", cls: "Class", component: "Component", usecase: "Use case",
    actor: "Actor", note: "Note", text: "Label", package: "Container",
    swimlane: "Swimlane",
};

const inputCls = "w-full rounded-lg border border-admin-outline/30 bg-white px-2.5 py-1.5 text-[13px] text-admin-on-surface font-medium outline-none transition-shadow placeholder:text-admin-secondary/30 focus:border-admin-primary focus:ring-4 focus:ring-admin-primary/5";
const labelCls = "mb-1 block text-[11px] font-bold uppercase tracking-[0.07em] text-admin-secondary/60";

export type AlignMode = "left" | "centerH" | "right" | "top" | "centerV" | "bottom" | "distH" | "distV";

export function Inspector(props: {
    nodesLen: number; edgesLen: number; activeConnectorName: string;
    selNodes: FlowNode[]; selEdges: FlowEdge[]; diagramType: DiagramType;
    allNodes?: FlowNode[];
    onUpdateNodeParent?: (id: string, parentId: string | undefined) => void;
    onUpdateNode: (id: string, patch: Partial<FlowNodeData>) => void;
    onUpdateEdge: (id: string, patch: { label?: string; marker?: string; markerStart?: string; type?: string; dashed?: boolean; color?: string; flip?: boolean }) => void;
    onDelete: () => void; onDuplicate: () => void; onAlign: (mode: AlignMode) => void; onClose: () => void;
}) {
    const node = props.selNodes[0];
    const edge = props.selEdges[0];
    const multi = props.selNodes.length + props.selEdges.length > 1;

    return (
        <aside className="flex w-72 shrink-0 flex-col border-l border-admin-outline/30 bg-admin-bg/30">
            <div className="flex h-12 shrink-0 items-center justify-between border-b border-admin-outline/30 pl-4 pr-2">
                <span className="text-[13px] font-bold text-admin-on-surface">Inspector</span>
                <button title="Hide panel" onClick={props.onClose}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-admin-secondary/50 transition-colors hover:bg-admin-surface hover:text-admin-on-surface">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto scroll-thin px-4 py-4">
                {multi ? (
                    <MultiState count={props.selNodes.length + props.selEdges.length} nodeCount={props.selNodes.length}
                                onDelete={props.onDelete} onDuplicate={props.onDuplicate} onAlign={props.onAlign} />
                ) : node ? (
                    <NodeEditor node={node} allNodes={props.allNodes} onUpdateParent={props.onUpdateNodeParent} onChange={(patch) => props.onUpdateNode(node.id, patch)} onDelete={props.onDelete} onDuplicate={props.onDuplicate} />
                ) : edge ? (
                    <EdgeEditor edge={edge} diagramType={props.diagramType} onChange={(patch) => props.onUpdateEdge(edge.id, patch)} onDelete={props.onDelete} />
                ) : (
                    <EmptyState nodesLen={props.nodesLen} edgesLen={props.edgesLen} activeConnectorName={props.activeConnectorName} />
                )}
            </div>
        </aside>
    );
}

function AlignIcon({ mode }: { mode: AlignMode }) {
    const line = { stroke: "currentColor", strokeWidth: 1.3 } as const;
    const bar = { fill: "currentColor", opacity: 0.85 } as const;
    const common = { width: 16, height: 16, viewBox: "0 0 16 16", fill: "none" } as const;
    switch (mode) {
        case "left": return (<svg {...common}><line x1="3" y1="2" x2="3" y2="14" {...line} /><rect x="4.5" y="3" width="7.5" height="2.6" rx="0.8" {...bar} /><rect x="4.5" y="8.4" width="5" height="2.6" rx="0.8" {...bar} /></svg>);
        case "centerH": return (<svg {...common}><line x1="8" y1="1" x2="8" y2="15" {...line} /><rect x="3.5" y="3" width="9" height="2.6" rx="0.8" {...bar} /><rect x="5" y="8.4" width="6" height="2.6" rx="0.8" {...bar} /></svg>);
        case "right": return (<svg {...common}><line x1="13" y1="2" x2="13" y2="14" {...line} /><rect x="4" y="3" width="7.5" height="2.6" rx="0.8" {...bar} /><rect x="6.5" y="8.4" width="5" height="2.6" rx="0.8" {...bar} /></svg>);
        case "top": return (<svg {...common}><line x1="2" y1="3" x2="14" y2="3" {...line} /><rect x="3" y="4.5" width="8" height="2.6" rx="0.8" {...bar} /><rect x="8.5" y="4.5" width="4.5" height="2.6" rx="0.8" {...bar} /></svg>);
        case "centerV": return (<svg {...common}><line x1="1" y1="8" x2="15" y2="8" {...line} /><rect x="3.5" y="5.5" width="3" height="5" rx="0.8" {...bar} /><rect x="8.5" y="3" width="3" height="10" rx="0.8" {...bar} /></svg>);
        case "bottom": return (<svg {...common}><line x1="2" y1="13" x2="14" y2="13" {...line} /><rect x="3" y="6.4" width="8" height="2.6" rx="0.8" {...bar} /><rect x="8.5" y="6.4" width="4.5" height="2.6" rx="0.8" {...bar} /></svg>);
        case "distH": return (<svg {...common}><rect x="2" y="5" width="3" height="6" rx="0.8" {...bar} /><rect x="6.5" y="5" width="3" height="6" rx="0.8" {...bar} /><rect x="11" y="5" width="3" height="6" rx="0.8" {...bar} /></svg>);
        case "distV": return (<svg {...common}><rect x="5" y="2" width="6" height="3" rx="0.8" {...bar} /><rect x="5" y="6.5" width="6" height="3" rx="0.8" {...bar} /><rect x="5" y="11" width="6" height="3" rx="0.8" {...bar} /></svg>);
    }
}

function AlignButton({ mode, title, onAlign, disabled }: {
    mode: AlignMode; title: string; onAlign: (m: AlignMode) => void; disabled?: boolean;
}) {
    return (
        <button title={title} disabled={disabled} onClick={() => onAlign(mode)}
                className="flex h-8 items-center justify-center rounded-lg border border-admin-outline/30 bg-white text-admin-secondary transition-colors enabled:hover:border-admin-primary enabled:hover:bg-admin-primary enabled:hover:text-white disabled:opacity-35">
            <AlignIcon mode={mode} />
        </button>
    );
}

function MultiState({ count, nodeCount, onDelete, onDuplicate, onAlign }: {
    count: number; nodeCount: number; onDelete: () => void; onDuplicate: () => void; onAlign: (m: AlignMode) => void;
}) {
    const canAlign = nodeCount >= 2;
    const canDistribute = nodeCount >= 3;
    return (
        <div className="animate-fade-in space-y-5">
            <p className="text-[13px] text-admin-secondary"><span className="font-bold text-admin-primary">{count}</span> elements selected</p>
            {canAlign && (
                <div className="space-y-2">
                    <label className={labelCls}>Align</label>
                    <div className="grid grid-cols-3 gap-1.5">
                        <AlignButton mode="left" title="Align left" onAlign={onAlign} />
                        <AlignButton mode="centerH" title="Align horizontal centers" onAlign={onAlign} />
                        <AlignButton mode="right" title="Align right" onAlign={onAlign} />
                        <AlignButton mode="top" title="Align top" onAlign={onAlign} />
                        <AlignButton mode="centerV" title="Align vertical centers" onAlign={onAlign} />
                        <AlignButton mode="bottom" title="Align bottom" onAlign={onAlign} />
                    </div>
                </div>
            )}
            {canDistribute && (
                <div className="space-y-2">
                    <label className={labelCls}>Distribute</label>
                    <div className="grid grid-cols-2 gap-1.5">
                        <AlignButton mode="distH" title="Distribute horizontally" onAlign={onAlign} />
                        <AlignButton mode="distV" title="Distribute vertically" onAlign={onAlign} />
                    </div>
                </div>
            )}
            <div className="flex gap-2 pt-1">
                <SecondaryBtn onClick={onDuplicate}>Duplicate</SecondaryBtn>
                <DangerBtn onClick={onDelete}>Delete</DangerBtn>
            </div>
        </div>
    );
}

function NodeEditor({ node, allNodes = [], onUpdateParent, onChange, onDelete, onDuplicate }: {
    node: FlowNode; allNodes?: FlowNode[]; onUpdateParent?: (id: string, parentId: string | undefined) => void;
    onChange: (patch: Partial<FlowNodeData>) => void; onDelete: () => void; onDuplicate: () => void;
}) {
    const d = node.data as FlowNodeData;
    const isClass = node.type === "cls";
    const potentialParents = allNodes.filter(n => n.id !== node.id && (n.type === "package" || n.type === "boundary" || n.type === "swimlane"));

    return (
        <div className="animate-fade-in space-y-4">
            <div className="flex items-center gap-2">
                <span className="rounded-md bg-admin-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">{NODE_NAMES[node.type] ?? node.type}</span>
            </div>
            <div>
                <label className={labelCls}>{node.type === "decision" ? "Decision input (optional)" : "Label"}</label>
                <input className={inputCls} value={d.label ?? ""} placeholder={node.type === "decision" ? "Leave blank; add guards on outgoing edges" : "Untitled"} onChange={(e) => onChange({ label: e.target.value })} />
            </div>

            {potentialParents.length > 0 && onUpdateParent && (
                <div>
                    <label className={labelCls}>Phân làn / Vùng chứa cha</label>
                    <select
                        className={inputCls}
                        value={node.parentId || "none"}
                        onChange={(e) => {
                            const val = e.target.value;
                            if (val === "none") {
                                onUpdateParent(node.id, undefined);
                            } else {
                                onUpdateParent(node.id, val);
                            }
                        }}
                    >
                        <option value="none">Không có (Tự do)</option>
                        {potentialParents.map(p => (
                            <option key={p.id} value={p.id}>
                                {p.data.label || p.id} ({p.type === "swimlane" ? "Swimlane" : p.type === "boundary" ? "Boundary" : "Package"})
                            </option>
                        ))}
                    </select>
                </div>
            )}
            <div>
                <label className={labelCls}>Border colour</label>
                <ColorRow value={d.color as string | undefined} onPick={(c) => onChange({ color: c })} onClear={() => onChange({ color: "" })} />
            </div>
            <div>
                <label className={labelCls}>Fill colour</label>
                <ColorRow value={d.fill as string | undefined} onPick={(c) => onChange({ fill: c })} onClear={() => onChange({ fill: "" })} />
            </div>
            {node.type === "swimlane" && (
                <div>
                    <label className={labelCls}>Orientation</label>
                    <div className="grid grid-cols-2 gap-1.5">
                        {(["horizontal", "vertical"] as const).map((v) => {
                            const active = (d.variant ?? "horizontal") === v;
                            return (
                                <button key={v} onClick={() => onChange({ variant: v })}
                                        className={`flex items-center justify-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] font-medium capitalize transition-colors ${active ? "border-zinc-900 bg-white text-zinc-900 shadow-[0_1px_2px_rgba(0,0,0,0.05)]" : "border-[var(--line)] bg-white/60 text-zinc-500 hover:bg-white"}`}>
                                    {v === "horizontal"
                                        ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 8h18M3 16h18" /><path d="M7 5v3M17 5v3M7 13v3M17 13v3" /></svg>
                                        : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M8 3v18M16 3v18" /><path d="M5 7h3M5 17h3M13 7h3M13 17h3" /></svg>}
                                    {v}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
            {isClass && (
                <>
                    <div>
                        <label className={labelCls}>Stereotype</label>
                        <input className={inputCls} value={d.stereotype ?? ""} placeholder="«interface»" onChange={(e) => onChange({ stereotype: e.target.value })} />
                    </div>
                    <div>
                        <label className={labelCls}>Attributes</label>
                        <textarea rows={4} className={inputCls + " font-mono text-[12px] resize-y"} value={d.attributes ?? ""} placeholder={"- name: String\n- age: int"} onChange={(e) => onChange({ attributes: e.target.value })} />
                    </div>
                    <div>
                        <label className={labelCls}>Methods</label>
                        <textarea rows={4} className={inputCls + " font-mono text-[12px] resize-y"} value={d.methods ?? ""} placeholder={"+ method(): void"} onChange={(e) => onChange({ methods: e.target.value })} />
                    </div>
                </>
            )}
            {node.type === "note" && (
                <div>
                    <label className={labelCls}>Text</label>
                    <textarea rows={5} className={inputCls + " resize-y"} value={d.label ?? ""} placeholder="Write a note…" onChange={(e) => onChange({ label: e.target.value })} />
                </div>
            )}
            <div className="flex gap-2 pt-1">
                <SecondaryBtn onClick={onDuplicate}>Duplicate</SecondaryBtn>
                <DangerBtn onClick={onDelete}>Delete</DangerBtn>
            </div>
        </div>
    );
}

function EdgeEditor({ edge, diagramType, onChange, onDelete }: {
    edge: FlowEdge; diagramType: DiagramType;
    onChange: (patch: { label?: string; marker?: string; markerStart?: string; type?: string; dashed?: boolean; color?: string; flip?: boolean; multiplicitySource?: string; multiplicityTarget?: string }) => void;
    onDelete: () => void;
}) {
    const opts = getDiagram(diagramType).edges;
    const data = edge.data as { marker?: string; markerStart?: string; color?: string } | undefined;
    const marker = data?.marker ?? "";
    const markerStart = data?.markerStart ?? "";
    const color = data?.color;
    const dashed = !!edge.data?.dashed;
    const edgeLabel = (edge.label as string) ?? "";
    const { name: multName, source: multSource, target: multTarget } = resolveEdgeMultiplicity(edge.data, edge.label);
    const currentIdx = opts.findIndex((o) =>
        o.markerEnd === marker &&
        (o.markerStart ?? "") === markerStart &&
        o.dashed === dashed &&
        o.path === edge.type &&
        // For stereotype edges like «include», the label must match
        (o.autoLabel ? edgeLabel === o.autoLabel : true)
    );

    return (
        <div className="animate-fade-in space-y-4">
            <span className="inline-block rounded-md bg-admin-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Connector</span>
            <div>
                <label className={labelCls}>Label</label>
                <input className={inputCls} value={(edge.label as string) ?? ""} placeholder={diagramType === "activity" ? "[approved], [rejected], or [else]" : "guard / message…"} onChange={(e) => onChange({ label: e.target.value, multiplicitySource: multSource, multiplicityTarget: multTarget })} />
            </div>
            {diagramType === "class" && (
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className={labelCls}>Multiplicity (source)</label>
                        <input className={inputCls} value={multSource} placeholder="1, 0..*" onChange={(e) => onChange({ multiplicitySource: e.target.value, multiplicityTarget: multTarget, label: multName })} />
                    </div>
                    <div>
                        <label className={labelCls}>Multiplicity (target)</label>
                        <input className={inputCls} value={multTarget} placeholder="1, 0..*" onChange={(e) => onChange({ multiplicityTarget: e.target.value, multiplicitySource: multSource, label: multName })} />
                    </div>
                </div>
            )}
            <div>
                <label className={labelCls}>Type</label>
                <div className="grid grid-cols-1 gap-1.5">
                    {opts.map((o, i) => {
                        const active = i === currentIdx;
                        return (
                            <button key={o.id} onClick={() => onChange(patchFromOption(o, (edge.label as string) ?? ""))} title={o.label}
                                    className={`flex items-center gap-2.5 rounded-lg border px-2.5 py-1.5 text-left transition-colors ${active ? "border-zinc-900 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]" : "border-[var(--line)] bg-white/60 hover:bg-white"}`}>
                <span className="flex h-4 w-16 shrink-0 items-center">
                  <ConnectorGlyph markerEnd={o.markerEnd} markerStart={o.markerStart} dashed={o.dashed} color={color} />
                </span>
                                <span className={`text-[12px] font-medium ${active ? "text-zinc-900" : "text-zinc-500"}`}>{o.label}</span>
                                {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-zinc-900" />}
                            </button>
                        );
                    })}
                    {currentIdx < 0 && <span className="px-1 text-[10.5px] text-zinc-400">Custom combination</span>}
                </div>
            </div>
            <div>
                <label className={labelCls}>Direction</label>
                <button onClick={() => onChange({ flip: true })}
                        className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-[12.5px] font-medium text-zinc-600 transition-colors hover:border-zinc-900 hover:text-zinc-900">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 3l4 4-4 4" /><path d="M21 7H9a4 4 0 0 0-4 4v0" /><path d="M7 21l-4-4 4-4" /><path d="M3 17h12a4 4 0 0 0 4-4v0" />
                    </svg>
                    Reverse arrow direction
                </button>
            </div>
            <div>
                <label className={labelCls}>Start marker</label>
                <MarkerPicker side="start" current={markerStart} color={color} onPick={(m) => onChange({ markerStart: m })} />
            </div>
            <div>
                <label className={labelCls}>End marker</label>
                <MarkerPicker side="end" current={marker} color={color} onPick={(m) => onChange({ marker: m })} />
            </div>
            <div>
                <label className={labelCls}>Path</label>
                <select className={inputCls} value={edge.type ?? "smoothstep"} onChange={(e) => onChange({ type: e.target.value })}>
                    <option value="smoothstep">Orthogonal</option>
                    <option value="bezier">Curved</option>
                    <option value="straight">Straight</option>
                </select>
            </div>
            <label className="flex cursor-pointer items-center justify-between rounded-lg border border-[var(--line)] bg-white px-3 py-2">
                <span className="text-[13px] text-zinc-700">Dashed line</span>
                <Toggle on={dashed} onClick={() => onChange({ dashed: !dashed })} />
            </label>
            <div>
                <label className={labelCls}>Colour</label>
                <ColorRow value={color} onPick={(c) => onChange({ color: c })} onClear={() => onChange({ color: "" })} />
            </div>
            <div className="pt-1"><DangerBtn onClick={onDelete}>Delete connector</DangerBtn></div>
        </div>
    );
}

function MarkerPicker({ side, current, color, onPick }: {
    side: "start" | "end"; current: string; color?: string; onPick: (id: string) => void;
}) {
    return (
        <div className="grid grid-cols-6 gap-1">
            {MARKER_SHAPES.map((m: MarkerShape) => {
                const value = side === "start" ? m.start : m.end;
                const active = value === current;
                return (
                    <button key={m.label} title={m.label} onClick={() => onPick(value)}
                            className={`flex h-8 items-center justify-center rounded-lg border transition-colors ${active ? "border-zinc-900 bg-white" : "border-[var(--line)] bg-white/60 hover:bg-white"}`}>
                        {side === "start" ? <ConnectorGlyph markerStart={m.start} color={color} width={26} /> : <ConnectorGlyph markerEnd={m.end} color={color} width={26} />}
                    </button>
                );
            })}
        </div>
    );
}

function ColorRow({ value, onPick, onClear }: {
    value?: string; onPick: (c: string) => void; onClear: () => void;
}) {
    return (
        <div className="flex flex-wrap items-center gap-1.5">
            {COLOR_PALETTE.map((c) => {
                const active = value === c.value;
                return (
                    <button key={c.value} title={c.label} onClick={() => onPick(c.value)}
                            className={`h-6 w-6 rounded-full border transition-all ${active ? "border-white ring-2 ring-zinc-900 ring-offset-1" : "border-[var(--line)] hover:scale-110"}`}
                            style={{ background: c.value }} />
                );
            })}
            <button title="Reset to default" onClick={onClear}
                    className="flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-[var(--line-strong)] text-zinc-400 transition-colors hover:text-zinc-700">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></svg>
            </button>
        </div>
    );
}

function EmptyState({ nodesLen, edgesLen, activeConnectorName }: {
    nodesLen: number; edgesLen: number; activeConnectorName: string;
}) {
    return (
        <div className="animate-fade-in space-y-5">
            <div className="grid grid-cols-2 gap-2">
                <Stat label="Nodes" value={nodesLen} />
                <Stat label="Edges" value={edgesLen} />
            </div>
            <div className="rounded-lg border border-[var(--line)] bg-white px-3 py-2">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Active connector</div>
                <div className="mt-0.5 text-[13px] font-medium text-zinc-800">{activeConnectorName}</div>
            </div>
            <div className="space-y-2.5">
                <Hint k="Drag" v="select an area" />
                <Hint k="Space + drag" v="pan the canvas" />
                <Hint k="Scroll" v="pan · ⌘/Ctrl+scroll to zoom" />
                <Hint k="Double-click" v="rename a node" />
                <Hint k="Drag handle" v="connect two nodes" />
                <Hint k="Delete" v="remove selection" />
            </div>
        </div>
    );
}

function Stat({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-center">
            <div className="text-[20px] font-semibold tabular-nums text-zinc-900">{value}</div>
            <div className="text-[10.5px] font-medium uppercase tracking-wide text-zinc-400">{label}</div>
        </div>
    );
}

function Hint({ k, v }: { k: string; v: string }) {
    return (
        <div className="flex items-center gap-2 text-[12px]">
            <span className="shrink-0 rounded-md border border-[var(--line)] bg-white px-1.5 py-0.5 font-mono text-[10.5px] text-zinc-600">{k}</span>
            <span className="text-zinc-500">{v}</span>
        </div>
    );
}

function Toggle({
                    on,
                    onClick,
                }: {
    on: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClick();
            }}
            className={`
                relative
                h-6
                w-11
                shrink-0
                rounded-full
                transition-colors
                ${on ? "bg-zinc-900" : "bg-zinc-200"}
            `}
        >
            <span
                className={`
                    absolute
                    top-[2px]
                    left-[2px]
                    h-5
                    w-5
                    rounded-full
                    bg-white
                    shadow
                    transition-transform
                    ${on ? "translate-x-5" : ""}
                `}
            />
        </button>
    );
}

function DangerBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
    return (
        <button onClick={onClick}
                className="flex-1 rounded-lg border border-[var(--line-strong)] bg-white px-3 py-1.5 text-[12.5px] font-medium text-zinc-700 transition-colors hover:border-zinc-900 hover:bg-zinc-900 hover:text-white">
            {children}
        </button>
    );
}

function SecondaryBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
    return (
        <button onClick={onClick}
                className="flex-1 rounded-lg border border-[var(--line-strong)] bg-white px-3 py-1.5 text-[12.5px] font-medium text-zinc-700 transition-colors hover:bg-zinc-100">
            {children}
        </button>
    );
}
