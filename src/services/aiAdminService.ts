import apiClient from './apiClient';
import type { ApiResponse } from '../types/api';
import type {
  AiSystemConfig,
  AiSystemConfigRequest,
  AiCreateWorkspaceRequest,
  AiTestConnection,
  AiWorkspace,
  AiWorkspaceUpdateRequest,
  AiWorkspaceInfo,
  AiDocument,
  AiVersionInfo
} from '../types/ai';

export const aiAdminService = {
  getSystemConfig: async (): Promise<ApiResponse<AiSystemConfig>> => {
    return apiClient.get<any, ApiResponse<AiSystemConfig>>('/ai/config');
  },

  updateSystemConfig: async (data: AiSystemConfigRequest): Promise<ApiResponse<AiSystemConfig>> => {
    return apiClient.put<any, ApiResponse<AiSystemConfig>>('/ai/config', data);
  },

  getProviders: async (): Promise<ApiResponse<string[]>> => {
    return apiClient.get<any, ApiResponse<string[]>>('/ai/providers');
  },

  testConnection: async (): Promise<ApiResponse<AiTestConnection>> => {
    return apiClient.post<any, ApiResponse<AiTestConnection>>('/ai/test');
  },

  getWorkspace: async (slug?: string): Promise<ApiResponse<AiWorkspace>> => {
    const params = slug ? { slug } : {};
    return apiClient.get<any, ApiResponse<AiWorkspace>>('/ai/workspace', { params });
  },

  updateWorkspace: async (data: AiWorkspaceUpdateRequest, slug?: string): Promise<ApiResponse<AiWorkspace>> => {
    const params = slug ? { slug } : {};
    return apiClient.put<any, ApiResponse<AiWorkspace>>('/ai/workspace', data, { params });
  },

  getWorkspaces: async (): Promise<ApiResponse<AiWorkspaceInfo[]>> => {
    return apiClient.get<any, ApiResponse<AiWorkspaceInfo[]>>('/ai/workspaces');
  },

  createWorkspace: async (data: AiCreateWorkspaceRequest): Promise<ApiResponse<void>> => {
    return apiClient.post<any, ApiResponse<void>>('/ai/workspace', data);
  },

  deleteWorkspace: async (slug: string): Promise<ApiResponse<void>> => {
    return apiClient.delete<any, ApiResponse<void>>(`/ai/workspace/${slug}`);
  },

  getProviderModels: async (provider: string, basePath?: string, apiKey?: string): Promise<ApiResponse<string[]>> => {
    return apiClient.post<any, ApiResponse<string[]>>(`/ai/providers/${provider}/models`, { basePath, apiKey });
  },

  getDocuments: async (workspaceSlug?: string): Promise<ApiResponse<AiDocument[]>> => {
    const params = workspaceSlug ? { workspace: workspaceSlug } : {};
    return apiClient.get<any, ApiResponse<AiDocument[]>>('/ai/documents', { params });
  },

  uploadDocument: async (file: File, workspaceSlug?: string): Promise<ApiResponse<void>> => {
    const formData = new FormData();
    formData.append('file', file);
    const params = workspaceSlug ? { workspace: workspaceSlug } : {};
    return apiClient.post<any, ApiResponse<void>>('/ai/documents', formData, {
      params,
      headers: { 'Content-Type': undefined as unknown as string },
      timeout: 120000,
    });
  },

  getDocumentContent: async (workspace: string, filename: string): Promise<ApiResponse<string>> => {
    return apiClient.get<any, ApiResponse<string>>('/ai/documents/content', { params: { workspace, filename } });
  },

  deleteDocument: async (documentPath: string): Promise<ApiResponse<void>> => {
    return apiClient.delete<any, ApiResponse<void>>('/ai/documents', { data: { documentPath } });
  },

  reEmbedDocuments: async (workspaceSlug?: string): Promise<ApiResponse<void>> => {
    const params = workspaceSlug ? { workspace: workspaceSlug } : {};
    return apiClient.post<any, ApiResponse<void>>('/ai/documents/re-embed', null, { params });
  },

  getAiVersion: async (): Promise<ApiResponse<AiVersionInfo>> => {
    return apiClient.get<any, ApiResponse<AiVersionInfo>>('/ai/version');
  },
};
