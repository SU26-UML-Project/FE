import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  getBezierPath,
  getStraightPath,
  type EdgeProps,
} from "@xyflow/react";

interface EdgeData {
  marker?: string;
  markerStart?: string;
  dashed?: boolean;
  color?: string;
}

function EdgeView({
  id,
  path,
  data,
  label,
  sourceX,
  sourceY,
  targetX,
  targetY,
  markerEnd,
  markerStart,
  selected
}: {
  id: string;
  path: string;
  data: any;
  label?: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  markerEnd?: string;
  markerStart?: string;
  selected?: boolean;
}) {
  // Use data if available, otherwise use props
  const d = data as EdgeData;
  const mEnd = d?.marker || markerEnd;
  const mStart = d?.markerStart || markerStart;
  const isDashed = d?.dashed;
  const color = d?.color || (selected ? "#09090b" : "#27272a");
  
  const lx = (sourceX + targetX) / 2;
  const ly = (sourceY + targetY) / 2;

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={mEnd}
        markerStart={mStart}
        style={{ 
          strokeDasharray: isDashed ? "6 4" : undefined,
          stroke: color,
          strokeWidth: selected ? 2 : 1.5
        }}
      />
      {label ? (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan absolute"
            style={{
              transform: `translate(-50%, -50%) translate(${lx}px, ${ly}px)`,
            }}
          >
            <span className="whitespace-nowrap rounded-md border border-zinc-200 bg-white px-1.5 py-0.5 text-[11px] font-medium text-zinc-600 shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
              {label}
            </span>
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}

export function SmoothStepEdge(props: EdgeProps) {
  const [path] = getSmoothStepPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    sourcePosition: props.sourcePosition,
    targetX: props.targetX,
    targetY: props.targetY,
    targetPosition: props.targetPosition,
    borderRadius: 10,
  });
  return (
    <EdgeView
      id={props.id}
      path={path}
      data={props.data}
      label={props.label as string | undefined}
      sourceX={props.sourceX}
      sourceY={props.sourceY}
      targetX={props.targetX}
      targetY={props.targetY}
      markerEnd={props.markerEnd}
      markerStart={props.markerStart}
      selected={props.selected}
    />
  );
}

export function BezierEdge(props: EdgeProps) {
  const [path] = getBezierPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    sourcePosition: props.sourcePosition,
    targetX: props.targetX,
    targetY: props.targetY,
    targetPosition: props.targetPosition,
  });
  return (
    <EdgeView
      id={props.id}
      path={path}
      data={props.data}
      label={props.label as string | undefined}
      sourceX={props.sourceX}
      sourceY={props.sourceY}
      targetX={props.targetX}
      targetY={props.targetY}
      markerEnd={props.markerEnd}
      markerStart={props.markerStart}
      selected={props.selected}
    />
  );
}

export function StraightEdge(props: EdgeProps) {
  const [path] = getStraightPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    targetX: props.targetX,
    targetY: props.targetY,
  });
  return (
    <EdgeView
      id={props.id}
      path={path}
      data={props.data}
      label={props.label as string | undefined}
      sourceX={props.sourceX}
      sourceY={props.sourceY}
      targetX={props.targetX}
      targetY={props.targetY}
      markerEnd={props.markerEnd}
      markerStart={props.markerStart}
      selected={props.selected}
    />
  );
}

export const minimalistEdgeTypes = {
  smoothstep: SmoothStepEdge,
  bezier: BezierEdge,
  straight: StraightEdge,
};
