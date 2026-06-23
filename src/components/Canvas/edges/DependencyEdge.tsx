import { getSmoothStepPath, type EdgeProps } from '@xyflow/react'

export function DependencyEdge(props: EdgeProps) {
  const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition } = props
  const [path] = getSmoothStepPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
    borderRadius: 8,
  })

  return (
    <path
      id={props.id}
      className="react-flow__edge-path"
      d={path}
      stroke="#333"
      strokeWidth={1.5}
      strokeDasharray="6 4"
      fill="none"
      markerEnd="url(#arrow)"
    />
  )
}
