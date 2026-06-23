import { type Node, type NodeProps } from '@xyflow/react'
import { BaseNode } from './BaseNode'

export interface ClassNodeData {
  type: 'classNode'
  label: string
  stereotype?: string
  attributes?: string[]
  methods?: string[]
  color?: string
  [key: string]: unknown
}

type ClassNodeType = Node<ClassNodeData, 'classNode'>

export function ClassNode({ data }: NodeProps<ClassNodeType>) {
  return (
    <BaseNode className="class-node">
      <div className="class-node-header">
        {data.stereotype && <div className="class-node-stereotype">«{data.stereotype}»</div>}
        <div className="class-node-title">{data.label}</div>
      </div>
      {data.attributes && data.attributes.length > 0 && (
        <div className="class-node-section">
          {data.attributes.map((a, i) => (
            <div key={i} className="class-node-item">{a}</div>
          ))}
        </div>
      )}
      {data.methods && data.methods.length > 0 && (
        <div className="class-node-section">
          {data.methods.map((m, i) => (
            <div key={i} className="class-node-item">{m}</div>
          ))}
        </div>
      )}
      <style>{`
        .class-node {
          background: ${data.color || '#fff'};
          border: 2px solid #000;
          border-radius: 2px;
          min-width: 180px;
          font-family: 'Consolas', 'Monaco', monospace;
          font-size: 12px;
        }
        .class-node-header {
          padding: 6px 10px;
          text-align: center;
          border-bottom: 2px solid #000;
        }
        .class-node-stereotype {
          font-size: 10px;
          color: #666;
          margin-bottom: 2px;
        }
        .class-node-title {
          font-weight: bold;
          font-size: 13px;
        }
        .class-node-section {
          padding: 4px 10px;
          border-top: 1px solid #000;
        }
        .class-node-item {
          padding: 2px 0;
          white-space: nowrap;
        }
      `}</style>
    </BaseNode>
  )
}
