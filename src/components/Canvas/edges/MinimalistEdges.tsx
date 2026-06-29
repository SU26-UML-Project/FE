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
  labelX,
  labelY,
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
  labelX?: number;
  labelY?: number;
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
  
  // Fallback to midpoint if labelX/Y not provided
  const lx = labelX ?? (sourceX + targetX) / 2;
  const ly = labelY ?? (sourceY + targetY) / 2;

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
              pointerEvents: 'all',
              zIndex: 1000
            }}
          >
            <div 
              className="whitespace-nowrap rounded-md border border-zinc-200 px-2.5 py-1.5 text-[11px] font-bold text-zinc-900 shadow-[0_2px_8px_rgba(0,0,0,0.12)]"
              style={{ backgroundColor: '#ffffff', opacity: 1 }}
            >
              {label}
            </div>
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}

export function SmoothStepEdge(props: EdgeProps) {
  const [path, labelX, labelY] = getSmoothStepPath({
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
      labelX={labelX}
      labelY={labelY}
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
  const [path, labelX, labelY] = getBezierPath({
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
      labelX={labelX}
      labelY={labelY}
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
  const [path, labelX, labelY] = getStraightPath({
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
      labelX={labelX}
      labelY={labelY}
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
