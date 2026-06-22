import apiClient from './apiClient';
import type { ApiResponse } from '../types/api';
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
} from '../types/auth';

export const authService = {
  //ADMIN: Danh sách tất cả users
  getAllUsers: async (): Promise<ApiResponse<AdminUserListItem[]>> => {
    return apiClient.get<any, ApiResponse<AdminUserListItem[]>>('/users');
  },

  //ADMIN: Lấy chi tiết 1 user theo UUID
  getUserById: async (userId: string): Promise<ApiResponse<AdminUserListItem>> => {
    return apiClient.get<any, ApiResponse<AdminUserListItem>>(`/users/${userId}`);
  },

  //ADMIN: Tạo tài khoản Admin mới
  registerAdmin: async (data: RegisterRequest): Promise<ApiResponse<User>> => {
    return apiClient.post<any, ApiResponse<User>>('/admin/register', data);
  },

  //ADMIN: Khóa hoặc mở khóa tài khoản user
  toggleUserStatus: async (userId: string): Promise<ApiResponse<void>> => {
    return apiClient.delete<any, ApiResponse<void>>(`/admin/${userId}`);
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
