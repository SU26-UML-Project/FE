import apiClient from './apiClient';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ApiResponse<T> {
  code: number;
  message: string;
  result: T;
}

export interface LoginResponse {
  token: string;
  authenticated: boolean;
  refreshToken: string;
}

export interface RegisterRequest {
  password: string;
  fullName: string;
  email: string;
  phone?: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface VerifyOtpRequest {
  email: string;
  otpCode: string;
}

export interface ResetPasswordRequest {
  email: string;
  otpCode: string;
  newPassword: string;
  confirmPassword: string;
}

export interface User {
  id: string;
  username?: string;
  fullName?: string;
  email: string;
  phone?: string;
  dob?: string;          // ISO date (yyyy-MM-dd)
  avatarUrl?: string;
  status?: string;       // ACTIVE | LOCKED | PENDING_DELETE
  createdAt?: string;
  profileCompleted?: boolean; // false for Google users who haven't finished onboarding
  role: string | {
    id: string;
    roleName: string;
    description: string;
  };
}

export interface CompleteProfileRequest {
  fullName: string;
  phone: string;
  dob: string;           // yyyy-MM-dd
  password: string;
  confirmPassword: string;
}

export interface UpdateProfileRequest {
  fullName?: string;
  phone?: string;
  dob?: string;          // yyyy-MM-dd
  avatarUrl?: string;    // public URL trả về từ POST /files/avatar
}

export interface DeleteAccountResponse {
  status: string;
  deletionDate?: string;
  daysRemaining?: number;
  message: string;
}

export interface ChangePasswordInitRequest {
  currentPassword: string;
}

export interface ChangePasswordConfirmRequest {
  otpCode: string;
  newPassword: string;
  confirmPassword: string;
}

export interface AdminUserListItem {
  id: string;
  username?: string;
  fullName?: string;
  email: string;
  phone?: string;
  dob?: string;
  avatarUrl?: string;
  status?: string;       // ACTIVE | LOCKED | PENDING_DELETE
  createdAt?: string;
  profileCompleted?: boolean;
  role: string | {
    id: string;
    roleName: string;
    description: string;
  };
}

export const authService = {
  //ADMIN: Danh sách tất cả users
  getAllUsers: async (): Promise<ApiResponse<AdminUserListItem[]>> => {
    return apiClient.get('/users');
  },

  //ADMIN: Lấy chi tiết 1 user theo UUID
  getUserById: async (userId: string): Promise<ApiResponse<AdminUserListItem>> => {
    return apiClient.get(`/users/${userId}`);
  },

  //ADMIN: Tạo tài khoản Admin mới
  registerAdmin: async (data: RegisterRequest): Promise<ApiResponse<User>> => {
    return apiClient.post('/admin/register', data);
  },

  //ADMIN: Khóa hoặc mở khóa tài khoản user
  toggleUserStatus: async (userId: string): Promise<ApiResponse<void>> => {
    return apiClient.delete(`/admin/${userId}`);
  },


  login: async (data: LoginRequest): Promise<ApiResponse<LoginResponse>> => {
    return apiClient.post('/auth/login', data);
  },

  register: async (data: RegisterRequest): Promise<ApiResponse<User>> => {
    return apiClient.post('/users/register', data);
  },

  logout: async (token?: string): Promise<ApiResponse<void>> => {
    return apiClient.post('/auth/logout', token ? { token } : {});
  },

  getCurrentUser: async (): Promise<ApiResponse<User>> => {
    return apiClient.get('/users/me');
  },

  // Full profile page (fullName, phone, dob, avatar, status, createdAt, ...)
  getProfile: async (): Promise<ApiResponse<User>> => {
    return apiClient.get('/users/me/profile');
  },

  updateProfile: async (data: UpdateProfileRequest): Promise<ApiResponse<User>> => {
    return apiClient.patch('/users/me', data);
  },

  // First-time onboarding for Google users (personal info + self-chosen password)
  completeProfile: async (data: CompleteProfileRequest): Promise<ApiResponse<User>> => {
    return apiClient.patch('/users/complete-profile', data);
  },

  requestDeleteAccount: async (): Promise<ApiResponse<DeleteAccountResponse>> => {
    return apiClient.post('/users/me/deactivate-request');
  },

  restoreAccount: async (): Promise<ApiResponse<DeleteAccountResponse>> => {
    return apiClient.post('/users/me/restore');
  },

  refresh: async (): Promise<ApiResponse<LoginResponse>> => {
    return apiClient.post('/auth/refresh');
  },

  // Forgot-password flow: request OTP -> verify OTP -> reset password
  forgotPassword: async (data: ForgotPasswordRequest): Promise<ApiResponse<string>> => {
    return apiClient.post('/users/forgot-password', data);
  },

  verifyOtp: async (data: VerifyOtpRequest): Promise<ApiResponse<string>> => {
    return apiClient.post('/users/verify-otp', data);
  },

  resetPassword: async (data: ResetPasswordRequest): Promise<ApiResponse<string>> => {
    return apiClient.post('/users/reset-password', data);
  },

  // In-app change-password flow (authenticated): verify current password -> OTP -> set new password
  initChangePassword: async (data: ChangePasswordInitRequest): Promise<ApiResponse<string>> => {
    return apiClient.post('/users/me/change-password/init', data);
  },

  confirmChangePassword: async (data: ChangePasswordConfirmRequest): Promise<ApiResponse<string>> => {
    return apiClient.post('/users/me/change-password/confirm', data);
  },
};
