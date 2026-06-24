export interface Workspace {
  id: string
  name: string
  category: string
  type: 'user' | 'prebuilt'
  clonedFrom?: string
  documents: WorkspaceDocument[]
  sheets: WorkspaceSheet[]
  aiContext: AIContext
  createdAt: string
  updatedAt: string
}

export interface WorkspaceSheet {
  id: string
  name: string
  diagramType: string
  canvasData: {
    nodes: any[]
    edges: any[]
    viewport?: any
  }
}

export interface WorkspaceDocument {
  id: string
  name: string
  type: 'md' | 'pdf' | 'drawio' | 'image'
  content: string
  url?: string
}

export interface AIContext {
  intent: string
  clarifications: Clarification[]
  history: ChatMessage[]
}

export interface Clarification {
  question: string
  options: string[]
  answer: string
  answeredAt: string
}

export interface ChatMessage {
  role: 'ai' | 'user'
  content: string
  timestamp: string
}

export interface PrebuiltMeta {
  id: string
  name: string
  domain: string
  summary: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  tags: string[]
}

export interface PrebuiltProject {
  meta: PrebuiltMeta
  workspace: Workspace
}
