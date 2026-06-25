import { getSmoothStepPath, EdgeLabelRenderer, type EdgeProps } from '@xyflow/react'

export function BaseEdge(props: EdgeProps) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style = {}, label, type } = props
  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, borderRadius: 0,
  })

  // Xác định style dựa trên type
  const isDashed = type === 'dependencyEdge' || type === 'realizationEdge' || type === 'objectFlowEdge' || type === 'includeEdge' || type === 'extendEdge'
  
  // Xác định marker (mũi tên) dựa trên type
  let markerEnd = 'url(#arrow)'
  if (type === 'inheritanceEdge') markerEnd = 'url(#inheritance)'
  if (type === 'realizationEdge') markerEnd = 'url(#realization)'
  if (type === 'compositionEdge') markerEnd = 'url(#composition)'
  if (type === 'aggregationEdge') markerEnd = 'url(#aggregation)'

  return (
    <>
      <path
        id={id}
        className="react-flow__edge-path"
        d={path}
        stroke={style.stroke || '#000'}
        strokeWidth={1.5}
        strokeDasharray={isDashed ? '5 5' : 'none'}
        fill="none"
        markerEnd={markerEnd}
        style={{ ...style, pointerEvents: 'all' }}
      />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              background: 'rgba(255, 255, 255, 0.9)',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 600,
              pointerEvents: 'all',
              border: '1px solid #cbd5e1',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
              zIndex: 1000,
              color: '#334155',
            }}
            className="nodrag nopan"
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}
