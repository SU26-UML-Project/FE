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
}: {
  id: string;
  path: string;
  data: unknown;
  label?: string;
  labelX: number;
  labelY: number;
}) {
  const d = data as EdgeData;
  const marker = d?.marker || undefined;
  const markerStart = d?.markerStart || undefined;

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
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            <span className="whitespace-nowrap rounded-md border border-admin-outline/30 bg-white px-1.5 py-0.5 text-[11px] font-bold text-admin-secondary shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
              {label}
            </span>
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
    />
  );
}

export const edgeTypes = {
  smoothstep: SmoothStepEdge,
  bezier: BezierEdge,
  straight: StraightEdge,
};
