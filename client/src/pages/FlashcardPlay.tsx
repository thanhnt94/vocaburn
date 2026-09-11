import { useState, useEffect, useRef, useMemo } from 'react'
import confetti from 'canvas-confetti'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, ChevronDown, LayoutGrid, Timer, Flame, Trophy, Check, X, Sparkles, Lightbulb, StickyNote, Play, Target, CheckCircle2, XCircle, Clock, BookOpen, Hash, Copy, MousePointer, Edit3, Brain, FileText, HelpCircle, Sliders, ListOrdered, Shuffle, Eye, EyeOff, AlertCircle, TrendingUp, Award, Lock, Keyboard, Volume2, VolumeX, RefreshCw, Undo2, Settings, Star, Zap, ArrowRight, RotateCcw } from 'lucide-react'
import { motion, AnimatePresence, useAnimationControls } from 'framer-motion'
import axios from 'axios'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'
import { playCorrectSound, playIncorrectSound, speakWithEdgeTTS, cancelAllAudio } from '@/lib/audio'
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
  formatHeaderTime,
  getFSRSIntervals
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
import { resolveMediaUrl } from '@/components/common/MediaUrlInput'
import DailyComparisonChart from '@/components/DailyComparisonChart'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { usePlaySettings } from '@/hooks/usePlaySettings'
import { getFrontFontSizeStyle } from '@/components/common/study'
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
  FlashcardHeader,
  FlashcardActionDock,
  FlashcardFlyToolbar,
  FlashcardQuickControlsSheet,
  Flashcard3DCard,
  FlashcardDesktopLeftAside,
  FlashcardDesktopRightAside,
  FlashcardModalsContainer
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
      resolveMediaUrl(nextQ.front_audio_url),
      resolveMediaUrl(nextQ.back_audio_url),
      resolveMediaUrl(nextQ.audio)
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
      resolveMediaUrl(nextQ.image),
      resolveMediaUrl(nextQ.front_img),
      resolveMediaUrl(nextQ.back_img)
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
  const [isSelectMode, setIsSelectMode] = useState(false)

  useEffect(() => {
    if (isFlipped) {
      setShowingHint(false)
    }
  }, [isFlipped])
  
  // Toast Notification System
  const [localToast, setLocalToast] = useState<{
    visible: boolean;
    message: string;
    type: 'success' | 'warning' | 'error' | 'info';
  }>({ visible: false, message: '', type: 'success' })

  const showLocalToast = (message: string, type: 'success' | 'warning' | 'error' | 'info' = 'success') => {
    setLocalToast({ visible: true, message, type })
    setTimeout(() => {
      setLocalToast(prev => ({ ...prev, visible: false }))
    }, 4000)
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
    cardFlipTrigger: deckCardFlipTrigger,
    setCardFlipTrigger,
    cardRatingMode: deckCardRatingMode,
    setCardRatingMode,
    creatorDefaults,
    isCustomized,
    settingOrigin,
    studyProfiles,
    activeProfileId,
    syncStudySettings,
    saveGeneralSettings,
    resetToCreatorDefaults,
    applyProfile,
    createCustomProfile,
    deleteCustomProfile,
    saveAsCreatorDefaults
  } = usePlaySettings(id || '', modeSettings, setModeSettings);

  const effectiveCardFlipTrigger = deckCardFlipTrigger || userSettings.card_flip_trigger || 'both';
  const effectiveCardRatingMode = deckCardRatingMode || userSettings.card_rating_mode || 'both';
  const effectiveShowFsrs = userSettings.show_fsrs !== undefined ? userSettings.show_fsrs : showFsrs;

  const {
    playCardAudio,
    stopAudio,
    activeAudioRef,
    isAudioEnabled,
    isLoadingAudio,
    isPlayingAudio
  } = useFlashcardAudio(currentQuestion, modeSettings, autoPlayAudio, setAutoPlayAudio)

  const [initialTotalXP, setInitialTotalXP] = useState(0)
  const [comboStreak, setComboStreak] = useState(0)
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
  const [activeFeedbackTab, setActiveFeedbackTab] = useState<'stats' | 'insight' | 'note' | 'community'>('stats')
  const [cardHubSubTab, setCardHubSubTab] = useState<'stats' | 'insight' | 'note' | 'community'>('stats')

  const handleOpenCardHub = (subTab: 'stats' | 'insight' | 'note' | 'community' = 'stats') => {
    if (isFeedbackOpen && activeFeedbackTab === subTab) {
      setIsFeedbackOpen(false)
      return
    }
    setCardHubSubTab(subTab)
    setActiveFeedbackTab(subTab)
    setShowFeedback(true)
    setIsFeedbackOpen(true)
    setIsStatsOpen(false)
    setIsMapOpen(false)
  }
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
    if (urlMode === 'new' || urlMode === 'fsrs' || urlMode === 'roadmap' || urlMode === 'review' || urlMode === 'speed_skim' || urlMode === 'skim' || urlMode === 'flip') {
      return urlMode === 'speed_skim' ? 'skim' : urlMode;
    }
    return userSettings.quiz_learning_mode || 'fsrs';
  })
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [showRoadmapCompleteModal, setShowRoadmapCompleteModal] = useState<boolean>(false);
  const [headerViewMode, setHeaderViewMode] = useState<0 | 1>(0);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const rawUrlMode = searchParams.get('mode');
    const urlMode = rawUrlMode === 'speed_skim' ? 'skim' : rawUrlMode;
    if (urlMode && ['new', 'fsrs', 'roadmap', 'review', 'skim', 'flip'].includes(urlMode)) {
      setActiveMode(urlMode);
      updateUserSettings({ quiz_learning_mode: urlMode as any });
    }
    const urlOrder = searchParams.get('order');
    if (urlOrder === 'random') {
      setRandomEnabled(true);
      updateUserSettings({ random_enabled: true });
    } else if (urlOrder === 'sequential') {
      setRandomEnabled(false);
      updateUserSettings({ random_enabled: false });
    }
  }, [])

  const handleToggleRandom = (nextVal: boolean) => {
    setRandomEnabled(nextVal);
    updateUserSettings({ random_enabled: nextVal });
    saveGeneralSettings({ random_enabled: nextVal });

    const searchParams = new URLSearchParams(window.location.search);
    searchParams.set('order', nextVal ? 'random' : 'sequential');
    const newPath = window.location.pathname + '?' + searchParams.toString();
    window.history.replaceState(null, '', newPath);

    showLocalToast(nextVal ? "Card Order: Random (Shuffle ON)" : "Card Order: Sequential (Shuffle OFF)", "info");
  };

  useEffect(() => {
    cancelAllAudio();
  }, [currentIndex]);

  const fetchRoadmapStatus = () => refetchRoadmap();

  const activeBottomTab = isMapOpen ? 'map' : (isFeedbackOpen ? 'stats' : 'flashcard');

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

  const cardDragControls = useAnimationControls()
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [activeDragGrade, setActiveDragGrade] = useState<{
    direction: 'again' | 'hard' | 'good' | 'easy';
    grade: number;
    label: string;
    color: string;
  } | null>(null)
  const [isFlyingOut, setIsFlyingOut] = useState(false)
  const [isFlyToolbarOpen, setIsFlyToolbarOpen] = useState(false)
  const [isAutoAdvance, setIsAutoAdvance] = useState(false)

  // Sync initial state from backend setting
  useEffect(() => {
    if (quickLearnEnabled !== undefined) {
      setIsAutoAdvance(Boolean(quickLearnEnabled))
    }
  }, [quickLearnEnabled])
  useEffect(() => {
    setDragOffset({ x: 0, y: 0 })
    setActiveDragGrade(null)
    setIsFlyingOut(false)
    setIsFlyToolbarOpen(false)
    cardDragControls.set({ x: 0, y: 0, opacity: 1, rotate: 0 })
  }, [currentIndex, isFlipped])

  const backScrollRef = useRef<HTMLDivElement>(null)
  const [hasBackOverflow, setHasBackOverflow] = useState(false)

  useEffect(() => {
    if (isFlipped && backScrollRef.current) {
      const checkOverflow = () => {
        const el = backScrollRef.current
        if (el) {
          const isOverflowing = el.scrollHeight > el.clientHeight + 6
          setHasBackOverflow(isOverflowing)
        }
      }
      checkOverflow()
      const timer = setTimeout(checkOverflow, 80)
      return () => clearTimeout(timer)
    } else {
      setHasBackOverflow(false)
    }
  }, [isFlipped, currentIndex, currentQuestion?.id, effectiveShowFsrs])

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isSelectMode) return;
    const touch = e.touches[0];
    touchStartXRef.current = touch.clientX;
    touchStartYRef.current = touch.clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (isSelectMode || touchStartXRef.current === null || touchStartYRef.current === null) return;
    
    const touch = e.changedTouches[0];
    const diffX = touch.clientX - touchStartXRef.current;
    const diffY = touch.clientY - touchStartYRef.current;
    
    // Swipe horizontal to flip card
    if (effectiveCardFlipTrigger === 'both') {
      if (Math.abs(diffX) > 50 && Math.abs(diffY) < 60) {
        if (!isFlipped) {
          setIsFlipped(true);
          setShowFeedback(true);
          setJustAnswered(true);
        } else if (!canDragRate) {
          setIsFlipped(false);
        }
      }
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
  const lastAutoplayKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!currentQuestion) return;

    const autoplayKey = `${currentQuestion.id}_${isFlipped ? 'back' : 'front'}`;
    if (lastAutoplayKeyRef.current === autoplayKey) {
      return;
    }

    if (isFlipped) {
      if (autoPlayAudio === 'always' || autoPlayAudio === 'back') {
        lastAutoplayKeyRef.current = autoplayKey;
        playCardAudio('back');
      }
    } else {
      if (autoPlayAudio === 'always' || autoPlayAudio === 'front') {
        lastAutoplayKeyRef.current = autoplayKey;
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
    const searchParams = new URLSearchParams(window.location.search);
    const urlStep = searchParams.get('step');
    const isRoadmapReview = activeMode === 'roadmap' && (urlStep === 'fsrs_review' || roadmapStatus?.pipeline?.[roadmapStatus?.current_step_index || 0]?.type === 'fsrs_review');
    const isFsrsMode = activeMode === 'fsrs' || isRoadmapReview;
    if (!session || !session.questions || !isFsrsMode) return 0;
    const now = currentTime.getTime();
    const currentStep = roadmapStatus?.pipeline?.find((s: any) => s.type === 'fsrs_review');
    const overdueHours = currentStep?.overdue_hours ?? 24;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    return session.questions.filter((q: any, idx: number) => {
      if (q.is_ignored) return false;
      const isFsrsRecord = q.fsrs && q.fsrs.state !== 0 && q.fsrs.stability !== null;
      if (!isFsrsRecord) return false;
      
      // Exclude cards first learned today ONLY if in roadmap review with overdueHours >= 24
      if (isRoadmapReview && overdueHours >= 24 && q.fsrs?.first_learned) {
        const firstLearnedDate = parseUTCDate(q.fsrs.first_learned).getTime();
        if (firstLearnedDate >= todayStart.getTime()) return false;
      }

      const isDue = parseUTCDate(q.fsrs.due).getTime() - 30000 <= now;
      const hasAnswered = sessionAnswers[idx] !== undefined;
      
      if (hasAnswered && !isDue) return false;
      return isDue;
    }).length;
  }, [session, activeMode, currentTime, sessionAnswers, roadmapStatus]);

  const isSpeedSkimMode = useMemo(() => {
    if (activeMode === 'speed_skim' || activeMode === 'skim') return true;
    if (activeMode === 'roadmap') {
      const searchParams = new URLSearchParams(window.location.search);
      const urlStep = searchParams.get('step');
      const curStep = roadmapStatus?.pipeline?.[roadmapStatus?.current_step_index || 0];
      if (urlStep === 'speed_skim' || urlStep === 'skim' || curStep?.type === 'speed_skim') return true;
    }
    return false;
  }, [activeMode, roadmapStatus]);

  const effectiveCardMode = isSpeedSkimMode ? 'speed_skim' : activeMode;

  const hasRated = activelyRatedCurrentCard || (sessionAnswers[currentIndex] !== undefined && !isCardUnlocked)

  const getFilteredCount = (mode: string) => {
    if (!session?.questions) return 0;
    if (mode === 'all') return session.questions.length;
    return session.questions.filter((q: any) => getCardBoxId(q) === mode).length;
  };

  const canEdit = user?.role === 'admin' || user?.id === 1 || session?.creator_id === user?.id || session?.is_collaborator


  useEffect(() => {
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
        speakWithEdgeTTS(question);
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
      const isFolder = typeof id === 'string' && id.startsWith('folder_')
      const folderId = isFolder ? id.replace('folder_', '') : null
      const fetchUrl = id === 'quick' 
        ? '/api/v1/deck/quick-play-data' 
        : isFolder
          ? `/api/v1/folder/${folderId}/play-data${modeParam}`
          : `/api/v1/deck/${id}/play-data${modeParam}`
      const quizRes = await axios.get(fetchUrl)
      const questions = quizRes.data.questions || []
      setSession({ ...quizRes.data, questions })

      const effectiveStudy = quizRes.data.effective_study_settings || quizRes.data.user_settings || {};
      const creatorStudyDefs = quizRes.data.creator_study_defaults || quizRes.data.study_defaults || {};
      const userStudyOverrides = quizRes.data.user_study_settings || quizRes.data.user_settings || {};
      const isCustom = quizRes.data.is_study_customized;
      const origin = quizRes.data.setting_origin;
      const userGlobal = quizRes.data.user_global_settings;
      const profiles = quizRes.data.study_profiles;
      const activeProfId = quizRes.data.active_profile_id;

      syncStudySettings(effectiveStudy, creatorStudyDefs, userStudyOverrides, isCustom, origin, userGlobal, profiles, activeProfId);

      const searchParams = new URLSearchParams(window.location.search);
      const rawUrlMode = searchParams.get('mode');
      const urlMode = rawUrlMode === 'speed_skim' ? 'skim' : rawUrlMode;
      if (urlMode && ['new', 'fsrs', 'roadmap', 'review', 'skim', 'flip'].includes(urlMode)) {
        setActiveMode(urlMode);
        updateUserSettings({ quiz_learning_mode: urlMode as any });
      } else if (effectiveStudy.learning_mode) {
        const eff = effectiveStudy.learning_mode === 'speed_skim' ? 'skim' : effectiveStudy.learning_mode;
        setActiveMode(eff);
      }

      const urlOrder = searchParams.get('order');
      if (urlOrder === 'random') {
        setRandomEnabled(true);
        updateUserSettings({ random_enabled: true });
        saveGeneralSettings({ random_enabled: true });
        if (questions.length > 0) {
          const randIdx = Math.floor(Math.random() * questions.length);
          setCurrentIndex(randIdx);
        }
      } else if (urlOrder === 'sequential') {
        setRandomEnabled(false);
        updateUserSettings({ random_enabled: false });
        saveGeneralSettings({ random_enabled: false });
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
        const urlStep = searchParams.get('step');
        const effectiveMode = urlMode || activeMode || userSettings.quiz_learning_mode || 'fsrs';
        const activeStepType = effectiveMode === 'roadmap' ? (urlStep || rawStep?.type) : undefined;

        let curIdx = 0;
        try {
          const res = await axios.post(`/api/v1/deck/${id}/next-card`, {
            mode: effectiveMode,
            step_type: activeStepType,
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

  const handleReviewRating = async (rating: number, autoAdvance?: boolean) => {
    console.log("DEBUG: handleReviewRating called with rating:", rating, "currentIndex:", currentIndex, "autoAdvance:", autoAdvance);
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

    // Update Combo Streak
    if (rating >= 3) {
      setComboStreak(prev => prev + 1);
    } else if (rating === 1) {
      setComboStreak(0);
    }

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
      if (hapticEnabled) triggerHaptic('success')
      const confettiColors = streak >= 5 ? ['#f59e0b', '#ef4444', '#f97316'] : ['#6366f1', '#a855f7', '#ec4899']
      confetti({ zIndex: 9999, particleCount: streak >= 5 ? 250 : 150, spread: streak >= 5 ? 100 : 70, origin: { y: 0.6 }, colors: confettiColors })
      if (alreadyRated) setBadgeMessage("Correct! 🎯")
    } else {
      if (sfxEnabled) playIncorrectSound()
      if (hapticEnabled) triggerHaptic('error')
      if (alreadyRated) setBadgeMessage("Keep going! 💪")
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

    const isPureSwipeMode = effectiveCardRatingMode === 'swipe_4way' || effectiveCardRatingMode === 'swipe_2way';
    const effectiveAutoAdvance = isAutoAdvance || quickLearnEnabled;
    const shouldAutoAdvance = Boolean(autoAdvance !== undefined ? autoAdvance : (effectiveAutoAdvance || isPureSwipeMode));

    if (shouldAutoAdvance) {
      setTimeout(() => {
        handleNext(newAnswers);
      }, 50);
    }

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
      if (!shouldAutoAdvance && quickLearnEnabled && quickAnswersCount < quickTotalCount && !hasMilestone) {
        setTimeout(() => {
          handleNext(newAnswers)
        }, 200)
      }
    } catch (e) {
      console.error("Failed to record answer to server:", e)
      showLocalToast("Warning: Your answer was not saved to the server.", "warning")
    }
  }

  const canDragRate = !isSelectMode && isFlipped && !hasRated && activeMode !== 'flip' && !isSpeedSkimMode && effectiveCardRatingMode !== 'buttons' && !isFlyingOut;

  const handleCardDrag = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: { offset: { x: number; y: number }; velocity: { x: number; y: number } }
  ) => {
    if (isSelectMode || !canDragRate) return;
    const dx = info.offset.x;
    const dy = info.offset.y;
    setDragOffset({ x: dx, y: dy });

    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    const dist = Math.hypot(dx, dy);

    if (effectiveCardRatingMode === 'swipe_2way') {
      if (absX < 25) {
        setActiveDragGrade(null);
      } else if (dx < 0) {
        setActiveDragGrade({ direction: 'again', grade: 1, label: 'AGAIN', color: 'rose' });
      } else {
        setActiveDragGrade({ direction: 'good', grade: 3, label: 'GOOD', color: 'indigo' });
      }
    } else {
      // 4-Way Compass Swipe
      if (dist < 25) {
        setActiveDragGrade(null);
      } else if (absX > absY) {
        if (dx < 0) {
          setActiveDragGrade({ direction: 'again', grade: 1, label: 'AGAIN', color: 'rose' });
        } else {
          setActiveDragGrade({ direction: 'good', grade: 3, label: 'GOOD', color: 'indigo' });
        }
      } else {
        if (dy > 0) {
          setActiveDragGrade({ direction: 'hard', grade: 2, label: 'HARD', color: 'amber' });
        } else {
          setActiveDragGrade({ direction: 'easy', grade: 4, label: 'EASY', color: 'emerald' });
        }
      }
    }
  };

  const handleCardDragEnd = async (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: { offset: { x: number; y: number }; velocity: { x: number; y: number } }
  ) => {
    if (!canDragRate || !activeDragGrade) {
      cardDragControls.start({ x: 0, y: 0, rotate: 0, transition: { type: 'spring', stiffness: 500, damping: 30 } });
      setDragOffset({ x: 0, y: 0 });
      setActiveDragGrade(null);
      return;
    }

    const dx = info.offset.x;
    const dy = info.offset.y;
    const dist = Math.hypot(dx, dy);
    const vel = Math.hypot(info.velocity.x, info.velocity.y);

    const isTriggered = dist >= 65 || vel > 400;

    if (isTriggered && activeDragGrade) {
      setIsFlyingOut(true);
      const targetGrade = activeDragGrade.grade;
      const direction = activeDragGrade.direction;

      let targetX = 0;
      let targetY = 0;
      if (direction === 'again') targetX = -window.innerWidth * 0.85;
      else if (direction === 'good') targetX = window.innerWidth * 0.85;
      else if (direction === 'hard') targetY = window.innerHeight * 0.65;
      else if (direction === 'easy') targetY = -window.innerHeight * 0.65;

      await cardDragControls.start({
        x: targetX,
        y: targetY,
        opacity: 0,
        rotate: direction === 'again' ? -15 : direction === 'good' ? 15 : 0,
        transition: { duration: 0.18, ease: 'easeOut' }
      });

      handleReviewRating(targetGrade, true);
      
      setTimeout(() => {
        setIsFlyingOut(false);
        setActiveDragGrade(null);
        setDragOffset({ x: 0, y: 0 });
        cardDragControls.set({ x: 0, y: 0, opacity: 1, rotate: 0 });
      }, 300);
    } else {
      cardDragControls.start({ x: 0, y: 0, rotate: 0, transition: { type: 'spring', stiffness: 500, damping: 30 } });
      setDragOffset({ x: 0, y: 0 });
      setActiveDragGrade(null);
    }
  };

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
    cancelAllAudio();
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

    if ((activeMode === 'flip' || isSpeedSkimMode) && currentQuestion) {
      const alreadyRated = sessionAnswers[currentIndex] !== undefined;
      if (!alreadyRated) {
        // Record the view on backend
        try {
          const isSkim = isSpeedSkimMode;
          const res = await axios.post('/api/v1/deck/record_answer', {
            question_id: currentQuestion.id,
            is_correct: true,
            is_practice: !isSkim, // Flip mode is practice-like; speed_skim is introduction mode with XP & goal tracking
            mode: isSkim ? 'speed_skim' : activeMode,
            attempt_mode: isSkim ? 'speed_skim' : activeMode,
            rating: 3, // count as 'Good' / seen
            time_spent: timeLeftRef.current,
            local_date: new Date().toISOString().slice(0, 10)
          });
          if (isSkim) {
            const xpGained = res.data?.xp_gained || 3;
            setSessionXP(prev => prev + xpGained);
            addXp(xpGained);
          }
        } catch (e) {
          console.error(`Failed to record ${activeMode} view:`, e);
        }

        // Update local state and stats
        const prevRatings = Array.isArray(sessionAnswers[currentIndex]) 
          ? (sessionAnswers[currentIndex] as number[]) 
          : (typeof sessionAnswers[currentIndex] === 'number' ? [sessionAnswers[currentIndex] as number] : [])
        const newRatings = [...prevRatings, -2] // index -2 (studied but not evaluated/rated in flip/speed_skim mode)
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
      const urlStep = searchParams.get('step');
      const effectiveMode = urlMode || activeMode || userSettings.quiz_learning_mode || 'fsrs';
      const activeStepType = effectiveMode === 'roadmap' ? (urlStep || rawStep?.type) : undefined;

      const res = await axios.post(`/api/v1/deck/${id}/next-card`, {
        mode: effectiveMode,
        step_type: activeStepType,
        answered_indexes: answeredIndexes,
        current_index: currentIndex,
        random_enabled: randomEnabled ?? !!userSettings.random_enabled
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

  // Auto-advance timer in Skim Mode (when card is flipped to back face)
  useEffect(() => {
    if (!isSpeedSkimMode || !isFlipped || hasRated || isFlyToolbarOpen || isSettingsModalOpen || isQuitModalOpen) {
      return;
    }

    if (isPlayingAudio || isLoadingAudio) {
      // Audio is actively playing or loading. Once audio finishes, isPlayingAudio will transition to false.
      return;
    }

    // Auto-advance after audio completion (800ms buffer) or comfortable reading pause (1800ms if no audio)
    const advanceDelay = autoPlayAudio !== 'none' ? 800 : 1800;
    const timer = setTimeout(() => {
      handleNext();
    }, advanceDelay);

    return () => {
      clearTimeout(timer);
    };
  }, [
    isSpeedSkimMode,
    isFlipped,
    hasRated,
    isPlayingAudio,
    isLoadingAudio,
    autoPlayAudio,
    isFlyToolbarOpen,
    isSettingsModalOpen,
    isQuitModalOpen,
    currentIndex
  ]);

  const applyLearningMode = async (mode: string, order?: 'sequential' | 'random') => {
    setFsrsCompletionData(null)
    setActiveMode(mode)
    updateUserSettings({ quiz_learning_mode: mode as any })
    saveGeneralSettings({ learning_mode: mode })

    let effectiveRandom = randomEnabled
    if (order !== undefined) {
      effectiveRandom = (order === 'random')
      setRandomEnabled(effectiveRandom)
      updateUserSettings({ random_enabled: effectiveRandom })
      saveGeneralSettings({ random_enabled: effectiveRandom })
    }

    const orderParam = order ? `&order=${order}` : (effectiveRandom ? '&order=random' : '&order=sequential')
    navigate(`/flashcard/${id}/play?mode=${mode}${orderParam}`, { replace: true })

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
        random_enabled: effectiveRandom
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
        } else if (hasRated || activeMode === 'flip' || isSpeedSkimMode) {
          handleNext();
        }
        return;
      }

      // Number keys 1, 2, 3, 4 for FSRS Rating when flipped
      if (isFlipped && !hasRated && activeMode !== 'flip' && !isSpeedSkimMode) {
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

      // ArrowRight: Next card (if rated or flip mode or speed_skim)
      if (e.code === 'ArrowRight' && (hasRated || activeMode === 'flip' || isSpeedSkimMode)) {
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
    isSpeedSkimMode,
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
            Practice: #{practiceTotalAnswered + 1}
          </span>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center py-6 text-center">
          {showImages && currentQuestion.image && practiceSubMode !== 'listening' && (
            <img 
              src={resolveMediaUrl(currentQuestion.image) || undefined} 
              alt="Question" 
              className="max-h-36 object-contain rounded-2xl mb-4 border border-slate-100 shadow-sm cursor-zoom-in hover:opacity-95 transition-opacity" 
              onClick={() => setZoomedImage(resolveMediaUrl(currentQuestion.image) || null)}
            />
          )}
          
          {practiceSubMode === 'listening' ? (
            <div className="flex flex-col items-center gap-4">
              <div 
                onClick={() => {
                  const { question: qText, question_key: qKey } = practiceData!;
                  if (qKey === 'front') {
                    playCardAudio('front');
                  } else if (qKey === 'back') {
                    playCardAudio('back');
                  } else {
                    speakWithEdgeTTS(qText);
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
    activeMode: effectiveCardMode
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
    return Boolean((activeMode === 'fsrs' || activeMode === 'review' || activeMode === 'roadmap') && fsrsCompletionData?.is_all_completed);
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

  {/* ═══════════ LEFT-SIDE EXPANDABLE FLY TOOLBAR (Horizontal Quick Bar) ═══════════ */}
  const renderFlyToolbar = (isEmbedded = false) => {
    if (!currentQuestion) return null;

    const triggerPlayAudio = async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (mainTab === 'practice') {
        const practiceData = currentPracticeData;
        if (practiceData) {
          const { question: qText, question_key: qKey } = practiceData;
          if (qKey === 'front') await playCardAudio('front');
          else if (qKey === 'back') await playCardAudio('back');
          else await speakWithEdgeTTS(qText);
        }
      } else {
        await playCardAudio(isFlipped ? 'back' : 'front');
      }
    };

    const showHintBtn = !isFlipped && !!currentQuestion?.hint;
    const showExplainBtn = isFlipped || mainTab === 'practice' || showFeedback;
    const showFlipBackBtn = isFlipped && mainTab !== 'practice';
    const effectiveAutoAdvance = isSpeedSkimMode || isAutoAdvance || quickLearnEnabled;

    return (
      <FlashcardFlyToolbar
        isCardSlot={isEmbedded}
        isFlyToolbarOpen={isFlyToolbarOpen}
        setIsFlyToolbarOpen={setIsFlyToolbarOpen}
        triggerPlayAudio={triggerPlayAudio}
        isLoadingAudio={isLoadingAudio}
        isPlayingAudio={isPlayingAudio}
        autoPlayAudio={autoPlayAudio}
        setAutoPlayAudio={setAutoPlayAudio}
        sfxEnabled={sfxEnabled}
        setSfxEnabled={setSfxEnabled}
        effectiveAutoAdvance={effectiveAutoAdvance}
        setIsAutoAdvance={setIsAutoAdvance}
        setQuickLearnEnabled={setQuickLearnEnabled}
        showImages={showImages}
        setShowImages={setShowImages}
        randomEnabled={randomEnabled}
        setRandomEnabled={setRandomEnabled}
        onToggleRandom={handleToggleRandom}
        isSpeedSkimMode={isSpeedSkimMode}
        showLocalToast={showLocalToast}
        isSelectMode={isSelectMode}
        setIsSelectMode={setIsSelectMode}
        currentQuestion={currentQuestion}
        handleStarQuestion={handleStarQuestion}
        showHintBtn={showHintBtn}
        showingHint={showingHint}
        setShowingHint={setShowingHint}
        showExplainBtn={showExplainBtn}
        justAnswered={justAnswered}
        mainTab={mainTab}
        setShowFeedback={setShowFeedback}
        setIsFeedbackOpen={setIsFeedbackOpen}
        showFlipBackBtn={showFlipBackBtn}
        setIsFlipped={setIsFlipped}
        setIsSettingsModalOpen={setIsSettingsModalOpen}
        onOpenCardHub={handleOpenCardHub}
      />
    );
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
              label: activeMode === 'new' ? 'Learn New Cards' : (activeMode === 'review' ? 'Review Due Cards' : 'FSRS Review'),
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
              style: 'bg-emerald-50 text-emerald-950 border border-emerald-300/80 shadow-2xs hover:bg-emerald-100/90'
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
              const unreviewedDueCount = dueCardsIndices.filter((idx: number) => sessionAnswers[idx] === undefined).length;
              subCurr = unreviewedDueCount;
              subTotal = dueCardsIndices.length > 0 ? dueCardsIndices.length : totalDeckCards;
              progressPillText = `${unreviewedDueCount} left`;
            } else {
              subCurr = totalLearnedCards;
              subTotal = totalDeckCards;
              progressPillText = undefined;
            }
          } else if (activeMode === 'review') {
            const fsrsIdx = rawPipeline.findIndex((s: any) => s.type === 'fsrs_review');
            if (fsrsIdx !== -1) displayStepIdx = fsrsIdx;
            modeBadge = {
              emoji: '📚',
              label: 'Review Due Cards Only',
              short: 'REV',
              style: 'bg-sky-50 text-sky-950 border border-sky-300/80 shadow-2xs hover:bg-sky-100/90'
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
              label: 'Learn New Cards',
              short: 'NEW',
              style: 'bg-indigo-50 text-indigo-950 border border-indigo-300/80 shadow-2xs hover:bg-indigo-100/90'
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
              label: 'Free Flip Mode',
              short: 'FLIP',
              style: 'bg-slate-100 text-slate-900 border border-slate-300/80 shadow-2xs hover:bg-slate-200/90'
            };
            subTotal = session?.questions?.length || 1;
            subCurr = currentIndex + 1;
          } else if (activeMode === 'speed_skim' || activeMode === 'skim') {
            modeBadge = {
              emoji: '⚡',
              label: 'Speed Skim',
              short: 'SKIM',
              style: 'bg-amber-50 text-amber-950 border border-amber-300/80 shadow-2xs hover:bg-amber-100/90'
            };
            subTotal = session?.questions?.length || 1;
            subCurr = Object.keys(sessionAnswers).length;
          } else {
            // Standard guided Roadmap mode (mode === 'roadmap')
            const searchParams = new URLSearchParams(window.location.search);
            const urlStep = searchParams.get('step');
            if (urlStep) {
              const explicitIdx = rawPipeline.findIndex((s: any) => s.type === urlStep);
              if (explicitIdx !== -1) displayStepIdx = explicitIdx;
            } else if (!isStage1Done || isNewCardSession || !isStage2Done) {
              const step1Idx = rawPipeline.findIndex((s: any) => s.type === 'speed_skim' || s.type === 'new_cards');
              if (step1Idx !== -1) displayStepIdx = step1Idx;
            } else {
              const fsrsIdx = rawPipeline.findIndex((s: any) => s.type === 'fsrs_review');
              if (fsrsIdx !== -1) displayStepIdx = fsrsIdx;
            }

            const currentStep = rawPipeline?.[displayStepIdx];
            if (currentStep?.type === 'speed_skim') {
              modeBadge = {
                emoji: '⚡',
                label: 'Roadmap - Speed Skim',
                short: 'SKIM',
                style: 'bg-amber-50 text-amber-950 border border-amber-300/80 shadow-2xs hover:bg-amber-100/90'
              };
              const targetCount = currentStep.daily_count || currentStep.progress?.target || 20;
              const skimmedToday = currentStep.progress?.learned ?? 0;
              const skimmedInSession = Object.keys(sessionAnswers).length;
              subTotal = targetCount;
              subCurr = Math.max(skimmedToday, skimmedInSession);
              progressPillText = undefined;
            } else if (currentStep?.type === 'new_cards') {
              modeBadge = {
                emoji: '🛣️',
                label: 'Roadmap - New Cards',
                short: 'RM',
                style: 'bg-teal-50 text-teal-950 border border-teal-300/80 shadow-2xs hover:bg-teal-100/90'
              };
              const targetNew = currentStep.daily_count || currentStep.progress?.target || roadmapStatus?.new_target_today || 20;
              const learnedToday = currentStep.progress?.learned ?? roadmapStatus?.new_learned_today ?? 0;
              const newCardsInSession = Object.keys(sessionAnswers).filter(idxStr => {
                const q = session?.questions?.[Number(idxStr)];
                return q && (q.is_new || q.state === 0 || q.repetition === 0);
              }).length;
              subTotal = targetNew;
              subCurr = Math.max(learnedToday, newCardsInSession);
              progressPillText = undefined;
            } else {
              modeBadge = {
                emoji: '🛣️',
                label: 'Roadmap - Review',
                short: 'RM',
                style: 'bg-teal-50 text-teal-950 border border-teal-300/80 shadow-2xs hover:bg-teal-100/90'
              };
              const reviewedToday = currentStep?.progress?.reviewed_today ?? roadmapStatus?.review_completed_today ?? 0;
              const dueRemaining = currentStep?.progress?.due_count ?? roadmapStatus?.review_due_today ?? 0;
              const fsrsTarget = currentStep?.daily_count || currentStep?.progress?.target || (reviewedToday + dueRemaining);
              subTotal = fsrsTarget > 0 ? fsrsTarget : (session?.questions?.length || 15);

              // Đếm số thẻ ôn tập đến hạn còn lại chưa được đánh giá trong phiên này
              const nowTime = new Date().getTime();
              const overdueHours = currentStep?.overdue_hours ?? 24;
              const todayStart = new Date();
              todayStart.setHours(0, 0, 0, 0);

              const dueCardsIndices = session?.questions ? session.questions.map((q: any, idx: number) => {
                if (q.is_ignored) return -1;
                const box = getCardBoxId(q);
                if (box === 'unseen' || !q.fsrs?.due) return -1;
                // Exclude cards first learned today if overdueHours >= 24
                if (overdueHours >= 24 && q.fsrs?.first_learned) {
                  const firstLearnedDate = parseUTCDate(q.fsrs.first_learned).getTime();
                  if (firstLearnedDate >= todayStart.getTime()) return -1;
                }
                const isDue = (parseUTCDate(q.fsrs.due).getTime() - 30000) <= nowTime;
                return isDue ? idx : -1;
              }).filter((idx: number) => idx !== -1) : [];

              const unreviewedDueCount = dueCardsIndices.length > 0 
                ? dueCardsIndices.filter((idx: number) => sessionAnswers[idx] === undefined).length 
                : Math.max(0, dueRemaining - Object.keys(sessionAnswers).length);

              subCurr = unreviewedDueCount;
              progressPillText = `${unreviewedDueCount} left`;
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
              showFeedback={isFeedbackOpen}
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
              comboStreak={comboStreak}
              isRandom={randomEnabled}
              onToggleOrder={() => handleToggleRandom(!randomEnabled)}
              onOpenStudyConsole={() => setIsStudyConsoleOpen(true)}
            />
          );
        })()}

      {/* Decoupled - Practice mode moved to standalone /practice/:id page */}

      <main className="flex-1 min-h-0 flex w-full max-w-none justify-center gap-4 lg:gap-8 px-2 lg:px-6 xl:px-10 md:py-3 py-2 overflow-hidden">
        <FlashcardDesktopLeftAside
          showFeedback={showFeedback || isFeedbackOpen}
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
          handleEditCurrentTab={handleEditCurrentTab}
          isCopyMenuOpen={isCopyMenuOpen}
          setIsCopyMenuOpen={setIsCopyMenuOpen}
          copyCurrentTabContent={copyCurrentTabContent}
          isCopied={isCopied}
          handleNext={handleNext}
          session={session}
          mainTab={mainTab}
          activeGoal={activeGoal}
          activeMode={activeMode}
          roadmapStatus={roadmapStatus}
          leaderboardType={leaderboardType}
          setLeaderboardType={setLeaderboardType}
          leaderboardTimeFilter={leaderboardTimeFilter}
          setLeaderboardTimeFilter={setLeaderboardTimeFilter}
          isLeaderboardLoading={isLeaderboardLoading}
          xpLeaderboard={xpLeaderboard}
          user={user}
          gamify={gamify}
          userRank={userRank}
          getUnitName={getUnitName}
          leaderboardMsg={leaderboardMsg}
          practiceAnswers={practiceAnswers}
          sessionAnswers={sessionAnswers}
          practiceSubMode={practiceSubMode}
          renderPracticeStats={renderPracticeStats}
          renderSessionStats={renderSessionStats}
          currentIndex={currentIndex}
          navigateToQuestion={navigateToQuestion}
          setIsMapOpen={setIsMapOpen}
          mobileMapFilterMode={mobileMapFilterMode}
          setMobileMapFilterMode={setMobileMapFilterMode}
        />

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
                <Flashcard3DCard
                  currentQuestion={currentQuestion}
                  currentIndex={currentIndex}
                  isFlipped={isFlipped}
                  setIsFlipped={setIsFlipped}
                  isSelectMode={isSelectMode}
                  effectiveCardFlipTrigger={effectiveCardFlipTrigger}
                  setIsFlyToolbarOpen={setIsFlyToolbarOpen}
                  setShowFeedback={setShowFeedback}
                  setJustAnswered={setJustAnswered}
                  handleStarQuestion={handleStarQuestion}
                  frontValign={frontValign}
                  frontHalign={frontHalign}
                  frontFontSize={frontFontSize}
                  backValign={backValign}
                  backHalign={backHalign}
                  showImages={showImages}
                  setZoomedImage={setZoomedImage}
                  effectiveShowFsrs={effectiveShowFsrs}
                  selectedOption={selectedOption}
                  hasRated={selectedOption !== null}
                  activeDragGrade={activeDragGrade}
                  dragOffset={dragOffset}
                  canDragRate={canDragRate}
                  hasBackOverflow={hasBackOverflow}
                  backScrollRef={backScrollRef}
                  handleCardDrag={handleCardDrag}
                  handleCardDragEnd={handleCardDragEnd}
                  cardDragControls={cardDragControls}
                  activeMasteryUpgrade={activeMasteryUpgrade}
                  currentTime={currentTime}
                  showAbsoluteFirst={showAbsoluteFirst}
                  setShowAbsoluteFirst={setShowAbsoluteFirst}
                  showAbsoluteLast={showAbsoluteLast}
                  setShowAbsoluteLast={setShowAbsoluteLast}
                  renderFlyToolbarNode={renderFlyToolbar}
                  activeMode={effectiveCardMode}
                  handleNext={handleNext}
                />
              )}
            </motion.div>
          </AnimatePresence>
          </div>
        </div>

        <FlashcardDesktopRightAside
          mainTab={mainTab}
          renderPracticeStats={renderPracticeStats}
          renderSessionStats={renderSessionStats}
          session={session}
          practiceAnswers={practiceAnswers}
          sessionAnswers={sessionAnswers}
          currentIndex={currentIndex}
          navigateToQuestion={navigateToQuestion}
          setIsMapOpen={setIsMapOpen}
          mobileMapFilterMode={mobileMapFilterMode}
          setMobileMapFilterMode={setMobileMapFilterMode}
        />
      </main>


      {/* ═══════════ FLY TOOLBAR (Floating Island above footer dock for Practice Mode) ═══════════ */}
      {!shouldShowRoadmapStepCompleteScreen && mainTab === 'practice' && !practiceNeedsSetup && (activeBottomTab === 'flashcard' || !isFeedbackOpen) && !isMapOpen && !isStatsOpen && (
        renderFlyToolbar(false)
      )}

      <FlashcardActionDock
        shouldShowRoadmapStepCompleteScreen={shouldShowRoadmapStepCompleteScreen}
        mainTab={mainTab}
        practiceNeedsSetup={practiceNeedsSetup}
        practiceAnswers={practiceAnswers}
        currentIndex={currentIndex}
        activeBottomTab={activeBottomTab}
        isFeedbackOpen={isFeedbackOpen}
        showingHint={showingHint}
        setShowingHint={setShowingHint}
        currentQuestion={currentQuestion}
        isFlipped={isFlipped}
        setIsFlipped={setIsFlipped}
        setJustAnswered={setJustAnswered}
        hasRated={selectedOption !== null}
        activeMode={effectiveCardMode}
        effectiveCardRatingMode={effectiveCardRatingMode}
        handleReviewRating={handleReviewRating}
        handleNext={handleNext}
        handleUndoRating={handleUndoRating}
        activelyRatedCurrentCard={activelyRatedCurrentCard}
        onOpenMap={() => {
          setIsMapOpen(true);
          setIsStatsOpen(false);
          setIsFeedbackOpen(false);
        }}
        onOpenFlashcard={() => {
          setIsMapOpen(false);
          setIsStatsOpen(false);
          setIsFeedbackOpen(false);
        }}
        onOpenStats={() => {
          handleOpenCardHub('stats');
        }}
        getFSRSIntervals={getFSRSIntervals}
      />


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

      <FlashcardModalsContainer
        id={id!}
        session={session}
        user={user}
        gamify={gamify}
        currentIndex={currentIndex}
        mainTab={mainTab}
        practiceAnswers={practiceAnswers}
        sessionAnswers={sessionAnswers}
        navigateToQuestion={navigateToQuestion}
        userSettings={userSettings}
        updateUserSettings={updateUserSettings}
        setActiveMode={setActiveMode}
        navigate={navigate}

        // Question Map Modal
        isMapOpen={isMapOpen}
        setIsMapOpen={setIsMapOpen}
        mobileMapFilterMode={mobileMapFilterMode}
        setMobileMapFilterMode={setMobileMapFilterMode}
        getFilteredCount={getFilteredCount}

        // Stats Drawer & Card Hub
        isStatsOpen={isStatsOpen}
        setIsStatsOpen={setIsStatsOpen}
        cardHubSubTab={cardHubSubTab}
        setCardHubSubTab={setCardHubSubTab}
        activeStatsTab={activeStatsTab}
        setActiveStatsTab={setActiveStatsTab}
        dailyComparisonData={dailyComparisonData || []}
        dailyComparisonAvg={dailyComparisonAvg}
        isDailyComparisonLoading={isDailyComparisonLoading}
        activeGoal={activeGoal}
        activeMode={activeMode}
        xpLeaderboard={xpLeaderboard}
        userRank={userRank}
        leaderboardMsg={leaderboardMsg}
        currentQuestion={currentQuestion}
        renderSessionStats={renderSessionStats}

        // Feedback Modal
        isFeedbackOpen={isFeedbackOpen}
        setIsFeedbackOpen={setIsFeedbackOpen}
        showFeedback={showFeedback}
        activeFeedbackTab={activeFeedbackTab}
        setActiveFeedbackTab={setActiveFeedbackTab}
        getInsightText={getInsightText}
        isEditingInsight={isEditingInsight}
        insightInput={insightInput}
        setInsightInput={setInsightInput}
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
        handleEditCurrentTab={handleEditCurrentTab}
        isCopyMenuOpen={isCopyMenuOpen}
        setIsCopyMenuOpen={setIsCopyMenuOpen}
        copyCurrentTabContent={copyCurrentTabContent}
        isCopied={isCopied}
        handleNext={handleNext}

        // Overdrive Strike
        isLimitlessStrike={isLimitlessStrike}

        // Goal Celebration
        showGoalCelebration={showGoalCelebration}
        setShowGoalCelebration={setShowGoalCelebration}
        goalToast={goalToast}

        // Settings Modal
        isSettingsModalOpen={isSettingsModalOpen}
        setIsSettingsModalOpen={setIsSettingsModalOpen}
        applyLearningMode={applyLearningMode}
        autoPlayAudio={autoPlayAudio}
        setAutoPlayAudio={setAutoPlayAudio}
        sfxEnabled={sfxEnabled}
        setSfxEnabled={setSfxEnabled}
        hapticEnabled={hapticEnabled}
        setHapticEnabled={setHapticEnabled}
        copyQuestionToClipboard={copyQuestionToClipboard}
        handleIgnoreQuestion={handleIgnoreQuestion}
        handleStarQuestion={handleStarQuestion}
        openEditModal={openEditModal}
        setIsQuitModalOpen={setIsQuitModalOpen}
        quickLearnEnabled={quickLearnEnabled}
        setQuickLearnEnabled={setQuickLearnEnabled}
        showImages={showImages}
        setShowImages={setShowImages}
        effectiveShowFsrs={effectiveShowFsrs}
        setShowFsrs={setShowFsrs}
        randomEnabled={randomEnabled}
        setRandomEnabled={handleToggleRandom}
        isCustomized={isCustomized}
        settingOrigin={settingOrigin}
        resetToCreatorDefaults={resetToCreatorDefaults}
        studyProfiles={studyProfiles}
        activeProfileId={activeProfileId}
        applyProfile={applyProfile}
        createCustomProfile={createCustomProfile}
        deleteCustomProfile={deleteCustomProfile}
        frontHalign={frontHalign}
        setFrontHalign={setFrontHalign}
        frontFontSize={frontFontSize}
        setFrontFontSize={setFrontFontSize}
        backHalign={backHalign}
        setBackHalign={setBackHalign}
        frontValign={frontValign}
        setFrontValign={setFrontValign}
        backValign={backValign}
        setBackValign={setBackValign}
        deckCardFlipTrigger={deckCardFlipTrigger}
        setCardFlipTrigger={setCardFlipTrigger}
        saveGeneralSettings={saveGeneralSettings}
        deckCardRatingMode={deckCardRatingMode}
        setCardRatingMode={setCardRatingMode}
        saveAsCreatorDefaults={saveAsCreatorDefaults}

        // Quit Modal
        isQuitModalOpen={isQuitModalOpen}

        // Edit Modal
        isEditModalOpen={isEditModalOpen}
        setIsEditModalOpen={setIsEditModalOpen}
        editFormData={editFormData}
        handleSaveEdit={handleSaveEdit}
        isSavingEdit={isSavingEdit}

        // Local Toast
        localToast={localToast}

        // Zoomed Image
        zoomedImage={zoomedImage}
        setZoomedImage={setZoomedImage}

        // Study Console
        isStudyConsoleOpen={isStudyConsoleOpen}
        setIsStudyConsoleOpen={setIsStudyConsoleOpen}
      />

      {/* ═══════════ QUICK ACTION BOTTOM SHEET (Root-level Global Portal) ═══════════ */}
      <FlashcardQuickControlsSheet
        isOpen={isFlyToolbarOpen}
        onClose={() => setIsFlyToolbarOpen(false)}
        autoPlayAudio={autoPlayAudio}
        setAutoPlayAudio={setAutoPlayAudio}
        sfxEnabled={sfxEnabled}
        setSfxEnabled={setSfxEnabled}
        effectiveAutoAdvance={isSpeedSkimMode || isAutoAdvance || quickLearnEnabled}
        setIsAutoAdvance={setIsAutoAdvance}
        setQuickLearnEnabled={setQuickLearnEnabled}
        showImages={showImages}
        setShowImages={setShowImages}
        randomEnabled={randomEnabled}
        setRandomEnabled={setRandomEnabled}
        onToggleRandom={handleToggleRandom}
        isSpeedSkimMode={isSpeedSkimMode}
        showLocalToast={showLocalToast}
        isSelectMode={isSelectMode}
        setIsSelectMode={setIsSelectMode}
        currentQuestion={currentQuestion}
        handleStarQuestion={handleStarQuestion}
        showFlipBackBtn={isFlipped && mainTab !== 'practice'}
        setIsFlipped={setIsFlipped}
        setIsSettingsModalOpen={setIsSettingsModalOpen}
        activeMode={activeMode}
        onSelectMode={(targetMode) => {
          applyLearningMode(targetMode, randomEnabled ? 'random' : 'sequential')
          showLocalToast(`Switched to ${targetMode.toUpperCase()} mode`, 'info')
        }}
      />
    </div>
  )
}
