import { useState, useEffect, useRef, useMemo } from 'react'
import confetti from 'canvas-confetti'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, LayoutGrid, Timer, Flame, Trophy, Check, X, Sparkles, Lightbulb, StickyNote, Play, Target, CheckCircle2, XCircle, Clock, BookOpen, Hash, Copy, Edit3, Brain, FileText, HelpCircle, Sliders, ListOrdered, Shuffle, Eye, EyeOff, AlertCircle, TrendingUp, Award, Lock, Keyboard, Volume2, VolumeX, RefreshCw, Undo2, Settings } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'
import { playCorrectSound, playIncorrectSound, speakMultiLanguage } from '@/lib/audio'
import { triggerHaptic } from '@/lib/haptic'
import { parseBBCodeToHtml, stripBBCode, isJapanese, getJpPattern, extractTokens, tokensOverlapHigh } from '@/lib/text'
import { selectDistractors } from '@/lib/distractor'
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


interface Option {
  id: number
  content: string
  is_correct: boolean
}

interface Question {
  id: number
  is_ignored?: boolean
  content: string
  explanation: string
  ai_explanation?: string
  hint?: string | null
  mnemonic?: string | null
  options: Option[]
  stats?: { 
    total: number
    correct: number
    wrong?: number
    avg_time: number
    again_count?: number
    hard_count?: number
    good_count?: number
    easy_count?: number
  }
  box_level?: number
  image?: string | null
  audio?: string | null
  others?: Record<string, any> | null
  fsrs?: {
    state: number
    stability: number | null
    difficulty: number | null
    due: string | null
    last_review: string | null
    first_learned?: string | null
    last_reviewed?: string | null
    intervals: Record<number, string>
  }
  practice?: {
    question: string
    choices?: string[]
    correct_index?: number
    correct_answer?: string
    question_key: string
    answer_key: string
  }
}
const MarkdownComponents = {
  code({ node, className, children, ...props }: any) {
    const value = String(children || '').replace(/\n$/, '')
    const hasRuby = value.includes('<ruby>') || value.includes('</ruby>')
    if (hasRuby) {
      return (
        <code className={className} dangerouslySetInnerHTML={{ __html: value }} {...props} />
      )
    }
    return <code className={className} {...props}>{children}</code>
  }
}

const parseUTCDate = (dateStr: string | null | undefined): Date => {
  if (!dateStr) return new Date();
  try {
    let formatted = dateStr.trim().replace(' ', 'T');
    const tIndex = formatted.indexOf('T');
    if (tIndex !== -1) {
      const timePart = formatted.slice(tIndex);
      if (!timePart.includes('Z') && !timePart.includes('+') && !timePart.includes('-')) {
        const dotIndex = formatted.indexOf('.');
        if (dotIndex !== -1) {
          const parts = formatted.split('.');
          const base = parts[0];
          let ms = parts[1] || '';
          ms = ms.substring(0, 3);
          formatted = `${base}.${ms}Z`;
        } else {
          formatted = formatted + 'Z';
        }
      }
    } else {
      if (!formatted.includes('Z')) {
        formatted = formatted + 'T00:00:00Z';
      }
    }
    const d = new Date(formatted);
    if (!isNaN(d.getTime())) return d;
  } catch (e) {
    console.error("parseUTCDate error:", e);
  }
  return new Date();
}

function formatRelativeTime(dateStr: string | null | undefined): { relative: string; full: string } {
  if (!dateStr) return { relative: 'never', full: 'Never learned this card' };
  const d = parseUTCDate(dateStr);
  if (isNaN(d.getTime())) return { relative: 'never', full: 'Never learned this card' };
  
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);
  
  let relative = '';
  if (diffSec < 60) {
    relative = 'just now';
  } else if (diffMin < 60) {
    relative = `${diffMin}m ago`;
  } else if (diffHour < 24) {
    relative = `${diffHour}h ago`;
  } else if (diffDay < 30) {
    relative = `${diffDay}d ago`;
  } else if (diffMonth < 12) {
    relative = `${diffMonth}mo ago`;
  } else {
    relative = `${diffYear}y ago`;
  }
  
  const dayStr = String(d.getDate()).padStart(2, '0');
  const monthStr = String(d.getMonth() + 1).padStart(2, '0');
  const yearStr = d.getFullYear();
  const hourStr = String(d.getHours()).padStart(2, '0');
  const minStr = String(d.getMinutes()).padStart(2, '0');
  const secStr = String(d.getSeconds()).padStart(2, '0');
  
  const full = `${dayStr}/${monthStr}/${yearStr} ${hourStr}:${minStr}:${secStr}`;
  
  return { relative, full };
}

export default function FlashcardPlay() {
  const { id, mode, subMode } = useParams()
  const navigate = useNavigate()
  const { user, gamify, setUser, setGamify, addXp } = useAppStore()
  
  const [session, setSession] = useState<any>(null)
  const [currentIndex, setCurrentIndex] = useState(-1)
  const [showAbsoluteFirst, setShowAbsoluteFirst] = useState(false)
  const [showAbsoluteLast, setShowAbsoluteLast] = useState(false)
  const [showingHint, setShowingHint] = useState(false)
  const [isAskingHint, setIsAskingHint] = useState(false)
  const [isUtilityMenuOpen, setIsUtilityMenuOpen] = useState(false)

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
  const currentQuestion: Question | null = session?.questions?.[currentIndex] || null
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const [isFlipped, setIsFlipped] = useState(false)
  const [badgeVisible, setBadgeVisible] = useState(false)
  const [badgeMessage, setBadgeMessage] = useState("")
  
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
    autoPlayAudio,
    setAutoPlayAudio,
    playCardAudio,
    stopAudio,
    activeAudioRef
  } = useFlashcardAudio(currentQuestion)

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

  const [initialTotalXP, setInitialTotalXP] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [isAskingAI, setIsAskingAI] = useState(false)
  const [personalNote, setPersonalNote] = useState('')
  const [isEditingNote, setIsEditingNote] = useState(false)
  const [isEditingAI, setIsEditingAI] = useState(false)
  const [isEditingInsight, setIsEditingInsight] = useState(false)
  const [insightInput, setInsightInput] = useState('')
  const [aiInput, setAiInput] = useState('')
  const [isCopyMenuOpen, setIsCopyMenuOpen] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [isMapOpen, setIsMapOpen] = useState(false)
  const [mobileMapFilterMode, setMobileMapFilterMode] = useState<'all' | 'studied' | 'unseen' | 'hard'>('all')
  const [isStatsOpen, setIsStatsOpen] = useState(false)
  const [activeStatsTab, setActiveStatsTab] = useState<'performance' | 'goals' | 'leaderboard'>('performance')
  const [dailyComparisonData, setDailyComparisonData] = useState<any[] | null>(null)
  const [dailyComparisonAvg, setDailyComparisonAvg] = useState<any | null>(null)
  const [isDailyComparisonLoading, setIsDailyComparisonLoading] = useState(true)
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false)
  const [isQuitModalOpen, setIsQuitModalOpen] = useState(false)
  const [activeFeedbackTab, setActiveFeedbackTab] = useState<'insight' | 'ai' | 'note' | 'card'>('insight')
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [activeUnlockedBadge, setActiveUnlockedBadge] = useState<any | null>(null)
  const [activeMasteryUpgrade, setActiveMasteryUpgrade] = useState<any | null>(null)
  const [editFormData, setEditFormData] = useState<any>(null)
  const [sessionAnswers, setSessionAnswers] = useState<Record<number, number | number[]>>({})
  const [isEditingPrompt, setIsEditingPrompt] = useState(false)
  const [promptInput, setPromptInput] = useState('')
  
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
    if (urlMode === 'new' || urlMode === 'fsrs') {
      localStorage.setItem('quiz_learning_mode', urlMode);
      return urlMode;
    }
    return localStorage.getItem('quiz_learning_mode') || 'fsrs';
  })
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const activeBottomTab = isMapOpen ? 'map' : (isStatsOpen ? 'stats' : 'flashcard');

  const {
    sfxEnabled,
    setSfxEnabled,
    quickLearnEnabled,
    setQuickLearnEnabled,
    saveGeneralSettings
  } = usePlaySettings(id || '', modeSettings, setModeSettings, activeMode, autoPlayAudio);
  const [learningModeAlert, setLearningModeAlert] = useState<{
    visible: boolean;
    message: string;
    type?: 'info' | 'warning';
  } | null>(null)
  const [justAnswered, setJustAnswered] = useState(false)
  const [availableColumns, setAvailableColumns] = useState<string[]>([])



  const timerRef = useRef<any>(null)
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
  const [leaderboardData, setLeaderboardData] = useState<any>(null)

  const xpLeaderboard = leaderboardData?.xp || { list: [], user_rank: -1, user_value: 0 }
  const userRank = xpLeaderboard.user_rank
  const userValue = xpLeaderboard.user_value
  
  let leaderboardMsg = ""
  if (userRank === 1) {
    leaderboardMsg = "Bạn đang dẫn đầu Bảng xếp hạng! Hãy giữ vững ngôi vương nhé! 👑"
  } else if (userRank > 1) {
    const topUser = xpLeaderboard.list[0]
    const prevUser = xpLeaderboard.list[userRank - 2]
    if (topUser) {
      const xpToTop = topUser.value - userValue
      leaderboardMsg = `Cần thêm ${xpToTop.toLocaleString()} XP nữa để đạt Top 1! 🚀`
    }
    if (prevUser) {
      const xpToPrev = prevUser.value - userValue
      leaderboardMsg += ` Cách Hạng #${userRank - 1} (${prevUser.username}) ${xpToPrev.toLocaleString()} XP! 💪`
    }
  } else {
    leaderboardMsg = "Hãy tích lũy thêm XP để ghi danh lên Bảng xếp hạng tuần này! 🏆"
  }



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
    if (!session || !session.questions || activeMode !== 'fsrs') return 0;
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
  }, [session, activeMode, currentTime, sessionAnswers]);

  const hasRated = activelyRatedCurrentCard || (sessionAnswers[currentIndex] !== undefined && !isCardUnlocked)

  const getMasteryPill = (boxLevel: number) => {
    switch (boxLevel) {
      case 5:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shadow-sm">
            🏆 MASTERED
          </span>
        )
      case 4:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 shadow-sm">
            ⚡ PROFICIENT
          </span>
        )
      case 3:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-600 border border-blue-500/20 shadow-sm">
            📘 FAMILIAR
          </span>
        )
      case 2:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 border border-amber-500/20 shadow-sm">
            🌱 LEARNING
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-slate-500/10 text-slate-600 border border-slate-500/20 shadow-sm">
            ⭐ NEW
          </span>
        )
    }
  }

  const getBadgeIcon = (badgeId: string) => {
    switch (badgeId) {
      case 'first_steps':
        return Play
      case 'streak_starter':
        return Flame
      case 'streak_legend':
        return Trophy
      case 'perfect_score':
        return CheckCircle2
      case 'speed_demon':
        return Clock
      case 'goal_crusher':
        return Target
      case 'card_master':
        return Brain
      default:
        return Award
    }
  }

  const canEdit = user?.role === 'admin' || user?.id === 1 || session?.creator_id === user?.id || session?.is_collaborator


  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const urlMode = searchParams.get('mode');
    if (urlMode === 'new' || urlMode === 'fsrs') {
      saveGeneralSettings({ learning_mode: urlMode });
    }
    fetchSession()
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
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (document.hidden || !document.hasFocus()) return prev
        if (mainTab === 'practice') {
          if (showFeedback) return prev
        } else {
          if (hasRated) return prev
        }
        return prev + 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [showFeedback, hasRated, mainTab])



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
      const quizRes = await axios.get(`/api/v1/deck/${id}/play-data${modeParam}`)
      const questions = quizRes.data.questions || []
      setSession({ ...quizRes.data, questions })

      if (quizRes.data.user_settings) {
        const uSet = quizRes.data.user_settings;
        if (uSet.sfx_enabled !== undefined) {
          setSfxEnabled(uSet.sfx_enabled);
          localStorage.setItem('vocaburn_sfx_enabled', uSet.sfx_enabled ? 'true' : 'false');
        }
        if (uSet.autoplay_audio !== undefined) {
          setAutoPlayAudio(uSet.autoplay_audio);
          localStorage.setItem('vocaburn_autoplay_audio', uSet.autoplay_audio);
        }
        if (uSet.learning_mode !== undefined) {
          const searchParams = new URLSearchParams(window.location.search);
          const urlMode = searchParams.get('mode');
          const finalMode = (urlMode === 'new' || urlMode === 'fsrs') ? urlMode : uSet.learning_mode;
          setActiveMode(finalMode);
          localStorage.setItem('quiz_learning_mode', finalMode);
        }
        if (uSet.quick_learn_enabled !== undefined) {
          setQuickLearnEnabled(uSet.quick_learn_enabled);
          localStorage.setItem('vocaburn_quick_learn_enabled', uSet.quick_learn_enabled ? 'true' : 'false');
        }
      }
      
      const hasLearned = questions.some((q: any) => (q.stats?.total || 0) > 0);
      if (activeTab === 'practice' && practiceRange === 'learned' && !hasLearned) {
        setPracticeRange('all');
        localStorage.setItem('vocab_practice_range', 'all');
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
      setPracticeNeedsSetup(!!quizRes.data.practice_needs_setup)
      setPracticeDisabled(!!quizRes.data.practice_disabled)
      
      if (activeTab === 'practice') {
        fetchPracticeSettings()
        if (currentIndex < 0) setCurrentIndex(0)
      }

      // 2. Non-blocking secondary assets: staggered via timeouts to eliminate server resource contention
      setTimeout(() => {
        axios.get('/api/v1/deck/goals/active', {
          params: { local_date: new Date().toISOString().slice(0, 10) }
        }).then(goalsRes => {
          const activeGoalData = goalsRes.data.find((g: any) => g.quiz_id === Number(id))
          if (activeGoalData) {
            setActiveGoal(activeGoalData)
          }
        }).catch(e => console.error("Failed to load active goals", e))
      }, 1500)

      setTimeout(() => {
        axios.get('/api/v1/stats/leaderboard').then(res => {
          setLeaderboardData(res.data)
        }).catch(e => console.error("Failed to load leaderboard", e))
      }, 2000)

      setTimeout(() => {
        axios.get('/api/v1/stats/daily-comparison').then(res => {
          setDailyComparisonData(res.data?.days || [])
          setDailyComparisonAvg(res.data?.all_time_avg || null)
          setIsDailyComparisonLoading(false)
        }).catch(e => {
          console.error("Failed to load daily comparison", e)
          setIsDailyComparisonLoading(false)
        })
      }, 2500)

      if (!isPractice) {
        setTimeout(() => {
          axios.get(`/api/v1/deck/${id}/session`).then(sessionRes => {
            if (sessionRes.data) {
        const restoredAnswers = sessionRes.data.state?.sessionAnswers || {}
        setSessionAnswers(restoredAnswers)
        const restoredPractice = sessionRes.data.state?.practiceAnswers || {}
        setPracticeAnswers(restoredPractice)
        
        if (sessionRes.data.state?.practiceTotalAnswered !== undefined) {
          setPracticeTotalAnswered(sessionRes.data.state.practiceTotalAnswered)
        }
        if (sessionRes.data.state?.practiceCorrectCount !== undefined) {
          setPracticeCorrectCount(sessionRes.data.state.practiceCorrectCount)
        }
        
        let curIdx = sessionRes.data.current_index || 0
        
        if ((activeTab as string) === 'practice' && practiceRange === 'learned') {
          const learnedIndices = questions.map((q: any, i: number) => (q.stats?.total || 0) > 0 ? i : -1).filter((i: number) => i !== -1);
          if (learnedIndices.length > 0 && !learnedIndices.includes(curIdx)) {
            curIdx = learnedIndices[0];
          }
        }
        
        // Adjust initial index based on smart learning mode if we are starting a fresh/unanswered question
        const initIndex = async () => {
          if (restoredAnswers[curIdx] === undefined) {
            const savedMode = localStorage.getItem('quiz_learning_mode') || 'fsrs'
            const answeredIndexes = Object.keys(restoredAnswers).map(Number)
            try {
              const res = await axios.post(`/api/v1/deck/${id}/next-card`, {
                mode: savedMode,
                answered_indexes: answeredIndexes,
                current_index: curIdx
              })
              curIdx = res.data.next_index
            } catch (err) {
              console.error("Failed to fetch initial next card from backend", err)
            }
          }
          
          setCurrentIndex(curIdx)
          
          // Update local state to reflect which questions are answered in this session
          // but DO NOT manually increment stats, as the backend quiz play-data already includes them.
          const isPractice = (activeTab as string) === 'practice';
          const activeRestored = isPractice ? restoredPractice : restoredAnswers;
          
          if (isPractice) {
            if (activeRestored[curIdx] !== undefined) {
              setSelectedOption(activeRestored[curIdx]);
              setShowFeedback(true);
              if (subMode === 'typing') {
                setTypingFeedback({ checked: true, isCorrect: activeRestored[curIdx] === 3 });
              }
            } else {
              setSelectedOption(null);
              setShowFeedback(false);
              setTypingFeedback(null);
            }
          } else {
            if (typeof activeRestored[curIdx] === 'number') {
              setSelectedOption(activeRestored[curIdx]);
              setShowFeedback(true);
            } else {
              setSelectedOption(null);
              setShowFeedback(false);
            }
          }
        }
        
        initIndex()

        if (sessionRes.data.state?.sessionXP) {
          setSessionXP(sessionRes.data.state.sessionXP)
        }
        if (sessionRes.data.state?.streak) {
          setStreak(sessionRes.data.state.streak)
        }
      } else {
        if (currentIndex < 0) setCurrentIndex(0)
      }
    }).catch(e => {
      console.error("Failed to load session", e)
      if (currentIndex < 0) setCurrentIndex(0)
    })
        }, 1000)
      }
    } catch (e) {
      console.error("Failed to load deck data:", e)
      showLocalToast("Failed to load deck data. Please check your connection.", "error")
      setTimeout(() => {
        navigate('/library')
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
          listening: { active_pairs: [{ q: 'front', a: 'back' }], num_choices: 4 }
        }
        setModeSettings(fallback)
        setSetupPairs([{ q: 'front', a: 'back' }])
        setSetupNumChoices(4)
      }
    } catch (e) {
      console.error("Failed to load practice settings", e)
    }
  }

  const savePracticeSettings = async (customPairs = setupPairs, numChoices = setupNumChoices, isCreator = false) => {
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

  const fetchNote = async () => {
    if (!currentQuestion) return
    try {
      const res = await axios.get(`/api/v1/deck/question/${currentQuestion.id}/note`)
      setPersonalNote(res.data.content || '')
    } catch (e) {
      console.error("Failed to fetch card note:", e)
    }
  }

  const saveNote = async () => {
    if (!currentQuestion) return
    try {
      await axios.post(`/api/v1/deck/question/${currentQuestion.id}/note`, { 
        content: personalNote 
      })
    } catch (e) {
      alert("Failed to save note.")
    }
  }

  const saveSession = async (
    newAnswers: Record<number, any>,
    newIndex: number,
    currentXP: number = sessionXP,
    currentStreak: number = streak,
    newTotalAnswered: number = practiceTotalAnswered,
    newCorrectCount: number = practiceCorrectCount
  ) => {
    try {
      const isPractice = mainTab === 'practice';
      if (isPractice) return; // Completely skip saving to the FSRS session on the server in Practice mode
      await axios.post(`/api/v1/deck/${id}/session`, {
        mode: "sequential",
        current_index: newIndex,
        state: { 
          sessionAnswers: isPractice ? sessionAnswers : newAnswers,
          practiceAnswers: isPractice ? newAnswers : practiceAnswers,
          practiceTotalAnswered: newTotalAnswered,
          practiceCorrectCount: newCorrectCount,
          sessionXP: currentXP,
          streak: currentStreak
        }
      })
    } catch (e) {
      console.error("Failed to save local session state to server:", e)
    }
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
    const timeTaken = timeLeft
    
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
        is_first_ever: isFirstEver
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
          setGoalToast(res.data.goal_update);
          setTimeout(() => setGoalToast(null), 4000);

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

      // Also re-fetch leaderboard in background to keep stats Completely dynamic and live!
      axios.get('/api/v1/stats/leaderboard')
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

        if (masteryUpdate.level_up) {
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
          setShowGoalCelebration(true)
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
        time_spent: timeLeft,
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
        time_spent: timeLeft,
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
        setTimeLeft(0)
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
        setTimeLeft(0)
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
      const nextIdx = getNextPracticeIndex(currentIndex, practiceRange, questions);
      
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
      const res = await axios.post(`/api/v1/deck/${id}/next-card`, {
        mode: activeMode,
        answered_indexes: answeredIndexes,
        current_index: currentIndex
      })
      nextIdx = res.data.next_index
    } catch (err) {
      console.error("Failed to fetch next card from backend", err)
      nextIdx = Math.min(currentIndex + 1, total - 1)
    }

    navigateToQuestion(nextIdx, updatedAnswers)
  }

  const applyLearningMode = async (mode: string) => {
    setActiveMode(mode)
    localStorage.setItem('quiz_learning_mode', mode)
    saveGeneralSettings({ learning_mode: mode })

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
        current_index: currentIndex
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

  const askAI = async (manualText?: string) => {
    if (!currentQuestion) return
    setIsAskingAI(true)
    try {
      const payload: any = { question_id: currentQuestion.id }
      if (typeof manualText === 'string') payload.ai_explanation = manualText
      
      const res = await axios.post(`/api/v1/deck/${id}/ask-ai`, payload)
      
      if (res.data.status === 'processing') {
        // Polling loop
        let attempts = 0
        const maxAttempts = 45 // 90 seconds total (45 * 2) - Gemini can be slow under load
        const poll = setInterval(async () => {
          attempts++
          try {
            // Append cache buster to completely bypass browser and proxy caching
            const quizRes = await axios.get(`/api/v1/deck/${id}/play-data?t=${Date.now()}`)
            const updatedQ = quizRes.data.questions?.find((q: any) => q.id === currentQuestion.id)
            if (updatedQ && updatedQ.ai_explanation) {
              setSession((prev: any) => {
                const newQs = [...prev.questions]
                const targetIdx = newQs.findIndex(q => q.id === updatedQ.id)
                if (targetIdx !== -1) {
                  newQs[targetIdx].ai_explanation = updatedQ.ai_explanation
                }
                return { ...prev, questions: newQs }
              })
              setIsAskingAI(false)
              clearInterval(poll)
            }
          } catch (e) {
            console.error("Error polling play-data for AI explanation:", e)
          }
          
          if (attempts >= maxAttempts) {
            clearInterval(poll)
            setIsAskingAI(false)
          }
        }, 2000)
      } else if (res.data.ai_explanation !== undefined) {
        setSession((prev: any) => {
          const newQs = [...prev.questions]
          newQs[currentIndex].ai_explanation = res.data.ai_explanation
          return { ...prev, questions: newQs }
        })
        if (typeof manualText === 'string') setIsEditingAI(false)
        setIsAskingAI(false)
      }
    } catch (e) {
      console.error("AI explanation generation failed:", e)
      alert("AI service is currently unavailable.")
      setIsAskingAI(false)
    }
  }

  const savePrompt = async () => {
    try {
      await axios.patch(`/api/v1/deck/${id}`, { ai_prompt: promptInput })
      setSession((prev: any) => ({ ...prev, ai_prompt: promptInput }))
      setIsEditingPrompt(false)
      alert("Prompt saved successfully!")
    } catch (e) {
      alert("Failed to save prompt.")
    }
  }

  const clearAIExplanation = async () => {
    if (!currentQuestion) return
    if (!window.confirm("Are you sure you want to delete this AI explanation?")) return
    try {
      await axios.patch(`/api/v1/deck/question/${currentQuestion.id}`, { ai_explanation: null })
      setSession((prev: any) => {
        const newQs = [...prev.questions]
        const targetIdx = newQs.findIndex(q => q.id === currentQuestion.id)
        if (targetIdx !== -1) {
          newQs[targetIdx].ai_explanation = null
        }
        return { ...prev, questions: newQs }
      })
    } catch (e) {
      alert("Failed to delete AI explanation.")
    }
  }

  const getInsightText = () => {
    if (!currentQuestion) return 'No detail.';
    // 1. Prefer others.explain or others.explanation if present
    const othersExplain = currentQuestion.others?.explain || currentQuestion.others?.explanation;
    if (othersExplain) return othersExplain;
    // 2. Try other_content
    if (currentQuestion.others?.other_content && typeof currentQuestion.others.other_content === 'string') {
      return currentQuestion.others.other_content;
    }
    // 3. Fallback to explanation ONLY if it has options (MCQ / Quiz)
    // For flashcards (no options), explanation stores the back of the card, not an extra insight.
    const isFlashcard = !currentQuestion.options || currentQuestion.options.length === 0;
    if (isFlashcard) {
      return 'No detail.';
    }
    return currentQuestion.explanation || 'No detail.';
  }

  const saveInsight = async () => {
    if (!currentQuestion) return
    try {
      const targetKey = currentQuestion.others?.explanation ? 'explanation' : 'explain';
      const updatedOthers = {
        ...(currentQuestion.others || {}),
        [targetKey]: insightInput
      };
      
      await axios.patch(`/api/v1/deck/question/${currentQuestion.id}`, { 
        others: { [targetKey]: insightInput } 
      })
      
      setSession((prev: any) => {
        if (!prev) return prev
        const newQs = [...prev.questions]
        newQs[currentIndex] = {
          ...newQs[currentIndex],
          others: updatedOthers
        }
        return { ...prev, questions: newQs }
      })
      setIsEditingInsight(false)
    } catch (e) {
      alert("Failed to save insight.")
    }
  }

  const openEditModal = () => {
    if (!currentQuestion) return
    
    // Ensure nested 'others' is properly initialized with empty strings if not present
    const others = currentQuestion.others ? { ...currentQuestion.others } : {};
    const defaultOthers = {
      front_img: others.front_img || '',
      back_img: others.back_img || '',
      front_audio_url: others.front_audio_url || '',
      back_audio_url: others.back_audio_url || '',
      front_audio_content: others.front_audio_content || '',
      back_audio_content: others.back_audio_content || '',
      other_content: typeof others.other_content === 'object' 
        ? JSON.stringify(others.other_content, null, 2) 
        : (others.other_content || '')
    };

    setEditFormData({
      id: currentQuestion.id,
      content: currentQuestion.content,
      explanation: currentQuestion.explanation,
      ai_explanation: currentQuestion.ai_explanation,
      image: currentQuestion.image || '',
      audio: currentQuestion.audio || '',
      options: currentQuestion.options.map(o => ({ id: o.id, content: o.content, is_correct: o.is_correct })),
      others: {
        ...others,
        ...defaultOthers
      }
    })
    setIsEditModalOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!currentQuestion || !editFormData) return
    setIsSavingEdit(true)
    
    try {
      // Safely parse other_content JSON if provided
      let finalOthers = { ...editFormData.others };
      if (finalOthers.other_content) {
        try {
          // If valid JSON, parse it for database storage
          finalOthers.other_content = JSON.parse(finalOthers.other_content);
        } catch (je) {
          console.warn("other_content is not JSON, saving as raw string:", je)
        }
      }

      const payload = {
        content: editFormData.content,
        explanation: editFormData.explanation,
        ai_explanation: editFormData.ai_explanation,
        image: editFormData.image || null,
        audio: editFormData.audio || null,
        others: finalOthers,
        options: editFormData.options
      };

      await axios.patch(`/api/v1/deck/question/${currentQuestion.id}`, payload)
      
      // Update local state
      setSession((prev: any) => {
        const newQs = [...prev.questions]
        newQs[currentIndex] = { 
          ...newQs[currentIndex], 
          ...payload,
          options: editFormData.options 
        }
        return { ...prev, questions: newQs }
      })
      
      setIsEditModalOpen(false)
    } catch (e) {
      console.error("Failed to save edited question:", e)
      alert("Failed to save changes.")
    } finally {
      setIsSavingEdit(false)
    }
  }

  const copyCurrentTabContent = (type: 'default' | 'prompt' | 'question' = 'default') => {
    let content = ''
    if (activeFeedbackTab === 'insight') content = getInsightText()
    else if (activeFeedbackTab === 'ai') {
      if (type === 'question') {
        content = currentQuestion?.content || ''
      } else if (type === 'prompt' && session.ai_prompt) {
        const optionsText = currentQuestion?.options.map((opt, i) => `${String.fromCharCode(65 + i)}. ${opt.content}`).join('\n')
        const correctOpt = currentQuestion?.options.find(o => o.is_correct)
        const correctAnswerText = correctOpt ? `${String.fromCharCode(65 + (currentQuestion?.options?.indexOf(correctOpt) ?? 0))}. ${correctOpt.content}` : 'Unknown'
        
        content = session.ai_prompt
          .replace(/{{question}}/g, currentQuestion?.content || '')
          .replace(/{{options}}/g, optionsText)
          .replace(/{{correct_answer}}/g, correctAnswerText)
          .replace(/{{global_instruction}}/g, session.instruction || '')
          .replace(/{{quiz_title}}/g, session.title || '')
          .replace(/{{quiz_description}}/g, session.description || '')
          .replace(/{{option_a}}/g, currentQuestion?.options[0]?.content || '')
          .replace(/{{option_b}}/g, currentQuestion?.options[1]?.content || '')
          .replace(/{{option_c}}/g, currentQuestion?.options[2]?.content || '')
          .replace(/{{option_d}}/g, currentQuestion?.options[3]?.content || '')
      } else {
        content = currentQuestion?.ai_explanation || ''
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
    if (activeFeedbackTab === 'insight') {
      if (isEditingInsight) saveInsight()
      else {
        setInsightInput(getInsightText() === 'No detail.' ? '' : getInsightText())
        setIsEditingInsight(true)
      }
    } else if (activeFeedbackTab === 'ai') {
      if (isEditingAI) askAI(aiInput)
      else {
        setAiInput(currentQuestion?.ai_explanation || '')
        setIsEditingAI(true)
      }
    } else if (activeFeedbackTab === 'note') {
      if (isEditingNote) saveNote()
      setIsEditingNote(!isEditingNote)
    }
  }

  const copyQuestionToClipboard = () => {
    if (!currentQuestion) return
    const text = `Question: ${currentQuestion.content}\n` + 
                 currentQuestion.options.map((opt, i) => `${String.fromCharCode(65 + i)}: ${opt.content}`).join('\n')
    navigator.clipboard.writeText(text)
    alert("Copied to clipboard!")
  }

  const renderFeedbackArea = (isMobile = false) => {
    if (!showFeedback) return null
    
    const tabs = [
      { id: 'insight', label: 'INSIGHT', icon: Lightbulb, color: 'text-amber-500', bg: 'bg-amber-100', hasContent: !!getInsightText() && getInsightText() !== 'No detail.' },
      { id: 'ai', label: 'AI ANALYSIS', icon: Sparkles, color: 'text-indigo-600', bg: 'bg-indigo-100', hasContent: !!currentQuestion?.ai_explanation },
      { id: 'note', label: 'PERSONAL NOTE', icon: StickyNote, color: 'text-slate-400', bg: 'bg-slate-100', hasContent: !!personalNote }
    ]

    const renderTabContent = () => {
      switch (activeFeedbackTab) {
        case 'insight':
          return (
            <div className="p-6 rounded-[2rem] bg-indigo-50/30 border border-indigo-100 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                 <div className="flex items-center gap-2 mb-3">
                   <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center">
                      <Lightbulb className="w-3.5 h-3.5 fill-amber-500" />
                   </div>
                   <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">INSIGHT</span>
                 </div>
                 <div className="text-slate-600 font-medium text-sm leading-relaxed markdown-content whitespace-pre-wrap break-words pr-2">
                    {isEditingInsight ? (
                      <textarea
                        value={insightInput}
                        onChange={(e) => setInsightInput(e.target.value)}
                        className="w-full h-80 p-3 bg-white border border-indigo-100 rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                        placeholder="Enter explanation for this question..."
                      />
                    ) : (
                      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={MarkdownComponents}>
                        {parseBBCodeToHtml(getInsightText())}
                      </ReactMarkdown>
                    )}
                 </div>
            </div>
          )
        case 'ai':
          return (
            <div className="p-6 rounded-[2rem] ai-glow animate-in fade-in slide-in-from-bottom-2">
               <div className="flex items-center justify-between mb-3">
                 <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
                    <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">AI ANALYSIS</span>
                    {canEdit && currentQuestion?.ai_explanation && !isEditingAI && !isEditingPrompt && (
                      <button 
                        onClick={clearAIExplanation}
                        className="text-[9px] font-black text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-md border border-rose-200 shadow-sm transition-all ml-2"
                      >
                        CLEAR AI
                      </button>
                    )}
                 </div>
                 <div className="flex gap-2">
                   {canEdit && (
                     <button 
                       onClick={() => setIsEditingPrompt(!isEditingPrompt)}
                       className={cn(
                         "text-[9px] font-black uppercase tracking-widest transition-all px-2.5 py-1.5 rounded-md",
                         isEditingPrompt ? "bg-amber-600 text-white shadow-sm" : "text-amber-500 hover:text-amber-600 hover:bg-white"
                       )}
                     >
                       {isEditingPrompt ? 'CLOSE PROMPT' : 'PROMPT'}
                     </button>
                   )}
                   {!currentQuestion?.ai_explanation && !isEditingAI && !isEditingPrompt && (
                     <button 
                       onClick={() => askAI()}
                       disabled={isAskingAI}
                       className="text-[9px] font-black text-indigo-600 bg-white px-3 py-1.5 rounded-lg border border-indigo-100 shadow-sm hover:bg-indigo-50 transition-all disabled:opacity-50"
                     >
                       {isAskingAI ? 'ANALYZING...' : 'ASK AI INSIGHT'}
                     </button>
                   )}
                   {canEdit && !isEditingPrompt && (
                     <button 
                       onClick={() => {
                         if (isEditingAI) {
                           askAI(aiInput)
                         } else {
                           setAiInput(currentQuestion?.ai_explanation || '')
                           setIsEditingAI(true)
                         }
                       }}
                       disabled={isAskingAI}
                       className={cn(
                         "text-[9px] font-black uppercase tracking-widest transition-all px-2.5 py-1.5 rounded-md",
                         isEditingAI ? "bg-indigo-600 text-white shadow-sm" : "text-indigo-400 hover:text-indigo-600 hover:bg-white"
                       )}
                     >
                       {isAskingAI ? 'SAVING...' : (isEditingAI ? 'SAVE AI' : 'EDIT')}
                     </button>
                   )}
                 </div>
               </div>
               
               {isEditingPrompt ? (
                 <div className="space-y-3 mt-2 bg-amber-50/50 border border-amber-100 rounded-2xl p-4">
                   <div className="flex items-center justify-between">
                     <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider">EDIT SYSTEM PROMPT FOR AI</span>
                     <button 
                       onClick={savePrompt}
                       className="text-[9px] font-black bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg shadow-sm transition-all"
                     >
                       SAVE PROMPT
                     </button>
                   </div>
                   <textarea 
                     value={promptInput}
                     onChange={(e) => setPromptInput(e.target.value)}
                     placeholder="Enter System Prompt to guide the AI..."
                     className="w-full h-80 bg-white rounded-xl p-4 text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-amber-500 outline-none border border-amber-200 resize-none transition-all"
                   />
                   <p className="text-[9px] font-medium text-amber-600/80 italic leading-relaxed">
                     * Guide: Use variables <code>{"{{question}}"}</code>, <code>{"{{options}}"}</code>, <code>{"{{correct_answer}}"}</code> to insert dynamic data. The new prompt will be applied to all subsequently regenerated questions.
                   </p>
                 </div>
               ) : isEditingAI ? (
                 <div className="space-y-2 mt-2">
                   <textarea 
                     value={aiInput}
                     onChange={(e) => setAiInput(e.target.value)}
                     placeholder="Enter AI Analysis content manually..."
                     className="w-full h-80 bg-white/50 rounded-xl p-4 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none border-none resize-none transition-all"
                     autoFocus
                   />
                   <p className="text-[8px] font-medium text-slate-400 italic">Click 'SAVE AI' to save changes for everyone.</p>
                 </div>
               ) : (
                  isAskingAI ? (
                    <div className="flex flex-col items-center justify-center py-16 space-y-4 animate-pulse">
                      <div className="relative w-12 h-12 flex items-center justify-center">
                        <div className="absolute inset-0 rounded-full border-4 border-indigo-100 animate-ping" />
                        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                        <Sparkles className="w-4 h-4 text-indigo-500 absolute animate-pulse" />
                      </div>
                      <p className="text-xs font-black text-indigo-500 uppercase tracking-[0.2em] text-center animate-bounce">
                        AI DEEP ANALYSIS IN PROGRESS...
                      </p>
                      <p className="text-[10px] font-semibold text-slate-400 max-w-xs text-center leading-relaxed">
                        Please wait a moment, the AI is deeply analyzing the grammar and vocabulary of this question.
                      </p>
                    </div>
                  ) : (
                    currentQuestion?.ai_explanation && (
                      <div className="text-slate-700 font-medium text-sm leading-relaxed markdown-content break-words pr-2 mt-2">
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]} 
                          rehypePlugins={[rehypeRaw]} 
                          components={{
                            ...MarkdownComponents,
                            p: ({ children }) => <span className="inline-block">{children}</span>
                          }}
                        >
                          {parseBBCodeToHtml(currentQuestion.ai_explanation)}
                        </ReactMarkdown>
                      </div>
                    )
                  )
               )}
            </div>
          )
        case 'note':
          return (
            <div className="p-6 rounded-[2rem] bg-white border border-slate-100 shadow-sm animate-in fade-in slide-in-from-bottom-2">
               <div className="flex items-center justify-between mb-4">
                 <div className="flex items-center gap-2">
                    <StickyNote className="w-4 h-4 text-slate-400" />
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">PERSONAL NOTE</span>
                 </div>
                 <button 
                   onClick={() => {
                     if (isEditingNote) {
                       saveNote()
                     }
                     setIsEditingNote(!isEditingNote)
                   }}
                   className={cn(
                     "text-[9px] font-black uppercase tracking-widest transition-all px-2.5 py-1 rounded-md",
                     isEditingNote ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-indigo-600 hover:bg-slate-50"
                   )}
                 >
                   {isEditingNote ? 'SAVE & CLOSE' : 'EDIT'}
                 </button>
               </div>
               
               {!isEditingNote ? (
                 <div className="text-slate-600 font-medium text-sm leading-relaxed markdown-content min-h-[100px] break-words pr-2">
                   <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={MarkdownComponents}>
                     {personalNote || '*Empty note.*'}
                   </ReactMarkdown>
                 </div>
               ) : (
                 <div className="space-y-2">
                   <textarea 
                     value={personalNote}
                     onChange={(e) => setPersonalNote(e.target.value)}
                     placeholder="Write your study notes here... (Supports Markdown)"
                     className="w-full h-80 bg-slate-50 rounded-xl p-4 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none border-none resize-none transition-all"
                     autoFocus
                   />
                   <p className="text-[8px] font-medium text-slate-300 italic">Supports Markdown syntax. Click 'SAVE & CLOSE' to complete.</p>
                 </div>
               )}
            </div>
          )
      }
    }

    return (
      <div className="flex flex-col h-full bg-[#F8FAFC]">
         {!isMobile && (
           <div className="p-6 border-b border-slate-50 flex items-center justify-center bg-white sticky top-0 z-10">
              <span className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.3em]">Learning Insights</span>
           </div>
         )}
         
         <div className="flex-1 overflow-y-auto p-4 lg:p-8 custom-scrollbar">
            {renderTabContent()}
         </div>
         
         <div className={cn(
             "flex items-center justify-between gap-1.5 sm:gap-3 py-4 border-t border-slate-100 bg-white/95 backdrop-blur-xl sticky bottom-0 z-50 px-2 sm:px-6"
          )}>
             {isMobile && (
               <button 
                 onClick={() => setIsFeedbackOpen(false)}
                 className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-slate-50 border border-slate-200 text-slate-500 rounded-xl hover:bg-rose-50 hover:border-rose-100 hover:text-rose-500 active:scale-90 transition-all shadow-sm"
               >
                 <X className="w-4 h-4" />
               </button>
             )}

             <button 
               onClick={handleEditCurrentTab}
               className={cn(
                 "w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 flex items-center justify-center rounded-xl sm:rounded-2xl border transition-all duration-300 active:scale-90",
                 ((activeFeedbackTab === 'ai' && isEditingAI) || (activeFeedbackTab === 'note' && isEditingNote) || (activeFeedbackTab === 'insight' && isEditingInsight))
                   ? "bg-gradient-to-r from-emerald-500 to-teal-600 border-transparent text-white shadow-lg shadow-emerald-100 scale-105"
                   : "bg-slate-50 border-slate-200/80 text-slate-500 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 shadow-sm"
               )}
             >
               {((activeFeedbackTab === 'ai' && isEditingAI) || (activeFeedbackTab === 'note' && isEditingNote) || (activeFeedbackTab === 'insight' && isEditingInsight)) ? (
                 <Check className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3] animate-pulse" />
               ) : (
                 <Edit3 className="w-4 h-4 sm:w-5 sm:h-5" />
               )}
             </button>

             <div className="flex items-center bg-slate-50 p-0.5 sm:p-1 rounded-xl sm:rounded-2xl h-11 sm:h-14 border border-slate-200/60 shadow-inner gap-0.5 sm:gap-1">
               {tabs.map((tab: any) => {
                 const isActive = activeFeedbackTab === tab.id
                 return (
                   <button
                     key={tab.id}
                     onClick={() => setActiveFeedbackTab(tab.id)}
                     className={cn(
                       "w-9 sm:w-12 h-9 sm:h-11 flex items-center justify-center rounded-lg sm:rounded-xl transition-all duration-300 relative",
                       isActive 
                         ? (
                             tab.id === 'insight' ? "text-amber-500 bg-white shadow-md border border-amber-100/60 scale-105" :
                             tab.id === 'ai' ? "text-indigo-600 bg-white shadow-md border border-indigo-100/60 scale-105" :
                             "text-emerald-600 bg-white shadow-md border border-emerald-100/60 scale-105"
                           )
                         : "text-slate-400 hover:text-slate-600 hover:bg-white/40"
                     )}
                   >
                     <div className="relative">
                       <tab.icon className={cn("w-4.5 h-4.5 sm:w-5 sm:h-5 transition-transform duration-300", isActive && "scale-110")} />
                       {tab.hasContent && (
                         <span className={cn(
                           "absolute -top-1 -right-1 w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full border border-white animate-pulse",
                           tab.id === 'insight' ? "bg-amber-500" :
                           tab.id === 'ai' ? "bg-indigo-600" :
                           "bg-emerald-500"
                         )} />
                       )}
                     </div>
                   </button>
                 )
               })}
             </div>

             <div className="relative">
               <AnimatePresence>
                 {isCopyMenuOpen && activeFeedbackTab === 'ai' && (
                   <motion.div 
                     initial={{ opacity: 0, y: 10, scale: 0.9 }}
                     animate={{ opacity: 1, y: 0, scale: 1 }}
                     exit={{ opacity: 0, y: 10, scale: 0.9 }}
                     className="absolute bottom-16 right-0 w-56 bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_10px_30px_rgba(99,102,241,0.12)] border border-slate-100/80 p-2 flex flex-col gap-1 z-[100] animate-in fade-in slide-in-from-bottom-2 duration-200"
                   >
                     <button 
                       onClick={() => copyCurrentTabContent('default')}
                       className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 hover:text-slate-800 rounded-xl transition-all text-left"
                     >
                       <FileText className="w-4 h-4 text-slate-400" />
                       <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Copy Result</span>
                     </button>
                     <button 
                       onClick={() => copyCurrentTabContent('question')}
                       className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 hover:text-slate-800 rounded-xl transition-all text-left"
                     >
                       <HelpCircle className="w-4 h-4 text-slate-400" />
                       <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Copy Question</span>
                     </button>
                     <button 
                       onClick={() => copyCurrentTabContent('prompt')}
                       className="flex items-center gap-3 px-4 py-3 hover:bg-indigo-50/60 hover:text-indigo-600 rounded-xl transition-all text-left"
                     >
                       <Brain className="w-4 h-4 text-indigo-400" />
                       <span className="text-[11px] font-black text-indigo-500 uppercase tracking-wider">Copy Prompt</span>
                     </button>
                   </motion.div>
                 )}
               </AnimatePresence>

               <button 
                 onClick={() => {
                   if (activeFeedbackTab === 'ai') setIsCopyMenuOpen(!isCopyMenuOpen)
                   else copyCurrentTabContent()
                 }}
                 className={cn(
                   "w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 flex items-center justify-center rounded-xl sm:rounded-2xl border transition-all duration-300 active:scale-90 shadow-sm",
                   isCopied 
                     ? "bg-gradient-to-r from-emerald-500 to-teal-600 border-transparent text-white shadow-lg shadow-emerald-100 scale-105" 
                     : "bg-slate-50 border-slate-200/80 text-slate-500 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600"
                 )}
               >
                 {isCopied ? <Check className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3]" /> : <Copy className="w-4 h-4 sm:w-5 sm:h-5" />}
               </button>
             </div>

             {isMobile && (
               <button 
                 onClick={() => {
                   handleNext()
                   setIsFeedbackOpen(false)
                 }}
                 className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-200/60 active:scale-90 hover:scale-105 hover:rotate-3 transition-all"
               >
                 <ChevronRight className="w-5 h-5" />
               </button>
             )}
          </div>
      </div>
    )
  }

  const renderPracticeLockScreen = () => {
    return (
      <div className="flex-1 bg-white/60 backdrop-blur-xl md:rounded-[3rem] rounded-[2rem] border border-slate-100 md:p-12 p-6 flex flex-col items-center justify-center text-center shadow-2xl shadow-indigo-100/40 min-h-[400px]">
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
      <div className="flex-1 bg-white md:rounded-[3rem] rounded-[2rem] border border-slate-100 md:p-8 p-6 flex flex-col justify-between shadow-2xl shadow-indigo-100/40 min-h-0 overflow-y-auto">
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
        <div className="flex-1 bg-white md:rounded-[3rem] rounded-[2rem] border border-slate-100 flex items-center justify-center font-bold text-slate-400">
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
      <div className="flex-1 bg-white md:rounded-[3rem] rounded-[2rem] border border-slate-100 md:p-8 p-6 flex flex-col justify-between shadow-2xl shadow-indigo-100/40 min-h-0 overflow-y-auto">
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
          {currentQuestion.image && practiceSubMode !== 'listening' && (
            <img 
              src={currentQuestion.image} 
              alt="Question" 
              className="max-h-36 object-contain rounded-2xl mb-4 border border-slate-100 shadow-sm" 
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
    const isPractice = mainTab === 'practice';
    
    if (isPractice) {
      const answeredCount = Object.keys(practiceAnswers).length;
      const correctCount = Object.entries(practiceAnswers).filter(([idx, ansIdx]) => {
        const q = session?.questions?.[Number(idx)];
        if (!q || !q.practice) return false;
        if (practiceSubMode === 'typing') {
          return ansIdx === 3;
        }
        return ansIdx === q.practice.correct_index;
      }).length;
      const wrongCount = answeredCount - correctCount;
      const accuracy = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;

      return (
        <div className="bg-slate-50/80 rounded-[1.5rem] p-4 mb-4 border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">PRACTICE SUMMARY</span>
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-600 rounded-full text-white">
              <Target className="w-2.5 h-2.5" />
              <span className="text-[9px] font-black">ACCURACY: {accuracy}%</span>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-white rounded-2xl shadow-sm border border-slate-100/50 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                <BookOpen className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">QUESTIONS DONE</span>
            </div>
            <span className="text-lg font-black text-slate-700">{answeredCount}</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col items-center p-2.5 bg-emerald-50 rounded-xl border border-emerald-100/40">
              <span className="text-[14px] font-black text-emerald-600">{correctCount}</span>
              <span className="text-[8px] font-black text-emerald-400 uppercase tracking-wider">CORRECT</span>
            </div>
            <div className="flex flex-col items-center p-2.5 bg-rose-50 rounded-xl border border-rose-100/40">
              <span className="text-[14px] font-black text-rose-600">{wrongCount}</span>
              <span className="text-[8px] font-black text-rose-400 uppercase tracking-wider">WRONG</span>
            </div>
          </div>
        </div>
      );
    }

    const answeredCount = Object.keys(sessionAnswers).length
    const finalRatings = Object.values(sessionAnswers).map(val => Array.isArray(val) ? val[val.length - 1] : val)
    const againCount = finalRatings.filter(val => val === 0).length
    const hardCount = finalRatings.filter(val => val === 1).length
    const goodCount = finalRatings.filter(val => val === 2).length
    const easyCount = finalRatings.filter(val => val === 3).length
    
    const correctCount = hardCount + goodCount + easyCount
    const accuracy = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0

    return (
      <div className="bg-slate-50/80 rounded-[1.5rem] p-4 mb-4 border border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">SESSION SUMMARY</span>
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-600 rounded-full text-white">
            <Target className="w-2.5 h-2.5" />
            <span className="text-[9px] font-black">RETENTION: {accuracy}%</span>
          </div>
        </div>

        {/* Total Reviewed */}
        <div className="flex items-center justify-between p-3 bg-white rounded-2xl shadow-sm border border-slate-100/50 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <BookOpen className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">CARDS REVIEWED</span>
          </div>
          <span className="text-lg font-black text-slate-700">{answeredCount}</span>
        </div>

        {/* 4 FSRS Stats Grid */}
        <div className="grid grid-cols-4 gap-1.5">
          <div className="flex flex-col items-center p-2 bg-rose-50 rounded-xl border border-rose-100/40">
            <span className="text-[13px] font-black text-rose-600">{againCount}</span>
            <span className="text-[7px] font-black text-rose-400 uppercase tracking-wider">AGAIN</span>
          </div>
          <div className="flex flex-col items-center p-2 bg-amber-50 rounded-xl border border-amber-100/40">
            <span className="text-[13px] font-black text-amber-600">{hardCount}</span>
            <span className="text-[7px] font-black text-amber-400 uppercase tracking-wider">HARD</span>
          </div>
          <div className="flex flex-col items-center p-2 bg-indigo-50 rounded-xl border border-indigo-100/40">
            <span className="text-[13px] font-black text-indigo-600">{goodCount}</span>
            <span className="text-[7px] font-black text-indigo-400 uppercase tracking-wider">GOOD</span>
          </div>
          <div className="flex flex-col items-center p-2 bg-emerald-50 rounded-xl border border-emerald-100/40">
            <span className="text-[13px] font-black text-emerald-600">{easyCount}</span>
            <span className="text-[7px] font-black text-emerald-400 uppercase tracking-wider">EASY</span>
          </div>
        </div>
      </div>
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
    setShowFeedback
  });

  if (!session || currentIndex < 0) return <div className="min-h-screen flex items-center justify-center font-black animate-pulse">LOADING SESSION...</div>

  return (
    <div className="h-screen h-[100dvh] flex flex-col bg-gradient-to-br from-slate-50 via-indigo-50/20 to-slate-50 text-slate-900 font-sans overflow-hidden relative">
      {/* Animated Feedback Badge (Floating Toast at bottom) */}
      <AnimatePresence>
        {badgeVisible && selectedOption !== null && currentQuestion && (() => {
          const isCorrect = currentQuestion.options && currentQuestion.options.length > 0
            ? currentQuestion.options[selectedOption]?.is_correct
            : selectedOption > 0;
          return (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={cn(
                "fixed bottom-[136px] left-1/2 -translate-x-1/2 z-[1000] px-6 py-3 rounded-2xl font-black text-[12px] uppercase tracking-[0.1em] shadow-xl flex items-center gap-3 backdrop-blur-md border whitespace-nowrap",
                isCorrect 
                  ? "bg-emerald-500/90 text-white border-emerald-400/30 shadow-emerald-200/20" 
                  : "bg-amber-400/90 text-slate-800 border-amber-300/30 shadow-amber-200/20"
              )}
            >
              {isCorrect ? (
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                  <Check className="w-3 h-3 text-white stroke-[4]" />
                </div>
              ) : (
                <div className="w-5 h-5 rounded-full bg-white/60 flex items-center justify-center">
                  <Sparkles className="w-3 h-3 text-amber-700" />
                </div>
              )}
              {badgeMessage}
            </motion.div>
          );
        })()}
      </AnimatePresence>
      {/* XP Float Animation */}
      <AnimatePresence>
        {xpFloat.visible && (() => {
          const isLimitless = (activeGoal && activeGoal.done_today > activeGoal.daily_target) || (goalToast && goalToast.doneToday > goalToast.dailyTarget);
          return (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.5 }}
              animate={{ opacity: 1, y: -120, scale: isLimitless ? 1.4 : 1.2 }}
              exit={{ opacity: 0, y: -180, scale: 0.8 }}
              className={cn(
                "fixed bottom-32 md:bottom-auto md:top-[35%] left-1/2 -translate-x-1/2 z-[1001] px-6 py-3 rounded-2xl font-black text-base shadow-2xl pointer-events-none transition-all duration-300",
                isLimitless 
                  ? "bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white shadow-amber-500/50 border border-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.6)] animate-bounce" 
                  : "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-indigo-300/50"
              )}
            >
              {isLimitless ? "⚡ OVERDRIVE +" : "+"}
              {xpFloat.amount} XP ✨
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Goal Milestone Toast */}
      <AnimatePresence>
        {goalToast && goalToast.visible && (() => {
          const isLimitless = goalToast.doneToday > goalToast.dailyTarget
          return (
            <motion.div
              initial={{ opacity: 0, x: 200, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 200, scale: 0.9 }}
              className={cn(
                "fixed top-24 right-6 z-[1002] max-w-sm w-82 backdrop-blur-xl rounded-[2rem] p-5 flex items-center gap-4 border transition-all duration-300",
                isLimitless 
                  ? "bg-slate-950/95 border-amber-500/60 shadow-[0_0_40px_rgba(245,158,11,0.35),inset_0_1px_1px_rgba(255,255,255,0.15)] text-white" 
                  : "bg-white/95 border-slate-100 shadow-[0_20px_50px_rgba(99,102,241,0.15)] text-slate-900"
              )}
            >
              {/* Circular Progress Ring or Flame Icon */}
              <div className="relative w-14 h-14 flex-shrink-0 flex items-center justify-center">
                {goalToast.justCompleted ? (
                  <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-400 to-red-500 flex items-center justify-center shadow-lg shadow-orange-100 animate-bounce">
                    <Flame className="w-6 h-6 text-white fill-white" />
                  </div>
                ) : (
                  <>
                    <svg className="w-14 h-14 transform -rotate-90">
                      <circle
                        cx="28"
                        cy="28"
                        r="22"
                        className={isLimitless ? "stroke-slate-900" : "stroke-slate-100"}
                        strokeWidth="3.5"
                        fill="transparent"
                      />
                      <circle
                        cx="28"
                        cy="28"
                        r="22"
                        className={cn(
                          "transition-all duration-1000 ease-out",
                          isLimitless ? "stroke-amber-400 animate-pulse drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]" : (goalToast.isTargetMet ? "stroke-emerald-500" : "stroke-indigo-600")
                        )}
                        strokeWidth="3.5"
                        fill="transparent"
                        strokeDasharray={2 * Math.PI * 22}
                        strokeDashoffset={2 * Math.PI * 22 * (1 - Math.min(1, goalToast.doneToday / goalToast.dailyTarget))}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className={cn(
                      "absolute text-[10px] font-black",
                      isLimitless ? "text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.8)] animate-pulse" : "text-slate-700"
                    )}>
                      {isLimitless ? `⚡${goalToast.doneToday}` : `${goalToast.doneToday}/${goalToast.dailyTarget}`}
                    </span>
                  </>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={cn(
                    "text-[8px] font-black tracking-widest uppercase px-2 py-0.5 rounded-md",
                    goalToast.justCompleted ? "bg-amber-100 text-amber-700" : 
                    isLimitless ? "bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white animate-pulse border border-amber-400/35 shadow-lg shadow-amber-500/25 tracking-wider" :
                    "bg-indigo-50 text-indigo-600"
                  )}>
                    {goalToast.justCompleted ? "GOAL REACHED" : isLimitless ? "LIMITLESS MODE ⚡" : "DAILY GOAL"}
                  </span>
                  {goalToast.streakCount > 0 && (
                    <span className={cn(
                      "flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-md",
                      isLimitless ? "bg-amber-950 text-amber-300 border border-amber-500/20" : "bg-orange-50 text-orange-600"
                    )}>
                      🔥 {goalToast.streakCount}d
                    </span>
                  )}
                </div>
                <p className={cn(
                  "font-bold text-xs leading-relaxed pr-2",
                  isLimitless ? "text-amber-200 drop-shadow-[0_0_2px_rgba(245,158,11,0.2)]" : "text-slate-600"
                )}>
                  {goalToast.message}
                </p>
              </div>

              <button
                onClick={() => setGoalToast(prev => prev ? { ...prev, visible: false } : null)}
                className={cn(
                  "absolute top-4 right-4 w-6 h-6 flex items-center justify-center rounded-full transition-all",
                  isLimitless ? "hover:bg-slate-800 text-slate-500 hover:text-slate-300" : "hover:bg-slate-50 text-slate-400 hover:text-slate-600"
                )}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )
        })()}
      </AnimatePresence>

      {/* Learning Mode Alert Toast */}
      <AnimatePresence>
        {learningModeAlert && learningModeAlert.visible && (
          <motion.div
            initial={{ opacity: 0, x: 200, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 200, scale: 0.9 }}
            className="fixed top-24 right-6 z-[1002] max-w-sm w-82 bg-white/95 backdrop-blur-xl border border-slate-100 shadow-[0_20px_50px_rgba(99,102,241,0.15)] rounded-[2rem] p-5 flex items-start gap-4 text-slate-900 transition-all duration-300"
          >
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[8px] font-black tracking-widest uppercase px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600">
                  SMART LEARNING
                </span>
              </div>
              <p className="font-bold text-xs leading-relaxed pr-2 text-slate-600">
                {learningModeAlert.message}
              </p>
            </div>

            <button
              onClick={() => setLearningModeAlert(prev => prev ? { ...prev, visible: false } : null)}
              className="absolute top-4 right-4 w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-all"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="sticky top-0 flex-shrink-0 z-[120] bg-white/90 backdrop-blur-2xl border-b border-slate-100/80 px-4 py-2.5 flex items-center justify-between shadow-[0_1px_20px_rgba(99,102,241,0.06)]">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="w-9 h-9 flex items-center justify-center bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600 shadow-sm hover:bg-indigo-100 active:scale-90 transition-all">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex flex-col">
            <h1 className="text-[11px] font-black text-slate-700 truncate max-w-[200px] md:max-w-md leading-tight">{session.title}</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[11px] font-black text-indigo-600">{gamify.xp} XP</span>
              {streak >= 2 && (
                <div className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-white text-[8px] font-black shadow-sm shadow-orange-200">
                  <Flame className="w-3 h-3 fill-white" />
                  <span>{streak}🔥</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex flex-col gap-0.5 items-end">
            <div className={cn(
              "flex items-center gap-0.5 px-1.5 py-0.5 rounded text-white shadow-sm text-[8px] font-black transition-all",
              !showFeedback ? "bg-gradient-to-r from-slate-800 to-slate-900 shadow-slate-300" : "bg-gradient-to-r from-emerald-500 to-teal-500 shadow-emerald-200"
            )}>
              <Timer className={cn("w-2.5 h-2.5", !showFeedback && "animate-pulse")} />
              <span>{timeLeft}s</span>
            </div>

            {activeMode === 'fsrs' && dueCardsCount > 0 && (
              <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-500 text-white shadow-sm shadow-amber-200 text-[8px] font-black" title="Số thẻ ôn tập còn lại">
                <Brain className="w-2.5 h-2.5 animate-pulse" />
                <span>{dueCardsCount}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Decoupled - Practice mode moved to standalone /practice/:id page */}

      <main className="flex-1 flex w-full max-w-none justify-center gap-4 lg:gap-8 px-2 lg:px-6 xl:px-10 md:py-6 py-2 overflow-hidden">
        <aside className="hidden xl:flex w-[340px] 2xl:w-[440px] flex-shrink-0 flex-col overflow-hidden bg-white border border-slate-100 rounded-[2.5rem] shadow-sm">
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
                {/* 1. Daily Goal Card */}
                {activeMode !== 'review' && (
                  <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                        <Target className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-700">Deck Goal</h4>
                        <p className="text-[10px] text-slate-400 font-medium">Daily Practice</p>
                      </div>
                    </div>

                    {activeGoal ? (
                      <div className="space-y-3">
                        <div className="flex justify-between items-end">
                          <span className="text-2xl font-black text-slate-800">
                            {activeGoal.done_today} <span className="text-xs text-slate-400 font-bold">/ {activeGoal.daily_target} cards</span>
                          </span>
                          <span className="text-xs font-black text-indigo-600">
                            {Math.round((activeGoal.done_today / activeGoal.daily_target) * 100)}%
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.round((activeGoal.done_today / activeGoal.daily_target) * 100))}%` }}
                          />
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                          {activeGoal.is_target_met 
                            ? "🎉 Awesome! You've met your daily goal. Keep pushing your limits!"
                            : `🎯 You need to study ${activeGoal.daily_target - activeGoal.done_today} more new cards to complete your daily goal!`
                          }
                        </p>
                      </div>
                    ) : (
                      <div className="py-1">
                        <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                          You haven't set a daily goal for this deck yet. Set a goal on the home page to maintain your daily habit! 💡
                        </p>
                      </div>
                    )}
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
                      <h4 className="text-xs font-black text-slate-700">Bảng xếp hạng tuần</h4>
                      <p className="text-[10px] text-slate-400 font-medium">Đua top XP tuần này</p>
                    </div>
                  </div>

                  {/* Mini Leaderboard List */}
                  {xpLeaderboard.list && xpLeaderboard.list.length > 0 ? (
                    <div className="space-y-1.5 py-1">
                      {xpLeaderboard.list.slice(0, 3).map((u: any, idx: number) => {
                        const displayValue = u.user_id === user?.id ? gamify.xp : u.value;
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
                            {displayValue.toLocaleString()} XP
                          </span>
                        </div>
                      )})}
                      
                      {/* Show user if they are not in Top 3 */}
                      {userRank > 3 && (() => {
                        const currentUserObj = xpLeaderboard.list.find((u: any) => u.user_id === user?.id) || {
                          full_name: user?.username || "",
                          level: gamify.level,
                          value: gamify.xp
                        };
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
                                {gamify.xp.toLocaleString()} XP
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
                            return q.options && q.options.length > 0
                              ? q.options[ratingVal]?.is_correct
                              : ratingVal > 1; // 1 (Again) is Wrong, 2/3/4 are Correct
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
                          Object.keys(sessionAnswers).length - Object.entries(sessionAnswers).filter(([idx, optIdx]) => {
                            const q = session.questions[Number(idx)];
                            if (!q) return false;
                            const ratingVal = Array.isArray(optIdx) 
                              ? optIdx[optIdx.length - 1] 
                              : (typeof optIdx === 'number' ? optIdx : 0);
                            return q.options && q.options.length > 0
                              ? q.options[ratingVal]?.is_correct
                              : ratingVal > 1;
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

        <div className="w-full max-w-4xl min-w-0 flex flex-col overflow-hidden h-full">
          <div className="flex-1 flex flex-col overflow-hidden md:pr-2 md:pb-2 pr-0 pb-0 xl:pb-0">
            

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
                  practiceSubMode={practiceSubMode}
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
                    className="absolute inset-0 backface-hidden bg-white md:rounded-[3rem] rounded-[2rem] border border-slate-100 md:p-8 p-4 py-6 md:py-8 flex flex-col justify-between shadow-2xl shadow-indigo-100/40"
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
                          {currentIndex + 1}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {currentQuestion && getMasteryPill(currentQuestion.box_level || 1)}
                      </div>
                    </div>

                    {/* Word / Question Content */}
                    <div className="flex-1 flex flex-col items-center justify-center text-center gap-6 overflow-y-auto custom-scrollbar my-2 py-2">
                      {(currentQuestion?.image || currentQuestion?.others?.front_img) && (
                        <img 
                          src={currentQuestion.image || currentQuestion.others?.front_img || undefined} 
                          alt="Front Visual" 
                          className="max-h-40 md:max-h-48 object-contain rounded-3xl border border-slate-100/80 shadow-md bg-slate-50/50 p-1.5 animate-in zoom-in-95 duration-500"
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

                      {/* AI Hint Section */}
                      <div className="flex flex-col items-center gap-3 w-full px-4" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={handleToggleHint}
                          disabled={isAskingHint}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 border border-slate-200/60 hover:border-indigo-200/80 transition-all font-black text-[10px] tracking-wider uppercase active:scale-95 shadow-sm shrink-0"
                        >
                          <Lightbulb className={cn("w-3.5 h-3.5 text-indigo-500", isAskingHint && "animate-pulse")} />
                          <span>{isAskingHint ? 'Loading Hint...' : 'AI Hint'}</span>
                        </button>

                        <AnimatePresence>
                          {showingHint && currentQuestion?.hint && (
                            <motion.div
                              initial={{ opacity: 0, y: 10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 10, scale: 0.95 }}
                              className="w-full max-w-md p-4 rounded-2xl bg-indigo-50/40 border border-indigo-100/50 shadow-sm text-center text-xs font-semibold text-indigo-700 leading-relaxed break-words"
                            >
                              <span className="font-black text-[9px] uppercase tracking-wider text-indigo-400 block mb-1">💡 AI Hint</span>
                              {currentQuestion.hint}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>

                  {/* BACK SIDE */}
                  <div
                    className="absolute inset-0 backface-hidden bg-white md:rounded-[3rem] rounded-[2rem] border border-slate-200 md:p-8 p-4 py-6 md:py-8 flex flex-col justify-between shadow-2xl shadow-indigo-100/40"
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
                          {currentIndex + 1}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {currentQuestion && getMasteryPill(currentQuestion.box_level || 1)}
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

                      {(currentQuestion?.others?.back_img || currentQuestion?.image) && (
                        <div className="space-y-2">
                          <img 
                            src={currentQuestion.others?.back_img || currentQuestion.image || undefined} 
                            alt="Back Visual" 
                            className="max-h-40 md:max-h-48 object-contain rounded-3xl border border-slate-100/80 shadow-md bg-slate-50/50 p-1.5 animate-in zoom-in-95 duration-500"
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

                      return (
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
                      );
                    })()}

                    {/* FSRS Stats Row */}
                    {currentQuestion?.fsrs && (() => {
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
                          {/* State */}
                          <div className="flex flex-col items-center gap-0.5 flex-1 justify-center min-w-0">
                            <span className="text-[7.5px] sm:text-[8px] font-black text-slate-400 uppercase tracking-wider truncate">State</span>
                            <span className={cn("px-1 py-0.5 rounded-lg border text-[7.5px] sm:text-[9px] font-black uppercase tracking-wider flex items-center gap-0.5 truncate transition-all duration-300", stateColors[stateIdx])}>
                              <span className={cn("w-1 h-1 rounded-full animate-pulse", stateDots[stateIdx])} />
                              {stateLabels[stateIdx]}
                            </span>
                          </div>
                          <div className="w-px h-6 bg-gradient-to-b from-slate-100 via-slate-200/60 to-slate-100 flex-shrink-0" />

                          {/* Stability */}
                          <div className="flex flex-col items-center gap-0.5 flex-1 justify-center min-w-0">
                            <span className="text-[7.5px] sm:text-[8px] font-black text-slate-400 uppercase tracking-wider truncate">Stability</span>
                            <span className="bg-indigo-50/40 text-indigo-600 border border-indigo-100/30 px-1 py-0.5 rounded-lg font-black text-[8.5px] sm:text-[10px] shadow-sm flex items-center gap-0.5 truncate">
                              {currentQuestion.fsrs.stability ? (
                                <>
                                  <span className="tracking-tight">{currentQuestion.fsrs.stability.toFixed(2)}</span>
                                  <span className="text-[7.5px] font-bold opacity-75">d</span>
                                </>
                              ) : (
                                'none'
                              )}
                            </span>
                          </div>
                          <div className="w-px h-6 bg-gradient-to-b from-slate-100 via-slate-200/60 to-slate-100 flex-shrink-0" />

                          {/* Difficulty */}
                          <div className="flex flex-col items-center gap-0.5 flex-1 justify-center min-w-0">
                            <span className="text-[7.5px] sm:text-[8px] font-black text-slate-400 uppercase tracking-wider truncate">Difficulty</span>
                            <span className="bg-purple-50/40 text-purple-600 border border-purple-100/30 px-1 py-0.5 rounded-lg font-black text-[8.5px] sm:text-[10px] shadow-sm flex items-center gap-0.5 truncate">
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
                            <span className="text-[7.5px] sm:text-[8px] font-black text-slate-400 uppercase tracking-wider truncate">First</span>
                            <span className="bg-slate-100/60 text-slate-600 border border-slate-200/40 px-1 py-0.5 rounded-lg font-black text-[7.5px] sm:text-[9px] shadow-sm text-center truncate w-full">
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
                            <span className="text-[7.5px] sm:text-[8px] font-black text-slate-400 uppercase tracking-wider truncate">Last</span>
                            <span className="bg-slate-100/60 text-slate-600 border border-slate-200/40 px-1 py-0.5 rounded-lg font-black text-[7.5px] sm:text-[9px] shadow-sm text-center truncate w-full">
                              {showAbsoluteLast ? lastReviewedInfo.full : lastReviewedInfo.relative}
                            </span>
                          </div>
                        </div>
                      );
                    })()}


                    {/* FSRS Buttons Grid (Visible inside card back, hidden after rating until it unlocks) */}
                    <FSRSActionButtons
                      isFlipped={isFlipped}
                      hasRated={hasRated}
                      selectedOption={selectedOption}
                      intervals={currentQuestion?.fsrs?.intervals}
                      onRate={handleReviewRating}
                    />

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
          </AnimatePresence>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="hidden lg:flex w-[340px] 2xl:w-[420px] flex-shrink-0 flex-col overflow-hidden">
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
                  />
                </>
              )}
            </div>
          </div>
        </aside>
      </main>


      {(mainTab !== 'practice' || (mainTab === 'practice' && !practiceNeedsSetup)) && (
      <footer className="relative w-full flex-shrink-0 bg-white/95 backdrop-blur-2xl border-t border-slate-100/80 px-3 pt-1.5 pb-1.5 sm:px-4 sm:pb-2.5 sm:pt-2 z-[300] shadow-[0_-4px_24px_rgba(99,102,241,0.06)]">
        {(() => {
          const answeredCount = Object.keys(sessionAnswers).length;
          const totalCount = session?.questions?.length || 0;
          const progressPercent = totalCount > 0 ? (answeredCount / totalCount) * 100 : 0;
          return (
            <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-slate-100/70 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          );
        })()}
        <div className="max-w-2xl mx-auto w-full flex flex-col gap-1.5 sm:gap-2">
          {activeBottomTab === 'flashcard' && (
            <div className="w-full flex items-center gap-1.5 sm:gap-3 h-12 sm:h-14">
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

            {/* Audio play button */}
            {(() => {
              if (!currentQuestion) return null;
              
              const hasAudioOrScript = mainTab === 'practice'
                ? (!!currentQuestion.audio || !!currentQuestion.others?.front_audio_url || !!currentQuestion.others?.front_audio_content?.trim())
                : (!isFlipped 
                  ? (!!currentQuestion.audio || !!currentQuestion.others?.front_audio_url || !!currentQuestion.others?.front_audio_content?.trim())
                  : (!!currentQuestion.others?.back_audio_url || !!currentQuestion.others?.back_audio_content?.trim()));
                
              if (!hasAudioOrScript) return null;
              
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
            
            {/* Lightbulb Explanation Button */}
            {(mainTab === 'practice' || (showFeedback && activelyRatedCurrentCard)) && (
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
                  className="flex-1 h-12 sm:h-14 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white font-black text-xs rounded-2xl shadow-lg shadow-emerald-300/50 flex items-center justify-center gap-2.5 uppercase tracking-widest active:scale-[0.98] transition-all hover:shadow-emerald-400/60 hover:shadow-xl"
                >
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <div className="flex-1 flex gap-2 h-12 sm:h-14">
                  <button
                    onClick={handleNext}
                    className="flex-1 h-12 sm:h-14 bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100 font-black text-xs rounded-2xl flex items-center justify-center gap-1.5 uppercase tracking-widest active:scale-[0.98] transition-all"
                  >
                    Skip <ChevronRight className="w-4 h-4" />
                  </button>
                  <div className="flex-[2] h-12 sm:h-14 bg-slate-100 text-slate-400 font-black text-xs rounded-2xl flex items-center justify-center uppercase tracking-widest pointer-events-none select-none">
                    Waiting...
                  </div>
                </div>
              )
            ) : (
              !hasRated ? (
                <button 
                  onClick={() => {
                    const nextFlipped = !isFlipped;
                    setIsFlipped(nextFlipped);
                    if (nextFlipped) {
                      setShowFeedback(true);
                      setJustAnswered(true);
                    }
                  }}
                  className="flex-1 h-12 sm:h-14 bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 text-white font-black text-xs rounded-2xl shadow-lg shadow-indigo-300/50 flex items-center justify-center gap-2.5 uppercase tracking-widest active:scale-[0.98] transition-all hover:shadow-indigo-400/60 hover:shadow-xl"
                >
                  {isFlipped ? (
                    <><ChevronRight className="w-4 h-4 rotate-180" /> FLIP BACK</>
                  ) : (
                    <>FLIP CARD <ChevronRight className="w-4 h-4 rotate-90" /></>
                  )}
                </button>
              ) : (
                <div className="flex-1 flex gap-1.5 sm:gap-3 h-12 sm:h-14">
                  <button 
                    onClick={() => setIsFlipped(prev => !prev)}
                    className="w-12 h-12 sm:w-14 sm:h-14 flex-shrink-0 bg-gradient-to-r from-indigo-50 to-indigo-100/80 hover:from-indigo-100 hover:to-indigo-200 text-indigo-600 border border-indigo-200/50 rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                    title={isFlipped ? "Flip to Front" : "Flip to Back"}
                  >
                    <RefreshCw className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-indigo-600 animate-[spin_4s_linear_infinite]" />
                  </button>
                  <button 
                    onClick={handleNext}
                    className="flex-1 h-12 sm:h-14 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white font-black text-xs rounded-2xl shadow-lg shadow-emerald-300/50 flex items-center justify-center gap-2.5 uppercase tracking-widest active:scale-[0.98] transition-all hover:shadow-emerald-400/60 hover:shadow-xl"
                  >
                    NEXT CARD <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )
            )}
            </div>
          )}

          {/* Interactive Navigation Tabs */}
          {(() => {
            const answeredCount = Object.keys(sessionAnswers).length;
            const totalCount = session?.questions?.length || 0;
            const progressPercent = totalCount > 0 ? (answeredCount / totalCount) * 100 : 0;

            return (
              <div className="w-full grid grid-cols-3 bg-slate-50/80 border border-slate-100/40 rounded-xl p-0.5 mt-1">
                {/* 1. Card Map Tab */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsStatsOpen(false);
                    setIsMapOpen(true);
                  }}
                  className={cn(
                    "flex items-center justify-center gap-1.5 py-1.5 px-1 rounded-lg transition-all",
                    activeBottomTab === 'map'
                      ? "bg-white border border-slate-200/30 text-amber-500 shadow-sm font-black scale-102"
                      : "text-slate-500 hover:text-slate-700 active:scale-95"
                  )}
                  title="Mở bản đồ thẻ"
                >
                  <LayoutGrid className={cn("w-3.5 h-3.5 shrink-0", activeBottomTab === 'map' ? "text-amber-500" : "text-slate-400")} />
                  <span className="text-[10px] font-black uppercase tracking-wider truncate">
                    Bản đồ
                  </span>
                </button>
                {/* 2. Flashcard Active View Tab */}
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMapOpen(false);
                    setIsStatsOpen(false);
                  }}
                  className={cn(
                    "flex items-center justify-center gap-1.5 py-1.5 px-1 rounded-lg transition-all",
                    activeBottomTab === 'flashcard'
                      ? "bg-white border border-slate-200/30 text-amber-500 shadow-sm font-black scale-102"
                      : "text-slate-500 hover:text-slate-700 active:scale-95"
                  )}
                  title="Tiến trình học tập hiện tại"
                >
                  <BookOpen className={cn("w-3.5 h-3.5 shrink-0", activeBottomTab === 'flashcard' ? "text-amber-500" : "text-slate-400")} />
                  <span className="text-[10px] font-black uppercase tracking-wider truncate">
                    {answeredCount}/{totalCount} ({Math.round(progressPercent)}%)
                  </span>
                </button>
                {/* 3. Stats Tab */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMapOpen(false);
                    setIsStatsOpen(true);
                  }}
                  className={cn(
                    "flex items-center justify-center gap-1.5 py-1.5 px-1 rounded-lg transition-all",
                    activeBottomTab === 'stats'
                      ? "bg-white border border-slate-200/30 text-amber-500 shadow-sm font-black scale-102"
                      : "text-slate-500 hover:text-slate-700 active:scale-95"
                  )}
                  title="Mở thống kê tiến trình"
                >
                  <TrendingUp className={cn("w-3.5 h-3.5 shrink-0", activeBottomTab === 'stats' ? "text-amber-500" : "text-slate-400")} />
                  <span className="text-[10px] font-black uppercase tracking-wider truncate">
                    Thống kê
                  </span>
                </button>
              </div>
            );
          })()}
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
        onNavigateToDeck={() => navigate(`/flashcard/${id}`)}
      />

      {/* Mobile Question Map Modal / Practice Stats Drawer */}
      {/* Mobile Question Map Modal */}
      <AnimatePresence>
        {isMapOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: 50 }} 
            className="fixed inset-x-0 top-0 bottom-[48px] sm:bottom-[54px] z-[200] bg-[#F8FAFC] lg:hidden flex flex-col"
          >
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

            {/* Bottom Reachable Header/Dismiss Bar & Filters */}
            <div className="border-t border-slate-100 bg-white/95 backdrop-blur-md flex-shrink-0 pb-7 flex flex-col gap-3.5">
              {/* Filter Tabs at the Bottom for reachability */}
              <div className="px-4 pt-3.5">
                <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/40 w-full">
                  {[
                    { id: 'all', label: 'Tất cả' },
                    { id: 'studied', label: 'Đã học' },
                    { id: 'unseen', label: 'Chưa học' },
                    { id: 'hard', label: 'Thẻ khó' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setMobileMapFilterMode(tab.id as any);
                      }}
                      className={cn(
                        "flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                        mobileMapFilterMode === tab.id
                          ? "bg-white text-indigo-600 shadow-sm border border-slate-200/30"
                          : "text-slate-500 hover:bg-white/40"
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dismiss Bar */}
              <div className="flex items-center justify-between gap-3 px-4">
                <button 
                  onClick={() => setIsMapOpen(false)} 
                  className="w-12 h-12 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-2xl text-slate-500 active:scale-95 hover:bg-slate-100 hover:text-slate-700 transition-all shadow-sm flex-shrink-0"
                  title="Đóng bản đồ"
                >
                  <X className="w-6 h-6" />
                </button>
                <div className="flex-1 text-right">
                  <h4 className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.2em] leading-tight">Bản đồ thẻ học</h4>
                  <p className="text-[9px] text-slate-400 font-bold mt-0.5">Dễ dàng theo dõi & lọc thẻ học</p>
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
            className="fixed inset-0 z-[200] bg-[#F8FAFC] xl:hidden flex flex-col h-screen h-[100dvh]"
          >
            <div className="flex items-center justify-center p-3 border-b border-slate-100 bg-white shadow-sm flex-shrink-0">
              <h4 className="text-[9px] font-black text-indigo-600 uppercase tracking-[0.4em]">
                {activeFeedbackTab === 'insight' ? 'LEARNING INSIGHTS' : activeFeedbackTab === 'ai' ? 'AI DEEP ANALYSIS' : 'PERSONAL NOTES'}
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
      <AnimatePresence>
        {showGoalCelebration && goalToast && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowGoalCelebration(false)
                confetti({ zIndex: 9999, particleCount: 80, spread: 60, origin: { y: 0.6 } })
              }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl pointer-events-auto"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.8, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 50 }}
              transition={{ type: 'spring', bounce: 0.35, duration: 0.6 }}
              className="relative w-full max-w-md bg-white rounded-[3rem] p-8 shadow-[0_25px_60px_rgba(99,102,241,0.3)] border border-slate-100/80 overflow-hidden text-center z-10 pointer-events-auto"
            >
              {/* Top premium border indicator */}
              <div className="absolute top-0 left-0 w-full h-2.5 bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500"></div>
              
              {/* Spinning/glowing light background aura */}
              <div className="absolute top-12 left-1/2 -translate-x-1/2 w-56 h-56 bg-gradient-to-tr from-amber-200/20 to-orange-200/20 rounded-full blur-3xl animate-pulse pointer-events-none" />
              
              {/* Giant Bouncing Trophy Icon */}
              <div className="relative w-28 h-28 mx-auto mb-6 flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-tr from-amber-400 to-orange-500 rounded-[2.5rem] rotate-12 scale-95 opacity-20 animate-pulse" />
                <div className="relative w-24 h-24 bg-gradient-to-tr from-amber-400 via-orange-500 to-red-500 rounded-[2rem] flex items-center justify-center shadow-lg shadow-orange-300 transform hover:scale-105 transition-all">
                  <Trophy className="w-12 h-12 text-white fill-white animate-bounce" />
                </div>
              </div>
              
              <span className="text-[10px] font-black text-amber-600 bg-amber-50 border border-amber-100 px-4 py-1.5 rounded-full uppercase tracking-[0.2em] mb-4 inline-block shadow-sm">
                Daily Goal Achieved! 🏆
              </span>
              
              <h3 className="text-3xl font-black text-slate-800 tracking-tight leading-tight mb-3">
                SUPER STUDY DISCIPLINE!
              </h3>
              
              <p className="text-slate-500 font-bold text-xs leading-relaxed mb-8 px-4">
                {goalToast.message}
              </p>
              
              {/* Rewards Summary Grid */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-gradient-to-br from-indigo-50/50 via-purple-50/30 to-white border border-indigo-100/50 rounded-3xl p-5 flex flex-col items-center justify-center shadow-sm">
                  <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1.5">BONUS REWARD</span>
                  <span className="text-xl font-black text-indigo-600">⚡ +{goalToast.bonusXP || 50} XP</span>
                </div>
                <div className="bg-gradient-to-br from-orange-50/50 via-amber-50/30 to-white border border-orange-100/50 rounded-3xl p-5 flex flex-col items-center justify-center shadow-sm">
                  <span className="text-[9px] font-black text-orange-400 uppercase tracking-widest mb-1.5">DAILY STREAK</span>
                  <span className="text-xl font-black text-orange-600">🔥 {goalToast.streakCount}d</span>
                </div>
              </div>
              
              {/* High Motivation Action Button */}
              <button 
                onClick={() => {
                  setShowGoalCelebration(false)
                  confetti({ zIndex: 9999, particleCount: 80, spread: 60, origin: { y: 0.6 } })
                }}
                className="w-full py-4 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-orange-200 hover:shadow-orange-300 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                AWESOME, KEEP GOING! 🚀
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
        showFeedback={showFeedback}
        copyQuestionToClipboard={copyQuestionToClipboard}
        currentQuestion={currentQuestion}
        handleIgnoreQuestion={handleIgnoreQuestion}
        openEditModal={openEditModal}
        setIsQuitModalOpen={setIsQuitModalOpen}
        quickLearnEnabled={quickLearnEnabled}
        setQuickLearnEnabled={setQuickLearnEnabled}
      />

      {/* Exit Confirmation Modal */}
      <AnimatePresence>
        {isQuitModalOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsQuitModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-[2.5rem] p-8 shadow-2xl border border-white/20 overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-rose-400 via-rose-500 to-rose-400"></div>
              
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mb-6 border border-rose-100">
                  <X className="w-8 h-8 text-rose-500" />
                </div>
                
                <h3 className="text-xl font-black text-slate-800 mb-2 uppercase tracking-tight">End Study Session?</h3>
                <p className="text-slate-500 font-medium text-sm leading-relaxed mb-8">Exiting now will clear the current state of this study session. Are you sure you want to exit?</p>
                
                <div className="grid grid-cols-2 gap-3 w-full">
                  <button 
                    onClick={() => setIsQuitModalOpen(false)}
                    className="py-4 bg-slate-50 text-slate-600 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-slate-100 transition-all"
                  >
                    KEEP STUDYING
                  </button>
                  <button 
                    onClick={async () => {
                      try {
                        await axios.delete(`/api/v1/deck/${id}/session`)
                      } catch (e) {
                        console.error("Failed to delete session on exit:", e)
                      }
                      navigate(`/flashcard/${id}`)
                    }}
                    className="py-4 bg-rose-500 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg shadow-rose-200 active:scale-95 transition-all"
                  >
                    CONFIRM EXIT
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <FlashcardEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        flashcard={editFormData}
        onSave={handleSaveEdit}
        isSaving={isSavingEdit}
      />





      {/* Full-Screen Achievement Celebration Overlay */}
      <BadgeUnlockOverlay
        badge={activeUnlockedBadge}
        onClose={() => setActiveUnlockedBadge(null)}
      />
      {/* Milestone Celebrations Overlay */}
      <AnimatePresence>
        {activeMilestone && (
          <MilestoneCelebration
            type={activeMilestone.type}
            title={activeMilestone.title}
            message={activeMilestone.message}
            onClose={() => setActiveMilestone(null)}
          />
        )}
      </AnimatePresence>
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
    </div>
  )
}
