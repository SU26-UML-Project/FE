import apiClient from './apiClient';
import type { ApiResponse } from './authService';

export interface FileUploadResult {
  bucket: string;
  path: string;
  url?: string; // public URL — chỉ có với bucket public (avatars)
}

export const fileService = {
  /**
   * Upload ảnh đại diện lên bucket public `avatars`, trả về public URL.
   * Không set Content-Type thủ công để trình duyệt tự thêm boundary cho multipart.
   */
  uploadAvatar: async (file: File): Promise<ApiResponse<FileUploadResult>> => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/files/avatar', formData, {
      headers: { 'Content-Type': undefined as unknown as string },
    });
  },
};
