import { useAppStore } from '@/store/useAppStore'
import axios from 'axios'

export function usePlaySettings(
  deckId: string,
  modeSettings: any,
  setModeSettings: (settings: any) => void,
  activeMode: string,
  autoPlayAudio: string
) {
  const { userSettings, updateUserSettings } = useAppStore()

  const sfxEnabled = userSettings.sfx_enabled !== false
  const quickLearnEnabled = !!userSettings.quick_learn_enabled
  const hapticEnabled = userSettings.haptic_enabled !== false
  const showImages = userSettings.show_images || 'always'
  const showFsrs = userSettings.show_fsrs !== false
  const randomEnabled = !!userSettings.random_enabled

  const saveGeneralSettings = async (updates: {
    sfx_enabled?: boolean;
    autoplay_audio?: string;
    learning_mode?: string;
    quick_learn_enabled?: boolean;
    haptic_enabled?: boolean;
    show_images?: string;
    show_fsrs?: boolean;
    random_enabled?: boolean;
  }) => {
    try {
      const updatedSettings = {
        ...modeSettings,
        sfx_enabled: updates.sfx_enabled !== undefined ? updates.sfx_enabled : sfxEnabled,
        autoplay_audio: updates.autoplay_audio !== undefined ? updates.autoplay_audio : autoPlayAudio,
        learning_mode: updates.learning_mode !== undefined ? updates.learning_mode : activeMode,
        quick_learn_enabled: updates.quick_learn_enabled !== undefined ? updates.quick_learn_enabled : quickLearnEnabled,
        haptic_enabled: updates.haptic_enabled !== undefined ? updates.haptic_enabled : hapticEnabled,
        show_images: updates.show_images !== undefined ? updates.show_images : showImages,
        show_fsrs: updates.show_fsrs !== undefined ? updates.show_fsrs : showFsrs,
        random_enabled: updates.random_enabled !== undefined ? updates.random_enabled : randomEnabled
      };
      setModeSettings(updatedSettings);
      await axios.post(`/api/v1/deck/${deckId}/practice-settings`, {
        settings: updates,
        is_creator: false
      });
    } catch (err) {
      console.error('Error saving practice settings:', err);
    }
  };

  const setSfxEnabled = (enabled: boolean) => {
    updateUserSettings({ sfx_enabled: enabled })
    saveGeneralSettings({ sfx_enabled: enabled });
  };

  const setQuickLearnEnabled = (enabled: boolean) => {
    updateUserSettings({ quick_learn_enabled: enabled })
    saveGeneralSettings({ quick_learn_enabled: enabled });
  };

  const setHapticEnabled = (enabled: boolean) => {
    updateUserSettings({ haptic_enabled: enabled })
    saveGeneralSettings({ haptic_enabled: enabled });
  };

  const setShowImages = (mode: string) => {
    updateUserSettings({ show_images: mode })
    saveGeneralSettings({ show_images: mode });
  };

  const setShowFsrs = (enabled: boolean) => {
    updateUserSettings({ show_fsrs: enabled })
    saveGeneralSettings({ show_fsrs: enabled });
  };

  const setRandomEnabled = (enabled: boolean) => {
    updateUserSettings({ random_enabled: enabled })
    saveGeneralSettings({ random_enabled: enabled });
  };

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
    saveGeneralSettings
  };
}
