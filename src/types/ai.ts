export interface AiSystemConfig {
  llmProvider: string | null;
  model: string | null;
  embeddingProvider: string | null;
  embeddingModel: string | null;
  vectorDb: string | null;
  vectorDbEndpoint: string | null;
  anythingLlmBaseUrl?: string | null;
  documentChunkSize?: number | null;
  documentChunkOverlap?: number | null;
  hasApiKey?: boolean | null;
}

export interface AiSystemConfigRequest {
  llmProvider?: string;
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  embeddingProvider?: string;
  embeddingModel?: string;
  vectorDb?: string;
  vectorDbEndpoint?: string;
  vectorDbApiKey?: string;
  documentChunkSize?: number;
  documentChunkOverlap?: number;
}

export interface AiCreateWorkspaceRequest {
  slug: string;
  name: string;
}

export interface AiWorkspace {
  slug: string;
  name: string;
  chatModel: string | null;
  chatProvider: string | null;
  chatMode: string | null;
  temperature: number | null;
  topN: number | null;
  similarityThreshold: number | null;
  openAiHistory: number | null;
  openAiPrompt: string | null;
  queryRefusalResponse: string | null;
  documentCount: number;
  documents: AiDocument[];
}

export interface AiWorkspaceInfo {
  slug: string;
  name: string;
}

export interface AiWorkspaceUpdateRequest {
  model?: string;
  chatProvider?: string;
  chatMode?: string;
  temperature?: number;
  topN?: number;
  similarityThreshold?: number;
  openAiHistory?: number;
  openAiPrompt?: string;
  queryRefusalResponse?: string;
}

export interface AiDocument {
  docId: string;
  filename: string;
  docpath: string;
  size: number | null;
  status: string;
  uploadedAt: string | null;
}

export interface AiVersionInfo {
  version: string;
  llmProvider: string | null;
  model: string | null;
  environment: string;
}

export interface AiTestConnection {
  connected: boolean;
  latencyMs: number;
}

export interface ChatQuestion {
  title: string;
  type: 'single_select' | 'multi_select' | null;
  options: string[];
}

export interface ChatMessage {
  role: 'ai' | 'user';
  content: string;
  timestamp: string;
  questions?: ChatQuestion[];
}

export interface ChatSession {
  id: string;
  title?: string;
  updatedAt: string;
}

export interface DiagramChatRequest {
  message: string;
  sessionId?: string;
  sheetId?: string;
}

export interface DiagramChatResponse {
  answer: string;
  sessionId: string;
  questions: ChatQuestion[];
  actions?: any[];
  newState?: string; // Backend trả về string JSON
}
