import {
  BaseEdge, EdgeLabelRenderer,
  getSmoothStepPath, getBezierPath, getStraightPath,
  useReactFlow,
  type EdgeProps, type Position,
} from "@xyflow/react";
import { useRef } from "react";
import { resolveEdgeMultiplicity } from "../../../shared/lib/edgeMultiplicity";
import { sizedMarker } from "../shared/Glyphs";
import { useEditor } from "../../../shared/lib/editorContext";

interface EdgeData {
  marker?: string;
  markerStart?: string;
  dashed?: boolean;
  color?: string;
  markerSize?: number;
  multiplicitySource?: string;
  multiplicityTarget?: string;
  sourcePull?: number;
  targetPull?: number;
  bend?: { x: number; y: number };
}

interface Point {
  x: number;
  y: number;
}

function midpointOnPath(points: Point[]): Point {
  const lengths = points.slice(1).map((point, index) => Math.hypot(point.x - points[index].x, point.y - points[index].y));
  const midpoint = lengths.reduce((total, length) => total + length, 0) / 2;
  let distance = 0;

  for (let index = 0; index < lengths.length; index++) {
    const length = lengths[index];
    if (distance + length >= midpoint) {
      const progress = length ? (midpoint - distance) / length : 0;
      return {
        x: points[index].x + (points[index + 1].x - points[index].x) * progress,
        y: points[index].y + (points[index + 1].y - points[index].y) * progress,
      };
    }
    distance += length;
  }

  return points[0];
}

function posToDir(pos?: Position | string): { x: number; y: number } {
  switch (pos) {
    case "top": return { x: 0, y: -1 };
    case "bottom": return { x: 0, y: 1 };
    case "left": return { x: -1, y: 0 };
    case "right": return { x: 1, y: 0 };
    default: return { x: 0, y: 0 };
  }
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

/**
 * Shift the two visible endpoints of a wire to honour the manual "pull" values:
 * positive pull moves the end off its node (leaves a gap → line looks shorter),
 * negative pull tucks it in. Unit directions are returned so the length handles
 * can follow the same axis.
 */
function resolveEndpoints(
  sourceX: number, sourceY: number, sourcePosition: Position | string | undefined,
  targetX: number, targetY: number, targetPosition: Position | string | undefined,
  sourcePull = 0, targetPull = 0
): { sx: number; sy: number; tx: number; ty: number; sU: Point; tU: Point } {
  const dx = targetX - sourceX, dy = targetY - sourceY;
  const len = Math.hypot(dx, dy) || 1;
  const diagUx = dx / len, diagUy = dy / len;

  const sDir = posToDir(sourcePosition);
  const tDir = posToDir(targetPosition);
  const sU = (sDir.x !== 0 || sDir.y !== 0) ? sDir : { x: diagUx, y: diagUy };
  const tU = (tDir.x !== 0 || tDir.y !== 0) ? tDir : { x: -diagUx, y: -diagUy };

  const sGap = clamp(sourcePull, -25, 60);
  const tGap = clamp(targetPull, -25, 60);

  return {
    sx: sourceX + sU.x * sGap,
    sy: sourceY + sU.y * sGap,
    tx: targetX + tU.x * tGap,
    ty: targetY + tU.y * tGap,
    sU,
    tU,
  };
}

/** A single draggable grip rendered as an overlay on the edge. */
function GripDot({
  x, y, onStart, onDrag, color,
}: {
  x: number; y: number;
  onStart: (down: { x: number; y: number }) => void;
  onDrag: (clientX: number, clientY: number) => void;
  color: string;
}) {
  // Keep latest callbacks in a ref so the window-level listeners (added
  // once per grip) always see fresh closures.
  const cb = useRef({ onStart, onDrag });
  cb.current = { onStart, onDrag };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Stop React Flow from starting a pan/selection and avoid native drags.
    e.preventDefault();
    e.stopPropagation();
    const el = e.currentTarget as HTMLDivElement;
    try { el.setPointerCapture(e.pointerId); } catch { /* ignore */ }

    cb.current.onStart({ x: e.clientX, y: e.clientY });

    const onMove = (ev: PointerEvent) => {
      ev.preventDefault();
      cb.current.onDrag(ev.clientX, ev.clientY);
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

  return (
    <EdgeLabelRenderer>
      <div
        onPointerDown={onPointerDown}
        className="nodrag nopan absolute z-[50] cursor-grab select-none active:cursor-grabbing"
        title="Drag to adjust the connector"
        style={{
          width: 16,
          height: 16,
          borderRadius: "50%",
          border: "2px solid #fff",
          background: color,
          boxShadow: "0 1px 4px rgba(0,0,0,0.35)",
          transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
          touchAction: "none",
          pointerEvents: "all",
          zIndex: 50,
        }}
      />
    </EdgeLabelRenderer>
  );
}

/** Draggable bend grip (middle) for moving the wire. The two ends use React
 *  Flow's built-in edge-updater anchors instead, so users can re-attach the
 *  connector to another node/handle by dragging its ends. */
function EdgeHandleLayer({ id, bend }: {
  id: string; bend: Point | null;
}) {
  const rf = useReactFlow();
  const { updateEdge } = useEditor();

  if (!bend) return null;
  return (
    <GripDot
      x={bend.x} y={bend.y} color="#8b5cf6"
      onStart={() => {}}
      onDrag={(cx, cy) => {
        const f = rf.screenToFlowPosition({ x: cx, y: cy });
        updateEdge(id, { bend: { x: Math.round(f.x), y: Math.round(f.y) } });
      }}
    />
  );
}

function EdgeView({ id, path, data, label, labelX, labelY, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, selected, bend, allowHandle }: {
  id: string; path: string; data: unknown; label?: string;
  labelX: number; labelY: number;
  sourceX: number; sourceY: number; targetX: number; targetY: number;
  sourcePosition?: Position | string; targetPosition?: Position | string;
  style?: React.CSSProperties;
  selected?: boolean;
  bend?: Point | null;
  allowHandle?: boolean;
}) {
  const d = data as EdgeData;
  const marker = d?.marker || undefined;
  const markerStart = d?.markerStart || undefined;
  const markerSize = d?.markerSize ?? 1;
  const mult = resolveEdgeMultiplicity(d, label);

  // The endpoints that are actually drawn / grabbed (after manual pull).
  const { sx, sy, tx, ty, sU, tU } = resolveEndpoints(
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
    d?.sourcePull, d?.targetPull
  );

  const OFF = 20;

  // Visual feedback: blue highlight when selected
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
            markerEnd={marker ? sizedMarker(marker, markerSize) : undefined}
            markerStart={markerStart ? sizedMarker(markerStart, markerSize) : undefined}
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
                   style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}>
            <span className="whitespace-nowrap bg-white px-1 py-0.5 text-[11px] font-medium text-zinc-700">
              {mult.name}
            </span>
              </div>
            </EdgeLabelRenderer>
        ) : null}
        {mult.source && sU ? (
            <EdgeLabelRenderer>
              <div className="nodrag nopan absolute"
                   style={{ transform: `translate(-50%, -50%) translate(${sourceX + sU.x * OFF}px, ${sourceY + sU.y * OFF}px)` }}>
            <span className="whitespace-nowrap bg-white px-1 py-0.5 text-[11px] font-medium text-zinc-700">
              {mult.source}
            </span>
              </div>
            </EdgeLabelRenderer>
        ) : null}
        {mult.target && tU ? (
            <EdgeLabelRenderer>
              <div className="nodrag nopan absolute"
                   style={{ transform: `translate(-50%, -50%) translate(${targetX + tU.x * OFF}px, ${targetY + tU.y * OFF}px)` }}>
            <span className="whitespace-nowrap bg-white px-1 py-0.5 text-[11px] font-medium text-zinc-700">
              {mult.target}
            </span>
              </div>
            </EdgeLabelRenderer>
        ) : null}
        {selected && allowHandle ? (
            <EdgeHandleLayer
                id={id}
                bend={bend ?? { x: Math.round((sx + tx) / 2), y: Math.round((sy + ty) / 2) }}
            />
        ) : null}
      </>
  );
}

export function OrthogonalEdge(props: EdgeProps) {
  const { source, target, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition } = props;
  const data = props.data as EdgeData;

  if (source === target) {
    const r = 32;
    const path = `M ${sourceX} ${sourceY} C ${sourceX + r * 1.8} ${sourceY - r * 2}, ${sourceX + r * 2.5} ${sourceY + r}, ${sourceX} ${sourceY}`;
    return (
      <EdgeView id={props.id} path={path} data={props.data} label={props.label as string | undefined}
                labelX={sourceX + r * 1.4} labelY={sourceY - r * 0.9}
                sourceX={sourceX} sourceY={sourceY} targetX={targetX} targetY={targetY}
                sourcePosition={sourcePosition} targetPosition={targetPosition}
                style={props.style} selected={props.selected} allowHandle
      />
    );
  }

  const { sx, sy, tx, ty } = resolveEndpoints(
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
    data?.sourcePull, data?.targetPull
  );

  let path: string;
  let labelPoint: Point;
  let handleBend: Point | null = data?.bend || null;

  if (data?.bend) {
    // Forec an orthogonal route through the user-placed bend point.
    const mbx = data.bend.x;
    const midY = Math.round((sy + ty) / 2);
    path = `M ${sx} ${sy} L ${mbx} ${sy} L ${mbx} ${ty} L ${tx} ${ty}`;
    labelPoint = { x: mbx, y: midY };
    handleBend = { x: mbx, y: midY };
  } else {
    const isHorizontalPair = (sourcePosition === "right" && targetPosition === "left") ||
        (sourcePosition === "left" && targetPosition === "right");
    const isVerticalPair = (sourcePosition === "bottom" && targetPosition === "top") ||
        (sourcePosition === "top" && targetPosition === "bottom");

    if (isHorizontalPair) {
      if (Math.abs(sy - ty) < 3) {
        path = `M ${sx} ${sy} L ${tx} ${ty}`;
        labelPoint = midpointOnPath([{ x: sx, y: sy }, { x: tx, y: ty }]);
      } else {
        const midX = sx + (tx - sx) / 2;
        path = `M ${sx} ${sy} L ${midX} ${sy} L ${midX} ${ty} L ${tx} ${ty}`;
        labelPoint = midpointOnPath([{ x: sx, y: sy }, { x: midX, y: sy }, { x: midX, y: ty }, { x: tx, y: ty }]);
      }
    } else if (isVerticalPair) {
      if (Math.abs(sx - tx) < 3) {
        path = `M ${sx} ${sy} L ${tx} ${ty}`;
        labelPoint = midpointOnPath([{ x: sx, y: sy }, { x: tx, y: ty }]);
      } else {
        const midY = sy + (ty - sy) / 2;
        path = `M ${sx} ${sy} L ${sx} ${midY} L ${tx} ${midY} L ${tx} ${ty}`;
        labelPoint = midpointOnPath([{ x: sx, y: sy }, { x: sx, y: midY }, { x: tx, y: midY }, { x: tx, y: ty }]);
      }
    } else {
      const [smoothPath, labelX, labelY] = getSmoothStepPath({ sourceX: sx, sourceY: sy, sourcePosition, targetX: tx, targetY: ty, targetPosition, borderRadius: 0 });
      path = smoothPath;
      labelPoint = { x: labelX, y: labelY };
    }
  }

  return (
      <EdgeView id={props.id} path={path} data={props.data} label={props.label as string | undefined}
                labelX={labelPoint.x} labelY={labelPoint.y}
                sourceX={sourceX} sourceY={sourceY} targetX={targetX} targetY={targetY}
                sourcePosition={sourcePosition} targetPosition={targetPosition}
                bend={handleBend}
                style={props.style}
                selected={props.selected}
                allowHandle
      />
  );
}

export function BezierEdge(props: EdgeProps) {
  const data = props.data as EdgeData;
  if (props.source === props.target) {
    const r = 32;
    const path = `M ${props.sourceX} ${props.sourceY} C ${props.sourceX + r * 1.8} ${props.sourceY - r * 2}, ${props.sourceX + r * 2.5} ${props.sourceY + r}, ${props.sourceX} ${props.sourceY}`;
    return (
      <EdgeView id={props.id} path={path} data={props.data} label={props.label as string | undefined}
                labelX={props.sourceX + r * 1.4} labelY={props.sourceY - r * 0.9}
                sourceX={props.sourceX} sourceY={props.sourceY} targetX={props.targetX} targetY={props.targetY}
                sourcePosition={props.sourcePosition} targetPosition={props.targetPosition}
                style={props.style} selected={props.selected} allowHandle
      />
    );
  }

  const { sx, sy, tx, ty } = resolveEndpoints(
    props.sourceX, props.sourceY, props.sourcePosition,
    props.targetX, props.targetY, props.targetPosition,
    data?.sourcePull, data?.targetPull
  );
  const [path, labelX, labelY] = getBezierPath({
    sourceX: sx, sourceY: sy, sourcePosition: props.sourcePosition,
    targetX: tx, targetY: ty, targetPosition: props.targetPosition,
  });
  return (
    <EdgeView id={props.id} path={path} data={props.data} label={props.label as string | undefined}
              labelX={labelX} labelY={labelY}
              sourceX={props.sourceX} sourceY={props.sourceY} targetX={props.targetX} targetY={props.targetY}
              sourcePosition={props.sourcePosition} targetPosition={props.targetPosition}
              style={props.style}
              selected={props.selected}
              allowHandle
    />
  );
}

export function StraightEdge(props: EdgeProps) {
  const data = props.data as EdgeData;
  if (props.source === props.target) {
    const r = 32;
    const path = `M ${props.sourceX} ${props.sourceY} C ${props.sourceX + r * 1.8} ${props.sourceY - r * 2}, ${props.sourceX + r * 2.5} ${props.sourceY + r}, ${props.sourceX} ${props.sourceY}`;
    return (
      <EdgeView id={props.id} path={path} data={props.data} label={props.label as string | undefined}
                labelX={props.sourceX + r * 1.4} labelY={props.sourceY - r * 0.9}
                sourceX={props.sourceX} sourceY={props.sourceY} targetX={props.targetX} targetY={props.targetY}
                sourcePosition={props.sourcePosition} targetPosition={props.targetPosition}
                style={props.style} selected={props.selected} allowHandle
      />
    );
  }

  const { sx, sy, tx, ty } = resolveEndpoints(
    props.sourceX, props.sourceY, props.sourcePosition,
    props.targetX, props.targetY, props.targetPosition,
    data?.sourcePull, data?.targetPull
  );
  let path: string;
  let labelPoint: Point;
  let handleBend: Point | null = data?.bend || null;

  if (data?.bend) {
    const mbx = data.bend.x;
    const midY = Math.round((sy + ty) / 2);
    path = `M ${sx} ${sy} L ${mbx} ${sy} L ${mbx} ${ty} L ${tx} ${ty}`;
    labelPoint = { x: mbx, y: midY };
    handleBend = { x: mbx, y: midY };
  } else {
    const [p, labelX, labelY] = getStraightPath({ sourceX: sx, sourceY: sy, targetX: tx, targetY: ty });
    path = p;
    labelPoint = { x: labelX, y: labelY };
  }
  return (
      <EdgeView id={props.id} path={path} data={props.data} label={props.label as string | undefined}
                labelX={labelPoint.x} labelY={labelPoint.y}
                sourceX={props.sourceX} sourceY={props.sourceY} targetX={props.targetX} targetY={props.targetY}
                sourcePosition={props.sourcePosition} targetPosition={props.targetPosition}
                bend={handleBend}
                style={props.style}
                selected={props.selected}
                allowHandle
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
