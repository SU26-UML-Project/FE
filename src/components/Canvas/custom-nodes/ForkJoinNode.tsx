import { type Node, type NodeProps } from '@xyflow/react'
import { BaseNode } from './BaseNode'

export interface ForkJoinNodeData {
  type: 'forkJoinNode'
  orientation?: 'horizontal' | 'vertical'
  color?: string
  [key: string]: unknown
}

type ForkJoinNodeType = Node<ForkJoinNodeData, 'forkJoinNode'>

export function ForkJoinNode({ data }: NodeProps<ForkJoinNodeType>) {
  const isVertical = data.orientation === 'vertical'
  
  return (
    <BaseNode className="fork-join-node">
      <div 
        className={`fork-join-bar ${isVertical ? 'vertical' : 'horizontal'}`}
        style={{ background: data.color || '#000' }}
      />
      <style>{`
        .fork-join-node {
          padding: 0;
          background: transparent;
        }
        .fork-join-bar {
          background: #000;
          border-radius: 2px;
        }
        .fork-join-bar.horizontal {
          width: 100px;
          height: 6px;
        }
        .fork-join-bar.vertical {
          width: 6px;
          height: 100px;
        }
      `}</style>
    </BaseNode>
  )
}
