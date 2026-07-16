export interface AiSystemConfig {
  llmProvider: string | null;
  model: string | null;
  baseUrl?: string | null;
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
  baseUrl?: string | null;
  llmProvider?: string | null;
  model?: string | null;
}

export interface AiWorkspaceInfo {
  slug: string;
  name: string;
  baseUrl?: string | null;
  llmProvider?: string | null;
  model?: string | null;
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

export interface AiOptionDto {
  relation: string;
  label: string;
}

export interface AiQuestionDto {
  id: string;
  edgeId?: string;
  prompt: string;
  detail?: string;
  mode: 'single' | 'multiple';
  options: AiOptionDto[];
}

export interface AiNodeDto {
  id: string;
  type: string;
  label: string;
  stereotype?: string;
  attributes?: string[];
  methods?: string[];
}

export interface AiEdgeDto {
  id: string;
  source: string;
  target: string;
  relation: string;
  label?: string;
}

export type AiResponseKind = 'diagram' | 'questions' | 'reply';

export interface ChatMessage {
  role: 'ASSISTANT' | 'USER';
  content: string;
  createdAt: string;
  modelName?: string;
  kind?: AiResponseKind;
  summary?: string;
  nodes?: AiNodeDto[];
  edges?: AiEdgeDto[];
  questions?: AiQuestionDto[];
}

export interface ChatSession {
  id: string;
  anythingSessionId: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface AiContextRef {
  type: 'WORKSPACE_MARKDOWN' | 'DIAGRAM' | 'UPLOADED_FILE';
  itemId?: string;
  sheetId?: string;
  fileId?: string;
  name: string;
  inlineContent?: string;
  mimeType?: string;
}

export interface DiagramChatRequest {
  message: string;
  sessionId?: string;
  sheetId?: string;
  currentNodes?: AiNodeDto[];
  currentEdges?: AiEdgeDto[];
  contexts?: AiContextRef[];
}

export interface DiagramChatResponse {
  kind: AiResponseKind;
  summary?: string;
  answer: string;
  sessionId: string;
  nodes?: AiNodeDto[];
  edges?: AiEdgeDto[];
  questions?: AiQuestionDto[];
  sources?: any[];
}

export interface DiagramChatHistoryResponse {
  sessionId: string;
  messages: ChatMessage[];
}
