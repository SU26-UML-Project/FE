import { type ReactNode, useCallback } from 'react'

interface ShapeConfig {
  type: string
  label: string
  group: string
  preview: ReactNode
}

const SHAPE_CONFIG: ShapeConfig[] = [
  {
    type: 'classNode',
    label: 'Class',
    group: 'UML',
    preview: (
      <svg viewBox="0 0 80 50" width="80" height="50">
        <rect x="1" y="1" width="78" height="14" fill="#fff" stroke="#000" strokeWidth="1.5" rx="1" />
        <rect x="1" y="16" width="78" height="14" fill="#fff" stroke="#000" strokeWidth="1.5" />
        <rect x="1" y="31" width="78" height="18" fill="#fff" stroke="#000" strokeWidth="1.5" />
        <line x1="1" y1="16" x2="79" y2="16" stroke="#000" strokeWidth="1" />
        <line x1="1" y1="31" x2="79" y2="31" stroke="#000" strokeWidth="1" />
        <text x="40" y="10" textAnchor="middle" fontSize="6" fill="#666">«entity»</text>
        <text x="40" y="24" textAnchor="middle" fontSize="7" fontWeight="bold">Class</text>
      </svg>
    ),
  },
  {
    type: 'interfaceNode',
    label: 'Interface',
    group: 'UML',
    preview: (
      <svg viewBox="0 0 80 50" width="80" height="50">
        <rect x="1" y="1" width="78" height="18" fill="#fff" stroke="#000" strokeWidth="1.5" rx="1" />
        <rect x="1" y="20" width="78" height="29" fill="#fff" stroke="#000" strokeWidth="1.5" />
        <line x1="1" y1="20" x2="79" y2="20" stroke="#000" strokeWidth="1" />
        <text x="40" y="13" textAnchor="middle" fontSize="6" fill="#666" fontStyle="italic">«interface»</text>
        <text x="40" y="34" textAnchor="middle" fontSize="7" fontWeight="bold">Interface</text>
      </svg>
    ),
  },
  {
    type: 'useCaseNode',
    label: 'Use Case',
    group: 'UML',
    preview: (
      <svg viewBox="0 0 80 50" width="80" height="50">
        <ellipse cx="40" cy="25" rx="38" ry="22" fill="#fff" stroke="#000" strokeWidth="1.5" />
        <text x="40" y="28" textAnchor="middle" fontSize="7" fontWeight="bold">Use Case</text>
      </svg>
    ),
  },
  {
    type: 'actorNode',
    label: 'Actor',
    group: 'UML',
    preview: (
      <svg viewBox="0 0 80 50" width="80" height="50">
        <circle cx="40" cy="10" r="6" fill="#fff" stroke="#000" strokeWidth="1.5" />
        <line x1="40" y1="16" x2="40" y2="28" stroke="#000" strokeWidth="1.5" />
        <line x1="28" y1="22" x2="52" y2="22" stroke="#000" strokeWidth="1.5" />
        <line x1="40" y1="28" x2="28" y2="42" stroke="#000" strokeWidth="1.5" />
        <line x1="40" y1="28" x2="52" y2="42" stroke="#000" strokeWidth="1.5" />
        <text x="40" y="48" textAnchor="middle" fontSize="7" fontWeight="bold">Actor</text>
      </svg>
    ),
  },
]

export function ShapePanel() {
  const handleDragStart = useCallback((e: React.DragEvent, type: string) => {
    e.dataTransfer.setData('shapeType', type)
    const svg = e.currentTarget.querySelector('svg')
    if (svg) {
      e.dataTransfer.setDragImage(svg, 40, 25)
    }
  }, [])

  return (
    <div className="shape-panel">
      <div className="shape-panel-group">
        <h3 className="shape-panel-title">UML</h3>
        {SHAPE_CONFIG.map(shape => (
          <div
            key={shape.type}
            className="shape-item"
            draggable
            onDragStart={e => handleDragStart(e, shape.type)}
            title={shape.label}
          >
            {shape.preview}
            <span className="shape-item-label">{shape.label}</span>
          </div>
        ))}
      </div>
      <style>{`
        .shape-panel {
          width: 220px;
          background: #f8f9fa;
          border-right: 1px solid #e0e0e0;
          padding: 12px;
          user-select: none;
          overflow-y: auto;
          height: 100%;
        }
        .shape-panel-group {
          margin-bottom: 16px;
        }
        .shape-panel-title {
          font-size: 11px;
          text-transform: uppercase;
          color: #666;
          margin: 0 0 8px 4px;
          letter-spacing: 0.5px;
          font-weight: 600;
        }
        .shape-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 6px 8px;
          border-radius: 4px;
          cursor: grab;
          transition: background 0.1s;
        }
        .shape-item:hover {
          background: #e9ecef;
        }
        .shape-item:active {
          cursor: grabbing;
          background: #dee2e6;
        }
        .shape-item svg {
          flex-shrink: 0;
          border: 1px solid #d0d0d0;
          border-radius: 2px;
          background: #fff;
        }
        .shape-item-label {
          font-size: 12px;
          color: #333;
          font-weight: 500;
        }
      `}</style>
    </div>
  )
}
