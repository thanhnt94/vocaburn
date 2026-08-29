import { useState, useEffect, useRef, useMemo } from 'react'
import confetti from 'canvas-confetti'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, ChevronDown, LayoutGrid, Timer, Flame, Trophy, Check, X, Sparkles, Lightbulb, StickyNote, Play, Target, CheckCircle2, XCircle, Clock, BookOpen, Hash, Copy, Edit3, Brain, FileText, HelpCircle, Sliders, ListOrdered, Shuffle, Eye, EyeOff, AlertCircle, TrendingUp, Award, Lock, Keyboard, Volume2, VolumeX, RefreshCw, Undo2, Settings, Star, Zap, ArrowRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'
import { playCorrectSound, playIncorrectSound, speakMultiLanguage, cancelAllAudio } from '@/lib/audio'
import { triggerHaptic } from '@/lib/haptic'
import { parseBBCodeToHtml, stripBBCode, isJapanese, getJpPattern, extractTokens, tokensOverlapHigh } from '@/lib/text'
import { selectDistractors } from '@/lib/distractor'
import { MarkdownComponents } from '@/lib/markdown'
import {
  parseUTCDate,
  formatRelativeTime,
  formatOverdueTime,
  getMapTitleInfo,
  getCardBoxId,
  getMasteryPill,
  getBadgeIcon,
  formatHeaderTime
} from '@/lib/flashcard-utils'
import type { Option, Question } from '@/types/flashcard'
import { TypewriterText } from '@/components/TypewriterText'
import { FeedbackArea } from '@/components/FeedbackArea'
import { PracticeSetupScreen } from '@/components/PracticeSetupScreen'
import { QuestionMapGrid } from '@/components/QuestionMapGrid'
import { MilestoneCelebration } from '@/components/MilestoneCelebration'
import { useFlashcardAudio } from '@/hooks/useFlashcardAudio'
import { useSessionStats } from '@/hooks/useSessionStats'
import { usePracticeMode } from '@/hooks/usePracticeMode'
import { FSRSActionButtons } from '@/components/FSRSActionButtons'
import { FlashcardEditModal } from '@/components/FlashcardEditModal'
import DailyComparisonChart from '@/components/DailyComparisonChart'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { usePlaySettings } from '@/hooks/usePlaySettings'
import { PlaySettingsModal } from '@/components/PlaySettingsModal'
import { PlaySessionSummary } from '@/components/PlaySessionSummary'
import { PlayStatsDrawer } from '@/components/PlayStatsDrawer'
import { BadgeUnlockOverlay } from '@/components/BadgeUnlockOverlay'
import { useRoadmapStatus, type PipelineStepStatus } from '@/hooks/useRoadmapStatus'
import { RoadmapFloatingBanner } from '@/components/RoadmapFloatingBanner'
import { StudyHeaderTracker } from '@/components/StudyHeaderTracker'
import {
  TimerWidget,
  SessionLoadingScreen,
  FsrsCompleteScreen,
  RoadmapCompleteScreen,
  StudyConsoleModal,
  ImageZoomOverlay,
  FloatingToasts,
  GoalCelebrationModal,
  QuitSessionModal,
  SessionStatsWidget,
  FlashcardHeader
} from '@/components/flashcard'
import { useLeaderboard } from '@/hooks/useLeaderboard'
import { useCardAI } from '@/hooks/useCardAI'

export default function FlashcardPlay() {
  const { id, mode, subMode } = useParams()
  const navigate = useNavigate()
  const { user, gamify, setUser, setGamify, addXp } = useAppStore()

  const [isHeaderSurging, setIsHeaderSurging] = useState(false)

  const {
    status: roadmapStatus,
    refetchRoadmap,
    showBanner,
    dismissBanner,
    justCompletedStep,
    isRoadmapActive,
    isAllDone: isRoadmapAllDone,
    nextActionUrl,
    nextActionLabel
  } = useRoadmapStatus(id)
  
  const { userSettings, updateUserSettings } = useAppStore()
  const [session, setSession] = useState<any>(null)
  const [currentIndex, setCurrentIndex] = useState(-1)
  const [showAbsoluteFirst, setShowAbsoluteFirst] = useState(false)
  const [showAbsoluteLast, setShowAbsoluteLast] = useState(false)
  const [showingHint, setShowingHint] = useState(false)
  const [isAskingHint, setIsAskingHint] = useState(false)
  const [isUtilityMenuOpen, setIsUtilityMenuOpen] = useState(false)

  useEffect(() => {
    if (id && id !== 'quick' && !isNaN(Number(id))) {
      updateUserSettings({ last_deck_id: Number(id) });
    }
  }, [id]);

  useEffect(() => {
    if (!isUtilityMenuOpen) return;
    const handleGlobalClick = () => setIsUtilityMenuOpen(false);
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, [isUtilityMenuOpen]);

  useEffect(() => {
    setShowAbsoluteFirst(false)
    setShowAbsoluteLast(false)
    setShowingHint(false)
  }, [currentIndex])

  // Asset preloading for the next card (image & audio)
  useEffect(() => {
    if (!session?.questions || currentIndex < 0) return;
    const nextIdx = currentIndex + 1;
    if (nextIdx >= session.questions.length) return;
    
    const nextQ = session.questions[nextIdx];
    if (!nextQ) return;
    
    // Preload audio
    const audioUrls = [
      nextQ.front_audio_url,
      nextQ.back_audio_url,
      nextQ.audio
    ].filter(Boolean) as string[];
    
    audioUrls.forEach(url => {
      try {
        const audio = new Audio();
        audio.src = url;
        audio.preload = 'auto';
      } catch (e) {
        // Silently catch audio construction errors if any
      }
    });
    
    // Preload images
    const imgUrls = [
      nextQ.image,
      nextQ.front_img,
      nextQ.back_img
    ].filter(Boolean) as string[];
    
    imgUrls.forEach(url => {
      try {
        const img = new Image();
        img.src = url;
      } catch (e) {
        // Silently catch image preloading errors
      }
    });
  }, [currentIndex, session?.questions]);
  const currentQuestion: Question | null = session?.questions?.[currentIndex] || null
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const [isFlipped, setIsFlipped] = useState(false)
  const [zoomedImage, setZoomedImage] = useState<string | null>(null)
  const [badgeVisible, setBadgeVisible] = useState(false)
  const [badgeMessage, setBadgeMessage] = useState("")

  useEffect(() => {
    if (isFlipped) {
      setShowingHint(false)
    }
  }, [isFlipped])
  
  // Toast Notification System
  const [localToast, setLocalToast] = useState<{
    visible: boolean;
    message: string;
    type: 'success' | 'warning' | 'error';
  }>({ visible: false, message: '', type: 'success' })

  const showLocalToast = (message: string, type: 'success' | 'warning' | 'error' = 'success') => {
    setLocalToast({ visible: true, message, type })
    setTimeout(() => {
      setLocalToast(prev => ({ ...prev, visible: false }))
    }, 4500)
  }
  
  const mainTab = 'fsrs' as 'fsrs' | 'practice'
  const setMainTab = (tab: 'fsrs' | 'practice') => {}

  // --- Custom Hooks ---


  const {
    streak,
    setStreak,
    sessionXP,
    setSessionXP,
    xpFloat,
    setXpFloat,
    milestonesHit,
    setMilestonesHit,
    goalToast,
    setGoalToast,
    activeMilestone,
    setActiveMilestone,
    answerContext,
    setAnswerContext,
    resetStats,
    updateXPFlow,
    triggerStreakConfetti,
    checkSessionMilestones,
    showGoalToastUpdate
  } = useSessionStats()

  const {
    practiceSubMode,
    setPracticeSubMode,
    practiceRange,
    setPracticeRange,
    practiceNeedsSetup,
    setPracticeNeedsSetup,
    practiceDisabled,
    setPracticeDisabled,
    setupPairs,
    setSetupPairs,
    setupNumChoices,
    setSetupNumChoices,
    typingInput,
    setTypingInput,
    typingFeedback,
    setTypingFeedback,
    currentPracticeData,
    setCurrentPracticeData,
    modeSettings,
    setModeSettings,
    practiceTotalAnswered,
    setPracticeTotalAnswered,
    practiceCorrectCount,
    setPracticeCorrectCount,
    practiceAnswers,
    setPracticeAnswers,
    generatePracticeQuestion,
    resetPractice
  } = usePracticeMode(session, currentIndex, mainTab)

  const {
    autoPlayAudio,
    setAutoPlayAudio,
    playCardAudio,
    stopAudio,
    activeAudioRef,
    isAudioEnabled
  } = useFlashcardAudio(currentQuestion, modeSettings)

  const [initialTotalXP, setInitialTotalXP] = useState(0)
  const timeLeftRef = useRef(0)
  const sessionStudyTimeRef = useRef(0)
  const [initialTodayXP, setInitialTodayXP] = useState(0)
  const [initialTodayTime, setInitialTodayTime] = useState(0)
  const [initialAllTimeTime, setInitialAllTimeTime] = useState(0)
  const scoreMode = userSettings.score_mode || 'all'
  const timeMode = userSettings.time_mode || 'card'

  const toggleScoreMode = () => {
    const nextMode = scoreMode === 'all' ? 'today' : 'all'
    updateUserSettings({ score_mode: nextMode })
  }

  const toggleTimeMode = () => {
    let nextMode: 'card' | 'today' | 'all' = 'today'
    if (timeMode === 'card') nextMode = 'today'
    else if (timeMode === 'today') nextMode = 'all'
    else nextMode = 'card'
    updateUserSettings({ time_mode: nextMode })
  }

  const {
    isAskingAI,
    personalNote,
    setPersonalNote,
    isEditingNote,
    setIsEditingNote,
    isEditingAI,
    setIsEditingAI,
    isEditingInsight,
    setIsEditingInsight,
    insightInput,
    setInsightInput,
    aiInput,
    setAiInput,
    isEditingPrompt,
    setIsEditingPrompt,
    promptInput,
    setPromptInput,
    fetchNote,
    saveNote,
    askAI,
    savePrompt,
    clearAIExplanation,
    getInsightText,
    saveInsight
  } = useCardAI({
    deckId: id,
    session,
    setSession,
    currentQuestion,
    currentIndex
  })

  const [isCopyMenuOpen, setIsCopyMenuOpen] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [isMapOpen, setIsMapOpen] = useState(false)
  const [mobileMapFilterMode, setMobileMapFilterMode] = useState<'all' | 'unseen' | 'learning' | 'mastered' | 'hard' | 'starred' | 'ignored'>('all')
  const [isStatsOpen, setIsStatsOpen] = useState(false)
  const [activeStatsTab, setActiveStatsTab] = useState<'performance' | 'goals' | 'leaderboard'>('performance')
  const [dailyComparisonData, setDailyComparisonData] = useState<any[] | null>(null)
  const [dailyComparisonAvg, setDailyComparisonAvg] = useState<any | null>(null)
  const [isDailyComparisonLoading, setIsDailyComparisonLoading] = useState(true)
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false)
  const [isQuitModalOpen, setIsQuitModalOpen] = useState(false)
  const [activeFeedbackTab, setActiveFeedbackTab] = useState<'insight' | 'community' | 'note' | 'card'>('insight')
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [activeUnlockedBadge, setActiveUnlockedBadge] = useState<any | null>(null)
  const [activeMasteryUpgrade, setActiveMasteryUpgrade] = useState<any | null>(null)
  const [editFormData, setEditFormData] = useState<any>(null)
  const [sessionAnswers, setSessionAnswers] = useState<Record<number, number | number[]>>({})
  
  // ── Engagement State ──
  const [isSessionSummaryOpen, setIsSessionSummaryOpen] = useState(false)
  const [currentStatIndex, setCurrentStatIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStatIndex((prev) => (prev + 1) % 4)
    }, 3500)
    return () => clearInterval(interval)
  }, [])
  const [activeGoal, setActiveGoal] = useState<any>(null)
  const [showGoalCelebration, setShowGoalCelebration] = useState(false)
  const [isLimitlessStrike, setIsLimitlessStrike] = useState(false)
  const [activeMode, setActiveMode] = useState<string>(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const urlMode = searchParams.get('mode');
    if (urlMode === 'new' || urlMode === 'fsrs' || urlMode === 'roadmap' || urlMode === 'review') {
      return urlMode;
    }
    return userSettings.quiz_learning_mode || 'fsrs';
  })
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [showRoadmapCompleteModal, setShowRoadmapCompleteModal] = useState<boolean>(false);
  const [headerViewMode, setHeaderViewMode] = useState<0 | 1>(0);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const urlMode = searchParams.get('mode');
    if (urlMode === 'new' || urlMode === 'fsrs' || urlMode === 'roadmap' || urlMode === 'review') {
      updateUserSettings({ quiz_learning_mode: urlMode as any });
    }
  }, [])

  useEffect(() => {
    cancelAllAudio();
  }, [currentIndex]);

  const fetchRoadmapStatus = () => refetchRoadmap();

  const activeBottomTab = isMapOpen ? 'map' : (isStatsOpen ? 'stats' : 'flashcard');

  const {
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
  } = usePlaySettings(id || '', modeSettings, setModeSettings, activeMode, autoPlayAudio);
  const [learningModeAlert, setLearningModeAlert] = useState<{
    visible: boolean;
    message: string;
    type?: 'info' | 'warning';
  } | null>(null)
  const [justAnswered, setJustAnswered] = useState(false)
  const [availableColumns, setAvailableColumns] = useState<string[]>([])

  const undoInProgressRef = useRef<boolean>(false)
  const touchStartXRef = useRef<number | null>(null)
  const touchStartYRef = useRef<number | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartXRef.current = touch.clientX;
    touchStartYRef.current = touch.clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    
    const touch = e.changedTouches[0];
    const diffX = touch.clientX - touchStartXRef.current;
    const diffY = touch.clientY - touchStartYRef.current;
    
    // Swipe horizontal of at least 60px and vertical movement less than 50px
    if (Math.abs(diffX) > 60 && Math.abs(diffY) < 50) {
      setIsFlipped(prev => {
        const nextFlipped = !prev;
        if (nextFlipped) {
          setShowFeedback(true);
          setJustAnswered(true);
        }
        return nextFlipped;
      });
    }
    
    touchStartXRef.current = null;
    touchStartYRef.current = null;
  };

  const [activelyRatedCurrentCard, setActivelyRatedCurrentCard] = useState<boolean>(false)
  const [prevStreakBeforeRating, setPrevStreakBeforeRating] = useState<number>(0)
  const [fsrsCompletionData, setFsrsCompletionData] = useState<any>(null)

  const {
    leaderboardTimeFilter,
    setLeaderboardTimeFilter,
    leaderboardType,
    setLeaderboardType,
    leaderboardData,
    setLeaderboardData,
    isLeaderboardLoading,
    xpLeaderboard,
    userRank,
    userValue,
    leaderboardMsg,
    getUnitName
  } = useLeaderboard()



  // Autoplay Audio Effect
  useEffect(() => {
    if (!currentQuestion) return;
    
    if (isFlipped) {
      if (autoPlayAudio === 'always' || autoPlayAudio === 'back') {
        playCardAudio('back');
      }
    } else {
      if (autoPlayAudio === 'always' || autoPlayAudio === 'front') {
        playCardAudio('front');
      }
    }
  }, [currentIndex, isFlipped, currentQuestion?.id, autoPlayAudio]);

  const [currentTime, setCurrentTime] = useState(new Date())
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])


  const isCardUnlocked = (() => {
    if (!currentQuestion || !currentQuestion.fsrs || !currentQuestion.fsrs.due) return true;
    // Clock drift safety buffer of 30 seconds
    return parseUTCDate(currentQuestion.fsrs.due).getTime() - 30000 <= currentTime.getTime();
  })()

  const dueCardsCount = useMemo(() => {
    const isFsrsMode = activeMode === 'fsrs' || (activeMode === 'roadmap' && roadmapStatus?.pipeline?.[roadmapStatus?.current_step_index || 0]?.type === 'fsrs_review');
    if (!session || !session.questions || !isFsrsMode) return 0;
    const now = currentTime.getTime();
    return session.questions.filter((q: any, idx: number) => {
      if (q.is_ignored) return false;
      const isFsrsRecord = q.fsrs && q.fsrs.state !== 0 && q.fsrs.stability !== null;
      if (!isFsrsRecord) return false;
      
      const isDue = parseUTCDate(q.fsrs.due).getTime() - 30000 <= now;
      const hasAnswered = sessionAnswers[idx] !== undefined;
      
      if (hasAnswered && !isDue) return false;
      return isDue;
    }).length;
  }, [session, activeMode, currentTime, sessionAnswers, roadmapStatus]);

  const hasRated = activelyRatedCurrentCard || (sessionAnswers[currentIndex] !== undefined && !isCardUnlocked)

  const getFilteredCount = (mode: string) => {
    if (!session?.questions) return 0;
    if (mode === 'all') return session.questions.length;
    return session.questions.filter((q: any) => getCardBoxId(q) === mode).length;
  };

  const canEdit = user?.role === 'admin' || user?.id === 1 || session?.creator_id === user?.id || session?.is_collaborator


  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const urlMode = searchParams.get('mode');
    if (urlMode === 'new' || urlMode === 'fsrs' || urlMode === 'roadmap') {
      saveGeneralSettings({ learning_mode: urlMode });
    }
    fetchSession()
    fetchRoadmapStatus()
  }, [id])

  // Tự động đóng toàn bộ các popup/toast khi người dùng click mở bất kỳ khung thông tin hoặc modal phụ nào
  useEffect(() => {
    if (isFeedbackOpen || isMapOpen || isStatsOpen || isEditModalOpen || isQuitModalOpen || isSessionSummaryOpen) {
      setGoalToast(prev => prev ? { ...prev, visible: false } : null)
      setShowGoalCelebration(false)
      setBadgeVisible(false)
      setActiveUnlockedBadge(null)
      setActiveMasteryUpgrade(null)
      setLearningModeAlert(null)
    }
  }, [isFeedbackOpen, isMapOpen, isStatsOpen, isEditModalOpen, isQuitModalOpen, isSessionSummaryOpen])





  useEffect(() => {
    if (currentQuestion) {
      fetchNote()
    }
  }, [currentIndex, currentQuestion])

  useEffect(() => {
    if (mainTab === 'practice' && practiceSubMode === 'listening' && currentPracticeData) {
      const { question, question_key } = currentPracticeData;
      if (question_key === 'front') {
        playCardAudio('front');
      } else if (question_key === 'back') {
        playCardAudio('back');
      } else {
        speakMultiLanguage(question);
      }
    }
  }, [currentIndex, mainTab, practiceSubMode, currentPracticeData])

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await axios.get('/api/v1/dashboard/data')
        if (!user) setUser(res.data.user)
        setGamify(res.data.gamify)
      } catch (e) {
        console.error("Failed to fetch user dashboard data:", e)
      }
    }
    fetchUser()
  }, [user, setUser, setGamify])

  const fetchSession = async (activeTab: 'fsrs' | 'practice' = mainTab, subMode = practiceSubMode) => {
    try {
      const modeParam = activeTab === 'practice' ? `?mode=${subMode}` : ''
      const isPractice = activeTab === 'practice'
      
      // 1. Core quiz data load: fetched immediately to show flashcards instantly
      const fetchUrl = id === 'quick' ? '/api/v1/deck/quick-play-data' : `/api/v1/deck/${id}/play-data${modeParam}`
      const quizRes = await axios.get(fetchUrl)
      const questions = quizRes.data.questions || []
      setSession({ ...quizRes.data, questions })

      if (quizRes.data.user_settings) {
        const uSet = quizRes.data.user_settings;
        if (uSet.sfx_enabled !== undefined) {
          setSfxEnabled(uSet.sfx_enabled);
          updateUserSettings({ sfx_enabled: uSet.sfx_enabled });
        }
        if (uSet.autoplay_audio !== undefined) {
          setAutoPlayAudio(uSet.autoplay_audio);
          updateUserSettings({ autoplay_audio: uSet.autoplay_audio });
        }
        if (uSet.learning_mode !== undefined) {
          const searchParams = new URLSearchParams(window.location.search);
          const urlMode = searchParams.get('mode');
          const finalMode = (urlMode === 'new' || urlMode === 'fsrs' || urlMode === 'roadmap' || urlMode === 'review') ? urlMode : uSet.learning_mode;
          setActiveMode(finalMode);
          updateUserSettings({ quiz_learning_mode: finalMode as any });
        }
        if (uSet.quick_learn_enabled !== undefined) {
          setQuickLearnEnabled(uSet.quick_learn_enabled);
          updateUserSettings({ quick_learn_enabled: uSet.quick_learn_enabled });
        }
      }
      
      const hasLearned = questions.some((q: any) => (q.stats?.total || 0) > 0);
      if (activeTab === 'practice' && practiceRange === 'learned' && !hasLearned) {
        setPracticeRange('all');
        updateUserSettings({ practice_range: 'all' });
      }
      
      if (isPractice && quizRes.data.practice_settings) {
        const parsed = quizRes.data.practice_settings;
        setModeSettings(parsed);
        if (!parsed.mcq?.active_pairs || parsed.mcq.active_pairs.length === 0) {
          setPracticeNeedsSetup(true)
          if ((subMode as string) !== 'setting') {
            navigate(`/practice/${id}/setting`, { replace: true })
          }
          return
        }
      }
      
      setPromptInput(quizRes.data.ai_prompt || '')
      setInitialTotalXP(quizRes.data.user_total_xp || 0)
      setInitialTodayXP(quizRes.data.user_today_xp || 0)
      setInitialTodayTime(quizRes.data.user_today_time || 0)
      setInitialAllTimeTime(quizRes.data.user_all_time_time || 0)
      setPracticeNeedsSetup(!!quizRes.data.practice_needs_setup)
      setPracticeDisabled(!!quizRes.data.practice_disabled)
      
      if (activeTab === 'practice') {
        fetchPracticeSettings()
        if (currentIndex < 0) setCurrentIndex(0)
      }

      // Fetch Roadmap status for current deck
      fetchRoadmapStatus();

      // Dynamic Realtime Queue Initialization (Stateless across devices)
      const initIndex = async () => {
        let rmStatus = roadmapStatus;
        if (!rmStatus && refetchRoadmap) {
          const fetched = await refetchRoadmap();
          rmStatus = fetched?.data || undefined;
        }
        const rawIdx = rmStatus?.current_step_index || 0;
        const rawStep = rmStatus?.pipeline?.[rawIdx];
        const searchParams = new URLSearchParams(window.location.search);
        const urlMode = searchParams.get('mode');
        const effectiveMode = urlMode || activeMode || userSettings.quiz_learning_mode || 'fsrs';
        let savedMode = effectiveMode;
        if (effectiveMode === 'roadmap') {
          savedMode = rawStep?.type === 'fsrs_review' ? 'fsrs' : 'new';
        }

        let curIdx = 0;
        try {
          const res = await axios.post(`/api/v1/deck/${id}/next-card`, {
            mode: savedMode,
            answered_indexes: [],
            current_index: 0,
            random_enabled: !!userSettings.random_enabled
          });
          if (res.data) {
            if (res.data.is_all_completed || res.data.next_index === -1) {
              setFsrsCompletionData(res.data);
            } else {
              setFsrsCompletionData(null);
              if (res.data.next_index !== undefined) {
                curIdx = res.data.next_index;
              }
            }
          }
        } catch (err) {
          console.error("Failed to fetch initial next card from backend", err);
        }

        setCurrentIndex(curIdx);
        setSelectedOption(null);
        setShowFeedback(false);
      };

      initIndex();
    } catch (e) {
      console.error("Failed to load deck data:", e)
      showLocalToast("Failed to load deck data. Please check your connection.", "error")
      setTimeout(() => {
        navigate('/decks?tab=library')
      }, 2500)
    }
  }


  const fetchPracticeSettings = async () => {
    try {
      const res = await axios.get(`/api/v1/deck/${id}/practice-settings`)
      setAvailableColumns(res.data.available_columns || [])
      
      const userSettings = res.data.user_settings
      const creatorSettings = res.data.creator_settings
      
      const isObjEmpty = (obj: any) => !obj || Object.keys(obj).length === 0;
      const parsed = !isObjEmpty(userSettings) ? userSettings : (!isObjEmpty(creatorSettings) ? creatorSettings : null)
      if (parsed) {
        setModeSettings(parsed)
        const currentModeSettings = parsed[practiceSubMode] || parsed.mcq || { active_pairs: [{ q: 'front', a: 'back' }], num_choices: 4 }
        setSetupPairs(currentModeSettings.active_pairs || [{ q: 'front', a: 'back' }])
        setSetupNumChoices(currentModeSettings.num_choices || 4)
      } else {
        const fallback = {
          mcq: { active_pairs: [{ q: 'front', a: 'back' }], num_choices: 4 },
          typing: { active_pairs: [{ q: 'front', a: 'back' }] },
          listening: { active_pairs: [{ q: 'front', a: 'back' }], num_choices: 4 },
          flip: { active_pairs: [{ q: 'front', a: 'back' }] }
        }
        setModeSettings(fallback)
        setSetupPairs([{ q: 'front', a: 'back' }])
        setSetupNumChoices(4)
      }
    } catch (e) {
      console.error("Failed to load practice settings", e)
    }
  }

  const savePracticeSettings = async (customPairs: { q: string, a: string | string[] }[] = setupPairs, numChoices = setupNumChoices, isCreator = false) => {
    try {
      const updatedModeSettings = {
        ...modeSettings,
        [practiceSubMode]: {
          active_pairs: customPairs,
          ...(practiceSubMode !== 'typing' ? { num_choices: numChoices } : {})
        }
      }
      await axios.post(`/api/v1/deck/${id}/practice-settings`, {
        settings: updatedModeSettings,
        is_creator: isCreator
      })
      setModeSettings(updatedModeSettings)
      setPracticeNeedsSetup(false)
      await fetchSession()
      if (subMode === 'setting') {
        navigate(`/practice/${id}/${practiceSubMode}`)
      }
    } catch (e) {
      alert("Failed to save practice settings.")
    }
  }

  const resetPracticeSettings = async () => {
    try {
      await axios.post(`/api/v1/deck/${id}/practice-settings`, {
        settings: {},
        is_creator: false
      })
      setPracticeNeedsSetup(false)
      await fetchPracticeSettings()
      await fetchSession()
      if (subMode === 'setting') {
        navigate(`/practice/${id}/${practiceSubMode}`)
      }
    } catch (e) {
      alert("Failed to restore practice settings.")
    }
  }

  const saveSession = async (
    _newAnswers: Record<number, any>,
    _newIndex: number,
    _currentXP: number = sessionXP,
    _currentStreak: number = streak,
    _newTotalAnswered: number = practiceTotalAnswered,
    _newCorrectCount: number = practiceCorrectCount
  ) => {
    // Dynamic realtime queue: answers are persisted directly via /record_answer or /save-rating
  }

  const handleToggleHint = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!currentQuestion) return;
    if (showingHint) {
      setShowingHint(false);
      return;
    }
    if (currentQuestion.hint) {
      setShowingHint(true);
      return;
    }
    
    setIsAskingHint(true);
    try {
      const res = await axios.post(`/api/v1/deck/${id}/ask-ai`, {
        question_id: currentQuestion.id,
        field: 'hint',
        sync: true
      });
      const generatedHint = res.data.hint;
      if (generatedHint) {
        setSession((prev: any) => {
          if (!prev) return prev;
          const newQs = [...prev.questions];
          const targetIdx = newQs.findIndex(q => q.id === currentQuestion.id);
          if (targetIdx !== -1) {
            newQs[targetIdx] = { ...newQs[targetIdx], hint: generatedHint };
          }
          return { ...prev, questions: newQs };
        });
        setShowingHint(true);
      }
    } catch (err) {
      console.error("Failed to fetch/generate hint:", err);
    } finally {
      setIsAskingHint(false);
    }
  };

  const handleReviewRating = async (rating: number) => {
    console.log("DEBUG: handleReviewRating called with rating:", rating, "currentIndex:", currentIndex);
    if (!currentQuestion) {
      console.log("DEBUG: currentQuestion is null, returning!");
      return
    }
    
    // Blur any focused element (like FSRS rating buttons) to prevent Space/Enter keys from triggering repeat clicks
    if (document.activeElement && typeof (document.activeElement as any).blur === 'function') {
      (document.activeElement as HTMLElement).blur();
    }
    const alreadyRated = sessionAnswers[currentIndex] !== undefined;
    setSelectedOption(rating - 1)
    setJustAnswered(true)
    const correct = rating > 1
    setShowFeedback(true)
    setIsFlipped(true)
    setActivelyRatedCurrentCard(true)
    setPrevStreakBeforeRating(streak)

    // Snapshot BEFORE updating stats (for context display)
    const prevTotal = currentQuestion.stats?.total || 0
    const prevCorrect = currentQuestion.stats?.correct || 0
    const avgTime = currentQuestion.stats?.avg_time || 0
    const timeTaken = timeLeftRef.current
    
    const prevRatings = Array.isArray(sessionAnswers[currentIndex]) 
      ? (sessionAnswers[currentIndex] as number[]) 
      : (typeof sessionAnswers[currentIndex] === 'number' ? [sessionAnswers[currentIndex] as number] : [])
    const newRatings = [...prevRatings, rating - 1]
    const newAnswers = { ...sessionAnswers, [currentIndex]: newRatings }
    setSessionAnswers(newAnswers)
    
    let updatedXP = sessionXP
    let updatedStreak = streak
    const isFirstEver = prevTotal === 0 && !alreadyRated

    if (correct) {
      if (sfxEnabled) playCorrectSound()
      triggerHaptic('success')
      const confettiColors = streak >= 5 ? ['#f59e0b', '#ef4444', '#f97316'] : ['#6366f1', '#a855f7', '#ec4899']
      confetti({ zIndex: 9999, particleCount: streak >= 5 ? 250 : 150, spread: streak >= 5 ? 100 : 70, origin: { y: 0.6 }, colors: confettiColors })
      if (alreadyRated) setBadgeMessage("Chính xác! 🎯")
    } else {
      if (sfxEnabled) playIncorrectSound()
      triggerHaptic('error')
      if (alreadyRated) setBadgeMessage("Cố lên nhé! 💪")
    }
    
    if (alreadyRated) {
      setBadgeVisible(true)
      setTimeout(() => setBadgeVisible(false), 2000)
    }

    if (!alreadyRated) {
      const prevRatio = prevTotal > 0 ? prevCorrect / prevTotal : 0
      const usuallyCorrect = prevRatio >= 0.7 && prevTotal >= 2

      // Trigger background AI generation if user struggled (rating is Again or Hard)
      if (!correct || rating === 2) {
        if (!currentQuestion.hint) {
          axios.post(`/api/v1/deck/${id}/ask-ai`, { question_id: currentQuestion.id, field: 'hint' })
            .then(res => {
              if (res.data.hint) {
                setSession((prev: any) => {
                  if (!prev) return prev;
                  const newQs = [...prev.questions];
                  const targetIdx = newQs.findIndex(q => q.id === currentQuestion.id);
                  if (targetIdx !== -1) {
                    newQs[targetIdx] = { ...newQs[targetIdx], hint: res.data.hint };
                  }
                  return { ...prev, questions: newQs };
                });
              }
            })
            .catch(err => console.error("Error generating background hint:", err));
        }
        if (!currentQuestion.mnemonic) {
          axios.post(`/api/v1/deck/${id}/ask-ai`, { question_id: currentQuestion.id, field: 'mnemonic' })
            .then(res => {
              if (res.data.mnemonic) {
                setSession((prev: any) => {
                  if (!prev) return prev;
                  const newQs = [...prev.questions];
                  const targetIdx = newQs.findIndex(q => q.id === currentQuestion.id);
                  if (targetIdx !== -1) {
                    newQs[targetIdx] = { ...newQs[targetIdx], mnemonic: res.data.mnemonic };
                  }
                  return { ...prev, questions: newQs };
                });
              }
            })
            .catch(err => console.error("Error generating background mnemonic:", err));
        }
      }

      if (correct) {
        updatedStreak = streak + 1
        setStreak(updatedStreak)

        // Context-aware success messages
        let msg = ''
        if (isFirstEver) msg = `First Blood! 🎯`
        else if (updatedStreak >= 10) msg = `UNSTOPPABLE! 🔥 ${updatedStreak}-streak!`
        else if (updatedStreak >= 5) msg = `On Fire! 🔥 ${updatedStreak}-streak bonus!`
        else if (prevRatio < 0.5 && prevTotal >= 2) msg = `Redemption! 📈 You improved!`
        else if (prevRatio >= 0.9 && prevTotal >= 3) msg = `Consistent! ⭐ You always nail this`
        else msg = [`Brilliant! 🚀`, `Perfect! 🎯`, `Nailed it! ✨`, `Excellent! 🌈`][Math.floor(Math.random() * 4)]
        setBadgeMessage(msg)

        setAnswerContext({ wasCorrect: true, prevTotal, prevCorrect, timeTaken, avgTime, newStreak: updatedStreak, xpGained: 0 })
      } else {
        updatedStreak = 0
        setStreak(0)
        
        // Context-aware failure messages
        let msg = ''
        if (isFirstEver) msg = `First try! No worries 💪`
        else if (usuallyCorrect) msg = `Slip! You usually nail this 😅`
        else if (prevRatio === 0 && prevTotal >= 2) msg = `Keep at it! 📚 It'll click soon`
        else msg = [`Nice try! 💪`, `Learning mode! 📚`, `Almost! 🍀`, `Keep going! 🌻`][Math.floor(Math.random() * 4)]
        setBadgeMessage(msg)

        setAnswerContext({ wasCorrect: false, prevTotal, prevCorrect, timeTaken, avgTime, newStreak: 0, xpGained: 0 })
      }

      setBadgeVisible(true)
      setTimeout(() => setBadgeVisible(false), 2500)

      // Check session progress milestones
      const answered = Object.keys(newAnswers).length
      const total = session?.questions?.length || 1
      const pct = Math.round((answered / total) * 100)
      const milestones = [25, 50, 75, 100]
      milestones.forEach(m => {
        if (pct >= m && !milestonesHit.has(m)) {
          setMilestonesHit(prev => new Set([...prev, m]))
          if (m === 100) setTimeout(() => setIsSessionSummaryOpen(true), 800)
        }
      })
    }

    // Immediately update local stats for real-time UI reflection (always run this, even if already rated this session)
    setSession((prev: any) => {
      if (!prev) return prev
      const newSession = { ...prev }
      const newQs = [...newSession.questions]
      const q = { ...newQs[currentIndex] }
      
      const currentStats = q.stats || { 
        total: 0, 
        correct: 0, 
        avg_time: 0,
        again_count: 0,
        hard_count: 0,
        good_count: 0,
        easy_count: 0
      }
      const newTotal = currentStats.total + 1
      const newCorrect = currentStats.correct + (correct ? 1 : 0)
      
      const oldTotalTime = (currentStats.avg_time || 0) * currentStats.total
      const newAvgTime = Math.round((oldTotalTime + timeTaken) / newTotal)
      
      q.stats = {
        total: newTotal,
        correct: newCorrect,
        wrong: newTotal - newCorrect,
        avg_time: newAvgTime,
        again_count: (currentStats.again_count || 0) + (rating === 1 ? 1 : 0),
        hard_count: (currentStats.hard_count || 0) + (rating === 2 ? 1 : 0),
        good_count: (currentStats.good_count || 0) + (rating === 3 ? 1 : 0),
        easy_count: (currentStats.easy_count || 0) + (rating === 4 ? 1 : 0)
      }

      // Estimate future due date locally to prevent immediate queue re-selection before API response
      const localDue = new Date()
      if (rating === 1) localDue.setMinutes(localDue.getMinutes() + 1)
      else if (rating === 2) localDue.setMinutes(localDue.getMinutes() + 5)
      else if (rating === 3) localDue.setMinutes(localDue.getMinutes() + 10)
      else localDue.setDate(localDue.getDate() + 4)

      let nextState = 1 // default to learning state
      if (rating === 4) {
        nextState = 2 // Review
      } else if (q.fsrs?.state === 2 || q.fsrs?.state === 3) {
        nextState = 3 // Relearning
      }

      const nowStr = new Date().toISOString()
      q.fsrs = {
        ...(q.fsrs || { stability: null, difficulty: null, intervals: {} }),
        state: nextState,
        due: localDue.toISOString(),
        first_learned: q.fsrs?.first_learned || nowStr,
        last_reviewed: nowStr
      }

      newQs[currentIndex] = q
      newSession.questions = newQs
      return newSession
    })

    saveSession(newAnswers, currentIndex, updatedXP, updatedStreak)

    try {
      const res = await axios.post('/api/v1/deck/record_answer', {
        question_id: currentQuestion.id,
        is_correct: correct,
        rating: rating,
        time_spent: timeTaken,
        local_date: new Date().toISOString().slice(0, 10),
        session_streak: updatedStreak,
        is_first_ever: isFirstEver,
        mode: activeMode
      })
      
      // If undo was triggered while waiting for this API response, skip all state updates
      // to prevent overwriting the reverted state
      if (undoInProgressRef.current) return;

      const xpGained = res.data.xp_gained || 0;
      if (xpGained > 0) {
        setSessionXP(prev => prev + xpGained);
        addXp(xpGained);
        setXpFloat({ visible: true, amount: xpGained });
        setTimeout(() => setXpFloat({ visible: false, amount: 0 }), 1500);
        
        setAnswerContext(prev => prev ? { ...prev, xpGained } : null);
      }
      
      if (!alreadyRated) {
        if (res.data.goal_update) {
          // Disabled goal completed popup as requested
          // setGoalToast(res.data.goal_update);
          // setTimeout(() => setGoalToast(null), 4000);

          // Real-time update for goals
          setActiveGoal((prev: any) => {
            if (!prev) return prev;
            return {
              ...prev,
              done_today: res.data.goal_update.done_today,
              is_target_met: res.data.goal_update.is_target_met,
              streak_count: res.data.goal_update.streak_count
            };
          });
        }
      }
      if (activeMode === 'roadmap' || activeMode === 'fsrs') {
        fetchRoadmapStatus().then(res => {
          const updated = res?.data;
          if (updated && updated.pipeline) {
            const newStep = updated.pipeline.find((s: any) => s.type === 'new_cards');
            const revStep = updated.pipeline.find((s: any) => s.type === 'fsrs_review');
            // Roadmap status updated, inline complete screen will handle completion display smoothly
          }
        });
      }

      // Also re-fetch leaderboard in background to keep stats Completely dynamic and live!
      axios.get('/api/v1/stats/leaderboard', { params: { time_filter: leaderboardTimeFilter } })
        .then(lbRes => {
          setLeaderboardData(lbRes.data)
        })
        .catch(e => console.error("Failed to load leaderboard in background", e))

      axios.get('/api/v1/stats/daily-comparison')
        .then(dcRes => {
          setDailyComparisonData(dcRes.data?.days || [])
          setDailyComparisonAvg(dcRes.data?.all_time_avg || null)
        })
        .catch(e => console.error("Failed to load daily comparison in background", e))

      // Trigger 10-Streak Milestone Celebration
      if (updatedStreak === 10) {
        setActiveMilestone({
          type: 'streak_10',
          title: '🔥 Perfect Streak!',
          message: 'Amazing focus! You have answered 10 cards correct in a row!'
        })
      }

      // Trigger Halfway Completion Milestone Celebration
      const answeredCount = Object.keys(newAnswers).length
      const totalCount = session?.questions?.length || 1
      if (answeredCount === Math.floor(totalCount / 2) && totalCount > 4) {
        setActiveMilestone({
          type: 'halfway',
          title: '🎯 Halfway There!',
          message: `Great progress! You have studied ${answeredCount}/${totalCount} cards in this deck.`
        })
      }

      // Trigger Deck Mastery Milestone Celebration
      if (res.data.deck_mastered) {
        setActiveMilestone({
          type: 'mastery',
          title: '🏆 Deck Mastered!',
          message: 'Outstanding achievement! You have mastered every card in this deck!'
        })
      }

      // Spaced Repetition Mastery Level Up
      const masteryUpdate = res.data.mastery_update
      if (masteryUpdate) {
        setSession((prevSession: any) => {
          if (!prevSession) return prevSession
          const updatedQuestions = [...prevSession.questions]
          if (updatedQuestions[currentIndex]) {
            updatedQuestions[currentIndex] = {
              ...updatedQuestions[currentIndex],
              box_level: masteryUpdate.new_level,
              fsrs: {
                ...updatedQuestions[currentIndex].fsrs,
                state: masteryUpdate.state !== undefined ? masteryUpdate.state : updatedQuestions[currentIndex].fsrs?.state,
                stability: masteryUpdate.stability !== undefined ? masteryUpdate.stability : updatedQuestions[currentIndex].fsrs?.stability,
                difficulty: masteryUpdate.difficulty !== undefined ? masteryUpdate.difficulty : updatedQuestions[currentIndex].fsrs?.difficulty,
                due: masteryUpdate.due !== undefined ? masteryUpdate.due : updatedQuestions[currentIndex].fsrs?.due,
                first_learned: masteryUpdate.first_learned !== undefined ? masteryUpdate.first_learned : updatedQuestions[currentIndex].fsrs?.first_learned,
                last_reviewed: masteryUpdate.last_reviewed !== undefined ? masteryUpdate.last_reviewed : updatedQuestions[currentIndex].fsrs?.last_reviewed,
                intervals: masteryUpdate.intervals !== undefined ? masteryUpdate.intervals : updatedQuestions[currentIndex].fsrs?.intervals,
              }
            }
          }
          return {
            ...prevSession,
            questions: updatedQuestions
          }
        })

        // Disable mastery level-up celebration overlay to keep study flow clean
        /*
        if (masteryUpdate.level_up && masteryUpdate.new_level > masteryUpdate.old_level) {
          confetti({ zIndex: 9999,
            particleCount: 50,
            angle: 90,
            spread: 45,
            origin: { y: 0.5 },
            colors: ['#34D399', '#10B981', '#FBBF24']
          })

          setActiveMasteryUpgrade({
            old_level: masteryUpdate.old_level,
            new_level: masteryUpdate.new_level,
            question_id: currentQuestion.id
          })

          setTimeout(() => {
            setActiveMasteryUpgrade(null)
          }, 3000)
        }
        */
      }

      // Real-time Achievement Badge Unlock
      const unlockedBadge = res.data.unlocked_badge
      if (unlockedBadge) {
        setActiveUnlockedBadge(unlockedBadge)
        confetti({ zIndex: 9999,
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#8B5CF6', '#EC4899', '#FBBF24', '#3B82F6']
        })
      }

      const goalUpdate = res.data.goal_update
      if (goalUpdate) {
        // Disabled goal completed toast
        /*
        setGoalToast({
          visible: !goalUpdate.just_completed,
          message: goalUpdate.motivational_message,
          isTargetMet: goalUpdate.is_target_met,
          justCompleted: goalUpdate.just_completed,
          streakCount: goalUpdate.streak_count,
          doneToday: goalUpdate.done_today,
          dailyTarget: goalUpdate.daily_target,
          bonusXP: goalUpdate.bonus_xp
        })
        */
        
        setActiveGoal((prev: any) => {
          if (!prev) return {
            goal_id: goalUpdate.goal_id,
            quiz_id: Number(id),
            quiz_title: session?.title || "",
            cover_image: session?.cover_image || null,
            total_questions: session?.questions?.length || 0,
            total_learned: goalUpdate.is_new_question ? 1 : 0,
            daily_target: goalUpdate.daily_target,
            done_today: goalUpdate.done_today,
            is_target_met: goalUpdate.is_target_met,
            streak_count: goalUpdate.streak_count,
            days_remaining_est: Math.ceil(Math.max(0, (session?.questions?.length || 0) - (goalUpdate.is_new_question ? 1 : 0)) / goalUpdate.daily_target)
          }
          const updatedLearned = goalUpdate.is_new_question ? prev.total_learned + 1 : prev.total_learned
          const remainingQs = Math.max(0, prev.total_questions - updatedLearned)
          return {
            ...prev,
            done_today: goalUpdate.done_today,
            is_target_met: goalUpdate.is_target_met,
            streak_count: goalUpdate.streak_count,
            total_learned: updatedLearned,
            days_remaining_est: Math.ceil(remainingQs / prev.daily_target)
          }
        })

        // Auto-dismiss milestone toast after 4.5 seconds
        setTimeout(() => {
          setGoalToast(prev => prev ? { ...prev, visible: false } : null)
        }, 4500)

        if (goalUpdate.just_completed) {
          // Disabled full screen goal celebration popup
          // setShowGoalCelebration(true)
          // Epic continuous confetti shower from bottom corners
          const end = Date.now() + 4.5 * 1000;
          const colors = ['#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'];
          
          (function frame() {
            confetti({ zIndex: 9999,
              particleCount: 4,
              angle: 60,
              spread: 55,
              origin: { x: 0, y: 0.8 },
              colors: colors
            });
            confetti({ zIndex: 9999,
              particleCount: 4,
              angle: 120,
              spread: 55,
              origin: { x: 1, y: 0.8 },
              colors: colors
            });
            
            if (Date.now() < end) {
              requestAnimationFrame(frame);
            }
          }());
        } else if (goalUpdate.is_target_met) {
          if (correct && goalUpdate.done_today > goalUpdate.daily_target) {
            // Screen flash lightning overlay
            setIsLimitlessStrike(true);
            setTimeout(() => setIsLimitlessStrike(false), 800);

            // Epic multi-angle golden/purple fireworks cascade!
            confetti({ zIndex: 9999,
              particleCount: 50,
              angle: 60,
              spread: 75,
              origin: { x: 0.15, y: 0.85 },
              colors: ['#F59E0B', '#F97316', '#EF4444', '#8B5CF6', '#FFF']
            });
            confetti({ zIndex: 9999,
              particleCount: 50,
              angle: 120,
              spread: 75,
              origin: { x: 0.85, y: 0.85 },
              colors: ['#F59E0B', '#F97316', '#EF4444', '#8B5CF6', '#FFF']
            });
            confetti({ zIndex: 9999,
              particleCount: 40,
              spread: 100,
              origin: { x: 0.5, y: 0.5 },
              colors: ['#F59E0B', '#F97316', '#FFF']
            });
          } else {
            // Epic gold/rose sparkle burst from the top right corner near the toast
            confetti({ zIndex: 9999,
              particleCount: 20,
              angle: 220,
              spread: 45,
              origin: { x: 0.9, y: 0.12 },
              colors: ['#F59E0B', '#F97316', '#EF4444', '#EC4899']
            });
          }
        }
      }

      // Tự động chuyển câu (Quick Learn)
      const quickAnswersCount = Object.keys(newAnswers).length
      const quickTotalCount = session?.questions?.length || 1
      const isHalfwayMilestone = (quickAnswersCount === Math.floor(quickTotalCount / 2) && quickTotalCount > 4)
      const hasMilestone = !!unlockedBadge || 
                            !!res.data.deck_mastered || 
                            !!(goalUpdate && goalUpdate.just_completed) || 
                            (updatedStreak === 10) || 
                            isHalfwayMilestone
      if (quickLearnEnabled && quickAnswersCount < quickTotalCount && !hasMilestone) {
        setTimeout(() => {
          handleNext(newAnswers)
        }, 200)
      }
    } catch (e) {
      console.error("Failed to record answer to server:", e)
      showLocalToast("Warning: Your answer was not saved to the server.", "warning")
    }
  }

  const handleUndoRating = async () => {
    if (!currentQuestion || undoInProgressRef.current) return;
    undoInProgressRef.current = true;
    try {
      const res = await axios.post('/api/v1/deck/undo_answer', {
        card_id: currentQuestion.id
      });
      
      if (res.data.status === 'ok') {
        const optionToRevert = selectedOption;
        
        // 1. Revert local state — keep isFlipped=true so FSRS buttons re-appear on the back face
        setActivelyRatedCurrentCard(false);
        setJustAnswered(false);
        setSelectedOption(null);
        setStreak(prevStreakBeforeRating);
        // Reset showFeedback so the card is in "awaiting rating" state
        setShowFeedback(true);
        
        // Remove this rating from sessionAnswers (handle both array and legacy number formats)
        const prevRatings = sessionAnswers[currentIndex];
        const newAnswers = { ...sessionAnswers };
        if (Array.isArray(prevRatings) && prevRatings.length > 0) {
          const newRatings = prevRatings.slice(0, -1);
          if (newRatings.length > 0) {
            newAnswers[currentIndex] = newRatings;
          } else {
            delete newAnswers[currentIndex];
          }
        } else if (prevRatings !== undefined) {
          // Handle legacy single-number format
          delete newAnswers[currentIndex];
        }
        setSessionAnswers(newAnswers);
        
        // 2. Revert XP locally
        const xpDeducted = res.data.xp_deducted || 0;
        if (xpDeducted > 0) {
          setSessionXP(prev => Math.max(0, prev - xpDeducted));
          addXp(-xpDeducted);
        }
        
        // 3. Revert daily goals
        const goalUpdate = res.data.goal_update;
        if (goalUpdate) {
          setGoalToast(prev => {
            if (!prev) return null;
            return {
              ...prev,
              visible: false,
              doneToday: goalUpdate.done_today,
              streakCount: goalUpdate.streak_count,
              isTargetMet: goalUpdate.is_target_met
            };
          });
          
          setActiveGoal((prev: any) => {
            if (!prev) return null;
            const updatedLearned = goalUpdate.is_new_question ? Math.max(0, prev.total_learned - 1) : prev.total_learned;
            const remainingQs = Math.max(0, prev.total_questions - updatedLearned);
            return {
              ...prev,
              done_today: goalUpdate.done_today,
              is_target_met: goalUpdate.is_target_met,
              streak_count: goalUpdate.streak_count,
              total_learned: updatedLearned,
              days_remaining_est: Math.ceil(remainingQs / prev.daily_target)
            };
          });
        }
        
        // 4. Update the card FSRS properties locally
        setSession((prev: any) => {
          if (!prev) return prev;
          const newSession = { ...prev };
          const newQs = [...newSession.questions];
          const q = { ...newQs[currentIndex] };
          
          if (res.data.fsrs) {
            q.fsrs = {
              ...q.fsrs,
              state: res.data.fsrs.state,
              stability: res.data.fsrs.stability,
              difficulty: res.data.fsrs.difficulty,
              due: res.data.fsrs.due,
              last_review: res.data.fsrs.last_review,
              first_learned: res.data.fsrs.first_learned !== undefined ? res.data.fsrs.first_learned : q.fsrs?.first_learned,
              last_reviewed: res.data.fsrs.last_reviewed !== undefined ? res.data.fsrs.last_reviewed : q.fsrs?.last_reviewed,
              intervals: res.data.fsrs.intervals
            };
          }
          
          if (res.data.box_level !== undefined) {
            q.box_level = res.data.box_level;
          }
          
          const isCorrect = optionToRevert !== 0;
          if (q.stats) {
            const currentStats = q.stats;
            const newTotal = Math.max(0, currentStats.total - 1);
            const newCorrect = Math.max(0, currentStats.correct - (isCorrect ? 1 : 0));
            q.stats = {
              ...currentStats,
              total: newTotal,
              correct: newCorrect,
              wrong: Math.max(0, newTotal - newCorrect),
              again_count: Math.max(0, (currentStats.again_count || 0) - (optionToRevert === 0 ? 1 : 0)),
              hard_count: Math.max(0, (currentStats.hard_count || 0) - (optionToRevert === 1 ? 1 : 0)),
              good_count: Math.max(0, (currentStats.good_count || 0) - (optionToRevert === 2 ? 1 : 0)),
              easy_count: Math.max(0, (currentStats.easy_count || 0) - (optionToRevert === 3 ? 1 : 0))
            };
          }
          
          newQs[currentIndex] = q;
          newSession.questions = newQs;
          return newSession;
        });

        // Dismiss any remaining toasts/celebrations
        setBadgeVisible(false);
        setActiveUnlockedBadge(null);
        setActiveMasteryUpgrade(null);
        setShowGoalCelebration(false);
      }
    } catch (e) {
      console.error("Failed to undo rating:", e);
      alert("Undo failed. Please try again.");
    } finally {
      undoInProgressRef.current = false;
    }
  };

  const handleAnswer = async (optIdx: number) => {
    if (!currentQuestion) return
    const isCorrect = currentQuestion.options[optIdx].is_correct
    const rating = isCorrect ? 3 : 1
    await handleReviewRating(rating)
  }

  const handleMCQAnswer = async (choiceIdx: number) => {
    if (showFeedback || !currentQuestion || !currentPracticeData) return;
    
    setSelectedOption(choiceIdx);
    setShowFeedback(true);
    setJustAnswered(true);
    
    const isCorrect = choiceIdx === currentPracticeData.correct_index;
    
    const updatedTotalAnswered = practiceTotalAnswered + 1;
    const updatedCorrectCount = isCorrect ? practiceCorrectCount + 1 : practiceCorrectCount;

    setPracticeTotalAnswered(updatedTotalAnswered);
    if (isCorrect) {
      setPracticeCorrectCount(updatedCorrectCount);
    }

    const newAnswers = { ...practiceAnswers, [currentIndex]: choiceIdx };
    setPracticeAnswers(newAnswers);
    
    let updatedXP = sessionXP;
    let updatedStreak = streak;
    
    const prevTotal = currentQuestion.stats?.total || 0;
    const isFirstEver = prevTotal === 0;
    
    if (isCorrect) {
      if (sfxEnabled) playCorrectSound();
      triggerHaptic('success');
      updatedStreak = streak + 1;
      setStreak(updatedStreak);
      
      let bonusXP = 0;
      if (isFirstEver) bonusXP += 10;
      if (updatedStreak >= 5) bonusXP += 1;
      const xpGained = 6 + bonusXP;
      updatedXP = sessionXP + xpGained;
      setSessionXP(updatedXP);
      addXp(xpGained);
      
      setXpFloat({ visible: true, amount: xpGained });
      setTimeout(() => setXpFloat({ visible: false, amount: 0 }), 1500);
      
      confetti({ zIndex: 9999, particleCount: 80, spread: 50, origin: { y: 0.6 } });
      setBadgeMessage("Chính xác! 🎯");
    } else {
      if (sfxEnabled) playIncorrectSound();
      triggerHaptic('error');
      updatedStreak = 0;
      setStreak(0);
      const xpGained = 1;
      updatedXP = sessionXP + xpGained;
      setSessionXP(updatedXP);
      addXp(xpGained);
      
      setXpFloat({ visible: true, amount: xpGained });
      setTimeout(() => setXpFloat({ visible: false, amount: 0 }), 1500);
      
      setBadgeMessage("Chưa chính xác! 😅");
    }
    
    setBadgeVisible(true);
    setTimeout(() => setBadgeVisible(false), 2000);
    
    saveSession(newAnswers, currentIndex, updatedXP, updatedStreak, updatedTotalAnswered, updatedCorrectCount);
    
    try {
      await axios.post('/api/v1/deck/record_answer', {
        question_id: currentQuestion.id,
        is_correct: isCorrect,
        is_practice: true,
        rating: isCorrect ? 3 : 1,
        time_spent: timeLeftRef.current,
        local_date: new Date().toISOString().slice(0, 10)
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleTypingAnswer = async () => {
    if (showFeedback || !currentQuestion || !currentPracticeData) return;
    
    const correctAns = currentPracticeData.correct_answer || '';
    const cleanCorrect = correctAns.replace(/<[^<]+?>/g, '').trim().toLowerCase();
    const cleanInput = typingInput.trim().toLowerCase();
    
    const isCorrect = cleanInput === cleanCorrect;
    
    const updatedTotalAnswered = practiceTotalAnswered + 1;
    const updatedCorrectCount = isCorrect ? practiceCorrectCount + 1 : practiceCorrectCount;

    setPracticeTotalAnswered(updatedTotalAnswered);
    if (isCorrect) {
      setPracticeCorrectCount(updatedCorrectCount);
    }

    setShowFeedback(true);
    setJustAnswered(true);
    setTypingFeedback({ checked: true, isCorrect });
    
    const newAnswers = { ...practiceAnswers, [currentIndex]: isCorrect ? 3 : 0 };
    setPracticeAnswers(newAnswers);
    
    let updatedXP = sessionXP;
    let updatedStreak = streak;
    
    const prevTotal = currentQuestion.stats?.total || 0;
    const isFirstEver = prevTotal === 0;
    
    if (isCorrect) {
      if (sfxEnabled) playCorrectSound();
      triggerHaptic('success');
      updatedStreak = streak + 1;
      setStreak(updatedStreak);
      
      let bonusXP = 0;
      if (isFirstEver) bonusXP += 10;
      if (updatedStreak >= 5) bonusXP += 1;
      const xpGained = 6 + bonusXP;
      updatedXP = sessionXP + xpGained;
      setSessionXP(updatedXP);
      addXp(xpGained);
      
      setXpFloat({ visible: true, amount: xpGained });
      setTimeout(() => setXpFloat({ visible: false, amount: 0 }), 1500);
      
      confetti({ zIndex: 9999, particleCount: 100, spread: 60, origin: { y: 0.6 } });
      setBadgeMessage("Xuất sắc! ⌨️");
    } else {
      if (sfxEnabled) playIncorrectSound();
      triggerHaptic('error');
      updatedStreak = 0;
      setStreak(0);
      const xpGained = 1;
      updatedXP = sessionXP + xpGained;
      setSessionXP(updatedXP);
      addXp(xpGained);
      
      setXpFloat({ visible: true, amount: xpGained });
      setTimeout(() => setXpFloat({ visible: false, amount: 0 }), 1500);
      
      setBadgeMessage("Nhầm một chút rồi! 💪");
    }
    
    setBadgeVisible(true);
    setTimeout(() => setBadgeVisible(false), 2000);
    
    saveSession(newAnswers, currentIndex, updatedXP, updatedStreak, updatedTotalAnswered, updatedCorrectCount);
    
    try {
      await axios.post('/api/v1/deck/record_answer', {
        question_id: currentQuestion.id,
        is_correct: isCorrect,
        is_practice: true,
        rating: isCorrect ? 3 : 1,
        time_spent: timeLeftRef.current,
        local_date: new Date().toISOString().slice(0, 10)
      });
    } catch (e) {
      console.error(e);
    }
  };

  const navigateToQuestion = (idx: number, customAnswers?: Record<number, any>) => {
    setCurrentIndex(idx)
    setIsFlipped(false)
    setActivelyRatedCurrentCard(false)
    setJustAnswered(false)
    setShowingHint(false)
    setTypingInput('')
    setTypingFeedback(null)
    setSelectedOption(null)

    // Đóng toàn bộ các popup, toast, thông báo thành tựu khi chuyển sang câu mới
    setGoalToast(prev => prev ? { ...prev, visible: false } : null)
    setShowGoalCelebration(false)
    setBadgeVisible(false)
    setActiveUnlockedBadge(null)
    setActiveMasteryUpgrade(null)
    setLearningModeAlert(null)
    
    const isPractice = mainTab === 'practice';
    const activeAnswers = customAnswers || (isPractice ? practiceAnswers : sessionAnswers);
    if (isPractice) {
      const prevAns = activeAnswers[idx]
      if (prevAns !== undefined) {
        setSelectedOption(prevAns)
        setShowFeedback(true)
        if (practiceSubMode === 'typing') {
          setTypingFeedback({ checked: true, isCorrect: prevAns === 3 })
        }
      } else {
        setSelectedOption(null)
        setShowFeedback(false)
        timeLeftRef.current = 0
      }
    } else {
      // Check if the card is unlocked (clock drift buffered) to reset selectedOption for new reviews
      const q = session?.questions?.[idx]
      const isUnlocked = (() => {
        if (!q || !q.fsrs || !q.fsrs.due) return true;
        return parseUTCDate(q.fsrs.due).getTime() - 30000 <= new Date().getTime();
      })()

      const prevOpt = activeAnswers[idx]
      const hasRatedThisSession = prevOpt !== undefined
      const lastRating = Array.isArray(prevOpt) 
        ? prevOpt[prevOpt.length - 1] 
        : (typeof prevOpt === 'number' ? prevOpt : null)

      if (hasRatedThisSession && lastRating !== null && !isUnlocked) {
        setSelectedOption(lastRating)
        setShowFeedback(false)
      } else {
        setSelectedOption(null)
        setShowFeedback(false)
        timeLeftRef.current = 0
      }
    }
    
    setIsEditingNote(false)
    setIsEditingAI(false)
    saveSession(activeAnswers, idx)
  }

  const handleNext = async (customAnswers?: Record<number, any> | React.MouseEvent) => {
    // Immediately stop any actively playing server audio and clear speech synthesis queues when transitioning
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    if (!session || !session.questions) return

    const questions = session.questions
    const total = questions.length

    if (activeMode === 'flip' && currentQuestion) {
      const alreadyRated = sessionAnswers[currentIndex] !== undefined;
      if (!alreadyRated) {
        // Record the view on backend
        try {
          await axios.post('/api/v1/deck/record_answer', {
            question_id: currentQuestion.id,
            is_correct: true,
            is_practice: true, // Bypass FSRS evaluation / scheduling updates
            rating: 3, // count as 'Good' / seen
            time_spent: timeLeftRef.current,
            local_date: new Date().toISOString().slice(0, 10)
          });
        } catch (e) {
          console.error("Failed to record flip view:", e);
        }

        // Update local state and stats
        const prevRatings = Array.isArray(sessionAnswers[currentIndex]) 
          ? (sessionAnswers[currentIndex] as number[]) 
          : (typeof sessionAnswers[currentIndex] === 'number' ? [sessionAnswers[currentIndex] as number] : [])
        const newRatings = [...prevRatings, -2] // index -2 (studied but not evaluated/rated in flip mode)
        const newAnswers = { ...sessionAnswers, [currentIndex]: newRatings }
        setSessionAnswers(newAnswers)

        setSession((prev: any) => {
          if (!prev) return prev
          const newSession = { ...prev }
          const newQs = [...newSession.questions]
          const q = { ...newQs[currentIndex] }
          if (q) {
            const currentStats = q.stats || { 
              total: 0, 
              correct: 0, 
              avg_time: 0,
              again_count: 0,
              hard_count: 0,
              good_count: 0,
              easy_count: 0
            }
            const newTotal = currentStats.total + 1
            const newCorrect = currentStats.correct + 1
            const oldTotalTime = (currentStats.avg_time || 0) * currentStats.total
            const newAvgTime = Math.round((oldTotalTime + timeLeftRef.current) / newTotal)
            q.stats = {
              total: newTotal,
              correct: newCorrect,
              wrong: newTotal - newCorrect,
              avg_time: newAvgTime,
              again_count: currentStats.again_count || 0,
              hard_count: currentStats.hard_count || 0,
              good_count: (currentStats.good_count || 0) + 1,
              easy_count: currentStats.easy_count || 0
            }
            newQs[currentIndex] = q
          }
          newSession.questions = newQs
          return newSession
        })
      }
    }

    const getNextPracticeIndex = (currentIdx: number, range: 'all' | 'learned', totalQuestions: any[]): number => {
      const allIndices = totalQuestions.map((_, i) => i);
      const learnedIndices = totalQuestions.map((q, i) => (q.stats?.total || 0) > 0 ? i : -1).filter(i => i !== -1);
      
      const activeIndices = (range === 'learned' && learnedIndices.length > 0) ? learnedIndices : allIndices;
      
      if (activeIndices.length <= 1) return activeIndices[0] || 0;
      
      const otherIndices = activeIndices.filter(i => i !== currentIdx);
      const pool = otherIndices.length > 0 ? otherIndices : activeIndices;
      return pool[Math.floor(Math.random() * pool.length)];
    };

    if (mainTab === 'practice') {
      const nextIdx = getNextPracticeIndex(currentIndex, practiceRange as any, questions);
      
      // Clear the answer for both the current and next card so they are always clickable and reusable
      const newAnswers = { ...practiceAnswers };
      delete newAnswers[currentIndex];
      delete newAnswers[nextIdx];
      setPracticeAnswers(newAnswers);
      
      navigateToQuestion(nextIdx, newAnswers);
      return;
    }

    let nextIdx = -1
    const isEvent = customAnswers && typeof customAnswers === 'object' && ('nativeEvent' in customAnswers || 'target' in customAnswers)
    const updatedAnswers = (customAnswers && !isEvent) ? (customAnswers as Record<number, any>) : { ...sessionAnswers }
    const answeredIndexes = Object.keys(updatedAnswers).map(Number)
    
    try {
      let rmStatus = roadmapStatus;
      if (!rmStatus && refetchRoadmap) {
        const fetched = await refetchRoadmap();
        rmStatus = fetched?.data || undefined;
      }
      const rawIdx = rmStatus?.current_step_index || 0;
      const rawStep = rmStatus?.pipeline?.[rawIdx];
      const searchParams = new URLSearchParams(window.location.search);
      const urlMode = searchParams.get('mode');
      const effectiveMode = urlMode || activeMode || userSettings.quiz_learning_mode || 'fsrs';
      let targetMode = effectiveMode;
      if (effectiveMode === 'roadmap') {
        targetMode = rawStep?.type === 'fsrs_review' ? 'fsrs' : 'new';
      }

      const res = await axios.post(`/api/v1/deck/${id}/next-card`, {
        mode: targetMode,
        answered_indexes: answeredIndexes,
        current_index: currentIndex,
        random_enabled: !!userSettings.random_enabled
      });
      if (res.data) {
        if (res.data.is_all_completed || res.data.next_index === -1) {
          setFsrsCompletionData(res.data);
          return;
        } else {
          setFsrsCompletionData(null);
          if (res.data.next_index !== undefined) {
            nextIdx = res.data.next_index;
          }
        }
      }
      if (nextIdx === -1 || nextIdx === currentIndex) {
        nextIdx = (currentIndex + 1 < total) ? currentIndex + 1 : 0;
      }
    } catch (err) {
      console.error("Failed to fetch next card from backend", err)
      nextIdx = (currentIndex + 1 < total) ? currentIndex + 1 : 0;
    }

    navigateToQuestion(nextIdx, updatedAnswers)
  }

  const applyLearningMode = async (mode: string) => {
    setFsrsCompletionData(null)
    setActiveMode(mode)
    updateUserSettings({ quiz_learning_mode: mode as any })
    saveGeneralSettings({ learning_mode: mode })
    navigate(`/flashcard/${id}/play?mode=${mode}`, { replace: true })

    if (!session || !session.questions) return

    // If the current question is already answered (feedback is shown), 
    // we don't jump immediately. The next question will automatically follow the new mode.
    if (showFeedback) return

    const updatedAnswers = { ...sessionAnswers }
    const answeredIndexes = Object.keys(updatedAnswers).map(Number)

    let targetIdx = -1
    try {
      const res = await axios.post(`/api/v1/deck/${id}/next-card`, {
        mode: mode,
        answered_indexes: answeredIndexes,
        current_index: currentIndex,
        random_enabled: randomEnabled
      })
      targetIdx = res.data.next_index
    } catch (err) {
      console.error("Failed to fetch next card from backend for mode update", err)
      targetIdx = currentIndex
    }

    if (targetIdx !== -1 && targetIdx !== currentIndex) {
      navigateToQuestion(targetIdx, updatedAnswers)
    }
  }

  const handleIgnoreQuestion = async () => {
    if (!currentQuestion) return;
    try {
      const newIgnoreState = !currentQuestion.is_ignored;
      
      const updatedQuestions = [...session.questions];
      updatedQuestions[currentIndex] = {
        ...currentQuestion,
        is_ignored: newIgnoreState
      };
      setSession({ ...session, questions: updatedQuestions });
      
      await axios.post(`/api/v1/deck/question/${currentQuestion.id}/ignore`, {
        is_ignored: newIgnoreState
      });
      
      if (newIgnoreState) {
        handleNext();
      }
    } catch (e) {
      console.error("Failed to ignore question", e);
      const revertedQuestions = [...session.questions];
      revertedQuestions[currentIndex] = {
        ...currentQuestion,
        is_ignored: !currentQuestion.is_ignored
      };
      setSession({ ...session, questions: revertedQuestions });
    }
  };

  const handleStarQuestion = async () => {
    if (!currentQuestion) return;
    try {
      const newStarState = !currentQuestion.is_starred;
      
      const updatedQuestions = [...session.questions];
      updatedQuestions[currentIndex] = {
        ...currentQuestion,
        is_starred: newStarState
      };
      setSession({ ...session, questions: updatedQuestions });
      
      await axios.post(`/api/v1/deck/question/${currentQuestion.id}/star`, {
        is_starred: newStarState
      });
    } catch (e) {
      console.error("Failed to star question", e);
      const revertedQuestions = [...session.questions];
      revertedQuestions[currentIndex] = {
        ...currentQuestion,
        is_starred: !currentQuestion.is_starred
      };
      setSession({ ...session, questions: revertedQuestions });
    }
  };

  // ── Desktop Keyboard Navigation Shortcuts ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when user is typing in an input, textarea, or contentEditable
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      // Ignore when modals or drawers are open
      if (
        isFeedbackOpen ||
        isMapOpen ||
        isStatsOpen ||
        isEditModalOpen ||
        isQuitModalOpen ||
        isSessionSummaryOpen ||
        isSettingsModalOpen
      ) {
        return;
      }

      // Space or Enter:
      // If card is not flipped -> flip it
      // If card is flipped & has rated -> go to next card
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        if (!isFlipped) {
          setIsFlipped(true);
          setShowFeedback(true);
          setJustAnswered(true);
        } else if (hasRated || activeMode === 'flip') {
          handleNext();
        }
        return;
      }

      // Number keys 1, 2, 3, 4 for FSRS Rating when flipped
      if (isFlipped && !hasRated && activeMode !== 'flip') {
        if (e.code === 'Digit1' || e.code === 'Numpad1') {
          e.preventDefault();
          handleReviewRating(1);
          return;
        }
        if (e.code === 'Digit2' || e.code === 'Numpad2') {
          e.preventDefault();
          handleReviewRating(2);
          return;
        }
        if (e.code === 'Digit3' || e.code === 'Numpad3') {
          e.preventDefault();
          handleReviewRating(3);
          return;
        }
        if (e.code === 'Digit4' || e.code === 'Numpad4') {
          e.preventDefault();
          handleReviewRating(4);
          return;
        }
      }

      // Key R: Replay audio
      if (e.code === 'KeyR') {
        e.preventDefault();
        if (isFlipped) {
          playCardAudio('back');
        } else {
          playCardAudio('front');
        }
        return;
      }

      // Key Z: Undo last rating
      if ((e.code === 'KeyZ' || (e.ctrlKey && e.code === 'KeyZ')) && activelyRatedCurrentCard) {
        e.preventDefault();
        handleUndoRating();
        return;
      }

      // Key S: Star question
      if (e.code === 'KeyS') {
        e.preventDefault();
        handleStarQuestion();
        return;
      }

      // Key H: Show Hint
      if (e.code === 'KeyH') {
        e.preventDefault();
        handleToggleHint();
        return;
      }

      // ArrowRight: Next card (if rated or flip mode)
      if (e.code === 'ArrowRight' && (hasRated || activeMode === 'flip')) {
        e.preventDefault();
        handleNext();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    isFlipped,
    hasRated,
    activeMode,
    activelyRatedCurrentCard,
    currentQuestion,
    isFeedbackOpen,
    isMapOpen,
    isStatsOpen,
    isEditModalOpen,
    isQuitModalOpen,
    isSessionSummaryOpen,
    isSettingsModalOpen
  ]);

  const openEditModal = () => {
    if (!currentQuestion) return
    
    const others = currentQuestion.others ? { ...currentQuestion.others } : {};
    // Strip out column fields from others if they leaked in
    const systemFields = ['front_img', 'back_img', 'front_audio_url', 'back_audio_url', 'front_audio_content', 'back_audio_content'];
    systemFields.forEach(f => delete others[f]);

    setEditFormData({
      id: currentQuestion.id,
      content: currentQuestion.content,
      explanation: currentQuestion.explanation,
      ai_explanation: currentQuestion.ai_explanation,
      image: currentQuestion.image || '',
      audio: currentQuestion.audio || '',
      front_img: currentQuestion.front_img || '',
      back_img: currentQuestion.back_img || '',
      front_audio_url: currentQuestion.front_audio_url || '',
      back_audio_url: currentQuestion.back_audio_url || '',
      front_audio_content: currentQuestion.front_audio_content || '',
      back_audio_content: currentQuestion.back_audio_content || '',
      options: currentQuestion.options.map(o => ({ id: o.id, content: o.content, is_correct: o.is_correct })),
      others: others
    })
    setIsEditModalOpen(true)
  }

  const handleSaveEdit = async (updatedCardData: any) => {
    if (!currentQuestion || !updatedCardData) return
    setIsSavingEdit(true)
    
    try {
      // Safely parse other_content JSON if provided
      const finalOthers = { ...updatedCardData.others };
      const systemFields = ['front_img', 'back_img', 'front_audio_url', 'back_audio_url', 'front_audio_content', 'back_audio_content'];
      systemFields.forEach(f => delete finalOthers[f]);
      
      if (finalOthers.other_content) {
        try {
          // If valid JSON, parse it for database storage
          finalOthers.other_content = typeof finalOthers.other_content === 'string'
            ? JSON.parse(finalOthers.other_content)
            : finalOthers.other_content;
        } catch (je) {
          console.warn("other_content is not JSON, saving as raw string:", je)
        }
      }

      // Sync correctness explanation to options content
      const updatedOptions = (updatedCardData.options || []).map((opt: any) => {
        if (opt.is_correct && updatedCardData.explanation) {
          return { ...opt, content: updatedCardData.explanation }
        }
        return opt
      })

      const payload = {
        content: updatedCardData.content,
        explanation: updatedCardData.explanation,
        ai_explanation: updatedCardData.ai_explanation,
        image: updatedCardData.image || null,
        audio: updatedCardData.audio || null,
        front_img: updatedCardData.front_img || '',
        back_img: updatedCardData.back_img || '',
        front_audio_url: updatedCardData.front_audio_url || '',
        back_audio_url: updatedCardData.back_audio_url || '',
        front_audio_content: updatedCardData.front_audio_content || '',
        back_audio_content: updatedCardData.back_audio_content || '',
        others: finalOthers,
        options: updatedOptions
      };

      await axios.patch(`/api/v1/deck/question/${currentQuestion.id}`, payload)
      
      // Update local state
      setSession((prev: any) => {
        const newQs = [...prev.questions]
        newQs[currentIndex] = { 
          ...newQs[currentIndex], 
          ...payload,
          options: updatedOptions 
        }
        return { ...prev, questions: newQs }
      })
      
      setEditFormData(null)
      setIsEditModalOpen(false)
    } catch (e) {
      console.error("Failed to save edited question:", e)
      alert("Failed to save changes.")
    } finally {
      setIsSavingEdit(false)
    }
  }

  const copyCurrentTabContent = (type: 'default' | 'prompt' | 'question' = 'default', activeTabId?: string) => {
    let content = ''
    if (activeFeedbackTab === 'insight') {
      if (type === 'question') {
        content = currentQuestion?.content || ''
      } else if (type === 'prompt') {
        const targetPrompt = session.ai_prompts?.find((p: any) => p.column === activeTabId || p.id === activeTabId)
        const promptTemplate = targetPrompt?.prompt || ''
        
        if (promptTemplate) {
          const optionsText = currentQuestion?.options ? currentQuestion.options.map((opt, i) => `${String.fromCharCode(65 + i)}. ${opt.content}`).join('\n') : ''
          const correctOpt = currentQuestion?.options?.find(o => o.is_correct)
          const correctAnswerText = correctOpt ? `${String.fromCharCode(65 + (currentQuestion?.options?.indexOf(correctOpt) ?? 0))}. ${correctOpt.content}` : 'Unknown'
          
          content = promptTemplate
            .replace(/{{question}}/g, currentQuestion?.content || '')
            .replace(/{{options}}/g, optionsText)
            .replace(/{{correct_answer}}/g, correctAnswerText)
            .replace(/{{global_instruction}}/g, session.instruction || '')
            .replace(/{{quiz_title}}/g, session.title || '')
            .replace(/{{quiz_description}}/g, session.description || '')
        }
      } else {
        if (activeTabId === 'explanation' || activeTabId === 'back') {
          content = currentQuestion?.explanation || ''
        } else {
          content = currentQuestion?.others?.ai_responses?.[activeTabId || ''] || currentQuestion?.others?.[activeTabId || ''] || ''
        }
      }
    }
    else if (activeFeedbackTab === 'note') content = personalNote || ''
    
    if (content) {
      navigator.clipboard.writeText(content)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 1500)
      setIsCopyMenuOpen(false)
    }
  }

  const handleEditCurrentTab = () => {
    if (activeFeedbackTab === 'note') {
      if (isEditingNote) saveNote()
      setIsEditingNote(!isEditingNote)
    } else {
      openEditModal()
    }
  }

  const copyQuestionToClipboard = () => {
    if (!currentQuestion) return
    const text = `Question: ${currentQuestion.content}\n` + 
                 currentQuestion.options.map((opt, i) => `${String.fromCharCode(65 + i)}: ${opt.content}`).join('\n')
    navigator.clipboard.writeText(text)
    alert("Copied to clipboard!")
  }

  const renderPracticeLockScreen = () => {
    return (
      <div className="flex-1 bg-white/60 backdrop-blur-xl md:rounded-[2rem] rounded-[1.25rem] border border-slate-100 md:p-12 p-6 flex flex-col items-center justify-center text-center shadow-2xl shadow-indigo-100/40 min-h-[400px]">
        <div className="max-w-md mx-auto space-y-6">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", damping: 15 }}
            className="w-20 h-20 bg-indigo-50 border border-indigo-100/80 rounded-[2rem] flex items-center justify-center text-indigo-500 mx-auto shadow-inner"
          >
            <Lock className="w-10 h-10" />
          </motion.div>
          
          <div className="space-y-2">
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight italic">
              Chế độ luyện tập chưa mở
            </h2>
            <p className="text-xs text-slate-400 font-medium leading-relaxed max-w-sm mx-auto">
              Chủ sở hữu bộ thẻ chưa cấu hình thiết lập luyện tập (MCQ, Gõ từ, Nghe) cho bộ thẻ này. Chỉ chủ sở hữu mới có quyền kích hoạt chế độ luyện tập.
            </p>
          </div>
          
          <div className="pt-2">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-wider">
              <span>Hỏi-Đáp chưa được thiết lập</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderPracticeSetupScreen = () => {
    return (
      <div className="flex-1 bg-white md:rounded-[2rem] rounded-[1.25rem] border border-slate-100 md:p-8 p-6 flex flex-col justify-between shadow-2xl shadow-indigo-100/40 min-h-0 overflow-y-auto">
        <div className="max-w-2xl mx-auto w-full py-4">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mx-auto mb-3 border border-indigo-100">
              <Sliders className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-black text-slate-800">
              Cấu hình Luyện tập: {practiceSubMode === 'mcq' ? 'Trắc nghiệm' : practiceSubMode === 'typing' ? 'Gõ từ vựng' : 'Nghe'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">Chọn các cặp cột dữ liệu bạn muốn ghép cặp làm câu hỏi và câu trả lời.</p>
          </div>

          <div className="space-y-4 mb-6">
            <span className="text-[10px] font-black text-slate-400 tracking-wider uppercase block">Các cặp cột hỏi-đáp đang học</span>
            {setupPairs.map((pair, idx) => (
              <div key={idx} className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="flex-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Cột Câu hỏi</label>
                  <select
                    value={pair.q}
                    onChange={(e) => {
                      const newPairs = [...setupPairs];
                      newPairs[idx].q = e.target.value;
                      setSetupPairs(newPairs);
                    }}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all"
                  >
                    {availableColumns.map(col => (
                      <option key={col} value={col}>{col.toUpperCase()}</option>
                    ))}
                  </select>
                </div>

                <div className="text-slate-300 font-bold text-xs mt-4">➔</div>

                <div className="flex-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Cột Đáp án</label>
                  <select
                    value={pair.a}
                    onChange={(e) => {
                      const newPairs = [...setupPairs];
                      newPairs[idx].a = e.target.value;
                      setSetupPairs(newPairs);
                    }}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all"
                  >
                    {availableColumns.map(col => (
                      <option key={col} value={col}>{col.toUpperCase()}</option>
                    ))}
                  </select>
                </div>

                {setupPairs.length > 1 && (
                  <button
                    onClick={() => {
                      const newPairs = setupPairs.filter((_, i) => i !== idx);
                      setSetupPairs(newPairs);
                    }}
                    className="mt-4 p-2 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-100 transition-all border border-rose-100"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}

            <button
              onClick={() => setSetupPairs([...setupPairs, { q: 'front', a: 'back' }])}
              className="w-full py-3 rounded-2xl border border-dashed border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50/20 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
            >
              <span>+ Thêm cặp hỏi-đáp</span>
            </button>
          </div>

          {(practiceSubMode === 'mcq' || practiceSubMode === 'listening') && (
            <div className="mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <label className="text-[10px] font-black text-slate-400 tracking-wider uppercase block mb-2">Số lượng Lựa chọn MCQ</label>
              <div className="grid grid-cols-4 gap-2">
                {[3, 4, 5, 6].map(num => (
                  <button
                    key={num}
                    onClick={() => setSetupNumChoices(num)}
                    className={cn(
                      "py-2 rounded-xl text-xs font-black transition-all border",
                      setupNumChoices === num
                        ? "bg-white border-indigo-500 text-indigo-600 shadow-sm shadow-indigo-100"
                        : "bg-white border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300"
                    )}
                  >
                    {num} Lựa chọn {num === 4 && "(Gợi ý)"}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="max-w-2xl mx-auto w-full flex flex-col md:flex-row gap-3 pt-4 border-t border-slate-50">
          {canEdit && (
            <button
              onClick={() => savePracticeSettings(setupPairs, setupNumChoices, true)}
              className="flex-1 py-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-600 font-black text-xs uppercase hover:bg-slate-100 active:scale-95 transition-all shadow-sm flex items-center justify-center gap-1.5"
            >
              <Sliders className="w-4 h-4" />
              <span>Đặt làm mặc định Deck</span>
            </button>
          )}

          <button
            onClick={() => savePracticeSettings(setupPairs, setupNumChoices, false)}
            className="flex-[2] py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-black text-xs uppercase hover:shadow-lg hover:shadow-indigo-100 active:scale-95 transition-all flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-4 h-4" />
            <span>Lưu & Bắt đầu học 🚀</span>
          </button>
        </div>
      </div>
    );
  };

  const renderPracticeScreen = () => {
    const practiceData = currentPracticeData;
    if (!currentQuestion || !practiceData) {
      return (
        <div className="flex-1 bg-white md:rounded-[2rem] rounded-[1.25rem] border border-slate-100 flex items-center justify-center font-bold text-slate-400">
          Chưa có câu hỏi luyện tập nào sẵn sàng...
        </div>
      );
    }

    const { question, choices, correct_index, correct_answer, question_key, answer_key } = practiceData;
    const answered = practiceAnswers[currentIndex] !== undefined;

    if (!question || !correct_answer) {
      return (
        <div className="flex-1 bg-white md:rounded-[3rem] rounded-[2rem] border border-slate-100 p-8 flex flex-col items-center justify-center text-center gap-4 shadow-2xl shadow-indigo-100/40">
          <div className="w-16 h-16 bg-amber-50 rounded-2xl border border-amber-100 flex items-center justify-center text-amber-500 mb-2">
            <Sliders className="w-8 h-8 animate-pulse" />
          </div>
          <h3 className="text-lg font-black text-slate-800">Chưa thiết lập Cặp cột Hỏi-Đáp</h3>
          <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
            Hệ thống chưa tìm thấy dữ liệu Hỏi-Đáp phù hợp. Vui lòng thiết lập Cặp cột câu hỏi để bắt đầu luyện tập nhé!
          </p>
          <button
            onClick={() => navigate(`/practice/${id}/setting`)}
            className="mt-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-black text-xs uppercase hover:shadow-lg active:scale-95 transition-all flex items-center gap-1.5"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Thiết lập Cấu hình ⚙️</span>
          </button>
        </div>
      );
    }

    return (
      <div className="flex-1 bg-white md:rounded-[2rem] rounded-[1.25rem] border border-slate-100 md:p-8 p-6 flex flex-col justify-between shadow-2xl shadow-indigo-100/40 min-h-0 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black tracking-wider text-indigo-600 bg-indigo-50/80 px-2.5 py-1.5 rounded-lg border border-indigo-100/50 uppercase shadow-sm flex items-center gap-1">
              <span>{question_key.toUpperCase()}</span>
              <span className="opacity-60">➔</span>
              <span className="font-extrabold">{answer_key.toUpperCase()}</span>
            </span>
          </div>
          <span className="text-[10px] font-black tracking-wider text-slate-500 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100 shadow-sm">
            Câu luyện tập: #{practiceTotalAnswered + 1}
          </span>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center py-6 text-center">
          {showImages && currentQuestion.image && practiceSubMode !== 'listening' && (
            <img 
              src={currentQuestion.image} 
              alt="Question" 
              className="max-h-36 object-contain rounded-2xl mb-4 border border-slate-100 shadow-sm cursor-zoom-in hover:opacity-95 transition-opacity" 
              onClick={() => setZoomedImage(currentQuestion.image || null)}
            />
          )}
          
          {practiceSubMode === 'listening' ? (
            <div className="flex flex-col items-center gap-4">
              <div 
                onClick={() => {
                  const { question: qText, question_key: qKey } = practiceData!;
                  if (qKey === 'front') {
                    playCardAudio('front');
                  } else {
                    speakMultiLanguage(qText);
                  }
                }}
                className="relative w-24 h-24 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center shadow-lg shadow-indigo-100/50 hover:bg-indigo-100/30 active:scale-95 transition-all cursor-pointer group"
                title="Nhấn để nghe lại"
              >
                <div className="absolute inset-0 rounded-full bg-indigo-400/10 animate-ping" />
                <div className="absolute inset-2 rounded-full bg-indigo-300/20 animate-pulse" />
                <Play className="w-8 h-8 text-indigo-600 fill-indigo-600 group-hover:scale-110 transition-transform" />
              </div>
              <span className="text-[10px] font-black text-slate-400 tracking-wider uppercase mt-2">Nhấn để nghe lại</span>
            </div>
          ) : (
            <h2 className="text-2xl md:text-3xl font-black text-slate-800 leading-normal max-w-2xl px-4">
              <TypewriterText text={question} />
            </h2>
          )}
        </div>

        <div className="w-full max-w-2xl mx-auto pt-4 border-t border-slate-50">
          {['mcq', 'listening'].includes(practiceSubMode) && choices && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              {choices.map((choice: string, idx: number) => {
                const isSelected = selectedOption === idx;
                const isCorrectChoice = idx === correct_index;
                
                let btnStyle = "border-slate-200 hover:bg-slate-50 text-slate-700 active:scale-[0.98] ";
                
                if (answered) {
                  if (isCorrectChoice) {
                    btnStyle = "bg-emerald-500 border-emerald-600 text-white shadow-lg shadow-emerald-100 scale-[1.02] ";
                  } else if (isSelected) {
                    btnStyle = "bg-rose-500 border-rose-600 text-white shadow-lg shadow-rose-100 ";
                  } else {
                    btnStyle = "border-slate-100 bg-slate-50 opacity-40 text-slate-400 pointer-events-none ";
                  }
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleMCQAnswer(idx)}
                    disabled={answered}
                    className={cn(
                      "group p-4 rounded-2xl border text-left font-bold text-sm transition-all duration-200 flex items-center justify-between gap-3 min-h-[56px] shadow-sm",
                      btnStyle
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-black border",
                        answered && isCorrectChoice ? "bg-white text-emerald-600 border-emerald-400" :
                        answered && isSelected ? "bg-white text-rose-600 border-rose-400" :
                        "bg-white border-slate-200 text-slate-400"
                      )}>
                        {idx + 1}
                      </span>
                      <span dangerouslySetInnerHTML={{ __html: parseBBCodeToHtml(choice) }} />
                    </div>

                    {answered && isCorrectChoice && (
                      <Check className="w-4 h-4 stroke-[3] text-white flex-shrink-0" />
                    )}
                    {answered && isSelected && !isCorrectChoice && (
                      <X className="w-4 h-4 stroke-[3] text-white flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {practiceSubMode === 'typing' && (
            <div className="space-y-4 mb-4">
              {!answered ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={typingInput}
                    onChange={(e) => setTypingInput(e.target.value)}
                    placeholder="Gõ từ vựng..."
                    autoFocus
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-inner"
                  />
                  <button
                    onClick={handleTypingAnswer}
                    className="px-6 py-3 rounded-2xl bg-indigo-600 text-white font-black text-xs uppercase hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-100 active:scale-95 transition-all"
                  >
                    Kiểm tra
                  </button>
                </div>
              ) : typingFeedback && (
                <div className="space-y-3">
                  <div className={cn(
                    "flex items-center gap-3 p-4 rounded-2xl border",
                    typingFeedback.isCorrect 
                      ? "bg-emerald-50/50 border-emerald-200 text-emerald-800" 
                      : "bg-rose-50/50 border-rose-200 text-rose-800"
                  )}>
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-white shadow-sm",
                      typingFeedback.isCorrect ? "bg-emerald-500" : "bg-rose-500"
                    )}>
                      {typingFeedback.isCorrect ? <Check className="w-4 h-4 stroke-[3]" /> : <X className="w-4 h-4 stroke-[3]" />}
                    </div>
                    <div className="text-xs">
                      <p className="font-black uppercase tracking-wider text-[9px] opacity-60">Đáp án của bạn</p>
                      <p className="font-bold text-sm">{typingInput || "(Trống)"}</p>
                    </div>
                  </div>

                  {!typingFeedback.isCorrect && (
                    <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl text-emerald-800 text-xs">
                      <p className="font-black uppercase tracking-wider text-[9px] opacity-60">Đáp án chính xác</p>
                      <p className="font-bold text-sm mt-0.5" dangerouslySetInnerHTML={{ __html: parseBBCodeToHtml(correct_answer || '') }} />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}


        </div>
      </div>
    );
  };

  const renderSessionStats = () => {
    return (
      <SessionStatsWidget
        isPractice={mainTab === 'practice'}
        practiceAnswers={practiceAnswers}
        sessionAnswers={sessionAnswers}
        session={session}
        practiceSubMode={practiceSubMode}
      />
    )
  }

  const renderPracticeStats = () => {
    const accuracy = practiceTotalAnswered > 0 
      ? Math.round((practiceCorrectCount / practiceTotalAnswered) * 100) 
      : 0;

    return (
      <div className="bg-slate-50/80 rounded-[1.5rem] p-5 border border-slate-100/50">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">THỐNG KÊ LUYỆN TẬP</span>
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full text-white">
            <Target className="w-2.5 h-2.5" />
            <span className="text-[9px] font-black">CHÍNH XÁC: {accuracy}%</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="space-y-3">
          {/* Questions answered */}
          <div className="flex items-center justify-between p-3.5 bg-white rounded-2xl shadow-sm border border-slate-100/50">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <HelpCircle className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-700">ĐÃ TRẢ LỜI</span>
                <span className="text-[8px] font-medium text-slate-400">Số câu hỏi đã luyện tập</span>
              </div>
            </div>
            <span className="text-xl font-black text-slate-700">{practiceTotalAnswered}</span>
          </div>

          {/* Correct count */}
          <div className="flex items-center justify-between p-3.5 bg-white rounded-2xl shadow-sm border border-slate-100/50">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <Check className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-700">ĐÚNG</span>
                <span className="text-[8px] font-medium text-slate-400">Trả lời chính xác</span>
              </div>
            </div>
            <span className="text-xl font-black text-emerald-600">{practiceCorrectCount}</span>
          </div>

          {/* Current streak */}
          <div className="flex items-center justify-between p-3.5 bg-white rounded-2xl shadow-sm border border-slate-100/50">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                <Flame className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-700">STREAK HIỆN TẠI</span>
                <span className="text-[8px] font-medium text-slate-400">Chuỗi trả lời đúng liên tiếp</span>
              </div>
            </div>
            <span className="text-xl font-black text-amber-600">{streak}</span>
          </div>

          {/* XP Gained */}
          <div className="flex items-center justify-between p-3.5 bg-white rounded-2xl shadow-sm border border-slate-100/50">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                <Trophy className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-700">XP TÍCH LŨY</span>
                <span className="text-[8px] font-medium text-slate-400">XP nhận được trong phiên</span>
              </div>
            </div>
            <span className="text-xl font-black text-purple-600">+{sessionXP} XP</span>
          </div>
        </div>
      </div>
    );
  }

  const renderQuestionMapGrid = () => {
    const isPractice = mainTab === 'practice';
    return (
      <div className="grid grid-cols-8 md:grid-cols-10 lg:grid-cols-5 gap-3 p-1 pb-4">
        {session.questions?.map((q: any, i: number) => {
          const hasAttemptedThisSession = isPractice 
            ? practiceAnswers[i] !== undefined 
            : sessionAnswers[i] !== undefined;
            
          const selectedOptIdx = isPractice 
            ? practiceAnswers[i] 
            : (() => {
                const attemptedRatings = Array.isArray(sessionAnswers[i]) 
                  ? (sessionAnswers[i] as number[]) 
                  : (typeof sessionAnswers[i] === 'number' ? [sessionAnswers[i] as number] : []);
                return attemptedRatings.length > 0 ? attemptedRatings[attemptedRatings.length - 1] : null;
              })();

          const isActive = currentIndex === i

          let fsrsClass = "border-slate-100 hover:border-indigo-200 bg-white text-slate-500 hover:bg-slate-50/50 font-bold"
          let fsrsStyle: any = {}

          const stats = q.stats || { total: 0, again_count: 0, hard_count: 0, good_count: 0, easy_count: 0 }
          const totalReviews = stats.total || 0

          if (totalReviews > 0) {
            const again = stats.again_count || 0
            const hard = stats.hard_count || 0
            const good = stats.good_count || 0
            const easy = stats.easy_count || 0
            const total = again + hard + good + easy

            if (total > 0) {
              const segments: string[] = []
              let currentPct = 0
              if (again > 0) {
                const nextPct = currentPct + (again / total) * 100
                segments.push(`#ffe4e6 ${currentPct.toFixed(1)}%, #ffe4e6 ${nextPct.toFixed(1)}%`)
                currentPct = nextPct
              }
              if (hard > 0) {
                const nextPct = currentPct + (hard / total) * 100
                segments.push(`#fef3c7 ${currentPct.toFixed(1)}%, #fef3c7 ${nextPct.toFixed(1)}%`)
                currentPct = nextPct
              }
              if (good > 0) {
                const nextPct = currentPct + (good / total) * 100
                segments.push(`#e0e7ff ${currentPct.toFixed(1)}%, #e0e7ff ${nextPct.toFixed(1)}%`)
                currentPct = nextPct
              }
              if (easy > 0) {
                const nextPct = currentPct + (easy / total) * 100
                segments.push(`#d1fae5 ${currentPct.toFixed(1)}%, #d1fae5 ${nextPct.toFixed(1)}%`)
                currentPct = nextPct
              }

              fsrsStyle = {
                background: `linear-gradient(to top, ${segments.join(', ')})`,
                color: '#1e293b',
                borderColor: '#cbd5e1'
              }
              fsrsClass = "shadow-sm animate-in zoom-in-95 duration-200 font-bold text-slate-800 border-slate-300"
            } else {
              const box = q.box_level || 1
              if (box === 5) {
                fsrsClass = "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100/60"
              } else if (box === 4) {
                fsrsClass = "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100/60"
              } else if (box === 3 || box === 2) {
                fsrsClass = "border-amber-200 bg-amber-50/70 text-amber-700 hover:bg-amber-100/60"
              } else {
                fsrsClass = "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100/60"
              }
            }
          }

          return (
            <button 
              key={i} 
              onClick={() => {
                navigateToQuestion(i)
                setIsMapOpen(false)
              }}
              className={cn(
                "relative aspect-square rounded-xl border flex flex-col items-center justify-center font-black text-[11px] transition-all duration-200",
                isActive 
                  ? "border-indigo-600 ring-4 ring-indigo-500/30 z-10 scale-105 shadow-md" 
                  : "",
                fsrsClass
              )}
              style={fsrsStyle}
            >
              <span className={cn("relative z-10 text-[12px] text-slate-800")}>{i + 1}</span>
              {hasAttemptedThisSession && (
                <span className={cn(
                  "text-[6px] font-black tracking-tighter opacity-90 mt-0.5 uppercase z-10 relative",
                  isPractice
                    ? (selectedOptIdx === q.practice?.correct_index ? "text-emerald-600" : "text-rose-600")
                    : (selectedOptIdx === 0 ? "text-rose-600" :
                       selectedOptIdx === 1 ? "text-amber-600" :
                       selectedOptIdx === 2 ? "text-indigo-600" :
                       "text-emerald-600")
                )}>
                  {isPractice
                    ? (selectedOptIdx === q.practice?.correct_index ? "CORRECT" : "WRONG")
                    : (selectedOptIdx === 0 ? "AGAIN" : selectedOptIdx === 1 ? "HARD" : selectedOptIdx === 2 ? "GOOD" : "EASY")}
                </span>
              )}
            </button>
          )
        })}
      </div>
    );
  }

  useKeyboardShortcuts({
    mainTab,
    practiceSubMode,
    showFeedback,
    isFlipped,
    hasRated,
    isSessionSummaryOpen,
    isQuitModalOpen,
    isEditModalOpen,
    isMapOpen,
    isFeedbackOpen,
    currentPracticeChoicesCount: currentPracticeData?.choices?.length || 0,
    openEditModal,
    handleNext,
    handleTypingAnswer,
    handleMCQAnswer,
    handleReviewRating,
    setIsFlipped,
    setShowFeedback,
    showImages,
    setShowImages,
    activeMode
  });

  const shouldShowRoadmapStepCompleteScreen = useMemo(() => {
    if (activeMode !== 'roadmap' || !roadmapStatus?.pipeline) return false;
    
    // If all steps in roadmap are completed
    if (roadmapStatus.all_done) return true;

    const isStage1Done = Boolean(roadmapStatus.stage_1_done);
    const isStage2Done = Boolean(roadmapStatus.stage_2_done);

    // If step 1 (new cards) is completed and step 2 test is pending:
    if (isStage1Done && !isStage2Done) {
      const testStep = roadmapStatus.pipeline.find((s: any) => s.type === 'mcq' || s.type === 'typing' || s.type === 'listening');
      if (testStep) {
        return true;
      }
    }

    return false;
  }, [activeMode, roadmapStatus]);

  useEffect(() => {
    if (shouldShowRoadmapStepCompleteScreen) {
      confetti({ zIndex: 9999, particleCount: 150, spread: 80, origin: { y: 0.5 } });
    }
  }, [shouldShowRoadmapStepCompleteScreen]);

  const [isStudyConsoleOpen, setIsStudyConsoleOpen] = useState(false);

  const renderRoadmapStepCompleteScreen = () => {
    return (
      <RoadmapCompleteScreen
        roadmapStatus={roadmapStatus}
        nextActionUrl={nextActionUrl}
        nextActionLabel={nextActionLabel}
        onNavigate={(url) => navigate(url)}
        onLearnMoreNew={() => applyLearningMode('new')}
        onOpenStudyConsole={() => setIsStudyConsoleOpen(true)}
      />
    )
  };

  const shouldShowFsrsCompleteScreen = useMemo(() => {
    return Boolean((activeMode === 'fsrs' || activeMode === 'review') && fsrsCompletionData?.is_all_completed);
  }, [activeMode, fsrsCompletionData]);

  useEffect(() => {
    if (shouldShowFsrsCompleteScreen) {
      confetti({ zIndex: 9999, particleCount: 150, spread: 80, origin: { y: 0.5 } });
    }
  }, [shouldShowFsrsCompleteScreen]);

  const renderFsrsCompleteScreen = () => {
    return (
      <FsrsCompleteScreen
        fsrsCompletionData={fsrsCompletionData}
        session={session}
        deckId={id}
        onFreeReview={() => {
          setFsrsCompletionData(null)
          applyLearningMode('flip')
        }}
        onViewDeckDetail={() => navigate(`/decks/${id}`)}
        onBackToLibrary={() => navigate('/decks?tab=library')}
      />
    )
  };

  if (!session || currentIndex < 0) return <SessionLoadingScreen />

  return (
    <div className="h-screen h-[100dvh] flex flex-col bg-gradient-to-br from-slate-50 via-indigo-50/20 to-slate-50 text-slate-900 font-sans overflow-hidden relative">
      <FloatingToasts
        badgeVisible={badgeVisible}
        selectedOption={selectedOption}
        currentQuestion={currentQuestion}
        badgeMessage={badgeMessage}
        xpFloat={xpFloat}
        activeGoal={activeGoal}
        goalToast={goalToast}
        setGoalToast={setGoalToast}
        learningModeAlert={learningModeAlert}
        setLearningModeAlert={setLearningModeAlert}
      />

      {(() => {
          const rawPipeline: PipelineStepStatus[] = roadmapStatus?.pipeline || [
            {
              type: (activeMode === 'new' ? 'new_cards' : 'fsrs_review') as any,
              label: activeMode === 'new' ? 'Học Từ Mới' : (activeMode === 'review' ? 'Ôn Tập Thẻ Cũ' : 'Ôn Tập FSRS'),
              daily_count: session?.questions?.length || 20,
              done: false,
              url: `/flashcard/${id}/play`,
              progress: {}
            }
          ];

          const rawIdx = roadmapStatus?.current_step_index || 0;
          let displayStepIdx = rawIdx;
          const isStage1Done = roadmapStatus?.stage_1_done || false;
          const isStage2Done = roadmapStatus?.stage_2_done || false;
          const firstCard = session?.questions?.[0];
          const isNewCardSession = firstCard ? (firstCard.is_new || firstCard.state === 0 || firstCard.repetition === 0) : true;

          let modeBadge: { emoji: string; label: string; short: string; style: string } | undefined = undefined;
          let subCurr = 0;
          let subTotal = session?.questions?.length || 20;
          let progressPillText: string | undefined = undefined;

          if (activeMode === 'fsrs') {
            const fsrsIdx = rawPipeline.findIndex((s: any) => s.type === 'fsrs_review');
            if (fsrsIdx !== -1) displayStepIdx = fsrsIdx;
            modeBadge = {
              emoji: '🧠',
              label: 'FSRS Spaced Repetition v6',
              short: 'FSRS',
              style: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
            };

            const totalDeckCards = session?.questions?.length || 0;
            const nowTime = new Date().getTime();

            // 1. Count total learned cards in the whole deck (from DB + session)
            const totalLearnedCards = session?.questions ? session.questions.filter((q: any, idx: number) => {
              const box = getCardBoxId(q);
              const isLearnedInDB = box !== 'unseen';
              const isAnsweredThisSession = sessionAnswers[idx] !== undefined;
              return isLearnedInDB || isAnsweredThisSession;
            }).length : 0;

            // 2. Identify due review cards
            const dueCardsIndices = session?.questions ? session.questions.map((q: any, idx: number) => {
              if (q.is_ignored) return -1;
              const box = getCardBoxId(q);
              if (box === 'unseen' || !q.fsrs?.due) return -1;
              const isDue = (parseUTCDate(q.fsrs.due).getTime() - 30000) <= nowTime;
              return isDue ? idx : -1;
            }).filter((idx: number) => idx !== -1) : [];

            // 3. Determine if current card being viewed is an active due review card or in new cards phase
            const isCurrentCardActiveReview = dueCardsIndices.includes(currentIndex);

            if (isCurrentCardActiveReview) {
              // Thẻ ôn tập: Hiển thị "Còn X" (ví dụ: Còn 2, Còn 1)
              const unreviewedDueCount = dueCardsIndices.filter((idx: number) => sessionAnswers[idx] === undefined).length;
              subCurr = unreviewedDueCount;
              subTotal = dueCardsIndices.length > 0 ? dueCardsIndices.length : totalDeckCards;
              progressPillText = `Còn ${unreviewedDueCount}`;
            } else {
              // Thẻ mới (⭐ MỚI): Hiển thị [Số từ đã học] / [Tổng số từ của bộ thẻ] (ví dụ: 3 / 26 -> sau khi đánh giá nhảy lên 4 / 26)
              subCurr = totalLearnedCards;
              subTotal = totalDeckCards;
              progressPillText = undefined;
            }
          } else if (activeMode === 'review') {
            const fsrsIdx = rawPipeline.findIndex((s: any) => s.type === 'fsrs_review');
            if (fsrsIdx !== -1) displayStepIdx = fsrsIdx;
            modeBadge = {
              emoji: '📚',
              label: 'Chỉ Ôn Tập Thẻ Cũ (Review Only)',
              short: 'REV',
              style: 'bg-teal-500/20 border-teal-500/40 text-teal-300'
            };
            const learnedTotal = session?.questions ? session.questions.filter((q: any) => {
              return q.fsrs ? (q.fsrs.state > 0 || q.fsrs.last_review !== null) : (!q.is_new && q.is_new !== undefined);
            }).length : (roadmapStatus?.learned_cards || session?.questions?.length || 0);
            
            const reviewedCount = (roadmapStatus?.review_completed_today ?? 0) + Object.keys(sessionAnswers).length;
            subTotal = learnedTotal > 0 ? learnedTotal : (session?.questions?.length || 15);
            subCurr = reviewedCount;
          } else if (activeMode === 'new') {
            const newCardsIdx = rawPipeline.findIndex((s: any) => s.type === 'new_cards');
            if (newCardsIdx !== -1) displayStepIdx = newCardsIdx;
            modeBadge = {
              emoji: '✨',
              label: 'Học Thẻ Mới (New Only)',
              short: 'NEW',
              style: 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
            };
            
            subTotal = session?.questions?.length || roadmapStatus?.total_cards || 0;
            const initialLearnedCount = session?.questions ? session.questions.filter((q: any) => {
              const isLearned = q.fsrs ? (q.fsrs.state > 0 || q.fsrs.last_review !== null) : (!q.is_new && q.is_new !== undefined);
              return isLearned;
            }).length : (roadmapStatus?.learned_cards || 0);

            const newlyAnsweredCount = session?.questions ? session.questions.filter((q: any, idx: number) => {
              const isLearnedBefore = q.fsrs ? (q.fsrs.state > 0 || q.fsrs.last_review !== null) : (!q.is_new && q.is_new !== undefined);
              return !isLearnedBefore && sessionAnswers[idx] !== undefined;
            }).length : Object.keys(sessionAnswers).length;

            subCurr = initialLearnedCount + newlyAnsweredCount;
          } else if (activeMode === 'flip') {
            modeBadge = {
              emoji: '🔄',
              label: 'Lật Thẻ Tự Do (Flip Card)',
              short: 'FLIP',
              style: 'bg-amber-500/20 border-amber-500/40 text-amber-300'
            };
            subTotal = session?.questions?.length || 1;
            subCurr = currentIndex + 1;
          } else {
            // Standard guided Roadmap mode (mode === 'roadmap')
            if (!isStage1Done || isNewCardSession || !isStage2Done) {
              const newCardsIdx = rawPipeline.findIndex((s: any) => s.type === 'new_cards');
              if (newCardsIdx !== -1) displayStepIdx = newCardsIdx;
            } else {
              const fsrsIdx = rawPipeline.findIndex((s: any) => s.type === 'fsrs_review');
              if (fsrsIdx !== -1) displayStepIdx = fsrsIdx;
            }

            const currentStep = rawPipeline?.[displayStepIdx];
            if (currentStep?.type === 'new_cards') {
              modeBadge = {
                emoji: '🛣️',
                label: 'Lộ trình - Học từ mới (Roadmap New)',
                short: 'RM',
                style: 'bg-amber-500/20 border-amber-500/40 text-amber-300'
              };
              const targetNew = currentStep.daily_count || currentStep.progress?.target || roadmapStatus?.new_target_today || 20;
              const learnedToday = currentStep.progress?.learned ?? roadmapStatus?.new_learned_today ?? 0;
              const newCardsInSession = Object.keys(sessionAnswers).filter(idxStr => {
                const q = session?.questions?.[Number(idxStr)];
                return q && (q.is_new || q.state === 0 || q.repetition === 0);
              }).length;
              subTotal = targetNew;
              subCurr = Math.max(learnedToday, newCardsInSession);
              progressPillText = undefined; // Hiển thị số thẻ mới / tổng số thẻ (ví dụ 7 / 20)
            } else {
              modeBadge = {
                emoji: '🛣️',
                label: 'Lộ trình - Ôn tập (Roadmap Review)',
                short: 'RM',
                style: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
              };
              const reviewedToday = currentStep?.progress?.reviewed_today ?? roadmapStatus?.review_completed_today ?? 0;
              const dueRemaining = currentStep?.progress?.due_count ?? roadmapStatus?.review_due_today ?? 0;
              const fsrsTarget = currentStep?.daily_count || currentStep?.progress?.target || (reviewedToday + dueRemaining);
              subTotal = fsrsTarget > 0 ? fsrsTarget : (session?.questions?.length || 15);

              // Đếm số thẻ ôn tập đến hạn còn lại chưa được đánh giá trong phiên này
              const nowTime = new Date().getTime();
              const dueCardsIndices = session?.questions ? session.questions.map((q: any, idx: number) => {
                if (q.is_ignored) return -1;
                const box = getCardBoxId(q);
                if (box === 'unseen' || !q.fsrs?.due) return -1;
                const isDue = (parseUTCDate(q.fsrs.due).getTime() - 30000) <= nowTime;
                return isDue ? idx : -1;
              }).filter((idx: number) => idx !== -1) : [];

              const unreviewedDueCount = dueCardsIndices.length > 0 
                ? dueCardsIndices.filter((idx: number) => sessionAnswers[idx] === undefined).length 
                : Math.max(0, dueRemaining - Object.keys(sessionAnswers).length);

              subCurr = unreviewedDueCount;
              progressPillText = `Còn ${unreviewedDueCount}`;
            }
          }

          const activePercent = subTotal > 0 ? Math.min(100, Math.round((subCurr / subTotal) * 100)) : 0;
          const answeredCount = Object.keys(sessionAnswers).length;
          const correctCount = Object.values(sessionAnswers).filter(val => {
            const r = Array.isArray(val) ? val[val.length - 1] : val;
            return typeof r === 'number' && r >= 3;
          }).length;
          const totalCards = session?.questions?.length || 0;
          const cardsRemaining = Math.max(0, totalCards - currentIndex - 1);

          return (
            <FlashcardHeader
              isHeaderSurging={isHeaderSurging}
              activeMode={activeMode}
              activePercent={activePercent}
              pipeline={rawPipeline}
              displayStepIdx={displayStepIdx}
              allDone={Boolean(roadmapStatus?.all_done)}
              deckId={id || ''}
              deckTitle={session?.title}
              subCurr={subCurr}
              subTotal={subTotal}
              progressPillText={progressPillText}
              streakCount={roadmapStatus?.streak || gamify.streak || 0}
              modeBadge={modeBadge}
              onSurgeChange={setIsHeaderSurging}
              onViewModeChange={setHeaderViewMode}
              onExit={() => navigate('/')}
              timeMode={timeMode as any}
              onToggleTimeMode={toggleTimeMode}
              initialTodayTime={initialTodayTime}
              initialAllTimeTime={initialAllTimeTime}
              showFeedback={showFeedback}
              hasRated={selectedOption !== null}
              currentIndex={currentIndex}
              timeLeftRef={timeLeftRef}
              sessionStudyTimeRef={sessionStudyTimeRef}
              formatHeaderTime={formatHeaderTime}
              scoreMode={scoreMode as any}
              onToggleScoreMode={toggleScoreMode}
              xp={gamify.xp}
              todayXP={initialTodayXP + sessionXP}
              sessionXP={sessionXP}
              answeredCount={answeredCount}
              correctCount={correctCount}
              totalCards={totalCards}
              cardsRemaining={cardsRemaining}
            />
          );
        })()}

      {/* Decoupled - Practice mode moved to standalone /practice/:id page */}

      <main className="flex-1 min-h-0 flex w-full max-w-none justify-center gap-4 lg:gap-8 px-2 lg:px-6 xl:px-10 md:py-3 py-2 overflow-hidden">
        <aside className="hidden xl:flex w-[340px] 2xl:w-[440px] flex-shrink-0 flex-col min-h-0 overflow-hidden bg-white border border-slate-100 rounded-[2.5rem] shadow-sm">
          {showFeedback ? (
            <FeedbackArea
              showFeedback={showFeedback}
              activeFeedbackTab={activeFeedbackTab}
              setActiveFeedbackTab={setActiveFeedbackTab}
              getInsightText={getInsightText}
              isEditingInsight={isEditingInsight}
              insightInput={insightInput}
              setInsightInput={setInsightInput}
              currentQuestion={currentQuestion}
              canEdit={canEdit}
              clearAIExplanation={clearAIExplanation}
              isEditingAI={isEditingAI}
              setIsEditingAI={setIsEditingAI}
              isEditingPrompt={isEditingPrompt}
              setIsEditingPrompt={setIsEditingPrompt}
              askAI={askAI}
              isAskingAI={isAskingAI}
              aiInput={aiInput}
              setAiInput={setAiInput}
              promptInput={promptInput}
              setPromptInput={setPromptInput}
              savePrompt={savePrompt}
              saveNote={saveNote}
              personalNote={personalNote}
              setPersonalNote={setPersonalNote}
              isEditingNote={isEditingNote}
              setIsEditingNote={setIsEditingNote}
              isMobile={false}
              handleEditCurrentTab={handleEditCurrentTab}
              isCopyMenuOpen={isCopyMenuOpen}
              setIsCopyMenuOpen={setIsCopyMenuOpen}
              copyCurrentTabContent={copyCurrentTabContent}
              isCopied={isCopied}
              handleNext={handleNext}
              deckInfo={session}
            />
          ) : (
            <div className="flex flex-col h-full bg-slate-50/40">
              {/* Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">
                  {mainTab === 'practice' ? "Practice Details" : "Review & Goals"}
                </span>
                {activeGoal && activeMode !== 'review' && (
                  <span className={cn(
                    "text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm",
                    activeGoal.is_target_met 
                      ? "bg-emerald-100 text-emerald-700 border border-emerald-200" 
                      : "bg-amber-100 text-amber-700 border border-amber-200"
                  )}>
                    {activeGoal.is_target_met ? "Goal Reached" : "In Progress"}
                  </span>
                )}
              </div>
              
              <div className="flex-1 flex flex-col p-5 gap-4 overflow-y-auto">
                {/* 1. Roadmap Pipeline Progress Card */}
                {roadmapStatus && roadmapStatus.roadmap_active ? (
                  <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black">
                          🗺️
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-slate-800">Lộ Trình Roadmap</h4>
                          <p className="text-[10px] text-slate-400 font-semibold">
                            {roadmapStatus.all_done ? '✅ Đã Xong Hôm Nay' : `Bước ${roadmapStatus.current_step_index + 1}/${roadmapStatus.pipeline?.length || 1}`}
                          </p>
                        </div>
                      </div>
                      <span className={cn(
                        "text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider",
                        roadmapStatus.all_done ? "bg-emerald-100 text-emerald-700" : "bg-indigo-100 text-indigo-700"
                      )}>
                        {roadmapStatus.all_done ? 'Hoàn Thành' : 'Đang Học'}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {roadmapStatus.pipeline?.map((st: any, sIdx: number) => {
                        const isCurrent = sIdx === roadmapStatus.current_step_index && !roadmapStatus.all_done
                        return (
                          <div
                            key={sIdx}
                            className={cn(
                              "p-2.5 rounded-2xl border text-xs font-bold flex items-center justify-between transition-all",
                              st.done ? "bg-emerald-50/60 border-emerald-200 text-emerald-800" :
                              isCurrent ? "bg-indigo-50 border-indigo-300 text-indigo-900 ring-2 ring-indigo-500/20" :
                              "bg-slate-50 border-slate-100 text-slate-400 opacity-60"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black">
                                {st.done ? '✓' : `${sIdx + 1}.`}
                              </span>
                              <span>{st.label}</span>
                            </div>

                            <div className="text-[10px] font-black">
                              {st.type === 'new_cards' && `${st.progress?.learned || 0}/${st.daily_count} từ`}
                              {st.type === 'fsrs_review' && `Còn ${st.progress?.due_count || 0} thẻ`}
                              {(st.type === 'mcq' || st.type === 'typing') && `${st.progress?.best_score || 0}/${st.pass_threshold}%`}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 font-black">
                        📚
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-700">Chế Độ Tự Do</h4>
                        <p className="text-[10px] text-slate-400 font-medium">Bật Lộ trình để tạo pipeline</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Personal Achievement & Streak Card */}
                <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500">
                        <Flame className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-700">Learning Streak</h4>
                        <p className="text-[10px] text-slate-400 font-medium">Consecutive days</p>
                      </div>
                    </div>
                    <span className="text-xs font-black text-orange-600 bg-orange-50 px-2.5 py-1 rounded-xl border border-orange-100 shadow-sm">
                      {gamify.streak} days 🔥
                    </span>
                  </div>

                  <div className="pt-3 border-t border-slate-50 space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-600">Level {gamify.level}</span>
                      <span className="font-bold text-slate-400">{gamify.xp % 1000} / 1000 XP</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-orange-400 rounded-full"
                        style={{ width: `${(gamify.xp % 1000) / 10}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium">
                      {1000 - (gamify.xp % 1000)} XP more to reach level {gamify.level + 1}!
                    </p>
                  </div>
                </div>

                {/* 3. Leaderboard Recommendation Card */}
                <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm space-y-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500">
                      <Trophy className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-700">
                        Bảng xếp hạng {leaderboardType === 'xp' ? 'XP' : leaderboardType === 'streak' ? 'Streak' : leaderboardType === 'questions' ? 'câu hỏi' : 'chính xác'}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-medium">
                        Đua top {leaderboardTimeFilter === 'today' ? 'hôm nay' : leaderboardTimeFilter === 'week' ? 'tuần này' : leaderboardTimeFilter === 'month' ? 'tháng này' : 'mọi lúc'}
                      </p>
                    </div>
                  </div>

                  {/* Metric Switcher */}
                  <div className="flex bg-slate-50 p-0.5 rounded-xl border border-slate-100 overflow-x-auto no-scrollbar gap-0.5">
                    {(['xp', 'streak', 'questions', 'accuracy'] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => setLeaderboardType(type)}
                        className={cn(
                          "flex-1 py-1 px-1.5 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all whitespace-nowrap text-center",
                          leaderboardType === type 
                            ? "bg-white text-indigo-650 shadow-sm border border-slate-100/50" 
                            : "text-slate-400 hover:text-indigo-650"
                        )}
                      >
                        {type === 'xp' ? 'XP' : type === 'streak' ? 'Streak' : type === 'questions' ? 'Questions' : 'Accuracy'}
                      </button>
                    ))}
                  </div>

                  {/* Time Filter Switcher */}
                  <div className="flex bg-slate-50 p-0.5 rounded-xl border border-slate-100 overflow-x-auto no-scrollbar gap-0.5">
                    {(['today', 'week', 'month', 'all_time'] as const).map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setLeaderboardTimeFilter(filter)}
                        className={cn(
                          "flex-1 py-1 px-1.5 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all whitespace-nowrap text-center",
                          leaderboardTimeFilter === filter 
                            ? "bg-slate-900 text-white shadow-sm" 
                            : "text-slate-400 hover:text-slate-700"
                        )}
                      >
                        {filter === 'today' ? 'Hôm nay' : filter === 'week' ? 'Tuần này' : filter === 'month' ? 'Tháng này' : 'Tất cả'}
                      </button>
                    ))}
                  </div>

                  {/* Mini Leaderboard List */}
                  {isLeaderboardLoading ? (
                    <p className="text-[10px] text-slate-400 text-center py-4 font-bold animate-pulse">Đang tải bảng xếp hạng...</p>
                  ) : xpLeaderboard.list && xpLeaderboard.list.length > 0 ? (
                    <div className="space-y-1.5 py-1">
                      {xpLeaderboard.list.slice(0, 3).map((u: any, idx: number) => {
                        const displayValue = u.user_id === user?.id ? xpLeaderboard.user_value : u.value;
                        const unit = getUnitName(leaderboardType);
                        return (
                        <div 
                          key={u.user_id} 
                          className={cn(
                            "flex items-center justify-between p-2 rounded-2xl border transition-all text-xs",
                            u.user_id === user?.id 
                              ? "bg-indigo-50/50 border-indigo-100 font-black text-indigo-950" 
                              : "bg-slate-50/30 border-transparent text-slate-700"
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-base">
                              {idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉"}
                            </span>
                            <span className="font-bold truncate text-[11px] uppercase">
                              {u.full_name || u.username}
                            </span>
                            <span className="text-[9px] text-slate-400 font-medium">
                              Lv.{u.user_id === user?.id ? gamify.level : u.level}
                            </span>
                          </div>
                          <span className="font-black text-[11px] text-slate-900 shrink-0">
                            {displayValue.toLocaleString()} {unit}
                          </span>
                        </div>
                      )})}
                      
                      {/* Show user if they are not in Top 3 */}
                      {userRank > 3 && (() => {
                        const currentUserObj = xpLeaderboard.list.find((u: any) => u.user_id === user?.id) || {
                          full_name: user?.username || "",
                          level: gamify.level,
                          value: xpLeaderboard.user_value
                        };
                        const unit = getUnitName(leaderboardType);
                        return (
                          <>
                            <div className="text-center text-[10px] font-black text-slate-300 tracking-widest leading-none my-1">•••</div>
                            <div className="flex items-center justify-between p-2 rounded-2xl border bg-indigo-50 border-indigo-100 font-black text-indigo-950 text-xs">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-black text-indigo-600 w-5 text-center text-[10px]">
                                  #{userRank}
                                </span>
                                <span className="font-bold truncate text-[11px] uppercase">
                                  {currentUserObj.full_name || currentUserObj.username}
                                </span>
                                <span className="text-[9px] text-indigo-400 font-medium">
                                  Lv.{gamify.level}
                                </span>
                              </div>
                              <span className="font-black text-[11px] text-indigo-600 shrink-0">
                                {xpLeaderboard.user_value.toLocaleString()} {unit}
                              </span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-400 text-center py-2">Đang tải bảng xếp hạng...</p>
                  )}

                  <div className="p-3 bg-amber-50/50 rounded-2xl border border-amber-100/50">
                    <p className="text-[11px] text-slate-600 leading-relaxed font-semibold">
                      {leaderboardMsg}
                    </p>
                  </div>
                </div>

                {/* 4. Session Quick Stats */}
                <div className="bg-slate-100/50 p-4 rounded-[1.75rem] border border-slate-100 space-y-3">
                  <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-wider">
                    <span>Phiên học hiện tại</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm">
                      <span className="block font-black text-slate-700">
                        {mainTab === 'practice' ? Object.keys(practiceAnswers).length : Object.keys(sessionAnswers).length}
                      </span>
                      <span className="text-[8px] font-bold text-slate-400 uppercase">Đã làm</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm text-emerald-600">
                      <span className="block font-black">
                        {mainTab === 'practice' ? (
                          Object.entries(practiceAnswers).filter(([idx, ansIdx]) => {
                            const q = session?.questions?.[Number(idx)];
                            if (!q || !q.practice) return false;
                            if (practiceSubMode === 'typing') return ansIdx === 3;
                            return ansIdx === q.practice.correct_index;
                          }).length
                        ) : (
                          Object.entries(sessionAnswers).filter(([idx, optIdx]) => {
                            const q = session.questions[Number(idx)];
                            if (!q) return false;
                            const ratingVal = Array.isArray(optIdx) 
                              ? optIdx[optIdx.length - 1] 
                              : (typeof optIdx === 'number' ? optIdx : 0);
                            if (ratingVal === -2) return false;
                            return q.options && q.options.length > 0
                              ? q.options[ratingVal]?.is_correct
                              : ratingVal > 0; // 0 (Again) is Wrong, 1/2/3 are Correct
                          }).length
                        )}
                      </span>
                      <span className="text-[8px] font-bold text-emerald-400 uppercase">Đúng</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm text-rose-600">
                      <span className="block font-black">
                        {mainTab === 'practice' ? (
                          Object.keys(practiceAnswers).length - Object.entries(practiceAnswers).filter(([idx, ansIdx]) => {
                            const q = session?.questions?.[Number(idx)];
                            if (!q || !q.practice) return false;
                            if (practiceSubMode === 'typing') return ansIdx === 3;
                            return ansIdx === q.practice.correct_index;
                          }).length
                        ) : (
                          Object.entries(sessionAnswers).filter(([idx, optIdx]) => {
                            const q = session.questions[Number(idx)];
                            if (!q) return false;
                            const ratingVal = Array.isArray(optIdx) 
                              ? optIdx[optIdx.length - 1] 
                              : (typeof optIdx === 'number' ? optIdx : 0);
                            if (ratingVal === -2) return false;
                            return q.options && q.options.length > 0
                              ? !q.options[ratingVal]?.is_correct
                              : ratingVal === 0; // 0 (Again) is Wrong
                          }).length
                        )}
                      </span>
                      <span className="text-[8px] font-bold text-rose-400 uppercase">Sai</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </aside>

        <div className="w-full max-w-4xl min-w-0 flex flex-col min-h-0 overflow-hidden h-full">
          <div className="flex-1 flex flex-col overflow-hidden md:pr-2 md:pb-2 pr-0 pb-0 xl:pb-0 min-h-0">
            

          <AnimatePresence mode="wait">
            <motion.div 
              key={currentIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col h-full w-full min-h-0"
            >
              {mainTab === 'practice' && practiceDisabled ? (
                renderPracticeLockScreen()
              ) : mainTab === 'practice' && (practiceNeedsSetup || subMode === 'setting') ? (
                <PracticeSetupScreen
                  practiceSubMode={practiceSubMode as any}
                  setupPairs={setupPairs}
                  setSetupPairs={setSetupPairs}
                  availableColumns={availableColumns}
                  setupNumChoices={setupNumChoices}
                  setSetupNumChoices={setSetupNumChoices}
                  canEdit={canEdit}
                  savePracticeSettings={savePracticeSettings}
                  resetPracticeSettings={resetPracticeSettings}
                />
              ) : mainTab === 'practice' ? (
                renderPracticeScreen()
              ) : shouldShowRoadmapStepCompleteScreen ? (
                renderRoadmapStepCompleteScreen()
              ) : shouldShowFsrsCompleteScreen ? (
                renderFsrsCompleteScreen()
              ) : (
                <div 
                  className="perspective-1000 w-full h-full flex-1 relative min-h-0"
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                >
                <div
                  className="preserve-3d w-full h-full relative transition-transform duration-700 ease-out-quint"
                  style={{
                    transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                    transformStyle: 'preserve-3d',
                  }}
                >
                   {/* FRONT SIDE */}
                  <div
                    className="absolute inset-0 backface-hidden bg-white md:rounded-[2rem] rounded-[1.25rem] border border-slate-100 px-3 md:px-8 pt-2.5 md:pt-2 pb-2.5 md:pb-4 flex flex-col justify-between shadow-2xl shadow-indigo-100/40"
                    style={{
                      backfaceVisibility: 'hidden',
                      transform: 'none',
                      WebkitFontSmoothing: 'antialiased',
                      MozOsxFontSmoothing: 'grayscale',
                      pointerEvents: 'auto',
                      zIndex: isFlipped ? 1 : 2,
                      visibility: isFlipped ? 'hidden' : 'visible',
                      transition: 'visibility 0s ' + (isFlipped ? '0.7s' : '0s'),
                    }}
                  >
                    {/* Top Stats Banner */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100 uppercase shadow-sm">
                          FRONT CARD
                        </span>
                        <span className="text-[10px] font-black tracking-wider text-white bg-indigo-500 px-3 py-1.5 rounded-xl border border-indigo-600 shadow-sm">
                          {currentQuestion?.original_index ?? (currentIndex + 1)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {currentQuestion && getMasteryPill(currentQuestion)}
                        {currentQuestion && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStarQuestion();
                            }}
                            className={cn(
                              "w-7.5 h-7.5 flex items-center justify-center rounded-xl border transition-all active:scale-90",
                              currentQuestion.is_starred
                                ? "bg-amber-50 border-amber-300 text-amber-500 shadow-sm"
                                : "bg-slate-50 border-slate-200/60 text-slate-400 hover:text-slate-600 hover:bg-slate-100/50"
                            )}
                            title={currentQuestion.is_starred ? "Bỏ gắn sao" : "Gắn sao"}
                          >
                            <Star className={cn("w-4 h-4", currentQuestion.is_starred && "fill-amber-500 text-amber-500")} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Word / Question Content */}
                    <div className="flex-1 flex flex-col items-center justify-center text-center gap-6 overflow-y-auto custom-scrollbar my-2 py-2">
                      {(showImages as any === 'always' || showImages as any === 'front' || showImages as any === true || showImages as any === 'true') && (currentQuestion?.front_img || currentQuestion?.others?.front_img) && (
                        <img 
                          src={currentQuestion.front_img || currentQuestion.others?.front_img || undefined} 
                          alt="Front Visual" 
                          className="max-h-40 md:max-h-48 object-contain rounded-3xl border border-slate-100/80 shadow-md bg-slate-50/50 p-1.5 animate-in zoom-in-95 duration-500 cursor-zoom-in hover:opacity-95 transition-opacity"
                          onClick={() => setZoomedImage(currentQuestion.front_img || currentQuestion.others?.front_img || null)}
                        />
                      )}
                      <div className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight leading-normal max-w-2xl markdown-content text-center flex flex-col items-center justify-center whitespace-pre-wrap">
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]} 
                          rehypePlugins={[rehypeRaw]} 
                          components={{
                            ...MarkdownComponents,
                            p: ({ children }) => <p className="mb-2 last:mb-0 whitespace-pre-wrap">{children}</p>
                          }}
                        >
                          {parseBBCodeToHtml(currentQuestion?.content || '')}
                        </ReactMarkdown>
                      </div>

                    </div>
                  </div>

                  {/* BACK SIDE */}
                  <div
                    className="absolute inset-0 backface-hidden bg-white md:rounded-[2rem] rounded-[1.25rem] border border-slate-200 px-3 md:px-8 pt-2.5 md:pt-2 pb-2.5 md:pb-4 flex flex-col justify-between shadow-2xl shadow-indigo-100/40"
                    style={{
                      backfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)',
                      WebkitFontSmoothing: 'antialiased',
                      MozOsxFontSmoothing: 'grayscale',
                      pointerEvents: 'auto',
                      zIndex: isFlipped ? 2 : 1,
                      visibility: isFlipped ? 'visible' : 'hidden',
                      transition: 'visibility 0s ' + (isFlipped ? '0s' : '0.7s'),
                    }}
                  >
                    {/* Top Banner */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 uppercase shadow-sm">
                          BACK CARD
                        </span>
                        <span className="text-[10px] font-black tracking-wider text-white bg-indigo-500 px-3 py-1.5 rounded-xl border border-indigo-600 shadow-sm">
                          {currentQuestion?.original_index ?? (currentIndex + 1)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {currentQuestion && getMasteryPill(currentQuestion)}
                        {currentQuestion && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStarQuestion();
                            }}
                            className={cn(
                              "w-7.5 h-7.5 flex items-center justify-center rounded-xl border transition-all active:scale-90",
                              currentQuestion.is_starred
                                ? "bg-amber-50 border-amber-300 text-amber-500 shadow-sm"
                                : "bg-slate-50 border-slate-200/60 text-slate-400 hover:text-slate-600 hover:bg-slate-100/50"
                            )}
                            title={currentQuestion.is_starred ? "Bỏ gắn sao" : "Gắn sao"}
                          >
                            <Star className={cn("w-4 h-4", currentQuestion.is_starred && "fill-amber-500 text-amber-500")} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Definition & explanation */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar my-3 md:my-4 flex flex-col gap-3 md:gap-4 text-left pr-1 md:pr-2">
                       {/* Show the correct options or direct explanation */}
                       {currentQuestion?.options && currentQuestion.options.length > 0 && (
                        <div className="space-y-2">
                          <div className="md:p-6 p-4 rounded-3xl bg-emerald-50/50 border border-emerald-100/80 flex items-start gap-4">
                            <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center text-white font-black text-lg shadow-md shrink-0 mt-0.5">
                              ✓
                            </div>
                            <div className="text-slate-800 font-extrabold text-2xl md:text-3xl lg:text-4xl leading-snug markdown-content flex-1 whitespace-pre-wrap">
                              <ReactMarkdown 
                                remarkPlugins={[remarkGfm]} 
                                rehypePlugins={[rehypeRaw]} 
                                components={{
                                  ...MarkdownComponents,
                                  p: ({ children }) => <p className="mb-2 last:mb-0 whitespace-pre-wrap">{children}</p>
                                }}
                              >
                                {parseBBCodeToHtml(currentQuestion.options.find(o => o.is_correct)?.content || "Definition revealed.")}
                              </ReactMarkdown>
                            </div>
                          </div>
                        </div>
                      )}

                      {(showImages as any === 'always' || showImages as any === 'back' || showImages as any === true || showImages as any === 'true') && (currentQuestion?.back_img || currentQuestion?.others?.back_img) && (
                        <div className="space-y-2 flex justify-center">
                          <img 
                            src={currentQuestion.back_img || currentQuestion.others?.back_img || undefined} 
                            alt="Back Visual" 
                            className="max-h-40 md:max-h-48 object-contain rounded-3xl border border-slate-100/80 shadow-md bg-slate-50/50 p-1.5 animate-in zoom-in-95 duration-500 cursor-zoom-in hover:opacity-95 transition-opacity"
                            onClick={() => setZoomedImage(currentQuestion.back_img || currentQuestion?.others?.back_img || null)}
                          />
                        </div>
                      )}

                      {currentQuestion?.mnemonic && (
                        <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100/60 flex items-start gap-3 shadow-inner mt-2 animate-in slide-in-from-bottom-3 duration-500">
                          <div className="w-7 h-7 rounded-xl bg-amber-500 flex items-center justify-center text-white font-black text-sm shadow-md shrink-0 mt-0.5">
                            💡
                          </div>
                          <div className="text-slate-700 font-bold text-xs md:text-sm leading-relaxed flex-1 whitespace-pre-wrap">
                            <span className="font-black text-[9px] uppercase tracking-wider text-amber-500 block mb-0.5">Cách nhớ (AI Mnemonic)</span>
                            {currentQuestion.mnemonic}
                          </div>
                        </div>
                      )}

                      {currentQuestion?.explanation && (
                        <div className="flex-1 w-full bg-white text-left flex flex-col min-h-0">
                          <div className="text-slate-700 font-bold text-xl md:text-2xl leading-relaxed markdown-content flex-1 overflow-y-auto custom-scrollbar whitespace-pre-wrap">
                            <ReactMarkdown 
                              remarkPlugins={[remarkGfm]} 
                              rehypePlugins={[rehypeRaw]} 
                              components={{
                                ...MarkdownComponents,
                                p: ({ children }) => <p className="mb-2 last:mb-0 whitespace-pre-wrap">{children}</p>
                              }}
                            >
                              {parseBBCodeToHtml(currentQuestion.explanation)}
                            </ReactMarkdown>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Card Answer Frequency & Statistics Bar */}
                    {(() => {
                      const sessionRatings = Array.isArray(sessionAnswers[currentIndex]) 
                        ? (sessionAnswers[currentIndex] as number[]) 
                        : (typeof sessionAnswers[currentIndex] === 'number' ? [sessionAnswers[currentIndex] as number] : []);
                      
                      const stats = currentQuestion?.stats || { 
                        total: 0, 
                        correct: 0, 
                        wrong: 0, 
                        avg_time: 0,
                        again_count: 0,
                        hard_count: 0,
                        good_count: 0,
                        easy_count: 0
                      };
                      const allTimeTotal = stats.total || 0;
                      const allTimeCorrect = stats.correct || 0;
                      const allTimeWrong = stats.wrong || 0;
                      const allTimeAccuracy = allTimeTotal > 0 ? Math.round((allTimeCorrect / allTimeTotal) * 100) : 0;

                      return showFsrs ? (
                        <div className="md:mt-3 mt-1.5 p-2.5 bg-slate-50/50 rounded-2xl border border-slate-100 flex flex-col gap-1.5 w-full">
                          <div className="flex items-center justify-between text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">
                            <span>Card Performance Stats</span>
                            <span>{allTimeTotal} reviews {allTimeTotal > 0 && `(Accuracy: ${allTimeAccuracy}%)`}</span>
                          </div>

                          <div className="grid grid-cols-4 gap-2">
                            <div className="flex flex-col items-center justify-center p-1.5 rounded-xl bg-rose-50/80 border border-rose-100/50 text-rose-600 shadow-sm">
                              <span className="text-[8px] font-black tracking-wider uppercase">Again</span>
                              <span className="text-xs font-black">{stats.again_count || 0}</span>
                            </div>
                            <div className="flex flex-col items-center justify-center p-1.5 rounded-xl bg-amber-50/80 border border-amber-100/50 text-amber-600 shadow-sm">
                              <span className="text-[8px] font-black tracking-wider uppercase">Hard</span>
                              <span className="text-xs font-black">{stats.hard_count || 0}</span>
                            </div>
                            <div className="flex flex-col items-center justify-center p-1.5 rounded-xl bg-indigo-50/80 border border-indigo-100/50 text-indigo-600 shadow-sm">
                              <span className="text-[8px] font-black tracking-wider uppercase">Good</span>
                              <span className="text-xs font-black">{stats.good_count || 0}</span>
                            </div>
                            <div className="flex flex-col items-center justify-center p-1.5 rounded-xl bg-emerald-50/80 border border-emerald-100/50 text-emerald-600 shadow-sm">
                              <span className="text-[8px] font-black tracking-wider uppercase">Easy</span>
                              <span className="text-xs font-black">{stats.easy_count || 0}</span>
                            </div>
                          </div>
                        </div>
                      ) : null;
                    })()}

                    {/* FSRS Stats Row */}
                    {showFsrs && currentQuestion?.fsrs && (() => {
                      const stateLabels = ['New', 'Learning', 'Review', 'Relearning'];
                      const stateColors = [
                        'bg-blue-500/10 text-blue-600 border-blue-500/20 shadow-sm shadow-blue-500/5',
                        'bg-amber-500/10 text-amber-600 border-amber-500/20 shadow-sm shadow-amber-500/5',
                        'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 shadow-sm shadow-emerald-500/5',
                        'bg-rose-500/10 text-rose-600 border-rose-500/20 shadow-sm shadow-rose-500/5'
                      ];
                      const stateDots = [
                        'bg-blue-500 shadow-blue-500/50',
                        'bg-amber-50 shadow-amber-500/50',
                        'bg-emerald-50 shadow-emerald-500/50',
                        'bg-rose-500 shadow-rose-500/50'
                      ];
                      const stateIdx = currentQuestion.fsrs.state || 0;
                      
                      const firstLearnedInfo = formatRelativeTime(currentQuestion.fsrs.first_learned);
                      const lastReviewedInfo = formatRelativeTime(currentQuestion.fsrs.last_reviewed);
                      
                      return (
                        <div className="flex items-center justify-between bg-gradient-to-r from-slate-50/80 via-white to-slate-50/80 rounded-2xl px-1 py-1.5 sm:px-1.5 sm:py-2 border border-slate-100/90 text-[9px] font-bold shadow-[0_4px_20px_rgba(0,0,0,0.01),inset_0_1px_2px_rgba(255,255,255,0.6)] backdrop-blur-md w-full md:mt-3 mt-1.5 gap-0.5 sm:gap-1.5 animate-fadeIn">
                          {/* Overdue / Quá hạn */}
                          {(() => {
                            const overdueInfo = formatOverdueTime(currentQuestion.fsrs?.due);
                            return (
                              <div className="flex flex-col items-center gap-0.5 flex-1 justify-center min-w-0 cursor-pointer select-none" title={overdueInfo.full}>
                                <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider truncate">Overdue</span>
                                <span className={cn(
                                  "px-1.5 py-0.5 rounded-lg border text-[9.5px] sm:text-[11px] font-black uppercase tracking-wider flex items-center gap-0.5 truncate transition-all duration-300 shadow-2xs",
                                  overdueInfo.overdue
                                    ? (overdueInfo.severe ? "bg-rose-500/10 text-rose-600 border-rose-500/25 shadow-rose-500/5" : "bg-amber-500/10 text-amber-600 border-amber-500/25 shadow-amber-500/5")
                                    : "bg-emerald-500/10 text-emerald-600 border-emerald-500/25 shadow-emerald-500/5"
                                )}>
                                  {overdueInfo.overdue && (
                                    <span className={cn("w-1 h-1 rounded-full animate-ping", overdueInfo.severe ? "bg-rose-500" : "bg-amber-500")} />
                                  )}
                                  <span>{overdueInfo.relative}</span>
                                </span>
                              </div>
                            );
                          })()}
                          <div className="w-px h-6 bg-gradient-to-b from-slate-100 via-slate-200/60 to-slate-100 flex-shrink-0" />

                          {/* Stability */}
                          <div className="flex flex-col items-center gap-0.5 flex-1 justify-center min-w-0">
                            <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider truncate">Stability</span>
                            <span className="bg-indigo-50/40 text-indigo-600 border border-indigo-100/30 px-1.5 py-0.5 rounded-lg font-black text-[10px] sm:text-[11.5px] shadow-sm flex items-center gap-0.5 truncate">
                              {currentQuestion.fsrs.stability ? (
                                <>
                                  <span className="tracking-tight">{currentQuestion.fsrs.stability.toFixed(2)}</span>
                                  <span className="text-[8.5px] font-bold opacity-75">d</span>
                                </>
                              ) : (
                                'none'
                              )}
                            </span>
                          </div>
                          <div className="w-px h-6 bg-gradient-to-b from-slate-100 via-slate-200/60 to-slate-100 flex-shrink-0" />

                          {/* Difficulty */}
                          <div className="flex flex-col items-center gap-0.5 flex-1 justify-center min-w-0">
                            <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider truncate">Difficulty</span>
                            <span className="bg-purple-50/40 text-purple-600 border border-purple-100/30 px-1.5 py-0.5 rounded-lg font-black text-[10px] sm:text-[11.5px] shadow-sm flex items-center gap-0.5 truncate">
                              {currentQuestion.fsrs.difficulty ? (
                                <span className="tracking-tight">{currentQuestion.fsrs.difficulty.toFixed(2)}</span>
                              ) : (
                                'none'
                              )}
                            </span>
                          </div>
                          <div className="w-px h-6 bg-gradient-to-b from-slate-100 via-slate-200/60 to-slate-100 flex-shrink-0" />

                          {/* First Learned */}
                          <div 
                            className="flex flex-col items-center gap-0.5 flex-1 justify-center min-w-0 cursor-pointer select-none hover:opacity-80 transition-opacity"
                            onClick={() => setShowAbsoluteFirst(!showAbsoluteFirst)}
                            title={firstLearnedInfo.full}
                          >
                            <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider truncate">First</span>
                            <span className="bg-slate-100/60 text-slate-600 border border-slate-200/40 px-1.5 py-0.5 rounded-lg font-black text-[9.5px] sm:text-[11px] shadow-sm truncate">
                              {showAbsoluteFirst ? firstLearnedInfo.full : firstLearnedInfo.relative}
                            </span>
                          </div>
                          <div className="w-px h-6 bg-gradient-to-b from-slate-100 via-slate-200/60 to-slate-100 flex-shrink-0" />

                          {/* Last Reviewed */}
                          <div 
                            className="flex flex-col items-center gap-0.5 flex-1 justify-center min-w-0 cursor-pointer select-none hover:opacity-80 transition-opacity"
                            onClick={() => setShowAbsoluteLast(!showAbsoluteLast)}
                            title={lastReviewedInfo.full}
                          >
                            <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider truncate">Last</span>
                            <span className="bg-slate-100/60 text-slate-600 border border-slate-200/40 px-1.5 py-0.5 rounded-lg font-black text-[9.5px] sm:text-[11px] shadow-sm truncate">
                              {showAbsoluteLast ? lastReviewedInfo.full : lastReviewedInfo.relative}
                            </span>
                          </div>
                        </div>
                      );
                    })()}


                    {/* FSRS Buttons Grid (Visible inside card back, hidden after rating until it unlocks) */}
                    {activeMode !== 'flip' && (
                      <FSRSActionButtons
                        isFlipped={isFlipped}
                        hasRated={hasRated}
                        selectedOption={selectedOption}
                        intervals={currentQuestion?.fsrs?.intervals}
                        onRate={handleReviewRating}
                      />
                    )}

                    {/* After rating: show colorful dynamic rated badge with real-time unlocking countdown */}
                    {isFlipped && hasRated && selectedOption !== null && selectedOption !== undefined && (() => {
                      const dueTimeStr = currentQuestion?.fsrs?.due;
                      let countdownStr = "";
                      if (dueTimeStr) {
                        const diff = parseUTCDate(dueTimeStr).getTime() - currentTime.getTime();
                        if (diff > 0) {
                          const secs = Math.floor(diff / 1000) % 60;
                          const mins = Math.floor(diff / (1000 * 60)) % 60;
                          const hours = Math.floor(diff / (1000 * 60 * 60)) % 24;
                          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                          
                          const parts = [];
                          if (days > 0) parts.push(`${days}d`);
                          if (hours > 0 || days > 0) parts.push(`${hours}h`);
                          if (mins > 0 || hours > 0 || days > 0) parts.push(`${mins}m`);
                          parts.push(`${secs}s`);
                          countdownStr = parts.join(' ');
                        }
                      }
                      
                      // Fallback interval label if the API response hasn't arrived/updated the due time yet
                      if (!countdownStr) {
                        if (selectedOption === 0) countdownStr = currentQuestion?.fsrs?.intervals?.[1] || "1m";
                        else if (selectedOption === 1) countdownStr = currentQuestion?.fsrs?.intervals?.[2] || "5m";
                        else if (selectedOption === 2) countdownStr = currentQuestion?.fsrs?.intervals?.[3] || "10m";
                        else countdownStr = currentQuestion?.fsrs?.intervals?.[4] || "4d";
                      }
                      return (
                        <div
                          className={cn(
                            "mt-4 flex items-center justify-center gap-2 py-3 rounded-2xl border transition-all duration-300 font-bold relative min-h-[48px]",
                            selectedOption === 0 ? "bg-rose-50 border-rose-100 text-rose-600 animate-pulse" :
                            selectedOption === 1 ? "bg-amber-50 border-amber-100 text-amber-600" :
                            selectedOption === 2 ? "bg-indigo-50 border-indigo-100 text-indigo-600" :
                            "bg-emerald-50 border-emerald-100 text-emerald-600"
                          )}
                        >
                          {activelyRatedCurrentCard && (
                            <button
                              onClick={handleUndoRating}
                              className={cn(
                                "absolute left-3 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-sm border",
                                selectedOption === 0 ? "bg-white border-rose-200 text-rose-600 hover:bg-rose-50" :
                                selectedOption === 1 ? "bg-white border-amber-200 text-amber-600 hover:bg-amber-50" :
                                selectedOption === 2 ? "bg-white border-indigo-200 text-indigo-600 hover:bg-indigo-50" :
                                "bg-white border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                              )}
                              title="Undo Rating"
                            >
                              <Undo2 className="w-2.5 h-2.5" />
                              <span>Undo</span>
                            </button>
                          )}
                          <div className="flex items-center gap-1 justify-center px-12 text-center">
                            <span className="text-sm font-black tracking-wide">
                              ✓ {selectedOption === 0 ? "AGAIN" : selectedOption === 1 ? "HARD" : selectedOption === 2 ? "GOOD" : "EASY"}
                            </span>
                            <span className="opacity-80 text-xs">
                              — Unlocks in {countdownStr} ⏳
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
              )}
            </motion.div>
            {/* Level Up Celebration Overlay */}
            <AnimatePresence>
              {activeMasteryUpgrade && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="absolute inset-0 bg-white/95 backdrop-blur-md z-[250] flex flex-col items-center justify-center text-center p-6 md:rounded-[2rem] rounded-[1.25rem] border-2 border-indigo-200/50 shadow-2xl"
                >
                  <motion.div 
                    initial={{ rotate: -15, scale: 0 }}
                    animate={{ rotate: 0, scale: 1 }}
                    transition={{ delay: 0.15, type: "spring", stiffness: 150 }}
                    className="text-6xl mb-3 drop-shadow-lg"
                  >
                    🎉
                  </motion.div>
                  <h3 className="text-xl font-black text-indigo-600 uppercase tracking-widest mb-1.5 animate-pulse">
                    Thẻ Lên Cấp!
                  </h3>
                  <p className="text-[10px] font-black text-slate-400 mb-6 uppercase tracking-[0.2em]">
                    Độ bền trí nhớ đã nâng cấp
                  </p>
                  
                  <div className="flex items-center gap-5 bg-slate-50/80 px-5 py-4 rounded-3xl border border-slate-100 shadow-inner">
                    <div className="text-center">
                      <span className="text-[8px] font-black text-slate-400 block mb-1 uppercase tracking-widest">Cấp độ cũ</span>
                      <span className="px-3.5 py-1.5 bg-slate-200/80 text-slate-600 rounded-xl text-xs font-black">Level {activeMasteryUpgrade.old_level}</span>
                    </div>
                    <div className="text-indigo-500 font-black text-lg animate-pulse">➔</div>
                    <div className="text-center">
                      <span className="text-[8px] font-black text-emerald-400 block mb-1 uppercase tracking-widest">Cấp độ mới</span>
                      <span className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-400 to-emerald-500 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-200/60 flex items-center gap-1">
                        Level {activeMasteryUpgrade.new_level} ⚡
                      </span>
                    </div>
                  </div>
                  <p className="text-[9px] font-bold text-slate-300 italic mt-6">Khắc sâu từ vựng thành công!</p>
                </motion.div>
              )}
            </AnimatePresence>
            </AnimatePresence>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="hidden lg:flex w-[340px] 2xl:w-[420px] flex-shrink-0 flex-col min-h-0 overflow-hidden">
          <div className="flex-1 bg-white border border-slate-100 rounded-[2.5rem] p-6 shadow-sm flex flex-col overflow-hidden">
            <h4 className="text-[8px] font-black text-slate-300 uppercase tracking-[0.3em] mb-4 flex-shrink-0">
              {mainTab === 'practice' ? 'PRACTICE STATS' : 'CARD MAP'}
            </h4>
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar pb-24">
              {mainTab === 'practice' ? (
                renderPracticeStats()
              ) : (
                <>
                  {renderSessionStats()}
                  <QuestionMapGrid
                    questions={session.questions}
                    mainTab={mainTab}
                    practiceAnswers={practiceAnswers}
                    sessionAnswers={sessionAnswers}
                    currentIndex={currentIndex}
                    navigateToQuestion={navigateToQuestion}
                    setIsMapOpen={setIsMapOpen}
                    filterMode={mobileMapFilterMode}
                    setFilterMode={setMobileMapFilterMode}
                  />
                </>
              )}
            </div>
          </div>
        </aside>
      </main>


      {!shouldShowRoadmapStepCompleteScreen && (mainTab !== 'practice' || (mainTab === 'practice' && !practiceNeedsSetup)) && (
      <footer className="relative w-full flex-shrink-0 bg-white/95 backdrop-blur-2xl border-t border-slate-100/80 px-0 pt-0 pb-0 z-[300] shadow-[0_-4px_24px_rgba(99,102,241,0.06)]">
        <div className="max-w-2xl mx-auto w-full flex flex-col">
          {(activeBottomTab === 'flashcard' || !isFeedbackOpen) && (
            <>
              {/* Hint Popup Bubble */}
              <AnimatePresence>
                {showingHint && currentQuestion?.hint && !isFlipped && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="mx-3 sm:mx-4 mt-3 p-3.5 bg-amber-50 border border-amber-100 rounded-2xl shadow-md text-xs font-semibold text-amber-850 leading-relaxed relative flex items-start gap-2.5 animate-in fade-in slide-in-from-bottom-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="w-5.5 h-5.5 rounded-xl bg-amber-500 flex items-center justify-center flex-shrink-0 shadow-sm text-white font-black text-xs">
                      💡
                    </div>
                    <div className="flex-1 text-left">
                      <span className="font-black text-[9px] uppercase tracking-wider text-amber-600 block mb-0.5">💡 AI Hint</span>
                      {currentQuestion.hint}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowingHint(false);
                      }}
                      className="text-amber-400 hover:text-amber-600 active:scale-95 transition-all p-0.5 hover:bg-amber-100 rounded-lg"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="w-full flex items-center gap-1.5 sm:gap-3 px-3 sm:px-4 pt-1 pb-2">
              {/* Settings Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsSettingsModalOpen(true);
                }}
                className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-indigo-50 border border-indigo-200 text-indigo-600 rounded-2xl shadow-sm active:scale-95 hover:bg-indigo-100 hover:border-indigo-300 transition-all"
                title="Cấu hình học tập"
              >
                <Settings className="w-5.5 h-5.5 text-indigo-600" />
              </button>

              {(() => {
                if (!currentQuestion) return null;
                
                const face = isFlipped ? 'back' : 'front';
                let enabled = true;
                if (mainTab === 'practice' && currentPracticeData) {
                  const { question_key } = currentPracticeData;
                  enabled = isAudioEnabled(question_key);
                } else {
                  enabled = isAudioEnabled(face);
                }
                
                if (!enabled) return null;
                
                return (
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (mainTab === 'practice') {
                        const practiceData = currentPracticeData;
                        if (practiceData) {
                          const { question: qText, question_key: qKey } = practiceData;
                          if (qKey === 'front') {
                            await playCardAudio('front');
                          } else if (qKey === 'back') {
                            await playCardAudio('back');
                          } else {
                            speakMultiLanguage(qText);
                          }
                        }
                      } else {
                        await playCardAudio(isFlipped ? 'back' : 'front');
                      }
                    }}
                    className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-indigo-50 border border-indigo-200 rounded-2xl text-indigo-600 shadow-sm active:scale-95 transition-all hover:bg-indigo-100 hover:border-indigo-300"
                    title="Phát âm"
                  >
                    <Volume2 className="w-5.5 h-5.5 text-indigo-600 animate-pulse" />
                  </button>
                );
              })()}

              {/* AI Hint "?" Button */}

              
              {/* Lightbulb Explanation Button */}
              {(mainTab === 'practice' || isFlipped || showFeedback) && (
                <button 
                  onClick={() => {
                    if (mainTab === 'practice') {
                      setShowFeedback(true);
                    }
                    setIsFeedbackOpen(true);
                  }} 
                  className={`xl:hidden w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-2xl shadow-sm active:scale-95 transition-all relative ${
                    justAnswered 
                      ? 'bg-indigo-600 border border-indigo-600 text-white animate-[pulse_1.5s_infinite] ring-4 ring-indigo-300 ring-offset-1 drop-shadow-[0_0_12px_rgba(99,102,241,0.6)]' 
                      : 'bg-indigo-50 border border-indigo-200 text-indigo-600 hover:bg-indigo-100'
                  }`}
                  title="Xem giải thích và hướng dẫn"
                >
                  <Lightbulb className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
                  {justAnswered && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white animate-pulse"></span>}
                </button>
              )}

              {/* Main Action Buttons */}
              {mainTab === 'practice' ? (
                practiceAnswers[currentIndex] !== undefined ? (
                  <button 
                    onClick={handleNext}
                    className="flex-1 h-12 sm:h-14 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white font-black text-xs rounded-2xl shadow-lg shadow-emerald-300/50 flex items-center justify-center gap-2.5 uppercase tracking-widest active:scale-[0.98] transition-all hover:shadow-emerald-400/60 hover:shadow-xl cursor-pointer"
                  >
                    <span>Continue</span>
                    <kbd className="hidden md:inline-flex items-center justify-center px-1.5 py-0.5 text-[9px] font-mono font-bold bg-white/20 text-white rounded border border-white/30">Space / ↵</kbd>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="flex-1 flex gap-2 h-12 sm:h-14">
                    <button
                      onClick={handleNext}
                      className="flex-1 h-12 sm:h-14 bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100 font-black text-xs rounded-2xl flex items-center justify-center gap-1.5 uppercase tracking-widest active:scale-[0.98] transition-all cursor-pointer"
                    >
                      Skip <ChevronRight className="w-4 h-4" />
                    </button>
                    <div className="flex-[2] h-12 sm:h-14 bg-slate-100 text-slate-400 font-black text-xs rounded-2xl flex items-center justify-center uppercase tracking-widest pointer-events-none select-none">
                      Waiting...
                    </div>
                  </div>
                )
              ) : (
                (!hasRated && activeMode !== 'flip') || (activeMode === 'flip' && !isFlipped) ? (
                  <button 
                    onClick={() => {
                      const nextFlipped = !isFlipped;
                      setIsFlipped(nextFlipped);
                      if (nextFlipped) {
                        setShowFeedback(true);
                        setJustAnswered(true);
                      }
                    }}
                    className="flex-1 h-12 sm:h-14 bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 text-white font-black text-xs rounded-2xl shadow-lg shadow-indigo-300/50 flex items-center justify-center gap-2.5 uppercase tracking-widest active:scale-[0.98] transition-all hover:shadow-indigo-400/60 hover:shadow-xl cursor-pointer"
                  >
                    {isFlipped ? (
                      <>
                        <ChevronRight className="w-4 h-4 rotate-180" />
                        <span>FLIP BACK</span>
                        <kbd className="hidden md:inline-flex items-center justify-center px-1.5 py-0.5 text-[9px] font-mono font-bold bg-white/20 text-white rounded border border-white/30">Space</kbd>
                      </>
                    ) : (
                      <>
                        <span>FLIP CARD</span>
                        <kbd className="hidden md:inline-flex items-center justify-center px-1.5 py-0.5 text-[9px] font-mono font-bold bg-white/20 text-white rounded border border-white/30">Space</kbd>
                        <ChevronRight className="w-4 h-4 rotate-90" />
                      </>
                    )}
                  </button>
                ) : (
                  <div className="flex-1 flex gap-1.5 sm:gap-3 h-12 sm:h-14">
                    <button 
                      onClick={() => setIsFlipped(prev => !prev)}
                      className="w-12 h-12 sm:w-14 sm:h-14 flex-shrink-0 bg-gradient-to-r from-indigo-50 to-indigo-100/80 hover:from-indigo-100 hover:to-indigo-200 text-indigo-600 border border-indigo-200/50 rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer"
                      title={isFlipped ? "Flip to Front" : "Flip to Back"}
                    >
                      <RefreshCw className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-indigo-600 animate-[spin_4s_linear_infinite]" />
                    </button>
                    <button 
                      onClick={handleNext}
                      className="flex-1 h-12 sm:h-14 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white font-black text-xs rounded-2xl shadow-lg shadow-emerald-300/50 flex items-center justify-center gap-2.5 uppercase tracking-widest active:scale-[0.98] transition-all hover:shadow-emerald-400/60 hover:shadow-xl cursor-pointer"
                    >
                      <span>NEXT CARD</span>
                      <kbd className="hidden md:inline-flex items-center justify-center px-1.5 py-0.5 text-[9px] font-mono font-bold bg-white/20 text-white rounded border border-white/30">Space / ↵</kbd>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )
              )}
              </div>
            </>
          )}

          {/* Interactive Navigation Tabs */}
          <div className="w-full grid grid-cols-3 bg-white border-t border-slate-100 p-0 relative md:hidden">
            {/* 1. Card Map Tab */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsStatsOpen(false);
                setIsMapOpen(true);
                setIsFeedbackOpen(false);
              }}
              className="relative flex items-center justify-center gap-1.5 py-3 px-1 transition-all active:scale-95 overflow-hidden"
              title="Mở bản đồ thẻ"
            >
              {activeBottomTab === 'map' && (
                <motion.div
                  layoutId="activeBottomTabBg"
                  className="absolute inset-0 bg-amber-500/10"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <span className={cn(
                "relative z-10 flex items-center justify-center gap-1.5 text-[9px] font-black uppercase tracking-wider truncate transition-colors duration-200",
                activeBottomTab === 'map' ? "text-amber-600 font-black" : "text-slate-400 hover:text-slate-600"
              )}>
                <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
                MAP
              </span>
            </button>
            {/* 2. Flashcard Active View Tab */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setIsMapOpen(false);
                setIsStatsOpen(false);
                setIsFeedbackOpen(false);
              }}
              className="relative flex items-center justify-center gap-1.5 py-3 px-1 transition-all active:scale-95 overflow-hidden"
              title="Tiến trình học tập hiện tại"
            >
              {activeBottomTab === 'flashcard' && (
                <motion.div
                  layoutId="activeBottomTabBg"
                  className="absolute inset-0 bg-amber-500/10"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <span className={cn(
                "relative z-10 flex items-center justify-center gap-1.5 text-[9px] font-black uppercase tracking-wider truncate transition-colors duration-200",
                activeBottomTab === 'flashcard' ? "text-amber-600 font-black" : "text-slate-400 hover:text-slate-600"
              )}>
                <BookOpen className="w-3.5 h-3.5 shrink-0" />
                FLASHCARD
              </span>
            </button>
            {/* 3. Stats Tab */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMapOpen(false);
                setIsStatsOpen(true);
                setIsFeedbackOpen(false);
              }}
              className="relative flex items-center justify-center gap-1.5 py-3 px-1 transition-all active:scale-95 overflow-hidden"
              title="Mở thống kê tiến trình"
            >
              {activeBottomTab === 'stats' && (
                <motion.div
                  layoutId="activeBottomTabBg"
                  className="absolute inset-0 bg-amber-500/10"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <span className={cn(
                "relative z-10 flex items-center justify-center gap-1.5 text-[9px] font-black uppercase tracking-wider truncate transition-colors duration-200",
                activeBottomTab === 'stats' ? "text-amber-600 font-black" : "text-slate-400 hover:text-slate-600"
              )}>
                <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                STATS
              </span>
            </button>
          </div>
        </div>
      </footer>
      )}


      {/* ✅ SESSION COMPLETE SUMMARY MODAL */}
      <PlaySessionSummary
        isOpen={isSessionSummaryOpen}
        onClose={() => setIsSessionSummaryOpen(false)}
        sessionAnswers={sessionAnswers}
        questions={session.questions}
        sessionXP={sessionXP}
        milestonesHit={milestonesHit}
        onNavigateToDeck={() => navigate(`/decks/${id}`)}
      />

      {/* Mobile Question Map Modal / Practice Stats Drawer */}
      {/* Mobile Question Map Modal */}
      <AnimatePresence>
        {isMapOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: 50 }} 
            className="fixed inset-x-0 top-0 bottom-[32px] sm:bottom-[38px] z-[200] bg-[#F8FAFC] lg:hidden flex flex-col"
          >
            {/* Header */}
            <header className="flex-shrink-0 z-[120] bg-white/95 backdrop-blur-2xl border-b border-slate-100/80 px-4 py-1.5 flex items-center gap-3 shadow-[0_1px_20px_rgba(99,102,241,0.04)]">
              <button 
                onClick={() => setIsMapOpen(false)} 
                className="w-8.5 h-8.5 flex items-center justify-center bg-slate-50 border border-slate-200/60 rounded-xl text-slate-600 shadow-sm hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-100 active:scale-90 transition-all flex-shrink-0"
                title="Quay lại thẻ học"
              >
                <ChevronLeft className="w-4.5 h-4.5" />
              </button>
              {(() => {
                const info = getMapTitleInfo(mobileMapFilterMode);
                const count = getFilteredCount(mobileMapFilterMode);
                return (
                  <div className="flex flex-col min-w-0">
                    <h2 className="text-xs md:text-sm font-extrabold text-slate-800 tracking-tight leading-snug">
                      {info.title} ({count})
                    </h2>
                    <p className="text-[9px] text-slate-400 font-bold">
                      {info.subtitle}
                    </p>
                  </div>
                );
              })()}
            </header>

            {/* Grid Area */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              <QuestionMapGrid
                questions={session.questions}
                mainTab={mainTab}
                practiceAnswers={practiceAnswers}
                sessionAnswers={sessionAnswers}
                currentIndex={currentIndex}
                navigateToQuestion={navigateToQuestion}
                setIsMapOpen={setIsMapOpen}
                filterMode={mobileMapFilterMode}
                setFilterMode={setMobileMapFilterMode}
                showFiltersInline={false}
              />
            </div>

            {/* Bottom Reachable Dismiss Bar & Filters */}
            <div className="border-t border-slate-100 bg-white/95 backdrop-blur-md flex-shrink-0 pb-3 flex flex-col gap-2.5">
              {/* Filter Dropdown at the Bottom for reachability */}
              <div className="px-4 pt-2">
                <div className="relative w-full">
                  <select
                     value={mobileMapFilterMode}
                     onChange={(e) => setMobileMapFilterMode(e.target.value as any)}
                     className="w-full h-10 pl-4 pr-10 bg-slate-100/80 border border-slate-200/50 rounded-xl text-xs font-black uppercase tracking-wider text-slate-700 outline-none appearance-none cursor-pointer focus:border-indigo-300 focus:bg-white transition-all shadow-sm"
                  >
                     <option value="all">📁 Tất cả</option>
                     <option value="unseen">📖 Chưa học</option>
                     <option value="learning">🧠 Đang học</option>
                     <option value="mastered">🏆 Đã thuộc</option>
                     <option value="hard">🔥 Thẻ khó</option>
                     <option value="starred">⭐ Gắn sao</option>
                     <option value="ignored">🚫 Bỏ qua</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Stats Drawer */}
      <PlayStatsDrawer
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        activeStatsTab={activeStatsTab}
        setActiveStatsTab={setActiveStatsTab}
        dailyComparisonData={dailyComparisonData || []}
        dailyComparisonAvg={dailyComparisonAvg}
        isDailyComparisonLoading={isDailyComparisonLoading}
        activeGoal={activeGoal}
        activeMode={activeMode}
        gamify={gamify}
        xpLeaderboard={xpLeaderboard}
        userRank={userRank}
        leaderboardMsg={leaderboardMsg}
        user={user}
        sessionStatsNode={renderSessionStats()}
      />

      {/* Mobile Feedback Modal */}
      <AnimatePresence>
        {isFeedbackOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: 50 }} 
            className="fixed inset-x-0 top-0 bottom-[32px] sm:bottom-[38px] z-[200] bg-[#F8FAFC] xl:hidden flex flex-col"
          >
            <div className="flex items-center justify-center p-3 border-b border-slate-100 bg-white shadow-sm flex-shrink-0">
              <h4 className="text-[9px] font-black text-indigo-600 uppercase tracking-[0.4em]">
                {activeFeedbackTab === 'insight' ? 'LEARNING INSIGHTS' : activeFeedbackTab === 'community' ? 'COMMUNITY DISCUSSIONS' : activeFeedbackTab === 'note' ? 'PERSONAL NOTES' : 'CARD INFO'}
              </h4>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <FeedbackArea
                showFeedback={showFeedback}
                activeFeedbackTab={activeFeedbackTab}
                setActiveFeedbackTab={setActiveFeedbackTab}
                getInsightText={getInsightText}
                isEditingInsight={isEditingInsight}
                insightInput={insightInput}
                setInsightInput={setInsightInput}
                currentQuestion={currentQuestion}
                canEdit={canEdit}
                clearAIExplanation={clearAIExplanation}
                isEditingAI={isEditingAI}
                setIsEditingAI={setIsEditingAI}
                isEditingPrompt={isEditingPrompt}
                setIsEditingPrompt={setIsEditingPrompt}
                askAI={askAI}
                isAskingAI={isAskingAI}
                aiInput={aiInput}
                setAiInput={setAiInput}
                promptInput={promptInput}
                setPromptInput={setPromptInput}
                savePrompt={savePrompt}
                saveNote={saveNote}
                personalNote={personalNote}
                setPersonalNote={setPersonalNote}
                isEditingNote={isEditingNote}
                setIsEditingNote={setIsEditingNote}
                isMobile={true}
                setIsFeedbackOpen={setIsFeedbackOpen}
                handleEditCurrentTab={handleEditCurrentTab}
                isCopyMenuOpen={isCopyMenuOpen}
                setIsCopyMenuOpen={setIsCopyMenuOpen}
                copyCurrentTabContent={copyCurrentTabContent}
                isCopied={isCopied}
                handleNext={handleNext}
                deckInfo={session}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ⚡ LIMITLESS MODE SCREEN FLASH OVERLAY */}
      <AnimatePresence>
        {isLimitlessStrike && (
          <div className="pointer-events-none fixed inset-0 z-[1999] border-[8px] border-amber-400/50 shadow-[inset_0_0_100px_rgba(245,158,11,0.4)] animate-pulse flex items-center justify-center">
            <motion.div 
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: [1, 1.15, 1], opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 tracking-widest drop-shadow-[0_0_15px_rgba(245,158,11,0.7)] uppercase text-center"
            >
              ⚡ OVERDRIVE STRIKE! ⚡
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🏆 DAILY GOAL CELEBRATION MODAL */}
      <GoalCelebrationModal
        isOpen={showGoalCelebration}
        onClose={() => setShowGoalCelebration(false)}
        goalToast={goalToast}
      />

      {/* Smart Settings Modal */}
      <PlaySettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        activeMode={activeMode}
        applyLearningMode={applyLearningMode}
        autoPlayAudio={autoPlayAudio}
        setAutoPlayAudio={setAutoPlayAudio}
        sfxEnabled={sfxEnabled}
        setSfxEnabled={setSfxEnabled}
        hapticEnabled={hapticEnabled}
        setHapticEnabled={setHapticEnabled}
        showFeedback={showFeedback}
        copyQuestionToClipboard={copyQuestionToClipboard}
        currentQuestion={currentQuestion}
        handleIgnoreQuestion={handleIgnoreQuestion}
        openEditModal={openEditModal}
        setIsQuitModalOpen={setIsQuitModalOpen}
        quickLearnEnabled={quickLearnEnabled}
        setQuickLearnEnabled={setQuickLearnEnabled}
        showImages={showImages}
        setShowImages={setShowImages}
        showFsrs={showFsrs}
        setShowFsrs={setShowFsrs}
        randomEnabled={randomEnabled}
        setRandomEnabled={setRandomEnabled}
      />

      {/* Exit Confirmation Modal */}
      <QuitSessionModal
        isOpen={isQuitModalOpen}
        onClose={() => setIsQuitModalOpen(false)}
        onConfirmQuit={() => navigate(`/decks/${id}`)}
      />
      <FlashcardEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        flashcard={editFormData}
        onSave={handleSaveEdit}
        isSaving={isSavingEdit}
        availableColumns={session?.column_order || session?.custom_columns || []}
      />





      {/* Intrusive mid-session popups (Badge & Milestone) disabled per user request */}
      {/* Local Toast Overlay */}
      <AnimatePresence>
        {localToast.visible && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-[3000] flex items-center gap-3 px-4 py-3 rounded-2xl border backdrop-blur-md shadow-2xl transition-all duration-300 text-white"
            style={{
              backgroundColor: localToast.type === 'error' 
                ? 'rgba(239, 68, 68, 0.95)' 
                : localToast.type === 'warning'
                ? 'rgba(245, 158, 11, 0.95)'
                : 'rgba(16, 185, 129, 0.95)',
              borderColor: localToast.type === 'error'
                ? 'rgba(248, 113, 113, 0.4)'
                : localToast.type === 'warning'
                ? 'rgba(251, 191, 36, 0.4)'
                : 'rgba(52, 211, 153, 0.4)'
            }}
          >
            {localToast.type === 'error' && <XCircle className="w-5 h-5 text-red-100" />}
            {localToast.type === 'warning' && <AlertCircle className="w-5 h-5 text-amber-100" />}
            {localToast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-100" />}
            <span className="font-bold text-sm tracking-wide">{localToast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Zoomed Image Modal Overlay */}
      <ImageZoomOverlay
        zoomedImage={zoomedImage}
        onClose={() => setZoomedImage(null)}
      />

      {/* ── STUDY CONSOLE MODAL ── */}
      <StudyConsoleModal
        isOpen={isStudyConsoleOpen}
        onClose={() => setIsStudyConsoleOpen(false)}
        session={session}
        deckId={id}
        onSelectMode={(selectedMode) => {
          setIsStudyConsoleOpen(false);
          updateUserSettings({ quiz_learning_mode: selectedMode as any });
          navigate(`/flashcard/${id}/play?mode=${selectedMode}`);
          setActiveMode(selectedMode as any);
        }}
      />
    </div>
  )
}
