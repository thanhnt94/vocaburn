import { useState, useEffect, useRef } from 'react'
import confetti from 'canvas-confetti'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, MessageSquare, Play, Volume2, Maximize2, Hash, Minimize2, Check, X, RotateCcw, AlertCircle, LayoutGrid, Timer, Flame, Trophy, Sparkles, Lightbulb, StickyNote, Target, CheckCircle2, XCircle, Clock, BookOpen, Copy, Edit3, Brain, FileText, HelpCircle, Sliders, ListOrdered, Shuffle, Eye, EyeOff, TrendingUp, Award, Lock, Keyboard, VolumeX, Settings, RefreshCw, Undo2, LogOut, Zap, Music, Image } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'
import { playCorrectSound, playIncorrectSound, speakMultiLanguage, stripTagsAndBBCode, speakSequentially } from '@/lib/audio'
import { parseBBCodeToHtml, stripBBCode, isJapanese, getJpPattern, extractTokens, tokensOverlapHigh } from '@/lib/text'
import { selectDistractors } from '@/lib/distractor'
import { TypewriterText } from '@/components/TypewriterText'
import { FeedbackArea } from '@/components/FeedbackArea'
import { PracticeSetupScreen } from '@/components/PracticeSetupScreen'
import { QuestionMapGrid } from '@/components/QuestionMapGrid'
import { MilestoneCelebration } from '@/components/MilestoneCelebration'
import DailyComparisonChart from '@/components/DailyComparisonChart'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { usePlaySettings } from '@/hooks/usePlaySettings'
import { PlaySessionSummary } from '@/components/PlaySessionSummary'
import { PlayStatsDrawer } from '@/components/PlayStatsDrawer'

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

export default function PracticePlay() {
  const { id, subMode } = useParams()
  const navigate = useNavigate()
  const { user, gamify, setUser, setGamify, addXp } = useAppStore()

  const activeAudioRef = useRef<HTMLAudioElement | null>(null)
  const currentQuestionIdRef = useRef<number | null>(null)

  const playCardAudio = async (face: 'front' | 'back') => {
    if (!currentQuestion) return;
    const targetQuestionId = currentQuestion.id;
    
    // Stop any existing audio or speech synthesis
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    window.speechSynthesis.cancel();

    let audioUrl = face === 'front'
      ? (currentQuestion.audio || currentQuestion.others?.front_audio_url)
      : currentQuestion.others?.back_audio_url;

    const script = face === 'front'
      ? currentQuestion.others?.front_audio_content
      : currentQuestion.others?.back_audio_content;

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
        console.warn(`[TTS FALLBACK WARNING] Playback of generated audio file ${cacheBustedUrl} failed (possibly blocked by browser autoplay policy or corrupted file). Error:`, err.message);
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

  const speakPracticeQuestionAndAnswer = async () => {
    if (!currentPracticeData) return;
    const qText = currentPracticeData.question || '';
    const aText = currentPracticeData.correct_answer || '';

    const containsJp = (str: string) => /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(str);
    const containsVi = (str: string) => /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(str);

    const detectLang = (str: string) => containsJp(str) ? 'ja-JP' : (containsVi(str) ? 'vi-VN' : 'en-US');

    // Stop any ongoing audio
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    window.speechSynthesis.cancel();

    // Use Web Speech API directly for speed in practice mode
    const segments: { text: string; langCode: string }[] = [];
    if (qText) segments.push({ text: qText, langCode: detectLang(qText) });
    if (aText) segments.push({ text: aText, langCode: detectLang(aText) });
    speakSequentially(segments, 500);
  };

  const [session, setSession] = useState<any>(null)
  const [autoPlayAudio, setAutoPlayAudio] = useState<'never' | 'always' | 'front' | 'back'>(() => {
    return (localStorage.getItem('vocaburn_autoplay_audio') as any) || 'never';
  });
  const [currentIndex, setCurrentIndex] = useState(-1)
  const [showAbsoluteFirst, setShowAbsoluteFirst] = useState(false)
  const [showAbsoluteLast, setShowAbsoluteLast] = useState(false)

  useEffect(() => {
    setShowAbsoluteFirst(false)
    setShowAbsoluteLast(false)
  }, [currentIndex])
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const [isFlipped, setIsFlipped] = useState(false)
  const [badgeVisible, setBadgeVisible] = useState(false)
  const [badgeMessage, setBadgeMessage] = useState("")
  const [streak, setStreak] = useState(0)
  const [sessionXP, setSessionXP] = useState(0)
  const [initialTotalXP, setInitialTotalXP] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [sessionStudyTime, setSessionStudyTime] = useState(0)
  const [initialTodayXP, setInitialTodayXP] = useState(0)
  const [initialTodayTime, setInitialTodayTime] = useState(0)
  const [initialAllTimeTime, setInitialAllTimeTime] = useState(0)
  const [scoreMode, setScoreMode] = useState<'today' | 'all'>(() => (localStorage.getItem('vocaburn_score_mode') as 'today' | 'all') || 'all')
  const [timeMode, setTimeMode] = useState<'card' | 'today' | 'all'>(() => (localStorage.getItem('vocaburn_time_mode') as 'card' | 'today' | 'all') || 'card')

  const toggleScoreMode = () => {
    const nextMode = scoreMode === 'all' ? 'today' : 'all'
    setScoreMode(nextMode)
    localStorage.setItem('vocaburn_score_mode', nextMode)
  }

  const toggleTimeMode = () => {
    let nextMode: 'card' | 'today' | 'all' = 'today'
    if (timeMode === 'card') nextMode = 'today'
    else if (timeMode === 'today') nextMode = 'all'
    else nextMode = 'card'
    setTimeMode(nextMode)
    localStorage.setItem('vocaburn_time_mode', nextMode)
  }

  const formatHeaderTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const mins = Math.floor(seconds / 60)
    const hours = Math.floor(mins / 60)
    if (hours > 0) {
      return `${hours}h ${mins % 60}m`
    }
    return `${mins}m`
  }

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
  const [selectedChoiceData, setSelectedChoiceData] = useState<any | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [activeUnlockedBadge, setActiveUnlockedBadge] = useState<any | null>(null)
  const [activeMasteryUpgrade, setActiveMasteryUpgrade] = useState<any | null>(null)
  const [editFormData, setEditFormData] = useState<any>(null)
  const [sessionAnswers, setSessionAnswers] = useState<Record<number, number | number[]>>({})
  const [practiceAnswers, setPracticeAnswers] = useState<Record<number, number>>({})
  const [isEditingPrompt, setIsEditingPrompt] = useState(false)
  const [promptInput, setPromptInput] = useState('')
  const [activeMilestone, setActiveMilestone] = useState<{
    type: 'streak_10' | 'halfway' | 'mastery' | 'goal_met'
    title: string
    message: string
  } | null>(null)
  // ── Engagement State ──
  const [answerContext, setAnswerContext] = useState<{
    wasCorrect: boolean
    prevTotal: number
    prevCorrect: number
    timeTaken: number
    avgTime: number
    newStreak: number
    xpGained: number
  } | null>(null)
  const [isSessionSummaryOpen, setIsSessionSummaryOpen] = useState(false)
  const [currentStatIndex, setCurrentStatIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStatIndex((prev) => (prev + 1) % 4)
    }, 3500)
    return () => clearInterval(interval)
  }, [])
  const [xpFloat, setXpFloat] = useState<{ visible: boolean; amount: number }>({ visible: false, amount: 0 })
  const [milestonesHit, setMilestonesHit] = useState<Set<number>>(new Set())
  const [goalToast, setGoalToast] = useState<{
    visible: boolean;
    message: string;
    isTargetMet: boolean;
    justCompleted: boolean;
    streakCount: number;
    doneToday: number;
    dailyTarget: number;
    bonusXP?: number;
  } | null>(null)
  const [activeGoal, setActiveGoal] = useState<any>(null)
  const [showGoalCelebration, setShowGoalCelebration] = useState(false)
  const [isLimitlessStrike, setIsLimitlessStrike] = useState(false)
  const [activeMode, setActiveMode] = useState<string>(() => localStorage.getItem('quiz_learning_mode') || 'fsrs')
  const [isModeMenuOpen, setIsModeMenuOpen] = useState(false)
  const [learningModeAlert, setLearningModeAlert] = useState<{
    visible: boolean;
    message: string;
    type?: 'info' | 'warning';
  } | null>(null)
  const [justAnswered, setJustAnswered] = useState(false)

  // ── Multi-Modal Practice State Hooks ──
  const mainTab = 'practice' as 'fsrs' | 'practice'
  const setMainTab = (tab: 'fsrs' | 'practice') => { }
  const [practiceSubMode, setPracticeSubMode] = useState<'mcq' | 'typing' | 'listening'>(() => (localStorage.getItem('vocab_practice_submode') as 'mcq' | 'typing' | 'listening') || 'mcq')
  const [practiceRange, setPracticeRange] = useState<'all' | 'learned'>(() => (localStorage.getItem('vocab_practice_range') as 'all' | 'learned') || 'all')
  const [practiceNeedsSetup, setPracticeNeedsSetup] = useState(false)
  const [practiceDisabled, setPracticeDisabled] = useState(false)
  const [availableColumns, setAvailableColumns] = useState<string[]>([])
  const [setupPairs, setSetupPairs] = useState<{ q: string, a: string }[]>([{ q: 'front', a: 'back' }])
  const [setupNumChoices, setSetupNumChoices] = useState<number>(4)
  const [typingInput, setTypingInput] = useState('')
  const [typingFeedback, setTypingFeedback] = useState<{ checked: boolean; isCorrect: boolean } | null>(null)
  const [currentPracticeData, setCurrentPracticeData] = useState<any>(null)

  // Per-mode settings state
  const [modeSettings, setModeSettings] = useState<Record<'mcq' | 'typing' | 'listening', { active_pairs: { q: string, a: string }[], num_choices?: number }>>({
    mcq: { active_pairs: [{ q: 'front', a: 'back' }], num_choices: 4 },
    typing: { active_pairs: [{ q: 'front', a: 'back' }] },
    listening: { active_pairs: [{ q: 'front', a: 'back' }], num_choices: 4 }
  })

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const activeBottomTab = isMapOpen ? 'map' : (isStatsOpen ? 'stats' : 'flashcard')

  const {
    sfxEnabled,
    setSfxEnabled,
    hapticEnabled,
    setHapticEnabled,
    showImages,
    setShowImages,
    saveGeneralSettings
  } = usePlaySettings(id || '', modeSettings, setModeSettings, activeMode, autoPlayAudio);

  // Practice stats tracking
  const [practiceTotalAnswered, setPracticeTotalAnswered] = useState(0)
  const [practiceCorrectCount, setPracticeCorrectCount] = useState(0)

  // Sync practiceSubMode from URL params
  useEffect(() => {
    if (subMode === 'mcq' || subMode === 'typing' || subMode === 'listening') {
      setPracticeSubMode(subMode)
      localStorage.setItem('vocab_practice_submode', subMode)
    }
  }, [subMode])

  // Redirect to default subMode if not provided in URL
  useEffect(() => {
    if (!subMode) {
      const savedSub = localStorage.getItem('vocab_practice_submode') || 'mcq'
      navigate(`/practice/${id}/${savedSub}`, { replace: true })
    }
  }, [id, subMode, navigate])

  // Sync setup screen fields when practiceSubMode or modeSettings change
  useEffect(() => {
    if (modeSettings && modeSettings[practiceSubMode]) {
      setSetupPairs(modeSettings[practiceSubMode].active_pairs || [{ q: 'front', a: 'back' }])
      setSetupNumChoices(modeSettings[practiceSubMode].num_choices || 4)
    }
  }, [practiceSubMode, modeSettings])

  // ── Client-side Dynamic Practice Generator ──

  const generatePracticeQuestion = (idx: number, customSubMode?: string) => {
    if (!session || !session.questions || session.questions.length === 0) return;
    const qObj = session.questions[idx];
    if (!qObj) return;

    const subMode = customSubMode || practiceSubMode;

    // Pick a random pair from setupPairs
    const activePair = setupPairs && setupPairs.length > 0
      ? setupPairs[Math.floor(Math.random() * setupPairs.length)]
      : { q: 'front', a: 'back' };

    const question_key = activePair.q;
    const answer_key = activePair.a;
    const num_choices = setupNumChoices || 4;

    const getVal = (item: any, key: string): string => {
      if (!item) return "";
      if (key === 'front' || key === 'content') {
        const val = item.content || (item.others && item.others.front);
        if (val) return String(val).trim();
      }
      if (key === 'back' || key === 'explanation') {
        let val = "";
        if (item.options && item.options.length > 0) {
          const correctOpt = item.options.find((o: any) => o.is_correct);
          if (correctOpt) val = correctOpt.content;
        }
        if (!val) val = item.explanation || (item.others && item.others.back);
        if (val) return String(val).trim();
      }
      const val = item[key] !== undefined && item[key] !== null
        ? item[key]
        : (item.others && typeof item.others === 'object' ? item.others[key] : "");
      return String(val ?? "").trim();
    };

    const questionText = getVal(qObj, question_key);
    const correctAns = getVal(qObj, answer_key);

    const item_front = getVal(qObj, 'front');
    const item_back = getVal(qObj, 'back');

    if (subMode === 'mcq' || subMode === 'listening') {
      // Build candidate pool
      const all_items_data = session.questions.map((q: any) => ({
        id: q.id,
        front: getVal(q, 'front'),
        back: getVal(q, 'back'),
        others: q.others
      }));

      // Random sample from all items to speed up
      const sampleSize = Math.min(all_items_data.length, 50);
      const shuffled_items: any[] = [];
      const usedIndices = new Set<number>();
      while (shuffled_items.length < sampleSize && usedIndices.size < all_items_data.length) {
        const randIdx = Math.floor(Math.random() * all_items_data.length);
        if (!usedIndices.has(randIdx)) {
          usedIndices.add(randIdx);
          shuffled_items.push(all_items_data[randIdx]);
        }
      }

      const distractor_pool: any[] = [];
      for (const other of shuffled_items) {
        if (distractor_pool.length >= 20) break;
        if (other.id !== qObj.id) {
          const d_val = getVal(other, answer_key);
          const d_front = getVal(other, 'front');
          const d_back = getVal(other, 'back');
          if (d_val && d_val.toLowerCase() !== 'nan') {
            distractor_pool.push({
              text: d_val,
              front: d_front,
              back: d_back,
              id: other.id,
              type: (other.others && typeof other.others === 'object' ? (other.others.type || other.others.pos || '') : '')
            });
          }
        }
      }

      const correct_item_data = {
        text: correctAns,
        q_text: questionText,
        front: item_front,
        back: item_back,
        id: qObj.id,
        type: (qObj.others && typeof qObj.others === 'object' ? (qObj.others.type || qObj.others.pos || '') : '')
      };

      const needed = num_choices - 1;
      const selectedDistractors = selectDistractors(correct_item_data, distractor_pool, needed);

      // Assemble choices
      const choices_data = ([correct_item_data] as any[]).concat(selectedDistractors);
      // Shuffle choices_data using Fisher-Yates algorithm
      for (let i = choices_data.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = choices_data[i];
        choices_data[i] = choices_data[j];
        choices_data[j] = temp;
      }

      const choices = choices_data.map(c => c.text);
      const choice_item_ids = choices_data.map(c => c.id);
      const correct_index = choices.indexOf(correctAns);

      setCurrentPracticeData({
        question: questionText,
        choices,
        choice_item_ids,
        correct_index: correct_index !== -1 ? correct_index : 0,
        correct_answer: correctAns,
        question_key,
        answer_key
      });
    } else if (subMode === 'typing') {
      setCurrentPracticeData({
        question: questionText,
        correct_answer: correctAns,
        question_key,
        answer_key
      });
    }
  };

  useEffect(() => {
    if (mainTab === 'practice' && session?.questions && session.questions.length > 0) {
      generatePracticeQuestion(currentIndex);
    } else {
      setCurrentPracticeData(null);
    }
  }, [currentIndex, mainTab, practiceSubMode, session, setupPairs, setupNumChoices]);

  const timerRef = useRef<any>(null)
  const currentQuestion: Question | null = session?.questions?.[currentIndex] || null
  currentQuestionIdRef.current = currentQuestion?.id || null
  const [activelyRatedCurrentCard, setActivelyRatedCurrentCard] = useState<boolean>(false)
  const [leaderboardTimeFilter, setLeaderboardTimeFilter] = useState<'today' | 'week' | 'month' | 'all_time'>('week')
  const [leaderboardType, setLeaderboardType] = useState<'xp' | 'streak' | 'questions' | 'accuracy'>('xp')
  const [leaderboardData, setLeaderboardData] = useState<any>(null)
  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState<boolean>(false)

  const xpLeaderboard = leaderboardData?.[leaderboardType] || { list: [], user_rank: -1, user_value: 0 }
  const userRank = xpLeaderboard.user_rank
  const userValue = xpLeaderboard.user_value

  const getUnitName = (type: string) => {
    if (type === 'xp') return 'XP'
    if (type === 'streak') return 'ngày'
    if (type === 'questions') return 'câu'
    return '%'
  }
  
  let leaderboardMsg = ""
  if (userRank === 1) {
    leaderboardMsg = "Bạn đang dẫn đầu Bảng xếp hạng! Hãy giữ vững ngôi vương nhé! 👑"
  } else if (userRank > 1) {
    const topUser = xpLeaderboard.list[0]
    const prevUser = xpLeaderboard.list[userRank - 2]
    const unit = getUnitName(leaderboardType)
    if (topUser) {
      const xpToTop = topUser.value - userValue
      leaderboardMsg = `Cần thêm ${xpToTop.toLocaleString()} ${unit} nữa để đạt Top 1! 🚀`
    }
    if (prevUser) {
      const xpToPrev = prevUser.value - userValue
      leaderboardMsg += ` Cách Hạng #${userRank - 1} (${prevUser.username}) ${xpToPrev.toLocaleString()} ${unit}! 💪`
    }
  } else {
    leaderboardMsg = `Hãy tích lũy thêm ${getUnitName(leaderboardType)} để ghi danh lên Bảng xếp hạng! 🏆`
  }

  useEffect(() => {
    let isMounted = true
    const loadLeaderboard = async () => {
      setIsLeaderboardLoading(true)
      try {
        const res = await axios.get('/api/v1/stats/leaderboard', {
          params: { time_filter: leaderboardTimeFilter }
        })
        if (isMounted) {
          setLeaderboardData(res.data)
        }
      } catch (e) {
        console.error("Failed to load leaderboard data", e)
      } finally {
        if (isMounted) {
          setIsLeaderboardLoading(false)
        }
      }
    }
    loadLeaderboard()
    return () => {
      isMounted = false
    }
  }, [leaderboardTimeFilter])

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
  const getButtonClass = (btnIdx: number) => {
    const isSelected = hasRated && selectedOption === btnIdx;
    const isAnySelected = hasRated && selectedOption !== null && selectedOption !== undefined;

    // Base classes for all buttons
    let classes = "group px-1.5 py-3 sm:px-2 md:px-4 md:py-4 rounded-2xl sm:rounded-3xl border shadow-sm active:scale-[0.97] transition-all flex flex-col items-center justify-center gap-1 flex-1 ";

    if (isSelected) {
      // Active style
      switch (btnIdx) {
        case 0:
          classes += "bg-rose-500 text-white border-rose-600 shadow-lg shadow-rose-200 scale-[1.03] z-10";
          break;
        case 1:
          classes += "bg-amber-500 text-white border-amber-600 shadow-lg shadow-amber-200 scale-[1.03] z-10";
          break;
        case 2:
          classes += "bg-indigo-500 text-white border-indigo-600 shadow-lg shadow-indigo-200 scale-[1.03] z-10 ring-2 ring-indigo-500/20";
          break;
        case 3:
          classes += "bg-emerald-500 text-white border-emerald-600 shadow-lg shadow-emerald-200 scale-[1.03] z-10";
          break;
      }
    } else {
      // Inactive or default styles
      if (isAnySelected) {
        classes += "opacity-60 ";
      }
      switch (btnIdx) {
        case 0:
          classes += "border-rose-100 bg-rose-50/50 hover:bg-rose-50 hover:border-rose-400 text-rose-500";
          break;
        case 1:
          classes += "border-amber-100 bg-amber-50/50 hover:bg-amber-50 hover:border-amber-400 text-amber-500";
          break;
        case 2:
          classes += "border-indigo-100 bg-indigo-50/50 hover:bg-indigo-50 hover:border-indigo-400 text-indigo-500 ring-2 ring-indigo-500/20";
          break;
        case 3:
          classes += "border-emerald-100 bg-emerald-50/50 hover:bg-emerald-50 hover:border-emerald-400 text-emerald-500";
          break;
      }
    }
    return classes;
  }
  const canEdit = user?.role === 'admin' || user?.id === 1 || session?.creator_id === user?.id || session?.is_collaborator


  useEffect(() => {
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
        // In practice mode, stop when feedback is shown. 
        // In FSRS mode, stop only when user has actually rated the card.
        if (mainTab === 'practice') {
          if (showFeedback) return prev
        } else {
          if (hasRated) return prev
        }
        setSessionStudyTime(s => s + 1)
        return prev + 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [showFeedback, hasRated, mainTab])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;

      const activeElement = document.activeElement;
      if (activeElement) {
        const tagName = activeElement.tagName.toLowerCase();
        if (tagName === 'input' || tagName === 'textarea' || activeElement.getAttribute('contenteditable') === 'true') {
          if (e.key === 'Enter' && mainTab === 'practice' && practiceSubMode === 'typing') {
            e.preventDefault();
            if (showFeedback) {
              handleNext();
            } else {
              handleTypingAnswer();
            }
          }
          return;
        }
      }

      if (isSessionSummaryOpen || isQuitModalOpen || isEditModalOpen || isMapOpen || isStatsOpen || isFeedbackOpen) {
        return;
      }

      const key = e.key.toLowerCase();

      // Handle toggle images (key 'i')
      if (key === 'i') {
        e.preventDefault();
        setShowImages(!showImages);
        return;
      }

      // Practice Mode Hotkeys
      if (mainTab === 'practice') {
        if (['mcq', 'listening'].includes(practiceSubMode)) {
          if (e.key === 'Enter' || key === 'n') {
            if (showFeedback) {
              e.preventDefault();
              handleNext();
            }
          } else if (!showFeedback && currentPracticeData?.choices) {
            const choicesCount = currentPracticeData.choices.length;
            const keyNum = parseInt(e.key);
            if (!isNaN(keyNum) && keyNum >= 1 && keyNum <= choicesCount) {
              e.preventDefault();
              handleMCQAnswer(keyNum - 1);
            }
          }
        } else if (practiceSubMode === 'typing') {
          if (e.key === 'Enter' || key === 'n') {
            if (showFeedback) {
              e.preventDefault();
              handleNext();
            }
          }
        }
        return;
      }

      // 3. Handle card flip (Space)
      if (e.key === ' ') {
        e.preventDefault();
        const nextFlipped = !isFlipped;
        setIsFlipped(nextFlipped);
        setShowFeedback(nextFlipped);
      } 
      // Handle next card (Enter or N)
      else if (e.key === 'Enter' || key === 'n') {
        if (hasRated) {
          e.preventDefault();
          handleNext();
        }
      } 
      // Handle ratings (1, 2, 3, 4)
      else if (isFlipped) {
        if (key === '1') { e.preventDefault(); handleReviewRating(1); }
        else if (key === '2') { e.preventDefault(); handleReviewRating(2); }
        else if (key === '3') { e.preventDefault(); handleReviewRating(3); }
        else if (key === '4') { e.preventDefault(); handleReviewRating(4); }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    showFeedback,
    currentQuestion,
    isSessionSummaryOpen,
    isQuitModalOpen,
    isEditModalOpen,
    isMapOpen,
    isFeedbackOpen,
    currentIndex,
    sessionAnswers,
    activeMode,
    isFlipped,
    hasRated,
    mainTab,
    practiceSubMode,
    typingInput,
    showImages,
    setShowImages
  ])

  useEffect(() => {
    if (currentQuestion) {
      fetchNote()
    }
  }, [currentIndex, currentQuestion])

  useEffect(() => {
    if (mainTab === 'practice' && practiceSubMode === 'listening' && currentPracticeData) {
      const { question } = currentPracticeData;
      speakMultiLanguage(question);
    }
  }, [currentIndex, mainTab, practiceSubMode, currentPracticeData])

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await axios.get('/api/v1/dashboard/data')
        if (!user) setUser(res.data.user)
        setGamify(res.data.gamify)
      } catch (e) { }
    }
    fetchUser()
  }, [user, setUser, setGamify])

  const fetchSession = async (activeTab = mainTab, subMode = practiceSubMode) => {
    try {
      const modeParam = activeTab === 'practice' ? `?mode=${subMode}` : ''
      const isPractice = activeTab === 'practice'

      // Practice: only fetch play-data + practice-settings in parallel. No goals. No session restore.
      // FSRS: fetch play-data + goals + session in parallel.
      const fetchPromises: Promise<any>[] = [
        axios.get(`/api/v1/deck/${id}/play-data${modeParam}`)
      ]

      if (isPractice) {
        // Merge practice-settings into the parallel batch instead of waterfall
        fetchPromises.push(
          axios.get(`/api/v1/deck/${id}/practice-settings`).catch(e => {
            console.error("Failed to load practice settings", e)
            return { data: null }
          })
        )
      } else {
        fetchPromises.push(
          axios.get('/api/v1/deck/goals/active', {
            params: { local_date: new Date().toISOString().slice(0, 10) }
          }).catch(e => {
            console.error("Failed to load active goals", e)
            return { data: [] }
          })
        )
        fetchPromises.push(
          axios.get(`/api/v1/deck/${id}/session`).catch(e => {
            console.error("Failed to load session", e)
            return { data: null }
          })
        )
      }

      const results = await Promise.all(fetchPromises)
      const quizRes = results[0]
      
      // Leaderboard is fetched via dynamic useEffect depending on time filter

      axios.get('/api/v1/stats/daily-comparison').then(res => {
        setDailyComparisonData(res.data?.days || [])
        setDailyComparisonAvg(res.data?.all_time_avg || null)
        setIsDailyComparisonLoading(false)
      }).catch(e => {
        console.error("Failed to load daily comparison", e)
        setIsDailyComparisonLoading(false)
      })

      const questions = quizRes.data.questions || []
      setSession({ ...quizRes.data, questions })

      const hasLearned = questions.some((q: any) => (q.stats?.total || 0) > 0);
      if (activeTab === 'practice' && practiceRange === 'learned' && !hasLearned) {
        setPracticeRange('all');
        localStorage.setItem('vocab_practice_range', 'all');
      }

      if (isPractice) {
        const settingsRes = results[1]
        if (settingsRes?.data) {
          setAvailableColumns(settingsRes.data.available_columns || [])
          const userSettings = settingsRes.data.user_settings
          const creatorSettings = settingsRes.data.creator_settings
          const isObjEmpty = (obj: any) => !obj || Object.keys(obj).length === 0;
          const parsed = !isObjEmpty(userSettings) ? userSettings : (!isObjEmpty(creatorSettings) ? creatorSettings : null)
          if (parsed) {
            setModeSettings(parsed)
            if (!parsed.mcq?.active_pairs || parsed.mcq.active_pairs.length === 0) {
              setPracticeNeedsSetup(true)
              if ((subMode as string) !== 'setting') {
                navigate(`/practice/${id}/setting`, { replace: true })
              }
              return
            }
            const currentModeSettings = parsed[subMode] || parsed.mcq || { active_pairs: [{ q: 'front', a: 'back' }], num_choices: 4 }
            setSetupPairs(currentModeSettings.active_pairs || [{ q: 'front', a: 'back' }])
            setSetupNumChoices(currentModeSettings.num_choices || 4)
          }
        }
      }

      setPromptInput(quizRes.data.ai_prompt || '')
      setInitialTotalXP(quizRes.data.user_total_xp || 0)
      setInitialTodayXP(quizRes.data.user_today_xp || 0)
      setInitialTodayTime(quizRes.data.user_today_time || 0)
      setInitialAllTimeTime(quizRes.data.user_all_time_time || 0)
      setPracticeNeedsSetup(!!quizRes.data.practice_needs_setup)
      setPracticeDisabled(!!quizRes.data.practice_disabled)

      if (isPractice) {
        if (currentIndex < 0) {
          const allIndices = questions.map((q: any, i: number) => q.is_ignored ? -1 : i).filter((i: number) => i !== -1);
          const learnedIndices = questions.map((q: any, i: number) => (!q.is_ignored && (q.stats?.total || 0) > 0) ? i : -1).filter((i: number) => i !== -1);
          const activeIndices = (practiceRange === 'learned' && learnedIndices.length > 0) ? learnedIndices : allIndices;
          const initialIdx = activeIndices.length > 0 ? activeIndices[Math.floor(Math.random() * activeIndices.length)] : 0;
          setCurrentIndex(initialIdx);
        }
      } else {
        // FSRS mode: apply goals + session
        const goalsRes = results[1]
        const sessionRes = results[2]

        const activeGoalData = goalsRes?.data?.find((g: any) => g.quiz_id === Number(id))
        if (activeGoalData) {
          setActiveGoal(activeGoalData)
        }

        if (sessionRes?.data) {
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

          // Adjust initial index based on smart learning mode if we are starting a fresh/unanswered question
          if (restoredAnswers[curIdx] === undefined) {
            const savedMode = localStorage.getItem('quiz_learning_mode') || 'fsrs'
            if (savedMode !== 'sequential') {
              let modeIdx = -1
              if (savedMode === 'fsrs') {
                const now = new Date()
                const scoredQuestions = questions.map((q: any, idx: number) => {
                  const isCurrentlyUnlocked = (() => {
                    if (!q.fsrs || !q.fsrs.due) return true;
                    return parseUTCDate(q.fsrs.due).getTime() - 30000 <= now.getTime();
                  })()
                  const hasAnswered = restoredAnswers[idx] !== undefined && !isCurrentlyUnlocked
                  if (hasAnswered) return { idx, score: -1000 }

                  const fsrs = q.fsrs
                  if (!fsrs || fsrs.state === 0 || fsrs.state === undefined || 
                      fsrs.stability === null || fsrs.stability === undefined || !fsrs.due) {
                    return { idx, score: 2 } // Priority 2: New Card
                  }

                  const dueDate = parseUTCDate(fsrs.due)
                  const isDue = dueDate <= now
                  const isLearning = fsrs.state === 1 || fsrs.state === 3

                  if (isDue || isLearning) {
                    return { idx, score: 3 + 1 / (1 + (fsrs.stability || 0)) } // Priority 3: Due/Learning reviews (lowest stability first)
                  } else {
                    return { idx, score: -1000 } // Not due yet = exclude completely
                  }
                })

                scoredQuestions.sort((a: any, b: any) => b.score - a.score)
                const best = scoredQuestions[0]
                if (best && best.score > -1000) {
                  modeIdx = best.idx
                }
              } else if (savedMode === 'unseen') {
                modeIdx = questions.findIndex((q: any, i: number) => (q.stats?.total || 0) === 0 && restoredAnswers[i] === undefined)
              } else if (savedMode === 'review') {
                modeIdx = questions.findIndex((q: any, i: number) => ((q.stats?.total || 0) - (q.stats?.correct || 0)) > 0 && restoredAnswers[i] === undefined)
              } else if (savedMode === 'hardest') {
                let minRatio = Infinity
                let maxWrongs = -1
                for (let i = 0; i < questions.length; i++) {
                  if (restoredAnswers[i] !== undefined) continue
                  const q = questions[i]
                  const t = q.stats?.total || 0
                  const c = q.stats?.correct || 0
                  const wrongs = t - c
                  if (t > 0) {
                    const ratio = c / t
                    if (ratio < minRatio) {
                      minRatio = ratio
                      maxWrongs = wrongs
                      modeIdx = i
                    } else if (ratio === minRatio && wrongs > maxWrongs) {
                      maxWrongs = wrongs
                      modeIdx = i
                    }
                  }
                }
              } else if (savedMode === 'random') {
                const pool = questions.map((_: any, i: number) => i).filter((i: number) => restoredAnswers[i] === undefined)
                if (pool.length > 0) {
                  modeIdx = pool[Math.floor(Math.random() * pool.length)]
                }
              }

              if (modeIdx !== -1) {
                curIdx = modeIdx
              }
            }
          }

          setCurrentIndex(curIdx)

          if (typeof restoredAnswers[curIdx] === 'number') {
            setSelectedOption(restoredAnswers[curIdx] as number);
            setShowFeedback(true);
          } else {
            setSelectedOption(null);
            setShowFeedback(false);
          }

          if (sessionRes.data.state?.sessionXP) {
            setSessionXP(sessionRes.data.state.sessionXP)
          }
          if (sessionRes.data.state?.streak) {
            setStreak(sessionRes.data.state.streak)
          }
        }
      }
    } catch (e) {
      navigate('/')
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
    } catch (e) { }
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
    } catch (e) { }
  }

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

    if (correct) {
      if (sfxEnabled) playCorrectSound()
      const confettiColors = streak >= 5 ? ['#f59e0b', '#ef4444', '#f97316'] : ['#6366f1', '#a855f7', '#ec4899']
      confetti({ zIndex: 9999, particleCount: streak >= 5 ? 250 : 150, spread: streak >= 5 ? 100 : 70, origin: { y: 0.6 }, colors: confettiColors })
      if (alreadyRated) setBadgeMessage("Chính xác! 🎯")
    } else {
      if (sfxEnabled) playIncorrectSound()
      if (alreadyRated) setBadgeMessage("Cố lên nhé! 💪")
    }
    
    if (alreadyRated) {
      setBadgeVisible(true)
      setTimeout(() => setBadgeVisible(false), 2000)
    }

    if (!alreadyRated) {
      const isFirstEver = prevTotal === 0
      const prevRatio = prevTotal > 0 ? prevCorrect / prevTotal : 0
      const usuallyCorrect = prevRatio >= 0.7 && prevTotal >= 2

      if (correct) {
        updatedStreak = streak + 1
        setStreak(updatedStreak)
        let baseXP = 0;
        if (rating === 4) baseXP = 7;
        else if (rating === 3) baseXP = 6;
        else if (rating === 2) baseXP = 5;
        
        let bonusXP = 0;
        if (isFirstEver) bonusXP += 10;
        if (updatedStreak >= 5) bonusXP += 1;
        
        const xpGained = baseXP + bonusXP;
        
        updatedXP = sessionXP + xpGained
        setSessionXP(updatedXP)
        addXp(xpGained)

        // Context-aware success messages
        let msg = ''
        if (isFirstEver) msg = `First Blood! 🎯 +${xpGained} XP`
        else if (updatedStreak >= 10) msg = `UNSTOPPABLE! 🔥 ${updatedStreak}-streak!`
        else if (updatedStreak >= 5) msg = `On Fire! 🔥 ${updatedStreak}-streak bonus!`
        else if (prevRatio < 0.5 && prevTotal >= 2) msg = `Redemption! 📈 You improved!`
        else if (prevRatio >= 0.9 && prevTotal >= 3) msg = `Consistent! ⭐ You always nail this`
        else msg = [`Brilliant! 🚀`, `Perfect! 🎯`, `Nailed it! ✨`, `Excellent! 🌈`][Math.floor(Math.random() * 4)]
        setBadgeMessage(msg)

        // XP float animation
        setXpFloat({ visible: true, amount: xpGained })
        setTimeout(() => setXpFloat({ visible: false, amount: 0 }), 1500)

        setAnswerContext({ wasCorrect: true, prevTotal, prevCorrect, timeTaken, avgTime, newStreak: updatedStreak, xpGained })
      } else {
        updatedStreak = 0
        setStreak(0)
        const xpGained = 1
        updatedXP = sessionXP + xpGained
        setSessionXP(updatedXP)
        addXp(xpGained)
        
        setXpFloat({ visible: true, amount: xpGained })
        setTimeout(() => setXpFloat({ visible: false, amount: 0 }), 1500)

        // Context-aware failure messages
        let msg = ''
        if (isFirstEver) msg = `First try! No worries 💪`
        else if (usuallyCorrect) msg = `Slip! You usually nail this 😅`
        else if (prevRatio === 0 && prevTotal >= 2) msg = `Keep at it! 📚 It'll click soon`
        else msg = [`Nice try! 💪`, `Learning mode! 📚`, `Almost! 🍀`, `Keep going! 🌻`][Math.floor(Math.random() * 4)]
        setBadgeMessage(msg)

        setAnswerContext({ wasCorrect: false, prevTotal, prevCorrect, timeTaken, avgTime, newStreak: 0, xpGained })
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

      // Immediately update local stats for real-time UI reflection
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
        if (rating === 1) localDue.setMinutes(localDue.getMinutes() + 1)   // Again: ~1m
        else if (rating === 2) localDue.setMinutes(localDue.getMinutes() + 5) // Hard: ~5m
        else if (rating === 3) localDue.setMinutes(localDue.getMinutes() + 10) // Good: ~10m
        else localDue.setDate(localDue.getDate() + 4) // Easy: ~4d

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
    }

    saveSession(newAnswers, currentIndex, updatedXP, updatedStreak)

    try {
      const res = await axios.post('/api/v1/deck/record_answer', {
        question_id: currentQuestion.id,
        is_correct: correct,
        rating: rating,
        time_spent: timeTaken,
        local_date: new Date().toISOString().slice(0, 10)
      })

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
    } catch (e) {
      console.error("Failed to record answer")
    }
  }

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
      updatedStreak = streak + 1;
      setStreak(updatedStreak);

      confetti({ zIndex: 9999, particleCount: 80, spread: 50, origin: { y: 0.6 } });
      setBadgeMessage("Chính xác! 🎯");

      // Trigger 10-streak milestone celebration in practice mode
      if (updatedStreak === 10) {
        setActiveMilestone({
          type: 'streak_10',
          title: '🔥 Perfect Streak!',
          message: 'Excellent concentration! You answered 10 practice cards correct in a row.'
        });
      }

      // Trigger Halfway completion milestone in practice mode
      const answeredCount = Object.keys(newAnswers).length;
      const totalCount = session?.questions?.length || 1;
      if (answeredCount === Math.floor(totalCount / 2) && totalCount > 4) {
        setActiveMilestone({
          type: 'halfway',
          title: '🎯 Halfway There!',
          message: `Great progress! You completed ${answeredCount}/${totalCount} cards in this practice session.`
        });
      }
    } else {
      if (sfxEnabled) playIncorrectSound();
      updatedStreak = 0;
      setStreak(0);
      setBadgeMessage("Chưa chính xác! 😅");
    }

    setBadgeVisible(true);
    setTimeout(() => setBadgeVisible(false), 2000);

    saveSession(newAnswers, currentIndex, updatedXP, updatedStreak, updatedTotalAnswered, updatedCorrectCount);

    try {
      const res = await axios.post('/api/v1/deck/record_answer', {
        question_id: currentQuestion.id,
        is_correct: isCorrect,
        is_practice: true,
        practice_mode: practiceSubMode,
        rating: isCorrect ? 3 : 1,
        time_spent: timeLeft,
        local_date: new Date().toISOString().slice(0, 10),
        session_streak: updatedStreak,
        is_first_ever: isFirstEver
      });
      
      const xpGained = res.data.xp_gained || 0;
      if (xpGained > 0) {
        setSessionXP(prev => prev + xpGained);
        addXp(xpGained);
        setXpFloat({ visible: true, amount: xpGained });
        setTimeout(() => setXpFloat({ visible: false, amount: 0 }), 1500);
      }
      
      // Update Goal Toast if returned from backend
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

        setTimeout(() => setGoalToast(null), 4000);
      }

      // Also re-fetch leaderboard in background to keep stats Completely dynamic and live!
      axios.get('/api/v1/stats/leaderboard', { params: { time_filter: leaderboardTimeFilter } })
        .then(lbRes => {
          setLeaderboardData(lbRes.data)
        })
        .catch(e => console.error("Failed to load leaderboard in background", e))

      axios.get('/api/v1/stats/daily-comparison')
        .then(dcRes => {
          setDailyComparisonData(dcRes.data.days || [])
        })
        .catch(e => console.error("Failed to load daily comparison in background", e))
      
    } catch (e) {
      console.error("Failed to record answer", e);
    }
    speakPracticeQuestionAndAnswer();
  };

  const handleIgnoreQuestion = async () => {
    if (!currentQuestion) return;
    try {
      const newIgnoreState = !currentQuestion.is_ignored;
      
      // Optimitically update local state
      const updatedQuestions = [...session.questions];
      updatedQuestions[currentIndex] = {
        ...currentQuestion,
        is_ignored: newIgnoreState
      };
      setSession({ ...session, questions: updatedQuestions });
      
      await axios.post(`/api/v1/deck/question/${currentQuestion.id}/ignore`, {
        is_ignored: newIgnoreState
      });
      
      // Auto-skip to next card if ignored during practice/learning
      if (newIgnoreState) {
        handleNext();
      }
    } catch (e) {
      console.error("Failed to ignore question", e);
      // Revert on failure
      const revertedQuestions = [...session.questions];
      revertedQuestions[currentIndex] = {
        ...currentQuestion,
        is_ignored: !currentQuestion.is_ignored
      };
      setSession({ ...session, questions: revertedQuestions });
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
      updatedStreak = streak + 1;
      setStreak(updatedStreak);

      confetti({ zIndex: 9999, particleCount: 100, spread: 60, origin: { y: 0.6 } });
      setBadgeMessage("Xuất sắc! ⌨️");
    } else {
      if (sfxEnabled) playIncorrectSound();
      updatedStreak = 0;
      setStreak(0);
      setBadgeMessage("Nhầm một chút rồi! 💪");
    }

    setBadgeVisible(true);
    setTimeout(() => setBadgeVisible(false), 2000);

    saveSession(newAnswers, currentIndex, updatedXP, updatedStreak, updatedTotalAnswered, updatedCorrectCount);

    try {
      const res = await axios.post('/api/v1/deck/record_answer', {
        question_id: currentQuestion.id,
        is_correct: isCorrect,
        is_practice: true,
        practice_mode: practiceSubMode,
        rating: isCorrect ? 3 : 1,
        time_spent: timeLeft,
        local_date: new Date().toISOString().slice(0, 10),
        session_streak: updatedStreak,
        is_first_ever: isFirstEver
      });
      
      const xpGained = res.data.xp_gained || 0;
      if (xpGained > 0) {
        setSessionXP(prev => prev + xpGained);
        addXp(xpGained);
        setXpFloat({ visible: true, amount: xpGained });
        setTimeout(() => setXpFloat({ visible: false, amount: 0 }), 1500);
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

        setTimeout(() => setGoalToast(null), 4000);
      }

      // Also re-fetch leaderboard in background to keep stats Completely dynamic and live!
      axios.get('/api/v1/stats/leaderboard', { params: { time_filter: leaderboardTimeFilter } })
        .then(lbRes => {
          setLeaderboardData(lbRes.data)
        })
        .catch(e => console.error("Failed to load leaderboard in background", e))

      axios.get('/api/v1/stats/daily-comparison')
        .then(dcRes => {
          setDailyComparisonData(dcRes.data.days || [])
        })
        .catch(e => console.error("Failed to load daily comparison in background", e))
    } catch (e) {
      console.error(e);
    }
    speakPracticeQuestionAndAnswer();
  };

  const navigateToQuestion = (idx: number, customPracticeAnswers = practiceAnswers) => {
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    window.speechSynthesis.cancel();

    setCurrentIndex(idx)
    setIsFlipped(false)
    setActivelyRatedCurrentCard(false)
    setJustAnswered(false)
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
    if (isPractice) {
      const prevAns = customPracticeAnswers[idx]
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

      const prevOpt = sessionAnswers[idx]
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
    saveSession(isPractice ? customPracticeAnswers : sessionAnswers, idx)
  }

  const handleNext = () => {
    if (!session || !session.questions) return

    const questions = session.questions
    const total = questions.length

    const getNextPracticeIndex = (currentIdx: number, range: 'all' | 'learned', totalQuestions: any[]): number => {
      const allIndices = totalQuestions.map((q, i) => q.is_ignored ? -1 : i).filter(i => i !== -1);
      const learnedIndices = totalQuestions.map((q, i) => (!q.is_ignored && (q.stats?.total || 0) > 0) ? i : -1).filter(i => i !== -1);

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

    let updatedAnswers = { ...sessionAnswers }

    // Fallback function to find the first unanswered card index in this session
    const getFirstUnanswered = (answers = updatedAnswers) => {
      for (let i = 0; i < total; i++) {
        if (answers[i] === undefined) return i
      }
      return -1
    }

    const currentMode = activeMode;

    let nextIdx = -1

    if (currentMode === 'fsrs') {
      const now = new Date()
      
      // 1. Identify studied cards that are due (or learning cards that are due)
      const dueCards = questions.map((q: any, idx: number) => {
        if (q.is_ignored) return null // Ignored card
        const fsrs = q.fsrs
        if (!fsrs || fsrs.state === 0 || fsrs.state === undefined || fsrs.stability === null || fsrs.stability === undefined) {
          return null // New card
        }
        // It is a studied card. Check if it is due.
        // Include clock drift safety buffer of 30 seconds
        const dueDate = parseUTCDate(fsrs.due)
        const isDue = dueDate.getTime() - 30000 <= now.getTime()
        
        // If it has been answered in this session, check if it is still due (unlocked)
        const hasAnswered = updatedAnswers[idx] !== undefined
        if (hasAnswered && !isDue) {
          return null // Answered and not due yet
        }
        
        if (isDue) {
          return { idx, stability: fsrs.stability || 0 }
        }
        return null
      }).filter(Boolean) as { idx: number; stability: number }[]

      if (dueCards.length > 0) {
        // Sort by stability ascending (lowest stability = hardest card first)
        dueCards.sort((a, b) => a.stability - b.stability)
        nextIdx = dueCards[0].idx
        console.log("DEBUG FSRS: Found due card, choosing index:", nextIdx, "stability:", dueCards[0].stability)
      } else {
        // 2. If no due cards, get the first new card sequentially
        const newCardIdx = questions.findIndex((q: any, idx: number) => {
          if (q.is_ignored) return false
          const fsrs = q.fsrs
          const isNew = !fsrs || fsrs.state === 0 || fsrs.state === undefined || fsrs.stability === null || fsrs.stability === undefined
          const hasNotAnswered = updatedAnswers[idx] === undefined
          return isNew && hasNotAnswered
        })
        
        if (newCardIdx !== -1) {
          nextIdx = newCardIdx
          console.log("DEBUG FSRS: No due cards, choosing first new card sequentially at index:", nextIdx)
        } else {
          console.log("DEBUG FSRS: No due cards and no new cards left.")
        }
      }
    } else if (currentMode === 'sequential') {
      // Find the first unanswered card starting from the next index sequentially
      let found = -1;
      for (let i = currentIndex + 1; i < total; i++) {
        if (updatedAnswers[i] === undefined && !questions[i].is_ignored) {
          found = i;
          break;
        }
      }
      // If not found, wrap around to search from the beginning
      if (found === -1) {
        for (let i = 0; i <= currentIndex; i++) {
          if (updatedAnswers[i] === undefined && !questions[i].is_ignored) {
            found = i;
            break;
          }
        }
      }
      nextIdx = found !== -1 ? found : Math.min(currentIndex + 1, total - 1);
    } else if (currentMode === 'random') {
      // Find a random index not answered in THIS session
      const pool = questions.map((_: any, i: number) => i).filter((i: number) => updatedAnswers[i] === undefined && !questions[i].is_ignored)
      if (pool.length > 0) {
        nextIdx = pool[Math.floor(Math.random() * pool.length)]
      }
    } else if (activeMode === 'unseen') {
      // Find next card with 0 historical attempts and not answered in THIS session
      nextIdx = questions.findIndex((q: any, i: number) =>
        i > currentIndex && !q.is_ignored &&
        (q.stats?.total || 0) === 0 &&
        updatedAnswers[i] === undefined
      )
      if (nextIdx === -1) {
        // Loop back to find any unseen
        nextIdx = questions.findIndex((q: any, i: number) =>
          !q.is_ignored && (q.stats?.total || 0) === 0 &&
          updatedAnswers[i] === undefined
        )
      }
    } else if (activeMode === 'review') {
      // Find next card with historical mistakes (total - correct > 0) and not answered in THIS session
      nextIdx = questions.findIndex((q: any, i: number) =>
        i > currentIndex && !q.is_ignored &&
        ((q.stats?.total || 0) - (q.stats?.correct || 0)) > 0 &&
        updatedAnswers[i] === undefined
      )
      if (nextIdx === -1) {
        // Loop back to find any mistake card not answered in THIS session
        nextIdx = questions.findIndex((q: any, i: number) =>
          !q.is_ignored && ((q.stats?.total || 0) - (q.stats?.correct || 0)) > 0 &&
          updatedAnswers[i] === undefined
        )
      }
    } else if (activeMode === 'hardest') {
      // Find the unanswered card in this session with the lowest correctness ratio.
      let bestIdx = -1
      let minRatio = Infinity
      let maxWrongs = -1

      for (let i = 0; i < total; i++) {
        if (updatedAnswers[i] !== undefined || questions[i].is_ignored) continue

        const q = questions[i]
        const t = q.stats?.total || 0
        const c = q.stats?.correct || 0
        const wrongs = t - c

        if (t > 0) {
          const ratio = c / t
          if (ratio < minRatio) {
            minRatio = ratio
            maxWrongs = wrongs
            bestIdx = i
          } else if (ratio === minRatio && wrongs > maxWrongs) {
            maxWrongs = wrongs
            bestIdx = i
          }
        }
      }

      nextIdx = bestIdx
    }

    // Fallback: If no candidate was found for the active mode, fall back to next unanswered card in this session,
    // or simply currentIndex + 1 if everything is answered
    if (nextIdx === -1) {
      nextIdx = getFirstUnanswered()
    }
    if (nextIdx === -1) {
      nextIdx = Math.min(currentIndex + 1, total - 1)
    }

    navigateToQuestion(nextIdx)
  }

  const applyLearningMode = (mode: string) => {
    setActiveMode(mode)
    localStorage.setItem('quiz_learning_mode', mode)
    setIsModeMenuOpen(false)

    if (!session || !session.questions) return

    const questions = session.questions
    const total = questions.length

    // If the current question is already answered (feedback is shown), 
    // we don't jump immediately. The next question will automatically follow the new mode.
    if (showFeedback) return

    let targetIdx = -1
    let alertMsg = ''
    let updatedAnswers = mainTab === 'practice' ? { ...practiceAnswers } : { ...sessionAnswers }

    if (mode === 'fsrs') {
      const now = new Date()
      const scoredQuestions = questions.map((q: any, idx: number) => {
        const isCurrentlyUnlocked = (() => {
          if (!q.fsrs || !q.fsrs.due) return true;
          return parseUTCDate(q.fsrs.due).getTime() - 30000 <= now.getTime();
        })()
        const hasAnswered = updatedAnswers[idx] !== undefined && !isCurrentlyUnlocked
        if (hasAnswered) return { idx, score: -1000 }

        const fsrs = q.fsrs
        if (!fsrs || fsrs.state === 0 || fsrs.state === undefined || 
            fsrs.stability === null || fsrs.stability === undefined || !fsrs.due) {
          return { idx, score: 2 } // Priority 2: New Card
        }

        const dueDate = parseUTCDate(fsrs.due)
        const isDue = dueDate <= now
        const isLearning = fsrs.state === 1 || fsrs.state === 3

        if (isDue || isLearning) {
          return { idx, score: 3 + 1 / (1 + (fsrs.stability || 0)) } // Priority 3: Due reviews
        } else {
          return { idx, score: -1000 } // Not due yet = exclude completely
        }
      })

      scoredQuestions.sort((a: any, b: any) => b.score - a.score)
      const best = scoredQuestions[0]
      if (best && best.score > -1000) {
        targetIdx = best.idx
      }
    } else if (mode === 'unseen') {
      targetIdx = questions.findIndex((q: any, i: number) =>
        (q.stats?.total || 0) === 0 &&
        updatedAnswers[i] === undefined
      )
      if (targetIdx === -1) {
        alertMsg = 'All cards have been attempted! Serving remaining cards sequentially.'
      }
    } else if (mode === 'review') {
      targetIdx = questions.findIndex((q: any, i: number) =>
        ((q.stats?.total || 0) - (q.stats?.correct || 0)) > 0 &&
        updatedAnswers[i] === undefined
      )
      if (targetIdx === -1) {
        alertMsg = "No incorrect cards found yet! We'll serve questions sequentially until mistakes are recorded."
      }
    } else if (mode === 'hardest') {
      let bestIdx = -1
      let minRatio = Infinity
      let maxWrongs = -1

      for (let i = 0; i < total; i++) {
        if (updatedAnswers[i] !== undefined) continue

        const q = questions[i]
        const t = q.stats?.total || 0
        const c = q.stats?.correct || 0
        const wrongs = t - c

        if (t > 0) {
          const ratio = c / t
          if (ratio < minRatio) {
            minRatio = ratio
            maxWrongs = wrongs
            bestIdx = i
          } else if (ratio === minRatio && wrongs > maxWrongs) {
            maxWrongs = wrongs
            bestIdx = i
          }
        }
      }

      if (bestIdx !== -1) {
        targetIdx = bestIdx
      } else {
        alertMsg = 'No attempted cards found yet! Serving sequentially until difficulty stats are gathered.'
      }
    } else if (mode === 'random') {
      if (updatedAnswers[currentIndex] === undefined) {
        targetIdx = currentIndex
      } else {
        const pool = questions.map((_: any, i: number) => i).filter((i: number) => updatedAnswers[i] === undefined)
        if (pool.length > 0) {
          targetIdx = pool[Math.floor(Math.random() * pool.length)]
        }
      }
    } else if (mode === 'sequential') {
      // Find the first unanswered card starting from the next index sequentially
      let found = -1;
      for (let i = currentIndex + 1; i < total; i++) {
        if (updatedAnswers[i] === undefined) {
          found = i;
          break;
        }
      }
      if (found === -1) {
        for (let i = 0; i <= currentIndex; i++) {
          if (updatedAnswers[i] === undefined) {
            found = i;
            break;
          }
        }
      }
      targetIdx = found !== -1 ? found : Math.min(currentIndex + 1, total - 1);
    }

    if (alertMsg) {
      setLearningModeAlert({
        visible: true,
        message: alertMsg,
        type: 'info'
      })
      setTimeout(() => {
        setLearningModeAlert(prev => prev ? { ...prev, visible: false } : null)
      }, 4500)
    }

    if (targetIdx !== -1 && targetIdx !== currentIndex) {
      navigateToQuestion(targetIdx)
    }
  }

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
          } catch (e) { }

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
      alert("AI service unavailable.")
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
          // If not valid JSON, save as string
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



  const renderPracticeScreen = () => {
    const practiceData = currentPracticeData;
    if (!currentQuestion || !practiceData) {
      return (
        <div className="flex-1 bg-white md:rounded-[2rem] rounded-[1.25rem] border border-slate-100 flex items-center justify-center font-bold text-slate-400">
          Chưa có câu hỏi luyện tập nào sẵn sàng...
        </div>
      );
    }

    const { question, choices, choice_item_ids, correct_index, correct_answer, question_key, answer_key } = practiceData;
    const answered = practiceAnswers[currentIndex] !== undefined;

    if (!question || !correct_answer) {
      return (
        <div className="flex-1 bg-white md:rounded-[2rem] rounded-[1.25rem] border border-slate-100 p-8 flex flex-col items-center justify-center text-center gap-4 shadow-2xl shadow-indigo-100/40">
          <div className="w-16 h-16 bg-amber-50 rounded-2xl border border-amber-100 flex items-center justify-center text-amber-500 mb-2">
            <Sliders className="w-8 h-8 animate-pulse" />
          </div>
          <h3 className="text-lg font-black text-slate-800">Chưa thiết lập Cặp cột Hỏi-Đáp</h3>
          <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
            Hệ thống chưa tìm thấy dữ liệu Hỏi-Đáp phù hợp. Vui lòng thiết lập Cặp cột câu hỏi để bắt đầu luyện tập nhé!
          </p>
          <button 
            onClick={() => navigate(`/practice/${id}/setting`)}
            className="flex-1 py-4 px-6 bg-slate-50 hover:bg-slate-100 text-slate-700 font-black text-[13px] rounded-2xl transition-all shadow-sm border border-slate-200 flex items-center justify-center gap-2"
          >
            <span>Thiết lập Cấu hình ⚙️</span>
          </button>
        </div>
      );
    }

    return (
      <div className="flex-1 bg-white md:rounded-[2rem] rounded-[1.25rem] border border-slate-100 md:p-6 md:pt-4 p-4 pt-3 flex flex-col justify-between shadow-2xl shadow-indigo-100/40 min-h-0 overflow-y-auto">

        {/* Premium Question Card container for better space usage and rich aesthetics */}
        <div className="w-full max-w-3xl mx-auto py-1 text-center animate-in fade-in slide-in-from-top-3 duration-500">
          <div className="w-full bg-white border-2 border-indigo-100/80 rounded-[2rem] p-5 md:p-6 shadow-sm flex flex-col items-center justify-center text-center gap-4 relative overflow-hidden mb-1">
            <div className="absolute top-[-10%] left-[-10%] w-[30%] h-[30%] rounded-full bg-indigo-50/20 blur-2xl pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] rounded-full bg-pink-50/20 blur-2xl pointer-events-none" />

            {showImages && currentQuestion.image && practiceSubMode !== 'listening' && (
              <img
                src={currentQuestion.image}
                alt="Question"
                className="max-h-32 object-contain rounded-xl mb-2 border border-slate-100 shadow-sm bg-white p-1"
              />
            )}

            {practiceSubMode === 'listening' ? (
              <div className="flex flex-col items-center gap-3">
                <div
                  onClick={() => {
                    const { question: qText, question_key: qKey } = practiceData!;
                    if (qKey === 'front') {
                      playCardAudio('front');
                    } else {
                      speakMultiLanguage(qText);
                    }
                  }}
                  className="relative w-20 h-20 rounded-full bg-white border border-indigo-100 flex items-center justify-center shadow-lg shadow-indigo-100/50 hover:bg-indigo-50 active:scale-95 transition-all cursor-pointer group"
                  title="Nhấn để nghe lại"
                >
                  <div className="absolute inset-0 rounded-full bg-indigo-400/10 animate-ping" />
                  <div className="absolute inset-2 rounded-full bg-indigo-300/20 animate-pulse" />
                  <Play className="w-7 h-7 text-indigo-600 fill-indigo-600 group-hover:scale-110 transition-transform" />
                </div>
                <span className="text-[9px] font-black text-indigo-500 tracking-widest uppercase mt-1">NHẤN ĐỂ NGHE PHÁT ÂM</span>
              </div>
            ) : (
                <h2 className="text-xl md:text-2xl lg:text-3xl font-black text-slate-800 leading-snug max-w-2xl px-2">
                  <span dangerouslySetInnerHTML={{ __html: parseBBCodeToHtml(question || '') }} />
                </h2>
            )}
          </div>
        </div>

        <div className="w-full max-w-3xl mx-auto pt-6 border-t border-slate-100">
          {['mcq', 'listening'].includes(practiceSubMode) && choices && (
            <div className="grid grid-cols-1 gap-3.5 mb-4">
              {choices.map((choice: string, idx: number) => {
                const isSelected = selectedOption === idx;
                const isCorrectChoice = idx === correct_index;

                let btnStyle = "border-slate-200 hover:bg-slate-50/50 hover:border-indigo-200 text-slate-700 active:scale-[0.99] ";

                if (answered) {
                  if (isCorrectChoice) {
                    btnStyle = "bg-gradient-to-r from-emerald-500 to-teal-500 border-emerald-600 text-white shadow-lg shadow-emerald-100 scale-[1.015] ";
                  } else if (isSelected) {
                    btnStyle = "bg-gradient-to-r from-rose-500 to-pink-500 border-rose-600 text-white shadow-lg shadow-rose-100 ";
                  } else {
                    btnStyle = "border-slate-100 bg-slate-50/50 opacity-60 text-slate-500 hover:opacity-100 hover:bg-slate-50 hover:shadow-sm cursor-pointer ";
                  }
                }

                return (
                  <button
                    key={idx}
                    onClick={() => {
                      if (!answered) {
                        handleMCQAnswer(idx);
                      } else {
                        if (choice_item_ids && session?.questions) {
                          const selectedId = choice_item_ids[idx];
                          const qData = session.questions.find((q: any) => q.id === selectedId);
                          if (qData) {
                            setSelectedChoiceData(qData);
                            setActiveFeedbackTab('card');
                            setIsFeedbackOpen(true);
                          }
                        }
                      }
                    }}
                    className={cn(
                      "group p-5 md:p-6 rounded-[2rem] border text-left font-extrabold text-base md:text-xl transition-all duration-300 flex items-center justify-between gap-4 min-h-[72px] shadow-sm",
                      btnStyle
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <span className={cn(
                        "w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black border flex-shrink-0 transition-colors duration-300",
                        answered && isCorrectChoice ? "bg-white text-emerald-600 border-emerald-400 shadow-sm" :
                          answered && isSelected ? "bg-white text-rose-600 border-rose-400 shadow-sm" :
                            "bg-white border-slate-200 text-slate-400 shadow-sm group-hover:border-indigo-300 group-hover:text-indigo-600"
                      )}>
                        {idx + 1}
                      </span>
                      <span className="leading-snug" dangerouslySetInnerHTML={{ __html: parseBBCodeToHtml(choice) }} />
                    </div>

                    {answered && isCorrectChoice && (
                      <Check className="w-5 h-5 stroke-[3] text-white flex-shrink-0" />
                    )}
                    {answered && isSelected && !isCorrectChoice && (
                      <X className="w-5 h-5 stroke-[3] text-white flex-shrink-0" />
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
                "fixed bottom-32 md:bottom-auto md:top-1/3 left-1/2 -translate-x-1/2 z-[1001] px-6 py-3 rounded-2xl font-black text-base shadow-2xl pointer-events-none transition-all duration-300",
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

      <header className="sticky top-0 flex-shrink-0 z-[120] bg-white/95 backdrop-blur-2xl border-b border-slate-100/80 pl-3 pr-1 md:px-4 py-1.5 flex items-center justify-between shadow-[0_1px_20px_rgba(99,102,241,0.04)]">
        <div className="flex items-center gap-2 font-sans min-w-0 flex-1 mr-2 md:mr-4">
          <button 
            onClick={() => navigate('/')} 
            className="w-8.5 h-8.5 flex items-center justify-center bg-slate-50 border border-slate-200/60 rounded-xl text-slate-600 shadow-sm hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-100 active:scale-90 transition-all flex-shrink-0"
            title="Quay lại thư viện"
          >
            <ChevronLeft className="w-4.5 h-4.5" />
          </button>
          <div className="flex flex-col min-w-0">
            <h1 className="text-xs md:text-sm font-extrabold text-slate-800 tracking-tight break-words line-clamp-2 leading-snug" title={session.title}>
              {session.title}
            </h1>
            {streak >= 2 && (
              <div className="flex items-center mt-0.5 text-[9px] font-bold text-orange-500" title="Chuỗi ngày học liên tục">
                🔥 {streak} ngày
              </div>
            )}
          </div>
        </div>
      
        {/* Live Dashboard HUD - Clean Light Ticker Style */}
        <div className="bg-slate-100/50 border border-slate-200/40 rounded-xl p-0.5 flex items-center gap-0.5 md:gap-1.5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] flex-shrink-0 mr-0.5 md:mr-0">
          {/* Item 1: Daily Goal progress */}
          <div className="flex items-center bg-white/90 border border-slate-200/30 rounded-lg p-0.5 pr-1 md:pr-1.5 shadow-sm min-w-[52px] xs:min-w-[56px] md:min-w-[66px]" title="Mục tiêu ôn tập hàng ngày">
            <div className="w-4 h-4 md:w-5 md:h-5 flex items-center justify-center bg-indigo-50 text-indigo-600 rounded mr-0.5 md:mr-1 flex-shrink-0">
              <Target className="w-2.5 h-2.5 md:w-3 md:h-3" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[5.5px] md:text-[6.5px] text-slate-400 font-extrabold uppercase tracking-wider leading-none">Goal</span>
              <div className="h-2.5 md:h-3 overflow-hidden relative min-w-[20px]">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={activeGoal ? `${activeGoal.done_today}/${activeGoal.daily_target}` : 'none'}
                    initial={{ y: 8, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -8, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 350, damping: 18 }}
                    className="text-[7.5px] md:text-[8.5px] font-black text-slate-700 leading-none block truncate"
                  >
                    {activeGoal ? `${activeGoal.done_today}/${activeGoal.daily_target}` : '--'}
                  </motion.span>
                </AnimatePresence>
              </div>
            </div>
          </div>
      
          {/* Item 2: Cards left to study/review */}
          <div className="flex items-center bg-white/90 border border-slate-200/30 rounded-lg p-0.5 pr-1 md:pr-1.5 shadow-sm min-w-[52px] xs:min-w-[56px] md:min-w-[66px]" title="Số thẻ ôn tập/học còn lại">
            <div className="w-4 h-4 md:w-5 md:h-5 flex items-center justify-center bg-rose-50 text-rose-600 rounded mr-0.5 md:mr-1 flex-shrink-0">
              <Brain className="w-2.5 h-2.5 md:w-3 md:h-3" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[5.5px] md:text-[6.5px] text-slate-400 font-extrabold uppercase tracking-wider leading-none">Left</span>
              <div className="h-2.5 md:h-3 overflow-hidden relative min-w-[15px]">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={session?.questions ? Math.max(0, session.questions.length - currentIndex) : 0}
                    initial={{ y: 8, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -8, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 350, damping: 18 }}
                    className="text-[7.5px] md:text-[8.5px] font-black text-slate-700 leading-none block truncate"
                  >
                    {session?.questions ? Math.max(0, session.questions.length - currentIndex) : 0}
                  </motion.span>
                </AnimatePresence>
              </div>
            </div>
          </div>
      
          {/* Item 3: Timer */}
          <div 
            onClick={toggleTimeMode}
            className="flex items-center bg-white/90 border border-slate-200/30 rounded-lg p-0.5 pr-1 md:pr-1.5 shadow-sm min-w-[52px] xs:min-w-[56px] md:min-w-[66px] cursor-pointer active:scale-95 transition-all select-none hover:bg-slate-50" 
            title={
              timeMode === 'card' 
                ? "Thời gian học thẻ này - Click để chuyển sang thời gian ngày"
                : timeMode === 'today'
                  ? "Thời gian học trong ngày - Click để chuyển sang tổng thời gian"
                  : "Tổng thời gian học toàn bộ - Click để chuyển sang thời gian thẻ này"
            }
          >
            <div className="w-4 h-4 md:w-5 md:h-5 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded mr-0.5 md:mr-1 flex-shrink-0">
              <Clock className="w-2.5 h-2.5 md:w-3 md:h-3" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[5.5px] md:text-[6.5px] text-slate-400 font-extrabold uppercase tracking-wider leading-none">
                {timeMode === 'card' ? 'Time' : timeMode === 'today' ? 'Today' : 'Total'}
              </span>
              <div className="h-2.5 md:h-3 overflow-hidden relative min-w-[15px]">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={
                      timeMode === 'card' 
                        ? timeLeft 
                        : timeMode === 'today' 
                          ? initialTodayTime + sessionStudyTime 
                          : initialAllTimeTime + sessionStudyTime
                    }
                    initial={{ y: 8, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -8, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 350, damping: 18 }}
                    className="text-[7.5px] md:text-[8.5px] font-black text-slate-700 leading-none block truncate"
                  >
                    {
                      timeMode === 'card' 
                        ? `${timeLeft}s` 
                        : timeMode === 'today' 
                          ? formatHeaderTime(initialTodayTime + sessionStudyTime) 
                          : formatHeaderTime(initialAllTimeTime + sessionStudyTime)
                    }
                  </motion.span>
                </AnimatePresence>
              </div>
            </div>
          </div>
      
          {/* Item 4: Current user score */}
          <div 
            onClick={toggleScoreMode}
            className="flex items-center bg-white/90 border border-slate-200/30 rounded-lg p-0.5 pr-1 md:pr-1.5 shadow-sm min-w-[52px] xs:min-w-[56px] md:min-w-[66px] cursor-pointer active:scale-95 transition-all select-none hover:bg-slate-50" 
            title={
              scoreMode === 'all' 
                ? "Điểm số toàn bộ (XP) - Click để chuyển sang điểm ngày"
                : "Điểm số trong ngày (XP) - Click để chuyển sang toàn bộ điểm"
            }
          >
            <div className="w-4 h-4 md:w-5 md:h-5 flex items-center justify-center bg-amber-50 text-amber-600 rounded mr-0.5 md:mr-1 flex-shrink-0">
              <Trophy className="w-2.5 h-2.5 md:w-3 md:h-3" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[5.5px] md:text-[6.5px] text-slate-400 font-extrabold uppercase tracking-wider leading-none">
                {scoreMode === 'all' ? 'Score' : 'Today'}
              </span>
              <div className="h-2.5 md:h-3 overflow-hidden relative min-w-[25px]">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={scoreMode === 'all' ? gamify.xp : initialTodayXP + sessionXP}
                    initial={{ y: 8, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -8, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 350, damping: 18 }}
                    className="text-[7.5px] md:text-[8.5px] font-black text-slate-700 leading-none block truncate"
                  >
                    {
                      scoreMode === 'all' 
                        ? gamify.xp.toLocaleString() 
                        : (initialTodayXP + sessionXP).toLocaleString()
                    }
                  </motion.span>
                </AnimatePresence>
              </div>
            </div>
          </div>

        </div>
      </header>

      {/* Dynamic Mode Switcher Bar */}
      <div className="flex-shrink-0 bg-white/80 backdrop-blur-md border-b border-slate-100/50 px-4 lg:px-8 py-1.5 md:py-2 flex flex-col md:flex-row items-center justify-between gap-2 md:gap-3 z-50 w-full shadow-sm">
        {/* Left Side: Branding */}
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-500 animate-bounce" />
          <span className="text-xs font-black text-slate-700 tracking-wider uppercase">Luyện tập (Practice Mode)</span>
        </div>

        {/* Right Side: Sub-mode Selector for Practice Tab */}
        {!practiceNeedsSetup && !practiceDisabled && (
          <div
            className="flex items-center gap-2.5 overflow-x-auto w-full md:w-auto scrollbar-none [&::-webkit-scrollbar]:hidden py-0.5 justify-center flex-nowrap"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {/* Mode Range Selector (Tất cả vs Đã học) */}
            <div className="flex bg-slate-100/60 p-0.5 rounded-xl border border-slate-200/30 shadow-inner flex-shrink-0">
              <button
                onClick={() => {
                  setPracticeRange('all');
                  localStorage.setItem('vocab_practice_range', 'all');
                }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-200 flex items-center gap-1.5",
                  practiceRange === 'all'
                    ? "bg-white text-indigo-600 shadow-sm border border-slate-200/10"
                    : "text-slate-500 hover:text-slate-700"
                )}
                title="Random (All)"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Random (All)</span>
              </button>

              <button
                onClick={() => {
                  const learnedIndices = session?.questions?.map((q: any, i: number) => (q.stats?.total || 0) > 0 ? i : -1).filter((i: number) => i !== -1) || [];
                  if (learnedIndices.length === 0) {
                    setLearningModeAlert({
                      visible: true,
                      message: "You haven't learned any cards in this deck yet! Automatically switching to 'Random (All)' mode.",
                      type: 'warning'
                    });
                    setTimeout(() => {
                      setLearningModeAlert(prev => prev ? { ...prev, visible: false } : null);
                    }, 4500);
                    return;
                  }
                  setPracticeRange('learned');
                  localStorage.setItem('vocab_practice_range', 'learned');

                  // If current card is not in learned pool, jump to first learned card
                  if (!learnedIndices.includes(currentIndex)) {
                    navigateToQuestion(learnedIndices[0]);
                  }
                }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-200 flex items-center gap-1.5",
                  practiceRange === 'learned'
                    ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                )}
                title="Practice (Learned)"
              >
                <ListOrdered className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Practice (Learned)</span>
              </button>
            </div>

            <div className="w-px h-6 bg-slate-200 flex-shrink-0" />

            <div className="flex bg-slate-100/60 p-0.5 rounded-xl border border-slate-200/30 flex-shrink-0">
              <button
                onClick={() => {
                  setPracticeAnswers({});
                  setSelectedOption(null);
                  setShowFeedback(false);
                  navigate(`/practice/${id}/mcq`, { replace: true });
                  fetchSession('practice', 'mcq');
                }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-200 flex items-center gap-1.5",
                  practiceSubMode === 'mcq'
                    ? "bg-white text-indigo-600 shadow-sm border border-slate-200/10"
                    : "text-slate-500 hover:text-slate-700"
                )}
                title="MCQ"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span className="hidden md:inline">MCQ</span>
              </button>

              <button
                onClick={() => {
                  setPracticeAnswers({});
                  setSelectedOption(null);
                  setShowFeedback(false);
                  navigate(`/practice/${id}/typing`, { replace: true });
                  fetchSession('practice', 'typing');
                }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-200 flex items-center gap-1.5",
                  practiceSubMode === 'typing'
                    ? "bg-white text-indigo-600 shadow-sm border border-slate-200/10"
                    : "text-slate-500 hover:text-slate-700"
                )}
                title="Typing"
              >
                <Keyboard className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Typing</span>
              </button>

              <button
                onClick={() => {
                  setPracticeAnswers({});
                  setSelectedOption(null);
                  setShowFeedback(false);
                  navigate(`/practice/${id}/listening`, { replace: true });
                  fetchSession('practice', 'listening');
                }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-200 flex items-center gap-1.5",
                  practiceSubMode === 'listening'
                    ? "bg-white text-indigo-600 shadow-sm border border-slate-200/10"
                    : "text-slate-500 hover:text-slate-700"
                )}
                title="Listening"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Listening</span>
              </button>
            </div>

            <button
              onClick={() => navigate(`/practice/${id}/setting`)}
              className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-lg bg-slate-50 border border-slate-200 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 active:scale-95 transition-all shadow-sm"
              title="Cấu hình cặp cột Hỏi-Đáp"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      <main className="flex-1 flex w-full max-w-none justify-center gap-4 lg:gap-8 px-2 lg:px-6 xl:px-10 md:py-3 py-2 overflow-hidden">
        <aside className="hidden xl:flex w-[340px] 2xl:w-[440px] flex-shrink-0 flex-col overflow-hidden bg-white border border-slate-100 rounded-[2.5rem] shadow-sm">
          {showFeedback ? (
            <FeedbackArea
              showFeedback={showFeedback}
              activeFeedbackTab={activeFeedbackTab}
              setActiveFeedbackTab={setActiveFeedbackTab}
              selectedChoiceData={selectedChoiceData}
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
                                <span className="font-black text-indigo-650 w-5 text-center text-[10px]">
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
                    <p className="text-[10px] text-slate-400 text-center py-2">Chưa có dữ liệu xếp hạng nào.</p>
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
                  <div className="perspective-1000 w-full h-full flex-1 relative min-h-0">
                    <div
                      className="preserve-3d w-full h-full relative transition-transform duration-700 ease-out-quint"
                      style={{
                        transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                        transformStyle: 'preserve-3d',
                      }}
                    >
                      {/* FRONT SIDE */}
                      <div
                        className="absolute inset-0 backface-hidden bg-white md:rounded-[2rem] rounded-[1.25rem] border border-slate-100 px-4 md:px-8 pt-1.5 md:pt-2 pb-3 md:pb-4 flex flex-col justify-between shadow-2xl shadow-indigo-100/40"
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
                          {showImages && (currentQuestion?.image || currentQuestion?.others?.front_img) && (
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
                        </div>

                        {/* Bottom Hint */}
                        <div className="flex flex-col items-center justify-center gap-2">
                          <span className="text-[10px] font-black text-indigo-500 tracking-[0.2em] uppercase animate-pulse">
                            Click card or press Space to reveal answer
                          </span>
                          {currentQuestion?.fsrs?.due && (
                            <span className="text-[8px] font-bold text-slate-400">
                              Next due: {parseUTCDate(currentQuestion.fsrs.due).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* BACK SIDE */}
                      <div
                        className="absolute inset-0 backface-hidden bg-white md:rounded-[2rem] rounded-[1.25rem] border border-slate-200 px-4 md:px-8 pt-1.5 md:pt-2 pb-3 md:pb-4 flex flex-col justify-between shadow-2xl shadow-indigo-100/40"
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

                          {showImages && currentQuestion?.others?.back_img && (
                            <div className="space-y-2">
                              <img
                                src={currentQuestion.others.back_img}
                                alt="Back Visual"
                                className="max-h-40 md:max-h-48 object-contain rounded-3xl border border-slate-100/80 shadow-md bg-slate-50/50 p-1.5 animate-in zoom-in-95 duration-500"
                              />
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
                            'bg-amber-500 shadow-amber-500/50',
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
                                 <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider truncate">State</span>
                                 <span className={cn("px-1.5 py-0.5 rounded-lg border text-[9.5px] sm:text-[11px] font-black uppercase tracking-wider flex items-center gap-0.5 truncate transition-all duration-300", stateColors[stateIdx])}>
                                   <span className={cn("w-1 h-1 rounded-full animate-pulse", stateDots[stateIdx])} />
                                   {stateLabels[stateIdx]}
                                 </span>
                               </div>
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
                        {isFlipped && !hasRated && (
                          <div
                            className="grid grid-cols-4 gap-1.5 sm:gap-3 mt-4 relative z-[10]"
                            onClick={(e) => {
                              console.log("DEBUG CLICK: FSRS Buttons Grid clicked! target:", e.target);
                            }}
                          >
                            {/* AGAIN BUTTON */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                console.log("DEBUG CLICK: AGAIN button clicked!");
                                handleReviewRating(1);
                              }}
                              className={getButtonClass(0)}
                            >
                              <span className={cn("text-[9px] sm:text-[10px] font-black tracking-wider transition-colors duration-200", hasRated && selectedOption === 0 ? "text-white" : "text-rose-500")}>AGAIN</span>
                              <span className={cn("text-[10.5px] sm:text-xs font-black transition-colors duration-200", hasRated && selectedOption === 0 ? "text-rose-100" : "text-rose-600")}>
                                {currentQuestion?.fsrs?.intervals?.[1] || "1m"}
                              </span>
                            </button>

                            {/* HARD BUTTON */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                console.log("DEBUG CLICK: HARD button clicked!");
                                handleReviewRating(2);
                              }}
                              className={getButtonClass(1)}
                            >
                              <span className={cn("text-[9px] sm:text-[10px] font-black tracking-wider transition-colors duration-200", hasRated && selectedOption === 1 ? "text-white" : "text-amber-500")}>HARD</span>
                              <span className={cn("text-[10.5px] sm:text-xs font-black transition-colors duration-200", hasRated && selectedOption === 1 ? "text-amber-100" : "text-amber-600")}>
                                {currentQuestion?.fsrs?.intervals?.[2] || "5m"}
                              </span>
                            </button>

                            {/* GOOD BUTTON */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                console.log("DEBUG CLICK: GOOD button clicked!");
                                handleReviewRating(3);
                              }}
                              className={getButtonClass(2)}
                            >
                              <span className={cn("text-[9px] sm:text-[10px] font-black tracking-wider transition-colors duration-200", hasRated && selectedOption === 2 ? "text-white" : "text-indigo-500")}>GOOD</span>
                              <span className={cn("text-[10.5px] sm:text-xs font-black transition-colors duration-200", hasRated && selectedOption === 2 ? "text-indigo-100" : "text-indigo-600")}>
                                {currentQuestion?.fsrs?.intervals?.[3] || "10m"}
                              </span>
                            </button>

                            {/* EASY BUTTON */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                console.log("DEBUG CLICK: EASY button clicked!");
                                handleReviewRating(4);
                              }}
                              className={getButtonClass(3)}
                            >
                              <span className={cn("text-[9px] sm:text-[10px] font-black tracking-wider transition-colors duration-200", hasRated && selectedOption === 3 ? "text-white" : "text-emerald-500")}>EASY</span>
                              <span className={cn("text-[10.5px] sm:text-xs font-black transition-colors duration-200", hasRated && selectedOption === 3 ? "text-emerald-100" : "text-emerald-600")}>
                                {currentQuestion?.fsrs?.intervals?.[4] || "4d"}
                              </span>
                            </button>
                          </div>
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
                                "mt-4 flex items-center justify-center gap-2 py-3 rounded-2xl border transition-all duration-300 font-bold",
                                selectedOption === 0 ? "bg-rose-50 border-rose-100 text-rose-600 animate-pulse" :
                                  selectedOption === 1 ? "bg-amber-50 border-amber-100 text-amber-600" :
                                    selectedOption === 2 ? "bg-indigo-50 border-indigo-100 text-indigo-600" :
                                      "bg-emerald-50 border-emerald-100 text-emerald-600"
                              )}
                            >
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
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar pb-4">
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
        <footer className="relative w-full flex-shrink-0 bg-white/95 backdrop-blur-2xl border-t border-slate-100/80 px-0 pt-0 pb-0 z-[300] shadow-[0_-4px_24px_rgba(99,102,241,0.06)]">
          <div className="max-w-2xl mx-auto w-full flex flex-col">
            {activeBottomTab === 'flashcard' && !isFeedbackOpen && (
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

              {/* Audio play button */}
              {(() => {
                if (!currentQuestion) return null;

                if (mainTab === 'practice' && practiceSubMode !== 'listening' && !showFeedback) {
                  return null;
                }

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
                        if (showFeedback) {
                          speakPracticeQuestionAndAnswer();
                        } else {
                          const practiceData = currentPracticeData;
                          if (practiceData) {
                            const { question: qText } = practiceData;
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

              {/* Lightbulb Explanation Button (visible in FSRS, and also in practice mode if a question is loaded) */}
              {(mainTab === 'practice' || showFeedback) && (
                <button
                  onClick={() => {
                    if (mainTab === 'practice') {
                      setShowFeedback(true);
                    }
                    setIsFeedbackOpen(true);
                  }}
                  className={`xl:hidden w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-2xl shadow-sm active:scale-95 transition-all relative ${justAnswered
                    ? 'bg-indigo-600 border border-indigo-600 text-white animate-[pulse_1.5s_infinite] ring-4 ring-indigo-300 ring-offset-1 drop-shadow-[0_0_12px_rgba(99,102,241,0.6)]'
                    : 'bg-indigo-50 border border-indigo-200 text-indigo-600 hover:bg-indigo-100'
                    }`}
                  title="Xem giải thích và hướng dẫn"
                >
                  <Lightbulb className="w-5.5 h-5.5" />
                  {justAnswered && <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-white animate-pulse"></span>}
                </button>
              )}

              {/* Main Action Buttons */}
              {mainTab === 'practice' ? (
                practiceAnswers[currentIndex] !== undefined ? (
                  <button
                    onClick={handleNext}
                    className="flex-1 h-12 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white font-black text-xs rounded-2xl shadow-lg shadow-emerald-300/50 flex items-center justify-center gap-2.5 uppercase tracking-widest active:scale-[0.98] transition-all hover:shadow-emerald-400/60 hover:shadow-xl"
                  >
                    Continue <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="flex-1 flex gap-2 h-12">
                    <button
                      onClick={handleNext}
                      className="flex-1 h-12 bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100 font-black text-xs rounded-2xl flex items-center justify-center gap-1.5 uppercase tracking-widest active:scale-[0.98] transition-all"
                    >
                      Skip <ChevronRight className="w-4 h-4" />
                    </button>
                    <div className="flex-[2] h-12 bg-slate-100 text-slate-400 font-black text-xs rounded-2xl flex items-center justify-center uppercase tracking-widest pointer-events-none select-none">
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
                    className="flex-1 h-12 bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 text-white font-black text-xs rounded-2xl shadow-lg shadow-indigo-300/50 flex items-center justify-center gap-2.5 uppercase tracking-widest active:scale-[0.98] transition-all hover:shadow-indigo-400/60 hover:shadow-xl"
                  >
                    {isFlipped ? (
                      <><ChevronRight className="w-4 h-4 rotate-180" /> FLIP BACK</>
                    ) : (
                      <>FLIP CARD <ChevronRight className="w-4 h-4 rotate-90" /></>
                    )}
                  </button>
                ) : (
                  <div className="flex-1 flex gap-3 h-12">
                    <button
                      onClick={() => setIsFlipped(prev => !prev)}
                      className="w-12 h-12 flex-shrink-0 bg-gradient-to-r from-indigo-50 to-indigo-100/80 hover:from-indigo-100 hover:to-indigo-200 text-indigo-600 border border-indigo-200/50 rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                      title={isFlipped ? "Flip to Front" : "Flip to Back"}
                    >
                      <RefreshCw className="w-5 h-5 text-indigo-600 animate-[spin_4s_linear_infinite]" />
                    </button>
                    <button
                      onClick={handleNext}
                      className="flex-1 h-12 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white font-black text-xs rounded-2xl shadow-lg shadow-emerald-300/50 flex items-center justify-center gap-2.5 uppercase tracking-widest active:scale-[0.98] transition-all hover:shadow-emerald-400/60 hover:shadow-xl"
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
            return (
              <div className="w-full grid grid-cols-3 bg-white border-t border-slate-100 p-0 relative md:hidden">
                {/* 1. Card Map Tab */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsStatsOpen(false);
                    setIsMapOpen(true);
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
            );
          })()}
        </div>
      </footer>
      )}


      {/* ✅ SESSION COMPLETE SUMMARY MODAL */}
      <AnimatePresence>
        {isSessionSummaryOpen && (() => {
          const answeredCount = Object.keys(sessionAnswers).length
          const correctCount = Object.entries(sessionAnswers).filter(([idx, optIdx]) => {
            const q = session.questions[Number(idx)]
            if (!q) return false
            const ratingVal = Array.isArray(optIdx)
              ? optIdx[optIdx.length - 1]
              : (typeof optIdx === 'number' ? optIdx : 0);
            return q.options && q.options.length > 0
              ? q.options[ratingVal]?.is_correct
              : ratingVal > 0
          }).length
          const accuracy = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0
          const grade = accuracy >= 90 ? { label: 'S', color: 'from-yellow-400 to-amber-500', text: 'OUTSTANDING!' } :
            accuracy >= 75 ? { label: 'A', color: 'from-emerald-400 to-teal-500', text: 'EXCELLENT!' } :
              accuracy >= 60 ? { label: 'B', color: 'from-indigo-400 to-blue-500', text: 'WELL DONE!' } :
                accuracy >= 45 ? { label: 'C', color: 'from-amber-400 to-orange-500', text: 'KEEP IT UP!' } :
                  { label: 'D', color: 'from-rose-400 to-pink-500', text: 'KEEP PRACTICING!' }
          return (
            <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-900/70 backdrop-blur-md"
                onClick={() => setIsSessionSummaryOpen(false)} />
              <motion.div initial={{ opacity: 0, scale: 0.8, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 30 }} transition={{ type: 'spring', bounce: 0.35 }}
                className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden">
                {/* Grade header */}
                <div className={`bg-gradient-to-br ${grade.color} p-8 flex flex-col items-center text-white`}>
                  <div className="text-[9px] font-black uppercase tracking-[0.4em] opacity-80 mb-2">SESSION COMPLETE</div>
                  <div className="w-24 h-24 rounded-3xl bg-white/20 backdrop-blur flex items-center justify-center text-5xl font-black mb-3 border-2 border-white/30">
                    {grade.label}
                  </div>
                  <h2 className="text-xl font-black">{grade.text}</h2>
                  <p className="text-sm opacity-80 mt-1">{accuracy}% accuracy</p>
                </div>

                {/* Stats grid */}
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-3 bg-slate-50 rounded-2xl">
                      <div className="text-2xl font-black text-slate-800">{answeredCount}</div>
                      <div className="text-[9px] font-black text-slate-400 uppercase">Answered</div>
                    </div>
                    <div className="text-center p-3 bg-emerald-50 rounded-2xl">
                      <div className="text-2xl font-black text-emerald-600">{correctCount}</div>
                      <div className="text-[9px] font-black text-emerald-400 uppercase">Correct</div>
                    </div>
                    <div className="text-center p-3 bg-indigo-50 rounded-2xl">
                      <div className="text-2xl font-black text-indigo-600">+{sessionXP}</div>
                      <div className="text-[9px] font-black text-indigo-400 uppercase">XP Earned</div>
                    </div>
                  </div>

                  {/* Milestones unlocked */}
                  {milestonesHit.size > 0 && (
                    <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100">
                      <div className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-2">Milestones Unlocked</div>
                      <div className="flex gap-3">
                        {milestonesHit.has(25) && <span className="text-2xl" title="25%">🎖</span>}
                        {milestonesHit.has(50) && <span className="text-2xl" title="50%">🏆</span>}
                        {milestonesHit.has(75) && <span className="text-2xl" title="75%">🌟</span>}
                        {milestonesHit.has(100) && <span className="text-2xl" title="100%">🎊</span>}
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setIsSessionSummaryOpen(false)}
                      className="py-3.5 bg-slate-100 text-slate-700 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-slate-200 transition-all">
                      Keep Going
                    </button>
                    <button onClick={() => navigate(`/flashcard/${id}`)}
                      className="py-3.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg shadow-indigo-200 active:scale-95 transition-all">
                      Finish &amp; Exit
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )
        })()}
      </AnimatePresence>

      {/* Mobile Question Map Modal */}
      <AnimatePresence>
        {isMapOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed inset-x-0 top-0 bottom-[32px] sm:bottom-[38px] z-[200] bg-[#F8FAFC] lg:hidden flex flex-col"
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
            <div className="border-t border-slate-100 bg-white/95 backdrop-blur-md flex-shrink-0 pb-3 flex flex-col gap-2.5">
              {/* Filter Tabs at the Bottom for reachability */}
              <div className="px-4 pt-2">
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

              {/* Info Label */}
              <div className="px-4 py-1 text-center">
                <h4 className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.2em] leading-tight">Bản đồ thẻ học</h4>
                <p className="text-[9px] text-slate-400 font-bold mt-0.5">Dễ dàng theo dõi & lọc thẻ học</p>
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
        practiceStatsNode={mainTab === 'practice' && renderPracticeStats()}
        sessionStatsNode={
          <div className="grid grid-cols-3 gap-2 text-center text-xs text-slate-700">
            <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm">
              <span className="block font-black">
                {mainTab === 'practice' ? Object.keys(practiceAnswers).length : Object.keys(sessionAnswers).length}
              </span>
              <span className="text-[8px] font-bold text-slate-400 uppercase">Đã làm</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm text-emerald-600">
              <span className="block font-black">
                {mainTab === 'practice' ? practiceCorrectCount : Object.values(sessionAnswers).filter(Boolean).length}
              </span>
              <span className="text-[8px] font-bold text-slate-400 uppercase">Đúng</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm text-rose-500">
              <span className="block font-black">
                {mainTab === 'practice' 
                  ? (practiceTotalAnswered - practiceCorrectCount) 
                  : Object.values(sessionAnswers).filter(x => !x).length
                }
              </span>
              <span className="text-[8px] font-bold text-slate-400 uppercase">Sai</span>
            </div>
          </div>
        }
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
                {activeFeedbackTab === 'insight' ? 'LEARNING INSIGHTS' : activeFeedbackTab === 'ai' ? 'AI DEEP ANALYSIS' : activeFeedbackTab === 'card' ? 'CARD INFO' : 'PERSONAL NOTES'}
              </h4>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <FeedbackArea
                showFeedback={showFeedback}
                activeFeedbackTab={activeFeedbackTab}
                setActiveFeedbackTab={setActiveFeedbackTab}
                selectedChoiceData={selectedChoiceData}
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
              className="relative w-full max-w-md bg-white rounded-[2rem] p-8 shadow-[0_25px_60px_rgba(99,102,241,0.3)] border border-slate-100/80 overflow-hidden text-center z-10 pointer-events-auto"
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

      {/* ⚙️ PRACTICE SETTINGS MODAL */}
      <AnimatePresence>
        {isSettingsModalOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md pointer-events-auto"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white md:rounded-[2rem] rounded-[1.25rem] p-6 shadow-2xl border border-slate-100/80 overflow-hidden text-slate-800 pointer-events-auto"
            >
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500"></div>
              
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2 text-indigo-600">
                  <Sliders className="w-5 h-5" />
                  Cấu hình luyện tập
                </h3>
              </div>

              <div className="space-y-6">
                {/* 1. Practice Range */}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Phạm vi câu hỏi</label>
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1 rounded-2xl border border-slate-100">
                    <button
                      onClick={() => {
                        setPracticeRange('all');
                        localStorage.setItem('vocab_practice_range', 'all');
                      }}
                      className={cn(
                        "flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-xl text-[10px] font-bold transition-all",
                        practiceRange === 'all'
                          ? "bg-white text-indigo-600 shadow-sm border border-slate-100"
                          : "text-slate-500 hover:bg-white/50"
                      )}
                    >
                      <Shuffle className={cn("w-4.5 h-4.5", practiceRange === 'all' ? "text-indigo-600" : "text-slate-400")} />
                      <span>Ngẫu nhiên (Tất cả)</span>
                    </button>

                    <button
                      onClick={() => {
                        const learnedIndices = session?.questions?.map((q: any, i: number) => (q.stats?.total || 0) > 0 ? i : -1).filter((i: number) => i !== -1) || [];
                        if (learnedIndices.length === 0) {
                          setLearningModeAlert({
                            visible: true,
                            message: "Bạn chưa học từ nào trong bộ này! Tự động chuyển về chế độ Ngẫu nhiên (Tất cả).",
                            type: 'warning'
                          });
                          setTimeout(() => {
                            setLearningModeAlert(prev => prev ? { ...prev, visible: false } : null);
                          }, 4500);
                          return;
                        }
                        setPracticeRange('learned');
                        localStorage.setItem('vocab_practice_range', 'learned');
                        if (!learnedIndices.includes(currentIndex)) {
                          navigateToQuestion(learnedIndices[0]);
                        }
                      }}
                      className={cn(
                        "flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-xl text-[10px] font-bold transition-all",
                        practiceRange === 'learned'
                          ? "bg-white text-indigo-600 shadow-sm border border-slate-100"
                          : "text-slate-500 hover:bg-white/50"
                      )}
                    >
                      <ListOrdered className={cn("w-4.5 h-4.5", practiceRange === 'learned' ? "text-indigo-600" : "text-slate-400")} />
                      <span>Thẻ đã học</span>
                    </button>
                  </div>
                </div>

                {/* 2. Practice Sub-mode */}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Hình thức luyện tập</label>
                  <div className="grid grid-cols-3 gap-1.5 bg-slate-50 p-1 rounded-2xl border border-slate-100">
                    {[
                      { id: 'mcq', label: 'Trắc nghiệm', icon: HelpCircle },
                      { id: 'typing', label: 'Tự gõ', icon: Keyboard },
                      { id: 'listening', label: 'Luyện nghe', icon: Volume2 }
                    ].map(m => {
                      const IconComp = m.icon;
                      const active = practiceSubMode === m.id;
                      return (
                        <button
                          key={m.id}
                          onClick={() => {
                            setPracticeAnswers({});
                            setSelectedOption(null);
                            setShowFeedback(false);
                            navigate(`/practice/${id}/${m.id}`, { replace: true });
                            fetchSession('practice', m.id as 'mcq' | 'typing' | 'listening');
                          }}
                          className={cn(
                            "flex flex-col items-center justify-center gap-1.5 py-3 px-1 rounded-xl text-[10px] font-bold transition-all",
                            active 
                              ? "bg-white text-indigo-600 shadow-sm border border-slate-100" 
                              : "text-slate-500 hover:bg-white/50"
                          )}
                        >
                          <IconComp className={cn("w-4.5 h-4.5", active ? "text-indigo-600" : "text-slate-400")} />
                          <span className="truncate w-full text-center text-[9px]">{m.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Compact Reading Audio Grid */}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Âm thanh đọc</label>
                  <div className="grid grid-cols-2 gap-1.5 bg-slate-50 p-1 rounded-2xl border border-slate-100">
                    {/* Front Audio */}
                    {(() => {
                      const active = autoPlayAudio === 'always' || autoPlayAudio === 'front';
                      return (
                        <button
                          onClick={() => {
                            const isFrontOn = autoPlayAudio === 'always' || autoPlayAudio === 'front';
                            const isBackOn = autoPlayAudio === 'always' || autoPlayAudio === 'back';
                            const nextState = isFrontOn ? (isBackOn ? 'back' : 'never') : (isBackOn ? 'always' : 'front');
                            setAutoPlayAudio(nextState);
                            localStorage.setItem('vocaburn_autoplay_audio', nextState);
                            saveGeneralSettings({ autoplay_audio: nextState });
                          }}
                          className={cn(
                            "flex flex-col items-center justify-center gap-1.5 py-2 px-1 rounded-xl text-[10px] font-bold transition-all active:scale-95",
                            active 
                              ? "bg-white text-indigo-600 shadow-sm border border-slate-100" 
                              : "text-slate-500 hover:bg-white/50"
                          )}
                        >
                          <Volume2 className={cn("w-4.5 h-4.5", active ? "text-indigo-600" : "text-slate-400")} />
                          <span className="truncate w-full text-center text-[9px]">Mặt trước</span>
                        </button>
                      );
                    })()}

                    {/* Back Audio */}
                    {(() => {
                      const active = autoPlayAudio === 'always' || autoPlayAudio === 'back';
                      return (
                        <button
                          onClick={() => {
                            const isFrontOn = autoPlayAudio === 'always' || autoPlayAudio === 'front';
                            const isBackOn = autoPlayAudio === 'always' || autoPlayAudio === 'back';
                            const nextState = isBackOn ? (isFrontOn ? 'front' : 'never') : (isFrontOn ? 'always' : 'back');
                            setAutoPlayAudio(nextState);
                            localStorage.setItem('vocaburn_autoplay_audio', nextState);
                            saveGeneralSettings({ autoplay_audio: nextState });
                          }}
                          className={cn(
                            "flex flex-col items-center justify-center gap-1.5 py-2 px-1 rounded-xl text-[10px] font-bold transition-all active:scale-95",
                            active 
                              ? "bg-white text-indigo-600 shadow-sm border border-slate-100" 
                              : "text-slate-500 hover:bg-white/50"
                          )}
                        >
                          <Volume2 className={cn("w-4.5 h-4.5", active ? "text-indigo-600" : "text-slate-400")} />
                          <span className="truncate w-full text-center text-[9px]">Mặt sau</span>
                        </button>
                      );
                    })()}
                  </div>
                </div>

                {/* 4. Compact Effects & Interaction Grid */}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Hiệu ứng & Hiển thị</label>
                  <div className="grid grid-cols-3 gap-1.5 bg-slate-50 p-1 rounded-2xl border border-slate-100">
                    {/* Effect Sound */}
                    <button
                      onClick={() => setSfxEnabled(!sfxEnabled)}
                      className={cn(
                        "flex flex-col items-center justify-center gap-1.5 py-2 px-1 rounded-xl text-[10px] font-bold transition-all active:scale-95",
                        sfxEnabled 
                          ? "bg-white text-emerald-600 shadow-sm border border-slate-100" 
                          : "text-slate-500 hover:bg-white/50"
                      )}
                    >
                      <Music className={cn("w-4.5 h-4.5", sfxEnabled ? "text-emerald-500" : "text-slate-400")} />
                      <span className="truncate w-full text-center text-[9px]">Âm hiệu ứng</span>
                    </button>

                    {/* Haptic */}
                    <button
                      onClick={() => setHapticEnabled(!hapticEnabled)}
                      className={cn(
                        "flex flex-col items-center justify-center gap-1.5 py-2 px-1 rounded-xl text-[10px] font-bold transition-all active:scale-95",
                        hapticEnabled 
                          ? "bg-white text-indigo-600 shadow-sm border border-slate-100" 
                          : "text-slate-500 hover:bg-white/50"
                      )}
                    >
                      <Zap className={cn("w-4.5 h-4.5", hapticEnabled ? "text-indigo-500" : "text-slate-400")} />
                      <span className="truncate w-full text-center text-[9px]">Rung Haptic</span>
                    </button>

                    {/* Show Images Toggle */}
                    <button
                      onClick={() => setShowImages(!showImages)}
                      className={cn(
                        "flex flex-col items-center justify-center gap-1.5 py-2 px-1 rounded-xl text-[10px] font-bold transition-all active:scale-95",
                        showImages 
                          ? "bg-white text-indigo-600 shadow-sm border border-slate-100" 
                          : "text-slate-500 hover:bg-white/50"
                      )}
                    >
                      <Image className={cn("w-4.5 h-4.5", showImages ? "text-indigo-500" : "text-slate-400")} />
                      <span className="truncate w-full text-center text-[9px]">Hiện hình ảnh</span>
                    </button>
                  </div>
                </div>

                {/* Thao tác thẻ học */}
                <div className="py-2.5 border-t border-slate-100 space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block text-center">Thao tác thẻ học</label>
                  <div className="flex items-center justify-center gap-3">
                    {showFeedback && (
                      <button 
                        onClick={() => {
                          copyQuestionToClipboard();
                          setIsSettingsModalOpen(false);
                        }}
                        title="Copy nội dung"
                        className="w-11 h-11 rounded-2xl bg-slate-50 border border-slate-200/60 hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-700 shadow-sm transition-all active:scale-90"
                      >
                        <Copy className="w-5 h-5" />
                      </button>
                    )}
                    
                    <button
                      onClick={() => {
                        setIsSettingsModalOpen(false);
                        handleIgnoreQuestion();
                      }}
                      title={currentQuestion?.is_ignored ? "Hủy bỏ qua thẻ" : "Bỏ qua thẻ"}
                      className={cn(
                        "w-11 h-11 rounded-2xl border flex items-center justify-center shadow-sm transition-all active:scale-90",
                        currentQuestion?.is_ignored 
                          ? "bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100"
                          : "bg-slate-50 border-slate-200/60 hover:bg-slate-100 text-slate-500 hover:text-slate-700"
                      )}
                    >
                      {currentQuestion?.is_ignored ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                    </button>

                    <button 
                      onClick={() => {
                        setIsSettingsModalOpen(false);
                        openEditModal();
                      }}
                      title="Sửa thẻ này"
                      className="w-11 h-11 rounded-2xl bg-slate-50 border border-slate-200/60 hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-700 shadow-sm transition-all active:scale-90"
                    >
                      <Edit3 className="w-5 h-5" />
                    </button>

                    <button 
                      onClick={() => {
                        setIsSettingsModalOpen(false);
                        setIsQuitModalOpen(true);
                      }}
                      title="Thoát phiên học"
                      className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-200 text-rose-500 hover:bg-rose-100 flex items-center justify-center shadow-sm transition-all active:scale-90"
                    >
                      <LogOut className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* 5. Agree / Close Button */}
                <div className="pt-3 border-t border-slate-100 flex justify-center">
                  <button 
                    onClick={() => setIsSettingsModalOpen(false)}
                    className="px-8 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  >
                    Đồng ý / Đóng
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                      } catch (e) { }
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
      {/* Edit Question Modal */}
      <AnimatePresence>
        {isEditModalOpen && editFormData && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-indigo-600" />
                  EDIT FLASHCARD #{currentIndex + 1}
                </h2>
                <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                {/* SECTION 1: TEXT CONTENT */}
                <div className="space-y-4 bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                  <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] block mb-2">1. TEXT CONTENT</span>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">FRONT SIDE (WORD / QUESTION)</label>
                    <textarea
                      value={editFormData.content}
                      onChange={(e) => setEditFormData({ ...editFormData, content: e.target.value })}
                      className="w-full h-20 p-4 bg-white rounded-2xl border border-slate-100 focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700 transition-all resize-none"
                      placeholder="Enter the front side word or phrase..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">BACK SIDE (DEFINITION / EXPLANATION)</label>
                      <textarea
                        value={editFormData.explanation}
                        onChange={(e) => setEditFormData({ ...editFormData, explanation: e.target.value })}
                        className="w-full h-32 p-4 bg-white rounded-2xl border border-slate-100 focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700 transition-all resize-none text-xs"
                        placeholder="Enter the definition, synonyms, examples..."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 animate-pulse" />
                        AI DEEP ANALYSIS
                      </label>
                      <textarea
                        value={editFormData.ai_explanation}
                        onChange={(e) => setEditFormData({ ...editFormData, ai_explanation: e.target.value })}
                        className="w-full h-32 p-4 bg-indigo-50/30 rounded-2xl border border-indigo-100 focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700 transition-all resize-none text-xs"
                        placeholder="AI explanation, breakdown of grammar, etymology..."
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 2: MULTIMEDIA URLS */}
                <div className="space-y-4 bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                  <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] block mb-2">2. MULTIMEDIA ASSETS</span>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Front multimedia */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">FRONT IMAGE URL</label>
                        <input
                          type="text"
                          value={editFormData.image || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, image: e.target.value })}
                          className="w-full p-3 bg-white rounded-xl border border-slate-100 focus:ring-2 focus:ring-indigo-500 text-xs font-semibold text-slate-600"
                          placeholder="e.g. /static/uploads/1/images/word.jpg"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">FRONT AUDIO URL</label>
                        <input
                          type="text"
                          value={editFormData.audio || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, audio: e.target.value })}
                          className="w-full p-3 bg-white rounded-xl border border-slate-100 focus:ring-2 focus:ring-indigo-500 text-xs font-semibold text-slate-600"
                          placeholder="e.g. /static/uploads/1/audio/1_front.mp3"
                        />
                      </div>
                    </div>

                    {/* Back multimedia */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">BACK IMAGE URL</label>
                        <input
                          type="text"
                          value={editFormData.others.back_img || ''}
                          onChange={(e) => setEditFormData({
                            ...editFormData,
                            others: { ...editFormData.others, back_img: e.target.value }
                          })}
                          className="w-full p-3 bg-white rounded-xl border border-slate-100 focus:ring-2 focus:ring-indigo-500 text-xs font-semibold text-slate-600"
                          placeholder="e.g. /static/uploads/1/images/def.jpg"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">BACK AUDIO URL</label>
                        <input
                          type="text"
                          value={editFormData.others.back_audio_url || ''}
                          onChange={(e) => setEditFormData({
                            ...editFormData,
                            others: { ...editFormData.others, back_audio_url: e.target.value }
                          })}
                          className="w-full p-3 bg-white rounded-xl border border-slate-100 focus:ring-2 focus:ring-indigo-500 text-xs font-semibold text-slate-600"
                          placeholder="e.g. /static/uploads/1/audio/1_back.mp3"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION 3: AUDIO READING SCRIPTS */}
                <div className="space-y-4 bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                  <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] block mb-2">3. AUDIO READING SCRIPTS</span>
                  <p className="text-[9px] font-semibold text-slate-400 italic">
                    Format: `lang_code:text` (one per line). Example: `ja:人生` followed by `vi:cuộc đời`.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">FRONT AUDIO READING SCRIPT</label>
                      <textarea
                        value={editFormData.others.front_audio_content || ''}
                        onChange={(e) => setEditFormData({
                          ...editFormData,
                          others: { ...editFormData.others, front_audio_content: e.target.value }
                        })}
                        className="w-full h-24 p-3 bg-white rounded-xl border border-slate-100 focus:ring-2 focus:ring-indigo-500 font-mono text-[11px] text-slate-600 transition-all resize-none"
                        placeholder="e.g. ja:人生"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">BACK AUDIO READING SCRIPT</label>
                      <textarea
                        value={editFormData.others.back_audio_content || ''}
                        onChange={(e) => setEditFormData({
                          ...editFormData,
                          others: { ...editFormData.others, back_audio_content: e.target.value }
                        })}
                        className="w-full h-24 p-3 bg-white rounded-xl border border-slate-100 focus:ring-2 focus:ring-indigo-500 font-mono text-[11px] text-slate-600 transition-all resize-none"
                        placeholder="e.g. ja:人生&#10;vi:cuộc đời"
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 4: CUSTOM METADATA */}
                <div className="space-y-4 bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                  <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] block mb-2">4. CUSTOM METADATA (JSON)</span>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">OTHER CONTENT / SETTINGS</label>
                    <textarea
                      value={editFormData.others.other_content || ''}
                      onChange={(e) => setEditFormData({
                        ...editFormData,
                        others: { ...editFormData.others, other_content: e.target.value }
                      })}
                      className="w-full h-24 p-4 bg-white rounded-2xl border border-slate-100 focus:ring-2 focus:ring-indigo-500 font-mono text-xs text-slate-600 transition-all"
                      placeholder='e.g. { "custom_mode": "vocab", "tags": ["n3", "nouns"] }'
                    />
                    <p className="text-[9px] font-medium text-slate-400">
                      Valid JSON object that can store custom properties or game-mode attributes.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-8 border-t border-slate-100 flex items-center justify-end gap-4 bg-slate-50/50">
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-6 py-3 text-sm font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-all"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={isSavingEdit}
                  className="px-8 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50"
                >
                  {isSavingEdit ? 'SAVING...' : 'SAVE CHANGES'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ⚙️ SMART LEARNING MODE MODAL */}
      <AnimatePresence>
        {isModeMenuOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModeMenuOpen(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-md pointer-events-auto"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ type: 'spring', bounce: 0.3, duration: 0.5 }}
              className="relative w-full max-w-md bg-white rounded-[2.5rem] p-6 shadow-[0_25px_60px_rgba(99,102,241,0.25)] border border-slate-100 overflow-hidden z-[1010] pointer-events-auto"
            >
              {/* Top premium border indicator */}
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>

              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100">
                    <Sliders className="w-4 h-4 text-indigo-600" />
                  </div>
                  <h3 className="text-lg font-black text-slate-800 tracking-tight uppercase">Smart Learning Modes</h3>
                </div>
                <button
                  onClick={() => setIsModeMenuOpen(false)}
                  className="w-8 h-8 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-lg text-slate-500 active:scale-95 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Description */}
              <p className="text-slate-500 font-bold text-xs leading-relaxed mb-5">
                Customize how Vocaburn serves the next card. Choose a pathway that matches your active study goals.
              </p>

              {/* Mode Options List */}
              <div className="space-y-2.5 mb-6 overflow-y-auto max-h-[360px] pr-1 custom-scrollbar">
                {[
                  {
                    id: 'fsrs',
                    name: 'FSRS Spaced Repetition (Standard)',
                    desc: 'FSRS v6 scheduler. Prioritizes due review cards, then introduces new cards.',
                    icon: Brain,
                    color: 'from-indigo-600 to-purple-600',
                    bg: 'bg-indigo-50/50 border-indigo-100'
                  },
                  {
                    id: 'sequential',
                    name: 'Sequential Order',
                    desc: 'Follow deck natural sequence from first to last card.',
                    icon: ListOrdered,
                    color: 'from-blue-500 to-indigo-500',
                    bg: 'bg-blue-50/50 border-blue-100'
                  },
                  {
                    id: 'random',
                    name: 'Shuffle Mode',
                    desc: 'Serve cards in a completely randomized, unexpected order.',
                    icon: Shuffle,
                    color: 'from-purple-500 to-indigo-500',
                    bg: 'bg-purple-50/50 border-purple-100'
                  },
                  {
                    id: 'unseen',
                    name: 'New Cards First',
                    desc: 'Prioritize cards you have never attempted in this deck.',
                    icon: EyeOff,
                    color: 'from-teal-500 to-emerald-500',
                    bg: 'bg-teal-50/50 border-teal-100'
                  },
                  {
                    id: 'review',
                    name: 'Mistakes First',
                    desc: 'Focus on review cards you answered incorrectly in prior attempts.',
                    icon: AlertCircle,
                    color: 'from-amber-500 to-red-500',
                    bg: 'bg-amber-50/50 border-amber-100'
                  },
                  {
                    id: 'hardest',
                    name: 'Hardest First (SRS)',
                    desc: 'Prioritize cards with the lowest accuracy ratio first.',
                    icon: TrendingUp,
                    color: 'from-rose-500 to-pink-500',
                    bg: 'bg-rose-50/50 border-rose-100'
                  }
                ].map((m) => {
                  const Icon = m.icon
                  const isSelected = activeMode === m.id
                  return (
                    <button
                      key={m.id}
                      onClick={() => {
                        applyLearningMode(m.id)
                      }}
                      className={cn(
                        "w-full p-4 rounded-2xl border-2 text-left flex items-start gap-4 transition-all duration-200 active:scale-[0.99]",
                        isSelected
                          ? "border-indigo-500 bg-indigo-50/20 shadow-md shadow-indigo-100/50"
                          : "border-slate-100 bg-white hover:border-slate-300 hover:bg-slate-50/30"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center text-white bg-gradient-to-br shadow-md flex-shrink-0",
                        m.color
                      )}>
                        <Icon className="w-4 h-4" />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="font-bold text-sm text-slate-800">{m.name}</span>
                          {isSelected && (
                            <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center shadow-md shadow-indigo-200">
                              <Check className="w-3 h-3 text-white stroke-[3]" />
                            </div>
                          )}
                        </div>
                        <span className="text-[11px] font-semibold text-slate-500 leading-relaxed block">{m.desc}</span>
                      </div>
                    </button>
                  )
                })}
              </div>

              <button
                onClick={() => setIsModeMenuOpen(false)}
                className="w-full py-3.5 bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg shadow-slate-300 active:scale-95 transition-all hover:bg-slate-800"
              >
                APPLY & CLOSE
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>



      {/* Full-Screen Achievement Celebration Overlay */}
      <AnimatePresence>
        {activeUnlockedBadge && (() => {
          const BadgeIcon = getBadgeIcon(activeUnlockedBadge.id)
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
            >
              {/* Radial glow background effect */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.15),transparent_60%)] animate-pulse pointer-events-none" />

              <motion.div
                initial={{ scale: 0.9, y: 50 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 50 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="relative max-w-md w-full bg-slate-900/95 border border-violet-500/30 rounded-[2rem] p-8 text-center shadow-[0_0_80px_rgba(139,92,246,0.35)] overflow-hidden"
              >
                {/* Background neon splashes */}
                <div className="absolute -top-12 -left-12 w-48 h-48 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-pink-600/10 rounded-full blur-3xl pointer-events-none" />

                {/* Sparkling particles background */}
                <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,rgba(0,0,0,0.4))] pointer-events-none" />

                {/* Close Button */}
                <button
                  onClick={() => setActiveUnlockedBadge(null)}
                  className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all active:scale-95"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Animated Badge Hexagon Glow container */}
                <div className="relative mx-auto w-32 h-32 flex items-center justify-center mb-6 mt-4">
                  {/* Hexagon Neon Ring */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-violet-500 via-fuchsia-500 to-pink-500 rounded-[2.5rem] rotate-45 opacity-20 blur-md animate-pulse" />
                  <div className="absolute inset-2 bg-gradient-to-tr from-violet-600 via-fuchsia-600 to-pink-600 rounded-[2rem] rotate-12 animate-spin-slow" />

                  {/* Frosted Icon Shield */}
                  <div className="relative w-20 h-20 rounded-2xl bg-slate-950/60 border border-white/15 flex items-center justify-center shadow-2xl backdrop-blur-md">
                    <BadgeIcon className="w-10 h-10 text-transparent bg-clip-text bg-gradient-to-tr from-violet-400 via-fuchsia-400 to-pink-400" />
                  </div>
                </div>

                <span className="text-[10px] font-black tracking-[0.3em] text-violet-400 uppercase bg-violet-500/10 px-4 py-1.5 rounded-full border border-violet-500/20 mb-2 inline-block">
                  ACHIEVEMENT UNLOCKED
                </span>

                <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-3 uppercase bg-gradient-to-tr from-white via-slate-100 to-slate-300 bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(255,255,255,0.15)]">
                  {activeUnlockedBadge.name}
                </h2>

                <p className="text-slate-400 text-sm font-bold leading-relaxed mb-6 px-4">
                  {activeUnlockedBadge.description}
                </p>

                {/* Reward stats display */}
                <div className="flex items-center justify-center gap-4 mb-8 bg-slate-950/40 border border-white/5 rounded-2xl p-4">
                  <div className="text-center flex-1 border-r border-white/5">
                    <span className="text-[10px] font-black tracking-widest text-slate-500 block uppercase mb-1">XP REWARD</span>
                    <span className="text-lg font-black text-amber-400">+{activeUnlockedBadge.xp_reward} XP ✨</span>
                  </div>
                  <div className="text-center flex-1">
                    <span className="text-[10px] font-black tracking-widest text-slate-500 block uppercase mb-1">BONUS REWARD</span>
                    <span className="text-lg font-black text-violet-400">🏅 BADGE</span>
                  </div>
                </div>

                {/* Manual Dismiss CTA */}
                <button
                  onClick={() => setActiveUnlockedBadge(null)}
                  className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 text-white shadow-lg shadow-violet-600/35 hover:shadow-violet-600/50 hover:brightness-110 active:scale-[0.98] transition-all duration-200"
                >
                  AWESOME, CLAIM IT! 🏆
                </button>
              </motion.div>
            </motion.div>
          )
        })()}
      </AnimatePresence>
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
    </div>
  )
}

