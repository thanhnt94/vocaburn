import { create } from 'zustand'
import { authApi } from '@/lib/api/authApi'
import { DEFAULT_USER_SETTINGS, type UserSettings } from './useSettingsStore'
export { DEFAULT_USER_SETTINGS }
export type { UserSettings }

interface User {
  id: number;
  username: string;
  full_name?: string;
  email?: string;
  role: string;
  settings?: UserSettings;
}

interface Gamify {
  level: number;
  xp: number;
  streak: number;
  streak_points?: number;
  streak_freeze_count?: number;
}

interface AuthConfig {
  auth_provider: string;
  sso_enabled: boolean;
  jump_url?: string | null;
}

interface AppState {
  user: User | null;
  userSettings: UserSettings;
  gamify: Gamify;
  isSidebarOpen: boolean;
  authConfig: AuthConfig | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  
  // Actions
  setUser: (user: User | null) => void;
  setUserSettings: (settings: Partial<UserSettings>) => void;
  updateUserSettings: (partialSettings: Partial<UserSettings>) => Promise<void>;
  setGamify: (gamify: Gamify) => void;
  toggleSidebar: () => void;
  fetchAuthConfig: () => Promise<void>;
  fetchMe: () => Promise<void>;
  login: (credentials: any) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  addXp: (amount: number) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  userSettings: DEFAULT_USER_SETTINGS,
  gamify: { level: 1, xp: 0, streak: 0 },
  isSidebarOpen: false,
  authConfig: null,
  isLoggedIn: false,
  isLoading: true,

  setUser: (user) => set({ user, isLoggedIn: !!user }),
  setUserSettings: (settings) => set((state) => ({ userSettings: { ...state.userSettings, ...settings } })),
  
  updateUserSettings: async (partialSettings) => {
    set((state) => ({
      userSettings: { ...state.userSettings, ...partialSettings }
    }))
    try {
      await authApi.updateUserSettings(partialSettings)
    } catch (e) {
      console.error("Failed to persist user settings to DB", e)
    }
  },

  setGamify: (gamify) => set({ gamify }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  addXp: (amount) => set((state) => ({ gamify: { ...state.gamify, xp: state.gamify.xp + amount } })),

  fetchAuthConfig: async () => {
    try {
      const data = await authApi.getConfig()
      set({ authConfig: data })
    } catch (e) {
      console.error("Failed to fetch auth configuration", e)
    }
  },

  fetchMe: async () => {
    try {
      const data = await authApi.getMe()
      if (data && data.user) {
        const u = data.user
        const fetchedSettings = u.settings || {}
        set({ 
          user: u, 
          userSettings: { ...DEFAULT_USER_SETTINGS, ...fetchedSettings },
          isLoggedIn: true, 
          isLoading: false 
        })
      } else {
        set({ user: null, userSettings: DEFAULT_USER_SETTINGS, isLoggedIn: false, isLoading: false })
      }
    } catch (e) {
      console.error("Failed to fetch user state", e)
      set({ user: null, userSettings: DEFAULT_USER_SETTINGS, isLoggedIn: false, isLoading: false })
    }
  },

  login: async (credentials) => {
    try {
      const res = await authApi.login(credentials)
      if (res.status === 'success') {
        const u = res.user
        const fetchedSettings = u.settings || {}
        set({ 
          user: u, 
          userSettings: { ...DEFAULT_USER_SETTINGS, ...fetchedSettings },
          isLoggedIn: true 
        })
        return { success: true }
      } else {
        return { success: false, error: res.message || 'Login failed' }
      }
    } catch (e: any) {
      console.error("Login request failed", e)
      return { success: false, error: e.response?.data?.detail || 'Network or server error' }
    }
  },

  logout: async () => {
    window.location.href = '/logout'
  }
}))
