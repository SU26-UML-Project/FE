import apiClient from './apiClient';
import type { ApiResponse } from '../types/api';
import type { WorkspaceSheet } from '../types/workspace';

export interface SheetRequest {
  projectId: string;
  name: string;
  diagramType?: string;
  diagramData?: string;
}

export const sheetService = {
  getSheetsByProject: async (projectId: string): Promise<ApiResponse<WorkspaceSheet[]>> => {
    return apiClient.get<any, ApiResponse<WorkspaceSheet[]>>(`/sheets/project/${projectId}`);
  },

  createSheet: async (data: SheetRequest): Promise<ApiResponse<WorkspaceSheet>> => {
    return apiClient.post<any, ApiResponse<WorkspaceSheet>>('/sheets', data);
  },

  updateSheet: async (sheetId: string, data: Partial<SheetRequest>): Promise<ApiResponse<WorkspaceSheet>> => {
    return apiClient.patch<any, ApiResponse<WorkspaceSheet>>(`/sheets/${sheetId}`, data);
  },

  deleteSheet: async (sheetId: string): Promise<ApiResponse<void>> => {
    return apiClient.delete<any, ApiResponse<void>>(`/sheets/${sheetId}`);
  },
};
