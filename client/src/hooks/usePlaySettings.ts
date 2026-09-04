import { useState, useCallback } from 'react'
import axios from 'axios'

export type AutoPlayMode = 'always' | 'front' | 'back' | 'none'
export type ImageDisplayMode = 'always' | 'front' | 'back' | 'none'

export interface StudySettingsState {
  autoplay_audio: AutoPlayMode
  show_images: ImageDisplayMode
  learning_mode: string
  random_enabled: boolean
  sfx_enabled: boolean
  haptic_enabled: boolean
  quick_learn_enabled: boolean
  show_fsrs: boolean
}

export const DEFAULT_STUDY_SETTINGS: StudySettingsState = {
  autoplay_audio: 'none',
  show_images: 'always',
  learning_mode: 'fsrs',
  random_enabled: false,
  sfx_enabled: true,
  haptic_enabled: true,
  quick_learn_enabled: false,
  show_fsrs: true
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

  // Creator baseline & user customization status
  const [creatorDefaults, setCreatorDefaults] = useState<Partial<StudySettingsState>>({})
  const [isCustomized, setIsCustomized] = useState<boolean>(false)

  // Synchronize settings from /play-data or /practice-settings response
  const syncStudySettings = useCallback((
    effectiveSettings?: Partial<StudySettingsState>,
    creatorStudyDefaults?: Partial<StudySettingsState>,
    userStudySettings?: Partial<StudySettingsState>,
    customizedFlag?: boolean
  ) => {
    if (creatorStudyDefaults && typeof creatorStudyDefaults === 'object') {
      setCreatorDefaults(creatorStudyDefaults)
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

    setIsCustomized(true)

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
      await axios.post(`/api/v1/deck/${deckId}/practice-settings`, {
        settings: updates,
        is_creator: false
      })
    } catch (err) {
      console.error('[usePlaySettings] Error saving user deck study settings:', err)
    }
  }, [deckId, modeSettings, setModeSettings])

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

  // Reset learner overrides back to the deck creator's baseline
  const resetToCreatorDefaults = useCallback(async () => {
    if (!deckId || deckId === 'quick') return

    try {
      await axios.post(`/api/v1/deck/${deckId}/practice-settings`, {
        is_creator: false,
        reset_study_defaults: true
      })

      // Revert local state to creator defaults or system defaults
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

      setIsCustomized(false)
    } catch (err) {
      console.error('[usePlaySettings] Failed to reset to creator defaults:', err)
    }
  }, [deckId, creatorDefaults])

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
    creatorDefaults,
    isCustomized,
    syncStudySettings,
    saveGeneralSettings,
    resetToCreatorDefaults
  }
}
