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
  HelpCircle
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
import { resolveMediaUrl } from '@/components/common/MediaUrlInput'
import { getFSRSIntervals } from '@/lib/flashcard-utils'
import type { Question } from '@/types/flashcard'
import type { PracticeQuestionData } from '@/types/practice'

// Clean loading screen identical to flashcard play
const SessionLoadingScreen = () => (
  <div className="h-screen h-[100dvh] flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-rose-50/20 to-slate-50 text-slate-800">
    <div className="relative flex items-center justify-center">
      <div className="w-16 h-16 rounded-3xl border-4 border-rose-200 border-t-rose-600 animate-spin" />
      <div className="absolute inset-0 flex items-center justify-center">
        <Zap className="w-6 h-6 text-rose-600 animate-pulse" />
      </div>
    </div>
    <p className="mt-5 text-sm font-black text-slate-700 tracking-wide">
      Initializing Hybrid Recall Engine...
    </p>
    <p className="text-xs text-slate-400 font-medium mt-1">
      Preparing Dual-Phase Flashcard & Practice Deck
    </p>
  </div>
)

export default function HybridPlay() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, gamify, addXp } = useAppStore()

  // Deck session state
  const [session, setSession] = useState<any>(null)
  const [currentIndex, setCurrentIndex] = useState(-1)
  const [isLoading, setIsLoading] = useState(true)

  // Hybrid Flow State: 'flashcard' (Step 1) -> 'practice' (Step 2)
  const [phase, setPhase] = useState<'flashcard' | 'practice'>('flashcard')

  // Flashcard phase states
  const [isFlipped, setIsFlipped] = useState(false)
  const [hasRated, setHasRated] = useState(false)
  const [selectedRating, setSelectedRating] = useState<number | null>(null)

  // Practice phase states
  const [practiceSubMode, setPracticeSubMode] = useState<'mcq' | 'typing' | 'listening'>('mcq')
  const [currentPracticeData, setCurrentPracticeData] = useState<PracticeQuestionData | null>(null)
  const [answered, setAnswered] = useState(false)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [typingInput, setTypingInput] = useState('')
  const [typingFeedback, setTypingFeedback] = useState<{ checked: boolean; isCorrect: boolean } | null>(null)
  const [starredCards, setStarredCards] = useState<Record<number, boolean>>({})

  // Session Statistics
  const [sessionXP, setSessionXP] = useState(0)
  const [practiceTotalAnswered, setPracticeTotalAnswered] = useState(0)
  const [practiceCorrectCount, setPracticeCorrectCount] = useState(0)
  const [sessionStartTime] = useState(Date.now())
  const [elapsedTime, setElapsedTime] = useState(0)
  const [isComplete, setIsComplete] = useState(false)

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

  // Audio Hook
  const { playCardAudio } = usePracticeAudio({
    session,
    currentQuestion: session?.questions?.[currentIndex] || null
  })

  // Web Audio Tone SFX generator (Zero external dependencies)
  const playSfx = (type: 'correct' | 'wrong' | 'flip' | 'complete') => {
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
        osc.frequency.setValueAtTime(420, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.07)
        gain.gain.setValueAtTime(0.12, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.08)
      } else if (type === 'complete') {
        confetti({ zIndex: 9999, particleCount: 120, spread: 80, origin: { y: 0.6 } })
      }
    } catch (e) {
      // AudioContext not allowed or unsupported
    }
  }

  // 1. Fetch Session Data
  useEffect(() => {
    let isMounted = true
    const fetchSessionData = async () => {
      try {
        setIsLoading(true)
        const res = await axios.get(`/api/v1/deck/${id}/quiz`)
        if (!isMounted) return

        let questions: Question[] = res.data.questions || []
        if (questions.length === 0) {
          setIsComplete(true)
          setSession({ ...res.data, questions: [] })
          setCurrentIndex(0)
          setIsLoading(false)
          return
        }

        setSession({ ...res.data, questions })
        setCurrentIndex(0)
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

  const currentQuestion: Question | null = session?.questions?.[currentIndex] || null
  const totalCards = session?.questions?.length || 0

  // 2. Smart Mix Practice Generator for the current card
  const generatePracticeForCard = (q: Question, cardIndex: number) => {
    if (!q || !session?.questions) return

    const qAny = q as any
    const questionText = q.content || qAny.front || q.others?.front || 'Vocabulary Item'
    const correctAns = q.explanation || qAny.back || q.others?.back || (q.options?.find(o => o.is_correct)?.content) || ''

    // Determine candidate practice modes:
    // If audio is available, mix between MCQ, Typing, and Listening!
    const hasAudio = Boolean(
      q.audio ||
      q.front_audio_url ||
      q.back_audio_url ||
      q.others?.audio ||
      q.others?.front_audio_url
    )

    let chosenMode: 'mcq' | 'typing' | 'listening' = 'mcq'
    if (hasAudio) {
      const modes: Array<'mcq' | 'typing' | 'listening'> = ['mcq', 'typing', 'listening']
      chosenMode = modes[cardIndex % modes.length]
    } else {
      const modes: Array<'mcq' | 'typing'> = ['mcq', 'typing']
      chosenMode = modes[cardIndex % modes.length]
    }
    setPracticeSubMode(chosenMode)

    // Build MCQ choices
    let choices: string[] = []
    let correctIdx = 0

    if (q.options && Array.isArray(q.options) && q.options.length >= 2) {
      choices = q.options.map((o: any) => o.content)
      const foundIdx = q.options.findIndex((o: any) => o.is_correct)
      correctIdx = foundIdx !== -1 ? foundIdx : 0
    } else {
      // Pick 3 distractors from other questions in session
      const otherAnswers = session.questions
        .filter((item: Question) => item.id !== q.id)
        .map((item: Question) => {
          const itemAny = item as any
          return item.explanation || itemAny.back || item.others?.back || ''
        })
        .filter((ans: string) => Boolean(ans.trim()) && ans.trim().toLowerCase() !== correctAns.trim().toLowerCase())

      // Shuffle and pick up to 3 distractors
      const shuffledOthers = [...otherAnswers].sort(() => 0.5 - Math.random()).slice(0, 3)
      const pool = [correctAns, ...shuffledOthers]
      // Shuffle choices and locate correct index
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

  // 3. Flip Handler
  const handleFlip = () => {
    const nextFlipped = !isFlipped
    setIsFlipped(nextFlipped)
    playSfx('flip')
  }

  // 4. Rate and Transition to Step 2: Practice
  const handleRateAndProceedToPractice = async (rating: number) => {
    if (!currentQuestion) return
    setSelectedRating(rating)
    setHasRated(true)

    // Submit FSRS rating to backend in background
    try {
      axios.post(`/api/v1/deck/${id}/review`, {
        card_id: currentQuestion.id,
        rating
      }).catch(e => console.warn('Hybrid review rating error:', e))
    } catch (e) {}

    // Add +2 XP for flashcard retention
    showXpGain(2)

    // Generate practice problem for active recall
    generatePracticeForCard(currentQuestion, currentIndex)

    // Smooth transition into Practice phase
    setPhase('practice')
    setAnswered(false)
    setSelectedOption(null)
    setTypingInput('')
    setTypingFeedback(null)
  }

  // 5. Submit MCQ Answer
  const handleSelectOption = (idx: number) => {
    if (answered || !currentPracticeData) return
    setSelectedOption(idx)
    setAnswered(true)

    const isCorrect = idx === currentPracticeData.correct_index
    setPracticeTotalAnswered(prev => prev + 1)

    if (isCorrect) {
      setPracticeCorrectCount(prev => prev + 1)
      playSfx('correct')
      showXpGain(5) // +5 XP for correct active recall
    } else {
      playSfx('wrong')
    }
  }

  // 6. Submit Typing Answer
  const handleCheckTyping = () => {
    if (answered || !currentPracticeData) return
    const input = typingInput.trim().toLowerCase()
    const correct = (currentPracticeData.correct_answer || '').trim().toLowerCase()

    const acceptable = (currentPracticeData.acceptable_answers || [correct]).map(a => a.toLowerCase().trim())
    const isCorrect = input === correct || acceptable.includes(input)

    setTypingFeedback({ checked: true, isCorrect })
    setAnswered(true)
    setPracticeTotalAnswered(prev => prev + 1)

    if (isCorrect) {
      setPracticeCorrectCount(prev => prev + 1)
      playSfx('correct')
      showXpGain(5)
    } else {
      playSfx('wrong')
    }
  }

  // 7. Advance to Next Card (Reverting to Step 1: Flashcard)
  const handleNextCard = () => {
    if (currentIndex + 1 < totalCards) {
      setCurrentIndex(prev => prev + 1)
      setPhase('flashcard')
      setIsFlipped(false)
      setHasRated(false)
      setSelectedRating(null)
      setAnswered(false)
      setSelectedOption(null)
      setTypingInput('')
      setTypingFeedback(null)
      setCurrentPracticeData(null)
    } else {
      setIsComplete(true)
      playSfx('complete')
    }
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Space flips in flashcard phase
      if (e.code === 'Space' && phase === 'flashcard') {
        const target = e.target as HTMLElement
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
        e.preventDefault()
        handleFlip()
      }
      // Enter advances when practice is answered
      if (e.code === 'Enter' && phase === 'practice' && answered) {
        e.preventDefault()
        handleNextCard()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [phase, isFlipped, answered])

  if (isLoading || currentIndex < 0) {
    return <SessionLoadingScreen />
  }

  const progressPercent = totalCards > 0 ? Math.round(((currentIndex + (answered ? 1 : 0)) / totalCards) * 100) : 0
  const fsrsIntervals = getFSRSIntervals(currentQuestion?.fsrs)

  return (
    <div className="h-screen h-[100dvh] flex flex-col bg-gradient-to-br from-slate-50 via-rose-50/20 to-slate-50 text-slate-900 font-sans overflow-hidden relative">
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
        {/* Underline Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-slate-100">
          <motion.div
            className="h-full rounded-r-full bg-gradient-to-r from-rose-500 via-purple-500 to-indigo-600 shadow-[0_0_10px_rgba(244,63,94,0.4)]"
            animate={{ width: `${progressPercent}%` }}
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
              Dual-Step Active Recall System
            </span>
          </div>
        </div>

        {/* Center: Phase Step Tracker Badge */}
        <div className="flex items-center gap-2">
          {phase === 'flashcard' ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-50 border border-indigo-200/80 text-indigo-700 font-black text-[11px] shadow-2xs">
              <Brain className="w-3.5 h-3.5 text-indigo-500" />
              <span>STEP 1: FLASHCARD</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-700 font-black text-[11px] shadow-2xs animate-pulse">
              <Target className="w-3.5 h-3.5 text-rose-500" />
              <span>STEP 2: {practiceSubMode.toUpperCase()} TEST</span>
            </div>
          )}
        </div>

        {/* Right: Stats Counter */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Card Counter Pill */}
          <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 font-black text-xs">
            <span>{currentIndex + 1}</span>
            <span className="text-slate-400">/</span>
            <span>{totalCards}</span>
          </div>

          {/* Session XP Pill */}
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-700 font-black text-xs shadow-2xs">
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            <span>+{sessionXP} XP</span>
          </div>

          {/* Time Spent */}
          <div className="hidden md:flex items-center gap-1 text-slate-400 font-bold text-xs">
            <Clock className="w-3.5 h-3.5" />
            <span>{Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, '0')}</span>
          </div>
        </div>
      </header>

      {/* ═══════════ MAIN DUAL-STAGE CONTENT ═══════════ */}
      <main className="flex-1 min-h-0 flex w-full max-w-4xl mx-auto flex-col justify-center items-center px-3 sm:px-6 py-2 overflow-hidden relative">
        {isComplete ? (
          /* ──────── COMPLETION SCREEN ──────── */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 shadow-2xl text-center flex flex-col items-center"
          >
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-400 to-rose-500 flex items-center justify-center text-white shadow-lg mb-4">
              <Award className="w-9 h-9" />
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-slate-800">
              Hybrid Session Complete! 🎉
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-xs font-medium">
              You reviewed both flashcards and tested your active recall memory across all cards!
            </p>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-2 w-full my-6">
              <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                <span className="text-[10px] font-black text-slate-400 uppercase">CARDS</span>
                <p className="text-lg font-black text-slate-800 mt-0.5">{totalCards}</p>
              </div>

              <div className="bg-emerald-50 rounded-2xl p-3 border border-emerald-100">
                <span className="text-[10px] font-black text-emerald-600 uppercase">ACCURACY</span>
                <p className="text-lg font-black text-emerald-700 mt-0.5">
                  {practiceTotalAnswered > 0 ? Math.round((practiceCorrectCount / practiceTotalAnswered) * 100) : 100}%
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
                  setCurrentIndex(0)
                  setPhase('flashcard')
                  setIsComplete(false)
                  setPracticeCorrectCount(0)
                  setPracticeTotalAnswered(0)
                  setIsFlipped(false)
                }}
                className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Study Again</span>
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
        ) : (
          <AnimatePresence mode="wait">
            {phase === 'flashcard' ? (
              /* ──────── STEP 1: FLASHCARD 3D CARD ──────── */
              <motion.div
                key={`fc-${currentIndex}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.25 }}
                className="w-full h-full flex flex-col justify-center items-center min-h-0"
              >
                <Flashcard3DCard
                  currentQuestion={currentQuestion}
                  currentIndex={currentIndex}
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
                  effectiveShowFsrs={true}
                  selectedOption={null}
                  hasRated={hasRated}
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
                    if (!currentQuestion) return
                    setStarredCards(prev => ({ ...prev, [currentQuestion.id]: !prev[currentQuestion.id] }))
                  }}
                  activeMode="hybrid"
                />
              </motion.div>
            ) : (
              /* ──────── STEP 2: ACTIVE RECALL PRACTICE CARD ──────── */
              <motion.div
                key={`pr-${currentIndex}`}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.04 }}
                transition={{ duration: 0.25 }}
                className="w-full h-full flex flex-col justify-center items-center min-h-0"
              >
                {currentPracticeData && (
                  <>
                    {practiceSubMode === 'typing' ? (
                      <PracticeTypingCard
                        currentIndex={currentIndex}
                        currentQuestion={currentQuestion}
                        practiceData={currentPracticeData}
                        answered={answered}
                        typingInput={typingInput}
                        setTypingInput={setTypingInput}
                        typingFeedback={typingFeedback}
                        starredCards={starredCards}
                        onToggleStar={(cardId) => setStarredCards(prev => ({ ...prev, [cardId]: !prev[cardId] }))}
                        onCheckTyping={handleCheckTyping}
                      />
                    ) : practiceSubMode === 'listening' ? (
                      <PracticeListeningCard
                        currentIndex={currentIndex}
                        currentQuestion={currentQuestion}
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
                        currentIndex={currentIndex}
                        currentQuestion={currentQuestion}
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
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </main>

      {/* ═══════════ DOCKED BOTTOM ACTION BAR ═══════════ */}
      {!isComplete && (
        <footer className="sticky bottom-0 z-[110] bg-white/95 backdrop-blur-xl border-t border-slate-100 p-2.5 sm:p-3 flex items-center justify-center">
          <div className="w-full max-w-2xl flex items-center justify-between gap-2.5">
            {phase === 'flashcard' ? (
              /* Phase 1 Actions */
              !isFlipped ? (
                <button
                  type="button"
                  onClick={handleFlip}
                  className="w-full py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 active:scale-[0.98] transition-all cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reveal Definition (Tap Card or Space)</span>
                </button>
              ) : (
                <div className="w-full flex flex-col gap-2">
                  <div className="flex items-center justify-between text-[11px] font-black text-slate-400 uppercase tracking-wider px-1">
                    <span>How well did you recall?</span>
                    <span className="text-rose-500">Rate to start Practice ➔</span>
                  </div>

                  {/* 4 FSRS Rating Buttons */}
                  <div className="grid grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => handleRateAndProceedToPractice(1)}
                      className="py-2.5 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-black text-xs flex flex-col items-center cursor-pointer transition-all active:scale-95"
                    >
                      <span>Again</span>
                      <span className="text-[9px] opacity-60 font-semibold">{fsrsIntervals[1] || '1m'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRateAndProceedToPractice(2)}
                      className="py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 font-black text-xs flex flex-col items-center cursor-pointer transition-all active:scale-95"
                    >
                      <span>Hard</span>
                      <span className="text-[9px] opacity-60 font-semibold">{fsrsIntervals[2] || '10m'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRateAndProceedToPractice(3)}
                      className="py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-black text-xs flex flex-col items-center cursor-pointer transition-all active:scale-95"
                    >
                      <span>Good</span>
                      <span className="text-[9px] opacity-60 font-semibold">{fsrsIntervals[3] || '1d'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRateAndProceedToPractice(4)}
                      className="py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-black text-xs flex flex-col items-center cursor-pointer transition-all active:scale-95"
                    >
                      <span>Easy</span>
                      <span className="text-[9px] opacity-60 font-semibold">{fsrsIntervals[4] || '4d'}</span>
                    </button>
                  </div>
                </div>
              )
            ) : (
              /* Phase 2 Actions */
              <div className="w-full flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                  <span className="text-xs font-black text-slate-700">
                    {!answered ? 'Choose or type the correct answer' : 'Active Recall Completed!'}
                  </span>
                </div>

                {answered ? (
                  <button
                    type="button"
                    onClick={handleNextCard}
                    className="py-3 px-6 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-rose-200 active:scale-95 transition-all cursor-pointer"
                  >
                    <span>Next Card</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : practiceSubMode === 'typing' ? (
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
            )}
          </div>
        </footer>
      )}
    </div>
  )
}
