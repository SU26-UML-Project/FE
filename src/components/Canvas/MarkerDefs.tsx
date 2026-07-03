export function MarkerDefs() {
  return (
    <svg style={{ position: 'absolute', width: 0, height: 0 }}>
      <defs>
        <marker id="arrow" markerWidth="12" markerHeight="12"
                viewBox="0 0 12 12" refX="11" refY="6" orient="auto">
          <path d="M0,2 L10,6 L0,10" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
        </marker>

        <marker id="inheritance" markerWidth="20" markerHeight="14"
                viewBox="0 0 20 14" refX="19" refY="7" orient="auto">
          <polygon points="0,0 20,7 0,14" fill="white"
                   stroke="currentColor" strokeWidth="1.5"/>
        </marker>

        <marker id="realization" markerWidth="20" markerHeight="14"
                viewBox="0 0 20 14" refX="19" refY="7" orient="auto">
          <polygon points="0,0 20,7 0,14" fill="white"
                   stroke="currentColor" strokeWidth="1.5"/>
        </marker>

        <marker id="composition" markerWidth="18" markerHeight="18"
                viewBox="0 0 18 18" refX="17" refY="9" orient="auto">
          <polygon points="9,0 18,9 9,18 0,9" fill="currentColor" stroke="currentColor"/>
        </marker>

        <marker id="aggregation" markerWidth="18" markerHeight="18"
                viewBox="0 0 18 18" refX="17" refY="9" orient="auto">
          <polygon points="9,0 18,9 9,18 0,9" fill="white"
                   stroke="currentColor" strokeWidth="1.5"/>
        </marker>
      </defs>
    </svg>
  )
}
