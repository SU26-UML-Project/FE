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
  /** Danh sách từ server không kèm snapshot (payload lớn) — lazy-load qua get() khi chọn. */
  snapshot?: DiagramSnapshot
  contentHash: string
  createdAt: number
  restoredFromVersionId?: string
}

/* ─── Backend contract (/sheets/{sheetId}/versions) ─── */

export interface DiagramVersionResponse {
  id: string
  sheetId: string
  versionNumber: number
  name: string
  note?: string
  source: DiagramVersionSource
  diagramData?: string
  contentHash: string
  schemaVersion: number
  restoredFromVersionId?: string
  createdAt: string
}

export interface DiagramVersionCreateRequest {
  name?: string
  note?: string
  source: DiagramVersionSource
  diagramData: string
  force?: boolean
}

export interface DiagramDiff {
  addedNodes: FlowNode[]
  removedNodes: FlowNode[]
  changedNodes: Array<{ before: FlowNode; after: FlowNode; fields: string[] }>
  addedEdges: FlowEdge[]
  removedEdges: FlowEdge[]
  changedEdges: Array<{ before: FlowEdge; after: FlowEdge; fields: string[] }>
}
