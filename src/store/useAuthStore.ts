import { create } from 'zustand';

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
  logout: () => set({ 
    user: null, 
    isAuthenticated: false 
  }),
}));
