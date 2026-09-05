import { create } from 'zustand'
import { authApi } from '@/lib/api/authApi'

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
  paste_columns?: string[]
  quick_add_columns?: string[]
  card_flip_trigger?: 'both' | 'tap' | 'button_only'
  card_rating_mode?: 'both' | 'buttons' | 'swipe_4way' | 'swipe_2way'
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
  paste_columns: ['front', 'back'],
  quick_add_columns: ['front', 'back'],
  card_flip_trigger: 'both',
  card_rating_mode: 'both',
}

interface SettingsState {
  userSettings: UserSettings;
  setUserSettings: (settings: Partial<UserSettings>) => void;
  updateUserSettings: (partialSettings: Partial<UserSettings>) => Promise<void>;
  fetchUserSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  userSettings: DEFAULT_USER_SETTINGS,

  setUserSettings: (settings) => set((state) => ({
    userSettings: { ...state.userSettings, ...settings }
  })),

  updateUserSettings: async (partialSettings) => {
    set((state) => ({
      userSettings: { ...state.userSettings, ...partialSettings }
    }))
    try {
      await authApi.updateUserSettings(partialSettings)
    } catch (e) {
      console.error('Failed to persist user settings to DB', e)
    }
  },

  fetchUserSettings: async () => {
    try {
      const data = await authApi.getUserSettings()
      if (data?.settings) {
        set({
          userSettings: { ...DEFAULT_USER_SETTINGS, ...data.settings }
        })
      }
    } catch (e) {
      console.error('Failed to fetch user settings', e)
    }
  }
}))
