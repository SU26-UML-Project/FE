import { type Node, type NodeProps } from '@xyflow/react'
import { BaseNode } from './BaseNode'

export interface FinalNodeData {
  type: 'finalNode'
  color?: string
  [key: string]: unknown
}

type FinalNodeType = Node<FinalNodeData, 'finalNode'>

export function FinalNode({ data }: NodeProps<FinalNodeType>) {
  return (
    <BaseNode className="final-node">
      <div className="final-node-outer">
        <div className="final-node-inner" />
      </div>
      <style>{`
        .final-node {
          padding: 0;
          background: transparent;
        }
        .final-node-outer {
          width: 26px;
          height: 26px;
          background: #fff;
          border-radius: 50%;
          border: 1px solid ${data.color || '#000'};
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .final-node-inner {
          width: 16px;
          height: 16px;
          background: ${data.color || '#000'};
          border-radius: 50%;
        }
      `}</style>
    </BaseNode>
  )
}
