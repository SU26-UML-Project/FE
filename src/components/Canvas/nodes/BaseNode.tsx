import { Handle, Position } from '@xyflow/react'
import { useRef, useState, useCallback, useMemo, type ReactNode } from 'react'

interface BaseNodeProps {
  children: ReactNode
  className?: string
  showHandles?: boolean
}

const HANDLE_STYLE = {
  width: 6,
  height: 6,
  border: '1.5px solid #3b82f6',
  background: '#fff',
  transition: 'opacity 0.15s, transform 0.15s, box-shadow 0.15s',
  zIndex: 10,
  pointerEvents: 'all' as const,
  transformOrigin: 'center',
}

const HANDLE_CONFIGS: { id: string; position: Position; offsetStyle: React.CSSProperties }[] = [
  { id: 'left-top',     position: Position.Left,   offsetStyle: { top: '28%' } },
  { id: 'left-bottom',  position: Position.Left,   offsetStyle: { top: '72%' } },
  { id: 'right-top',    position: Position.Right,  offsetStyle: { top: '28%' } },
  { id: 'right-bottom', position: Position.Right,  offsetStyle: { top: '72%' } },
  { id: 'top-left',     position: Position.Top,    offsetStyle: { left: '28%' } },
  { id: 'top-right',    position: Position.Top,    offsetStyle: { left: '72%' } },
  { id: 'bottom-left',  position: Position.Bottom, offsetStyle: { left: '28%' } },
  { id: 'bottom-right', position: Position.Bottom, offsetStyle: { left: '72%' } },
]

function getHandlePercentPos(config: typeof HANDLE_CONFIGS[number]): { x: number; y: number } {
  const pctY = parseFloat(String(config.offsetStyle.top || '50'))
  const pctX = parseFloat(String(config.offsetStyle.left || '50'))
  switch (config.position) {
    case Position.Left:   return { x: 0, y: pctY }
    case Position.Right:  return { x: 100, y: pctY }
    case Position.Top:    return { x: pctX, y: 0 }
    case Position.Bottom: return { x: pctX, y: 100 }
  }
}

export function BaseNode({ children, className = '', showHandles = true }: BaseNodeProps) {
  const nodeRef = useRef<HTMLDivElement>(null)
  const [isHover, setIsHover] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 })

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!nodeRef.current) return
    const rect = nodeRef.current.getBoundingClientRect()
    setMousePos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    })
  }, [])

  const rankedHandles = useMemo(() => {
    if (!isHover) return []
    const distances = HANDLE_CONFIGS.map((h) => {
      const pos = getHandlePercentPos(h)
      return { id: h.id, dist: Math.hypot(mousePos.x - pos.x, mousePos.y - pos.y) }
    })
    distances.sort((a, b) => a.dist - b.dist)
    return distances.slice(0, 4).map((d, i) => ({
      id: d.id,
      rank: i + 1 as 1 | 2 | 3 | 4,
    }))
  }, [isHover, mousePos])

  return (
    <div
      ref={nodeRef}
      className={className}
      onMouseEnter={() => setIsHover(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setIsHover(false)}
    >
      {children}
      {showHandles && HANDLE_CONFIGS.map((h) => {
        const ranked = rankedHandles.find((r) => r.id === h.id)
        if (!ranked) {
          return (
            <Handle key={h.id} id={h.id} type="source" position={h.position} isConnectable={true}
              style={{ ...HANDLE_STYLE, ...h.offsetStyle, opacity: 0, transform: 'scale(0.3)' }} />
          )
        }
        const isClosest = ranked.rank === 1
        return (
          <Handle
            key={h.id}
            id={h.id}
            type="source"
            position={h.position}
            isConnectable={true}
            style={{
              ...HANDLE_STYLE,
              ...h.offsetStyle,
              opacity: isClosest ? 1 : 0.5,
              transform: isClosest ? 'scale(2)' : 'scale(0.7)',
              boxShadow: isClosest ? '0 0 6px 2px rgba(59,130,246,0.35)' : 'none',
            }}
          />
        )
      })}
    </div>
  )
}
