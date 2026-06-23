import { type Node, type NodeProps } from '@xyflow/react'
import { BaseNode } from './BaseNode'

export interface InterfaceNodeData {
  type: 'interfaceNode'
  label: string
  methods?: string[]
  [key: string]: unknown
}

type InterfaceNodeType = Node<InterfaceNodeData, 'interfaceNode'>

export function InterfaceNode({ data }: NodeProps<InterfaceNodeType>) {
  return (
    <BaseNode className="interface-node">
      <div className="interface-node-header">
        <div className="interface-node-stereotype">«interface»</div>
        <div className="interface-node-title">{data.label}</div>
      </div>
      {data.methods && data.methods.length > 0 && (
        <div className="interface-node-section">
          {data.methods.map((m, i) => (
            <div key={i} className="interface-node-item">{m}</div>
          ))}
        </div>
      )}
      <style>{`
        .interface-node {
          background: #fff;
          border: 2px solid #000;
          border-radius: 2px;
          min-width: 180px;
          font-family: 'Consolas', 'Monaco', monospace;
          font-size: 12px;
        }
        .interface-node-header {
          padding: 6px 10px;
          text-align: center;
          border-bottom: 2px solid #000;
        }
        .interface-node-stereotype {
          font-size: 10px;
          color: #666;
          font-style: italic;
          margin-bottom: 2px;
        }
        .interface-node-title {
          font-weight: bold;
          font-size: 13px;
        }
        .interface-node-section {
          padding: 4px 10px;
        }
        .interface-node-item {
          padding: 2px 0;
          white-space: nowrap;
        }
      `}</style>
    </BaseNode>
  )
}
