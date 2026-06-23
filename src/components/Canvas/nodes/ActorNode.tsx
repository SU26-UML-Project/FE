import { type Node, type NodeProps } from '@xyflow/react'
import { BaseNode } from './BaseNode'

export interface ActorNodeData {
  type: 'actorNode'
  label: string
  [key: string]: unknown
}

type ActorNodeType = Node<ActorNodeData, 'actorNode'>

export function ActorNode({ data }: NodeProps<ActorNodeType>) {
  return (
    <BaseNode className="actor-node">
      <div className="actor-node-svg">
        <svg viewBox="0 0 40 60" width="40" height="60">
          <circle cx="20" cy="10" r="7" fill="none" stroke="#000" strokeWidth="2" />
          <line x1="20" y1="17" x2="20" y2="35" stroke="#000" strokeWidth="2" />
          <line x1="6" y1="24" x2="34" y2="24" stroke="#000" strokeWidth="2" />
          <line x1="20" y1="35" x2="8" y2="52" stroke="#000" strokeWidth="2" />
          <line x1="20" y1="35" x2="32" y2="52" stroke="#000" strokeWidth="2" />
        </svg>
      </div>
      <div className="actor-node-label">{data.label}</div>
      <style>{`
        .actor-node {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 8px 12px;
          min-width: 80px;
          position: relative;
        }
        .actor-node-svg {
          display: flex;
          justify-content: center;
        }
        .actor-node-label {
          font-size: 11px;
          font-weight: 500;
          text-align: center;
          font-family: 'Consolas', 'Monaco', monospace;
        }
      `}</style>
    </BaseNode>
  )
}
