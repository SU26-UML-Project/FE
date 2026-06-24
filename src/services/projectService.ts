import apiClient from './apiClient';
import type { ApiResponse } from '../types/api';
import type { ProjectRequest, ProjectResponse } from '../types/project';

export const projectService = {
  getAllProjects: async (params?: { isDraft?: boolean }): Promise<ApiResponse<ProjectResponse[]>> => {
    const query = params?.isDraft !== undefined ? `?isDraft=${params.isDraft}` : '';
    return apiClient.get<any, ApiResponse<ProjectResponse[]>>(`/projects${query}`);
  },

  getAllProjectsForAdmin: async (): Promise<ApiResponse<ProjectResponse[]>> => {
    return apiClient.get<any, ApiResponse<ProjectResponse[]>>('/projects/admin/all');
  },

  createProject: async (data: ProjectRequest): Promise<ApiResponse<ProjectResponse>> => {
    return apiClient.post<any, ApiResponse<ProjectResponse>>('/projects', data);
  },

  getProjectById: async (projectId: string): Promise<ApiResponse<ProjectResponse>> => {
    return apiClient.get<any, ApiResponse<ProjectResponse>>(`/projects/${projectId}`);
  },

  updateProject: async (projectId: string, data: ProjectRequest): Promise<ApiResponse<ProjectResponse>> => {
    return apiClient.patch<any, ApiResponse<ProjectResponse>>(`/projects/${projectId}`, data);
  },

  deleteProjects: async (ids: string[]): Promise<ApiResponse<void>> => {
    return apiClient.delete<any, ApiResponse<void>>('/projects', { data: { ids } });
  },
};
