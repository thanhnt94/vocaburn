import { create } from 'zustand'
import { authApi } from '@/lib/api/authApi'

export interface User {
  id: number;
  username: string;
  full_name?: string;
  email?: string;
  role: string;
  settings?: any;
}

export interface AuthConfig {
  auth_provider: string;
  sso_enabled: boolean;
  jump_url?: string | null;
}

interface AuthState {
  user: User | null;
  authConfig: AuthConfig | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  
  // Actions
  setUser: (user: User | null) => void;
  fetchAuthConfig: () => Promise<void>;
  fetchMe: () => Promise<void>;
  login: (credentials: any) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  authConfig: null,
  isLoggedIn: false,
  isLoading: true,

  setUser: (user) => set({ user, isLoggedIn: !!user }),

  fetchAuthConfig: async () => {
    try {
      const data = await authApi.getConfig()
      set({ authConfig: data })
    } catch (e) {
      console.error('Failed to fetch auth configuration', e)
    }
  },

  fetchMe: async () => {
    try {
      const data = await authApi.getMe()
      if (data && data.user) {
        set({
          user: data.user,
          isLoggedIn: true,
          isLoading: false
        })
      } else {
        set({ user: null, isLoggedIn: false, isLoading: false })
      }
    } catch (e) {
      console.error('Failed to fetch user state', e)
      set({ user: null, isLoggedIn: false, isLoading: false })
    }
  },

  login: async (credentials) => {
    try {
      const res = await authApi.login(credentials)
      if (res.status === 'success') {
        set({
          user: res.user,
          isLoggedIn: true
        })
        return { success: true }
      } else {
        return { success: false, error: res.message || 'Login failed' }
      }
    } catch (e: any) {
      console.error('Login request failed', e)
      return { success: false, error: e.response?.data?.detail || 'Network or server error' }
    }
  },

  logout: async () => {
    window.location.href = '/logout'
  }
}))
