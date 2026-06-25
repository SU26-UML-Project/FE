import { useCanvasStore, type EdgeType } from '../../stores/canvasStore'
import { ClassNodeForm } from './forms/ClassNodeForm'
import { InterfaceNodeForm } from './forms/InterfaceNodeForm'
import { UseCaseNodeForm } from './forms/UseCaseNodeForm'
import { ActorNodeForm } from './forms/ActorNodeForm'
import { StateNodeForm } from './forms/StateNodeForm'
import { ActionNodeForm } from './forms/ActionNodeForm'
import { DecisionNodeForm } from './forms/DecisionNodeForm'
import { ForkJoinNodeForm } from './forms/ForkJoinNodeForm'
import type { ComponentType, ReactNode } from 'react'
import type { Node } from '@xyflow/react'

interface FormProps {
  node: Node
  setNodeData: (id: string, patch: Partial<any>) => void
}

const NODE_FORM_REGISTRY: Record<string, ComponentType<FormProps>> = {
  classNode: ClassNodeForm,
  interfaceNode: InterfaceNodeForm,
  useCaseNode: UseCaseNodeForm,
  actorNode: ActorNodeForm,
  stateNode: StateNodeForm,
  actionNode: ActionNodeForm,
  decisionNode: DecisionNodeForm,
  forkJoinNode: ForkJoinNodeForm,
}

function EdgePreview({ label, dashed, arrow, diamond }: { label: string; dashed?: boolean; arrow?: string; diamond?: 'filled' | 'open' }) {
  return (
    <svg viewBox="0 0 56 14" width="56" height="14">
      <line x1="2" y1="7" x2="40" y2="7" stroke="#555" strokeWidth="1.5" strokeDasharray={dashed ? '3 2' : 'none'} />
      {diamond === 'filled' && <polygon points="2,2 8,7 2,12" fill="#555" />}
      {diamond === 'open' && <polygon points="2,2 8,7 2,12" fill="none" stroke="#555" strokeWidth="1.5" />}
      {arrow === 'closed' && <polygon points="40,2 48,7 40,12" fill="#555" />}
      {arrow === 'open' && <polygon points="40,1 52,7 40,13" fill="none" stroke="#555" strokeWidth="1.5" />}
      {arrow === 'filled' && <polygon points="40,1 52,7 40,13" fill="#555" />}
      {label && <text x="24" y="5" textAnchor="middle" fontSize="5" fill="#555" fontFamily="Consolas,monospace">{label}</text>}
    </svg>
  )
}

const EDGE_WITH_PREVIEW: { type: EdgeType; label: string; preview: ReactNode }[] = [
  { type: 'association', label: 'Association', preview: <EdgePreview label="" arrow="closed" /> },
  { type: 'inheritance', label: 'Inheritance', preview: <EdgePreview label="" arrow="filled" /> },
  { type: 'realization', label: 'Realization', preview: <EdgePreview label="" dashed arrow="open" /> },
  { type: 'composition', label: 'Composition', preview: <EdgePreview label="" diamond="filled" arrow="closed" /> },
  { type: 'aggregation', label: 'Aggregation', preview: <EdgePreview label="" diamond="open" arrow="closed" /> },
  { type: 'dependency', label: 'Dependency', preview: <EdgePreview label="" dashed arrow="closed" /> },
  { type: 'include', label: '«include»', preview: <EdgePreview label="«include»" dashed arrow="closed" /> },
  { type: 'extend', label: '«extend»', preview: <EdgePreview label="«extend»" dashed arrow="closed" /> },
  { type: 'controlFlow', label: 'Control Flow', preview: <EdgePreview label="" arrow="closed" /> },
  { type: 'objectFlow', label: 'Object Flow', preview: <EdgePreview label="" dashed arrow="closed" /> },
]

export function PropsPanel() {
  const selectedNode = useCanvasStore(s =>
    s.nodes.find(n => n.id === s.selectedNodeId)
  )
  const selectedEdge = useCanvasStore(s =>
    s.edges.find(e => e.id === s.selectedEdgeId)
  )
  const setNodeData = useCanvasStore(s => s.setNodeData)
  const setEdgeLabel = useCanvasStore(s => s.setEdgeLabel)
  const flipEdge = useCanvasStore(s => s.flipEdge)
  const setEdgeType = useCanvasStore(s => s.setEdgeType)
  const setEdgeStyle = useCanvasStore(s => s.setEdgeStyle)

  if (selectedEdge) {
    const currentType = selectedEdge.type?.replace('Edge', '') as EdgeType
    return (
      <div className="props-panel">
        <div className="props-header">
          <span className="props-header-type">Edge</span>
          <span className="props-header-id">#{selectedEdge.id?.slice(0, 6)}</span>
        </div>
        <div className="props-form">
          <div className="props-field">
            <label>Source</label>
            <div className="props-edge-endpoint">{selectedEdge.source?.slice(0, 8)}</div>
          </div>
          <div className="props-field">
            <label>Target</label>
            <div className="props-edge-endpoint">{selectedEdge.target?.slice(0, 8)}</div>
          </div>
          <div className="props-field">
            <label>Direction</label>
            <button className="flip-btn" onClick={() => flipEdge(selectedEdge.id)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 16l-4-4 4-4" />
                <path d="M3 12h18" />
              </svg>
              Reverse
            </button>
          </div>
          <div className="props-field">
            <label>Label (Trigger [Guard] / Effect)</label>
            <input 
              value={selectedEdge.label as string || ''} 
              onChange={e => setEdgeLabel(selectedEdge.id, e.target.value)} 
              placeholder="e.g. pay [balance > 0] / confirm"
              className="props-input"
            />
          </div>
          <div className="props-field">
            <label>Type</label>
            <div className="edge-type-list">
              {EDGE_WITH_PREVIEW.map(({ type, label, preview }) => (
                <button
                  key={type}
                  className={`edge-type-btn ${currentType === type ? 'active' : ''}`}
                  onClick={() => setEdgeType(selectedEdge.id, type)}
                  title={label}
                >
                  {preview}
                  <span className="edge-type-label">{label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="props-field">
            <label>Color</label>
            <div className="props-color-row">
              {['#000', '#e00', '#0a0', '#00c', '#c80', '#a0a'].map(c => (
                <button
                  key={c}
                  onClick={() => setEdgeStyle(selectedEdge.id, { stroke: c === '#000' ? '#000' : c })}
                  className={`props-color-swatch ${(selectedEdge.style?.stroke || '#000') === c ? 'active' : ''}`}
                  style={{ background: c, border: `2px solid ${c === '#fff' ? '#ccc' : c}` }}
                />
              ))}
            </div>
          </div>
        </div>
        <style>{EDGE_PROPS_CSS}</style>
      </div>
    )
  }

  if (!selectedNode) {
    return (
      <div className="props-panel props-empty">
        <div className="props-empty-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M9 9h6M9 12h6M9 15h4" />
          </svg>
        </div>
        <p>Select a node or edge to edit</p>
        <style>{EMPTY_CSS}</style>
      </div>
    )
  }

  const FormComponent = NODE_FORM_REGISTRY[selectedNode.type!]
  if (!FormComponent) {
    return (
      <div className="props-panel" style={{ padding: 20, fontSize: 12, color: '#999' }}>
        No editor for {selectedNode.type}
      </div>
    )
  }

  return (
    <div className="props-panel">
      <div className="props-header">
        <span className="props-header-type">{selectedNode.type?.replace('Node', '')}</span>
        <span className="props-header-id">#{selectedNode.id?.slice(0, 6)}</span>
      </div>
      <FormComponent node={selectedNode} setNodeData={setNodeData} />
      <style>{NODE_CSS}</style>
    </div>
  )
}

const EMPTY_CSS = `
  .props-panel { width: 240px; border-left: 1px solid #e0e0e0; background: #fafafa; overflow-y: auto; height: 100%; }
  .props-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 40px 20px; color: #999; font-size: 12px; }
  .props-empty-icon { opacity: 0.5; }
`

const NODE_CSS = `
  .props-panel { width: 240px; border-left: 1px solid #e0e0e0; background: #fafafa; overflow-y: auto; height: 100%; }
  .props-header {
    padding: 10px 12px;
    border-bottom: 1px solid #e0e0e0;
    background: #fff;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .props-header-type { font-size: 12px; font-weight: 600; color: #333; text-transform: capitalize; }
  .props-header-id { font-size: 10px; color: #aaa; font-family: 'Consolas', monospace; }
`

const EDGE_PROPS_CSS = `
  .props-panel { width: 240px; border-left: 1px solid #e0e0e0; background: #fafafa; overflow-y: auto; height: 100%; }
  .props-header {
    padding: 10px 12px;
    border-bottom: 1px solid #e0e0e0;
    background: #fff;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .props-header-type { font-size: 12px; font-weight: 600; color: #333; text-transform: capitalize; }
  .props-header-id { font-size: 10px; color: #aaa; font-family: 'Consolas', monospace; }
  .props-form { padding: 12px; display: flex; flex-direction: column; gap: 12px; font-size: 12px; }
  .props-field { display: flex; flex-direction: column; gap: 4px; }
  .props-field label { font-weight: 600; color: #555; font-size: 11px; text-transform: uppercase; letter-spacing: 0.3px; }
        .props-input {
          border: 1px solid #d0d0d0;
          border-radius: 4px;
          padding: 6px 8px;
          font-size: 12px;
          outline: none;
        }
        .props-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 2px rgba(59,130,246,0.15);
        }
        .props-edge-endpoint { font-family: 'Consolas', monospace; font-size: 11px; color: #666; padding: 4px 0; }
  .edge-type-list { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
  .edge-type-btn {
    font-size: 9px; padding: 3px 4px; border: 1px solid #d0d0d0; border-radius: 3px;
    background: #fff; cursor: pointer; text-align: center; transition: all 0.1s;
    font-family: 'Consolas', 'Monaco', monospace; display: flex; flex-direction: column;
    align-items: center; gap: 1px; color: #555;
  }
  .edge-type-btn:hover { background: #e9ecef; border-color: #bbb; }
  .edge-type-btn.active { background: #dbeafe; border-color: #3b82f6; }
  .edge-type-label { font-size: 8px; color: #555; line-height: 1; }
  .flip-btn {
    display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px;
    border: 1px solid #d0d0d0; border-radius: 3px; background: #fff;
    cursor: pointer; font-size: 11px; color: #555; font-family: inherit;
    transition: all 0.1s;
  }
  .flip-btn:hover { background: #e9ecef; border-color: #bbb; }
  .props-color-row { display: flex; gap: 6px; flex-wrap: wrap; }
  .props-color-swatch { width: 24px; height: 24px; border-radius: 4px; cursor: pointer; }
  .props-color-swatch.active { outline: 2px solid #3b82f6; outline-offset: 2px; }
`
