import { useState, useRef } from 'react';
import axios from 'axios';
import { speakMultiLanguage } from '@/lib/audio';

export type AutoPlayMode = 'always' | 'front' | 'back' | 'none';

export function useFlashcardAudio(currentQuestion: any) {
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const currentQuestionIdRef = useRef<number | null>(null);

  const [autoPlayAudio, setAutoPlayAudioState] = useState<AutoPlayMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('vocaburn_autoplay_audio') as AutoPlayMode) || 'none';
    }
    return 'none';
  });

  const setAutoPlayAudio = (mode: AutoPlayMode) => {
    setAutoPlayAudioState(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('vocaburn_autoplay_audio', mode);
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

  const playCardAudio = async (face: 'front' | 'back') => {
    if (!currentQuestion) return;
    const targetQuestionId = currentQuestion.id;
    currentQuestionIdRef.current = targetQuestionId;

    // 1. Immediately pause any actively playing server audio and cancel all Web Speech browser utterances
    stopAudio();

    let audioUrl = face === 'front' 
      ? (currentQuestion.audio || currentQuestion.front_audio_url || currentQuestion.others?.front_audio_url)
      : (currentQuestion.back_audio_url || currentQuestion.others?.back_audio_url);

    const script = face === 'front'
      ? (currentQuestion.front_audio_content || currentQuestion.others?.front_audio_content)
      : (currentQuestion.back_audio_content || currentQuestion.others?.back_audio_content);

    // Lazily generate audio if it is not yet created on backend, but ONLY if script is present
    if (!audioUrl && currentQuestion.id && script && script.trim()) {
      try {
        console.log(`[CLIENT TTS] Audio file missing. Requesting generation for question ${currentQuestion.id} (${face})...`);
        const res = await axios.get(`/api/v1/deck/generate-audio/${currentQuestion.id}?face=${face}`);
        if (currentQuestionIdRef.current !== targetQuestionId) {
          console.log(`[CLIENT TTS] Question changed during audio generation. Aborting playback.`);
          return;
        }
        audioUrl = res.data.url;
        if (audioUrl) {
          if (face === 'front') {
            currentQuestion.audio = audioUrl;
          } else {
            if (!currentQuestion.others) currentQuestion.others = {};
            currentQuestion.others.back_audio_url = audioUrl;
          }
        }
      } catch (err: any) {
        console.error(`[TTS SERVER ERROR] Backend failed to synthesize ${face} audio file for question ${currentQuestion.id}. Status:`, err.response?.status, 'Message:', err.response?.data || err.message);
      }
    }

    if (audioUrl) {
      const cacheBustedUrl = `${audioUrl}${audioUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
      console.log(`[TTS PLAYBACK] Playing generated server audio: ${cacheBustedUrl}`);
      const audio = new Audio(cacheBustedUrl);
      activeAudioRef.current = audio;
      audio.play().catch(err => {
        console.warn(`[TTS FALLBACK WARNING] Playback of generated audio file ${cacheBustedUrl} failed. Error:`, err.message);
        
        // Block Web Speech fallback queue buildup if blocked by browser autoplay/interaction policy
        const isAutoplayBlock = err.name === 'NotAllowedError' || err.message?.includes('interact') || err.message?.includes('autoplay');
        if (isAutoplayBlock) {
          console.warn(`[TTS AUTOPLAY BLOCK] Playback blocked by browser autoplay policy. Skipping Web Speech fallback to prevent late voice overlapping.`);
          return;
        }

        if (script && script.trim()) {
          console.warn(`[TTS FALLBACK] Resorting to browser's client-side speech synthesis (Web Speech API) for: "${script}"`);
          speakMultiLanguage(script);
        }
      });
    } else if (script && script.trim()) {
      console.warn(`[TTS FALLBACK] No server-generated audio URL available. Resorting directly to browser client-side Web Speech API for: "${script}"`);
      speakMultiLanguage(script);
    }
  };

  return {
    autoPlayAudio,
    setAutoPlayAudio,
    playCardAudio,
    stopAudio,
    activeAudioRef
  };
}
