import { useState } from 'react'
import axios from 'axios'

export function usePlaySettings(
  deckId: string,
  modeSettings: any,
  setModeSettings: (settings: any) => void,
  activeMode: string,
  autoPlayAudio: string
) {
  const [sfxEnabled, setSfxEnabledState] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vocaburn_sfx_enabled');
      return saved !== 'false';
    }
    return true;
  });

  const [quickLearnEnabled, setQuickLearnEnabledState] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vocaburn_quick_learn_enabled');
      return saved === 'true';
    }
    return false;
  });

  const [hapticEnabled, setHapticEnabledState] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vocaburn_haptic_enabled');
      return saved !== 'false';
    }
    return true;
  });

  const [showImages, setShowImagesState] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vocaburn_show_images');
      return saved !== 'false';
    }
    return true;
  });

  const saveGeneralSettings = async (updates: {
    sfx_enabled?: boolean;
    autoplay_audio?: string;
    learning_mode?: string;
    quick_learn_enabled?: boolean;
    haptic_enabled?: boolean;
    show_images?: boolean;
  }) => {
    try {
      const updatedSettings = {
        ...modeSettings,
        sfx_enabled: updates.sfx_enabled !== undefined ? updates.sfx_enabled : sfxEnabled,
        autoplay_audio: updates.autoplay_audio !== undefined ? updates.autoplay_audio : autoPlayAudio,
        learning_mode: updates.learning_mode !== undefined ? updates.learning_mode : activeMode,
        quick_learn_enabled: updates.quick_learn_enabled !== undefined ? updates.quick_learn_enabled : quickLearnEnabled,
        haptic_enabled: updates.haptic_enabled !== undefined ? updates.haptic_enabled : hapticEnabled,
        show_images: updates.show_images !== undefined ? updates.show_images : showImages
      };
      setModeSettings(updatedSettings);
      await axios.post(`/api/v1/deck/${deckId}/practice-settings`, {
        settings: updates, // ONLY send the changed fields to backend to merge
        is_creator: false
      });
    } catch (err) {
      console.error('Error saving practice settings:', err);
    }
  };

  const setSfxEnabled = (enabled: boolean) => {
    setSfxEnabledState(enabled);
    if (typeof window !== 'undefined') {
      localStorage.setItem('vocaburn_sfx_enabled', enabled ? 'true' : 'false');
    }
    saveGeneralSettings({ sfx_enabled: enabled });
  };

  const setQuickLearnEnabled = (enabled: boolean) => {
    setQuickLearnEnabledState(enabled);
    if (typeof window !== 'undefined') {
      localStorage.setItem('vocaburn_quick_learn_enabled', enabled ? 'true' : 'false');
    }
    saveGeneralSettings({ quick_learn_enabled: enabled });
  };

  const setHapticEnabled = (enabled: boolean) => {
    setHapticEnabledState(enabled);
    if (typeof window !== 'undefined') {
      localStorage.setItem('vocaburn_haptic_enabled', enabled ? 'true' : 'false');
    }
    saveGeneralSettings({ haptic_enabled: enabled });
  };

  const setShowImages = (enabled: boolean) => {
    setShowImagesState(enabled);
    if (typeof window !== 'undefined') {
      localStorage.setItem('vocaburn_show_images', enabled ? 'true' : 'false');
    }
    saveGeneralSettings({ show_images: enabled });
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
    saveGeneralSettings
  };
}
