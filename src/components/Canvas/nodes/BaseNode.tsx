import { Handle, Position } from '@xyflow/react'
import { useState, type ReactNode } from 'react'

interface BaseNodeProps {
  children: ReactNode
  className?: string
  showHandles?: boolean
}

const STYLE = {
  width: 12,
  height: 12,
  border: '2px solid #3b82f6',
  background: '#fff',
  transition: 'opacity 0.08s, transform 0.08s',
  zIndex: 1,
}

function H({ id, type, pos, hover }: { id: string; type: 'source' | 'target'; pos: Position; hover: boolean }) {
  return (
    <Handle id={id} type={type} position={pos} isConnectable={hover}
      style={{ ...STYLE, opacity: hover ? 1 : 0, transform: hover ? 'scale(1)' : 'scale(0.5)' }} />
  )
}

export function BaseNode({ children, className = '', showHandles = true }: BaseNodeProps) {
  const [isHover, setIsHover] = useState(false)

  return (
    <div
      className={className}
      onMouseEnter={() => setIsHover(true)}
      onMouseLeave={() => setIsHover(false)}
    >
      {children}
      {showHandles && (
        <>
          <H id="rs" type="source" pos={Position.Right} hover={isHover} />
          <H id="rt" type="target" pos={Position.Right} hover={isHover} />
          <H id="ls" type="source" pos={Position.Left} hover={isHover} />
          <H id="lt" type="target" pos={Position.Left} hover={isHover} />
          <H id="ts" type="source" pos={Position.Top} hover={isHover} />
          <H id="tt" type="target" pos={Position.Top} hover={isHover} />
          <H id="bs" type="source" pos={Position.Bottom} hover={isHover} />
          <H id="bt" type="target" pos={Position.Bottom} hover={isHover} />
        </>
      )}
    </div>
  )
}
