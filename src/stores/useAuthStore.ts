import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService } from '../services/authService';
import type { User } from '../types/auth';
import { clearAuthCookies, getAuthCookie, COOKIE_KEYS } from '../utils/auth';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  isChecking: boolean;
  setAuth: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
  checkAuth: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  isAuthenticated: false,
  loading: true, // Bắt đầu bằng true để chờ checkAuth
  isChecking: false,
  setAuth: (user) => set({ 
    user, 
    isAuthenticated: !!user,
    loading: false,
    isChecking: false
  }),
  setLoading: (loading) => set({ loading }),
  logout: async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearAuthCookies();
      set({ 
        user: null, 
        isAuthenticated: false,
        loading: false,
        isChecking: false
      });
    }
  },
  checkAuth: async () => {
    const { isChecking } = get();
    
    // Nếu đang check thì không check lại
    if (isChecking) return;

    set({ isChecking: true, loading: true });

    try {
      // Gọi API /me để kiểm tra session từ cookie
      const response = await authService.getCurrentUser();
      if (response.code === 200 || response.code === 0) {
        set({ 
          user: response.result, 
          isAuthenticated: true,
          loading: false,
          isChecking: false
        });
      } else {
        set({ user: null, isAuthenticated: false, loading: false, isChecking: false });
      }
    } catch (error) {
      console.error('CheckAuth Error:', error);
      set({ user: null, isAuthenticated: false, loading: false, isChecking: false });
    }
  },
  // Refresh im lặng: cập nhật lại user từ /me mà KHÔNG bật loading (tránh nháy màn hình).
  // Dùng để đồng bộ gói hiệu lực (planName) khi gói hết hạn hoặc sau khi hủy/hoàn tác.
  refreshUser: async () => {
    if (!get().isAuthenticated) return;
    try {
      const response = await authService.getCurrentUser();
      if (response.code === 200 || response.code === 0) {
        set({ user: response.result, isAuthenticated: true });
      }
    } catch (error) {
      console.error('RefreshUser Error:', error);
    }
  },
}));
