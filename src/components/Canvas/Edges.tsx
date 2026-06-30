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
}: {
  id: string;
  path: string;
  data: unknown;
  label?: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
}) {
  const d = data as EdgeData;
  const marker = d?.marker || undefined;
  const markerStart = d?.markerStart || undefined;
  const lx = (sourceX + targetX) / 2;
  const ly = (sourceY + targetY) / 2;

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={marker}
        markerStart={markerStart}
        style={{
          stroke: d?.color || undefined,
          strokeDasharray: d?.dashed ? "6 4" : undefined,
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
            <span className="whitespace-nowrap rounded-md border border-[var(--line)] bg-white px-1.5 py-0.5 text-[11px] font-medium text-zinc-600 shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
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
    />
  );
}

export const edgeTypes = {
  smoothstep: SmoothStepEdge,
  bezier: BezierEdge,
  straight: StraightEdge,
};
