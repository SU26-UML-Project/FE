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
};
