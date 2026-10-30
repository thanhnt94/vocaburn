import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import axios from 'axios'
import {
  RotateCcw,
  RotateCw,
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
  HelpCircle,
  Layers,
  CheckCircle2,
  Play,
  Shuffle,
  ListOrdered,
  Eye,
  AlertCircle,
  FileQuestion,
  AlignLeft,
  AlignCenter,
  Type,
  Lightbulb
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
import { usePlaySettings } from '@/hooks/usePlaySettings'
import LearningInsightsModal from '@/components/LearningInsightsModal'
import { HybridQuickControlsSheet } from '@/components/hybrid/HybridQuickControlsSheet'
import { getAudioContext, cancelAllAudio } from '@/lib/audio'
import { getVal } from '@/lib/practice-utils'
import { selectDistractors } from '@/lib/distractor'
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
  scope: 'all',
  order: 'sequential',
  allowed_practices: ['mcq', 'typing', 'listening']
}

// Card Lifecycle State Badge Component
export const CardLifecycleBadge = ({
  card,
  targetDrillCount = 2,
  masteredCardIds
}: {
  card?: Question | null
  targetDrillCount?: number
  masteredCardIds?: Set<number>
}) => {
  if (!card) return null
  const status = getCardLifecycleState(card, targetDrillCount, masteredCardIds)
  const meta = CARD_LIFECYCLE_META[status]

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-black border transition-all shadow-2xs select-none shrink-0",
        meta.badgeClass
      )}
      title={meta.description}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", meta.dotClass)} />
      <span className="uppercase tracking-wider font-extrabold">{meta.shortLabel}</span>
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
  const [searchParams] = useSearchParams()
  const urlScope = (searchParams.get('scope') || searchParams.get('filter')) as HybridScope | null
  const urlOrder = searchParams.get('order') as HybridOrder | null
  const { user, gamify, addXp } = useAppStore()

  // ── Session State ──
  const [session, setSession] = useState<any>(null)
  const [deckPracticeSettings, setDeckPracticeSettings] = useState<any>(null)
  const [rawQuestions, setRawQuestions] = useState<Question[]>([])
  const [scopedQuestions, setScopedQuestions] = useState<Question[]>([])
  const [masteredCardIds, setMasteredCardIds] = useState<Set<number>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadError, setIsLoadError] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  // ── Study Display & Audio Settings (Inherited from Deck/User defaults) ──
  const playSettings = usePlaySettings(id || '')
  const [previewInsightCard, setPreviewInsightCard] = useState<Question | null>(null)

  // ── Permissions & Feedback ──
  const canEdit = Boolean(user?.role === 'admin' || user?.id === 1 || session?.creator_id === user?.id || session?.is_collaborator)

  // Floating Notification Toast with cancelable timer
  const [toast, setToast] = useState<{ message: string; type?: 'info' | 'success' | 'warning' | 'error' } | null>(null)
  const toastTimeoutRef = useRef<any>(null)
  const showLocalToast = useCallback((message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current)
    }
    setToast({ message, type })
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null)
      toastTimeoutRef.current = null
    }, 2200)
  }, [])

  // Touch Swipe-Up Gestures to open Quick Controls Sheet
  const touchStartYRef = useRef<number | null>(null)
  const touchStartXRef = useRef<number | null>(null)

  const handleTouchStart = (e: React.TouchEvent | React.PointerEvent) => {
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.PointerEvent).clientY
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.PointerEvent).clientX
    touchStartYRef.current = clientY
    touchStartXRef.current = clientX
  }

  const handleTouchEnd = (e: React.TouchEvent | React.PointerEvent) => {
    if (touchStartYRef.current === null) return
    const clientY = 'changedTouches' in e ? e.changedTouches[0].clientY : (e as React.PointerEvent).clientY
    const clientX = 'changedTouches' in e ? e.changedTouches[0].clientX : (e as React.PointerEvent).clientX
    const deltaY = touchStartYRef.current - clientY
    const deltaX = Math.abs(clientX - (touchStartXRef.current || 0))
    touchStartYRef.current = null
    touchStartXRef.current = null

    // Upward swipe threshold strictly on bottom docked bar: pulled up > 40px, primarily vertical
    if (deltaY > 40 && deltaY > deltaX * 1.2) {
      setIsSettingsOpen(true)
    }
  }

  // ── Hybrid Configuration (Stored in User Deck Settings) ──
  const [hybridSettings, setHybridSettings] = useState<HybridSettings>(DEFAULT_HYBRID_SETTINGS)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  // Deferred Queue Update: if user changes order, scope, or batch_size mid-batch,
  // finish the current 5-card batch completely before applying the new queue for the next batch!
  const pendingQueueUpdateRef = useRef<Partial<HybridSettings> | null>(null)

  // ── Batch & Workflow Stages ──
  // 'skim': Preview batch of cards at skim level (no rating pressure)
  // 'drill': Practice drill for the batch until all cards reach required_correct count
  // 'complete': Entire deck completed
  const [stage, setStage] = useState<'skim' | 'drill' | 'complete'>('skim')

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

  // Drill active timing & round-robin cursor refs
  const drillCardShownAtRef = useRef<number>(Date.now())
  const drillCursorRef = useRef<number>(-1)
  const paginationRef = useRef<{ total: number; offset: number; limit: number; has_more: boolean; next_offset: number | null } | null>(null)
  const isFetchingNextBatchRef = useRef<boolean>(false)

  // ── Session Statistics ──
  const [sessionXP, setSessionXP] = useState(0)
  const [drillTotalAttempts, setDrillTotalAttempts] = useState(0)
  const [drillTotalCorrect, setDrillTotalCorrect] = useState(0)
  const [elapsedTime, setElapsedTime] = useState(0)
  const activeSecondsRef = useRef<number>(0)

  // Floating XP toast (only updates local session XP to prevent double-awarding with backend)
  const [xpFloat, setXpFloat] = useState<{ amount: number; id: number } | null>(null)
  const showXpGain = (amount: number) => {
    setSessionXP(prev => prev + amount)
    setXpFloat({ amount, id: Date.now() })
    setTimeout(() => setXpFloat(null), 1400)
  }

  // Active time tracking: only accumulate seconds when tab is active
  useEffect(() => {
    if (stage === 'complete') {
      setElapsedTime(activeSecondsRef.current)
      return
    }
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        activeSecondsRef.current += 1
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [stage])

  // Cleanup audio playback when leaving Hybrid session
  useEffect(() => {
    return () => {
      cancelAllAudio()
    }
  }, [])

  // ── Persist Session Progress to Backend (Zero localStorage) ──
  const saveHybridProgress = useCallback(async (batchIdx: number, customQuestions?: Question[]) => {
    try {
      const qList = customQuestions || scopedQuestions
      if (!id || !qList || qList.length === 0) return
      await axios.post(`/api/v1/deck/${id}/practice-settings`, {
        is_creator: false,
        settings: {
          hybrid_progress: {
            batch_index: batchIdx,
            card_ids: qList.map(q => q.id),
            order: hybridSettings.order,
            scope: hybridSettings.scope,
            updated_at: Date.now()
          }
        }
      })
    } catch (e) {
      console.warn('Failed to save hybrid progress', e)
    }
  }, [id, scopedQuestions, hybridSettings.order, hybridSettings.scope])

  // Split scoped questions into stable batches
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

  const { playCardAudio, isLoadingAudio, isPlayingAudio } = usePracticeAudio({
    session,
    currentQuestion: activeQuestionForAudio || null
  })

  const playCardAudioRef = useRef(playCardAudio)
  useEffect(() => {
    playCardAudioRef.current = playCardAudio
  }, [playCardAudio])

  // ── Skim Stage Autoplay Audio (Front on card show, Back on flip) ──
  useEffect(() => {
    if (stage === 'skim' && currentSkimQuestion) {
      if (playSettings.autoPlayAudio === 'always' || playSettings.autoPlayAudio === 'front') {
        const timer = setTimeout(() => {
          playCardAudioRef.current('front')
        }, 200)
        return () => clearTimeout(timer)
      }
    }
  }, [stage, skimCardIndex, currentSkimQuestion?.id, playSettings.autoPlayAudio])

  useEffect(() => {
    if (stage === 'skim' && currentSkimQuestion && isFlipped) {
      if (playSettings.autoPlayAudio === 'always' || playSettings.autoPlayAudio === 'back') {
        const timer = setTimeout(() => {
          playCardAudioRef.current('back')
        }, 150)
        return () => clearTimeout(timer)
      }
    }
  }, [isFlipped, stage, currentSkimQuestion?.id, playSettings.autoPlayAudio])

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

  // ── 1. Fetch Session and Deck Settings (With Auto-Retry & Robust Hydration) ──
  useEffect(() => {
    let isMounted = true
    const fetchSessionData = async (attempt = 1) => {
      try {
        setIsLoading(true)
        setIsLoadError(false)

        const scopeParam = urlScope && urlScope !== 'all' ? `&scope=${encodeURIComponent(urlScope)}` : ''
        const [quizRes, settingsRes] = await Promise.all([
          axios.get(`/api/v1/deck/${id}/play-data?mode=hybrid&limit=25&offset=0${scopeParam}&include_distractors=true`),
          axios.get(`/api/v1/deck/${id}/practice-settings`).catch(() => ({ data: {} }))
        ])
        if (!isMounted) return

        paginationRef.current = quizRes.data.pagination || null
        const questions: Question[] = quizRes.data.questions || quizRes.data.cards || []

        // If returned 0 questions but attempt < 3, retry once after 600ms (handles server warm-up/DB lock)
        if (questions.length === 0 && attempt < 3) {
          console.warn(`[HybridPlay] Deck returned 0 cards on attempt ${attempt}. Retrying in 600ms...`)
          setTimeout(() => {
            if (isMounted) fetchSessionData(attempt + 1)
          }, 600)
          return
        }

        if (questions.length === 0) {
          setStage('complete')
          setSession({ ...quizRes.data, questions: [] })
          setRawQuestions([])
          setScopedQuestions([])
          setIsLoading(false)
          return
        }

        // Parse practice settings from user_settings or creator_settings
        const creatorPracticeSettings = settingsRes.data?.creator_settings || quizRes.data.practice_settings || {}
        const userPracticeSettings = settingsRes.data?.user_settings || quizRes.data.user_settings || {}

        // ── Synchronize Display & Audio Settings from Backend (Zero localStorage) ──
        const effectiveStudy = settingsRes.data?.effective_study_settings || quizRes.data?.effective_study_settings || settingsRes.data?.user_settings?.study_settings || quizRes.data?.user_settings?.study_settings || {}
        const creatorStudyDefs = settingsRes.data?.creator_study_defaults || quizRes.data?.creator_study_defaults || settingsRes.data?.creator_settings?.study_defaults || quizRes.data?.practice_settings?.study_defaults || {}
        const userStudyOverrides = settingsRes.data?.user_study_settings || quizRes.data?.user_study_settings || settingsRes.data?.user_settings?.study_settings || quizRes.data?.user_settings?.study_settings || {}
        const isCustom = settingsRes.data?.is_study_customized ?? quizRes.data?.is_study_customized
        const origin = settingsRes.data?.setting_origin || quizRes.data?.setting_origin

        playSettings.syncStudySettings(effectiveStudy, creatorStudyDefs, userStudyOverrides, isCustom, origin)

        const userSet = userPracticeSettings?.hybrid || quizRes.data.user_settings?.hybrid || {}
        const creatorSet = creatorPracticeSettings?.hybrid || quizRes.data.practice_settings?.hybrid || {}

        // Resolve requested scope with query parameter priority
        let chosenScope: HybridScope = (urlScope as HybridScope) || (userSet.scope as HybridScope) || (creatorSet.scope as HybridScope) || DEFAULT_HYBRID_SETTINGS.scope
        const reqCorrect = Number(userSet.required_correct || creatorSet.required_correct || DEFAULT_HYBRID_SETTINGS.required_correct)

        // Pre-populate mastered cards from drill stats
        const preMastered = new Set<number>()
        questions.forEach(q => {
          if ((q.practice_summary?.drill_correct ?? 0) >= reqCorrect) {
            preMastered.add(q.id)
          }
        })

        // Check if chosen scope has cards; if 0 cards, fallback to 'all' so the session never displays 0 cards
        const checkFiltered = filterCardsByScope(questions, chosenScope, reqCorrect, preMastered)
        if (checkFiltered.length === 0 && questions.length > 0 && chosenScope !== 'all') {
          console.warn(`[HybridPlay] Chosen scope '${chosenScope}' has 0 cards. Auto-switching to 'all'.`)
          chosenScope = 'all'
        }

        const mergedSettings: HybridSettings = {
          batch_size: Number(userSet.batch_size || creatorSet.batch_size || DEFAULT_HYBRID_SETTINGS.batch_size),
          required_correct: reqCorrect,
          scope: chosenScope,
          order: (urlOrder as HybridOrder) || (userSet.order || creatorSet.order || DEFAULT_HYBRID_SETTINGS.order) as HybridOrder,
          allowed_practices: Array.isArray(userSet.allowed_practices) && userSet.allowed_practices.length > 0
            ? userSet.allowed_practices
            : (Array.isArray(creatorSet.allowed_practices) && creatorSet.allowed_practices.length > 0
                ? creatorSet.allowed_practices
                : DEFAULT_HYBRID_SETTINGS.allowed_practices)
        }

        // ── Card Order & Session Questions Initialization ──
        let initialFiltered = filterCardsByScope(questions, mergedSettings.scope, mergedSettings.required_correct, preMastered)
        if (initialFiltered.length === 0 && questions.length > 0) {
          initialFiltered = questions
        }

        const savedProgress = userPracticeSettings?.hybrid_progress
        let finalQuestions: Question[] = []
        let initialBatchIdx = 0
        const bSize = Math.max(1, mergedSettings.batch_size)

        // Check if saved progress matches current scope and order
        if (
          savedProgress &&
          Array.isArray(savedProgress.card_ids) &&
          savedProgress.card_ids.length > 0 &&
          savedProgress.scope === mergedSettings.scope &&
          savedProgress.order === mergedSettings.order
        ) {
          // Restore exact card sequence across reloads
          const cardMap = new Map(initialFiltered.map(c => [c.id, c]))
          const restored = savedProgress.card_ids.map((cid: number) => cardMap.get(cid)).filter(Boolean) as Question[]
          const restoredIdSet = new Set(restored.map(c => c.id))
          const missing = initialFiltered.filter(c => !restoredIdSet.has(c.id))
          finalQuestions = [...restored, ...missing]

          const maxBatches = Math.ceil(finalQuestions.length / bSize)
          const savedIdx = Number(savedProgress.batch_index) || 0
          initialBatchIdx = (savedIdx >= 0 && savedIdx < maxBatches) ? savedIdx : 0
        }

        if (finalQuestions.length === 0) {
          // Fresh order
          if (mergedSettings.order === 'random') {
            const copy = [...initialFiltered]
            for (let i = copy.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [copy[i], copy[j]] = [copy[j], copy[i]];
            }
            finalQuestions = copy
            initialBatchIdx = 0
          } else {
            finalQuestions = initialFiltered
            // Smart Sequential Cursor: position at first unmastered card batch
            const smartIdx = findSmartSequentialIndex(finalQuestions, mergedSettings.required_correct, preMastered)
            const targetBatchIdx = Math.floor(smartIdx / bSize)
            const maxBatches = Math.ceil(finalQuestions.length / bSize)
            initialBatchIdx = targetBatchIdx < maxBatches ? targetBatchIdx : 0
          }

          // Persist initial session progress to backend for seamless reload support
          axios.post(`/api/v1/deck/${id}/practice-settings`, {
            is_creator: false,
            settings: {
              hybrid_progress: {
                batch_index: initialBatchIdx,
                card_ids: finalQuestions.map(q => q.id),
                order: mergedSettings.order,
                scope: mergedSettings.scope,
                updated_at: Date.now()
              }
            }
          }).catch(() => {})
        }

        // Guaranteed fallback: never allow 0 cards if deck has questions
        if (finalQuestions.length === 0 && questions.length > 0) {
          finalQuestions = questions
        }

        // Atomic Hydration: Apply all states together before releasing loading spinner
        setRawQuestions(questions)
        setMasteredCardIds(preMastered)
        setDeckPracticeSettings({
          creator_settings: creatorPracticeSettings,
          user_settings: userPracticeSettings,
          practice_settings: creatorPracticeSettings
        })
        setHybridSettings(mergedSettings)
        setScopedQuestions(finalQuestions)
        setCurrentBatchIndex(initialBatchIdx)
        setSkimCardIndex(0)
        setSession({
          ...quizRes.data,
          questions,
          creator_settings: creatorPracticeSettings,
          user_settings: userPracticeSettings,
          practice_settings: creatorPracticeSettings
        })
        setIsLoading(false)
      } catch (err) {
        console.error('Failed to load hybrid session', err)
        if (attempt < 2) {
          console.warn('[HybridPlay] Network glitch, retrying attempt 2 in 800ms...')
          setTimeout(() => {
            if (isMounted) fetchSessionData(attempt + 1)
          }, 800)
          return
        }
        setIsLoading(false)
        setIsLoadError(true)
      }
    }

    fetchSessionData()
    return () => {
      isMounted = false
    }
  }, [id, urlScope, urlOrder, retryCount])

  // ── 2. Live Scope Counts & Auto-Save Hybrid Settings (Zero localStorage) ──
  const scopeCounts = useMemo(() => {
    if ((session as any)?.scope_counts) {
      const sc = (session as any).scope_counts
      return {
        all: sc.all || 0,
        new: sc.new || 0,
        undrilled: sc.undrilled || 0,
        review: sc.review || 0,
        due: sc.due || 0
      }
    }
    return {
      all: rawQuestions.length,
      new: filterCardsByScope(rawQuestions, 'new', hybridSettings.required_correct, masteredCardIds).length,
      undrilled: filterCardsByScope(rawQuestions, 'undrilled', hybridSettings.required_correct, masteredCardIds).length,
      review: filterCardsByScope(rawQuestions, 'review', hybridSettings.required_correct, masteredCardIds).length,
      due: filterCardsByScope(rawQuestions, 'due', hybridSettings.required_correct, masteredCardIds).length
    }
  }, [session, rawQuestions, hybridSettings.required_correct, masteredCardIds])

  // Continuous Streaming Batch Queue: Prefetch next batch in background
  const prefetchNextHybridBatch = useCallback(async () => {
    if (isFetchingNextBatchRef.current) return
    const p = paginationRef.current
    if (!p || !p.has_more) return

    isFetchingNextBatchRef.current = true
    try {
      const scopeParam = hybridSettings.scope ? `&scope=${hybridSettings.scope}` : ''
      const res = await axios.get(
        `/api/v1/deck/${id}/play-data?mode=hybrid&limit=25&offset=${p.next_offset}${scopeParam}&include_distractors=true`
      )
      if (res.data?.questions && res.data.questions.length > 0) {
        const newQuestions: Question[] = res.data.questions
        paginationRef.current = res.data.pagination

        setRawQuestions(prev => {
          const existingIds = new Set(prev.map(q => q.id))
          const fresh = newQuestions.filter(q => !existingIds.has(q.id))
          return [...prev, ...fresh]
        })

        setScopedQuestions(prev => {
          const existingIds = new Set(prev.map(q => q.id))
          const fresh = newQuestions.filter(q => !existingIds.has(q.id))
          return [...prev, ...fresh]
        })

        if (res.data.distractor_pool?.length > 0) {
          setSession((prev: any) => ({
            ...prev,
            distractor_pool: [
              ...(prev?.distractor_pool || []),
              ...res.data.distractor_pool.filter(
                (dp: any) => !(prev?.distractor_pool || []).some((old: any) => old.id === dp.id)
              )
            ]
          }))
        }
      } else {
        if (paginationRef.current) {
          paginationRef.current.has_more = false
        }
      }
    } catch (err) {
      console.warn('[HybridPlay] Failed to prefetch next batch:', err)
    } finally {
      isFetchingNextBatchRef.current = false
    }
  }, [id, hybridSettings.scope])

  // Prefetch next batch when approaching end of loaded batches
  useEffect(() => {
    if (batches.length > 0 && currentBatchIndex >= batches.length - 2) {
      if (paginationRef.current?.has_more && !isFetchingNextBatchRef.current) {
        prefetchNextHybridBatch()
      }
    }
  }, [currentBatchIndex, batches.length, prefetchNextHybridBatch])

  const handleUpdateHybridSettings = useCallback(async (partial: Partial<HybridSettings>) => {
    const updated: HybridSettings = {
      ...hybridSettings,
      ...partial
    }
    setHybridSettings(updated)

    // Save to user settings immediately (Zero localStorage)
    axios.post(`/api/v1/deck/${id}/practice-settings`, {
      is_creator: false,
      settings: {
        hybrid: updated
      }
    }).catch(e => console.warn('Failed to auto-save hybrid settings', e))

    // If already at complete screen, immediately apply and restart fresh
    if (stage === 'complete') {
      let filtered = filterCardsByScope(rawQuestions, updated.scope, updated.required_correct, masteredCardIds)
      if (filtered.length === 0 && rawQuestions.length > 0) {
        filtered = rawQuestions
      }

      let newQuestions: Question[] = []
      let newBatchIdx = 0
      const bSize = Math.max(1, updated.batch_size)

      if (updated.order === 'random') {
        const copy = [...filtered]
        for (let i = copy.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        newQuestions = copy
        newBatchIdx = 0
      } else {
        newQuestions = filtered
        const smartIdx = findSmartSequentialIndex(newQuestions, updated.required_correct, masteredCardIds)
        const targetBatchIdx = Math.floor(smartIdx / bSize)
        const totalB = Math.ceil(newQuestions.length / bSize)
        newBatchIdx = targetBatchIdx < totalB ? targetBatchIdx : 0
      }

      setScopedQuestions(newQuestions)
      setCurrentBatchIndex(newBatchIdx)
      setSkimCardIndex(0)
      setIsFlipped(false)
      setStage('skim')
      setDrillActiveCard(null)
      setBatchCorrectCounts({})
      saveHybridProgress(newBatchIdx, newQuestions)
      return
    }

    // Mid-batch queue change: DO NOT destroy or abort current 5-card batch!
    // Finish the current batch first; apply the new mode/order on the next batch!
    if (partial.order !== undefined || partial.scope !== undefined || partial.batch_size !== undefined) {
      pendingQueueUpdateRef.current = {
        ...pendingQueueUpdateRef.current,
        ...partial
      }
      if (partial.order !== undefined) {
        showLocalToast?.(`Queue order set to ${partial.order === 'random' ? 'Random' : 'Sequential'} (will apply on next batch) ⚡`, 'info')
      } else if (partial.scope !== undefined) {
        showLocalToast?.(`Scope set to ${String(partial.scope).toUpperCase()} (will apply on next batch) ⚡`, 'info')
      } else if (partial.batch_size !== undefined) {
        showLocalToast?.(`Batch size set to ${partial.batch_size} cards (will apply on next batch) ⚡`, 'info')
      }
    }

    // Immediate non-disruptive parameters:
    if (partial.required_correct !== undefined) {
      showLocalToast?.(`Pass target updated to ${partial.required_correct}x correct`, 'info')
    }
  }, [hybridSettings, id, stage, rawQuestions, masteredCardIds, saveHybridProgress, showLocalToast])

  // ── 3. Start Drill for Current Batch ──
  const startBatchDrill = () => {
    if (!currentBatch || currentBatch.length === 0) return

    // Initialize correct counts for all cards in this batch
    const initialCounts: Record<number, number> = {}
    currentBatch.forEach(c => {
      initialCounts[c.id] = 0
    })
    setBatchCorrectCounts(initialCounts)
    drillCursorRef.current = -1

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
      const nextMastered = new Set(masteredCardIds)
      currentBatch.forEach(c => {
        nextMastered.add(c.id)
      })
      setMasteredCardIds(nextMastered)

      playSfx('batch')
      showXpGain(15) // Bonus XP for finishing batch

      // ── 1. CHECK PENDING QUEUE UPDATE (User changed order/scope mid-batch) ──
      if (pendingQueueUpdateRef.current) {
        const pending = pendingQueueUpdateRef.current
        pendingQueueUpdateRef.current = null

        const effectiveScope = pending.scope ?? hybridSettings.scope
        const effectiveOrder = pending.order ?? hybridSettings.order
        const effectiveReq = pending.required_correct ?? hybridSettings.required_correct

        // Filter cards for the new scope
        let newFiltered = filterCardsByScope(rawQuestions, effectiveScope, effectiveReq, nextMastered)
        if (newFiltered.length === 0 && rawQuestions.length > 0) {
          newFiltered = filterCardsByScope(rawQuestions, 'all', effectiveReq, nextMastered)
        }

        if (newFiltered.length === 0) {
          setStage('complete')
          playSfx('complete')
          saveHybridProgress(0)
          return
        }

        let newQueue: Question[] = []
        if (effectiveOrder === 'random') {
          // Prioritize unmastered cards first
          const unmastered = newFiltered.filter(c => !nextMastered.has(c.id))
          const mastered = newFiltered.filter(c => nextMastered.has(c.id))
          const pool = unmastered.length > 0 ? unmastered : mastered
          const copy = [...pool]
          for (let i = copy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
          }
          newQueue = copy
        } else {
          newQueue = newFiltered
        }

        setScopedQuestions(newQueue)
        setCurrentBatchIndex(0)
        setSkimCardIndex(0)
        setIsFlipped(false)
        setStage('skim')
        setDrillActiveCard(null)
        setBatchCorrectCounts({})
        drillCursorRef.current = -1
        saveHybridProgress(0, newQueue)
        showLocalToast?.(`Starting next batch in ${effectiveOrder === 'random' ? 'Random' : 'Sequential'} mode! ⚡`, 'success')
        return
      }

      // ── 2. NORMAL BATCH ADVANCE & CONTINUOUS RECALL FLOW ──
      const nextBatchIdx = currentBatchIndex + 1
      if (nextBatchIdx < totalBatches) {
        // Auto-advance seamlessly to the next batch (no blocking popup)
        setCurrentBatchIndex(nextBatchIdx)
        setSkimCardIndex(0)
        setIsFlipped(false)
        setStage('skim')
        setDrillActiveCard(null)
        setBatchCorrectCounts({})
        drillCursorRef.current = -1
        saveHybridProgress(nextBatchIdx)
      } else if (paginationRef.current?.has_more) {
        // Continuous Streaming: Load next batch from server seamlessly
        prefetchNextHybridBatch().then(() => {
          setCurrentBatchIndex(nextBatchIdx)
          setSkimCardIndex(0)
          setIsFlipped(false)
          setStage('skim')
          setDrillActiveCard(null)
          setBatchCorrectCounts({})
          drillCursorRef.current = -1
          saveHybridProgress(nextBatchIdx)
        }).catch(() => {
          setStage('complete')
          playSfx('complete')
          saveHybridProgress(0)
        })
      } else {
        // Reached end of batches: Check if there are still unmastered cards in scope
        const unmastered = scopedQuestions.filter(c => !nextMastered.has(c.id))
        if (unmastered.length > 0) {
          // Continuous learning flow: loop into unmastered cards!
          if (hybridSettings.order === 'random') {
            const copy = [...unmastered]
            for (let i = copy.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [copy[i], copy[j]] = [copy[j], copy[i]];
            }
            setScopedQuestions(copy)
            setCurrentBatchIndex(0)
            setSkimCardIndex(0)
            setIsFlipped(false)
            setStage('skim')
            setDrillActiveCard(null)
            setBatchCorrectCounts({})
            drillCursorRef.current = -1
            saveHybridProgress(0, copy)
            showLocalToast?.('Continuing with next round of cards! 🔥', 'info')
          } else {
            const smartIdx = findSmartSequentialIndex(scopedQuestions, hybridSettings.required_correct, nextMastered)
            const targetBatchIdx = Math.floor(smartIdx / Math.max(1, hybridSettings.batch_size))
            const safeBatchIdx = targetBatchIdx < totalBatches ? targetBatchIdx : 0
            setCurrentBatchIndex(safeBatchIdx)
            setSkimCardIndex(0)
            setIsFlipped(false)
            setStage('skim')
            setDrillActiveCard(null)
            setBatchCorrectCounts({})
            drillCursorRef.current = -1
            saveHybridProgress(safeBatchIdx)
            showLocalToast?.('Reviewing remaining unmastered cards! 🔥', 'info')
          }
        } else {
          // 100% of cards in scope are mastered!
          setStage('complete')
          playSfx('complete')
          saveHybridProgress(0)
        }
      }
      return
    }

    let candidate: Question
    if (hybridSettings.order === 'sequential') {
      // Round-robin sequential rotation through pending cards
      const lastIdx = drillCursorRef.current
      const nextIdx = (lastIdx + 1) % pendingCards.length
      drillCursorRef.current = nextIdx
      candidate = pendingCards[nextIdx] || pendingCards[0]
    } else {
      // Pick a random pending card (avoid picking same card consecutively if multiple exist)
      candidate = pendingCards[Math.floor(Math.random() * pendingCards.length)]
      if (pendingCards.length > 1 && drillActiveCard && candidate.id === drillActiveCard.id) {
        const others = pendingCards.filter(c => c.id !== drillActiveCard.id)
        if (others.length > 0) candidate = others[Math.floor(Math.random() * others.length)]
      }
    }

    drillCardShownAtRef.current = Date.now()
    setDrillActiveCard(candidate)
    generatePracticeForDrillCard(candidate)
    setAnswered(false)
    setSelectedOption(null)
    setTypingInput('')
    setTypingFeedback(null)
  }

  // ── 5. Generate Practice Question Data ──
  const generatePracticeForDrillCard = (q: Question) => {
    if (!q || !rawQuestions || rawQuestions.length === 0) return

    const effPractice = deckPracticeSettings?.creator_settings || session?.creator_settings || session?.practice_settings || {}
    const effUser = deckPracticeSettings?.user_settings || session?.user_settings || {}

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

    // Resolve mode configuration and active pairs
    const modeConfig = effUser[chosenMode] || effPractice[chosenMode] || effUser.mcq || effPractice.mcq || {}
    const num_choices = modeConfig.num_choices || effUser.mcq?.num_choices || effPractice.mcq?.num_choices || 4

    let activePairs = modeConfig.active_pairs
    if (!Array.isArray(activePairs) || activePairs.length === 0) {
      if (chosenMode === 'typing') {
        activePairs = [{ q: 'nghĩa', a: ['front', 'từ vựng', 'cách đọc', 'romaji', 'romanji'] }]
      } else {
        activePairs = [{ q: 'front', a: 'nghĩa' }]
      }
    }

    // Pick a random active pair
    const activePair = activePairs[Math.floor(Math.random() * activePairs.length)]
    const question_key = activePair.q || (chosenMode === 'typing' ? 'nghĩa' : 'front')
    const raw_answer_key = activePair.a || (chosenMode === 'typing' ? ['front', 'từ vựng', 'cách đọc', 'romaji', 'romanji'] : 'nghĩa')
    const primary_answer_key = Array.isArray(raw_answer_key) ? (raw_answer_key[0] || 'front') : (raw_answer_key || 'nghĩa')
    const audio_col = activePair.audio_col || (chosenMode === 'listening' ? 'front' : undefined)

    const questionText = getVal(q, question_key) || q.content || (q as any).front || 'Vocabulary Item'
    const correctAns = getVal(q, primary_answer_key) || q.explanation || (q as any).back || ''

    if (chosenMode === 'mcq' || chosenMode === 'listening') {
      const serverDistractors = (session as any)?.distractor_pool || []
      const poolSource = serverDistractors.length >= 10
        ? serverDistractors
        : (rawQuestions.length >= 10 ? rawQuestions : (scopedQuestions.length > 0 ? scopedQuestions : rawQuestions))
      
      // Build candidate distractor pool
      const distractor_pool: any[] = []
      const pool = [...poolSource].sort(() => 0.5 - Math.random())

      for (const other of pool) {
        if (distractor_pool.length >= 30) break
        if (other.id !== q.id) {
          const d_val = getVal(other, primary_answer_key)
          const d_q_val = getVal(other, question_key)
          const d_front = getVal(other, 'front')
          const d_back = getVal(other, 'back')
          if (d_val && d_val.toLowerCase() !== 'nan' && d_val.trim().toLowerCase() !== correctAns.trim().toLowerCase()) {
            distractor_pool.push({
              text: d_val,
              q_text: d_q_val,
              front: d_front,
              back: d_back,
              id: other.id,
              card: other,
              type: (other.others && typeof other.others === 'object' ? (other.others.type || other.others.pos || '') : '')
            })
          }
        }
      }

      const item_front = getVal(q, 'front')
      const item_back = getVal(q, 'back')
      const correct_item_data = {
        text: correctAns,
        q_text: questionText,
        front: item_front,
        back: item_back,
        id: q.id,
        card: q,
        type: (q.others && typeof q.others === 'object' ? (q.others.type || q.others.pos || '') : '')
      }

      const needed = num_choices - 1
      const selectedDistractors = selectDistractors(correct_item_data, distractor_pool, needed)

      // Fallback if selectDistractors filtered out too many candidates
      const selectedIds = new Set(selectedDistractors.map(d => d.id))
      const combinedChoices = [...selectedDistractors]
      for (const cand of distractor_pool) {
        if (combinedChoices.length >= needed) break
        if (!selectedIds.has(cand.id) && cand.text.trim().toLowerCase() !== correctAns.trim().toLowerCase()) {
          combinedChoices.push(cand)
          selectedIds.add(cand.id)
        }
      }

      // Assemble choices
      const choices_data = ([correct_item_data] as any[]).concat(combinedChoices)
      for (let i = choices_data.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        const temp = choices_data[i]
        choices_data[i] = choices_data[j]
        choices_data[j] = temp
      }

      const choices = choices_data.map(c => c.text)
      const choice_item_ids = choices_data.map(c => c.id)
      const correctIdx = choices.indexOf(correctAns)

      const practiceObj: PracticeQuestionData = {
        question: questionText,
        choices,
        choices_data,
        choice_item_ids,
        correct_index: correctIdx !== -1 ? correctIdx : 0,
        correct_answer: correctAns,
        acceptable_answers: [correctAns, correctAns.toLowerCase().trim()],
        question_key,
        answer_key: primary_answer_key,
        audio_col: audio_col || 'front'
      }

      setCurrentPracticeData(practiceObj)
    } else {
      // ── Typing Recall ──
      const answer_keys: string[] = Array.isArray(raw_answer_key)
        ? raw_answer_key
        : (typeof raw_answer_key === 'string' && raw_answer_key.includes(',')
            ? raw_answer_key.split(',').map((s: string) => s.trim()).filter(Boolean)
            : [typeof raw_answer_key === 'string' ? raw_answer_key : 'front'])

      const acceptable_answers: string[] = []
      const acceptableAnswersIncludes = (val: string) => {
        const valNorm = val.toLowerCase().replace(/[〜~]/g, '').trim()
        return acceptable_answers.some(a => a.toLowerCase().replace(/[〜~]/g, '').trim() === valNorm)
      }

      const addAnswer = (v: string) => {
        if (!v) return
        if (v.includes('|')) {
          v.split('|').forEach(part => {
            const clean = part.trim()
            if (clean && !acceptableAnswersIncludes(clean)) acceptable_answers.push(clean)
          })
        } else {
          const clean = v.trim()
          if (clean && !acceptableAnswersIncludes(clean)) acceptable_answers.push(clean)
        }
      }

      for (const aKey of answer_keys) {
        const val = getVal(q, aKey)
        if (val) addAnswer(val)
      }
      if (correctAns) {
        addAnswer(correctAns)
      }

      // Automatically include card romaji / romanji if available
      const cardRomaji = getVal(q, 'romaji') || getVal(q, 'romanji')
      if (cardRomaji) addAnswer(cardRomaji)

      const primary_answer = acceptable_answers[0] || correctAns || getVal(q, 'front') || q.content || ''

      const practiceObj: PracticeQuestionData = {
        question: questionText,
        choices: [],
        correct_index: 0,
        correct_answer: primary_answer,
        acceptable_answers: acceptable_answers.length > 0 ? acceptable_answers : [primary_answer],
        question_key,
        answer_key: answer_keys.length > 1 ? answer_keys : (answer_keys[0] || 'front'),
        audio_col: audio_col !== undefined ? audio_col : (answer_keys[0] || 'front')
      }

      setCurrentPracticeData(practiceObj)
    }
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
    const normalizeAnswer = (str: string) => {
      return str
        .replace(/<[^<]+?>/g, '')
        .trim()
        .toLowerCase()
        .replace(/[〜~]/g, '')
        .replace(/[ōóòỏõọ]/g, 'o')
        .replace(/[ūúùủũụ]/g, 'u')
        .replace(/[āáàảãạ]/g, 'a')
        .replace(/[ēéèẻẽẹ]/g, 'e')
        .replace(/[īíìỉĩị]/g, 'i')
        .trim()
    }

    const cleanInput = normalizeAnswer(typingInput)
    const rawAnswers = (currentPracticeData.acceptable_answers && currentPracticeData.acceptable_answers.length > 0)
      ? currentPracticeData.acceptable_answers
      : [currentPracticeData.correct_answer || '']

    const acceptableAnswers: string[] = []
    rawAnswers.forEach(ans => {
      if (!ans) return
      if (ans.includes('|')) {
        ans.split('|').forEach(p => {
          const c = p.trim()
          if (c && !acceptableAnswers.includes(c)) acceptableAnswers.push(c)
        })
      } else if (ans.trim() && !acceptableAnswers.includes(ans.trim())) {
        acceptableAnswers.push(ans.trim())
      }
    })

    const isCorrect = acceptableAnswers.some((ans: string) => {
      if (!ans) return false
      return cleanInput === normalizeAnswer(ans)
    })

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
    const elapsedSec = Math.min(60, Math.max(0.5, Number(((Date.now() - drillCardShownAtRef.current) / 1000).toFixed(1))))
    try {
      axios.post('/api/v1/deck/record_answer', {
        attempt_id: null,
        card_id: cardId,
        deck_id: Number(id),
        is_correct: isCorrect,
        is_practice: true,
        practice_mode: 'hybrid_drill',
        time_spent: elapsedSec
      }).catch(() => {})
    } catch (e) {}
  }

  // ── 8. Next Drill Card / Advance Batch ──
  const handleAdvanceDrill = () => {
    pickNextDrillCard(batchCorrectCounts)
  }

  const handleProceedToNextBatch = async () => {
    const nextBatchIdx = currentBatchIndex + 1
    if (nextBatchIdx < totalBatches) {
      setCurrentBatchIndex(nextBatchIdx)
      setSkimCardIndex(0)
      setIsFlipped(false)
      setStage('skim')
      setDrillActiveCard(null)
      setBatchCorrectCounts({})
      drillCursorRef.current = -1
      saveHybridProgress(nextBatchIdx)
    } else if (paginationRef.current?.has_more) {
      await prefetchNextHybridBatch()
      setCurrentBatchIndex(nextBatchIdx)
      setSkimCardIndex(0)
      setIsFlipped(false)
      setStage('skim')
      setDrillActiveCard(null)
      setBatchCorrectCounts({})
      drillCursorRef.current = -1
      saveHybridProgress(nextBatchIdx)
    } else {
      setStage('complete')
      playSfx('complete')
      saveHybridProgress(0)
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

      {/* ═══════════ UNIFIED SINGLE-ROW HEADER HUD ═══════════ */}
      <header className="sticky top-0 flex-shrink-0 z-[120] backdrop-blur-2xl px-3 sm:px-5 py-2.5 flex items-center justify-between gap-3 bg-white/95 border-b border-slate-100 shadow-xs">
        {/* Underline Progress Bar for Total Batches */}
        <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-slate-100 overflow-hidden">
          <motion.div
            className={cn(
              "h-full rounded-r-full transition-all duration-300",
              stage === 'skim'
                ? "bg-gradient-to-r from-amber-400 to-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]"
                : "bg-gradient-to-r from-rose-500 via-purple-500 to-indigo-600 shadow-[0_0_8px_rgba(244,63,94,0.4)]"
            )}
            animate={{
              width: `${totalBatches > 0 ? Math.round(((currentBatchIndex + (stage === 'drill' ? (passedCardsInBatchCount / Math.max(1, currentBatch.length)) : 0)) / totalBatches) * 100) : 0}%`
            }}
            transition={{ type: 'spring', stiffness: 120, damping: 18 }}
          />
        </div>

        {/* Left: Exit, Deck Title, Dynamic Stage Badge & Card Lifecycle Badge */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => navigate(`/decks/${id}`)}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer shrink-0"
            title="Exit Hybrid Session"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <span className="font-black text-xs sm:text-sm text-slate-800 truncate max-w-[140px] xs:max-w-[200px] sm:max-w-[320px]">
              {session?.title || 'Hybrid Recall'}
            </span>

            {/* Dynamic Stage Pill */}
            {stage === 'skim' ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-100/90 text-amber-800 border border-amber-200/70 shadow-2xs shrink-0">
                <Zap className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                SKIM
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-rose-100/90 text-rose-800 border border-rose-200/70 shadow-2xs shrink-0">
                <Target className="w-2.5 h-2.5 text-rose-600" />
                DRILL
              </span>
            )}

            {/* Active Card Lifecycle Pill */}
            <CardLifecycleBadge
              card={stage === 'skim' ? currentSkimQuestion : drillActiveCard}
              targetDrillCount={hybridSettings.required_correct}
              masteredCardIds={masteredCardIds}
            />
          </div>
        </div>

        {/* Right: Stats */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Session XP Pill */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-700 font-black text-xs shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
            <span>+{sessionXP}</span>
          </div>
        </div>
      </header>

      {/* ═══════════ MAIN CONTENT AREA ═══════════ */}
      <main
        className="flex-1 min-h-0 flex w-full max-w-4xl mx-auto flex-col justify-center items-center px-3 sm:px-6 py-2 overflow-hidden relative touch-pan-y"
      >
        <AnimatePresence mode="wait">
          {isLoadError ? (
            /* ──────────────── NETWORK LOAD ERROR FALLBACK ──────────────── */
            <motion.div
              key="load_error"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white rounded-3xl border border-rose-100 p-8 shadow-2xl text-center flex flex-col items-center"
            >
              <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-500 border border-rose-200/60 flex items-center justify-center mb-4 shadow-sm">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-slate-800">Connection Failed</h3>
              <p className="text-xs text-slate-500 mt-2 mb-6 leading-relaxed">
                Could not load deck items due to a network glitch or server timeout.
              </p>
              <button
                type="button"
                onClick={() => setRetryCount(prev => prev + 1)}
                className="w-full py-3.5 px-6 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs transition-all shadow-md shadow-rose-200 cursor-pointer active:scale-95 flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Retry Loading Deck</span>
              </button>
            </motion.div>
          ) : scopedQuestions.length === 0 ? (
            /* ──────────────── EMPTY SCOPE FALLBACK ──────────────── */
            <motion.div
              key="empty_scope"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white rounded-3xl border border-slate-100 p-8 shadow-2xl text-center flex flex-col items-center"
            >
              <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-500 border border-amber-200/60 flex items-center justify-center mb-4 shadow-sm">
                <Layers className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-slate-800">No Cards in Scope</h3>
              <p className="text-xs text-slate-500 mt-2 mb-6 leading-relaxed">
                There are no cards in this deck matching scope <span className="font-bold text-rose-600">"{hybridSettings.scope.toUpperCase()}"</span>. All cards may already be drilled or in FSRS review.
              </p>
              <button
                type="button"
                onClick={() => handleUpdateHybridSettings({ scope: 'all' })}
                className="w-full py-3.5 px-6 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs transition-all shadow-md shadow-rose-200 cursor-pointer active:scale-95"
              >
                Switch Scope to "All Cards" ({rawQuestions.length} Cards)
              </button>
            </motion.div>
          ) : stage === 'skim' && currentSkimQuestion ? (
            /* ──────────────── STAGE A: SKIM PREVIEW ──────────────── */
            <motion.div
              key={`skim-${currentBatchIndex}-${skimCardIndex}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="w-full h-full flex flex-col justify-center items-center min-h-0"
            >
              <Flashcard3DCard
                currentQuestion={currentSkimQuestion}
                currentIndex={currentBatchIndex * hybridSettings.batch_size + skimCardIndex}
                isFlipped={isFlipped}
                setIsFlipped={setIsFlipped}
                isSelectMode={false}
                effectiveCardFlipTrigger="card_click"
                frontValign={playSettings.frontValign || 'center'}
                frontHalign={playSettings.frontHalign || 'left'}
                frontFontSize={playSettings.frontFontSize || '100%'}
                backValign={playSettings.backValign || 'center'}
                backHalign={playSettings.backHalign || 'left'}
                backFontSize={playSettings.backFontSize || '100%'}
                showImages={playSettings.showImages || 'always'}
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
                hideFlyToolbar={true}
                setIsFlyToolbarOpen={() => {}}
                setShowFeedback={() => {}}
                setJustAnswered={() => {}}
                handleStarQuestion={() => {
                  setStarredCards(prev => ({ ...prev, [currentSkimQuestion.id]: !prev[currentSkimQuestion.id] }))
                }}
                activeMode="hybrid_skim"
                onTriggerPlayAudio={() => {
                  const targetFace = isFlipped ? 'back' : 'front';
                  playCardAudio(targetFace);
                }}
                isLoadingAudio={isLoadingAudio}
                isPlayingAudio={isPlayingAudio}
                onOpenQuickSettings={() => setIsSettingsOpen(true)}
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
              className="w-full h-full flex flex-col justify-center items-center min-h-0"
            >
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
                    onPreviewInsight={(card) => setPreviewInsightCard(card || drillActiveCard)}
                    sessionQuestions={scopedQuestions}
                    onPlayAudio={() => playCardAudio(currentPracticeData?.audio_col || 'front')}
                    frontFontSize={playSettings.frontFontSize}
                    showImages={playSettings.showImages}
                    hideHeaderActions={true}
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
                    onPreviewInsight={(card) => setPreviewInsightCard(card || drillActiveCard)}
                    onPlayAudio={() => playCardAudio(currentPracticeData?.audio_col || 'front')}
                    frontFontSize={playSettings.frontFontSize}
                    showImages={playSettings.showImages}
                    autoFocus={false}
                    hideInlineSubmit={true}
                    hideHeaderActions={true}
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
                    onPreviewInsight={(card) => setPreviewInsightCard(card || drillActiveCard)}
                    onPlayAudio={() => playCardAudio(currentPracticeData?.audio_col || 'front')}
                    hideHeaderActions={true}
                  />
                )}
              </div>
            </motion.div>
          ) : stage === 'complete' ? (
            /* ──────────────── STAGE C: COMPLETE SESSION ──────────────── */
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
                    let newQuestions = scopedQuestions
                    if (hybridSettings.order === 'random') {
                      const copy = [...scopedQuestions]
                      for (let i = copy.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [copy[i], copy[j]] = [copy[j], copy[i]];
                      }
                      newQuestions = copy
                      setScopedQuestions(copy)
                    }
                    setCurrentBatchIndex(0)
                    setSkimCardIndex(0)
                    setIsFlipped(false)
                    setStage('skim')
                    setDrillActiveCard(null)
                    setBatchCorrectCounts({})
                    setMasteredCardIds(new Set())
                    setSessionXP(0)
                    setDrillTotalAttempts(0)
                    setDrillTotalCorrect(0)
                    setAnswered(false)
                    setSelectedOption(null)
                    setTypingInput('')
                    setTypingFeedback(null)
                    drillCursorRef.current = -1
                    activeSecondsRef.current = 0
                    saveHybridProgress(0, newQuestions)
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
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-slate-400">
              <div className="w-8 h-8 rounded-full border-2 border-rose-200 border-t-rose-600 animate-spin mb-2" />
              <span className="text-xs font-bold">Loading cards...</span>
            </div>
          )}
        </AnimatePresence>
      </main>

      {/* ═══════════ DOCKED BOTTOM SEGMENTED CONTROLS ═══════════ */}
      {scopedQuestions.length > 0 && stage === 'skim' && currentSkimQuestion && (
        <footer
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onPointerDown={handleTouchStart}
          onPointerUp={handleTouchEnd}
          className="shrink-0 z-[110] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-t border-slate-200/80 dark:border-slate-800 py-2 sm:py-2.5 px-3 sm:px-4 shadow-[0_-8px_30px_rgba(0,0,0,0.06)] relative touch-pan-x"
          title="Swipe up for Quick Settings"
        >
          {/* Pull-up Indicator Pill */}
          <div 
            onClick={(e) => {
              e.stopPropagation()
              setIsSettingsOpen(true)
            }}
            className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-9 h-1.5 rounded-full bg-slate-300/90 dark:bg-slate-600 cursor-pointer hover:bg-slate-400 active:scale-95 transition-all z-20"
            title="Swipe up or tap for Quick Settings"
          />

          <div className="max-w-xl mx-auto flex items-center justify-between gap-1.5 sm:gap-2">
            {/* 1. Quick Tools: Audio */}
            <button
              type="button"
              onClick={() => {
                const targetFace = isFlipped ? 'back' : 'front'
                playCardAudio(targetFace)
              }}
              className={cn(
                "w-10 sm:w-11 h-10 sm:h-11 rounded-2xl flex items-center justify-center transition-all duration-200 active:scale-90 cursor-pointer shadow-2xs shrink-0",
                isPlayingAudio
                  ? "bg-indigo-600 text-white ring-2 ring-indigo-300 shadow-md shadow-indigo-500/25 animate-pulse"
                  : isLoadingAudio
                  ? "bg-indigo-100 text-indigo-700 animate-pulse border border-indigo-200"
                  : "bg-slate-100/90 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 border border-slate-200/80 hover:border-indigo-200"
              )}
              title="Play Audio (Pronunciation)"
            >
              {isLoadingAudio ? (
                <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
              ) : (
                <Volume2 className={cn("w-4 h-4", isPlayingAudio && "animate-pulse")} />
              )}
            </button>

            {/* 2. Quick Tools: Insight (only after card is flipped) */}
            {isFlipped && (
              <button
                type="button"
                onClick={() => setPreviewInsightCard(currentSkimQuestion)}
                className="w-10 sm:w-11 h-10 sm:h-11 rounded-2xl flex items-center justify-center bg-slate-100/90 hover:bg-amber-50 text-slate-700 hover:text-amber-600 border border-slate-200/80 hover:border-amber-200 transition-all duration-200 active:scale-90 cursor-pointer shadow-2xs shrink-0"
                title="Card Insights & Explanation (Lightbulb)"
              >
                <Lightbulb className="w-4 h-4 text-amber-500 fill-amber-400/20" />
              </button>
            )}

            {/* Vertical Divider */}
            <div className="w-[1.5px] h-6 bg-slate-200/80 dark:bg-slate-700 shrink-0 mx-0.5" />

            {/* 4. Nav: Prev Card (Back) */}
            <button
              type="button"
              disabled={skimCardIndex === 0}
              onClick={() => {
                if (skimCardIndex > 0) {
                  setSkimCardIndex(prev => prev - 1)
                  setIsFlipped(false)
                }
              }}
              className={cn(
                "w-10 sm:w-11 h-10 sm:h-11 rounded-2xl flex items-center justify-center transition-all duration-200 active:scale-90 cursor-pointer shrink-0 border shadow-2xs",
                skimCardIndex === 0
                  ? "opacity-30 cursor-not-allowed bg-slate-50 border-slate-200/50 text-slate-400"
                  : "bg-slate-100/90 hover:bg-slate-200 border-slate-200/80 text-slate-700 hover:text-slate-900"
              )}
              title="Previous Card"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* 5. Nav: Flip / Reveal (Icon only, no text) */}
            <button
              type="button"
              onClick={() => {
                setIsFlipped(prev => !prev)
                playSfx('flip')
              }}
              className={cn(
                "w-10 sm:w-11 h-10 sm:h-11 rounded-2xl flex items-center justify-center transition-all duration-200 active:scale-90 cursor-pointer shrink-0 border shadow-2xs",
                isFlipped
                  ? "bg-rose-50 border-rose-300 text-rose-600 ring-2 ring-rose-200/60"
                  : "bg-slate-100/90 hover:bg-rose-50 border-slate-200/80 text-slate-700 hover:text-rose-600 hover:border-rose-200"
              )}
              title={isFlipped ? "Flip to front side" : "Flip to back side"}
            >
              <RotateCw className={cn("w-5 h-5 transition-transform duration-300", isFlipped && "rotate-180 text-rose-600")} />
            </button>

            {/* 6. Nav: Next Card or Start Drill */}
            {skimCardIndex + 1 < currentBatch.length ? (
              <button
                type="button"
                onClick={() => {
                  setSkimCardIndex(prev => prev + 1)
                  setIsFlipped(false)
                }}
                className="flex-1 h-10 sm:h-11 rounded-2xl bg-gradient-to-r from-rose-500 via-rose-600 to-rose-700 hover:from-rose-600 hover:to-rose-800 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-rose-500/25 active:scale-95 transition-all duration-200 cursor-pointer"
              >
                <span>Next</span>
                <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[10px] font-mono font-bold leading-none">
                  {skimCardIndex + 2}/{currentBatch.length}
                </span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={startBatchDrill}
                className="flex-1 h-10 sm:h-11 rounded-2xl bg-gradient-to-r from-rose-600 via-purple-600 to-indigo-600 hover:from-rose-700 hover:to-indigo-700 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-purple-500/30 active:scale-95 transition-all duration-200 cursor-pointer animate-pulse"
              >
                <span>Start Drill</span>
                <Target className="w-4 h-4" />
              </button>
            )}
          </div>
        </footer>
      )}

      {scopedQuestions.length > 0 && stage === 'drill' && drillActiveCard && (
        <footer
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onPointerDown={handleTouchStart}
          onPointerUp={handleTouchEnd}
          className="shrink-0 z-[110] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-t border-rose-100/70 dark:border-slate-800 py-2 sm:py-2.5 px-3 sm:px-4 shadow-[0_-8px_30px_rgba(0,0,0,0.06)] relative touch-pan-x"
          title="Swipe up for Quick Settings"
        >
          {/* Pull-up Indicator Pill */}
          <div 
            onClick={(e) => {
              e.stopPropagation()
              setIsSettingsOpen(true)
            }}
            className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-9 h-1.5 rounded-full bg-slate-300/90 dark:bg-slate-600 cursor-pointer hover:bg-slate-400 active:scale-95 transition-all z-20"
            title="Swipe up or tap for Quick Settings"
          />

          <div className="max-w-xl mx-auto flex items-center justify-between gap-1.5 sm:gap-2">
            {/* 1. Drill Tool: Audio */}
            <button
              type="button"
              onClick={() => {
                const targetAudioCol = currentPracticeData?.audio_col || 'front'
                playCardAudio(targetAudioCol)
              }}
              className={cn(
                "w-10 sm:w-11 h-10 sm:h-11 rounded-2xl flex items-center justify-center transition-all duration-200 active:scale-90 cursor-pointer shadow-2xs shrink-0",
                isPlayingAudio
                  ? "bg-indigo-600 text-white ring-2 ring-indigo-300 shadow-md shadow-indigo-500/25 animate-pulse"
                  : isLoadingAudio
                  ? "bg-indigo-100 text-indigo-700 animate-pulse border border-indigo-200"
                  : "bg-slate-100/90 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 border border-slate-200/80 hover:border-indigo-200"
              )}
              title="Play Audio (Pronunciation)"
            >
              {isLoadingAudio ? (
                <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
              ) : (
                <Volume2 className={cn("w-4 h-4", isPlayingAudio && "animate-pulse")} />
              )}
            </button>

            {/* 2. Drill Tool: Insight (only after question is answered) */}
            {answered && (
              <button
                type="button"
                onClick={() => {
                  if (drillActiveCard) setPreviewInsightCard(drillActiveCard)
                }}
                className="w-10 sm:w-11 h-10 sm:h-11 rounded-2xl flex items-center justify-center bg-slate-100/90 hover:bg-amber-50 text-slate-700 hover:text-amber-600 border border-slate-200/80 hover:border-amber-200 transition-all duration-200 active:scale-90 cursor-pointer shadow-2xs shrink-0"
                title="Card Insights & Explanation (Lightbulb)"
              >
                <Lightbulb className="w-4 h-4 text-amber-500 fill-amber-400/20" />
              </button>
            )}

            {/* Vertical Divider */}
            <div className="w-[1.5px] h-6 bg-slate-200/80 dark:bg-slate-700 shrink-0 mx-0.5" />

            {/* 4. Drill Main Action */}
            {answered ? (
              <button
                type="button"
                onClick={handleAdvanceDrill}
                className="flex-1 h-10 sm:h-11 rounded-2xl bg-gradient-to-r from-rose-500 via-rose-600 to-indigo-600 hover:from-rose-600 hover:to-indigo-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-500/30 active:scale-95 transition-all duration-200 cursor-pointer animate-pulse"
              >
                <span>Next Recall Card</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : drillSubMode === 'typing' ? (
              <button
                type="button"
                onClick={handleCheckTyping}
                className="flex-1 h-10 sm:h-11 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-500/25 active:scale-95 transition-all duration-200 cursor-pointer"
              >
                <span>Submit Answer</span>
                <Check className="w-4 h-4" />
              </button>
            ) : (
              <div className="flex-1 h-10 sm:h-11 rounded-2xl bg-slate-100/90 border border-slate-200/80 text-slate-500 font-extrabold text-xs flex items-center justify-center gap-1.5 select-none shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                <span>{drillSubMode === 'listening' ? 'Listen & Select Below' : 'Choose an Option Above'}</span>
              </div>
            )}
          </div>
        </footer>
      )}

      {/* ═══════════ HYBRID QUICK CONTROLS SHEET (Mobile-First Bottom Sheet) ═══════════ */}
      <HybridQuickControlsSheet
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={hybridSettings}
        onUpdateHybridSettings={handleUpdateHybridSettings}
        scopeCounts={scopeCounts}
        frontHalign={playSettings.frontHalign}
        setFrontHalign={playSettings.setFrontHalign}
        backHalign={playSettings.backHalign}
        setBackHalign={playSettings.setBackHalign}
        frontFontSize={playSettings.frontFontSize}
        setFrontFontSize={playSettings.setFrontFontSize}
        backFontSize={playSettings.backFontSize}
        setBackFontSize={playSettings.setBackFontSize}
        autoPlayAudio={playSettings.autoPlayAudio}
        setAutoPlayAudio={playSettings.setAutoPlayAudio}
        sfxEnabled={playSettings.sfxEnabled}
        setSfxEnabled={playSettings.setSfxEnabled}
        hapticEnabled={playSettings.hapticEnabled}
        setHapticEnabled={playSettings.setHapticEnabled}
        deckId={id}
        canEdit={canEdit}
        onSaveAsCreatorBaseline={() => {
          playSettings.saveAsCreatorDefaults()
          axios.post(`/api/v1/deck/${id}/practice-settings`, {
            is_creator: true,
            settings: {
              hybrid: hybridSettings
            }
          }).catch(() => {})
        }}
        showLocalToast={showLocalToast}
      />

      {/* Floating Notification Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-[400] px-4 py-2 rounded-2xl bg-slate-900/90 text-white font-bold text-xs shadow-xl backdrop-blur-md flex items-center gap-2 pointer-events-none"
          >
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Learning Insights Modal when clicking 💡 lightbulb */}
      <LearningInsightsModal
        card={previewInsightCard}
        onClose={() => setPreviewInsightCard(null)}
        allQuestions={scopedQuestions}
        onSelectCard={(c) => setPreviewInsightCard(c)}
        insightsColumns={(session as any)?.practice_settings?.insights_columns || (session as any)?.creator_settings?.insights_columns}
      />
    </div>
  )
}
