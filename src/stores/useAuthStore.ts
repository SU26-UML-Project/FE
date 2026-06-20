import { create } from 'zustand';
import { authService, User } from '../services/authService';
import { clearAuthCookies, getAuthCookie, COOKIE_KEYS } from '../utils/auth';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  setAuth: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  loading: !!getAuthCookie(COOKIE_KEYS.ACCESS_TOKEN),
  setAuth: (user) => set({ 
    user, 
    isAuthenticated: !!user,
    loading: false
  }),
  setLoading: (loading) => set({ loading }),
  logout: async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Use central utility to clear all auth related cookies
      clearAuthCookies();
      
      set({ 
        user: null, 
        isAuthenticated: false,
        loading: false
      });
    }
  },
  checkAuth: async () => {
    const hasToken = !!getAuthCookie(COOKIE_KEYS.ACCESS_TOKEN);
    if (!hasToken) {
      set({ user: null, isAuthenticated: false, loading: false });
      return;
    }

    set({ loading: true });
    try {
      const response = await authService.getCurrentUser();
      if (response.code === 200 || response.code === 0) {
        set({ 
          user: response.result, 
          isAuthenticated: true,
          loading: false 
        });
      } else {
        set({ user: null, isAuthenticated: false, loading: false });
      }
    } catch (error) {
      set({ user: null, isAuthenticated: false, loading: false });
    }
  },
}));
