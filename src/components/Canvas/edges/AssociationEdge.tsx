import { getSmoothStepPath, type EdgeProps } from '@xyflow/react'

export function AssociationEdge(props: EdgeProps) {
  const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd, style = {} } = props
  const [path] = getSmoothStepPath({
    sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, borderRadius: 8,
  })

  return (
    <path
      id={props.id}
      className="react-flow__edge-path"
      d={path}
      stroke="#333"
      strokeWidth={2.5}
      fill="none"
      markerEnd={markerEnd}
      style={{ ...style, pointerEvents: 'all' }}
    />
  )
}
