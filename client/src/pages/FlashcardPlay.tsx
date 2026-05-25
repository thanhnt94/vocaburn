import { useState, useEffect, useRef } from 'react'
import confetti from 'canvas-confetti'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, LayoutGrid, Timer, Flame, Trophy, Check, X, Sparkles, Lightbulb, StickyNote, Play, Target, CheckCircle2, XCircle, Clock, BookOpen, Hash, Copy, Edit3, Brain, FileText, HelpCircle, Sliders, ListOrdered, Shuffle, EyeOff, AlertCircle, TrendingUp, Award } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'

interface Option {
  id: number
  content: string
  is_correct: boolean
}

interface Question {
  id: number
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
    intervals: Record<number, string>
  }
}
const TypewriterText = ({ text }: { text: string }) => {
  const [displayedText, setDisplayedText] = useState('')
  const [isTyping, setIsTyping] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setDisplayedText('')
    setIsTyping(true)
    let i = 0
    const startTime = Date.now()
    
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime
      
      // If 2 seconds have passed, just dump the remaining text instantly
      if (elapsed > 2000) {
        setDisplayedText(text)
        setIsTyping(false)
        clearInterval(timer)
      } else {
        if (i < text.length) {
          i += 3 // Realistic LLM typing speed
          setDisplayedText(text.substring(0, i))
        } else {
          setIsTyping(false)
          clearInterval(timer)
        }
      }
    }, 15)
    return () => clearInterval(timer)
  }, [text])

  useEffect(() => {
    if (isTyping && bottomRef.current) {
      bottomRef.current.scrollIntoView({ block: 'nearest' })
    }
  }, [displayedText, isTyping])

  const formatLatex = (t: string) => {
    return t
      .replace(/`\s*(<ruby>[\s\S]*?<\/ruby>)\s*`/g, '$1') // Strip backticks around ruby tags
      .replace(/\$\\rightarrow\$/g, '→')
      .replace(/\$\\Rightarrow\$/g, '⇒')
      .replace(/\$\\leftarrow\$/g, '←')
      .replace(/\$\\Leftarrow\$/g, '⇐')
      .replace(/\$\\leftrightarrow\$/g, '↔')
      .replace(/\$\\Leftrightarrow\$/g, '⇔')
      .replace(/\$\\times\$/g, '×')
      .replace(/\$\\div\$/g, '÷')
      .replace(/\$\\le\$/g, '≤')
      .replace(/\$\\ge\$/g, '≥')
      .replace(/\$\\neq\$/g, '≠')
      .replace(/\$\\approx\$/g, '≈')
      .replace(/\$\\pm\$/g, '±')
  }

  return (
    <>
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={MarkdownComponents}>
        {parseBBCodeToHtml(formatLatex(displayedText))}
      </ReactMarkdown>
      {isTyping && <span className="inline-block w-1.5 h-3.5 ml-1 bg-indigo-500 animate-pulse align-middle" />}
      <div ref={bottomRef} />
    </>
  )
}

const parseBBCodeToHtml = (text: string): string => {
  if (!text) return '';
  let html = text;
  html = html.replace(/\[b\]/gi, '<strong>');
  html = html.replace(/\[\/b\]/gi, '</strong>');
  html = html.replace(/\[i\]/gi, '<em>');
  html = html.replace(/\[\/i\]/gi, '</em>');
  html = html.replace(/\[u\]/gi, '<u>');
  html = html.replace(/\[\/u\]/gi, '</u>');
  html = html.replace(/\[s\]/gi, '<del>');
  html = html.replace(/\[\/s\]/gi, '</del>');
  html = html.replace(/\[color=([^\]]+)\]/gi, (_, color) => `<span style="color: ${color}">`);
  html = html.replace(/\[\/color\]/gi, '</span>');
  html = html.replace(/\[size=([^\]]+)\]/gi, (_, size) => `<span style="font-size: ${size}">`);
  html = html.replace(/\[\/size\]/gi, '</span>');
  return html;
};

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

const speakMultiLanguage = (text: string) => {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();

  const segments: { text: string; langCode: string }[] = [];
  const langMap: Record<string, string> = {
    'ja': 'ja-JP',
    'vi': 'vi-VN',
    'en': 'en-US',
    'zh': 'zh-CN',
    'ko': 'ko-KR',
    'fr': 'fr-FR',
    'de': 'de-DE',
    'es': 'es-ES',
    'ru': 'ru-RU',
    'it': 'it-IT',
  };

  // Try bracket format first: e.g. [ja:人生][vi:cuộc đời]
  const bracketRegex = /\[([a-z]{2,3}(?:-[a-zA-Z0-9]+)?):\s*([^\]]+)\]/g;
  let bracketMatch;
  let hasBrackets = false;
  
  while ((bracketMatch = bracketRegex.exec(text)) !== null) {
    hasBrackets = true;
    const rawLang = bracketMatch[1].toLowerCase();
    const content = bracketMatch[2].trim();
    const langCode = langMap[rawLang] || rawLang;
    segments.push({ text: content, langCode });
  }

  if (!hasBrackets) {
    // Fallback to line-by-line format
    const lines = text.split('\n');
    const lineRegex = /^\s*([a-z]{2,3}(?:-[a-zA-Z0-9]+)?)\s*:\s*(.+)$/;
    let lastLang = 'en-US';

    for (const line of lines) {
      if (!line.trim()) continue;

      const match = line.match(lineRegex);
      if (match) {
        const rawLang = match[1].toLowerCase();
        const content = match[2].trim();
        const langCode = langMap[rawLang] || rawLang;
        lastLang = langCode;
        segments.push({ text: content, langCode });
      } else {
        segments.push({ text: line.trim(), langCode: lastLang });
      }
    }
  }

  const voices = typeof window !== 'undefined' ? window.speechSynthesis.getVoices() : [];

  segments.forEach((seg) => {
    if (!seg.text) return;
    const u = new SpeechSynthesisUtterance(seg.text);
    u.lang = seg.langCode;
    u.rate = 0.85;

    // Tự động tìm giọng Nữ chất lượng cao cho tiếng Việt (vi-VN)
    if (seg.langCode.toLowerCase().startsWith('vi')) {
      const viVoice = voices.find(v => {
        const name = v.name.toLowerCase();
        const lang = v.lang.toLowerCase();
        const isVi = lang === 'vi-vn' || lang.startsWith('vi');
        if (!isVi) return false;
        
        // Ưu tiên các giọng nữ nổi tiếng như HoaiMy (Edge), Linh/An (Windows), giọng Google tiếng Việt online, hoặc chứa từ khóa 'female'/'nữ'
        return name.includes('hoaimy') || 
               name.includes('linh') || 
               name.includes('an') || 
               name.includes('female') || 
               name.includes('nữ') || 
               name.includes('google');
      });
      if (viVoice) {
        u.voice = viVoice;
      } else {
        // Dự phòng giọng tiếng Việt bất kỳ nếu không tìm thấy giọng nữ đặc trưng
        const anyVi = voices.find(v => v.lang.toLowerCase() === 'vi-vn' || v.lang.toLowerCase().startsWith('vi'));
        if (anyVi) u.voice = anyVi;
      }
    }

    window.speechSynthesis.speak(u);
  });
}

export default function FlashcardPlay() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, setUser, setGamify } = useAppStore()
  
  const playCardAudio = async (face: 'front' | 'back') => {
    if (!currentQuestion) return;
    let audioUrl = face === 'front' 
      ? (currentQuestion.audio || currentQuestion.others?.front_audio_url)
      : currentQuestion.others?.back_audio_url;

    const script = face === 'front'
      ? currentQuestion.others?.front_audio_content
      : currentQuestion.others?.back_audio_content;

    // Lazily generate audio if it is not yet created on backend, but ONLY if script is present
    if (!audioUrl && currentQuestion.id && script && script.trim()) {
      try {
        const res = await axios.get(`/api/v1/quiz/generate-audio/${currentQuestion.id}?face=${face}`);
        audioUrl = res.data.url;
        if (audioUrl) {
          if (face === 'front') {
            currentQuestion.audio = audioUrl;
          } else {
            if (!currentQuestion.others) currentQuestion.others = {};
            currentQuestion.others.back_audio_url = audioUrl;
          }
        }
      } catch (err) {
        console.error(`Backend ${face} audio synthesis failed:`, err);
      }
    }

    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play().catch(err => {
        console.error("Audio file playback failed, trying client-side TTS:", err);
        if (script && script.trim()) {
          speakMultiLanguage(script);
        }
      });
    } else if (script && script.trim()) {
      speakMultiLanguage(script);
    }
  };
  const [session, setSession] = useState<any>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const [isFlipped, setIsFlipped] = useState(false)
  const [badgeVisible, setBadgeVisible] = useState(false)
  const [badgeMessage, setBadgeMessage] = useState("")
  const [streak, setStreak] = useState(0)
  const [sessionXP, setSessionXP] = useState(0)
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
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false)
  const [isQuitModalOpen, setIsQuitModalOpen] = useState(false)
  const [activeFeedbackTab, setActiveFeedbackTab] = useState<'insight' | 'ai' | 'note'>('insight')
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [activeUnlockedBadge, setActiveUnlockedBadge] = useState<any | null>(null)
  const [activeMasteryUpgrade, setActiveMasteryUpgrade] = useState<any | null>(null)
  const [editFormData, setEditFormData] = useState<any>(null)
  const [sessionAnswers, setSessionAnswers] = useState<Record<number, number | number[]>>({})
  const [isEditingPrompt, setIsEditingPrompt] = useState(false)
  const [promptInput, setPromptInput] = useState('')
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

  const timerRef = useRef<any>(null)
  const currentQuestion: Question | null = session?.questions?.[currentIndex] || null

  const [activelyRatedCurrentCard, setActivelyRatedCurrentCard] = useState<boolean>(false)

  const [currentTime, setCurrentTime] = useState(new Date())
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const parseUTCDate = (dateStr: string | null | undefined): Date => {
    if (!dateStr) return new Date();
    try {
      // 1. Replace space with 'T' to meet standard ISO specification
      let formatted = dateStr.trim().replace(' ', 'T');
      // 2. Truncate microseconds (6 digits) to milliseconds (3 digits)
      const dotIndex = formatted.indexOf('.');
      if (dotIndex !== -1) {
        const parts = formatted.split('.');
        const timePart = parts[0];
        let subPart = parts[1];
        let suffix = '';
        if (subPart.endsWith('Z')) {
          suffix = 'Z';
          subPart = subPart.slice(0, -1);
        } else if (subPart.includes('+')) {
          const plusIdx = subPart.indexOf('+');
          suffix = subPart.substring(plusIdx);
          subPart = subPart.substring(0, plusIdx);
        }
        subPart = subPart.substring(0, 3);
        formatted = `${timePart}.${subPart}${suffix}`;
      }
      
      // 3. Ensure 'Z' is appended if no timezone is specified
      // Check timezone specifier safely after the 'T' separator to prevent matching hyphens in the date part
      const tIndex = formatted.indexOf('T');
      const timePartAfterT = tIndex !== -1 ? formatted.slice(tIndex) : '';
      const hasTimezone = formatted.includes('Z') || formatted.includes('+') || timePartAfterT.includes('-');
      
      if (!hasTimezone) {
        formatted = formatted + 'Z';
      }
      const d = new Date(formatted);
      if (!isNaN(d.getTime())) return d;
    } catch (e) {
      console.error("parseUTCDate error:", e);
    }
    return new Date();
  }

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
    let classes = "group p-4 rounded-3xl border shadow-sm active:scale-[0.97] transition-all flex flex-col items-center justify-center gap-1 flex-1 ";
    
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
    if (isFeedbackOpen || isMapOpen || isEditModalOpen || isQuitModalOpen || isSessionSummaryOpen) {
      setGoalToast(prev => prev ? { ...prev, visible: false } : null)
      setShowGoalCelebration(false)
      setBadgeVisible(false)
      setActiveUnlockedBadge(null)
      setActiveMasteryUpgrade(null)
      setLearningModeAlert(null)
    }
  }, [isFeedbackOpen, isMapOpen, isEditModalOpen, isQuitModalOpen, isSessionSummaryOpen])

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        // Only increment if feedback is NOT shown
        if (showFeedback) return prev
        return prev + 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [showFeedback])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      // 1. Ignore if typing inside input, textarea, or contentEditable elements
      const activeElement = document.activeElement;
      if (activeElement) {
        const tagName = activeElement.tagName.toLowerCase();
        if (tagName === 'input' || tagName === 'textarea' || activeElement.getAttribute('contenteditable') === 'true') {
          return;
        }
      }

      // 2. Ignore if any modal or dialog overlay is active
      if (isSessionSummaryOpen || isQuitModalOpen || isEditModalOpen || isMapOpen || isFeedbackOpen) {
        return;
      }

      const key = e.key.toLowerCase();

      // 3. Handle card flip or rating submissions
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (!isFlipped) {
          setIsFlipped(true);
          setShowFeedback(true);
        } else if (hasRated) {
          handleNext();
        }
      } else if (isFlipped) {
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
    hasRated
  ])

  useEffect(() => {
    if (currentQuestion) {
      fetchNote()
    }
  }, [currentIndex, currentQuestion])

  useEffect(() => {
    const fetchUser = async () => {
      if (!user) {
        try {
          const res = await axios.get('/api/v1/dashboard/data')
          setUser(res.data.user)
          setGamify(res.data.gamify)
        } catch (e) {}
      }
    }
    fetchUser()
  }, [user, setUser, setGamify])

  const fetchSession = async () => {
    try {
      const [quizRes, goalsRes, sessionRes] = await Promise.all([
        axios.get(`/api/v1/quiz/${id}/play-data`),
        axios.get('/api/v1/quiz/goals/active', {
          params: { local_date: new Date().toLocaleDateString('en-CA') }
        }).catch(e => {
          console.error("Failed to load active goals", e)
          return { data: [] }
        }),
        axios.get(`/api/v1/quiz/${id}/session`).catch(e => {
          console.error("Failed to load session", e)
          return { data: null }
        })
      ])

      const questions = quizRes.data.questions || []
      setSession({ ...quizRes.data, questions })
      setPromptInput(quizRes.data.ai_prompt || '')
      setInitialTotalXP(quizRes.data.user_total_xp || 0)

      const activeGoalData = goalsRes.data.find((g: any) => g.quiz_id === Number(id))
      if (activeGoalData) {
        setActiveGoal(activeGoalData)
      }
      
      if (sessionRes.data) {
        const restoredAnswers = sessionRes.data.state?.sessionAnswers || {}
        setSessionAnswers(restoredAnswers)
        
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
                if (!fsrs || !fsrs.due) {
                  return { idx, score: 2 } // Priority 2: New Card
                }
                
                const dueDate = parseUTCDate(fsrs.due)
                const isDue = dueDate <= now
                const isLearning = fsrs.state === 1 || fsrs.state === 3
                
                if (isDue || isLearning) {
                  const stability = fsrs.stability || 0
                  return { idx, score: 3 - (stability / 10000) } // Priority 3: Due reviews (shortest stability first)
                } else {
                  const timeToDue = dueDate.getTime() - now.getTime()
                  return { idx, score: 1 - (timeToDue / 1e12) } // Priority 1: Undue reviews (closest first)
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
        
        // Update local state to reflect which questions are answered in this session
        // but DO NOT manually increment stats, as the backend quiz play-data already includes them.
        if (typeof restoredAnswers[curIdx] === 'number') {
          setSelectedOption(restoredAnswers[curIdx])
          setShowFeedback(true)
        }

        if (sessionRes.data.state?.sessionXP) {
          setSessionXP(sessionRes.data.state.sessionXP)
        }
        if (sessionRes.data.state?.streak) {
          setStreak(sessionRes.data.state.streak)
        }
      }
    } catch (e) {
      navigate('/')
    }
  }


  const fetchNote = async () => {
    if (!currentQuestion) return
    try {
      const res = await axios.get(`/api/v1/quiz/question/${currentQuestion.id}/note`)
      setPersonalNote(res.data.content || '')
    } catch (e) {}
  }

  const saveNote = async () => {
    if (!currentQuestion) return
    try {
      await axios.post(`/api/v1/quiz/question/${currentQuestion.id}/note`, { 
        content: personalNote 
      })
    } catch (e) {
      alert("Failed to save note.")
    }
  }

  const saveSession = async (newAnswers: Record<number, number | number[]>, newIndex: number, currentXP: number = sessionXP, currentStreak: number = streak) => {
    try {
      await axios.post(`/api/v1/quiz/${id}/session`, {
        mode: "sequential",
        current_index: newIndex,
        state: { 
          sessionAnswers: newAnswers,
          sessionXP: currentXP,
          streak: currentStreak
        }
      })
    } catch (e) {}
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

    if (!alreadyRated) {
      const isFirstEver = prevTotal === 0
      const prevRatio = prevTotal > 0 ? prevCorrect / prevTotal : 0
      const usuallyCorrect = prevRatio >= 0.7 && prevTotal >= 2

      if (correct) {
        updatedStreak = streak + 1
        setStreak(updatedStreak)
        const xpGained = isFirstEver ? 15 : (updatedStreak >= 5 ? 20 : 10)
        updatedXP = sessionXP + xpGained
        setSessionXP(updatedXP)
        setInitialTotalXP(prev => prev + xpGained)

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

        // Streak milestone confetti
        const confettiColors = updatedStreak >= 5
          ? ['#f59e0b', '#ef4444', '#f97316']
          : ['#6366f1', '#a855f7', '#ec4899']
        confetti({ particleCount: updatedStreak >= 5 ? 250 : 150, spread: updatedStreak >= 5 ? 100 : 70, origin: { y: 0.6 }, colors: confettiColors })

        setAnswerContext({ wasCorrect: true, prevTotal, prevCorrect, timeTaken, avgTime, newStreak: updatedStreak, xpGained })
      } else {
        updatedStreak = 0
        setStreak(0)
        const xpGained = 0

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
        if (rating === 1) localDue.setMinutes(localDue.getMinutes() + 10)
        else if (rating === 2) localDue.setHours(localDue.getHours() + 12)
        else if (rating === 3) localDue.setDate(localDue.getDate() + 2)
        else localDue.setDate(localDue.getDate() + 5)

        q.fsrs = {
          ...(q.fsrs || { state: 0, stability: null, difficulty: null, intervals: {} }),
          due: localDue.toISOString()
        }

        newQs[currentIndex] = q
        newSession.questions = newQs
        return newSession
      })
    }

    saveSession(newAnswers, currentIndex, updatedXP, updatedStreak)

    try {
      const res = await axios.post('/api/v1/quiz/record_answer', {
        question_id: currentQuestion.id,
        is_correct: correct,
        rating: rating,
        time_spent: timeTaken,
        local_date: new Date().toLocaleDateString('en-CA')
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
              }
            }
          }
          return {
            ...prevSession,
            questions: updatedQuestions
          }
        })

        if (masteryUpdate.level_up) {
          confetti({
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
        confetti({
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
            confetti({
              particleCount: 4,
              angle: 60,
              spread: 55,
              origin: { x: 0, y: 0.8 },
              colors: colors
            });
            confetti({
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
            confetti({
              particleCount: 50,
              angle: 60,
              spread: 75,
              origin: { x: 0.15, y: 0.85 },
              colors: ['#F59E0B', '#F97316', '#EF4444', '#8B5CF6', '#FFF']
            });
            confetti({
              particleCount: 50,
              angle: 120,
              spread: 75,
              origin: { x: 0.85, y: 0.85 },
              colors: ['#F59E0B', '#F97316', '#EF4444', '#8B5CF6', '#FFF']
            });
            confetti({
              particleCount: 40,
              spread: 100,
              origin: { x: 0.5, y: 0.5 },
              colors: ['#F59E0B', '#F97316', '#FFF']
            });
          } else {
            // Epic gold/rose sparkle burst from the top right corner near the toast
            confetti({
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

  const navigateToQuestion = (idx: number) => {
    setCurrentIndex(idx)
    setIsFlipped(false)
    setActivelyRatedCurrentCard(false)
    setJustAnswered(false)

    // Đóng toàn bộ các popup, toast, thông báo thành tựu khi chuyển sang câu mới
    setGoalToast(prev => prev ? { ...prev, visible: false } : null)
    setShowGoalCelebration(false)
    setBadgeVisible(false)
    setActiveUnlockedBadge(null)
    setActiveMasteryUpgrade(null)
    setLearningModeAlert(null)
    
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
    setIsEditingNote(false)
    setIsEditingAI(false)
    saveSession(sessionAnswers, idx)
  }

  const handleNext = () => {
    if (!session || !session.questions) return

    const questions = session.questions
    const total = questions.length

    let updatedAnswers = { ...sessionAnswers }

    // Fallback function to find the first unanswered card index in this session
    const getFirstUnanswered = (answers = updatedAnswers) => {
      for (let i = 0; i < total; i++) {
        if (answers[i] === undefined) return i
      }
      return -1
    }

    let nextIdx = -1

    if (activeMode === 'fsrs') {
      const now = new Date()
      const scoredQuestions = questions.map((q: any, idx: number) => {
        const isCurrentlyUnlocked = (() => {
          if (!q.fsrs || !q.fsrs.due) return true;
          return parseUTCDate(q.fsrs.due).getTime() - 30000 <= now.getTime();
        })()
        const hasAnswered = updatedAnswers[idx] !== undefined && !isCurrentlyUnlocked
        if (hasAnswered) return { idx, score: -1000 }
        
        const fsrs = q.fsrs
        if (!fsrs || !fsrs.due) {
          return { idx, score: 2 } // Priority 2: New Card
        }
        
        const dueDate = parseUTCDate(fsrs.due)
        const isDue = dueDate <= now
        const isLearning = fsrs.state === 1 || fsrs.state === 3
        
        if (isDue || isLearning) {
          const stability = fsrs.stability || 0
          return { idx, score: 3 - (stability / 10000) } // Priority 3: Due reviews
        } else {
          const timeToDue = dueDate.getTime() - now.getTime()
          return { idx, score: 1 - (timeToDue / 1e12) } // Priority 1: Undue reviews
        }
      })
      
      scoredQuestions.sort((a: any, b: any) => b.score - a.score)
      const best = scoredQuestions[0]
      if (best && best.score > -1000) {
        nextIdx = best.idx
      }
    } else if (activeMode === 'sequential') {
      nextIdx = Math.min(currentIndex + 1, total - 1)
    } else if (activeMode === 'random') {
      // Find a random index not answered in THIS session
      const pool = questions.map((_: any, i: number) => i).filter((i: number) => updatedAnswers[i] === undefined)
      if (pool.length > 0) {
        nextIdx = pool[Math.floor(Math.random() * pool.length)]
      }
    } else if (activeMode === 'unseen') {
      // Find next card with 0 historical attempts and not answered in THIS session
      nextIdx = questions.findIndex((q: any, i: number) => 
        i > currentIndex && 
        (q.stats?.total || 0) === 0 && 
        updatedAnswers[i] === undefined
      )
      if (nextIdx === -1) {
        // Loop back to find any unseen
        nextIdx = questions.findIndex((q: any, i: number) => 
          (q.stats?.total || 0) === 0 && 
          updatedAnswers[i] === undefined
        )
      }
    } else if (activeMode === 'review') {
      // Find next card with historical mistakes (total - correct > 0) and not answered in THIS session
      nextIdx = questions.findIndex((q: any, i: number) => 
        i > currentIndex && 
        ((q.stats?.total || 0) - (q.stats?.correct || 0)) > 0 && 
        updatedAnswers[i] === undefined
      )
      if (nextIdx === -1) {
        // Loop back to find any mistake card not answered in THIS session
        nextIdx = questions.findIndex((q: any, i: number) => 
          ((q.stats?.total || 0) - (q.stats?.correct || 0)) > 0 && 
          updatedAnswers[i] === undefined
        )
      }
    } else if (activeMode === 'hardest') {
      // Find the unanswered card in this session with the lowest correctness ratio.
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

    if (mode === 'fsrs') {
      const now = new Date()
      const scoredQuestions = questions.map((q: any, idx: number) => {
        const isCurrentlyUnlocked = (() => {
          if (!q.fsrs || !q.fsrs.due) return true;
          return parseUTCDate(q.fsrs.due).getTime() - 30000 <= now.getTime();
        })()
        const hasAnswered = sessionAnswers[idx] !== undefined && !isCurrentlyUnlocked
        if (hasAnswered) return { idx, score: -1000 }
        
        const fsrs = q.fsrs
        if (!fsrs || !fsrs.due) {
          return { idx, score: 2 } // Priority 2: New Card
        }
        
        const dueDate = parseUTCDate(fsrs.due)
        const isDue = dueDate <= now
        const isLearning = fsrs.state === 1 || fsrs.state === 3
        
        if (isDue || isLearning) {
          const stability = fsrs.stability || 0
          return { idx, score: 3 - (stability / 10000) } // Priority 3: Due reviews (shortest stability first)
        } else {
          const timeToDue = dueDate.getTime() - now.getTime()
          return { idx, score: 1 - (timeToDue / 1e12) } // Priority 1: Undue reviews (closest first)
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
        sessionAnswers[i] === undefined
      )
      if (targetIdx === -1) {
        alertMsg = 'All cards have been attempted! Serving remaining cards sequentially.'
      }
    } else if (mode === 'review') {
      targetIdx = questions.findIndex((q: any, i: number) => 
        ((q.stats?.total || 0) - (q.stats?.correct || 0)) > 0 && 
        sessionAnswers[i] === undefined
      )
      if (targetIdx === -1) {
        alertMsg = "No incorrect cards found yet! We'll serve questions sequentially until mistakes are recorded."
      }
    } else if (mode === 'hardest') {
      let bestIdx = -1
      let minRatio = Infinity
      let maxWrongs = -1

      for (let i = 0; i < total; i++) {
        if (sessionAnswers[i] !== undefined) continue

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
      if (sessionAnswers[currentIndex] === undefined) {
        targetIdx = currentIndex
      } else {
        const pool = questions.map((_: any, i: number) => i).filter((i: number) => sessionAnswers[i] === undefined)
        if (pool.length > 0) {
          targetIdx = pool[Math.floor(Math.random() * pool.length)]
        }
      }
    } else if (mode === 'sequential') {
      targetIdx = questions.findIndex((_: any, i: number) => sessionAnswers[i] === undefined)
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
      
      const res = await axios.post(`/api/v1/quiz/${id}/ask-ai`, payload)
      
      if (res.data.status === 'processing') {
        // Polling loop
        let attempts = 0
        const maxAttempts = 45 // 90 seconds total (45 * 2) - Gemini can be slow under load
        const poll = setInterval(async () => {
          attempts++
          try {
            // Append cache buster to completely bypass browser and proxy caching
            const quizRes = await axios.get(`/api/v1/quiz/${id}/play-data?t=${Date.now()}`)
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
          } catch (e) {}
          
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
      await axios.patch(`/api/v1/quiz/${id}`, { ai_prompt: promptInput })
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
      await axios.patch(`/api/v1/quiz/question/${currentQuestion.id}`, { ai_explanation: null })
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
      
      await axios.patch(`/api/v1/quiz/question/${currentQuestion.id}`, { 
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

      await axios.patch(`/api/v1/quiz/question/${currentQuestion.id}`, payload)
      
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
             "flex items-center justify-between gap-3 py-4 border-t border-slate-100 bg-white/95 backdrop-blur-xl sticky bottom-0 z-50 px-6"
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
                 "w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-2xl border transition-all duration-300 active:scale-90",
                 ((activeFeedbackTab === 'ai' && isEditingAI) || (activeFeedbackTab === 'note' && isEditingNote) || (activeFeedbackTab === 'insight' && isEditingInsight))
                   ? "bg-gradient-to-r from-emerald-500 to-teal-600 border-transparent text-white shadow-lg shadow-emerald-100 scale-105"
                   : "bg-slate-50 border-slate-200/80 text-slate-500 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 shadow-sm"
               )}
             >
               {((activeFeedbackTab === 'ai' && isEditingAI) || (activeFeedbackTab === 'note' && isEditingNote) || (activeFeedbackTab === 'insight' && isEditingInsight)) ? (
                 <Check className="w-5 h-5 stroke-[3] animate-pulse" />
               ) : (
                 <Edit3 className="w-5 h-5" />
               )}
             </button>

             <div className="flex items-center bg-slate-50 p-1 rounded-2xl h-14 border border-slate-200/60 shadow-inner gap-1">
               {tabs.map((tab: any) => {
                 const isActive = activeFeedbackTab === tab.id
                 return (
                   <button
                     key={tab.id}
                     onClick={() => setActiveFeedbackTab(tab.id)}
                     className={cn(
                       "w-12 h-11 flex items-center justify-center rounded-xl transition-all duration-300 relative",
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
                       <tab.icon className={cn("w-5 h-5 transition-transform duration-300", isActive && "scale-110")} />
                       {tab.hasContent && (
                         <span className={cn(
                           "absolute -top-1 -right-1 w-2 h-2 rounded-full border border-white animate-pulse",
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
                   "w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-2xl border transition-all duration-300 active:scale-90 shadow-sm",
                   isCopied 
                     ? "bg-gradient-to-r from-emerald-500 to-teal-600 border-transparent text-white shadow-lg shadow-emerald-100 scale-105" 
                     : "bg-slate-50 border-slate-200/80 text-slate-500 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600"
                 )}
               >
                 {isCopied ? <Check className="w-5 h-5 stroke-[3]" /> : <Copy className="w-5 h-5" />}
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

  const renderSessionStats = () => {
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

  const renderQuestionMapGrid = () => (
    <div className="grid grid-cols-8 md:grid-cols-10 lg:grid-cols-5 gap-3 p-1 pb-4">
      {session.questions?.map((q: any, i: number) => {
        const hasAttemptedThisSession = sessionAnswers[i] !== undefined
        const attemptedRatings = Array.isArray(sessionAnswers[i]) 
          ? (sessionAnswers[i] as number[]) 
          : (typeof sessionAnswers[i] === 'number' ? [sessionAnswers[i] as number] : [])
        const selectedOptIdx = attemptedRatings.length > 0 ? attemptedRatings[attemptedRatings.length - 1] : null

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
                selectedOptIdx === 0 ? "text-rose-600" :
                selectedOptIdx === 1 ? "text-amber-600" :
                selectedOptIdx === 2 ? "text-indigo-600" :
                "text-emerald-600"
              )}>
                {selectedOptIdx === 0 ? "AGAIN" : selectedOptIdx === 1 ? "HARD" : selectedOptIdx === 2 ? "GOOD" : "EASY"}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )

  if (!session) return <div className="min-h-screen flex items-center justify-center font-black animate-pulse">LOADING SESSION...</div>

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 via-indigo-50/20 to-slate-50 text-slate-900 font-sans overflow-hidden relative">
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
                "fixed bottom-32 left-1/2 -translate-x-1/2 z-[1001] px-6 py-3 rounded-2xl font-black text-base shadow-2xl pointer-events-none transition-all duration-300",
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
              <span className="text-[11px] font-black text-indigo-600">{initialTotalXP} XP</span>
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[8px] font-black shadow-sm shadow-indigo-200">
                 <span>+{sessionXP}</span>
              </div>
              {streak >= 2 && (
                <div className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-white text-[8px] font-black shadow-sm shadow-orange-200">
                  <Flame className="w-3 h-3 fill-white" />
                  <span>{streak}🔥</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white shadow-md text-[11px] font-black transition-all",
            !showFeedback ? "bg-gradient-to-r from-slate-800 to-slate-900 shadow-slate-300" : "bg-gradient-to-r from-emerald-500 to-teal-500 shadow-emerald-200"
          )}>
            <Timer className={cn("w-3.5 h-3.5", !showFeedback && "animate-pulse")} />
            <span>{timeLeft}s</span>
          </div>
          
          <AnimatePresence>
            {showFeedback && (
              <motion.button 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={copyQuestionToClipboard}
                className="w-9 h-9 flex items-center justify-center bg-amber-50 border border-amber-100 rounded-xl text-amber-500 shadow-sm active:scale-90 transition-all hover:bg-amber-100"
                title="Copy card"
              >
                <Copy className="w-4 h-4" />
              </motion.button>
            )}
          </AnimatePresence>

          <button 
            onClick={openEditModal}
            className="w-9 h-9 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 shadow-sm active:scale-90 transition-all"
            title="Edit card"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setIsQuitModalOpen(true)}
            className="w-9 h-9 flex items-center justify-center bg-rose-50 border border-rose-200 rounded-xl text-rose-500 hover:bg-rose-100 shadow-sm active:scale-90 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 flex w-full max-w-none justify-center gap-4 lg:gap-8 px-2 lg:px-6 xl:px-10 md:py-6 py-2 overflow-hidden">
        <aside className="hidden xl:flex w-[340px] 2xl:w-[440px] flex-shrink-0 flex-col overflow-hidden bg-white border border-slate-100 rounded-[2.5rem] shadow-sm">
          {showFeedback ? renderFeedbackArea(false) : (
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="p-6 border-b border-slate-50 flex items-center justify-center bg-white sticky top-0 z-10">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Rate card to view analysis</span>
              </div>
              
              <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6 text-center">
                {/* Animated waiting indicator */}
                <div className="relative w-20 h-20 flex items-center justify-center mb-2">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 animate-pulse" />
                  <div className="absolute inset-2 rounded-full bg-white" />
                  <Lightbulb className="w-8 h-8 text-indigo-400 relative z-10" />
                </div>

                <div>
                  <h3 className="text-sm font-black text-slate-700 mb-1">Rate your recall</h3>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-[200px]">After rating, you will see detailed analysis and AI explanation here.</p>
                </div>

                {/* Divider */}
                <div className="w-full h-px bg-slate-100" />

                {/* Session Quick Stats */}
                <div className="w-full space-y-2">
                  <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">Study Session Progress</span>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="flex flex-col items-center p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="text-lg font-black text-slate-700">{Object.keys(sessionAnswers).length}</span>
                      <span className="text-[8px] font-bold text-slate-400 uppercase">Rated</span>
                    </div>
                    <div className="flex flex-col items-center p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                      <span className="text-lg font-black text-emerald-600">
                        {Object.entries(sessionAnswers).filter(([idx, optIdx]) => {
                          const q = session.questions[Number(idx)];
                          if (!q) return false;
                          const ratingVal = Array.isArray(optIdx) 
                            ? optIdx[optIdx.length - 1] 
                            : (typeof optIdx === 'number' ? optIdx : 0);
                          return q.options && q.options.length > 0
                            ? q.options[ratingVal]?.is_correct
                            : ratingVal > 0;
                        }).length}
                      </span>
                      <span className="text-[8px] font-bold text-emerald-400 uppercase">Correct</span>
                    </div>
                    <div className="flex flex-col items-center p-3 bg-rose-50 rounded-2xl border border-rose-100">
                      <span className="text-lg font-black text-rose-600">
                        {Object.keys(sessionAnswers).length - Object.entries(sessionAnswers).filter(([idx, optIdx]) => {
                          const q = session.questions[Number(idx)];
                          if (!q) return false;
                          const ratingVal = Array.isArray(optIdx) 
                            ? optIdx[optIdx.length - 1] 
                            : (typeof optIdx === 'number' ? optIdx : 0);
                          return q.options && q.options.length > 0
                            ? q.options[ratingVal]?.is_correct
                            : ratingVal > 0;
                        }).length}
                      </span>
                      <span className="text-[8px] font-bold text-rose-400 uppercase">Wrong</span>
                    </div>
                  </div>

                  {/* Progress bar with milestone markers */}
                  <div className="mt-1">
                    <div className="flex justify-between text-[9px] font-bold text-slate-400 mb-1.5">
                      <span>Card {currentIndex + 1} / {session.questions?.length}</span>
                      <span>{Math.round((Object.keys(sessionAnswers).length / (session.questions?.length || 1)) * 100)}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden relative">
                      <div 
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.round((Object.keys(sessionAnswers).length / (session.questions?.length || 1)) * 100)}%` }}
                      />
                    </div>
                    {/* Milestone markers */}
                    <div className="flex justify-between mt-1">
                      {[25, 50, 75, 100].map(m => (
                        <span key={m} className={cn(
                          "text-[8px] font-black transition-all",
                          milestonesHit.has(m) ? "text-indigo-500" : "text-slate-300"
                        )}>{milestonesHit.has(m) ? (m === 25 ? '🎖' : m === 50 ? '🏆' : m === 75 ? '🌟' : '🎊') : `${m}%`}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="w-full h-px bg-slate-100" />

                {/* Tip */}
                <div className="w-full p-4 bg-indigo-50/60 rounded-2xl border border-indigo-100/60 text-left">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Learning Tip</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                    {currentIndex % 3 === 0 
                      ? "Read the card face carefully before flipping it. Try to actively recall the definition! 🎯"
                      : currentIndex % 3 === 1
                      ? "Be honest with your FSRS ratings to optimize learning efficiency! 💡"
                      : "Consecutive daily streaks help with long-term retention. Try to review cards daily to build memory stability! 🔥"
                    }
                  </p>
                </div>
              </div>
            </div>
          )}
        </aside>

        <div className="w-full max-w-4xl min-w-0 flex flex-col overflow-hidden h-full">
          <div className="flex-1 flex flex-col overflow-hidden md:pr-2 md:pb-2 pr-0 pb-0">
            

          <AnimatePresence mode="wait">
            <motion.div 
              key={currentIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col h-full w-full min-h-0"
            >
              {/* 3D perspective flippable Flashcard Container */}
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
                        <span className="text-[10px] font-black tracking-wider text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 shadow-sm">
                          {currentIndex + 1} / {session.questions?.length || 0}
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
                        <span className="text-[10px] font-black tracking-wider text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 shadow-sm">
                          {currentIndex + 1} / {session.questions?.length || 0}
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

                      {currentQuestion?.others?.back_img && (
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
                        <div className="md:mt-3 mt-1.5 p-2.5 bg-slate-50/50 rounded-2xl border border-slate-100 flex flex-col gap-2 w-full">
                          <div className="flex items-center justify-between text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">
                            <span>Card Performance Stats</span>
                            {allTimeTotal > 0 && <span>Accuracy: {allTimeAccuracy}%</span>}
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            {/* Session Reviews History */}
                            <div className="flex flex-col gap-1 justify-center">
                              <span className="text-[7px] font-black text-slate-400 uppercase tracking-wider pl-1">Session Practice</span>
                              {sessionRatings.length > 0 ? (
                                <div className="h-2 w-full rounded-full bg-slate-200/60 overflow-hidden flex shadow-inner">
                                  {sessionRatings.map((rating, idx) => {
                                    const colorMap = ['bg-rose-500', 'bg-amber-500', 'bg-indigo-500', 'bg-emerald-500'];
                                    return (
                                      <div 
                                        key={idx} 
                                        className={cn("h-full flex-1 border-r last:border-0 border-white/20", colorMap[rating] || 'bg-slate-400')}
                                        title={`Review ${idx + 1}: ${['Again', 'Hard', 'Good', 'Easy'][rating]}`}
                                      />
                                    );
                                  })}
                                </div>
                              ) : (
                                <span className="text-[8px] font-bold text-slate-300 italic uppercase pl-1">No reviews yet</span>
                              )}
                            </div>

                            {/* All-time stats */}
                            <div className="flex flex-col gap-1 justify-center">
                              <span className="text-[7px] font-black text-slate-400 uppercase tracking-wider pl-1">All-Time ({allTimeTotal} reviews)</span>
                              {allTimeTotal > 0 ? (
                                <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden flex shadow-inner">
                                  {(stats.again_count || 0) > 0 && <div className="h-full bg-rose-500" style={{ width: `${((stats.again_count || 0) / allTimeTotal) * 100}%` }} title={`Again: ${stats.again_count}`} />}
                                  {(stats.hard_count || 0) > 0 && <div className="h-full bg-amber-500" style={{ width: `${((stats.hard_count || 0) / allTimeTotal) * 100}%` }} title={`Hard: ${stats.hard_count}`} />}
                                  {(stats.good_count || 0) > 0 && <div className="h-full bg-indigo-500" style={{ width: `${((stats.good_count || 0) / allTimeTotal) * 100}%` }} title={`Good: ${stats.good_count}`} />}
                                  {(stats.easy_count || 0) > 0 && <div className="h-full bg-emerald-500" style={{ width: `${((stats.easy_count || 0) / allTimeTotal) * 100}%` }} title={`Easy: ${stats.easy_count}`} />}
                                </div>
                              ) : (
                                <span className="text-[8px] font-bold text-slate-300 italic uppercase pl-1">New card</span>
                              )}
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
                      return (
                        <div className="flex items-center justify-between bg-gradient-to-r from-slate-50/80 via-white to-slate-50/80 rounded-2xl md:p-3 p-2 md:py-2.5 py-1.5 border border-slate-100/90 text-[10px] font-bold shadow-[0_4px_20px_rgba(0,0,0,0.01),inset_0_1px_2px_rgba(255,255,255,0.6)] backdrop-blur-md gap-2 w-full md:mt-3 mt-1.5">
                          <div className="flex flex-col items-center gap-0.5 flex-1 justify-center">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.15em]">State</span>
                            <span className={cn("px-2.5 py-0.5 rounded-lg border text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-all duration-300", stateColors[stateIdx])}>
                              <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse shadow-[0_0_8px_var(--tw-shadow-color)]", stateDots[stateIdx])} />
                              {stateLabels[stateIdx]}
                            </span>
                          </div>
                          <div className="w-px h-7 bg-gradient-to-b from-slate-100 via-slate-200/60 to-slate-100" />
                          <div className="flex flex-col items-center gap-0.5 flex-1 justify-center">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.15em] flex items-center gap-1">
                              <Clock className="w-3 h-3 text-indigo-400" /> Stability
                            </span>
                            <span className="bg-indigo-50/40 text-indigo-600 border border-indigo-100/30 px-2.5 py-0.5 rounded-lg font-black text-[11px] shadow-sm flex items-center gap-1">
                              {currentQuestion.fsrs.stability ? (
                                <>
                                  <span className="text-[11px] tracking-tight">{currentQuestion.fsrs.stability.toFixed(2)}</span>
                                  <span className="text-[8px] font-bold opacity-75">d</span>
                                </>
                              ) : (
                                'none'
                              )}
                            </span>
                          </div>
                          <div className="w-px h-7 bg-gradient-to-b from-slate-100 via-slate-200/60 to-slate-100" />
                          <div className="flex flex-col items-center gap-0.5 flex-1 justify-center">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.15em] flex items-center gap-1">
                              <Sliders className="w-3 h-3 text-purple-400" /> Difficulty
                            </span>
                            <span className="bg-purple-50/40 text-purple-600 border border-purple-100/30 px-2.5 py-0.5 rounded-lg font-black text-[11px] shadow-sm flex items-center gap-1">
                              {currentQuestion.fsrs.difficulty ? (
                                <span className="text-[11px] tracking-tight">{currentQuestion.fsrs.difficulty.toFixed(2)}</span>
                              ) : (
                                'none'
                              )}
                            </span>
                          </div>
                        </div>
                      );
                    })()}


                    {/* FSRS Buttons Grid (Visible inside card back, hidden after rating until it unlocks) */}
                    {isFlipped && !hasRated && (
                      <div
                        className="grid grid-cols-4 gap-3 mt-4 relative z-[10]"
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
                          <span className={cn("text-[10px] font-black tracking-wider transition-colors duration-200", hasRated && selectedOption === 0 ? "text-white" : "text-rose-500")}>AGAIN</span>
                          <span className={cn("text-xs font-black transition-colors duration-200", hasRated && selectedOption === 0 ? "text-rose-100" : "text-rose-600")}>
                            {currentQuestion?.fsrs?.intervals?.[1] || "<10m"}
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
                          <span className={cn("text-[10px] font-black tracking-wider transition-colors duration-200", hasRated && selectedOption === 1 ? "text-white" : "text-amber-500")}>HARD</span>
                          <span className={cn("text-xs font-black transition-colors duration-200", hasRated && selectedOption === 1 ? "text-amber-100" : "text-amber-600")}>
                            {currentQuestion?.fsrs?.intervals?.[2] || "12h"}
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
                          <span className={cn("text-[10px] font-black tracking-wider transition-colors duration-200", hasRated && selectedOption === 2 ? "text-white" : "text-indigo-500")}>GOOD</span>
                          <span className={cn("text-xs font-black transition-colors duration-200", hasRated && selectedOption === 2 ? "text-indigo-100" : "text-indigo-600")}>
                            {currentQuestion?.fsrs?.intervals?.[3] || "2d"}
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
                          <span className={cn("text-[10px] font-black tracking-wider transition-colors duration-200", hasRated && selectedOption === 3 ? "text-white" : "text-emerald-500")}>EASY</span>
                          <span className={cn("text-xs font-black transition-colors duration-200", hasRated && selectedOption === 3 ? "text-emerald-100" : "text-emerald-600")}>
                            {currentQuestion?.fsrs?.intervals?.[4] || "5d"}
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
                        if (selectedOption === 0) countdownStr = currentQuestion?.fsrs?.intervals?.[1] || "<10m";
                        else if (selectedOption === 1) countdownStr = currentQuestion?.fsrs?.intervals?.[2] || "12h";
                        else if (selectedOption === 2) countdownStr = currentQuestion?.fsrs?.intervals?.[3] || "2d";
                        else countdownStr = currentQuestion?.fsrs?.intervals?.[4] || "5d";
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
                          <span className="text-sm font-black tracking-wide">
                            ✓ RATED {selectedOption === 0 ? "AGAIN" : selectedOption === 1 ? "HARD" : selectedOption === 2 ? "GOOD" : "EASY"}
                          </span>
                          <span className="opacity-80 text-xs">
                            — Unlocks in {countdownStr} ⏳
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="hidden lg:flex w-[340px] 2xl:w-[420px] flex-shrink-0 flex-col overflow-hidden">
          <div className="flex-1 bg-white border border-slate-100 rounded-[2.5rem] p-6 shadow-sm flex flex-col overflow-hidden">
            <h4 className="text-[8px] font-black text-slate-300 uppercase tracking-[0.3em] mb-4 flex-shrink-0">CARD MAP</h4>
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar pb-4">
               {renderSessionStats()}
               {renderQuestionMapGrid()}
            </div>
          </div>
        </aside>
      </main>

      {/* Bottom Controls - Fixed to bottom (same pattern as Layout bottom nav) */}
      <footer className="flex-shrink-0 bg-white/95 backdrop-blur-2xl border-t border-slate-100/80 px-4 py-3 z-[120] shadow-[0_-4px_24px_rgba(99,102,241,0.06)]">
        <div className="max-w-2xl mx-auto w-full flex items-center gap-3 h-13">
          <button onClick={() => setIsMapOpen(true)} className="lg:hidden w-12 h-12 flex-shrink-0 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-2xl text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 shadow-sm active:scale-95 transition-all">
            <LayoutGrid className="w-5 h-5" />
          </button>

          <button 
            onClick={() => setIsModeMenuOpen(true)} 
            className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-2xl text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 shadow-sm active:scale-95 transition-all"
            title="Change Smart Learning Mode"
          >
            {activeMode === 'fsrs' && <Brain className="w-5 h-5 text-indigo-600 animate-pulse" />}
            {activeMode === 'sequential' && <ListOrdered className="w-5 h-5" />}
            {activeMode === 'random' && <Shuffle className="w-5 h-5" />}
            {activeMode === 'unseen' && <EyeOff className="w-5 h-5" />}
            {activeMode === 'review' && <AlertCircle className="w-5 h-5" />}
            {activeMode === 'hardest' && <TrendingUp className="w-5 h-5" />}
          </button>
          
          {(() => {
            if (!currentQuestion) return null;
            
            const hasAudioOrScript = !isFlipped 
              ? (!!currentQuestion.audio || !!currentQuestion.others?.front_audio_url || !!currentQuestion.others?.front_audio_content?.trim())
              : (!!currentQuestion.others?.back_audio_url || !!currentQuestion.others?.back_audio_content?.trim());
              
            if (!hasAudioOrScript) return null;
            
            return (
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  await playCardAudio(isFlipped ? 'back' : 'front');
                }}
                className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-indigo-50 border border-indigo-200 rounded-2xl text-indigo-600 shadow-sm active:scale-95 transition-all hover:bg-indigo-100 hover:border-indigo-300"
                title={isFlipped ? "Pronounce explanation" : "Pronounce word"}
              >
                <Play className="w-5 h-5 fill-indigo-600 animate-pulse" />
              </button>
            );
          })()}
          
          {showFeedback && (
            <button 
              onClick={() => setIsFeedbackOpen(true)} 
              className={`xl:hidden w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-2xl shadow-sm active:scale-95 transition-all relative ${
                justAnswered 
                  ? 'bg-indigo-600 border border-indigo-600 text-white animate-[pulse_1.5s_infinite] ring-4 ring-indigo-300 ring-offset-1 drop-shadow-[0_0_12px_rgba(99,102,241,0.6)]' 
                  : 'bg-indigo-50 border border-indigo-200 text-indigo-600 hover:bg-indigo-100'
              }`}
              title="Xem giải thích và hướng dẫn"
            >
              <BookOpen className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-white animate-pulse"></span>
            </button>
          )}

          {!hasRated ? (
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
                className="flex-1 h-12 bg-gradient-to-r from-indigo-50 to-indigo-100/80 hover:from-indigo-100 hover:to-indigo-200 text-indigo-600 border border-indigo-200/50 font-black text-xs rounded-2xl flex items-center justify-center gap-2 uppercase tracking-widest active:scale-[0.98] transition-all"
              >
                {isFlipped ? "FLIP FRONT" : "FLIP BACK"}
              </button>
              <button 
                onClick={handleNext}
                className="flex-[2] h-12 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white font-black text-xs rounded-2xl shadow-lg shadow-emerald-300/50 flex items-center justify-center gap-2.5 uppercase tracking-widest active:scale-[0.98] transition-all hover:shadow-emerald-400/60 hover:shadow-xl"
              >
                NEXT CARD <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </footer>

      {/* 💡 CHỒI LÊN BÊN DƯỚI - QUICK SWIPE-UP/CLICK HANDLE */}
      {justAnswered && !isFeedbackOpen && (
        <div 
          onClick={() => setIsFeedbackOpen(true)}
          className="fixed bottom-[76px] left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-lg bg-gradient-to-r from-indigo-600/95 to-purple-600/95 text-white py-2.5 px-5 rounded-2xl shadow-[0_-8px_20px_rgba(99,102,241,0.25)] flex items-center justify-between cursor-pointer border border-indigo-400/20 backdrop-blur-md active:scale-98 transition-all hover:from-indigo-600 hover:to-purple-600 group select-none animate-[bounce_2s_infinite] xl:hidden"
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-black tracking-wide uppercase">💡 Xem hướng dẫn & Giải thích chi tiết</span>
          </div>
          <ChevronRight className="w-4 h-4 animate-[translate-x_1s_infinite] group-hover:translate-x-0.5 transition-transform opacity-85" />
        </div>
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
            className="fixed inset-0 z-[200] bg-[#F8FAFC] lg:hidden flex flex-col h-screen"
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white shadow-sm flex-shrink-0">
              <h4 className="text-[12px] font-black text-indigo-600 uppercase tracking-[0.3em]">CARD MAP</h4>
              <button onClick={() => setIsMapOpen(false)} className="w-8 h-8 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-lg text-slate-500 active:scale-95 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
               {renderSessionStats()}
               {renderQuestionMapGrid()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Feedback Modal */}
      <AnimatePresence>
        {isFeedbackOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: 50 }} 
            className="fixed inset-0 z-[200] bg-[#F8FAFC] xl:hidden flex flex-col h-screen"
          >
            <div className="flex items-center justify-center p-3 border-b border-slate-100 bg-white shadow-sm flex-shrink-0">
              <h4 className="text-[9px] font-black text-indigo-600 uppercase tracking-[0.4em]">
                {activeFeedbackTab === 'insight' ? 'LEARNING INSIGHTS' : activeFeedbackTab === 'ai' ? 'AI DEEP ANALYSIS' : 'PERSONAL NOTES'}
              </h4>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
               {renderFeedbackArea(true)}
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
                confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } })
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
                  confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } })
                }}
                className="w-full py-4 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-orange-200 hover:shadow-orange-300 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                AWESOME, KEEP GOING! 🚀
              </button>
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
                        await axios.delete(`/api/v1/quiz/${id}/session`)
                      } catch (e) {}
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
                           onChange={(e) => setEditFormData({...editFormData, content: e.target.value})}
                           className="w-full h-20 p-4 bg-white rounded-2xl border border-slate-100 focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700 transition-all resize-none"
                           placeholder="Enter the front side word or phrase..."
                         />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">BACK SIDE (DEFINITION / EXPLANATION)</label>
                           <textarea 
                             value={editFormData.explanation}
                             onChange={(e) => setEditFormData({...editFormData, explanation: e.target.value})}
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
                             onChange={(e) => setEditFormData({...editFormData, ai_explanation: e.target.value})}
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
                                 onChange={(e) => setEditFormData({...editFormData, image: e.target.value})}
                                 className="w-full p-3 bg-white rounded-xl border border-slate-100 focus:ring-2 focus:ring-indigo-500 text-xs font-semibold text-slate-600"
                                 placeholder="e.g. /static/uploads/1/images/word.jpg"
                               />
                            </div>
                            <div className="space-y-2">
                               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">FRONT AUDIO URL</label>
                               <input 
                                 type="text"
                                 value={editFormData.audio || ''}
                                 onChange={(e) => setEditFormData({...editFormData, audio: e.target.value})}
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

      {/* Card Mastery Level Up Toast */}
      <AnimatePresence>
        {activeMasteryUpgrade && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed bottom-24 left-6 z-[1002] max-w-sm backdrop-blur-xl rounded-[2rem] p-5 flex items-center gap-4 border bg-gradient-to-r from-emerald-500/95 to-teal-600/95 border-emerald-400/60 text-white shadow-[0_20px_50px_rgba(16,185,129,0.35)]"
          >
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shadow-inner flex-shrink-0">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-[8px] font-black tracking-widest uppercase px-2 py-0.5 rounded-md bg-white/20 text-white mb-1 inline-block">
                CARD UPGRADED! ⚡
              </span>
              <h4 className="font-black text-sm text-white">FSRS Mastery Level Up!</h4>
              <p className="text-[11px] text-emerald-100/90 font-bold mt-0.5">
                Level {activeMasteryUpgrade.old_level} → Level {activeMasteryUpgrade.new_level} (Recall Upgraded 🎉)
              </p>
            </div>
          </motion.div>
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
                className="relative max-w-md w-full bg-slate-900/95 border border-violet-500/30 rounded-[3rem] p-8 text-center shadow-[0_0_80px_rgba(139,92,246,0.35)] overflow-hidden"
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
    </div>
  )
}
