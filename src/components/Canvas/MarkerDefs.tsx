export function MarkerDefs() {
  return (
    <svg style={{ position: 'absolute', width: 0, height: 0 }}>
      <defs>
        <marker
          id="inheritance"
          markerWidth="16"
          markerHeight="12"
          viewBox="0 0 16 12"
          refX="16"
          refY="6"
          orient="auto"
        >
          <polygon points="0,0 16,6 0,12" fill="#000" />
        </marker>
        <marker
          id="realization"
          markerWidth="16"
          markerHeight="12"
          viewBox="0 0 16 12"
          refX="16"
          refY="6"
          orient="auto"
        >
          <polygon points="0,0 16,6 0,12" fill="none" stroke="#000" strokeWidth="1.5" />
        </marker>
        <marker
          id="composition"
          markerWidth="20"
          markerHeight="20"
          viewBox="-10 -10 20 20"
          refX="0"
          refY="0"
          orient="auto-start-reverse"
        >
          <polygon points="0,-8 8,0 0,8 -8,0" fill="#000" />
        </marker>
        <marker
          id="aggregation"
          markerWidth="20"
          markerHeight="20"
          viewBox="-10 -10 20 20"
          refX="0"
          refY="0"
          orient="auto-start-reverse"
        >
          <polygon points="0,-8 8,0 0,8 -8,0" fill="#fff" stroke="#000" strokeWidth="1.5" />
        </marker>
        <marker
          id="arrow"
          markerWidth="14"
          markerHeight="10"
          viewBox="0 0 14 10"
          refX="14"
          refY="5"
          orient="auto"
        >
          <polygon points="0,0 14,5 0,10" fill="#000" />
        </marker>
      </defs>
    </svg>
  )
}
