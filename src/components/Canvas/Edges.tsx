import {
  BaseEdge, EdgeLabelRenderer,
  getSmoothStepPath, getBezierPath, getStraightPath,
  type EdgeProps,
} from "@xyflow/react";

interface EdgeData {
  marker?: string;
  markerStart?: string;
  dashed?: boolean;
  color?: string;
}

function EdgeView({ id, path, data, label, sourceX, sourceY, targetX, targetY, style, selected }: {
  id: string; path: string; data: unknown; label?: string;
  sourceX: number; sourceY: number; targetX: number; targetY: number;
  style?: React.CSSProperties;
  selected?: boolean;
}) {
  const d = data as EdgeData;
  const marker = d?.marker || undefined;
  const markerStart = d?.markerStart || undefined;
  const lx = (sourceX + targetX) / 2;
  const ly = (sourceY + targetY) / 2;

  // Visual feedback: blue highlight when selected or hovered
  const strokeColor = selected ? "#2563eb" : (d?.color || "#565e74");
  const strokeWidth = selected ? 3 : 1.5;

  return (
    <>
      {/* Invisible thicker path to make it easier to click */}
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={25}
        className="react-flow__edge-interaction"
        style={{ cursor: "pointer" }}
      />
      <BaseEdge 
        id={id} 
        path={path} 
        markerEnd={marker} 
        markerStart={markerStart}
        style={{ 
          ...style, 
          stroke: strokeColor, 
          strokeWidth,
          strokeDasharray: d?.dashed ? "6 4" : undefined,
          transition: "stroke 0.2s, stroke-width 0.3s",
          filter: selected ? "drop-shadow(0 0 2px rgba(37, 99, 235, 0.4))" : undefined
        }}
      />
      {label ? (
        <EdgeLabelRenderer>
          <div className="nodrag nopan absolute"
            style={{ transform: `translate(-50%, -50%) translate(${lx}px, ${ly}px)` }}>
            <span className="whitespace-nowrap rounded-md border border-zinc-200 bg-white px-1.5 py-0.5 text-[11px] font-medium text-zinc-600 shadow-sm">
              {label}
            </span>
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}

export function OrthogonalEdge(props: EdgeProps) {
  const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition } = props;

  const isHorizontalPair = (sourcePosition === "right" && targetPosition === "left") ||
                           (sourcePosition === "left" && targetPosition === "right");
  const isVerticalPair = (sourcePosition === "bottom" && targetPosition === "top") ||
                        (sourcePosition === "top" && targetPosition === "bottom");

  let path: string;

  if (isHorizontalPair) {
    if (Math.abs(sourceY - targetY) < 3) {
      path = `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;
    } else {
      const midX = sourceX + (targetX - sourceX) / 2;
      path = `M ${sourceX} ${sourceY} L ${midX} ${sourceY} L ${midX} ${targetY} L ${targetX} ${targetY}`;
    }
  } else if (isVerticalPair) {
    if (Math.abs(sourceX - targetX) < 3) {
      path = `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;
    } else {
      const midY = sourceY + (targetY - sourceY) / 2;
      path = `M ${sourceX} ${sourceY} L ${sourceX} ${midY} L ${targetX} ${midY} L ${targetX} ${targetY}`;
    }
  } else {
    [path] = getSmoothStepPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, borderRadius: 8 });
  }

  return (
   <EdgeView id={props.id} path={path} data={props.data} label={props.label as string | undefined}
      sourceX={sourceX} sourceY={sourceY} targetX={targetX} targetY={targetY} 
      style={props.style} 
      selected={props.selected}
    />
  );
}

export function BezierEdge(props: EdgeProps) {
  const [path] = getBezierPath({
    sourceX: props.sourceX, sourceY: props.sourceY, sourcePosition: props.sourcePosition,
    targetX: props.targetX, targetY: props.targetY, targetPosition: props.targetPosition,
  });
  return (
   <EdgeView id={props.id} path={path} data={props.data} label={props.label as string | undefined}
      sourceX={props.sourceX} sourceY={props.sourceY} targetX={props.targetX} targetY={props.targetY} 
      style={props.style} 
      selected={props.selected}
    />
  );
}

export function StraightEdge(props: EdgeProps) {
  const [path] = getStraightPath({ sourceX: props.sourceX, sourceY: props.sourceY, targetX: props.targetX, targetY: props.targetY });
  return (
    <EdgeView id={props.id} path={path} data={props.data} label={props.label as string | undefined}
      sourceX={props.sourceX} sourceY={props.sourceY} targetX={props.targetX} targetY={props.targetY} 
      style={props.style} 
      selected={props.selected}
    />
  );
}

export const edgeTypes = {
  smoothstep: OrthogonalEdge,
  orthogonal: OrthogonalEdge,
  bezier: BezierEdge,
  straight: StraightEdge,
  default: OrthogonalEdge,
};
