import { BaseEdge, getSmoothStepPath, getEdgeCenter, type EdgeProps } from '@xyflow/react'

export function IncludeEdge(props: EdgeProps) {
  const [edgePath] = getSmoothStepPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    targetX: props.targetX,
    targetY: props.targetY,
    sourcePosition: props.sourcePosition,
    targetPosition: props.targetPosition,
    borderRadius: 0,
  })

  const [labelX, labelY] = getEdgeCenter({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    targetX: props.targetX,
    targetY: props.targetY,
  })

  return (
    <BaseEdge
      path={edgePath}
      label="«include»"
      labelX={labelX}
      labelY={labelY}
      labelStyle={{ fontSize: 10, fill: '#555', fontFamily: 'Consolas, Monaco, monospace' }}
      style={{ ...props.style, strokeDasharray: '6 3' }}
      markerEnd="url(#arrow)"
    />
  )
}
