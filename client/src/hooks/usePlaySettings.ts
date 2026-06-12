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

  const saveGeneralSettings = async (updates: {
    sfx_enabled?: boolean;
    autoplay_audio?: string;
    learning_mode?: string;
  }) => {
    try {
      const updatedSettings = {
        ...modeSettings,
        sfx_enabled: updates.sfx_enabled !== undefined ? updates.sfx_enabled : sfxEnabled,
        autoplay_audio: updates.autoplay_audio !== undefined ? updates.autoplay_audio : autoPlayAudio,
        learning_mode: updates.learning_mode !== undefined ? updates.learning_mode : activeMode
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

  return {
    sfxEnabled,
    setSfxEnabled,
    saveGeneralSettings
  };
}
