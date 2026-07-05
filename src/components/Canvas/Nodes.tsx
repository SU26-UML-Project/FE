import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Handle,
  Position,
  NodeResizer,
  type NodeProps,
} from "@xyflow/react";
import { clsx } from "clsx";
import type { FlowNodeData } from "../../types";
import { useEditor } from "../../lib/editorContext";

const cx = (...a: (string | false | null | undefined)[]) => clsx(a);
const INK = "#27272a";

/* Per-node colour overrides (set from the Inspector). */
const inkColor = (d: FlowNodeData) => (d.color as string) || INK;
const fillColor = (d: FlowNodeData, fallback = "#ffffff") =>
  (d.fill as string) || fallback;

/**
 * Measure the real content height of a node (independent of the node's own
 * height) by reading a content wrapper sized to its natural height.
 */
function useContentHeight(ref: React.RefObject<HTMLElement | null>, deps: unknown[]) {
  const [h, setH] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setH(el.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, ...deps]);
  return h;
}

/** Grow the node's HEIGHT so its content never gets clipped (width untouched). */
function useAutoGrow(id: string, height: number | undefined, minH: number) {
  const { growNode } = useEditor();
  useLayoutEffect(() => {
    if (height === undefined || minH <= 0) return;
    if (height < minH) growNode(id, 0, minH);
  }, [id, height, minH, growNode]);
}

/* ---------------- Inline editable text ---------------- */
function EditableText({
  id, field, value, placeholder, className, inputClassName, multiline, mono,
}: {
  id: string;
  field: "label" | "attributes" | "methods" | "stereotype";
  value: string;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  multiline?: boolean;
  mono?: boolean;
}) {
  const { updateNodeData } = useEditor();
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(value ?? "");

  useEffect(() => {
    if (!editing) setV(value ?? "");
  }, [value, editing]);

  const commit = () => {
    setEditing(false);
    if ((v ?? "") !== (value ?? "")) updateNodeData(id, { [field]: v });
  };

  if (editing) {
    const common =
      "nodrag w-full resize-none outline-none bg-white/80 backdrop-blur rounded px-1 leading-relaxed " +
      (inputClassName ?? "");
    if (multiline) {
      const rows = Math.max(2, (v ?? "").split("\n").length);
      return (
        <textarea
          autoFocus value={v} rows={rows}
          onChange={(e) => {
            setV(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = e.target.scrollHeight + "px";
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) commit();
            if (e.key === "Escape") { setV(value ?? ""); setEditing(false); }
          }}
          className={cx(common, mono && "font-mono")}
        />
      );
    }
    return (
      <input
        autoFocus value={v}
        onChange={(e) => setV(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") { setV(value ?? ""); setEditing(false); }
        }}
        className={cx(common, mono && "font-mono")}
      />
    );
  }

  return (
    <span
      onDoubleClick={(e) => { e.stopPropagation(); setV(value ?? ""); setEditing(true); }}
      className={cx(className, "cursor-text", multiline && "block whitespace-pre-wrap")}
    >
      {value ? value : <span className="text-zinc-300">{placeholder}</span>}
    </span>
  );
}

/* ---------------- Shared handles (Multi-point: 25/50/75) ---------------- */
function AllHandles() {
  const handles: React.ReactElement[] = [];
  const points = [25, 50, 75];

  // Top
  points.forEach((i) => {
    handles.push(<Handle key={`t-${i}`} id={`t-${i}`} type="source" position={Position.Top} style={{ left: `${i}%` }} />);
    handles.push(<Handle key={`t-${i}-t`} id={`t-${i}-t`} type="target" position={Position.Top} style={{ left: `${i}%` }} />);
  });
  // Right
  points.forEach((i) => {
    handles.push(<Handle key={`r-${i}`} id={`r-${i}`} type="source" position={Position.Right} style={{ top: `${i}%` }} />);
    handles.push(<Handle key={`r-${i}-t`} id={`r-${i}-t`} type="target" position={Position.Right} style={{ top: `${i}%` }} />);
  });
  // Bottom
  points.forEach((i) => {
    handles.push(<Handle key={`b-${i}`} id={`b-${i}`} type="source" position={Position.Bottom} style={{ left: `${i}%` }} />);
    handles.push(<Handle key={`b-${i}-t`} id={`b-${i}-t`} type="target" position={Position.Bottom} style={{ left: `${i}%` }} />);
  });
  // Left
  points.forEach((i) => {
    handles.push(<Handle key={`l-${i}`} id={`l-${i}`} type="source" position={Position.Left} style={{ top: `${i}%` }} />);
    handles.push(<Handle key={`l-${i}-t`} id={`l-${i}-t`} type="target" position={Position.Left} style={{ top: `${i}%` }} />);
  });

  return <>{handles}</>;
}

function Resizer({ selected, minW = 60, minH = 40, keepAspectRatio = false }: {
  selected?: boolean; minW?: number; minH?: number; keepAspectRatio?: boolean;
}) {
  if (!selected) return null;
  return <NodeResizer color="#09090b" minWidth={minW} minHeight={minH} keepAspectRatio={keepAspectRatio} />;
}

/* ---------------- Nodes ---------------- */

export function ActionNode({ id, data, selected, height }: NodeProps) {
  const d = data as FlowNodeData;
  const ink = inkColor(d);
  const contentRef = useRef<HTMLDivElement>(null);
  const minH = useContentHeight(contentRef, [d.label]);
  useAutoGrow(id, height as number | undefined, minH);
  return (
    <div className="relative flex h-full w-full items-center justify-center rounded-[10px] px-4 text-center text-[13px] font-medium text-zinc-900"
      style={{ border: `1.5px solid ${ink}`, background: fillColor(d) }}>
      <Resizer selected={selected} minW={100} minH={minH || 40} />
      <AllHandles />
      <div ref={contentRef} style={{ height: "max-content" }} className="max-w-full break-words px-1 py-0.5">
        <EditableText id={id} field="label" value={d.label} placeholder="Action" />
      </div>
    </div>
  );
}

export function DecisionNode({ id, data, selected }: NodeProps) {
  const d = data as FlowNodeData;
  const ink = inkColor(d);
  return (
    <div className="relative h-full w-full">
      <Resizer selected={selected} minW={90} minH={70} />
      <AllHandles />
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polygon points="50,1.5 98.5,50 50,98.5 1.5,50" fill={fillColor(d)} stroke={ink} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center px-7 text-center text-[12px] font-medium text-zinc-900">
        <EditableText id={id} field="label" value={d.label} placeholder="Condition?" />
      </div>
    </div>
  );
}

export function StartNode({ data, selected }: NodeProps) {
  const d = data as FlowNodeData;
  return (
    <div className="relative h-full w-full">
      <Resizer selected={selected} minW={24} minH={24} keepAspectRatio />
      <AllHandles />
      <svg className="h-full w-full" viewBox="0 0 40 40" preserveAspectRatio="none">
        <circle cx="20" cy="20" r="19" fill={fillColor(d, "#18181b")} />
      </svg>
    </div>
  );
}

export function FinalNode({ data, selected }: NodeProps) {
  const d = data as FlowNodeData;
  const ink = inkColor(d);
  return (
    <div className="relative h-full w-full">
      <Resizer selected={selected} minW={26} minH={26} keepAspectRatio />
      <AllHandles />
      <svg className="h-full w-full" viewBox="0 0 40 40" preserveAspectRatio="none">
        <circle cx="20" cy="20" r="18.5" fill={fillColor(d)} stroke={ink} strokeWidth="1.8" />
        <circle cx="20" cy="20" r="11.5" fill={ink} />
      </svg>
    </div>
  );
}

export function ForkNode({ data, selected }: NodeProps) {
  const d = data as FlowNodeData;
  return (
    <div className="relative h-full w-full">
      <Resizer selected={selected} minW={10} minH={10} />
      <AllHandles />
      <div className="absolute inset-0" style={{ background: fillColor(d, "#18181b"), borderRadius: 6 }} />
    </div>
  );
}

function Compartment({ id, field, value, ink, placeholder, last }: {
  id: string; field: "attributes" | "methods"; value?: string; ink: string; placeholder: string; last?: boolean;
}) {
  return (
    <div className="shrink-0 px-3 py-1.5 font-mono text-[10.5px] leading-relaxed text-zinc-700"
      style={{ borderBottom: last ? undefined : `1.5px solid ${ink}` }}>
      <EditableText id={id} field={field} value={value ?? ""} placeholder={placeholder} multiline mono />
    </div>
  );
}

export function ClassNode({ id, data, selected, height }: NodeProps) {
  const d = data as FlowNodeData;
  const ink = inkColor(d);
  const contentRef = useRef<HTMLDivElement>(null);
  const minH = useContentHeight(contentRef, [d.label, d.stereotype, d.attributes, d.methods]);
  useAutoGrow(id, height as number | undefined, minH);
  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[8px]"
      style={{ border: `1.5px solid ${ink}`, background: fillColor(d) }}>
      <Resizer selected={selected} minW={170} minH={minH || 90} />
      <AllHandles />
      <div ref={contentRef} style={{ height: "max-content" }} className="flex w-full flex-col">
        <div className="shrink-0 break-words px-3 pt-2 pb-2 text-center" style={{ borderBottom: `1.5px solid ${ink}` }}>
          {d.stereotype && (
            <div className="mb-0.5 text-[10px] font-medium italic leading-none text-zinc-500">
              <EditableText id={id} field="stereotype" value={d.stereotype ?? ""} placeholder="«interface»" />
            </div>
          )}
          <div className="text-[13px] font-semibold text-zinc-900">
            <EditableText id={id} field="label" value={d.label} placeholder="ClassName" />
          </div>
        </div>
        <Compartment id={id} field="attributes" value={d.attributes} ink={ink} placeholder={"- attribute: Type"} />
        <Compartment id={id} field="methods" value={d.methods} ink={ink} placeholder={"+ method(): Type"} last />
      </div>
    </div>
  );
}

export function ComponentNode({ id, data, selected, height }: NodeProps) {
  const d = data as FlowNodeData;
  const ink = inkColor(d);
  const contentRef = useRef<HTMLDivElement>(null);
  const minH = useContentHeight(contentRef, [d.label, d.stereotype]);
  useAutoGrow(id, height as number | undefined, minH);
  return (
    <div className="relative h-full w-full overflow-hidden rounded-[8px]"
      style={{ border: `1.5px solid ${ink}`, background: fillColor(d) }}>
      <Resizer selected={selected} minW={140} minH={minH || 64} />
      <AllHandles />
      <svg className="absolute" style={{ left: -1, top: 14 }} width="22" height="44" viewBox="0 0 22 44">
        <rect x="0" y="0" width="15" height="9" fill="#fff" stroke={ink} strokeWidth="1.4" />
        <rect x="0" y="15" width="15" height="9" fill="#fff" stroke={ink} strokeWidth="1.4" />
      </svg>
      <div className="flex h-full w-full items-center justify-center px-5">
        <div ref={contentRef} style={{ height: "max-content" }} className="max-w-full break-words text-center">
          {d.stereotype && (
            <div className="mb-0.5 text-[10px] font-medium italic leading-none text-zinc-500">
              <EditableText id={id} field="stereotype" value={d.stereotype ?? ""} placeholder="«interface»" />
            </div>
          )}
          <EditableText id={id} field="label" value={d.label} placeholder="Component" className="text-[13px] font-semibold text-zinc-900" />
        </div>
      </div>
    </div>
  );
}

export function UseCaseNode({ id, data, selected, height }: NodeProps) {
  const d = data as FlowNodeData;
  const ink = inkColor(d);
  const contentRef = useRef<HTMLDivElement>(null);
  const minH = useContentHeight(contentRef, [d.label]);
  useAutoGrow(id, height as number | undefined, minH);
  return (
    <div className="relative h-full w-full">
      <Resizer selected={selected} minW={120} minH={minH || 64} />
      <AllHandles />
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <ellipse cx="50" cy="50" rx="48.5" ry="48.5" fill={fillColor(d)} stroke={ink} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center px-7 py-4 text-center text-[12px] font-medium text-zinc-900">
        <div ref={contentRef} style={{ height: "max-content" }} className="max-w-full break-words">
          <EditableText id={id} field="label" value={d.label} placeholder="Use case" />
        </div>
      </div>
    </div>
  );
}

export function ActorNode({ id, data, selected }: NodeProps) {
  const d = data as FlowNodeData;
  const ink = inkColor(d);
  return (
    <div className="relative h-full w-full">
      <Resizer selected={selected} minW={44} minH={70} keepAspectRatio />
      <AllHandles />
      <div className="flex h-full w-full flex-col items-center">
        <svg viewBox="0 0 60 92" className="min-h-0 w-full flex-1" preserveAspectRatio="xMidYMid meet">
          <circle cx="30" cy="13" r="10" fill={fillColor(d)} stroke={ink} strokeWidth="1.6" />
          <line x1="30" y1="23" x2="30" y2="54" stroke={ink} strokeWidth="1.6" strokeLinecap="round" />
          <line x1="13" y1="36" x2="47" y2="36" stroke={ink} strokeWidth="1.6" strokeLinecap="round" />
          <line x1="30" y1="54" x2="15" y2="80" stroke={ink} strokeWidth="1.6" strokeLinecap="round" />
          <line x1="30" y1="54" x2="45" y2="80" stroke={ink} strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <div className="w-full shrink-0 pb-0.5 text-center text-[12px] font-medium text-zinc-900">
          <EditableText id={id} field="label" value={d.label} placeholder="Actor" />
        </div>
      </div>
    </div>
  );
}

export function LifelineNode({ id, data, selected }: NodeProps) {
  const d = data as FlowNodeData;
  const ink = inkColor(d);
  return (
    <div className="relative h-full w-full">
      <Resizer selected={selected} minW={90} minH={160} />
      <AllHandles />
      <div className="absolute left-0 right-0 top-0 mx-auto rounded-[9px] px-4 py-2 text-center text-[13px] font-medium text-zinc-900"
        style={{ border: `1.5px solid ${ink}`, background: fillColor(d), width: "fit-content", maxWidth: "100%" }}>
        <EditableText id={id} field="label" value={d.label} placeholder=": Participant" />
      </div>
      <div className="absolute left-1/2 top-[44px] bottom-0 -translate-x-1/2 border-l-[1.5px] border-dashed" style={{ borderColor: ink }} />
    </div>
  );
}

export function NoteNode({ id, data, selected, height }: NodeProps) {
  const d = data as FlowNodeData;
  const ink = inkColor(d);
  const contentRef = useRef<HTMLDivElement>(null);
  const minH = useContentHeight(contentRef, [d.label]);
  useAutoGrow(id, height as number | undefined, minH);
  return (
    <div className="relative h-full w-full">
      <Resizer selected={selected} minW={110} minH={minH || 60} />
      <AllHandles />
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path d="M1.5 1.5 L84 1.5 L98.5 16 L98.5 98.5 L1.5 98.5 Z" fill={fillColor(d, "#f6f6f7")} stroke={ink} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        <path d="M84 1.5 L84 16 L98.5 16" fill="none" stroke={ink} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="absolute inset-0 px-3.5 py-3 text-[12px] leading-snug text-zinc-700">
        <div ref={contentRef} style={{ height: "max-content" }} className="max-w-full break-words">
          <EditableText id={id} field="label" value={d.label} placeholder="Note…" multiline />
        </div>
      </div>
    </div>
  );
}

export function TextNode({ id, data, selected }: NodeProps) {
  const d = data as FlowNodeData;
  return (
    <div className="relative h-full w-full">
      <Resizer selected={selected} minW={60} minH={20} />
      <AllHandles />
      <div className="flex h-full w-full items-center justify-center px-2 text-center text-[13px] font-semibold text-zinc-900">
        <EditableText id={id} field="label" value={d.label} placeholder="Label" />
      </div>
    </div>
  );
}

export function PackageNode({ id, data, selected, width, height }: NodeProps) {
  const d = data as FlowNodeData;
  const ink = inkColor(d);
  return (
    <div className="relative h-full w-full">
      <Resizer selected={selected} minW={160} minH={120} />
      {/* Tab header — the ONLY clickable part (selects the package) */}
      <div
        className="absolute left-0 top-0 z-10 h-[24px] cursor-pointer rounded-t-[8px] px-3"
        style={{ width: 90, border: `1.5px solid ${ink}`, borderBottom: "none", background: fillColor(d), pointerEvents: "auto" }}
      >
        <div className="h-full w-full overflow-hidden text-[11px] font-semibold leading-[21px] text-zinc-700">
          <EditableText id={id} field="label" value={d.label} placeholder="Package" className="inline-block min-w-[60px]" />
        </div>
      </div>
      {/* Body — pointer-events-none so clicks pass THROUGH to nodes inside */}
      <div
        className="absolute left-0 right-0 bottom-0 top-[24px] rounded-[8px] rounded-tl-none"
        style={{
          border: `1.5px solid ${ink}`,
          background: (d.fill as string) || "transparent",
          pointerEvents: "none",
        }}
      />
      {/* Handles — only on hover/selected, and auto pointer-events */}
      <div className="react-flow__handle-wrap pointer-events-none">
        <Handle id="t" type="source" position={Position.Top} />
        <Handle id="t-t" type="target" position={Position.Top} />
        <Handle id="r" type="source" position={Position.Right} />
        <Handle id="r-t" type="target" position={Position.Right} />
        <Handle id="b" type="source" position={Position.Bottom} />
        <Handle id="b-t" type="target" position={Position.Bottom} />
        <Handle id="l" type="source" position={Position.Left} />
        <Handle id="l-t" type="target" position={Position.Left} />
      </div>
    </div>
  );
}

export const nodeTypes = {
  action: ActionNode,
  decision: DecisionNode,
  start: StartNode,
  final: FinalNode,
  fork: ForkNode,
  cls: ClassNode,
  component: ComponentNode,
  usecase: UseCaseNode,
  actor: ActorNode,
  lifeline: LifelineNode,
  note: NoteNode,
  text: TextNode,
  package: PackageNode,
};
