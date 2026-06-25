import { type Node, type NodeProps } from '@xyflow/react'
import { BaseNode } from './BaseNode'

export interface InitialNodeData {
  type: 'initialNode'
  color?: string
  [key: string]: unknown
}

type InitialNodeType = Node<InitialNodeData, 'initialNode'>

export function InitialNode({ data }: NodeProps<InitialNodeType>) {
  return (
    <BaseNode className="initial-node">
      <div className="initial-node-circle" />
      <style>{`
        .initial-node {
          padding: 0;
          background: transparent;
        }
        .initial-node-circle {
          width: 24px;
          height: 24px;
          background: ${data.color || '#000'};
          border-radius: 50%;
          border: 1px solid #000;
        }
      `}</style>
    </BaseNode>
  )
}
