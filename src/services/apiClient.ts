import axios from 'axios';
import { setAuthCookie, clearAuthCookies, COOKIE_KEYS } from '../utils/auth';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
  timeout: 420000, // 7 minutes
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Paths that should not trigger automatic token refresh on 401
const SKIP_REFRESH_PATHS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

// Response interceptor to handle the standard envelope: { code, message, result }
apiClient.interceptors.response.use(
  (response) => {
    const { code, message, result } = response.data;
    
    // Backend returns 200 even for business errors, but code field tells the truth
    if (code !== 200 && code !== 0) {
      return Promise.reject({
        code,
        message: message || 'Đã có lỗi xảy ra',
        result
      });
    }
    
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;
    const isSkipPath = SKIP_REFRESH_PATHS.some(path => originalRequest.url?.includes(path));

    // Handle 401 Unauthenticated and avoid infinite loops
    if (error.response?.status === 401 && !originalRequest._retry && !isSkipPath) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Import authService dynamically to avoid circular dependency
        const { authService } = await import('./authService');
        const response = await authService.refresh();
        
        const { token } = response.result;
        if (token) {
          setAuthCookie(COOKIE_KEYS.ACCESS_TOKEN, token);
        }

        processQueue(null, token);
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearAuthCookies();
        // Don't use window.location.href here as it causes infinite F5 loops
        // The application state (Zustand) and ProtectedRoutes will handle redirection
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Handle other HTTP errors or skipped paths
    const apiError = {
      code: error.response?.data?.code || 500,
      message: error.response?.data?.message || error.message || 'Lỗi kết nối server',
    };
    return Promise.reject(apiError);
  }
);

export default apiClient;
