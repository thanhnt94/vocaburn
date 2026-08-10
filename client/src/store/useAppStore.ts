import { create } from 'zustand'
import axios from 'axios'

// Set default credentials handling so cookies are automatically sent/received
axios.defaults.withCredentials = true;

export interface UserSettings {
  theme: string
  focus_timer_active: boolean
  sfx_enabled: boolean
  haptic_enabled: boolean
  autoplay_audio: string
  quick_learn_enabled: boolean
  random_enabled: boolean
  show_images: string
  show_fsrs: boolean
  quiz_learning_mode: string
  practice_submode: string
  practice_range: string
  score_mode: string
  time_mode: string
  last_deck_id?: number | null
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  theme: 'light',
  focus_timer_active: true,
  sfx_enabled: true,
  haptic_enabled: true,
  autoplay_audio: 'never',
  quick_learn_enabled: false,
  random_enabled: false,
  show_images: 'always',
  show_fsrs: true,
  quiz_learning_mode: 'fsrs',
  practice_submode: 'mcq',
  practice_range: 'all',
  score_mode: 'all',
  time_mode: 'card',
  last_deck_id: null,
}

interface User {
  id: number;
  username: string;
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
      await axios.patch('/api/v1/user/settings', partialSettings)
    } catch (e) {
      console.error("Failed to persist user settings to DB", e)
    }
  },

  setGamify: (gamify) => set({ gamify }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  addXp: (amount) => set((state) => ({ gamify: { ...state.gamify, xp: state.gamify.xp + amount } })),

  fetchAuthConfig: async () => {
    try {
      const res = await axios.get('/api/v1/auth/config')
      set({ authConfig: res.data })
    } catch (e) {
      console.error("Failed to fetch auth configuration", e)
    }
  },

  fetchMe: async () => {
    try {
      const res = await axios.get('/api/v1/auth/me')
      if (res.data && res.data.user) {
        const u = res.data.user
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
      const res = await axios.post('/api/v1/auth/login', credentials)
      if (res.data.status === 'success') {
        const u = res.data.user
        const fetchedSettings = u.settings || {}
        set({ 
          user: u, 
          userSettings: { ...DEFAULT_USER_SETTINGS, ...fetchedSettings },
          isLoggedIn: true 
        })
        return { success: true }
      } else {
        return { success: false, error: res.data.message || 'Login failed' }
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
