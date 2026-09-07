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
  front_valign?: 'center' | 'top'
  front_halign?: 'left' | 'center'
  back_valign?: 'center' | 'top'
  back_halign?: 'left' | 'center'
  study_profiles?: StudyProfile[]
  active_profile_id?: string | null
  home_active_tab?: 'roadmap' | 'learning'
  roadmap_display_mode?: 'carousel' | 'vertical' | 'compact'
  roadmap_deck_order?: number[]
  learning_deck_order?: number[]
}

export interface StudyProfile {
  id: string
  name: string
  description?: string
  icon?: string
  badge?: string
  is_system?: boolean
  settings: Record<string, any>
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  theme: 'light',
  focus_timer_active: true,
  sfx_enabled: true,
  haptic_enabled: true,
  autoplay_audio: 'none',
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
  front_valign: 'center',
  front_halign: 'left',
  back_valign: 'center',
  back_halign: 'left',
  study_profiles: [],
  active_profile_id: 'preset-standard',
  home_active_tab: 'roadmap',
  roadmap_display_mode: 'carousel',
  roadmap_deck_order: [],
  learning_deck_order: [],
}

interface SettingsState {
  userSettings: UserSettings;
  setUserSettings: (settings: Partial<UserSettings>) => void;
  updateUserSettings: (partialSettings: Partial<UserSettings>) => Promise<void>;
  fetchUserSettings: () => Promise<void>;
  createStudyProfile: (name: string, icon?: string, settings?: Record<string, any>) => Promise<void>;
  deleteStudyProfile: (profileId: string) => Promise<void>;
  setActiveProfile: (profileId: string) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
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
  },

  createStudyProfile: async (name: string, icon = 'sparkles', settings = {}) => {
    const newId = `custom-${Date.now()}`
    const newProfile: StudyProfile = {
      id: newId,
      name,
      icon,
      is_system: false,
      settings
    }
    const currentProfiles = get().userSettings.study_profiles || []
    const updatedProfiles = [...currentProfiles.filter(p => !p.is_system), newProfile]
    await get().updateUserSettings({
      study_profiles: updatedProfiles as any,
      active_profile_id: newId
    })
  },

  deleteStudyProfile: async (profileId: string) => {
    const currentProfiles = get().userSettings.study_profiles || []
    const updatedProfiles = currentProfiles.filter(p => p.id !== profileId && !p.is_system)
    await get().updateUserSettings({
      study_profiles: updatedProfiles as any
    })
  },

  setActiveProfile: async (profileId: string) => {
    await get().updateUserSettings({
      active_profile_id: profileId
    })
  }
}))
