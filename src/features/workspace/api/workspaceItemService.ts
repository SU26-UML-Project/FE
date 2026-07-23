import apiClient from '../../../shared/api/apiClient'
import type { ApiResponse } from '../../../types/api'
import type {
  WorkspaceItemCreateRequest,
  WorkspaceItemDuplicateRequest,
  WorkspaceItemMoveRequest,
  WorkspaceItemResponse,
  WorkspaceItemUpdateRequest,
} from '../types'

export const workspaceItemService = {
  list: async (projectId: string): Promise<ApiResponse<WorkspaceItemResponse[]>> => {
    return apiClient.get<any, ApiResponse<WorkspaceItemResponse[]>>(`/projects/${projectId}/workspace-items`)
  },

  create: async (projectId: string, data: WorkspaceItemCreateRequest): Promise<ApiResponse<WorkspaceItemResponse>> => {
    return apiClient.post<any, ApiResponse<WorkspaceItemResponse>>(`/projects/${projectId}/workspace-items`, data)
  },

  update: async (itemId: string, data: WorkspaceItemUpdateRequest): Promise<ApiResponse<WorkspaceItemResponse>> => {
    return apiClient.patch<any, ApiResponse<WorkspaceItemResponse>>(`/workspace-items/${itemId}`, data)
  },

  move: async (itemId: string, data: WorkspaceItemMoveRequest): Promise<ApiResponse<WorkspaceItemResponse>> => {
    return apiClient.patch<any, ApiResponse<WorkspaceItemResponse>>(`/workspace-items/${itemId}/position`, data)
  },

  duplicate: async (itemId: string, data: WorkspaceItemDuplicateRequest): Promise<ApiResponse<WorkspaceItemResponse>> => {
    return apiClient.post<any, ApiResponse<WorkspaceItemResponse>>(`/workspace-items/${itemId}/duplicate`, data)
  },

  remove: async (ids: string[], recursive: boolean): Promise<ApiResponse<void>> => {
    return apiClient.delete<any, ApiResponse<void>>('/workspace-items', { data: { ids, recursive } })
  },
}
