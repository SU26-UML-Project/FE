import { getSmoothStepPath, type EdgeProps } from '@xyflow/react'

export function DependencyEdge(props: EdgeProps) {
  const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style = {} } = props
  const [path] = getSmoothStepPath({
    sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, borderRadius: 0,
  })

  return (
    <path
      id={props.id}
      className="react-flow__edge-path"
      d={path}
      stroke={style.stroke || '#000'}
      color={style.stroke || '#000'}
      strokeWidth={1.5}
      fill="none"
      strokeDasharray="5 5"
      markerEnd="url(#arrow)"
      style={{ ...style, pointerEvents: 'all' }}
    />
  )
}
