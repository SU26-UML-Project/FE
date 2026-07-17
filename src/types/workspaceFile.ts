export type WorkspaceFileKind = 'folder' | 'markdown' | 'diagram'

export interface WorkspaceFileItem {
  id: string
  projectId: string
  parentId: string | null
  name: string
  kind: WorkspaceFileKind
  orderIndex: number
  content?: string
  sheetId?: string
  diagramType?: string
  /** Optimistic concurrency counter từ backend (item local cũ không có). */
  version?: number
  createdAt: number
  updatedAt: number
}

export interface WorkspaceTreeState {
  items: WorkspaceFileItem[]
  expandedIds: string[]
  activeItemId: string | null
}

/* ─── Backend contract (GET/POST /projects/{id}/workspace-items, /workspace-items/*) ─── */

export type WorkspaceItemKindApi = 'FOLDER' | 'MARKDOWN' | 'DIAGRAM'

export interface WorkspaceItemResponse {
  id: string
  projectId: string
  parentId?: string
  name: string
  kind: WorkspaceItemKindApi
  orderIndex: number
  sheetId?: string
  diagramType?: string
  content?: string
  version: number
  createdAt: string
  updatedAt: string
}

export interface WorkspaceItemCreateRequest {
  parentId?: string | null
  name: string
  kind: WorkspaceItemKindApi
  content?: string
  diagramType?: string
  /** JSON string cùng shape với sheets.diagram_data — chỉ dùng cho kind DIAGRAM. */
  diagramData?: string
  orderIndex?: number
}

export interface WorkspaceItemUpdateRequest {
  name?: string
  content?: string
  expectedVersion?: number
}

export interface WorkspaceItemMoveRequest {
  parentId: string | null
  orderIndex?: number
  expectedVersion?: number
}

export interface WorkspaceItemDuplicateRequest {
  parentId?: string | null
  name?: string
}
