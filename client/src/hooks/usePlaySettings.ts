import { useState, useCallback } from 'react'
import axios from 'axios'
import { useSettingsStore, type StudyProfile } from '@/store/useSettingsStore'

export type AutoPlayMode = 'always' | 'front' | 'back' | 'none'
export type ImageDisplayMode = 'always' | 'front' | 'back' | 'none'
export type VAlignMode = 'center' | 'top'
export type HAlignMode = 'center' | 'left'
export type CardFlipTrigger = 'both' | 'tap' | 'button_only'
export type CardRatingMode = 'both' | 'swipe_4way' | 'swipe_2way' | 'buttons'
export type SettingOrigin = string

export interface StudySettingsState {
  autoplay_audio: AutoPlayMode
  show_images: ImageDisplayMode
  learning_mode: string
  front_valign: VAlignMode
  front_halign: HAlignMode
  front_font_size?: string
  back_valign: VAlignMode
  back_halign: HAlignMode
  random_enabled: boolean
  sfx_enabled: boolean
  haptic_enabled: boolean
  quick_learn_enabled: boolean
  show_fsrs: boolean
  card_flip_trigger?: CardFlipTrigger
  card_rating_mode?: CardRatingMode
  tap_to_flip?: boolean
  show_action_dock?: boolean
  swipe_to_rate?: boolean
}

export const DEFAULT_STUDY_SETTINGS: StudySettingsState = {
  autoplay_audio: 'none',
  show_images: 'always',
  learning_mode: 'fsrs',
  front_valign: 'center',
  front_halign: 'left',
  front_font_size: '100%',
  back_valign: 'center',
  back_halign: 'left',
  random_enabled: false,
  sfx_enabled: true,
  haptic_enabled: true,
  quick_learn_enabled: false,
  show_fsrs: true,
  card_flip_trigger: 'both',
  card_rating_mode: 'both',
  tap_to_flip: true,
  show_action_dock: true,
  swipe_to_rate: true
}

export function usePlaySettings(
  deckId: string,
  modeSettings?: any,
  setModeSettings?: (settings: any) => void
) {
  // Deck-scoped local state (strictly isolated per deck, never stored in global useAppStore)
  const [sfxEnabled, setSfxEnabledState] = useState<boolean>(DEFAULT_STUDY_SETTINGS.sfx_enabled)
  const [quickLearnEnabled, setQuickLearnEnabledState] = useState<boolean>(DEFAULT_STUDY_SETTINGS.quick_learn_enabled)
  const [hapticEnabled, setHapticEnabledState] = useState<boolean>(DEFAULT_STUDY_SETTINGS.haptic_enabled)
  const [showImages, setShowImagesState] = useState<ImageDisplayMode>(DEFAULT_STUDY_SETTINGS.show_images)
  const [showFsrs, setShowFsrsState] = useState<boolean>(DEFAULT_STUDY_SETTINGS.show_fsrs)
  const [randomEnabled, setRandomEnabledState] = useState<boolean>(DEFAULT_STUDY_SETTINGS.random_enabled)
  const [autoPlayAudio, setAutoPlayAudioState] = useState<AutoPlayMode>(DEFAULT_STUDY_SETTINGS.autoplay_audio)
  const [learningMode, setLearningModeState] = useState<string>(DEFAULT_STUDY_SETTINGS.learning_mode)
  const [frontValign, setFrontValignState] = useState<VAlignMode>(DEFAULT_STUDY_SETTINGS.front_valign)
  const [frontHalign, setFrontHalignState] = useState<HAlignMode>(DEFAULT_STUDY_SETTINGS.front_halign)
  const [frontFontSize, setFrontFontSizeState] = useState<string>(DEFAULT_STUDY_SETTINGS.front_font_size || '100%')
  const [backValign, setBackValignState] = useState<VAlignMode>(DEFAULT_STUDY_SETTINGS.back_valign)
  const [backHalign, setBackHalignState] = useState<HAlignMode>(DEFAULT_STUDY_SETTINGS.back_halign)
  const [cardFlipTrigger, setCardFlipTriggerState] = useState<CardFlipTrigger | undefined>(undefined)
  const [cardRatingMode, setCardRatingModeState] = useState<CardRatingMode>(DEFAULT_STUDY_SETTINGS.card_rating_mode || 'both')
  const [tapToFlip, setTapToFlipState] = useState<boolean | undefined>(undefined)
  const [showActionDock, setShowActionDockState] = useState<boolean>(DEFAULT_STUDY_SETTINGS.show_action_dock ?? true)
  const [swipeToRate, setSwipeToRateState] = useState<boolean>(DEFAULT_STUDY_SETTINGS.swipe_to_rate ?? true)

  // Creator baseline & user customization status & 3-tier origin & profiles
  const [creatorDefaults, setCreatorDefaults] = useState<Partial<StudySettingsState>>({})
  const [userGlobalSettings, setUserGlobalSettings] = useState<Partial<StudySettingsState>>({})
  const [studyProfiles, setStudyProfiles] = useState<StudyProfile[]>([])
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null)
  const [isCustomized, setIsCustomized] = useState<boolean>(false)
  const [settingOrigin, setSettingOrigin] = useState<SettingOrigin>('deck_default')

  // Synchronize settings from /play-data or /practice-settings response
  const syncStudySettings = useCallback((
    effectiveSettings?: Partial<StudySettingsState>,
    creatorStudyDefaults?: Partial<StudySettingsState>,
    userStudySettings?: Partial<StudySettingsState>,
    customizedFlag?: boolean,
    origin?: SettingOrigin,
    globalSettings?: Partial<StudySettingsState>,
    profiles?: StudyProfile[],
    activeProfId?: string | null
  ) => {
    if (creatorStudyDefaults && typeof creatorStudyDefaults === 'object') {
      setCreatorDefaults(creatorStudyDefaults)
    }
    if (globalSettings && typeof globalSettings === 'object') {
      setUserGlobalSettings(globalSettings)
    }
    if (profiles && Array.isArray(profiles)) {
      setStudyProfiles(profiles)
    }
    if (activeProfId !== undefined) {
      setActiveProfileId(activeProfId)
    }

    if (origin) {
      setSettingOrigin(origin)
    } else if (customizedFlag) {
      setSettingOrigin('deck_override')
    } else {
      setSettingOrigin('deck_default')
    }

    if (customizedFlag !== undefined) {
      setIsCustomized(customizedFlag)
    } else if (userStudySettings && Object.keys(userStudySettings).length > 0) {
      setIsCustomized(true)
    }

    if (effectiveSettings && typeof effectiveSettings === 'object') {
      if (effectiveSettings.sfx_enabled !== undefined) {
        setSfxEnabledState(Boolean(effectiveSettings.sfx_enabled))
      }
      if (effectiveSettings.quick_learn_enabled !== undefined) {
        setQuickLearnEnabledState(Boolean(effectiveSettings.quick_learn_enabled))
      }
      if (effectiveSettings.haptic_enabled !== undefined) {
        setHapticEnabledState(Boolean(effectiveSettings.haptic_enabled))
      }
      if (effectiveSettings.show_images !== undefined) {
        const imgVal = String(effectiveSettings.show_images).toLowerCase()
        if (imgVal === 'front' || imgVal === 'back' || imgVal === 'always' || imgVal === 'none') {
          setShowImagesState(imgVal as ImageDisplayMode)
        } else if (imgVal === 'true') {
          setShowImagesState('always')
        } else if (imgVal === 'false') {
          setShowImagesState('none')
        }
      }
      if (effectiveSettings.show_fsrs !== undefined) {
        setShowFsrsState(Boolean(effectiveSettings.show_fsrs))
      }
      if (effectiveSettings.random_enabled !== undefined) {
        setRandomEnabledState(Boolean(effectiveSettings.random_enabled))
      }
      if (effectiveSettings.autoplay_audio !== undefined) {
        const audVal = String(effectiveSettings.autoplay_audio).toLowerCase()
        if (audVal === 'never' || audVal === 'none' || audVal === 'false') {
          setAutoPlayAudioState('none')
        } else if (audVal === 'both' || audVal === 'always' || audVal === 'true') {
          setAutoPlayAudioState('always')
        } else if (audVal === 'front' || audVal === 'back') {
          setAutoPlayAudioState(audVal as AutoPlayMode)
        }
      }
      if (effectiveSettings.learning_mode !== undefined) {
        setLearningModeState(String(effectiveSettings.learning_mode))
      }
      if (effectiveSettings.front_valign !== undefined) {
        setFrontValignState(effectiveSettings.front_valign === 'top' ? 'top' : 'center')
      }
      if (effectiveSettings.front_halign !== undefined) {
        setFrontHalignState(effectiveSettings.front_halign === 'center' ? 'center' : 'left')
      }
      if (effectiveSettings.front_font_size !== undefined) {
        setFrontFontSizeState(effectiveSettings.front_font_size)
      }
      if (effectiveSettings.back_valign !== undefined) {
        setBackValignState(effectiveSettings.back_valign === 'top' ? 'top' : 'center')
      }
      if (effectiveSettings.back_halign !== undefined) {
        setBackHalignState(effectiveSettings.back_halign === 'center' ? 'center' : 'left')
      }
      // Sync interaction and gesture settings from effective study settings (profile/user/creator)
      if (effectiveSettings.card_flip_trigger !== undefined) {
        setCardFlipTriggerState(effectiveSettings.card_flip_trigger)
      } else if (userStudySettings && userStudySettings.card_flip_trigger !== undefined) {
        setCardFlipTriggerState(userStudySettings.card_flip_trigger)
      } else if (creatorStudyDefaults && creatorStudyDefaults.card_flip_trigger !== undefined) {
        setCardFlipTriggerState(creatorStudyDefaults.card_flip_trigger)
      } else {
        setCardFlipTriggerState(undefined)
      }

      if (effectiveSettings.tap_to_flip !== undefined) {
        setTapToFlipState(effectiveSettings.tap_to_flip)
      } else if (effectiveSettings.card_flip_trigger !== undefined) {
        setTapToFlipState(effectiveSettings.card_flip_trigger !== 'button_only')
      }

      if (effectiveSettings.card_rating_mode !== undefined) {
        const mode = effectiveSettings.card_rating_mode
        setCardRatingModeState(mode)
        if (mode === 'buttons') {
          setShowActionDockState(true)
          setSwipeToRateState(false)
        } else if (mode === 'swipe_4way' || mode === 'swipe_2way') {
          setShowActionDockState(false)
          setSwipeToRateState(true)
        } else {
          setShowActionDockState(true)
          setSwipeToRateState(true)
        }
      } else if (userStudySettings && userStudySettings.card_rating_mode !== undefined) {
        setCardRatingModeState(userStudySettings.card_rating_mode)
      } else if (creatorStudyDefaults && creatorStudyDefaults.card_rating_mode !== undefined) {
        setCardRatingModeState(creatorStudyDefaults.card_rating_mode)
      }

      if (effectiveSettings.show_action_dock !== undefined) {
        setShowActionDockState(Boolean(effectiveSettings.show_action_dock))
      } else if (effectiveSettings.card_flip_trigger !== undefined) {
        setShowActionDockState(effectiveSettings.card_flip_trigger !== 'tap')
      }

      if (effectiveSettings.swipe_to_rate !== undefined) {
        setSwipeToRateState(Boolean(effectiveSettings.swipe_to_rate))
      }
    }
  }, [])

  // Persist user deck overrides directly to backend (UserDeckSettings table) without polluting global state
  const saveGeneralSettings = useCallback(async (updates: Partial<StudySettingsState>) => {
    // 1. Immediately update local state
    if (updates.sfx_enabled !== undefined) setSfxEnabledState(updates.sfx_enabled)
    if (updates.quick_learn_enabled !== undefined) setQuickLearnEnabledState(updates.quick_learn_enabled)
    if (updates.haptic_enabled !== undefined) setHapticEnabledState(updates.haptic_enabled)
    if (updates.show_images !== undefined) setShowImagesState(updates.show_images as ImageDisplayMode)
    if (updates.show_fsrs !== undefined) setShowFsrsState(updates.show_fsrs)
    if (updates.random_enabled !== undefined) setRandomEnabledState(updates.random_enabled)
    if (updates.autoplay_audio !== undefined) setAutoPlayAudioState(updates.autoplay_audio as AutoPlayMode)
    if (updates.learning_mode !== undefined) setLearningModeState(updates.learning_mode)
    if (updates.front_valign !== undefined) setFrontValignState(updates.front_valign)
    if (updates.front_halign !== undefined) setFrontHalignState(updates.front_halign)
    if (updates.front_font_size !== undefined) setFrontFontSizeState(updates.front_font_size)
    if (updates.back_valign !== undefined) setBackValignState(updates.back_valign)
    if (updates.card_flip_trigger !== undefined) setCardFlipTriggerState(updates.card_flip_trigger)
    if (updates.card_rating_mode !== undefined) {
      setCardRatingModeState(updates.card_rating_mode)
      if (updates.card_rating_mode === 'buttons') {
        setShowActionDockState(true)
        setSwipeToRateState(false)
      } else if (updates.card_rating_mode === 'swipe_4way' || updates.card_rating_mode === 'swipe_2way') {
        setShowActionDockState(false)
        setSwipeToRateState(true)
      } else if (updates.card_rating_mode === 'both') {
        setShowActionDockState(true)
        setSwipeToRateState(true)
      }
    }
    if (updates.tap_to_flip !== undefined) setTapToFlipState(updates.tap_to_flip)
    if (updates.show_action_dock !== undefined) setShowActionDockState(updates.show_action_dock)
    if (updates.swipe_to_rate !== undefined) setSwipeToRateState(updates.swipe_to_rate)

    setIsCustomized(true)
    setSettingOrigin('deck_override')

    // 2. Update parent modeSettings if available
    if (modeSettings && setModeSettings) {
      setModeSettings({
        ...modeSettings,
        ...updates
      })
    }

    // 3. Save to backend UserDeckSettings for this deck only
    if (!deckId || deckId === 'quick') return

    try {
      const res = await axios.post(`/api/v1/deck/${deckId}/practice-settings`, {
        settings: {
          ...updates,
          study_settings: updates
        },
        is_creator: false
      })
      if (res.data?.effective_study_settings) {
        syncStudySettings(
          res.data.effective_study_settings,
          res.data.creator_study_defaults,
          res.data.user_study_settings,
          res.data.is_study_customized,
          res.data.setting_origin,
          res.data.user_global_settings,
          res.data.study_profiles,
          res.data.active_profile_id
        )
      }
    } catch (err) {
      console.error('[usePlaySettings] Error saving user deck study settings:', err)
    }
  }, [deckId, modeSettings, setModeSettings, syncStudySettings])

  // Explicit setters for individual options
  const setSfxEnabled = useCallback((enabled: boolean) => {
    saveGeneralSettings({ sfx_enabled: enabled })
  }, [saveGeneralSettings])

  const setQuickLearnEnabled = useCallback((enabled: boolean) => {
    saveGeneralSettings({ quick_learn_enabled: enabled })
  }, [saveGeneralSettings])

  const setHapticEnabled = useCallback((enabled: boolean) => {
    saveGeneralSettings({ haptic_enabled: enabled })
  }, [saveGeneralSettings])

  const setShowImages = useCallback((mode: ImageDisplayMode | string) => {
    const val = mode as ImageDisplayMode
    saveGeneralSettings({ show_images: val })
  }, [saveGeneralSettings])

  const setShowFsrs = useCallback((enabled: boolean) => {
    saveGeneralSettings({ show_fsrs: enabled })
  }, [saveGeneralSettings])

  const setRandomEnabled = useCallback((enabled: boolean) => {
    saveGeneralSettings({ random_enabled: enabled })
  }, [saveGeneralSettings])

  const setAutoPlayAudio = useCallback((mode: AutoPlayMode | string) => {
    const val = (mode === 'never' ? 'none' : mode) as AutoPlayMode
    saveGeneralSettings({ autoplay_audio: val })
  }, [saveGeneralSettings])

  const setLearningMode = useCallback((mode: string) => {
    saveGeneralSettings({ learning_mode: mode })
  }, [saveGeneralSettings])

  const setFrontValign = useCallback((mode: VAlignMode) => {
    saveGeneralSettings({ front_valign: mode })
  }, [saveGeneralSettings])

  const setFrontHalign = useCallback((mode: HAlignMode) => {
    saveGeneralSettings({ front_halign: mode })
  }, [saveGeneralSettings])

  const setFrontFontSize = useCallback((size: string) => {
    saveGeneralSettings({ front_font_size: size })
  }, [saveGeneralSettings])

  const setBackValign = useCallback((mode: VAlignMode) => {
    saveGeneralSettings({ back_valign: mode })
  }, [saveGeneralSettings])

  const setBackHalign = useCallback((mode: HAlignMode) => {
    saveGeneralSettings({ back_halign: mode })
  }, [saveGeneralSettings])

  const setCardRatingMode = useCallback((mode: CardRatingMode) => {
    saveGeneralSettings({ card_rating_mode: mode })
  }, [saveGeneralSettings])

  const setShowActionDock = useCallback((enabled: boolean) => {
    saveGeneralSettings({ show_action_dock: enabled })
  }, [saveGeneralSettings])

  const setSwipeToRate = useCallback((enabled: boolean) => {
    saveGeneralSettings({ swipe_to_rate: enabled })
  }, [saveGeneralSettings])

  // Reset learner overrides back to the deck creator's baseline
  const resetToCreatorDefaults = useCallback(async () => {
    if (!deckId || deckId === 'quick') return

    try {
      const res = await axios.post(`/api/v1/deck/${deckId}/practice-settings`, {
        is_creator: false,
        reset_study_defaults: true
      })

      if (res.data?.effective_study_settings) {
        syncStudySettings(
          res.data.effective_study_settings,
          res.data.creator_study_defaults,
          res.data.user_study_settings,
          res.data.is_study_customized,
          res.data.setting_origin,
          res.data.user_global_settings
        )
      } else {
        const baseline: StudySettingsState = {
          ...DEFAULT_STUDY_SETTINGS,
          ...creatorDefaults
        }
        setSfxEnabledState(baseline.sfx_enabled)
        setQuickLearnEnabledState(baseline.quick_learn_enabled)
        setHapticEnabledState(baseline.haptic_enabled)
        setShowImagesState(baseline.show_images)
        setShowFsrsState(baseline.show_fsrs)
        setRandomEnabledState(baseline.random_enabled)
        setAutoPlayAudioState(baseline.autoplay_audio)
        setLearningModeState(baseline.learning_mode)
        setFrontValignState(baseline.front_valign)
        setFrontHalignState(baseline.front_halign)
        setFrontFontSizeState(baseline.front_font_size || '100%')
        setBackValignState(baseline.back_valign)
        setBackHalignState(baseline.back_halign)
        setCardRatingModeState(baseline.card_rating_mode || 'both')
        setShowActionDockState(baseline.show_action_dock ?? true)
        setSwipeToRateState(baseline.swipe_to_rate ?? true)
        setIsCustomized(false)
        setSettingOrigin('deck_default')
      }
    } catch (err) {
      console.error('[usePlaySettings] Failed to reset to creator defaults:', err)
    }
  }, [deckId, creatorDefaults, syncStudySettings])

  // Apply personal user global settings into this deck
  const applyGlobalSettings = useCallback(async () => {
    if (!deckId || deckId === 'quick') return
    try {
      const res = await axios.post(`/api/v1/deck/${deckId}/practice-settings`, {
        is_creator: false,
        apply_global_settings: true
      })
      if (res.data?.effective_study_settings) {
        syncStudySettings(
          res.data.effective_study_settings,
          res.data.creator_study_defaults,
          res.data.user_study_settings,
          res.data.is_study_customized,
          res.data.setting_origin,
          res.data.user_global_settings
        )
      } else {
        setSettingOrigin('user_global')
        setIsCustomized(true)
      }
    } catch (err) {
      console.error('[usePlaySettings] Failed to apply global settings:', err)
    }
  }, [deckId, syncStudySettings])

  // Save current deck study settings as personal user global settings
  const saveAsGlobalSettings = useCallback(async () => {
    if (!deckId || deckId === 'quick') return
    const currentStudySettings = {
      autoplay_audio: autoPlayAudio,
      show_images: showImages,
      learning_mode: learningMode,
      front_valign: frontValign,
      front_halign: frontHalign,
      front_font_size: frontFontSize,
      back_valign: backValign,
      back_halign: backHalign,
      random_enabled: randomEnabled,
      sfx_enabled: sfxEnabled,
      haptic_enabled: hapticEnabled,
      quick_learn_enabled: quickLearnEnabled,
      show_fsrs: showFsrs,
      card_flip_trigger: cardFlipTrigger || 'both',
      card_rating_mode: cardRatingMode || 'both',
      show_action_dock: showActionDock,
      swipe_to_rate: swipeToRate
    }
    try {
      const res = await axios.post(`/api/v1/deck/${deckId}/practice-settings`, {
        is_creator: false,
        save_as_global_settings: true,
        settings: currentStudySettings
      })
      useSettingsStore.getState().setUserSettings(currentStudySettings)
      if (res.data?.effective_study_settings) {
        syncStudySettings(
          res.data.effective_study_settings,
          res.data.creator_study_defaults,
          res.data.user_study_settings,
          res.data.is_study_customized,
          res.data.setting_origin,
          res.data.user_global_settings
        )
      }
    } catch (err) {
      console.error('[usePlaySettings] Failed to save as global settings:', err)
    }
  }, [deckId, autoPlayAudio, showImages, learningMode, frontValign, frontHalign, backValign, backHalign, randomEnabled, sfxEnabled, hapticEnabled, quickLearnEnabled, showFsrs, cardFlipTrigger, cardRatingMode, showActionDock, swipeToRate, syncStudySettings])

  // Save current settings as the creator's deck defaults (baseline for all learners)
  const saveAsCreatorDefaults = useCallback(async () => {
    if (!deckId || deckId === 'quick') return
    const currentDefaults = {
      autoplay_audio: autoPlayAudio,
      show_images: showImages,
      learning_mode: learningMode,
      front_valign: frontValign,
      front_halign: frontHalign,
      front_font_size: frontFontSize,
      back_valign: backValign,
      back_halign: backHalign,
      random_enabled: randomEnabled,
      sfx_enabled: sfxEnabled,
      haptic_enabled: hapticEnabled,
      quick_learn_enabled: quickLearnEnabled,
      show_fsrs: showFsrs,
      card_flip_trigger: cardFlipTrigger || 'both',
      card_rating_mode: cardRatingMode || 'both',
      show_action_dock: showActionDock,
      swipe_to_rate: swipeToRate
    }
    try {
      await axios.patch(`/api/v1/deck/${deckId}`, {
        study_defaults: currentDefaults
      })
      const res = await axios.post(`/api/v1/deck/${deckId}/practice-settings`, {
        is_creator: true,
        settings: {
          ...currentDefaults,
          study_defaults: currentDefaults
        }
      })
      setCreatorDefaults(currentDefaults)
      setIsCustomized(false)
      setSettingOrigin('deck_default')
      if (res.data?.effective_study_settings) {
        syncStudySettings(
          res.data.effective_study_settings,
          res.data.creator_study_defaults,
          res.data.user_study_settings,
          res.data.is_study_customized,
          res.data.setting_origin,
          res.data.user_global_settings
        )
      }
    } catch (err) {
      console.error('[usePlaySettings] Failed to save creator defaults:', err)
    }
  }, [deckId, autoPlayAudio, showImages, learningMode, frontValign, frontHalign, backValign, backHalign, randomEnabled, sfxEnabled, hapticEnabled, quickLearnEnabled, showFsrs, cardFlipTrigger, cardRatingMode, showActionDock, swipeToRate, syncStudySettings])

  // Apply a specific profile/template to this deck
  const applyProfile = useCallback(async (profileId: string) => {
    if (!deckId || deckId === 'quick') return
    try {
      const res = await axios.post(`/api/v1/deck/${deckId}/practice-settings`, {
        is_creator: false,
        apply_profile_id: profileId
      })
      setActiveProfileId(profileId)
      if (res.data?.effective_study_settings) {
        syncStudySettings(
          res.data.effective_study_settings,
          res.data.creator_study_defaults,
          res.data.user_study_settings,
          res.data.is_study_customized,
          res.data.setting_origin,
          res.data.user_global_settings,
          res.data.study_profiles,
          res.data.active_profile_id
        )
      }
    } catch (err) {
      console.error('[usePlaySettings] Failed to apply profile:', err)
    }
  }, [deckId, syncStudySettings])

  // Save current settings as a new custom profile/template
  const createCustomProfile = useCallback(async (name: string, icon = 'sparkles') => {
    if (!deckId || deckId === 'quick') return
    const currentStudySettings = {
      autoplay_audio: autoPlayAudio,
      show_images: showImages,
      learning_mode: learningMode,
      front_valign: frontValign,
      front_halign: frontHalign,
      front_font_size: frontFontSize,
      back_valign: backValign,
      back_halign: backHalign,
      random_enabled: randomEnabled,
      sfx_enabled: sfxEnabled,
      haptic_enabled: hapticEnabled,
      quick_learn_enabled: quickLearnEnabled,
      show_fsrs: showFsrs,
      card_flip_trigger: cardFlipTrigger || 'both',
      card_rating_mode: cardRatingMode || 'both'
    }
    try {
      const res = await axios.post(`/api/v1/deck/${deckId}/practice-settings`, {
        is_creator: false,
        create_study_profile: {
          name,
          icon,
          settings: currentStudySettings
        }
      })
      if (res.data?.effective_study_settings) {
        syncStudySettings(
          res.data.effective_study_settings,
          res.data.creator_study_defaults,
          res.data.user_study_settings,
          res.data.is_study_customized,
          res.data.setting_origin,
          res.data.user_global_settings,
          res.data.study_profiles,
          res.data.active_profile_id
        )
      }
    } catch (err) {
      console.error('[usePlaySettings] Failed to create custom profile:', err)
    }
  }, [deckId, autoPlayAudio, showImages, learningMode, frontValign, frontHalign, backValign, backHalign, randomEnabled, sfxEnabled, hapticEnabled, quickLearnEnabled, showFsrs, cardFlipTrigger, cardRatingMode, syncStudySettings])

  // Delete a custom profile
  const deleteCustomProfile = useCallback(async (profileId: string) => {
    if (!deckId || deckId === 'quick') return
    try {
      const res = await axios.post(`/api/v1/deck/${deckId}/practice-settings`, {
        is_creator: false,
        delete_study_profile_id: profileId
      })
      if (res.data?.study_profiles) {
        setStudyProfiles(res.data.study_profiles)
      }
    } catch (err) {
      console.error('[usePlaySettings] Failed to delete custom profile:', err)
    }
  }, [deckId])

  return {
    sfxEnabled,
    setSfxEnabled,
    quickLearnEnabled,
    setQuickLearnEnabled,
    hapticEnabled,
    setHapticEnabled,
    showImages,
    setShowImages,
    showFsrs,
    setShowFsrs,
    randomEnabled,
    setRandomEnabled,
    autoPlayAudio,
    setAutoPlayAudio,
    learningMode,
    setLearningMode,
    frontValign,
    setFrontValign,
    frontHalign,
    setFrontHalign,
    frontFontSize,
    setFrontFontSize,
    backValign,
    setBackValign,
    backHalign,
    setBackHalign,
    cardFlipTrigger,
    setCardFlipTrigger: setCardFlipTriggerState,
    cardRatingMode,
    setCardRatingMode,
    tapToFlip,
    setTapToFlip: setTapToFlipState,
    showActionDock,
    setShowActionDock,
    swipeToRate,
    setSwipeToRate,
    creatorDefaults,
    userGlobalSettings,
    studyProfiles,
    activeProfileId,
    isCustomized,
    settingOrigin,
    setSettingOrigin,
    syncStudySettings,
    saveGeneralSettings,
    resetToCreatorDefaults,
    applyGlobalSettings,
    saveAsGlobalSettings,
    saveAsCreatorDefaults,
    applyProfile,
    createCustomProfile,
    deleteCustomProfile
  }
}
