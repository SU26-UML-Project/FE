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
  username: string;
  password: string;
  fullName: string;
  email: string;
  phone: string;
  roleId: string;
}

export const authService = {
  login: async (data: LoginRequest): Promise<ApiResponse<LoginResponse>> => {
    return apiClient.post('/auth/login', data);
  },

  register: async (data: RegisterRequest): Promise<ApiResponse<any>> => {
    return apiClient.post('/users/register', data);
  },

  logout: async (token: string): Promise<ApiResponse<void>> => {
    return apiClient.post('/auth/logout', { token });
  },

  // Note: We might need a separate API call to get user info after login
  // if /auth/login only returns the token.
};
