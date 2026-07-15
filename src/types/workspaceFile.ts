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
  createdAt: number
  updatedAt: number
}

export interface WorkspaceTreeState {
  items: WorkspaceFileItem[]
  expandedIds: string[]
  activeItemId: string | null
}
