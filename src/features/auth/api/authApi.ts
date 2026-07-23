import apiClient from '../../../shared/api/apiClient';
import type { ApiResponse, Page } from '../../../types/api';
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  User,
  UpdateProfileRequest,
  CompleteProfileRequest,
  DeleteAccountResponse,
  ForgotPasswordRequest,
  VerifyOtpRequest,
  ResetPasswordRequest,
  ChangePasswordInitRequest,
  ChangePasswordConfirmRequest,
  AdminUserListItem
} from '../types';

export const authService = {
  //ADMIN: Danh sách tất cả users (phân trang + sort)
  getAllUsers: async (params?: {
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<ApiResponse<Page<AdminUserListItem>>> => {
    return apiClient.get<any, ApiResponse<Page<AdminUserListItem>>>('/users', { params });
  },

  //ADMIN: Lấy chi tiết 1 user theo UUID
  getUserById: async (userId: string): Promise<ApiResponse<AdminUserListItem>> => {
    return apiClient.get<any, ApiResponse<AdminUserListItem>>(`/users/${userId}`);
  },

  //ADMIN: Tạo tài khoản Admin mới
  registerAdmin: async (data: RegisterRequest): Promise<ApiResponse<User>> => {
    return apiClient.post<any, ApiResponse<User>>('/users/admin/register', data);
  },

  //ADMIN: Khóa hoặc mở khóa tài khoản user
  toggleUserStatus: async (userId: string): Promise<ApiResponse<void>> => {
    return apiClient.delete<any, ApiResponse<void>>(`/users/admin/${userId}`);
  },

  //ADMIN: Cập nhật user (họ tên / SĐT / ngày sinh / avatar / vai trò / trạng thái). Chỉ gửi field cần đổi.
  adminUpdateUser: async (
    userId: string,
    data: {
      fullName?: string;
      phone?: string;
      dob?: string;
      avatarUrl?: string;
      roleName?: 'USER' | 'ADMIN';
      status?: 'ACTIVE' | 'LOCKED';
    }
  ): Promise<ApiResponse<AdminUserListItem>> => {
    return apiClient.patch<any, ApiResponse<AdminUserListItem>>(`/users/admin/${userId}`, data);
  },

  //ADMIN: Đặt lại mật khẩu cho user (không OTP, thu hồi phiên cũ)
  adminSetPassword: async (userId: string, newPassword: string): Promise<ApiResponse<void>> => {
    return apiClient.post<any, ApiResponse<void>>(`/users/admin/${userId}/password`, { newPassword });
  },

  //ADMIN: Upload/đổi avatar cho user (multipart) — BE lưu vào bucket avatars + cập nhật avatar_url
  adminUploadAvatar: async (userId: string, file: File): Promise<ApiResponse<AdminUserListItem>> => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post<any, ApiResponse<AdminUserListItem>>(`/users/admin/${userId}/avatar`, formData, {
      headers: { 'Content-Type': undefined as unknown as string },
    });
  },

  //ADMIN: Soft-delete (chuyển PENDING_DELETE, ân hạn 30 ngày)
  adminSoftDeleteUser: async (userId: string): Promise<ApiResponse<AdminUserListItem>> => {
    return apiClient.post<any, ApiResponse<AdminUserListItem>>(`/users/admin/${userId}/soft-delete`);
  },

  //ADMIN: Khôi phục tài khoản đang chờ xoá
  adminRestoreUser: async (userId: string): Promise<ApiResponse<AdminUserListItem>> => {
    return apiClient.post<any, ApiResponse<AdminUserListItem>>(`/users/admin/${userId}/restore`);
  },


  login: async (data: LoginRequest): Promise<ApiResponse<LoginResponse>> => {
    return apiClient.post<any, ApiResponse<LoginResponse>>('/auth/login', data);
  },

  register: async (data: RegisterRequest): Promise<ApiResponse<User>> => {
    return apiClient.post<any, ApiResponse<User>>('/users/register', data);
  },

  logout: async (token?: string): Promise<ApiResponse<void>> => {
    return apiClient.post<any, ApiResponse<void>>('/auth/logout', token ? { token } : {});
  },

  getCurrentUser: async (): Promise<ApiResponse<User>> => {
    return apiClient.get<any, ApiResponse<User>>('/users/me');
  },

  // Full profile page (fullName, phone, dob, avatar, status, createdAt, ...)
  getProfile: async (): Promise<ApiResponse<User>> => {
    return apiClient.get<any, ApiResponse<User>>('/users/me/profile');
  },

  updateProfile: async (data: UpdateProfileRequest): Promise<ApiResponse<User>> => {
    return apiClient.patch<any, ApiResponse<User>>('/users/me', data);
  },

  // First-time onboarding for Google users (personal info + self-chosen password)
  completeProfile: async (data: CompleteProfileRequest): Promise<ApiResponse<User>> => {
    return apiClient.patch<any, ApiResponse<User>>('/users/complete-profile', data);
  },

  requestDeleteAccount: async (): Promise<ApiResponse<DeleteAccountResponse>> => {
    return apiClient.post<any, ApiResponse<DeleteAccountResponse>>('/users/me/deactivate-request');
  },

  restoreAccount: async (): Promise<ApiResponse<DeleteAccountResponse>> => {
    return apiClient.post<any, ApiResponse<DeleteAccountResponse>>('/users/me/restore');
  },

  refresh: async (): Promise<ApiResponse<LoginResponse>> => {
    return apiClient.post<any, ApiResponse<LoginResponse>>('/auth/refresh');
  },

  // Forgot-password flow: request OTP -> verify OTP -> reset password
  forgotPassword: async (data: ForgotPasswordRequest): Promise<ApiResponse<string>> => {
    return apiClient.post<any, ApiResponse<string>>('/users/forgot-password', data);
  },

  verifyOtp: async (data: VerifyOtpRequest): Promise<ApiResponse<string>> => {
    return apiClient.post<any, ApiResponse<string>>('/users/verify-otp', data);
  },

  resetPassword: async (data: ResetPasswordRequest): Promise<ApiResponse<string>> => {
    return apiClient.post<any, ApiResponse<string>>('/users/reset-password', data);
  },

  // In-app change-password flow (authenticated): verify current password -> OTP -> set new password
  initChangePassword: async (data: ChangePasswordInitRequest): Promise<ApiResponse<string>> => {
    return apiClient.post<any, ApiResponse<string>>('/users/me/change-password/init', data);
  },

  confirmChangePassword: async (data: ChangePasswordConfirmRequest): Promise<ApiResponse<string>> => {
    return apiClient.post<any, ApiResponse<string>>('/users/me/change-password/confirm', data);
  },
};
