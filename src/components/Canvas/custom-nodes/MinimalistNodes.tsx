import { useEffect, useState } from "react";
import {
  Handle,
  Position,
  NodeResizer,
  type NodeProps,
} from "@xyflow/react";
import { clsx } from "clsx";
import { useCanvasStore } from "../../../stores/canvasStore";

const cx = (...a: (string | false | null | undefined)[]) => clsx(a);
const INK = "#27272a";
const INK_SEL = "#09090b";

/* ---------------- Inline editable text ---------------- */
function EditableText({
  id,
  field,
  value,
  placeholder,
  className,
  inputClassName,
  multiline,
  mono,
}: {
  id: string;
  field: "label" | "attributes" | "methods";
  value: string;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  multiline?: boolean;
  mono?: boolean;
}) {
  const setNodeData = useCanvasStore((state) => state.setNodeData);
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(value ?? "");

  useEffect(() => {
    if (!editing) setV(value ?? "");
  }, [value, editing]);

  const commit = () => {
    setEditing(false);
    if ((v ?? "") !== (value ?? "")) setNodeData(id, { [field]: v });
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Don't trigger if already editing
    if (editing) return;
    setV(value ?? "");
    setEditing(true);
  };

  if (editing) {
    const common =
      "nodrag w-full resize-none outline-none bg-white/70 backdrop-blur rounded px-1 leading-tight " +
      (inputClassName ?? "");
    if (multiline) {
      return (
        <textarea
          autoFocus
          value={v}
          rows={Math.max(2, v.split('\n').length)}
          onChange={(e) => setV(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) commit();
            if (e.key === "Escape") {
              setV(value ?? "");
              setEditing(false);
            }
          }}
          className={cx(common, mono && "font-mono", "h-full")}
        />
      );
    }
    return (
      <input
        autoFocus
        value={v}
        onChange={(e) => setV(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setV(value ?? "");
            setEditing(false);
          }
        }}
        className={cx(common, mono && "font-mono")}
      />
    );
  }

  return (
    <div
      onDoubleClick={handleDoubleClick}
      className={cx(className, "cursor-text whitespace-pre-wrap break-words overflow-hidden")}
    >
      {value ? value : <span className="text-zinc-300 italic">{placeholder}</span>}
    </div>
  );
}

/* ---------------- Shared handles ---------------- */
function AllHandles({ visible }: { visible?: boolean }) {
  const base = "transition-opacity duration-200";
  const opacity = visible ? "opacity-100" : "opacity-0";
  return (
    <div className={cx(base, opacity)}>
      <Handle id="t" type="source" position={Position.Top} />
      <Handle id="r" type="source" position={Position.Right} />
      <Handle id="b" type="source" position={Position.Bottom} />
      <Handle id="l" type="source" position={Position.Left} />
    </div>
  );
}

function Resizer({
  selected,
  minW = 60,
  minH = 40,
  keepAspectRatio = false,
}: {
  selected?: boolean;
  minW?: number;
  minH?: number;
  keepAspectRatio?: boolean;
}) {
  if (!selected) return null;
  return (
    <NodeResizer
      color="#09090b"
      minWidth={minW}
      minHeight={minH}
      keepAspectRatio={keepAspectRatio}
    />
  );
}

/* ---------------- Nodes ---------------- */

export function ActionNode({ id, data, selected }: NodeProps) {
  const d = data as any;
  const [hovered, setHovered] = useState(false);
  const bg = d.color || "#ffffff";

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative flex h-full w-full items-center justify-center rounded-[10px] px-5 text-center text-[13px] font-medium text-zinc-900 shadow-sm"
      style={{ 
        border: `1.5px solid ${selected ? INK_SEL : INK}`,
        backgroundColor: bg,
      }}
    >
      <Resizer selected={selected} minW={80} minH={34} />
      <AllHandles visible={selected || hovered} />
      <div className="px-1 py-0.5">
        <EditableText
          id={id}
          field="label"
          value={d.label}
          placeholder="Action"
        />
      </div>
    </div>
  );
}

export function DecisionNode({ id, data, selected }: NodeProps) {
  const d = data as any;
  const ink = selected ? INK_SEL : INK;
  const [hovered, setHovered] = useState(false);
  const bg = d.color || "#ffffff";

  return (
    <div 
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative h-full w-full drop-shadow-sm"
    >
      <Resizer selected={selected} minW={90} minH={70} />
      <AllHandles visible={selected || hovered} />
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <polygon
          points="50,1.5 98.5,50 50,98.5 1.5,50"
          fill={bg}
          stroke={ink}
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center px-7 text-center text-[12px] font-medium text-zinc-900">
        <EditableText id={id} field="label" value={d.label} placeholder="Condition?" />
      </div>
    </div>
  );
}

export function StartNode({ id, selected, data }: NodeProps) {
  const d = data as any;
  const [hovered, setHovered] = useState(false);
  const bg = d.color || (selected ? "#000" : "#18181b");
  return (
    <div 
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative h-full w-full drop-shadow-sm"
      style={{ minWidth: 38, minHeight: 38 }}
    >
      <Resizer selected={selected} minW={24} minH={24} keepAspectRatio />
      <AllHandles visible={selected || hovered} />
      <svg className="h-full w-full" viewBox="0 0 40 40" preserveAspectRatio="none">
        <circle cx="20" cy="20" r="19" fill={bg} />
      </svg>
    </div>
  );
}

export function FinalNode({ id, data, selected }: NodeProps) {
  const d = data as any;
  const ink = selected ? INK_SEL : INK;
  const [hovered, setHovered] = useState(false);
  const bg = d.color || "#ffffff";
  return (
    <div 
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative h-full w-full drop-shadow-sm"
      style={{ minWidth: 40, minHeight: 40 }}
    >
      <Resizer selected={selected} minW={26} minH={26} keepAspectRatio />
      <AllHandles visible={selected || hovered} />
      <svg className="h-full w-full" viewBox="0 0 40 40" preserveAspectRatio="none">
        <circle cx="20" cy="20" r="18.5" fill={bg} stroke={ink} strokeWidth="1.8" />
        <circle cx="20" cy="20" r="11.5" fill="#18181b" />
      </svg>
    </div>
  );
}

export function ForkNode({ id, data, selected }: NodeProps) {
  const d = data as any;
  const [hovered, setHovered] = useState(false);
  const bg = d.color || (selected ? "#000" : "#18181b");
  return (
    <div 
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative h-full w-full drop-shadow-sm"
      style={{ minWidth: 130, minHeight: 12 }}
    >
      <Resizer selected={selected} minW={10} minH={10} />
      <AllHandles visible={selected || hovered} />
      <div
        className="absolute inset-0"
        style={{ background: bg, borderRadius: 6 }}
      />
    </div>
  );
}

export function ClassNode({ id, data, selected }: NodeProps) {
  const d = data as any;
  const ink = selected ? INK_SEL : INK;
  const bg = d.color || "#ffffff";
  const [hovered, setHovered] = useState(false);
  
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative flex h-full w-full flex-col overflow-hidden rounded-[8px] shadow-sm"
      style={{ 
        border: `1.5px solid ${ink}`, 
        backgroundColor: bg,
      }}
    >
      <Resizer selected={selected} minW={140} minH={90} />
      <AllHandles visible={selected || hovered} />
      
      <div className="flex h-full w-full flex-col overflow-hidden">
        {/* Header */}
        <div
          className="px-3 py-2 text-center"
          style={{ borderBottom: `1.5px solid ${ink}` }}
        >
          {d.stereotype && (
            <div className="text-[10px] font-medium italic leading-none text-zinc-500">
              {d.stereotype}
            </div>
          )}
          <div className="text-[13px] font-bold text-zinc-900">
            <EditableText id={id} field="label" value={d.label} placeholder="ClassName" />
          </div>
        </div>

        {/* Attributes */}
        <div
          className="min-h-[30px] flex-1 px-3 py-2 font-mono text-[11px] leading-relaxed text-zinc-700"
          style={{ borderBottom: `1.5px solid ${ink}` }}
        >
          <EditableText 
            id={id} 
            field="attributes" 
            value={d.attributes} 
            placeholder="+ attributes" 
            multiline
            mono
            className="h-full w-full"
          />
        </div>

        {/* Methods */}
        <div className="min-h-[30px] flex-1 px-3 py-2 font-mono text-[11px] leading-relaxed text-zinc-700">
          <EditableText 
            id={id} 
            field="methods" 
            value={d.methods} 
            placeholder="+ methods()" 
            multiline
            mono
            className="h-full w-full"
          />
        </div>
      </div>
    </div>
  );
}

export function ComponentNode({ id, data, selected }: NodeProps) {
  const d = data as any;
  const ink = selected ? INK_SEL : INK;
  const bg = d.color || "#ffffff";
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative h-full w-full overflow-hidden rounded-[8px] shadow-sm"
      style={{ 
        border: `1.5px solid ${ink}`, 
        backgroundColor: bg,
      }}
    >
      <Resizer selected={selected} minW={120} minH={56} />
      <AllHandles visible={selected || hovered} />
      <svg
        className="absolute"
        style={{ left: -1, top: 14 }}
        width="22"
        height="44"
        viewBox="0 0 22 44"
      >
        <rect x="0" y="0" width="15" height="9" fill={bg} stroke={ink} strokeWidth="1.4" />
        <rect x="0" y="15" width="15" height="9" fill={bg} stroke={ink} strokeWidth="1.4" />
      </svg>
      <div className="flex h-full w-full items-center justify-center px-5 py-4">
        <div className="text-center">
          {d.stereotype && (
            <div className="text-[10px] font-medium italic leading-none text-zinc-500">
              {d.stereotype}
            </div>
          )}
          <EditableText
            id={id}
            field="label"
            value={d.label}
            placeholder="Component"
            className="text-[13px] font-semibold text-zinc-900"
          />
        </div>
      </div>
    </div>
  );
}

export function UseCaseNode({ id, data, selected }: NodeProps) {
  const d = data as any;
  const ink = selected ? INK_SEL : INK;
  const bg = d.color || "#ffffff";
  const [hovered, setHovered] = useState(false);

  return (
    <div 
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative h-full w-full drop-shadow-sm"
    >
      <Resizer selected={selected} minW={110} minH={56} />
      <AllHandles visible={selected || hovered} />
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <ellipse
          cx="50"
          cy="50"
          rx="48.5"
          ry="48.5"
          fill={bg}
          stroke={ink}
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center px-8 text-center text-[12px] font-medium text-zinc-900">
        <EditableText id={id} field="label" value={d.label} placeholder="Use case" />
      </div>
    </div>
  );
}

export function LifelineNode({ id, data, selected }: NodeProps) {
  const d = data as any;
  const ink = selected ? INK_SEL : INK;
  const color = d.color || ink;
  const [hovered, setHovered] = useState(false);

  return (
    <div 
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative h-full w-full"
      style={{ minWidth: 150, minHeight: 340 }}
    >
      <Resizer selected={selected} minW={90} minH={160} />
      <AllHandles visible={selected || hovered} />
      <div
        className="absolute left-1/2 top-0 -translate-x-1/2 rounded-[9px] px-4 py-2 text-center text-[13px] font-medium text-zinc-900"
        style={{ 
          border: `1.5px solid ${color}`, 
          width: "fit-content", 
          minWidth: 90,
          backgroundColor: d.color || "#fff" 
        }}
      >
        <EditableText id={id} field="label" value={d.label} placeholder=": Participant" />
      </div>
      <div
        className="absolute left-1/2 top-[44px] bottom-0 -translate-x-1/2 border-l-[1.5px] border-dashed"
        style={{ borderColor: color }}
      />
    </div>
  );
}

export function ActorNode({ id, data, selected }: NodeProps) {
  const d = data as any;
  const ink = selected ? INK_SEL : INK;
  const color = d.color || ink;
  const [hovered, setHovered] = useState(false);

  return (
    <div 
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative h-full w-full"
      style={{ minWidth: 76, minHeight: 124 }}
    >
      <Resizer selected={selected} minW={44} minH={70} keepAspectRatio />
      <AllHandles visible={selected || hovered} />
      <div className="flex h-full w-full flex-col items-center">
        <svg
          viewBox="0 0 60 92"
          className="min-h-0 w-full flex-1"
          preserveAspectRatio="xMidYMid meet"
        >
          <circle cx="30" cy="13" r="10" fill="#fff" stroke={color} strokeWidth="1.6" />
          <line x1="30" y1="23" x2="30" y2="54" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
          <line x1="13" y1="36" x2="47" y2="36" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
          <line x1="30" y1="54" x2="15" y2="80" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
          <line x1="30" y1="54" x2="45" y2="80" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <div className="w-full shrink-0 pb-0.5 text-center text-[12px] font-medium text-zinc-900">
          <EditableText id={id} field="label" value={d.label} placeholder="Actor" />
        </div>
      </div>
    </div>
  );
}

export function NoteNode({ id, data, selected }: NodeProps) {
  const d = data as any;
  const ink = selected ? INK_SEL : INK;
  const [hovered, setHovered] = useState(false);
  const bg = d.color || "#f6f6f7";

  return (
    <div 
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative h-full w-full drop-shadow-sm"
    >
      <Resizer selected={selected} minW={100} minH={60} />
      <AllHandles visible={selected || hovered} />
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path
          d="M1.5 1.5 L84 1.5 L98.5 16 L98.5 98.5 L1.5 98.5 Z"
          fill={bg}
          stroke={ink}
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M84 1.5 L84 16 L98.5 16"
          fill="none"
          stroke={ink}
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="absolute inset-0 px-3.5 py-3 text-[12px] leading-snug text-zinc-700 overflow-hidden">
        <EditableText
          id={id}
          field="label"
          value={d.label}
          placeholder="Note…"
          multiline
          className="h-full w-full"
        />
      </div>
    </div>
  );
}

export function TextNode({ id, data, selected }: NodeProps) {
  const d = data as any;
  const [hovered, setHovered] = useState(false);
  const bg = d.color || "transparent";

  return (
    <div 
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative h-full w-full"
      style={{ 
        backgroundColor: bg,
      }}
    >
      <Resizer selected={selected} minW={60} minH={20} />
      <AllHandles visible={selected || hovered} />
      <div className="flex h-full w-full items-center justify-center px-2 text-center text-[13px] font-semibold text-zinc-900">
        <EditableText id={id} field="label" value={d.label} placeholder="Label" />
      </div>
    </div>
  );
}

export function PackageNode({ id, data, selected }: NodeProps) {
  const d = data as any;
  const ink = selected ? INK_SEL : INK;
  const [hovered, setHovered] = useState(false);
  const bg = d.color || "#ffffff";
  return (
    <div 
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative h-full w-full drop-shadow-sm"
      style={{ minWidth: 360, minHeight: 240 }}
    >
      <Resizer selected={selected} minW={160} minH={120} />
      <AllHandles visible={selected || hovered} />
      <div
        className="absolute left-0 top-0 h-[24px] rounded-t-[8px] px-3"
        style={{ width: 90, border: `1.5px solid ${ink}`, borderBottom: "none", backgroundColor: bg }}
      >
        <div className="h-full w-full overflow-hidden text-[11px] font-semibold leading-[21px] text-zinc-700">
          <EditableText id={id} field="label" value={d.label} placeholder="Package" />
        </div>
      </div>
      <div
        className="absolute left-0 right-0 bottom-0 top-[24px] rounded-[8px] rounded-tl-none"
        style={{ border: `1.5px solid ${ink}`, backgroundColor: bg }}
      />
    </div>
  );
}

export const minimalistNodeTypes = {
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
