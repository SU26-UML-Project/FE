import apiClient from './apiClient';

export interface ApiResponse<T> {
  code: number;
  message: string;
  result: T;
}

export interface AiSystemConfig {
  llmProvider: string | null;
  model: string | null;
  vectorDb: string | null;
  vectorDbEndpoint: string | null;
  hasApiKey?: boolean | null;
}

export interface AiSystemConfigRequest {
  llmProvider?: string;
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  vectorDb?: string;
  vectorDbEndpoint?: string;
  vectorDbApiKey?: string;
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

export const aiAdminService = {
  getSystemConfig: async (): Promise<ApiResponse<AiSystemConfig>> => {
    return apiClient.get('/admin/ai/config') as any;
  },

  updateSystemConfig: async (data: AiSystemConfigRequest): Promise<ApiResponse<AiSystemConfig>> => {
    return apiClient.put('/admin/ai/config', data) as any;
  },

  getProviders: async (): Promise<ApiResponse<string[]>> => {
    return apiClient.get('/admin/ai/providers') as any;
  },

  testConnection: async (): Promise<ApiResponse<AiTestConnection>> => {
    return apiClient.post('/admin/ai/test') as any;
  },

  getWorkspace: async (slug?: string): Promise<ApiResponse<AiWorkspace>> => {
    const params = slug ? { slug } : {};
    return apiClient.get('/admin/ai/workspace', { params }) as any;
  },

  updateWorkspace: async (data: AiWorkspaceUpdateRequest, slug?: string): Promise<ApiResponse<AiWorkspace>> => {
    const params = slug ? { slug } : {};
    return apiClient.put('/admin/ai/workspace', data, { params }) as any;
  },

  getWorkspaces: async (): Promise<ApiResponse<AiWorkspaceInfo[]>> => {
    return apiClient.get('/admin/ai/workspaces') as any;
  },

  getProviderModels: async (provider: string, basePath?: string): Promise<ApiResponse<string[]>> => {
    const params: any = {};
    if (basePath) params.basePath = basePath;
    return apiClient.get(`/admin/ai/providers/${provider}/models`, { params }) as any;
  },

  getDocuments: async (workspaceSlug?: string): Promise<ApiResponse<AiDocument[]>> => {
    const params = workspaceSlug ? { workspace: workspaceSlug } : {};
    return apiClient.get('/admin/ai/documents', { params }) as any;
  },

  uploadDocument: async (file: File, workspaceSlug?: string): Promise<ApiResponse<void>> => {
    const formData = new FormData();
    formData.append('file', file);
    const params = workspaceSlug ? { workspace: workspaceSlug } : {};
    return apiClient.post('/admin/ai/documents', formData, {
      params,
      headers: { 'Content-Type': undefined as unknown as string },
      timeout: 120000,
    }) as any;
  },

  deleteDocument: async (documentPath: string): Promise<ApiResponse<void>> => {
    return apiClient.delete('/admin/ai/documents', { data: { documentPath } }) as any;
  },

  reEmbedDocuments: async (workspaceSlug?: string): Promise<ApiResponse<void>> => {
    const params = workspaceSlug ? { workspace: workspaceSlug } : {};
    return apiClient.post('/admin/ai/documents/re-embed', null, { params }) as any;
  },

  getAiVersion: async (): Promise<ApiResponse<AiVersionInfo>> => {
    return apiClient.get('/admin/ai/version') as any;
  },
};
