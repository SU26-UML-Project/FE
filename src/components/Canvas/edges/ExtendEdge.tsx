import { BaseEdge, getSmoothStepPath, getEdgeCenter, type EdgeProps } from '@xyflow/react'

export function ExtendEdge(props: EdgeProps) {
  const { style } = props
  const [edgePath] = getSmoothStepPath({
    sourceX: props.sourceX, sourceY: props.sourceY, targetX: props.targetX, targetY: props.targetY,
    sourcePosition: props.sourcePosition, targetPosition: props.targetPosition, borderRadius: 0,
  })

  const [labelX, labelY] = getEdgeCenter({
    sourceX: props.sourceX, sourceY: props.sourceY, targetX: props.targetX, targetY: props.targetY,
  })

  return (
    <BaseEdge
      id={props.id}
      path={edgePath}
      label="«extend»"
      labelX={labelX}
      labelY={labelY}
      labelStyle={{ fontSize: 10, fill: '#555', fontFamily: 'Consolas, Monaco, monospace' }}
      style={{ strokeDasharray: '5 5', strokeWidth: 1.5, color: style?.stroke || '#000', stroke: style?.stroke || '#000', ...style }}
      markerEnd="url(#arrow)"
      interactionWidth={20}
    />
  )
}
