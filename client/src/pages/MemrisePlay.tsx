import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAnimation } from 'framer-motion';
import { ChevronLeft, X, Sparkles, ChevronRight } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import type { MemriseCardPayload, MemriseSessionResponse } from '@/types/memrise';
import { PracticeMcqCard, PracticeTypingCard, PracticeListeningCard, MemriseBottomBar, MemrisePetalHUD } from '@/components/practice';
import { Flashcard3DCard } from '@/components/flashcard/Flashcard3DCard';
import { FlashcardQuickControlsSheet } from '@/components/flashcard/FlashcardFlyToolbar';
import { playCorrectSound, playIncorrectSound, cancelAllAudio } from '@/lib/audio';
import { usePracticeAudio, resolveAudioConfig, getCardFieldValue } from '@/hooks/usePracticeAudio';
import { PlaySettingsModal } from '@/components/PlaySettingsModal';
import { usePlaySettings } from '@/hooks/usePlaySettings';
import { selectDistractors } from '@/lib/distractor';
import confetti from 'canvas-confetti';
import { triggerHaptic } from '@/lib/haptic';

const getVal = (item: any, key: string): string => {
  if (!item) return '';
  const rawKey = String(key || '').trim();
  if (!rawKey) return '';
  const keyLower = rawKey.toLowerCase();
  
  if (item[rawKey] !== undefined && item[rawKey] !== null) return String(item[rawKey]);
  if (item[keyLower] !== undefined && item[keyLower] !== null) return String(item[keyLower]);

  if (item.others && typeof item.others === 'object') {
    if (item.others[rawKey] !== undefined && item.others[rawKey] !== null) {
      return String(item.others[rawKey]);
    }
    for (const [k, v] of Object.entries(item.others)) {
      if (k.toLowerCase() === keyLower && v !== undefined && v !== null) {
        return String(v);
      }
    }
  }

  if (keyLower === 'front' || keyLower === 'content') return String(item.front || item.content || '');
  if (keyLower === 'back' || keyLower === 'explanation') return String(item.back || item.explanation || '');
  return '';
};

function extractPair(pair: any, defaultQ: string = 'front', defaultA: string = 'back'): { qKey: string; aKey: string; aKeys: string[] } {
  if (!pair) {
    return { qKey: defaultQ, aKey: defaultA, aKeys: [defaultA] };
  }
  if (typeof pair === 'string') {
    const parts = pair.split(/[-:>➜]/);
    const q = (parts[0] || defaultQ).trim();
    const a = (parts[1] || defaultA).trim();
    return { qKey: q, aKey: a, aKeys: [a] };
  }
  const qKey = String(
    pair.q || pair.prompt_col || pair.question_col || pair.question || pair.from || pair.source || defaultQ
  ).trim();

  const rawA = pair.a !== undefined ? pair.a : (
    pair.answer_col !== undefined ? pair.answer_col : (
      pair.answer !== undefined ? pair.answer : (
        pair.to !== undefined ? pair.to : (
          pair.target !== undefined ? pair.target : defaultA
        )
      )
    )
  );

  let aKeys: string[] = [];
  if (Array.isArray(rawA)) {
    aKeys = rawA.map((x: any) => String(x).trim()).filter(Boolean);
  } else if (typeof rawA === 'string' && rawA.includes(',')) {
    aKeys = rawA.split(',').map((x: string) => x.trim()).filter(Boolean);
  } else if (rawA !== undefined && rawA !== null && String(rawA).trim()) {
    aKeys = [String(rawA).trim()];
  }

  if (aKeys.length === 0) {
    aKeys = [defaultA];
  }

  const aKey = aKeys[0] || defaultA;
  return { qKey, aKey, aKeys };
}

export default function MemrisePlay() {
  const { id, sessionType } = useParams<{ id: string, sessionType: 'plant' | 'water' }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, userSettings } = useAppStore();
  
  const [session, setSession] = useState<MemriseSessionResponse | null>(null);
  const [queue, setQueue] = useState<MemriseCardPayload[]>([]);
  const [bloomedCount, setBloomedCount] = useState(0);
  const [totalCards, setTotalCards] = useState(0);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFinished, setIsFinished] = useState(false);
  
  const [answered, setAnswered] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  
  const [typingInput, setTypingInput] = useState('');
  const [typingFeedback, setTypingFeedback] = useState<{ checked: boolean; isCorrect: boolean } | null>(null);

  // Flashcard3DCard specific dummy states
  const [isFlipped, setIsFlipped] = useState(false);
  const [justAnswered, setJustAnswered] = useState(false);
  const [isQuitModalOpen, setIsQuitModalOpen] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [activeDragGrade, setActiveDragGrade] = useState<any>(null);
  const backScrollRef = useRef<HTMLDivElement | null>(null);
  const cardDragControls = useAnimation();
  
  // Audio configuration
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isQuickControlsOpen, setIsQuickControlsOpen] = useState(false);
  const [modeSettings, setModeSettings] = useState<Record<string, { active_pairs: { q: string, a: string | string[] }[], num_choices?: number }>>({
    mcq: { active_pairs: [{ q: 'front', a: 'back' }], num_choices: 4 },
    typing: { active_pairs: [{ q: 'back', a: ['front'] }] },
    listening: { active_pairs: [{ q: 'front', a: ['front'] }] },
    flashcard: { active_pairs: [{ q: 'front', a: 'back' }] },
    roadmap_test: { active_pairs: [{ q: 'front', a: 'back' }], num_choices: 4 }
  });

  const {
    sfxEnabled, setSfxEnabled, quickLearnEnabled, setQuickLearnEnabled, hapticEnabled, setHapticEnabled,
    showImages, setShowImages, showFsrs, setShowFsrs, randomEnabled, setRandomEnabled,
    autoPlayAudio, setAutoPlayAudio, learningMode, setLearningMode,
    frontValign, setFrontValign, frontHalign, setFrontHalign, frontFontSize, setFrontFontSize,
    backValign, setBackValign, backHalign, setBackHalign, creatorDefaults,
    cardFlipTrigger, setCardFlipTrigger, cardRatingMode, setCardRatingMode,
    isCustomized, settingOrigin, syncStudySettings,
    saveGeneralSettings, resetToCreatorDefaults, saveAsCreatorDefaults
  } = usePlaySettings(id || '', modeSettings, setModeSettings);

  // Timeout ref to allow immediate skip
  const autoNextTimeout = useRef<any>(null);

  const [currentPracticeData, setCurrentPracticeData] = useState<any>(null);
  
  const getStageOrTestType = (card: any) => {
    if (!card) return 1;
    if (sessionType === 'plant') {
      return card.stage || 1;
    } else {
      if (card.test_type === 'mcq') return 2;
      if (card.test_type === 'audio') return 4;
      return 5; // typing
    }
  };

  const currentCard = queue[0] || null;
  const stage = currentCard ? getStageOrTestType(currentCard) : 1;

  const mockQuestion = useMemo(() => {
    if (!currentCard) return null;
    const others = { ...(currentCard.others || {}) };
    if (currentCard.audio_data?.url_col && currentCard.audio_data?.audio_url) {
      others[currentCard.audio_data.url_col] = currentCard.audio_data.audio_url;
    }
    const audioUrl = currentCard.audio_data?.audio_url || others.front_audio_url || others.audio || '';
    return {
      ...currentCard,
      id: currentCard.card_id,
      content: currentCard.front,
      explanation: currentCard.back,
      front: currentCard.front,
      back: currentCard.back,
      audio: audioUrl,
      front_audio_url: others.front_audio_url || audioUrl,
      back_audio_url: others.back_audio_url || '',
      others: others
    } as any;
  }, [currentCard?.card_id, currentCard?.front, currentCard?.back, currentCard?.others, currentCard?.audio_data]);

  const { playCardAudio } = usePracticeAudio({
    currentQuestion: mockQuestion,
    session: session,
    currentPracticeData,
    practiceSettings: session?.practice_settings || creatorDefaults
  });

  useEffect(() => {
    cancelAllAudio();
  }, [currentCard?.card_id, stage]);

  // Auto-play audio when entering Stage 4 (Listening) or Stage 1 (Intro with autoplay)
  useEffect(() => {
    if (stage === 4 && currentPracticeData) {
      const qKey = currentPracticeData.question_key || 'front';
      playCardAudio(qKey);
    } else if (stage === 1 && currentCard) {
      if (autoPlayAudio === 'always' || autoPlayAudio === 'front') {
        playCardAudio('front');
      }
    }
  }, [currentCard?.card_id, stage, currentPracticeData?.question_key, autoPlayAudio]);

  // Keyboard navigation (Space to flip, Space/Enter to advance)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }
      if (e.key === ' ' || e.key === 'Enter') {
        if (stage === 6) {
          e.preventDefault();
          handleAnswerSubmit(true);
        } else if (stage === 1) {
          e.preventDefault();
          if (!isFlipped && e.key === ' ') {
            setIsFlipped(true);
          } else if (isFlipped) {
            handleAnswerSubmit(true);
          }
        } else if (answered) {
          e.preventDefault();
          handleManualNext();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stage, isFlipped, answered, currentCard?.card_id]);

  const handleCardDrag = (_e: any, info: any) => {
    const x = info.offset.x;
    setDragOffset({ x, y: info.offset.y });
    if (Math.abs(x) > 60) {
      setActiveDragGrade({ direction: 'next', label: 'Tiếp tục ➔' });
    } else {
      setActiveDragGrade(null);
    }
  };

  const handleCardDragEnd = (_e: any, info: any) => {
    const threshold = 70;
    const isSwiped = Math.abs(info.offset.x) > threshold || Math.abs(info.velocity.x) > 450;
    if (isSwiped) {
      cardDragControls.start({
        x: info.offset.x > 0 ? 500 : -500,
        opacity: 0,
        transition: { duration: 0.2 }
      }).then(() => {
        cardDragControls.set({ x: 0, y: 0, opacity: 1, rotate: 0 });
        handleAnswerSubmit(true);
      });
    } else {
      cardDragControls.start({ x: 0, y: 0, rotate: 0, transition: { type: 'spring', stiffness: 400, damping: 25 } });
    }
    setDragOffset({ x: 0, y: 0 });
    setActiveDragGrade(null);
  };

  useEffect(() => {
    if (!queue[0]) {
      setCurrentPracticeData(null);
      return;
    }
    const card = queue[0];
    const s = getStageOrTestType(card);

    const mcqPairs: any[] = modeSettings?.mcq?.active_pairs || [];
    const typingPairs: any[] = modeSettings?.typing?.active_pairs || [];
    const listeningPairs: any[] = modeSettings?.listening?.active_pairs || [];

    if (s === 2) {
      // Stage 2: MCQ (Pair 0)
      const pairIndex = (sessionType === 'water' && mcqPairs.length > 1 && card.card_id)
        ? Math.abs(card.card_id) % mcqPairs.length
        : 0;
      const pair = mcqPairs[pairIndex] || mcqPairs[0] || { q: 'front', a: 'back' };
      const { qKey, aKey } = extractPair(pair, 'front', 'back');
      
      const qText = getVal(card, qKey) || getVal(card, 'front');
      const aText = getVal(card, aKey) || getVal(card, 'back');
      
      const distractorPool: any[] = [];
      const numChoices = modeSettings?.mcq?.num_choices || 4;
      
      for (const other of session?.cards || []) {
        if (distractorPool.length >= 20) break;
        if (other.card_id !== card.card_id) {
          const dVal = getVal(other, aKey);
          if (dVal && dVal !== 'nan') {
            distractorPool.push({ 
              text: dVal, 
              id: other.card_id,
              front: getVal(other, 'front'),
              back: getVal(other, 'back'),
              type: other.others?.type || other.others?.pos || '',
              q_text: getVal(other, qKey)
            });
          }
        }
      }
      
      const correctData = { 
        text: aText, 
        id: card.card_id,
        q_text: qText,
        front: getVal(card, 'front'),
        back: getVal(card, 'back'),
        type: card.others?.type || card.others?.pos || '',
        card: card
      };
      const selectedDistractors = selectDistractors(correctData, distractorPool, numChoices - 1);
      const choicesData = [correctData, ...selectedDistractors].sort(() => Math.random() - 0.5);
      const choices = choicesData.map((c: any) => c.text);
      const correctIndex = choices.indexOf(aText);
      
      setCurrentPracticeData({
        question: qText,
        choices,
        correct_index: correctIndex !== -1 ? correctIndex : 0,
        correct_answer: aText,
        question_key: qKey,
        answer_key: aKey,
      });
    } else if (s === 3) {
      // Stage 3: MCQ #2
      // If creator defined >= 2 pairs, pick pair 1 (different from pair 0).
      // If only 1 pair defined, pick pair 0 (strictly NO manual reverse!).
      const pair = (mcqPairs.length > 1 ? mcqPairs[1] : mcqPairs[0]) || { q: 'front', a: 'back' };
      const { qKey, aKey } = extractPair(pair, 'front', 'back');
      
      const qText = getVal(card, qKey) || getVal(card, 'front');
      const aText = getVal(card, aKey) || getVal(card, 'back');
      
      const distractorPool: any[] = [];
      const numChoices = modeSettings?.mcq?.num_choices || 4;
      
      for (const other of session?.cards || []) {
        if (distractorPool.length >= 20) break;
        if (other.card_id !== card.card_id) {
          const dVal = getVal(other, aKey);
          if (dVal && dVal !== 'nan') {
            distractorPool.push({ 
              text: dVal, 
              id: other.card_id,
              front: getVal(other, 'front'),
              back: getVal(other, 'back'),
              type: other.others?.type || other.others?.pos || '',
              q_text: getVal(other, qKey)
            });
          }
        }
      }
      
      const correctData = { 
        text: aText, 
        id: card.card_id,
        q_text: qText,
        front: getVal(card, 'front'),
        back: getVal(card, 'back'),
        type: card.others?.type || card.others?.pos || '',
        card: card
      };
      const selectedDistractors = selectDistractors(correctData, distractorPool, numChoices - 1);
      const choicesData = [correctData, ...selectedDistractors].sort(() => Math.random() - 0.5);
      const choices = choicesData.map((c: any) => c.text);
      const correctIndex = choices.indexOf(aText);
      
      setCurrentPracticeData({
        question: qText,
        choices,
        correct_index: correctIndex !== -1 ? correctIndex : 0,
        correct_answer: aText,
        question_key: qKey,
        answer_key: aKey,
      });
    } else if (s === 4) {
      // Stage 4: Listening / Audio Dictation
      const pairIndex = (sessionType === 'water' && listeningPairs.length > 1 && card.card_id)
        ? Math.abs(card.card_id) % listeningPairs.length
        : 0;
      const pair = listeningPairs[pairIndex] || listeningPairs[0] || { q: 'front', a: ['front'] };
      const { qKey: audioKey, aKeys: ansKeys } = extractPair(pair, 'front', 'front');

      const acceptableAnswers: string[] = [];
      const addAnswer = (v: string) => {
        if (!v) return;
        if (v.includes('|')) {
          v.split('|').forEach(p => {
            const c = p.trim();
            if (c && !acceptableAnswers.includes(c)) acceptableAnswers.push(c);
          });
        } else {
          const c = v.trim();
          if (c && !acceptableAnswers.includes(c)) acceptableAnswers.push(c);
        }
      };

      for (const k of ansKeys) {
        const val = getVal(card, k);
        if (val) addAnswer(val);
      }
      if (acceptableAnswers.length === 0) {
        const fallback = getVal(card, 'front');
        if (fallback) addAnswer(fallback);
      }
      const primaryAns = acceptableAnswers[0] || getVal(card, 'front');
      const effectivePs = session?.practice_settings || modeSettings || {};
      const cfg = resolveAudioConfig(audioKey, effectivePs);
      const audioUrl = card.audio_data?.audio_url || 
                       getCardFieldValue(card, cfg.urlCol) ||
                       getCardFieldValue(card, `${audioKey}_audio_url`) ||
                       card.others?.front_audio_url || 
                       card.others?.back_audio_url || 
                       card.others?.audio || '';

      setCurrentPracticeData({
        question: getVal(card, audioKey) || getVal(card, 'front'),
        correct_answer: primaryAns,
        acceptable_answers: acceptableAnswers,
        audio_url: audioUrl,
        question_key: audioKey,
        answer_key: ansKeys[0] || 'front'
      });
    } else if (s === 5) {
      // Stage 5: Typing / Active Recall Production
      const pairIndex = (sessionType === 'water' && typingPairs.length > 1 && card.card_id)
        ? Math.abs(card.card_id) % typingPairs.length
        : 0;
      const pair = typingPairs[pairIndex] || typingPairs[0] || { q: 'back', a: ['front'] };
      const { qKey, aKeys: ansKeys } = extractPair(pair, 'back', 'front');

      const acceptableAnswers: string[] = [];
      const addAnswer = (v: string) => {
        if (!v) return;
        if (v.includes('|')) {
          v.split('|').forEach(p => {
            const c = p.trim();
            if (c && !acceptableAnswers.includes(c)) acceptableAnswers.push(c);
          });
        } else {
          const c = v.trim();
          if (c && !acceptableAnswers.includes(c)) acceptableAnswers.push(c);
        }
      };

      for (const k of ansKeys) {
        const val = getVal(card, k);
        if (val) addAnswer(val);
      }
      if (acceptableAnswers.length === 0) {
        const fallback = getVal(card, 'front');
        if (fallback) addAnswer(fallback);
      }
      const primaryAns = acceptableAnswers[0] || getVal(card, 'front');

      setCurrentPracticeData({
        question: getVal(card, qKey) || getVal(card, 'back'),
        correct_answer: primaryAns,
        acceptable_answers: acceptableAnswers,
        question_key: qKey,
        answer_key: ansKeys[0] || 'front'
      });
    } else {
      setCurrentPracticeData(null);
    }
  }, [queue[0], modeSettings, session, sessionType]);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        setIsLoading(true);
        const [res, settingsRes] = await Promise.all([
          axios.get(`/api/v1/memrise/${id}/${sessionType}-session`),
          axios.get(`/api/v1/deck/${id}/practice-settings`).catch(() => ({ data: null }))
        ]);

        const isObjNonEmpty = (obj: any) => obj && typeof obj === 'object' && Object.keys(obj).length > 0;
        const creatorSettings = isObjNonEmpty(settingsRes?.data?.creator_settings) ? settingsRes.data.creator_settings : null;
        const userSettings = isObjNonEmpty(settingsRes?.data?.user_settings) ? settingsRes.data.user_settings : null;
        const sessionPracticeSettings = isObjNonEmpty(res?.data?.practice_settings) ? res.data.practice_settings : null;
        const effectiveSettings = {
          ...(sessionPracticeSettings || {}),
          ...(creatorSettings || userSettings || {})
        };

        if (isObjNonEmpty(effectiveSettings)) {
          setModeSettings(prev => ({ ...prev, ...effectiveSettings }));
        }

        if (settingsRes?.data?.effective_study_settings) {
          syncStudySettings(
            settingsRes.data.effective_study_settings,
            settingsRes.data.creator_study_defaults,
            settingsRes.data.user_study_settings,
            settingsRes.data.is_study_customized,
            settingsRes.data.setting_origin
          );
        }

        if (res.data.cards && res.data.cards.length > 0) {
          setSession({
            ...res.data,
            practice_settings: isObjNonEmpty(effectiveSettings) ? effectiveSettings : res.data.practice_settings
          });
          setQueue([...res.data.cards]);
          setTotalCards(res.data.cards.length);
          setBloomedCount(0);
        } else {
          setIsFinished(true);
          setError(res.data.message || 'No cards found for this session.');
        }
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to load session');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (id && sessionType) {
      fetchSession();
    }
  }, [id, sessionType]);

  const advanceQueue = (isCorrect: boolean, answeredCard: MemriseCardPayload) => {
    const newQueue = [...queue];
    newQueue.shift(); // remove from front

    if (isCorrect) {
      if (answeredCard.stage === 6) {
        // It was shown as Bloomed, now we remove it
        setBloomedCount(prev => prev + 1);
      } else {
        answeredCard.stage = (answeredCard.stage || 1) + 1;
        if (answeredCard.stage <= 6) {
          if (answeredCard.stage === 6) {
            // Reached stage 6, show it immediately so user sees the bloom
            newQueue.splice(0, 0, answeredCard);
          } else {
            const insertPos = Math.min(3, newQueue.length);
            newQueue.splice(insertPos, 0, answeredCard);
          }
        } else {
          setBloomedCount(prev => prev + 1);
        }
      }
    } else {
      answeredCard.stage = 1; // reset to introduction
      const insertPos = Math.min(1, newQueue.length);
      newQueue.splice(insertPos, 0, answeredCard);
    }
    
    setQueue(newQueue);
    if (newQueue.length === 0 && (!isCorrect || answeredCard.stage !== 6)) {
      setIsFinished(true);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }

    setAnswered(false);
    setSelectedOption(null);
    setTypingInput('');
    setTypingFeedback(null);
    setIsFlipped(false);
    setJustAnswered(false);
  };

  const handleAnswerSubmit = (isCorrect: boolean) => {
    if (queue.length === 0) return;
    const card = queue[0];
    
    if (isCorrect) {
      if ((userSettings as any)?.sound_effects_enabled !== false) playCorrectSound();
      if (hapticEnabled) triggerHaptic('success');
      
      const confettiColors = ['#6366f1', '#a855f7', '#ec4899'];
      confetti({ zIndex: 9999, particleCount: 100, spread: 60, origin: { y: 0.6 }, colors: confettiColors });
    } else {
      if ((userSettings as any)?.sound_effects_enabled !== false) playIncorrectSound();
      if (hapticEnabled) triggerHaptic('error');
    }
    
    // Fire and forget stats update (skip if stage === 6 because card bloomed on stage 5)
    if (card.stage !== 6) {
      axios.post('/api/v1/memrise/submit-answer', {
        card_id: card.card_id,
        is_correct: isCorrect,
        session_type: sessionType
      }).catch(e => console.error("Failed to submit answer", e));
    }
    
    if (autoNextTimeout.current) clearTimeout(autoNextTimeout.current);
    if (card.stage === 1 || card.stage === 6) {
      advanceQueue(isCorrect, card);
    } else {
      autoNextTimeout.current = setTimeout(() => {
        advanceQueue(isCorrect, card);
      }, 1500);
    }
  };

  const handleManualNext = () => {
    if (autoNextTimeout.current) {
      clearTimeout(autoNextTimeout.current);
    }
    if (queue.length > 0) {
      const card = queue[0];
      const s = getStageOrTestType(card);
      let isCorrect = true;
      if (s === 2 || s === 3) {
        isCorrect = selectedOption !== null && selectedOption === currentPracticeData?.correct_index;
      } else if (s === 4 || s === 5) {
        isCorrect = !!typingFeedback?.isCorrect;
      }
      advanceQueue(isCorrect, card);
    }
  };

  const handleMcqSelect = (idx: number) => {
    if (answered || queue.length === 0) return;
    setAnswered(true);
    setSelectedOption(idx);
    const isCorrect = idx === currentPracticeData?.correct_index;
    handleAnswerSubmit(isCorrect);
  };

  const handleTypingCheck = () => {
    if (answered || queue.length === 0) return;
    setAnswered(true);
    const card = queue[0];
    const data = currentPracticeData || card.typing_data || card.listening_data;
    const cleanInput = typingInput.trim().toLowerCase();
    const correctAnswers = data?.acceptable_answers && data.acceptable_answers.length > 0
      ? data.acceptable_answers
      : [data?.correct_answer || ''];
    const isCorrect = correctAnswers.some((a: string) => {
      if (!a) return false;
      const cleanA = a.replace(/<[^>]+>/g, '').trim().toLowerCase();
      if (cleanA.includes('|')) {
        return cleanA.split('|').some(p => p.trim() === cleanInput);
      }
      return cleanA === cleanInput;
    });
    
    setTypingFeedback({ checked: true, isCorrect });
    handleAnswerSubmit(isCorrect);
  };

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (isFinished || error) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <h2 className="text-2xl font-bold text-slate-800 mb-4">
          {error || 'Session Complete! 🎉'}
        </h2>
        <button 
          onClick={() => navigate(`/deck/${id}`)}
          className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 active:scale-95 transition-all"
        >
          Return to Deck
        </button>
      </div>
    );
  }

  if (!currentCard) return null;

  return (
    <div className="fixed inset-0 bg-slate-50 flex flex-col h-[100dvh] overflow-hidden">
      {/* Per-Card Stage Tracker HUD */}
      {/* Top Petal HUD & Progress Header */}
      <MemrisePetalHUD
        stage={stage}
        bloomedCount={bloomedCount}
        totalCards={totalCards}
        sessionType={sessionType}
        onOpenQuitModal={() => setIsQuitModalOpen(true)}
      />
      
      {/* Play Area */}
      <div className="flex-1 relative overflow-y-auto w-full max-w-2xl mx-auto p-4 flex flex-col min-h-0">
        {stage === 6 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-500 pb-16 max-w-md mx-auto">
            <div className="text-[100px] sm:text-[120px] mb-4 drop-shadow-2xl animate-bounce">🌺</div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-black text-xs uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>ĐÃ NỞ HOA HOÀN TẤT!</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-1">
              {currentCard.front}
            </h2>
            <p className="text-base font-semibold text-slate-500 dark:text-slate-400 mb-8 px-4">
              {currentCard.back}
            </p>
            <button
              type="button"
              onClick={() => handleAnswerSubmit(true)}
              className="w-full py-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-sm rounded-2xl shadow-xl shadow-emerald-200 dark:shadow-none flex items-center justify-center gap-2 uppercase tracking-widest active:scale-[0.98] transition-all cursor-pointer"
            >
              <span>TIẾP TỤC BÀI HỌC</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        ) : stage === 1 ? (
          <div className="flex-1 min-h-0 flex flex-col relative w-full h-full pb-16">
            <Flashcard3DCard
              key={currentCard.card_id}
              currentQuestion={mockQuestion}
              currentIndex={0}
              isFlipped={isFlipped}
              setIsFlipped={setIsFlipped}
              isSelectMode={false}
              effectiveCardFlipTrigger="tap"
              setIsFlyToolbarOpen={() => {}}
              setShowFeedback={() => {}}
              setJustAnswered={setJustAnswered}
              handleStarQuestion={() => {}}
              frontValign={frontValign as any}
              frontHalign={frontHalign as any}
              frontFontSize={frontFontSize as any}
              backValign={backValign as any}
              backHalign={backHalign as any}
              showImages={showImages as any}
              setZoomedImage={() => {}}
              effectiveShowFsrs={false}
              selectedOption={null}
              hasRated={false}
              activeDragGrade={activeDragGrade}
              dragOffset={dragOffset}
              canDragRate={true}
              hasBackOverflow={false}
              backScrollRef={backScrollRef}
              handleCardDrag={handleCardDrag}
              handleCardDragEnd={handleCardDragEnd}
              cardDragControls={cardDragControls}
              activeMasteryUpgrade={null}
              currentTime={new Date()}
              showAbsoluteFirst={false}
              setShowAbsoluteFirst={() => {}}
              showAbsoluteLast={false}
              setShowAbsoluteLast={() => {}}
              renderFlyToolbarNode={() => null}
            />
          </div>
        ) : stage === 2 || stage === 3 ? (
          <PracticeMcqCard
             currentIndex={0}
             currentQuestion={mockQuestion}
             practiceData={currentPracticeData || (stage === 3 ? currentCard.mcq_rev_data : currentCard.mcq_data)}
             answered={answered}
             selectedOption={selectedOption}
             starredCards={{}}
             onToggleStar={() => {}}
             onSelectOption={handleMcqSelect}
             onPreviewInsight={() => {}}
             onPlayAudio={(face, rate) => playCardAudio(currentPracticeData?.question_key || face || 'front', rate || 1.0)}
          />
        ) : stage === 4 ? (
          <PracticeListeningCard
             currentIndex={0}
             currentQuestion={mockQuestion}
             practiceData={currentPracticeData || currentCard.listening_data}
             answered={answered}
             typingInput={typingInput}
             setTypingInput={setTypingInput}
             typingFeedback={typingFeedback}
             starredCards={{}}
             onToggleStar={() => {}}
             onCheckTyping={handleTypingCheck}
             onPlayAudio={(face, rate) => playCardAudio(currentPracticeData?.question_key || face || 'front', rate || 1.0)}
          />
        ) : (
          <PracticeTypingCard
             currentIndex={0}
             currentQuestion={mockQuestion}
             practiceData={currentPracticeData || currentCard.typing_data}
             answered={answered}
             typingInput={typingInput}
             setTypingInput={setTypingInput}
             typingFeedback={typingFeedback}
             starredCards={{}}
             onToggleStar={() => {}}
             onCheckTyping={handleTypingCheck}
          />
        )}
      </div>

      {/* Footer for all modes */}
      <MemriseBottomBar
        baseMode={stage === 6 ? 'flashcard' : stage === 1 ? 'flashcard' : stage === 5 ? 'typing' : stage === 4 ? 'listening' : 'mcq'}
        typingInput={typingInput}
        setTypingInput={setTypingInput}
        onCheckTyping={handleTypingCheck}
        currentIndex={0}
        hasAnswered={stage === 6 ? true : answered}
        currentQuestion={mockQuestion}
        isFlipped={stage === 6 ? true : isFlipped}
        justAnswered={justAnswered}
        onOpenSettings={() => setIsQuickControlsOpen(true)}
        onPlayAudio={() => playCardAudio(isFlipped ? 'back' : 'front')}
        onOpenFeedback={() => {}}
        onNext={() => {
          if (stage === 1 || stage === 6) handleAnswerSubmit(true);
          else handleManualNext();
        }}
        onFlip={() => setIsFlipped(!isFlipped)}
      />

      <FlashcardQuickControlsSheet
        isOpen={isQuickControlsOpen}
        onClose={() => setIsQuickControlsOpen(false)}
        autoPlayAudio={autoPlayAudio as any}
        setAutoPlayAudio={setAutoPlayAudio as any}
        sfxEnabled={sfxEnabled}
        setSfxEnabled={setSfxEnabled}
        effectiveAutoAdvance={quickLearnEnabled}
        setIsAutoAdvance={setQuickLearnEnabled}
        setQuickLearnEnabled={setQuickLearnEnabled}
        showImages={showImages}
        setShowImages={setShowImages}
        randomEnabled={randomEnabled}
        setRandomEnabled={setRandomEnabled}
        isSelectMode={false}
        setIsSelectMode={() => {}}
        currentQuestion={mockQuestion}
        handleStarQuestion={() => {}}
        showFlipBackBtn={true}
        setIsFlipped={setIsFlipped}
        setIsSettingsModalOpen={setIsSettingsModalOpen}
        activeMode={undefined}
        onSelectMode={undefined}
        ratingMode={undefined}
        onCycleRatingMode={undefined}
        swipeToRate={true}
        onToggleSwipeToRate={() => {}}
        showActionDock={true}
        onToggleActionDock={() => {}}
        hapticEnabled={hapticEnabled}
        setHapticEnabled={setHapticEnabled}
        triggerHaptic={() => {}}
        frontFontSize={frontFontSize}
        setFrontFontSize={setFrontFontSize}
        frontHalign={frontHalign}
        setFrontHalign={setFrontHalign}
        canEdit={false}
        onOpenEditModal={undefined}
        onOpenCardHub={undefined}
        handleToggleHint={undefined}
        showingHint={false}
        showFsrs={undefined}
        setShowFsrs={undefined}
      />

      <PlaySettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        activeMode={learningMode}
        applyLearningMode={setLearningMode}
        sfxEnabled={sfxEnabled}
        setSfxEnabled={setSfxEnabled}
        quickLearnEnabled={quickLearnEnabled}
        setQuickLearnEnabled={setQuickLearnEnabled}
        hapticEnabled={hapticEnabled}
        setHapticEnabled={setHapticEnabled}
        showImages={showImages}
        setShowImages={setShowImages}
        showFsrs={showFsrs}
        setShowFsrs={setShowFsrs}
        randomEnabled={randomEnabled}
        setRandomEnabled={setRandomEnabled}
        autoPlayAudio={autoPlayAudio}
        setAutoPlayAudio={setAutoPlayAudio}
        frontValign={frontValign}
        setFrontValign={setFrontValign}
        frontHalign={frontHalign}
        setFrontHalign={setFrontHalign}
        frontFontSize={frontFontSize}
        setFrontFontSize={setFrontFontSize}
        backValign={backValign}
        setBackValign={setBackValign}
        backHalign={backHalign}
        setBackHalign={setBackHalign}
        cardFlipTrigger={cardFlipTrigger}
        setCardFlipTrigger={setCardFlipTrigger}
        cardRatingMode={cardRatingMode}
        setCardRatingMode={setCardRatingMode}
        isCustomized={isCustomized}
        settingOrigin={settingOrigin}
        onSaveAsCreatorDefaults={saveAsCreatorDefaults}
        onResetToCreatorDefaults={resetToCreatorDefaults}
        modeSettings={modeSettings}
        setModeSettings={setModeSettings}
      />

      {/* ── Quit / Pause Session Confirmation Modal ── */}
      {isQuitModalOpen && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center text-3xl mx-auto shadow-xs">
              🌱
            </div>
            
            <div className="text-center space-y-1.5">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Tạm dừng phiên học?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed px-2">
                Tiến độ của các từ bạn đã học tới bước hiện tại đã được <span className="text-emerald-600 dark:text-emerald-400 font-bold">tự động lưu vào hệ thống</span>. Bạn có thể quay lại tiếp tục bất kỳ lúc nào mà không sợ mất bài.
              </p>
            </div>

            {/* Quick Stats in Modal */}
            <div className="grid grid-cols-2 gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 text-center">
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Đã nở hoa</span>
                <span className="text-base font-black text-emerald-600">{bloomedCount} / {totalCards} từ</span>
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Đang gieo mầm</span>
                <span className="text-base font-black text-amber-500">{queue.length} từ</span>
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsQuitModalOpen(false)}
                className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-black text-xs rounded-xl shadow-sm transition-all cursor-pointer"
              >
                Tiếp tục học
              </button>
              <button
                type="button"
                onClick={() => navigate(`/deck/${id}`)}
                className="px-4 py-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-95 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Tạm dừng & Thoát
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
