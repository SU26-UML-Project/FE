import apiClient from '../shared/api/apiClient';
import type { ApiResponse, PagedResponse } from '../types/api';
import type { OwnerGroup, ProjectRequest, ProjectResponse, ProjectStats } from '../types/project';

export const projectService = {
    getAllProjects: async (
        params?: { isDraft?: boolean; page?: number; size?: number },
    ): Promise<ApiResponse<PagedResponse<ProjectResponse>>> => {
        const search = new URLSearchParams();
        if (params?.isDraft !== undefined) search.set('isDraft', String(params.isDraft));
        if (params?.page !== undefined) search.set('page', String(params.page));
        if (params?.size !== undefined) search.set('size', String(params.size));
        const query = search.toString() ? `?${search.toString()}` : '';
        return apiClient.get<any, ApiResponse<PagedResponse<ProjectResponse>>>(`/projects${query}`);
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

    getTrashProjects: async (
        params?: { page?: number; size?: number },
    ): Promise<ApiResponse<PagedResponse<ProjectResponse>>> => {
        const search = new URLSearchParams();
        if (params?.page !== undefined) search.set('page', String(params.page));
        if (params?.size !== undefined) search.set('size', String(params.size));
        const query = search.toString() ? `?${search.toString()}` : '';
        return apiClient.get<any, ApiResponse<PagedResponse<ProjectResponse>>>(`/projects/trash${query}`);
    },

    getArchivedProjects: async (
        params?: { page?: number; size?: number },
    ): Promise<ApiResponse<PagedResponse<ProjectResponse>>> => {
        const search = new URLSearchParams();
        if (params?.page !== undefined) search.set('page', String(params.page));
        if (params?.size !== undefined) search.set('size', String(params.size));
        const query = search.toString() ? `?${search.toString()}` : '';
        return apiClient.get<any, ApiResponse<PagedResponse<ProjectResponse>>>(`/projects/archived${query}`);
    },

    toggleArchive: async (projectId: string): Promise<ApiResponse<ProjectResponse>> => {
        return apiClient.patch<any, ApiResponse<ProjectResponse>>(`/projects/${projectId}/archive`);
    },

    restoreProject: async (projectId: string): Promise<ApiResponse<ProjectResponse>> => {
        return apiClient.patch<any, ApiResponse<ProjectResponse>>(`/projects/${projectId}/restore`);
    },

    permanentDeleteProject: async (projectId: string): Promise<ApiResponse<void>> => {
        return apiClient.delete<any, ApiResponse<void>>(`/projects/${projectId}/permanent`);
    },

    // Dọn sạch thùng rác — xóa vĩnh viễn toàn bộ dự án đang trong thùng rác của người dùng.
    emptyTrash: async (): Promise<ApiResponse<void>> => {
        return apiClient.delete<any, ApiResponse<void>>('/projects/trash');
    },

    // ─── Admin Projects: 3 nguồn dữ liệu độc lập ────────────────────────────────

    // Thống kê toàn hệ thống (độc lập phân trang)
    getAdminProjectStats: async (): Promise<ApiResponse<ProjectStats>> => {
        return apiClient.get<any, ApiResponse<ProjectStats>>('/projects/admin/stats');
    },

    // Chế độ "Tất cả dự án": danh sách phẳng toàn hệ thống (phân trang)
    getAllProjectsForAdmin: async (
        page = 0,
        size = 12,
    ): Promise<ApiResponse<PagedResponse<ProjectResponse>>> => {
        return apiClient.get<any, ApiResponse<PagedResponse<ProjectResponse>>>(
            `/projects/admin/all?page=${page}&size=${size}`,
        );
    },

    // Phân trang tầng ngoài: danh sách chủ sở hữu + số dự án
    getAdminProjectOwners: async (
        page = 0,
        size = 10,
    ): Promise<ApiResponse<PagedResponse<OwnerGroup>>> => {
        return apiClient.get<any, ApiResponse<PagedResponse<OwnerGroup>>>(
            `/projects/admin/owners?page=${page}&size=${size}`,
        );
    },

    // Phân trang tầng trong: dự án của một chủ sở hữu
    getAdminProjectsByOwner: async (
        ownerId: string,
        page = 0,
        size = 5,
    ): Promise<ApiResponse<PagedResponse<ProjectResponse>>> => {
        return apiClient.get<any, ApiResponse<PagedResponse<ProjectResponse>>>(
            `/projects/admin/by-owner/${ownerId}?page=${page}&size=${size}`,
        );
    },
};
