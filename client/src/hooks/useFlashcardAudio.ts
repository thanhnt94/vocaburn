import { useRef } from 'react';
import axios from 'axios';
import { speakWithEdgeTTS } from '@/lib/audio';
import { useAppStore } from '@/store/useAppStore';

export type AutoPlayMode = 'always' | 'front' | 'back' | 'none';

export function useFlashcardAudio(
  currentQuestion: any,
  practiceSettings?: any,
  scopedAutoPlayAudio?: AutoPlayMode,
  scopedSetAutoPlayAudio?: (mode: AutoPlayMode) => void
) {
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const currentQuestionIdRef = useRef<number | null>(null);

  const autoPlayAudio = scopedAutoPlayAudio !== undefined ? scopedAutoPlayAudio : 'none';

  const setAutoPlayAudio = (mode: AutoPlayMode) => {
    if (scopedSetAutoPlayAudio) {
      scopedSetAutoPlayAudio(mode);
    }
  };

  const stopAudio = () => {
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  const getAudioConfigForColumn = (columnKey: string) => {
    const audioConfigs = practiceSettings?.audio_configs || [];
    // 1. Direct match by data_col
    let cfg = audioConfigs.find((c: any) => c.data_col === columnKey);
    if (cfg) return cfg;

    // 2. Front/Back fallbacks
    if (columnKey === 'front') {
      cfg = audioConfigs.find((c: any) => c.data_col === 'front' || c.url_col === 'front_audio_url' || c.id === 'cfg_front');
      if (cfg) return cfg;
      if (practiceSettings?.front_audio_config) {
        return {
          data_col: 'front',
          source_col: practiceSettings.front_audio_config.audio_content_col || 'front_audio_content',
          url_col: practiceSettings.front_audio_config.audio_url_col || 'front_audio_url',
          lang: practiceSettings.front_audio_config.lang || 'multi',
          enabled: practiceSettings.front_audio_config.lang !== 'none'
        };
      }
    }
    if (columnKey === 'back') {
      cfg = audioConfigs.find((c: any) => c.data_col === 'back' || c.url_col === 'back_audio_url' || c.id === 'cfg_back');
      if (cfg) return cfg;
      if (practiceSettings?.back_audio_config) {
        return {
          data_col: 'back',
          source_col: practiceSettings.back_audio_config.audio_content_col || 'back_audio_content',
          url_col: practiceSettings.back_audio_config.audio_url_col || 'back_audio_url',
          lang: practiceSettings.back_audio_config.lang || 'multi',
          enabled: practiceSettings.back_audio_config.lang !== 'none'
        };
      }
    }

    // 3. Check audio_pairs
    const pairs = practiceSettings?.audio_pairs || [];
    const pair = pairs.find((p: any) => p.data_col === columnKey || p.text_col === columnKey);
    if (pair) {
      return {
        data_col: pair.data_col || pair.text_col || columnKey,
        source_col: pair.audio_content_col || pair.text_col || columnKey,
        url_col: pair.audio_url_col || '',
        lang: pair.lang || 'multi',
        enabled: pair.lang !== 'none'
      };
    }

    // 4. Any other matching config by source_col or id
    cfg = audioConfigs.find((c: any) => c.source_col === columnKey || c.id === columnKey);
    return cfg;
  };

  const isAudioEnabled = (columnKey: string) => {
    const cfg = getAudioConfigForColumn(columnKey);
    if (cfg && (cfg.lang === 'none' || cfg.enabled === false)) return false;
    if (columnKey === 'front' && practiceSettings?.front_audio_config?.lang === 'none') return false;
    if (columnKey === 'back' && practiceSettings?.back_audio_config?.lang === 'none') return false;
    return true;
  };

  const playColumnAudio = async (columnKey: string) => {
    if (!currentQuestion) return;
    if (!isAudioEnabled(columnKey)) {
      console.log(`[CLIENT TTS] Audio is disabled for ${columnKey}`);
      return;
    }
    const targetQuestionId = currentQuestion.id;
    currentQuestionIdRef.current = targetQuestionId;

    stopAudio();

    const cfg = getAudioConfigForColumn(columnKey);
    const urlCol = cfg?.url_col;
    const sourceCol = cfg?.source_col;
    const lang = cfg?.lang || 'multi';

    let audioUrl = '';
    if (urlCol) {
      audioUrl = currentQuestion[urlCol] || currentQuestion.others?.[urlCol] || '';
    }
    if (!audioUrl && (columnKey === 'front' || cfg?.data_col === 'front')) {
      audioUrl = currentQuestion.audio || currentQuestion.front_audio_url || currentQuestion.others?.front_audio_url || '';
    }
    if (!audioUrl && (columnKey === 'back' || cfg?.data_col === 'back')) {
      audioUrl = currentQuestion.back_audio_url || currentQuestion.others?.back_audio_url || '';
    }

    let script = '';
    if (sourceCol) {
      script = currentQuestion[sourceCol] || currentQuestion.others?.[sourceCol] || '';
    }
    if (!script || !script.trim()) {
      script = currentQuestion[columnKey] || currentQuestion.others?.[columnKey] || '';
    }
    if (!script || !script.trim()) {
      if (columnKey === 'front' || cfg?.data_col === 'front') {
        script = currentQuestion.content || '';
      } else if (columnKey === 'back' || cfg?.data_col === 'back') {
        script = currentQuestion.explanation || '';
      }
    }

    // Lazily generate audio if it is not yet created on backend, or if audio_url_col is empty
    if (!audioUrl && currentQuestion.id && script && script.trim()) {
      try {
        console.log(`[CLIENT TTS] Requesting Edge TTS audio generation for question ${currentQuestion.id} (${columnKey})...`);
        const res = await axios.get(`/api/v1/deck/generate-audio/${currentQuestion.id}?face=${columnKey}`);
        if (currentQuestionIdRef.current !== targetQuestionId) {
          console.log(`[CLIENT TTS] Question changed. Aborting playback.`);
          return;
        }
        audioUrl = res.data.url;
        if (audioUrl && urlCol) {
          if (!currentQuestion.others) currentQuestion.others = {};
          currentQuestion.others[urlCol] = audioUrl;
          if (columnKey === 'front' || cfg?.data_col === 'front') {
            currentQuestion.audio = audioUrl;
            currentQuestion.front_audio_url = audioUrl;
          }
          if (columnKey === 'back' || cfg?.data_col === 'back') {
            currentQuestion.back_audio_url = audioUrl;
          }
        }
      } catch (err: any) {
        console.error(`[TTS SERVER ERROR] Backend failed to synthesize custom audio file for column ${columnKey}.`, err.message);
      }
    }

    if (audioUrl) {
      const cacheBustedUrl = `${audioUrl}${audioUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
      console.log(`[TTS PLAYBACK] Playing Edge TTS audio: ${cacheBustedUrl}`);
      const audio = new Audio(cacheBustedUrl);
      activeAudioRef.current = audio;
      audio.play().catch(err => {
        console.warn(`[TTS FALLBACK WARNING] Playback of Edge TTS audio file failed:`, err.message);
        if (script && script.trim()) {
          speakWithEdgeTTS(script, lang);
        }
      });
    } else if (script && script.trim()) {
      console.log(`[TTS EDGE STREAM] Streaming Edge TTS dynamically for column ${columnKey}: "${script}"`);
      speakWithEdgeTTS(script, lang);
    }
  };

  const playCardAudio = async (face: 'front' | 'back') => {
    return playColumnAudio(face);
  };

  return {
    autoPlayAudio,
    setAutoPlayAudio,
    playCardAudio,
    playColumnAudio,
    stopAudio,
    isAudioEnabled,
    activeAudioRef
  };
}
