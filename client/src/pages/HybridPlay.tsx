import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import axios from 'axios'
import {
  RotateCcw,
  Sparkles,
  Check,
  X,
  ArrowRight,
  Target,
  Brain,
  Trophy,
  Clock,
  Zap,
  Volume2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Award,
  Flame,
  Settings,
  HelpCircle,
  Layers,
  CheckCircle2,
  Sliders,
  Play,
  Shuffle,
  ListOrdered,
  Eye,
  AlertCircle,
  FileQuestion
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'
import { Flashcard3DCard } from '@/components/flashcard/Flashcard3DCard'
import {
  PracticeMcqCard,
  PracticeTypingCard,
  PracticeListeningCard
} from '@/components/practice'
import { usePracticeAudio } from '@/hooks/usePracticeAudio'
import { getAudioContext, cancelAllAudio } from '@/lib/audio'
import type { Question } from '@/types/flashcard'
import type { PracticeQuestionData } from '@/types/practice'
import {
  getCardLifecycleState,
  CARD_LIFECYCLE_META,
  filterCardsByScope,
  findSmartSequentialIndex,
  HYBRID_SCOPE_OPTIONS,
  type HybridScope,
  type HybridOrder,
  type CardLifecycleState
} from '@/utils/cardLifecycle'

export interface HybridSettings {
  batch_size: number // e.g. 3, 5, 10
  required_correct: number // e.g. 1, 2, 3, 5
  scope: HybridScope // 'new' | 'undrilled' | 'all' | 'review' | 'due'
  order: HybridOrder // 'sequential' | 'random'
  allowed_practices: string[] // 'mcq', 'typing', 'listening'
}

export const DEFAULT_HYBRID_SETTINGS: HybridSettings = {
  batch_size: 5,
  required_correct: 2,
  scope: 'new',
  order: 'sequential',
  allowed_practices: ['mcq', 'typing', 'listening']
}

// Card Lifecycle State Badge Component
export const CardLifecycleBadge = ({
  card,
  targetDrillCount = 2,
  masteredCardIds
}: {
  card: Question
  targetDrillCount?: number
  masteredCardIds?: Set<number>
}) => {
  const status = getCardLifecycleState(card, targetDrillCount, masteredCardIds)
  const meta = CARD_LIFECYCLE_META[status]

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black border transition-all shadow-2xs select-none",
        meta.badgeClass
      )}
      title={meta.description}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", meta.dotClass)} />
      <span className="uppercase tracking-wider font-extrabold">{meta.shortLabel}</span>
      <span className="opacity-70 text-[10px] font-medium hidden sm:inline">• {meta.label}</span>
    </div>
  )
}

// Clean loading screen
const SessionLoadingScreen = () => (
  <div className="h-screen h-[100dvh] flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-rose-50/20 to-slate-50 text-slate-800">
    <div className="relative flex items-center justify-center">
      <div className="w-16 h-16 rounded-3xl border-4 border-rose-200 border-t-rose-600 animate-spin" />
      <div className="absolute inset-0 flex items-center justify-center">
        <Zap className="w-6 h-6 text-rose-600 animate-pulse" />
      </div>
    </div>
    <p className="mt-5 text-sm font-black text-slate-700 tracking-wide">
      Initializing Hybrid Pre-Learning Engine...
    </p>
    <p className="text-xs text-slate-400 font-medium mt-1">
      Preparing Skim Preview & Active Recall Drill Batches
    </p>
  </div>
)

export default function HybridPlay() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, gamify, addXp } = useAppStore()

  // ── Session State ──
  const [session, setSession] = useState<any>(null)
  const [rawQuestions, setRawQuestions] = useState<Question[]>([])
  const [masteredCardIds, setMasteredCardIds] = useState<Set<number>>(new Set())
  const [isLoading, setIsLoading] = useState(true)

  // ── Hybrid Configuration (Stored in User Deck Settings) ──
  const [hybridSettings, setHybridSettings] = useState<HybridSettings>(DEFAULT_HYBRID_SETTINGS)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isSavingSettings, setIsSavingSettings] = useState(false)

  // ── Batch & Workflow Stages ──
  // 'skim': Preview batch of cards at skim level (no rating pressure)
  // 'drill': Practice drill for the batch until all cards reach required_correct count
  // 'batch_summary': Brief celebration when batch completes before next batch
  // 'complete': Entire deck completed
  const [stage, setStage] = useState<'skim' | 'drill' | 'batch_summary' | 'complete'>('skim')

  // Batches
  const [currentBatchIndex, setCurrentBatchIndex] = useState(0)
  // Index of card within current batch during 'skim' stage (0 to batch.length - 1)
  const [skimCardIndex, setSkimCardIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)

  // ── Drill Stage State ──
  // Per-card correct counts for current batch: Record<cardId, number>
  const [batchCorrectCounts, setBatchCorrectCounts] = useState<Record<number, number>>({})
  // Currently active card in drill
  const [drillActiveCard, setDrillActiveCard] = useState<Question | null>(null)
  const [drillSubMode, setDrillSubMode] = useState<'mcq' | 'typing' | 'listening'>('mcq')
  const [currentPracticeData, setCurrentPracticeData] = useState<PracticeQuestionData | null>(null)
  const [answered, setAnswered] = useState(false)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [typingInput, setTypingInput] = useState('')
  const [typingFeedback, setTypingFeedback] = useState<{ checked: boolean; isCorrect: boolean } | null>(null)
  const [starredCards, setStarredCards] = useState<Record<number, boolean>>({})

  // ── Session Statistics ──
  const [sessionXP, setSessionXP] = useState(0)
  const [drillTotalAttempts, setDrillTotalAttempts] = useState(0)
  const [drillTotalCorrect, setDrillTotalCorrect] = useState(0)
  const [sessionStartTime] = useState(Date.now())
  const [elapsedTime, setElapsedTime] = useState(0)

  // Floating XP toast
  const [xpFloat, setXpFloat] = useState<{ amount: number; id: number } | null>(null)
  const showXpGain = (amount: number) => {
    setSessionXP(prev => prev + amount)
    addXp(amount)
    setXpFloat({ amount, id: Date.now() })
    setTimeout(() => setXpFloat(null), 1400)
  }

  // Update elapsed time only when session reaches completion screen
  useEffect(() => {
    if (stage === 'complete') {
      setElapsedTime(Math.floor((Date.now() - sessionStartTime) / 1000))
    }
  }, [stage, sessionStartTime])

  // Cleanup audio playback when leaving Hybrid session
  useEffect(() => {
    return () => {
      cancelAllAudio()
    }
  }, [])

  // Filtered Cards according to Scope & Order
  const scopedQuestions: Question[] = useMemo(() => {
    if (!rawQuestions || rawQuestions.length === 0) return []
    const filtered = filterCardsByScope(
      rawQuestions,
      hybridSettings.scope,
      hybridSettings.required_correct,
      masteredCardIds
    )

    if (hybridSettings.order === 'random') {
      const copy = [...filtered]
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy
    }
    return filtered
  }, [rawQuestions, hybridSettings.scope, hybridSettings.order, hybridSettings.required_correct, masteredCardIds])

  // Split scoped questions into batches
  const batches: Question[][] = useMemo(() => {
    if (!scopedQuestions || scopedQuestions.length === 0) return []
    const bSize = Math.max(1, hybridSettings.batch_size)
    const result: Question[][] = []
    for (let i = 0; i < scopedQuestions.length; i += bSize) {
      result.push(scopedQuestions.slice(i, i + bSize))
    }
    return result
  }, [scopedQuestions, hybridSettings.batch_size])

  const totalBatches = batches.length
  const currentBatch: Question[] = batches[currentBatchIndex] || []
  const totalQuestions = scopedQuestions.length

  // Boundary clamp if batch_size setting changes total batches
  useEffect(() => {
    if (batches.length > 0 && currentBatchIndex >= batches.length) {
      setCurrentBatchIndex(Math.max(0, batches.length - 1))
    }
  }, [batches.length, currentBatchIndex])

  // Current Card during Skim Stage
  const currentSkimQuestion: Question | null = currentBatch[skimCardIndex] || null

  // Audio Hook for current card
  const activeQuestionForAudio = stage === 'skim'
    ? currentSkimQuestion
    : drillActiveCard

  const { playCardAudio } = usePracticeAudio({
    session,
    currentQuestion: activeQuestionForAudio || null
  })

  // Web Audio Tone SFX
  const playSfx = (type: 'correct' | 'wrong' | 'flip' | 'complete' | 'batch') => {
    try {
      const ctx = getAudioContext()
      if (!ctx) return
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {})
      }

      if (type === 'correct') {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'sine'
        osc.frequency.setValueAtTime(587.33, ctx.currentTime) // D5
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08) // A5
        gain.gain.setValueAtTime(0.2, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.35)
      } else if (type === 'wrong') {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(260, ctx.currentTime)
        osc.frequency.setValueAtTime(190, ctx.currentTime + 0.12)
        gain.gain.setValueAtTime(0.25, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.3)
      } else if (type === 'flip') {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'sine'
        osc.frequency.setValueAtTime(440, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(620, ctx.currentTime + 0.07)
        gain.gain.setValueAtTime(0.12, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.08)
      } else if (type === 'batch' || type === 'complete') {
        confetti({ zIndex: 9999, particleCount: 120, spread: 80, origin: { y: 0.6 } })
      }
    } catch (e) {}
  }

  // ── 1. Fetch Session and Deck Settings ──
  useEffect(() => {
    let isMounted = true
    const fetchSessionData = async () => {
      try {
        setIsLoading(true)
        const [quizRes, settingsRes] = await Promise.all([
          axios.get(`/api/v1/deck/${id}/play-data?mode=hybrid`),
          axios.get(`/api/v1/deck/${id}/practice-settings`).catch(() => ({ data: {} }))
        ])
        if (!isMounted) return

        const questions: Question[] = quizRes.data.questions || quizRes.data.cards || []
        setRawQuestions(questions)

        if (questions.length === 0) {
          setStage('complete')
          setSession({ ...quizRes.data, questions: [] })
          setIsLoading(false)
          return
        }

        // Parse hybrid settings from user_settings or creator_settings
        const userSet = settingsRes.data?.user_settings?.hybrid || quizRes.data.user_settings?.hybrid || {}
        const creatorSet = settingsRes.data?.creator_settings?.hybrid || quizRes.data.practice_settings?.hybrid || {}
        const mergedSettings: HybridSettings = {
          batch_size: Number(userSet.batch_size || creatorSet.batch_size || DEFAULT_HYBRID_SETTINGS.batch_size),
          required_correct: Number(userSet.required_correct || creatorSet.required_correct || DEFAULT_HYBRID_SETTINGS.required_correct),
          scope: (userSet.scope || creatorSet.scope || DEFAULT_HYBRID_SETTINGS.scope) as HybridScope,
          order: (userSet.order || creatorSet.order || DEFAULT_HYBRID_SETTINGS.order) as HybridOrder,
          allowed_practices: Array.isArray(userSet.allowed_practices) && userSet.allowed_practices.length > 0
            ? userSet.allowed_practices
            : (Array.isArray(creatorSet.allowed_practices) && creatorSet.allowed_practices.length > 0
                ? creatorSet.allowed_practices
                : DEFAULT_HYBRID_SETTINGS.allowed_practices)
        }
        setHybridSettings(mergedSettings)

        // Pre-populate mastered cards from drill stats
        const preMastered = new Set<number>()
        questions.forEach(q => {
          if ((q.practice_summary?.drill_correct ?? 0) >= mergedSettings.required_correct) {
            preMastered.add(q.id)
          }
        })
        setMasteredCardIds(preMastered)

        // Smart Sequential Cursor: automatically position at first unmastered card batch
        if (mergedSettings.order === 'sequential') {
          const filtered = filterCardsByScope(questions, mergedSettings.scope, mergedSettings.required_correct, preMastered)
          const smartIdx = findSmartSequentialIndex(filtered, mergedSettings.required_correct, preMastered)
          const bSize = Math.max(1, mergedSettings.batch_size)
          const targetBatchIdx = Math.floor(smartIdx / bSize)
          const totalB = Math.ceil(filtered.length / bSize)
          if (targetBatchIdx < totalB) {
            setCurrentBatchIndex(targetBatchIdx)
            setSkimCardIndex(smartIdx % bSize)
          }
        }

        setSession({ ...quizRes.data, questions })
        setIsLoading(false)
      } catch (err) {
        console.error('Failed to load hybrid session', err)
        setIsLoading(false)
      }
    }

    fetchSessionData()
    return () => {
      isMounted = false
    }
  }, [id])

  // ── 2. Save Hybrid Settings to Backend (Zero localStorage) ──
  const handleSaveSettings = async (newSettings: HybridSettings, setAsCreator: boolean = false) => {
    setIsSavingSettings(true)
    try {
      if (setAsCreator) {
        await axios.post(`/api/v1/deck/${id}/practice-settings`, {
          is_creator: true,
          settings: {
            hybrid: newSettings
          }
        })
      } else {
        await axios.post(`/api/v1/deck/${id}/practice-settings`, {
          is_creator: false,
          settings: {
            hybrid: newSettings
          }
        })
      }
      setHybridSettings(newSettings)
      setIsSettingsOpen(false)

      // Re-position smart cursor for new settings
      if (newSettings.order === 'sequential') {
        const filtered = filterCardsByScope(rawQuestions, newSettings.scope, newSettings.required_correct, masteredCardIds)
        const smartIdx = findSmartSequentialIndex(filtered, newSettings.required_correct, masteredCardIds)
        const bSize = Math.max(1, newSettings.batch_size)
        const targetBatchIdx = Math.floor(smartIdx / bSize)
        const totalB = Math.ceil(filtered.length / bSize)
        if (targetBatchIdx < totalB) {
          setCurrentBatchIndex(targetBatchIdx)
          setSkimCardIndex(smartIdx % bSize)
        } else {
          setCurrentBatchIndex(0)
          setSkimCardIndex(0)
        }
      } else {
        setCurrentBatchIndex(0)
        setSkimCardIndex(0)
      }
      setStage('skim')
    } catch (e) {
      console.error('Failed to save hybrid settings', e)
    } finally {
      setIsSavingSettings(false)
    }
  }

  // ── 3. Start Drill for Current Batch ──
  const startBatchDrill = () => {
    if (!currentBatch || currentBatch.length === 0) return

    // Initialize correct counts for all cards in this batch
    const initialCounts: Record<number, number> = {}
    currentBatch.forEach(c => {
      initialCounts[c.id] = 0
    })
    setBatchCorrectCounts(initialCounts)

    // Move to drill stage
    setStage('drill')
    pickNextDrillCard(initialCounts)
  }

  // ── 4. Pick Next Incomplete Card in Batch Drill ──
  const pickNextDrillCard = (counts: Record<number, number>) => {
    if (!currentBatch || currentBatch.length === 0) return

    // Find cards that have not yet reached required_correct
    const pendingCards = currentBatch.filter(c => (counts[c.id] || 0) < hybridSettings.required_correct)

    if (pendingCards.length === 0) {
      // All cards in this batch reached pass threshold!
      currentBatch.forEach(c => {
        setMasteredCardIds(prev => new Set([...prev, c.id]))
      })
      playSfx('batch')
      showXpGain(15) // Bonus XP for finishing batch
      if (currentBatchIndex + 1 < totalBatches) {
        setStage('batch_summary')
      } else {
        setStage('complete')
        playSfx('complete')
      }
      return
    }

    // Pick a card from pendingCards (avoid picking same card consecutively if multiple exist)
    let candidate = pendingCards[Math.floor(Math.random() * pendingCards.length)]
    if (pendingCards.length > 1 && drillActiveCard && candidate.id === drillActiveCard.id) {
      const others = pendingCards.filter(c => c.id !== drillActiveCard.id)
      if (others.length > 0) candidate = others[Math.floor(Math.random() * others.length)]
    }

    setDrillActiveCard(candidate)
    generatePracticeForDrillCard(candidate)
    setAnswered(false)
    setSelectedOption(null)
    setTypingInput('')
    setTypingFeedback(null)
  }

  // ── 5. Generate Practice Question Data ──
  const generatePracticeForDrillCard = (q: Question) => {
    if (!q || !scopedQuestions) return

    const qAny = q as any
    const questionText = q.content || qAny.front || q.others?.front || 'Vocabulary Item'
    const correctAns = q.explanation || qAny.back || q.others?.back || (q.options?.find(o => o.is_correct)?.content) || ''

    const hasAudio = Boolean(
      q.audio ||
      q.front_audio_url ||
      q.back_audio_url ||
      q.others?.audio ||
      q.others?.front_audio_url
    )

    // Filter allowed practices based on user settings
    let allowed = hybridSettings.allowed_practices && hybridSettings.allowed_practices.length > 0
      ? hybridSettings.allowed_practices
      : ['mcq', 'typing', 'listening']

    if (!hasAudio) {
      allowed = allowed.filter(m => m !== 'listening')
    }
    if (allowed.length === 0) allowed = ['mcq']

    const chosenMode = allowed[Math.floor(Math.random() * allowed.length)] as 'mcq' | 'typing' | 'listening'
    setDrillSubMode(chosenMode)

    // Build MCQ choices
    let choices: string[] = []
    let correctIdx = 0

    if (q.options && Array.isArray(q.options) && q.options.length >= 2) {
      choices = q.options.map((o: any) => o.content)
      const foundIdx = q.options.findIndex((o: any) => o.is_correct)
      correctIdx = foundIdx !== -1 ? foundIdx : 0
    } else {
      const otherAnswers = scopedQuestions
        .filter((item: Question) => item.id !== q.id)
        .map((item: Question) => {
          const itemAny = item as any
          return item.explanation || itemAny.back || item.others?.back || ''
        })
        .filter((ans: string) => Boolean(ans.trim()) && ans.trim().toLowerCase() !== correctAns.trim().toLowerCase())

      const uniqueOthers = Array.from(new Set(otherAnswers))
      const shuffledOthers = [...uniqueOthers].sort(() => 0.5 - Math.random()).slice(0, 3)
      const pool = [correctAns, ...shuffledOthers]
      const shuffledChoices = [...pool].sort(() => 0.5 - Math.random())
      correctIdx = shuffledChoices.indexOf(correctAns)
      choices = shuffledChoices
    }

    const effSettings = session?.creator_settings || session?.practice_settings || {}
    const modeConfig = effSettings[chosenMode] || effSettings.mcq || {}
    const activePairs = modeConfig.active_pairs || []
    const matchingPair = activePairs[0]
    const pairAudioCol = matchingPair?.audio_col

    const practiceObj: PracticeQuestionData = {
      question: questionText,
      choices,
      correct_index: correctIdx,
      correct_answer: correctAns,
      acceptable_answers: [correctAns, correctAns.toLowerCase().trim()],
      question_key: 'front',
      answer_key: 'back',
      audio_col: pairAudioCol || 'front'
    }

    setCurrentPracticeData(practiceObj)
  }

  // ── 6. Handle Drill Answer (MCQ) ──
  const handleSelectOption = (choiceIdx: number) => {
    if (answered || !currentPracticeData || !drillActiveCard) return
    setSelectedOption(choiceIdx)
    setAnswered(true)

    const isCorrect = choiceIdx === currentPracticeData.correct_index
    handleAnswerResult(isCorrect)
  }

  // ── 7. Handle Drill Answer (Typing) ──
  const handleCheckTyping = () => {
    if (answered || !currentPracticeData || !drillActiveCard) return
    const input = typingInput.trim().toLowerCase()
    const correct = (currentPracticeData.correct_answer || '').trim().toLowerCase()
    const acceptable = (currentPracticeData.acceptable_answers || [correct]).map(a => a.toLowerCase().trim())
    const isCorrect = input === correct || acceptable.includes(input)

    setTypingFeedback({ checked: true, isCorrect })
    setAnswered(true)
    handleAnswerResult(isCorrect)
  }

  // Common answer processor with Isolated Practice Stats Recording
  const handleAnswerResult = (isCorrect: boolean) => {
    if (!drillActiveCard) return

    setDrillTotalAttempts(prev => prev + 1)
    const cardId = drillActiveCard.id
    const prevCount = batchCorrectCounts[cardId] || 0

    let newCount = prevCount
    if (isCorrect) {
      newCount = prevCount + 1
      setDrillTotalCorrect(prev => prev + 1)
      playSfx('correct')
      showXpGain(5) // +5 XP per correct active recall
    } else {
      playSfx('wrong')
    }

    // Auto-play audio on answer if configured
    const rawAKey = currentPracticeData?.answer_key || 'front'
    const aKey = Array.isArray(rawAKey) ? (rawAKey[0] || 'front') : rawAKey
    const configuredAudioCol = currentPracticeData?.audio_col
    const targetAudioCol = (configuredAudioCol && String(configuredAudioCol).trim()) ? String(configuredAudioCol).trim() : aKey
    if (targetAudioCol !== 'none' && targetAudioCol !== 'off' && targetAudioCol !== 'disabled') {
      playCardAudio(targetAudioCol)
    }

    const updatedCounts = {
      ...batchCorrectCounts,
      [cardId]: newCount
    }
    setBatchCorrectCounts(updatedCounts)

    if (newCount >= hybridSettings.required_correct) {
      setMasteredCardIds(prev => new Set([...prev, cardId]))
    }

    // STRICT FSRS ISOLATION:
    // Records strictly into UserPracticeStats with practice_mode='hybrid_drill'.
    // UserCardMastery state, stability, difficulty, last_review, and due dates are 100% untouched.
    try {
      axios.post('/api/v1/deck/record_answer', {
        attempt_id: session?.attempt_id || null,
        card_id: cardId,
        deck_id: Number(id),
        is_correct: isCorrect,
        is_practice: true,
        practice_mode: 'hybrid_drill',
        time_spent: 2.5
      }).catch(() => {})
    } catch (e) {}
  }

  // ── 8. Next Drill Card / Advance Batch ──
  const handleAdvanceDrill = () => {
    pickNextDrillCard(batchCorrectCounts)
  }

  const handleProceedToNextBatch = () => {
    if (currentBatchIndex + 1 < totalBatches) {
      setCurrentBatchIndex(prev => prev + 1)
      setSkimCardIndex(0)
      setIsFlipped(false)
      setStage('skim')
    } else {
      setStage('complete')
      playSfx('complete')
    }
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

      if (e.code === 'Space' && stage === 'skim') {
        e.preventDefault()
        setIsFlipped(prev => !prev)
        playSfx('flip')
      }
      if (e.code === 'ArrowRight' && stage === 'skim') {
        e.preventDefault()
        if (skimCardIndex + 1 < currentBatch.length) {
          setSkimCardIndex(prev => prev + 1)
          setIsFlipped(false)
        }
      }
      if (e.code === 'ArrowLeft' && stage === 'skim') {
        e.preventDefault()
        if (skimCardIndex > 0) {
          setSkimCardIndex(prev => prev - 1)
          setIsFlipped(false)
        }
      }
      if (e.code === 'Enter' && stage === 'drill' && answered) {
        e.preventDefault()
        handleAdvanceDrill()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [stage, skimCardIndex, currentBatch.length, answered, batchCorrectCounts])

  if (isLoading) {
    return <SessionLoadingScreen />
  }

  // Calculate overall batch progress
  const passedCardsInBatchCount = currentBatch.filter(c => (batchCorrectCounts[c.id] || 0) >= hybridSettings.required_correct).length

  return (
    <div className="h-screen h-[100dvh] flex flex-col bg-gradient-to-br from-slate-50 via-rose-50/25 to-slate-50 text-slate-900 font-sans overflow-hidden relative">
      {/* ═══════════ FLOATING XP NOTIFIER ═══════════ */}
      <AnimatePresence>
        {xpFloat && (
          <motion.div
            key={xpFloat.id}
            initial={{ opacity: 0, y: 15, scale: 0.85 }}
            animate={{ opacity: 1, y: -20, scale: 1.1 }}
            exit={{ opacity: 0, y: -45, scale: 0.9 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-[250] pointer-events-none flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-rose-500 text-white font-black text-sm shadow-xl shadow-amber-500/25"
          >
            <Sparkles className="w-4 h-4" />
            <span>+{xpFloat.amount} XP</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════ UNIFIED HEADER HUD ═══════════ */}
      <header className="sticky top-0 flex-shrink-0 z-[120] backdrop-blur-2xl px-3 sm:px-5 py-2 flex items-center justify-between gap-3 bg-white/95 border-b border-rose-100/70 shadow-sm">
        {/* Underline Progress Bar for Total Batches */}
        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-slate-100">
          <motion.div
            className="h-full rounded-r-full bg-gradient-to-r from-rose-500 via-purple-500 to-indigo-600 shadow-[0_0_10px_rgba(244,63,94,0.4)]"
            animate={{
              width: `${totalBatches > 0 ? Math.round(((currentBatchIndex + (stage === 'drill' ? (passedCardsInBatchCount / Math.max(1, currentBatch.length)) : 0)) / totalBatches) * 100) : 0}%`
            }}
            transition={{ type: 'spring', stiffness: 120, damping: 18 }}
          />
        </div>

        {/* Left: Exit & Deck Title */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => navigate(`/decks/${id}`)}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            title="Exit Hybrid Session"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="min-w-0 flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-black text-xs sm:text-sm text-slate-800 truncate">
                {session?.title || 'Hybrid Recall'}
              </span>
              <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-rose-100 text-rose-700">
                BETA
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-bold truncate">
              Batch {currentBatchIndex + 1}/{totalBatches} • {currentBatch.length} Cards • Scope: {hybridSettings.scope.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Center: Stage Indicator Pill */}
        <div className="flex items-center gap-2">
          {stage === 'skim' ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-800 font-black text-[11px] shadow-2xs">
              <Layers className="w-3.5 h-3.5 text-amber-600" />
              <span>PHASE 1: SKIM PREVIEW ({skimCardIndex + 1}/{currentBatch.length})</span>
            </div>
          ) : stage === 'drill' ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-700 font-black text-[11px] shadow-2xs animate-pulse">
              <Target className="w-3.5 h-3.5 text-rose-500" />
              <span>PHASE 2: RECALL DRILL ({passedCardsInBatchCount}/{currentBatch.length} PASSED)</span>
            </div>
          ) : null}
        </div>

        {/* Right: Settings & Stats */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Settings Gear */}
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-indigo-600 transition-all cursor-pointer"
            title="Configure Hybrid Recall Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Session XP Pill */}
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-700 font-black text-xs shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
            <span>+{sessionXP}</span>
          </div>
        </div>
      </header>

      {/* ═══════════ MAIN CONTENT AREA ═══════════ */}
      <main className="flex-1 min-h-0 flex w-full max-w-4xl mx-auto flex-col justify-center items-center px-3 sm:px-6 py-2 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {stage === 'skim' && currentSkimQuestion ? (
            /* ──────────────── STAGE A: SKIM PREVIEW ──────────────── */
            <motion.div
              key={`skim-${currentBatchIndex}-${skimCardIndex}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="w-full h-full flex flex-col justify-center items-center min-h-0"
            >
              {/* Top Hint Banner with Card Lifecycle Badge */}
              <div className="mb-2 flex items-center justify-between w-full max-w-xl px-1">
                <CardLifecycleBadge
                  card={currentSkimQuestion}
                  targetDrillCount={hybridSettings.required_correct}
                  masteredCardIds={masteredCardIds}
                />
                <div className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                  <HelpCircle className="w-3 h-3 text-slate-400" />
                  <span>Preview all {currentBatch.length} cards, then start drill</span>
                </div>
              </div>

              <Flashcard3DCard
                currentQuestion={currentSkimQuestion}
                currentIndex={currentBatchIndex * hybridSettings.batch_size + skimCardIndex}
                isFlipped={isFlipped}
                setIsFlipped={setIsFlipped}
                isSelectMode={false}
                effectiveCardFlipTrigger="card_click"
                frontValign="center"
                frontHalign="center"
                backValign="center"
                backHalign="center"
                showImages={true}
                setZoomedImage={() => {}}
                effectiveShowFsrs={false} // Clean skim view without FSRS pressure
                selectedOption={null}
                hasRated={false}
                activeDragGrade={null}
                dragOffset={{ x: 0, y: 0 }}
                canDragRate={false}
                hasBackOverflow={false}
                backScrollRef={{ current: null }}
                handleCardDrag={() => {}}
                handleCardDragEnd={() => {}}
                cardDragControls={undefined}
                activeMasteryUpgrade={null}
                currentTime={new Date()}
                showAbsoluteFirst={false}
                setShowAbsoluteFirst={() => {}}
                showAbsoluteLast={false}
                setShowAbsoluteLast={() => {}}
                renderFlyToolbarNode={() => null}
                setIsFlyToolbarOpen={() => {}}
                setShowFeedback={() => {}}
                setJustAnswered={() => {}}
                handleStarQuestion={() => {
                  setStarredCards(prev => ({ ...prev, [currentSkimQuestion.id]: !prev[currentSkimQuestion.id] }))
                }}
                activeMode="hybrid_skim"
              />
            </motion.div>
          ) : stage === 'drill' && drillActiveCard ? (
            /* ──────────────── STAGE B: ACTIVE RECALL DRILL ──────────────── */
            <motion.div
              key={`drill-${drillActiveCard.id}-${drillTotalAttempts}`}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.03 }}
              transition={{ duration: 0.2 }}
              className="w-full h-full flex flex-col justify-between items-center min-h-0"
            >
              {/* Batch Mastery Chips HUD & Card State Badge */}
              <div className="w-full max-w-2xl flex items-center justify-between gap-2 py-1 overflow-x-auto no-scrollbar shrink-0 px-2">
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  {currentBatch.map((card, idx) => {
                    const cCount = batchCorrectCounts[card.id] || 0
                    const isPassed = cCount >= hybridSettings.required_correct
                    const isCurrent = card.id === drillActiveCard?.id
                    return (
                      <div
                        key={card.id}
                        className={cn(
                          "px-2 py-0.5 rounded-xl text-[10px] font-black border transition-all flex items-center gap-1 shadow-2xs shrink-0",
                          isPassed
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                            : isCurrent
                              ? "bg-rose-50 border-rose-300 text-rose-700 ring-2 ring-rose-400/20"
                              : "bg-white border-slate-200 text-slate-500"
                        )}
                      >
                        {isPassed ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                        )}
                        <span className="truncate max-w-[70px]">
                          {card.content || (card as any).front || `#${idx + 1}`}
                        </span>
                        <span className="font-mono text-[9px] opacity-70">
                          {cCount}/{hybridSettings.required_correct}
                        </span>
                      </div>
                    )
                  })}
                </div>

                <CardLifecycleBadge
                  card={drillActiveCard}
                  targetDrillCount={hybridSettings.required_correct}
                  masteredCardIds={masteredCardIds}
                />
              </div>

              {/* Practice Exercise Body */}
              <div className="w-full max-w-xl flex-1 flex flex-col justify-center min-h-0 py-2">
                {drillSubMode === 'mcq' && currentPracticeData && (
                  <PracticeMcqCard
                    currentIndex={drillActiveCard ? drillActiveCard.id : 0}
                    currentQuestion={drillActiveCard}
                    practiceData={currentPracticeData}
                    selectedOption={selectedOption}
                    answered={answered}
                    starredCards={starredCards}
                    onToggleStar={(cId) => setStarredCards(prev => ({ ...prev, [cId]: !prev[cId] }))}
                    onSelectOption={handleSelectOption}
                    onPreviewInsight={() => {}}
                    sessionQuestions={scopedQuestions}
                    onPlayAudio={() => playCardAudio('front')}
                  />
                )}

                {drillSubMode === 'typing' && currentPracticeData && (
                  <PracticeTypingCard
                    currentIndex={drillActiveCard ? drillActiveCard.id : 0}
                    currentQuestion={drillActiveCard}
                    practiceData={currentPracticeData}
                    typingInput={typingInput}
                    setTypingInput={setTypingInput}
                    typingFeedback={typingFeedback}
                    answered={answered}
                    starredCards={starredCards}
                    onToggleStar={(cId) => setStarredCards(prev => ({ ...prev, [cId]: !prev[cId] }))}
                    onCheckTyping={handleCheckTyping}
                  />
                )}

                {drillSubMode === 'listening' && currentPracticeData && (
                  <PracticeListeningCard
                    currentIndex={drillActiveCard ? drillActiveCard.id : 0}
                    currentQuestion={drillActiveCard}
                    practiceData={currentPracticeData}
                    listeningType="mcq"
                    selectedOption={selectedOption}
                    answered={answered}
                    starredCards={starredCards}
                    onToggleStar={(cId) => setStarredCards(prev => ({ ...prev, [cId]: !prev[cId] }))}
                    onSelectOption={handleSelectOption}
                    onPlayAudio={() => playCardAudio('front')}
                  />
                )}
              </div>
            </motion.div>
          ) : stage === 'batch_summary' ? (
            /* ──────────────── STAGE C: BATCH COMPLETED ──────────────── */
            <motion.div
              key="batch_summary"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-md bg-white rounded-3xl border border-rose-100 p-6 sm:p-8 shadow-xl text-center flex flex-col items-center"
            >
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center shadow-lg shadow-emerald-500/25 mb-4">
                <Trophy className="w-8 h-8" />
              </div>

              <h2 className="text-xl font-black text-slate-800">
                Batch {currentBatchIndex + 1} Drilled & Mastered!
              </h2>
              <p className="text-xs text-slate-400 font-medium mt-1">
                All {currentBatch.length} cards answered correctly {hybridSettings.required_correct}x times
              </p>

              {/* Batch Stats Grid */}
              <div className="grid grid-cols-2 gap-3 w-full my-6">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col items-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Batch Accuracy</span>
                  <span className="text-lg font-black text-slate-800">
                    {drillTotalAttempts > 0 ? Math.round((drillTotalCorrect / drillTotalAttempts) * 100) : 100}%
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-100 flex flex-col items-center">
                  <span className="text-[10px] font-bold text-amber-600 uppercase">XP Earned</span>
                  <span className="text-lg font-black text-amber-700">+{sessionXP} XP</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleProceedToNextBatch}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-indigo-600 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-200 active:scale-95 transition-all cursor-pointer"
              >
                <span>Continue to Batch {currentBatchIndex + 2} of {totalBatches}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          ) : (
            /* ──────────────── STAGE D: COMPLETE SESSION ──────────────── */
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-md bg-white rounded-3xl border border-slate-100 p-8 shadow-2xl text-center flex flex-col items-center"
            >
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-rose-500 via-purple-500 to-indigo-500 text-white flex items-center justify-center shadow-xl shadow-rose-500/25 mb-4 animate-bounce">
                <Award className="w-10 h-10" />
              </div>

              <h2 className="text-2xl font-black text-slate-800">
                Hybrid Recall Complete!
              </h2>
              <p className="text-xs text-slate-400 font-medium mt-1">
                You drilled {totalQuestions} vocabulary items into active reflex memory
              </p>

              <div className="w-full grid grid-cols-3 gap-2 my-6">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col items-center">
                  <span className="text-[10px] font-bold text-slate-400">CARDS</span>
                  <span className="text-base font-black text-slate-800">{totalQuestions}</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col items-center">
                  <span className="text-[10px] font-bold text-slate-400">TIME</span>
                  <span className="text-base font-black text-slate-800">{Math.floor(elapsedTime / 60)}m {elapsedTime % 60}s</span>
                </div>
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-100 flex flex-col items-center">
                  <span className="text-[10px] font-bold text-amber-600">TOTAL XP</span>
                  <span className="text-base font-black text-amber-700">+{sessionXP}</span>
                </div>
              </div>

              <div className="w-full flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentBatchIndex(0)
                    setSkimCardIndex(0)
                    setStage('skim')
                  }}
                  className="flex-1 py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Restart Deck</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate(`/decks/${id}`)}
                  className="flex-1 py-3 px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs flex items-center justify-center gap-1.5 transition-colors shadow-md shadow-rose-200 cursor-pointer"
                >
                  <span>Return to Deck</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ═══════════ DOCKED BOTTOM SEGMENTED CONTROLS ═══════════ */}
      {stage === 'skim' && (
        <footer className="shrink-0 z-[110] bg-white/95 backdrop-blur-xl border-t border-rose-100/70 py-2.5 px-4 shadow-lg">
          <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
            {/* Prev Skim Card */}
            <button
              type="button"
              disabled={skimCardIndex === 0}
              onClick={() => {
                if (skimCardIndex > 0) {
                  setSkimCardIndex(prev => prev - 1)
                  setIsFlipped(false)
                }
              }}
              className="py-2.5 px-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 font-black text-xs flex items-center gap-1 transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            {/* Flip / Reveal Toggle */}
            <button
              type="button"
              onClick={() => {
                setIsFlipped(prev => !prev)
                playSfx('flip')
              }}
              className="flex-1 py-2.5 px-4 rounded-2xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-700 font-black text-xs flex items-center justify-center gap-1.5 border border-slate-200/80 transition-all cursor-pointer active:scale-95"
            >
              <RefreshCw className={cn("w-4 h-4 transition-transform", isFlipped && "rotate-180 text-rose-600")} />
              <span>{isFlipped ? 'Show Front' : 'Flip / Reveal'}</span>
            </button>

            {/* Next Card or Start Drill */}
            {skimCardIndex + 1 < currentBatch.length ? (
              <button
                type="button"
                onClick={() => {
                  setSkimCardIndex(prev => prev + 1)
                  setIsFlipped(false)
                }}
                className="py-2.5 px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs flex items-center gap-1 shadow-md shadow-rose-200 transition-all cursor-pointer active:scale-95"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={startBatchDrill}
                className="py-2.5 px-5 rounded-2xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-700 hover:to-indigo-700 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-rose-300 transition-all cursor-pointer animate-pulse active:scale-95"
              >
                <span>Start Drill</span>
                <Target className="w-4 h-4" />
              </button>
            )}
          </div>
        </footer>
      )}

      {stage === 'drill' && (
        <footer className="shrink-0 z-[110] bg-white/95 backdrop-blur-xl border-t border-rose-100/70 py-2.5 px-4 shadow-lg">
          <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
            <span className="text-[11px] font-black text-slate-400">
              Drill Mode: <span className="uppercase text-slate-700">{drillSubMode}</span>
            </span>

            {answered ? (
              <button
                type="button"
                onClick={handleAdvanceDrill}
                className="py-3 px-6 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-rose-200 active:scale-95 transition-all cursor-pointer"
              >
                <span>Next Recall Card</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : drillSubMode === 'typing' ? (
              <button
                type="button"
                onClick={handleCheckTyping}
                className="py-3 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-indigo-200 active:scale-95 transition-all cursor-pointer"
              >
                <span>Submit</span>
                <Check className="w-4 h-4" />
              </button>
            ) : null}
          </div>
        </footer>
      )}

      {/* ═══════════ HYBRID SETTINGS MODAL ═══════════ */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-lg bg-white rounded-3xl border border-slate-100 p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-800">Hybrid Recall Settings</h3>
                    <p className="text-[11px] text-slate-400 font-medium">Standardized Pre-Learning & Drill Coordination</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Options */}
              <div className="space-y-4">
                {/* 1. Study Scope Filter */}
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-rose-500" />
                    <span>Card Scope Filter (Phạm vi học)</span>
                  </label>
                  <div className="space-y-1.5">
                    {HYBRID_SCOPE_OPTIONS.map(opt => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setHybridSettings(prev => ({ ...prev, scope: opt.id }))}
                        className={cn(
                          "w-full p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between",
                          hybridSettings.scope === opt.id
                            ? "bg-rose-50/70 border-rose-300 text-rose-900 shadow-2xs"
                            : "bg-slate-50/80 border-slate-200 text-slate-600 hover:bg-slate-100/80"
                        )}
                      >
                        <div>
                          <span className="text-xs font-black block">{opt.label}</span>
                          <span className="text-[10px] text-slate-400 block">{opt.description}</span>
                        </div>
                        <div className={cn(
                          "w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ml-2",
                          hybridSettings.scope === opt.id ? "border-rose-600 bg-rose-600 text-white" : "border-slate-300"
                        )}>
                          {hybridSettings.scope === opt.id && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Order Selector */}
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <ListOrdered className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Card Ordering & Smart Cursor</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setHybridSettings(prev => ({ ...prev, order: 'sequential' }))}
                      className={cn(
                        "p-2.5 rounded-2xl text-left border transition-all cursor-pointer",
                        hybridSettings.order === 'sequential'
                          ? "bg-indigo-50 border-indigo-400 text-indigo-900 shadow-2xs"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      )}
                    >
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <ListOrdered className="w-3.5 h-3.5 text-indigo-600" />
                        <span className="text-xs font-black">Sequential</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block">Smart Cursor (skip drilled)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setHybridSettings(prev => ({ ...prev, order: 'random' }))}
                      className={cn(
                        "p-2.5 rounded-2xl text-left border transition-all cursor-pointer",
                        hybridSettings.order === 'random'
                          ? "bg-indigo-50 border-indigo-400 text-indigo-900 shadow-2xs"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      )}
                    >
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Shuffle className="w-3.5 h-3.5 text-indigo-600" />
                        <span className="text-xs font-black">Random</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block">Shuffle cards randomly</span>
                    </button>
                  </div>
                </div>

                {/* 3. Batch Size */}
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1.5">
                    Cards per Batch (Group Size)
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[3, 5, 10, 15].map(size => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setHybridSettings(prev => ({ ...prev, batch_size: size }))}
                        className={cn(
                          "py-2 rounded-xl text-xs font-black border transition-all cursor-pointer",
                          hybridSettings.batch_size === size
                            ? "bg-rose-50 border-rose-400 text-rose-700 shadow-2xs"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        )}
                      >
                        {size} Cards
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Required Correct Count */}
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1.5">
                    Pass Target (Correct Count to Master)
                  </label>
                  <p className="text-[11px] text-slate-400 mb-2">
                    Number of times each card must be answered correctly in drill before passing.
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 5].map(req => (
                      <button
                        key={req}
                        type="button"
                        onClick={() => setHybridSettings(prev => ({ ...prev, required_correct: req }))}
                        className={cn(
                          "py-2 rounded-xl text-xs font-black border transition-all cursor-pointer",
                          hybridSettings.required_correct === req
                            ? "bg-emerald-50 border-emerald-400 text-emerald-700 shadow-2xs"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        )}
                      >
                        {req} {req === 1 ? 'Time' : 'Times'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 5. Allowed Practice Modes */}
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1.5">
                    Active Practice Types in Drill
                  </label>
                  <div className="space-y-1.5">
                    {[
                      { id: 'mcq', label: 'Multiple Choice (MCQ)', desc: 'Fast reflex 4-choice recognition' },
                      { id: 'typing', label: 'Spelling Typing', desc: 'Deep memory recall character typing' },
                      { id: 'listening', label: 'Audio Listening', desc: 'Audio pronunciation recognition test' }
                    ].map(item => {
                      const isSelected = hybridSettings.allowed_practices.includes(item.id)
                      return (
                        <div
                          key={item.id}
                          onClick={() => {
                            setHybridSettings(prev => {
                              const curr = prev.allowed_practices
                              if (curr.includes(item.id)) {
                                if (curr.length <= 1) return prev // Keep at least one
                                return { ...prev, allowed_practices: curr.filter(x => x !== item.id) }
                              } else {
                                return { ...prev, allowed_practices: [...curr, item.id] }
                              }
                            })
                          }}
                          className={cn(
                            "p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between",
                            isSelected
                              ? "bg-indigo-50/70 border-indigo-200 text-indigo-900"
                              : "bg-slate-50 border-slate-200 text-slate-600 opacity-60"
                          )}
                        >
                          <div>
                            <span className="text-xs font-black block">{item.label}</span>
                            <span className="text-[10px] text-slate-400 block">{item.desc}</span>
                          </div>
                          <div className={cn(
                            "w-5 h-5 rounded-lg flex items-center justify-center border",
                            isSelected ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300"
                          )}>
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isSavingSettings}
                  onClick={() => handleSaveSettings(hybridSettings, false)}
                  className="flex-1 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs transition-all shadow-md shadow-rose-200 cursor-pointer disabled:opacity-50"
                >
                  {isSavingSettings ? 'Saving...' : 'Save for this Deck'}
                </button>

                {user?.role === 'admin' && (
                  <button
                    type="button"
                    disabled={isSavingSettings}
                    onClick={() => handleSaveSettings(hybridSettings, true)}
                    className="py-3 px-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs transition-all cursor-pointer"
                    title="Set as Deck Baseline Default for All Learners"
                  >
                    Set Default
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
