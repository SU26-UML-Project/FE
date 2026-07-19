import {
  BaseEdge, EdgeLabelRenderer,
  getSmoothStepPath, getBezierPath, getStraightPath,
  type EdgeProps,
} from "@xyflow/react";
import { resolveEdgeMultiplicity } from "../../utils/edgeMultiplicity";

interface EdgeData {
  marker?: string;
  markerStart?: string;
  dashed?: boolean;
  color?: string;
  multiplicitySource?: string;
  multiplicityTarget?: string;
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
  const mult = resolveEdgeMultiplicity(d, label);
  const lx = (sourceX + targetX) / 2;
  const ly = (sourceY + targetY) / 2;

  // Unit vector source→target, used to nudge the two end multiplicities
  // inward so they sit just inside each class (UML OMG placement).
  const dx = targetX - sourceX, dy = targetY - sourceY;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  const OFF = 16;

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
        {mult.name ? (
            <EdgeLabelRenderer>
              <div className="nodrag nopan absolute"
                   style={{ transform: `translate(-50%, -50%) translate(${lx}px, ${ly}px)` }}>
            <span className="whitespace-nowrap bg-white px-1 py-0.5 text-[11px] font-medium text-zinc-700">
              {mult.name}
            </span>
              </div>
            </EdgeLabelRenderer>
        ) : null}
        {mult.source ? (
            <EdgeLabelRenderer>
              <div className="nodrag nopan absolute"
                   style={{ transform: `translate(-50%, -50%) translate(${sourceX + ux * OFF}px, ${sourceY + uy * OFF}px)` }}>
            <span className="whitespace-nowrap bg-white px-1 py-0.5 text-[11px] font-medium text-zinc-700">
              {mult.source}
            </span>
              </div>
            </EdgeLabelRenderer>
        ) : null}
        {mult.target ? (
            <EdgeLabelRenderer>
              <div className="nodrag nopan absolute"
                   style={{ transform: `translate(-50%, -50%) translate(${targetX - ux * OFF}px, ${targetY - uy * OFF}px)` }}>
            <span className="whitespace-nowrap bg-white px-1 py-0.5 text-[11px] font-medium text-zinc-700">
              {mult.target}
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
    [path] = getSmoothStepPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, borderRadius: 0 });
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
