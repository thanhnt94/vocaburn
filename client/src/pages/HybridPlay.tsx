import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
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
  Play
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
import type { Question } from '@/types/flashcard'
import type { PracticeQuestionData } from '@/types/practice'

export interface HybridSettings {
  batch_size: number // e.g. 3, 5, 10
  required_correct: number // e.g. 1, 2, 3, 5
  allowed_practices: string[] // 'mcq', 'typing', 'listening'
}

export const DEFAULT_HYBRID_SETTINGS: HybridSettings = {
  batch_size: 5,
  required_correct: 2,
  allowed_practices: ['mcq', 'typing', 'listening']
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
  const [xpFloat, setXpFloat] = useState<{ id: number; amount: number } | null>(null)

  const showXpGain = (amount: number) => {
    addXp(amount)
    setSessionXP(prev => prev + amount)
    setXpFloat({ id: Date.now(), amount })
    setTimeout(() => setXpFloat(null), 1800)
  }

  // Timer loop
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - sessionStartTime) / 1000))
    }, 1000)
    return () => clearInterval(timer)
  }, [sessionStartTime])

  // Audio Hook for current card
  const activeQuestionForAudio = stage === 'skim'
    ? (session?.questions ? session.questions[currentBatchIndex * hybridSettings.batch_size + skimCardIndex] : null)
    : drillActiveCard

  const { playCardAudio } = usePracticeAudio({
    session,
    currentQuestion: activeQuestionForAudio || null
  })

  // Web Audio Tone SFX
  const playSfx = (type: 'correct' | 'wrong' | 'flip' | 'complete' | 'batch') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()

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
          axios.get(`/api/v1/deck/${id}/quiz`),
          axios.get(`/api/v1/deck/${id}/practice-settings`).catch(() => ({ data: {} }))
        ])
        if (!isMounted) return

        let questions: Question[] = quizRes.data.questions || []
        if (questions.length === 0) {
          setStage('complete')
          setSession({ ...quizRes.data, questions: [] })
          setIsLoading(false)
          return
        }

        // Parse hybrid settings from user_settings or creator_settings
        const userSet = settingsRes.data?.user_settings?.hybrid || {}
        const creatorSet = settingsRes.data?.creator_settings?.hybrid || {}
        const mergedSettings: HybridSettings = {
          batch_size: Number(userSet.batch_size || creatorSet.batch_size || DEFAULT_HYBRID_SETTINGS.batch_size),
          required_correct: Number(userSet.required_correct || creatorSet.required_correct || DEFAULT_HYBRID_SETTINGS.required_correct),
          allowed_practices: Array.isArray(userSet.allowed_practices) && userSet.allowed_practices.length > 0
            ? userSet.allowed_practices
            : (Array.isArray(creatorSet.allowed_practices) && creatorSet.allowed_practices.length > 0
                ? creatorSet.allowed_practices
                : DEFAULT_HYBRID_SETTINGS.allowed_practices)
        }
        setHybridSettings(mergedSettings)

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

  // Split questions into batches
  const batches: Question[][] = useMemo(() => {
    if (!session?.questions || session.questions.length === 0) return []
    const bSize = Math.max(1, hybridSettings.batch_size)
    const result: Question[][] = []
    for (let i = 0; i < session.questions.length; i += bSize) {
      result.push(session.questions.slice(i, i + bSize))
    }
    return result
  }, [session?.questions, hybridSettings.batch_size])

  const totalBatches = batches.length
  const currentBatch: Question[] = batches[currentBatchIndex] || []
  const totalQuestions = session?.questions?.length || 0

  // Current Card during Skim Stage
  const currentSkimQuestion: Question | null = currentBatch[skimCardIndex] || null

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
          user_settings: {
            hybrid: newSettings
          }
        })
      }
      setHybridSettings(newSettings)
      setIsSettingsOpen(false)
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
      playSfx('batch')
      showXpGain(10) // Bonus XP for finishing batch
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
    if (!q || !session?.questions) return

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
      const otherAnswers = session.questions
        .filter((item: Question) => item.id !== q.id)
        .map((item: Question) => {
          const itemAny = item as any
          return item.explanation || itemAny.back || item.others?.back || ''
        })
        .filter((ans: string) => Boolean(ans.trim()) && ans.trim().toLowerCase() !== correctAns.trim().toLowerCase())

      const shuffledOthers = [...otherAnswers].sort(() => 0.5 - Math.random()).slice(0, 3)
      const pool = [correctAns, ...shuffledOthers]
      const shuffledChoices = [...pool].sort(() => 0.5 - Math.random())
      correctIdx = shuffledChoices.indexOf(correctAns)
      choices = shuffledChoices
    }

    const practiceObj: PracticeQuestionData = {
      question: questionText,
      choices,
      correct_index: correctIdx,
      correct_answer: correctAns,
      acceptable_answers: [correctAns, correctAns.toLowerCase().trim()],
      question_key: 'front',
      answer_key: 'back'
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

  // Common answer processor
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
      // Note: card stays in drill pool until required_correct is satisfied
    }

    const updatedCounts = {
      ...batchCorrectCounts,
      [cardId]: newCount
    }
    setBatchCorrectCounts(updatedCounts)
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
            initial={{ opacity: 0, y: 15, scale: 0.8 }}
            animate={{ opacity: 1, y: -25, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            className="fixed top-14 left-1/2 -translate-x-1/2 z-[300] bg-gradient-to-r from-amber-500 to-rose-500 text-white font-black text-xs px-3.5 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 pointer-events-none"
          >
            <Sparkles className="w-3.5 h-3.5" />
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
              Batch {currentBatchIndex + 1}/{totalBatches} • {currentBatch.length} Cards Group
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
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            <span>+{sessionXP} XP</span>
          </div>

          {/* Timer */}
          <div className="hidden md:flex items-center gap-1 text-slate-400 font-bold text-xs">
            <Clock className="w-3.5 h-3.5" />
            <span>{Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, '0')}</span>
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
              {/* Top Hint Banner */}
              <div className="mb-2 px-3 py-1 rounded-full bg-slate-100/90 text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
                <HelpCircle className="w-3 h-3 text-slate-400" />
                <span>Tap card or Space to reveal definition. Preview all {currentBatch.length} cards, then start the drill.</span>
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
                effectiveShowFsrs={false} // Clean skim view without FSRS badges
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
              {/* Batch Mastery Chips HUD */}
              <div className="w-full max-w-2xl flex items-center justify-center gap-1.5 py-1.5 overflow-x-auto no-scrollbar shrink-0">
                {currentBatch.map((card, idx) => {
                  const cCount = batchCorrectCounts[card.id] || 0
                  const isPassed = cCount >= hybridSettings.required_correct
                  const isCurrent = card.id === drillActiveCard?.id
                  return (
                    <div
                      key={card.id}
                      className={cn(
                        "px-2.5 py-1 rounded-xl text-[10px] font-black border transition-all flex items-center gap-1.5 shadow-2xs shrink-0",
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
                      <span className="truncate max-w-[80px]">
                        {card.content || (card as any).front || `#${idx + 1}`}
                      </span>
                      <span className="font-mono text-[9px] opacity-70">
                        {cCount}/{hybridSettings.required_correct}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Render Exercise Card */}
              <div className="flex-1 w-full min-h-0 flex flex-col justify-center">
                {currentPracticeData && (
                  <>
                    {drillSubMode === 'typing' ? (
                      <PracticeTypingCard
                        currentIndex={0}
                        currentQuestion={drillActiveCard}
                        practiceData={currentPracticeData}
                        answered={answered}
                        typingInput={typingInput}
                        setTypingInput={setTypingInput}
                        typingFeedback={typingFeedback}
                        starredCards={starredCards}
                        onToggleStar={(cardId) => setStarredCards(prev => ({ ...prev, [cardId]: !prev[cardId] }))}
                        onCheckTyping={handleCheckTyping}
                      />
                    ) : drillSubMode === 'listening' ? (
                      <PracticeListeningCard
                        currentIndex={0}
                        currentQuestion={drillActiveCard}
                        practiceData={currentPracticeData}
                        answered={answered}
                        listeningType="mcq"
                        typingInput={typingInput}
                        setTypingInput={setTypingInput}
                        typingFeedback={typingFeedback}
                        onCheckTyping={handleCheckTyping}
                        selectedOption={selectedOption}
                        onSelectOption={handleSelectOption}
                        sessionQuestions={session?.questions || []}
                        starredCards={starredCards}
                        onToggleStar={(cardId) => setStarredCards(prev => ({ ...prev, [cardId]: !prev[cardId] }))}
                        onPlayAudio={playCardAudio}
                      />
                    ) : (
                      <PracticeMcqCard
                        currentIndex={0}
                        currentQuestion={drillActiveCard}
                        practiceData={currentPracticeData}
                        answered={answered}
                        selectedOption={selectedOption}
                        starredCards={starredCards}
                        onToggleStar={(cardId) => setStarredCards(prev => ({ ...prev, [cardId]: !prev[cardId] }))}
                        onSelectOption={handleSelectOption}
                        onPreviewInsight={() => {}}
                        sessionQuestions={session?.questions || []}
                        onPlayAudio={playCardAudio}
                      />
                    )}
                  </>
                )}
              </div>
            </motion.div>
          ) : stage === 'batch_summary' ? (
            /* ──────────────── STAGE C: BATCH CELEBRATION ──────────────── */
            <motion.div
              key="batch_summary"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="w-full max-w-md bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 shadow-2xl text-center flex flex-col items-center"
            >
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-400 to-teal-500 flex items-center justify-center text-white shadow-lg mb-4">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-slate-800">
                Batch {currentBatchIndex + 1} Mastered! 🌟
              </h2>
              <p className="text-xs text-slate-400 mt-1 max-w-xs font-medium">
                All {currentBatch.length} cards met your target of {hybridSettings.required_correct} correct recall responses!
              </p>

              <div className="w-full bg-slate-50 rounded-2xl p-3 my-5 border border-slate-100 text-xs font-bold text-slate-600 flex justify-between items-center">
                <span>Batch Accuracy:</span>
                <span className="text-emerald-600 font-black">
                  {drillTotalAttempts > 0 ? Math.round((drillTotalCorrect / drillTotalAttempts) * 100) : 100}%
                </span>
              </div>

              <button
                type="button"
                onClick={handleProceedToNextBatch}
                className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 cursor-pointer active:scale-95 transition-all"
              >
                <span>Proceed to Batch {currentBatchIndex + 2} ({batches[currentBatchIndex + 1]?.length || 0} Cards)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          ) : stage === 'complete' ? (
            /* ──────────────── STAGE D: COMPLETE SCREEN ──────────────── */
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-md bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 shadow-2xl text-center flex flex-col items-center"
            >
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-400 to-rose-500 flex items-center justify-center text-white shadow-lg mb-4">
                <Award className="w-9 h-9" />
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-slate-800">
                Hybrid Recall Complete! 🎉
              </h2>
              <p className="text-xs text-slate-400 mt-1 max-w-xs font-medium">
                You successfully pre-learned and deep-drilled all {totalQuestions} cards!
              </p>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-2 w-full my-6">
                <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                  <span className="text-[10px] font-black text-slate-400 uppercase">CARDS</span>
                  <p className="text-lg font-black text-slate-800 mt-0.5">{totalQuestions}</p>
                </div>

                <div className="bg-emerald-50 rounded-2xl p-3 border border-emerald-100">
                  <span className="text-[10px] font-black text-emerald-600 uppercase">ACCURACY</span>
                  <p className="text-lg font-black text-emerald-700 mt-0.5">
                    {drillTotalAttempts > 0 ? Math.round((drillTotalCorrect / drillTotalAttempts) * 100) : 100}%
                  </p>
                </div>

                <div className="bg-amber-50 rounded-2xl p-3 border border-amber-100">
                  <span className="text-[10px] font-black text-amber-600 uppercase">TOTAL XP</span>
                  <p className="text-lg font-black text-amber-700 mt-0.5">+{sessionXP}</p>
                </div>
              </div>

              {/* CTAs */}
              <div className="flex gap-2.5 w-full">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentBatchIndex(0)
                    setSkimCardIndex(0)
                    setStage('skim')
                    setIsFlipped(false)
                    setDrillTotalAttempts(0)
                    setDrillTotalCorrect(0)
                  }}
                  className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Drill Again</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate(`/decks/${id}`)}
                  className="flex-1 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-rose-200"
                >
                  <span>Back to Deck</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </main>

      {/* ═══════════ DOCKED BOTTOM CONTROL BAR ═══════════ */}
      {stage === 'skim' && (
        <footer className="sticky bottom-0 z-[110] bg-white/95 backdrop-blur-xl border-t border-slate-100 p-2.5 sm:p-3 flex items-center justify-center">
          <div className="w-full max-w-2xl flex items-center justify-between gap-2.5">
            {/* Prev Card in Batch */}
            <button
              type="button"
              disabled={skimCardIndex <= 0}
              onClick={() => {
                if (skimCardIndex > 0) {
                  setSkimCardIndex(prev => prev - 1)
                  setIsFlipped(false)
                }
              }}
              className="py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 font-black text-xs flex items-center gap-1 transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Prev</span>
            </button>

            {/* Flip / Reveal Card Button */}
            <button
              type="button"
              onClick={() => {
                setIsFlipped(prev => !prev)
                playSfx('flip')
              }}
              className="flex-1 py-3 px-4 rounded-2xl bg-slate-100 hover:bg-indigo-50 border border-slate-200 text-slate-700 hover:text-indigo-600 font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-slate-500" />
              <span>{isFlipped ? 'Show Front' : 'Flip Card (Space)'}</span>
            </button>

            {/* Next Card in Batch OR Start Drill Button */}
            {skimCardIndex + 1 < currentBatch.length ? (
              <button
                type="button"
                onClick={() => {
                  setSkimCardIndex(prev => prev + 1)
                  setIsFlipped(false)
                }}
                className="py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs flex items-center gap-1 shadow-md shadow-indigo-200 transition-all cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={startBatchDrill}
                className="py-3 px-5 rounded-2xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-700 hover:to-indigo-700 text-white font-black text-xs flex items-center gap-1.5 shadow-lg shadow-rose-200 transition-all cursor-pointer animate-pulse"
              >
                <Zap className="w-4 h-4" />
                <span>Start Drill ({currentBatch.length} Cards)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </footer>
      )}

      {stage === 'drill' && (
        <footer className="sticky bottom-0 z-[110] bg-white/95 backdrop-blur-xl border-t border-slate-100 p-2.5 sm:p-3 flex items-center justify-center">
          <div className="w-full max-w-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              <span className="text-xs font-black text-slate-700">
                {!answered
                  ? (drillSubMode === 'typing' ? 'Type spelling to verify memory' : 'Choose the correct answer')
                  : 'Answer submitted!'}
              </span>
            </div>

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
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md bg-white rounded-3xl border border-slate-100 p-6 shadow-2xl flex flex-col gap-5"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-800">Hybrid Recall Settings</h3>
                    <p className="text-[11px] text-slate-400 font-medium">Customize your pre-learning batch & drills</p>
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
                {/* 1. Batch Size */}
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

                {/* 2. Required Correct Count */}
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1.5">
                    Pass Target (Correct Count to Master)
                  </label>
                  <p className="text-[11px] text-slate-400 mb-2">
                    Number of times each word must be answered correctly in drill before passing.
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

                {/* 3. Allowed Practice Modes */}
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1.5">
                    Active Practice Types in Drill
                  </label>
                  <div className="space-y-2">
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
                            "p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between",
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
