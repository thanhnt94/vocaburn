import { useState, useRef } from 'react';
import axios from 'axios';
import { speakMultiLanguage } from '@/lib/audio';

export type AutoPlayMode = 'always' | 'front' | 'back' | 'none';

export function useFlashcardAudio(currentQuestion: any, practiceSettings?: any) {
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

  const playColumnAudio = async (columnKey: string) => {
    if (!currentQuestion) return;
    const targetQuestionId = currentQuestion.id;
    currentQuestionIdRef.current = targetQuestionId;

    stopAudio();

    // Default front/back handling if columnKey matches front/back
    if (columnKey === 'front') {
      await playCardAudio('front');
      return;
    }
    if (columnKey === 'back') {
      await playCardAudio('back');
      return;
    }

    // Lookup custom pairs
    const pairs = practiceSettings?.audio_pairs || [];
    const pair = pairs.find((p: any) => p.text_col === columnKey);

    let audioUrl = '';
    let script = '';

    if (pair) {
      const urlCol = pair.audio_url_col;
      const contentCol = pair.audio_content_col;

      if (urlCol) {
        audioUrl = currentQuestion[urlCol] || currentQuestion.others?.[urlCol] || '';
      }
      if (contentCol) {
        script = currentQuestion[contentCol] || currentQuestion.others?.[contentCol] || '';
      }
    }

    if (!script || !script.trim()) {
      script = currentQuestion[columnKey] || currentQuestion.others?.[columnKey] || '';
    }

    // Lazily generate audio if it is not yet created on backend, but ONLY if custom script is configured
    if (!audioUrl && currentQuestion.id && script && script.trim() && pair && pair.audio_content_col) {
      try {
        console.log(`[CLIENT TTS] Custom Audio file missing. Requesting generation for question ${currentQuestion.id} (${columnKey})...`);
        const res = await axios.get(`/api/v1/deck/generate-audio/${currentQuestion.id}?face=${columnKey}`);
        if (currentQuestionIdRef.current !== targetQuestionId) {
          console.log(`[CLIENT TTS] Question changed. Aborting playback.`);
          return;
        }
        audioUrl = res.data.url;
        if (audioUrl && pair.audio_url_col) {
          if (!currentQuestion.others) currentQuestion.others = {};
          currentQuestion.others[pair.audio_url_col] = audioUrl;
        }
      } catch (err: any) {
        console.error(`[TTS SERVER ERROR] Backend failed to synthesize custom audio file for column ${columnKey}.`, err.message);
      }
    }

    if (audioUrl) {
      const cacheBustedUrl = `${audioUrl}${audioUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
      console.log(`[TTS PLAYBACK] Playing custom audio: ${cacheBustedUrl}`);
      const audio = new Audio(cacheBustedUrl);
      activeAudioRef.current = audio;
      audio.play().catch(err => {
        console.warn(`[TTS FALLBACK WARNING] Playback of custom audio file failed:`, err.message);
        if (script && script.trim()) {
          if (pair && pair.lang && pair.lang !== 'multi') {
            const u = new SpeechSynthesisUtterance(script);
            const langMap: Record<string, string> = {
              'ja': 'ja-JP', 'vi': 'vi-VN', 'en': 'en-US', 'zh': 'zh-CN', 'ko': 'ko-KR'
            };
            u.lang = langMap[pair.lang] || pair.lang;
            u.rate = 0.85;
            window.speechSynthesis.speak(u);
          } else {
            speakMultiLanguage(script);
          }
        }
      });
    } else if (script && script.trim()) {
      console.warn(`[TTS FALLBACK] Resorting directly to browser Web Speech API for custom column: "${script}"`);
      if (pair && pair.lang && pair.lang !== 'multi') {
        const u = new SpeechSynthesisUtterance(script);
        const langMap: Record<string, string> = {
          'ja': 'ja-JP', 'vi': 'vi-VN', 'en': 'en-US', 'zh': 'zh-CN', 'ko': 'ko-KR'
        };
        u.lang = langMap[pair.lang] || pair.lang;
        u.rate = 0.85;
        window.speechSynthesis.speak(u);
      } else {
        speakMultiLanguage(script);
      }
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

    let script = face === 'front'
      ? (currentQuestion.front_audio_content || currentQuestion.others?.front_audio_content)
      : (currentQuestion.back_audio_content || currentQuestion.others?.back_audio_content);

    // Fallback to front content or back explanation if audio script content is not specified
    if (!script || !script.trim()) {
      if (face === 'front') {
        script = currentQuestion.content;
      } else {
        script = currentQuestion.explanation;
      }
    }

    // Lazily generate audio if it is not yet created on backend, but ONLY if script is present
    if (!audioUrl && currentQuestion.id && script && script.trim()) {
      // If we are using the fallback raw text content, we might not want to save a permanent TTS file 
      // unless it was explicitly configured. But if there is a configured script, do backend TTS:
      const hasConfiguredScript = face === 'front' 
        ? !!(currentQuestion.front_audio_content || currentQuestion.others?.front_audio_content)
        : !!(currentQuestion.back_audio_content || currentQuestion.others?.back_audio_content);

      if (hasConfiguredScript) {
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
    playColumnAudio,
    stopAudio,
    activeAudioRef
  };
}
