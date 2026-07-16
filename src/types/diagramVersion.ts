import type { DiagramType, FlowEdge, FlowNode } from './index'

export type DiagramVersionSource = 'AUTO' | 'MANUAL' | 'BEFORE_AI' | 'BEFORE_IMPORT' | 'BEFORE_RESTORE' | 'RESTORE'

export interface DiagramSnapshot {
  schemaVersion: 1
  diagramType: DiagramType
  nodes: FlowNode[]
  edges: FlowEdge[]
  viewport?: { x: number; y: number; zoom: number }
}

export interface DiagramVersion {
  id: string
  sheetId: string
  versionNumber: number
  name: string
  note?: string
  source: DiagramVersionSource
  snapshot: DiagramSnapshot
  contentHash: string
  createdAt: number
  restoredFromVersionId?: string
}

export interface DiagramDiff {
  addedNodes: FlowNode[]
  removedNodes: FlowNode[]
  changedNodes: Array<{ before: FlowNode; after: FlowNode; fields: string[] }>
  addedEdges: FlowEdge[]
  removedEdges: FlowEdge[]
  changedEdges: Array<{ before: FlowEdge; after: FlowEdge; fields: string[] }>
}
