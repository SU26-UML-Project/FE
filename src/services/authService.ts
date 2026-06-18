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
  status?: string;
  role: string | {
    id: string;
    roleName: string;
    description: string;
  };
}

export const authService = {
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
};
