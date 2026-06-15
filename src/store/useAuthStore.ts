import { create } from 'zustand';
import { authService } from '../services/authService';

interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: {
    roleName: string;
    description: string;
  };
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  setAuth: (user: User | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  setAuth: (user) => set({ 
    user, 
    isAuthenticated: !!user 
  }),
  logout: async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Manually clear cookies if backend Set-Cookie fails due to browser restrictions
      document.cookie = "access_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=None; Secure";
      document.cookie = "refresh_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=None; Secure";
      document.cookie = "JSESSIONID=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=None; Secure";
      
      set({ 
        user: null, 
        isAuthenticated: false 
      });
    }
  },
}));
