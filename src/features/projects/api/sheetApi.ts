import apiClient from '../../../shared/api/apiClient';
import type { ApiResponse } from '../../../types/api';

export interface SheetRequest {
  name: string;
  orderIndex: number;
  diagramData: string;
  projectId: string;
}

export interface SheetResponse {
  id: string;
  name: string;
  orderIndex: number;
  diagramData: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

export const sheetService = {
  getSheetsByProject: async (projectId: string): Promise<ApiResponse<SheetResponse[]>> => {
    return apiClient.get<any, ApiResponse<SheetResponse[]>>(`/sheets/project/${projectId}`);
  },

  createSheet: async (data: SheetRequest): Promise<ApiResponse<SheetResponse>> => {
    return apiClient.post<any, ApiResponse<SheetResponse>>('/sheets', data);
  },

  updateSheet: async (sheetId: string, data: Partial<SheetRequest>): Promise<ApiResponse<SheetResponse>> => {
    return apiClient.patch<any, ApiResponse<SheetResponse>>(`/sheets/${sheetId}`, data);
  },

  deleteSheet: async (sheetId: string): Promise<ApiResponse<void>> => {
    return apiClient.delete<any, ApiResponse<void>>(`/sheets/${sheetId}`);
  },
};
