import apiClient from './apiClient';
import type { ApiResponse } from './authService';

export interface ProjectRequest {
  projectName: string;
  description?: string;
  projectData?: string;
}

export interface ProjectResponse {
  id: string;
  projectName: string;
  description?: string;
  projectData?: string;
  createdAt: string;
  updatedAt: string;
}

export const projectService = {
  getAllProjects: async (): Promise<ApiResponse<ProjectResponse[]>> => {
    return apiClient.get('/projects');
  },

  getAllProjectsForAdmin: async (): Promise<ApiResponse<ProjectResponse[]>> => {
    return apiClient.get('/projects/admin/all');
  },

  createProject: async (data: ProjectRequest): Promise<ApiResponse<ProjectResponse>> => {
    return apiClient.post('/projects', data);
  },

  getProjectById: async (projectId: string): Promise<ApiResponse<ProjectResponse>> => {
    return apiClient.get(`/projects/${projectId}`);
  },

  updateProject: async (projectId: string, data: ProjectRequest): Promise<ApiResponse<ProjectResponse>> => {
    return apiClient.patch(`/projects/${projectId}`, data);
  },

  deleteProjects: async (ids: string[]): Promise<ApiResponse<void>> => {
    return apiClient.delete('/projects', { data: { ids } });
  },
};
