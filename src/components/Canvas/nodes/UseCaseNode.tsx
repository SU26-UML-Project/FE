import { type Node, type NodeProps } from '@xyflow/react'
import { BaseNode } from './BaseNode'

export interface UseCaseNodeData {
  type: 'useCaseNode'
  label: string
  stereotype?: 'include' | 'extend'
  [key: string]: unknown
}

type UseCaseNodeType = Node<UseCaseNodeData, 'useCaseNode'>

export function UseCaseNode({ data }: NodeProps<UseCaseNodeType>) {
  return (
    <BaseNode className="usecase-node">
      <div className="usecase-node-label">{data.label}</div>
      <style>{`
        .usecase-node {
          background: #fff;
          border: 2px solid #000;
          border-radius: 50%;
          min-width: 140px;
          min-height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px 24px;
          font-family: 'Consolas', 'Monaco', monospace;
        }
        .usecase-node-label {
          font-size: 12px;
          font-weight: 500;
          text-align: center;
          word-break: break-word;
        }
      `}</style>
    </BaseNode>
  )
}
