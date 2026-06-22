import apiClient from './apiClient';
import type { ApiResponse } from '../types/api';
import type {
  AiSystemConfig,
  AiSystemConfigRequest,
  AiTestConnection,
  AiWorkspace,
  AiWorkspaceUpdateRequest,
  AiWorkspaceInfo,
  AiDocument,
  AiVersionInfo
} from '../types/ai';

export const aiAdminService = {
  getSystemConfig: async (): Promise<ApiResponse<AiSystemConfig>> => {
    return apiClient.get<any, ApiResponse<AiSystemConfig>>('/admin/ai/config');
  },

  updateSystemConfig: async (data: AiSystemConfigRequest): Promise<ApiResponse<AiSystemConfig>> => {
    return apiClient.put<any, ApiResponse<AiSystemConfig>>('/admin/ai/config', data);
  },

  getProviders: async (): Promise<ApiResponse<string[]>> => {
    return apiClient.get<any, ApiResponse<string[]>>('/admin/ai/providers');
  },

  testConnection: async (): Promise<ApiResponse<AiTestConnection>> => {
    return apiClient.post<any, ApiResponse<AiTestConnection>>('/admin/ai/test');
  },

  getWorkspace: async (slug?: string): Promise<ApiResponse<AiWorkspace>> => {
    const params = slug ? { slug } : {};
    return apiClient.get<any, ApiResponse<AiWorkspace>>('/admin/ai/workspace', { params });
  },

  updateWorkspace: async (data: AiWorkspaceUpdateRequest, slug?: string): Promise<ApiResponse<AiWorkspace>> => {
    const params = slug ? { slug } : {};
    return apiClient.put<any, ApiResponse<AiWorkspace>>('/admin/ai/workspace', data, { params });
  },

  getWorkspaces: async (): Promise<ApiResponse<AiWorkspaceInfo[]>> => {
    return apiClient.get<any, ApiResponse<AiWorkspaceInfo[]>>('/admin/ai/workspaces');
  },

  getProviderModels: async (provider: string, basePath?: string): Promise<ApiResponse<string[]>> => {
    const params: any = {};
    if (basePath) params.basePath = basePath;
    return apiClient.get<any, ApiResponse<string[]>>(`/admin/ai/providers/${provider}/models`, { params });
  },

  getDocuments: async (workspaceSlug?: string): Promise<ApiResponse<AiDocument[]>> => {
    const params = workspaceSlug ? { workspace: workspaceSlug } : {};
    return apiClient.get<any, ApiResponse<AiDocument[]>>('/admin/ai/documents', { params });
  },

  uploadDocument: async (file: File, workspaceSlug?: string): Promise<ApiResponse<void>> => {
    const formData = new FormData();
    formData.append('file', file);
    const params = workspaceSlug ? { workspace: workspaceSlug } : {};
    return apiClient.post<any, ApiResponse<void>>('/admin/ai/documents', formData, {
      params,
      headers: { 'Content-Type': undefined as unknown as string },
      timeout: 120000,
    });
  },

  deleteDocument: async (documentPath: string): Promise<ApiResponse<void>> => {
    return apiClient.delete<any, ApiResponse<void>>('/admin/ai/documents', { data: { documentPath } });
  },

  reEmbedDocuments: async (workspaceSlug?: string): Promise<ApiResponse<void>> => {
    const params = workspaceSlug ? { workspace: workspaceSlug } : {};
    return apiClient.post<any, ApiResponse<void>>('/admin/ai/documents/re-embed', null, { params });
  },

  getAiVersion: async (): Promise<ApiResponse<AiVersionInfo>> => {
    return apiClient.get<any, ApiResponse<AiVersionInfo>>('/admin/ai/version');
  },
};
