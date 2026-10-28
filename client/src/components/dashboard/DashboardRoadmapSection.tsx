import React, { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ChevronRight, 
  ChevronLeft,
  BookOpen, 
  Flame, 
  Brain, 
  Trophy, 
  Sparkles,
  SlidersHorizontal,
  User,
  Calendar
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'

interface DashboardRoadmapSectionProps {
  roadmapDecks: any[] | undefined
  selectedRoadmapIdx?: number
  onSelectRoadmapIdx?: (idx: number) => void
  onOpenStudyModal?: (deck: any, tab: 'flashcard' | 'practice') => void
  navigate: (url: string) => void
  isDesktop?: boolean
  displayMode?: string
  onOpenCustomize?: () => void
}

const CHEER_QUOTES = [
  "Keep it up! You're on fire with this streak! 🔥",
  "Every word learned today is a major leap forward! 🚀",
  "With dedication like this, you'll reach your goal in no time! 🌟",
  "I'm here cheering you on every single day! 💪",
  "Outstanding work! Let's conquer all your flashcards! 🎉",
  "Your brain is absorbing vocabulary at lightning speed! 🧠⚡"
]

export interface MascotProfile {
  img: string
  headline: string
  alt: string
}

export const ACTIVE_MASCOTS: MascotProfile[] = [
  { img: '/mascot/excited.png', headline: 'Keep your memory burning! 🔥', alt: 'Hero Flame' },
  { img: '/mascot/ninja.png', headline: 'Fast as lightning, sharp as steel! ⚡', alt: 'Ninja Flame' },
  { img: '/mascot/detective.png', headline: 'Investigate and discover new words! 🔍', alt: 'Detective Flame' },
  { img: '/mascot/dj.png', headline: 'Groove to the rhythm of learning! 🎧', alt: 'DJ Flame' },
  { img: '/mascot/reading.png', headline: 'Deep focus, unstoppable growth! 📖', alt: 'Scholar Flame' },
]

export const CELEBRATING_MASCOTS: MascotProfile[] = [
  { img: '/mascot/celebrating.png', headline: 'All caught up! Magnificent! 🎉', alt: 'Victory Flame' },
  { img: '/mascot/dj.png', headline: 'Vibe time! Today review complete! 🎶', alt: 'Party DJ Flame' },
  { img: '/mascot/excited.png', headline: 'High score achievement unlocked! 🌟', alt: 'Super Flame' },
]

export const MASTERED_MASCOTS: MascotProfile[] = [
  { img: '/mascot/celebrating.png', headline: 'All Mastered! Legendary! 👑', alt: 'Crown Flame' },
  { img: '/mascot/ninja.png', headline: 'Complete Deck Mastery achieved! ⚡', alt: 'Ninja Master Flame' },
]

export const SLEEPY_MASCOTS: MascotProfile[] = [
  { img: '/mascot/sleepy.png', headline: 'Ready to study whenever you are! 💤', alt: 'Resting Flame' },
]

export function computeDeckData(deck: any, userSettings: any, user: any) {
  const st = deck?.status || {}
  const totalCards = Number(st.total_cards || deck?.total_cards || deck?.questions_count || 0)
  const learnedCards = Number(st.learned_cards || deck?.learned_cards || 0)
  const unlearnedCards = Math.max(0, totalCards - learnedCards)
  const dueRemaining = Number(st.review_due_today ?? deck?.review_remaining ?? 0)
  const streak = Number(st.streak || deck?.streak || 0)
  const masteredCount = Number(st.mastered_count ?? st.mastered ?? deck?.mastered_count ?? 0)
  const hasExplicitMastered = masteredCount > 0
  const pct = totalCards > 0 ? Math.min(100, Math.round((learnedCards / totalCards) * 100)) : 0
  const isMastered = (hasExplicitMastered && masteredCount >= totalCards) || (totalCards > 0 && learnedCards >= totalCards)
  const estimatedMins = Math.max(2, Math.round(dueRemaining * 0.12))
  const retentionRate = Math.min(100, Math.max(70, Number(st.retention_rate || 90)))

  const authorName = deck?.creator_name || deck?.creator_username || deck?.creator?.username || user?.username || 'tnhnaht'
  const createdAtStr = deck?.created_at 
    ? new Date(deck.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) 
    : 'Oct 2026'
  const deckDescription = deck?.description || (
    deck?.title?.includes('Danh Động Từ') 
      ? 'Comprehensive N2 verbal nouns for the JLPT exam with rich examples and FSRS practice.' 
      : 'Intelligent flashcard deck optimized with FSRS v6 spaced repetition for deep memory retention.'
  )

  const disabledModes = (st.disabled_modes || deck?.practice_settings?.disabled_modes || deck?.disabled_modes || []) as string[]
  const isPracticeDisabled = Boolean(
    st.is_practice_disabled ||
    deck?.is_practice_disabled ||
    disabledModes.includes('practice') ||
    disabledModes.includes('all_practice') ||
    ['mcq', 'typing', 'listening_mcq', 'listening_typing'].every(m => disabledModes.includes(m))
  )

  const rawStudyMode = (
    deck?.user_study_settings?.learning_mode ||
    deck?.study_defaults?.learning_mode ||
    deck?.practice_settings?.default_learning_mode ||
    deck?.creator_settings?.learning_mode ||
    userSettings?.quiz_learning_mode ||
    'fsrs'
  )
  const activeStudyMode = (rawStudyMode === 'speed_skim' || rawStudyMode === 'flip') ? 'skim' : rawStudyMode

  const studyModeLabel = (() => {
    switch (activeStudyMode) {
      case 'hybrid':
        return 'Hybrid Recall'
      case 'skim':
        return 'Speed Skim'
      case 'autoplay':
        return 'AutoPlay'
      case 'review':
        return 'FSRS Review'
      case 'new':
        return 'Learn New'
      case 'fsrs':
      default:
        return 'FSRS v6'
    }
  })()

  const rawPracticeMode = (
    deck?.practice_settings?.default_mode ||
    deck?.practice_settings?.active_mode ||
    userSettings?.practice_submode ||
    'mcq'
  )
  const activePracticeMode = rawPracticeMode || 'mcq'

  const practiceModeLabel = (() => {
    switch (activePracticeMode) {
      case 'hybrid':
        return 'Hybrid Recall'
      case 'typing':
        return 'Typing'
      case 'listening':
      case 'listening_mcq':
        return 'Listening'
      case 'listening_typing':
        return 'Listen Typing'
      case 'mcq':
      default:
        return 'MCQ Quiz'
    }
  })()

  return {
    st,
    totalCards,
    learnedCards,
    unlearnedCards,
    dueRemaining,
    streak,
    masteredCount,
    hasExplicitMastered,
    pct,
    isMastered,
    estimatedMins,
    retentionRate,
    authorName,
    createdAtStr,
    deckDescription,
    isPracticeDisabled,
    activeStudyMode,
    studyModeLabel,
    activePracticeMode,
    practiceModeLabel
  }
}

export function DashboardRoadmapSection({
  roadmapDecks,
  selectedRoadmapIdx,
  onSelectRoadmapIdx,
  onOpenStudyModal,
  navigate,
  onOpenCustomize,
  displayMode
}: DashboardRoadmapSectionProps) {
  const user = useAppStore(s => s.user)
  const userSettings = useAppStore(s => s.userSettings)
  const [mascotCheer, setMascotCheer] = useState<string | null>(null)
  const [mascotOverride, setMascotOverride] = useState<MascotProfile | null>(null)
  const [internalIdx, setInternalIdx] = useState(0)
  type SwipeDirection = 'up' | 'down' | 'none'
  const [swipeDir, setSwipeDir] = useState<SwipeDirection>('up')

  // Touch swipe handling strictly for vertical axis
  const touchStartY = useRef<number | null>(null)
  const touchEndY = useRef<number | null>(null)

  const safeDecks = roadmapDecks || []
  const totalDecks = safeDecks.length
  const currentIdx = selectedRoadmapIdx !== undefined ? selectedRoadmapIdx : internalIdx
  const safeIdx = totalDecks > 0 ? Math.min(Math.max(0, currentIdx), totalDecks - 1) : 0
  const deck = safeDecks[safeIdx] || null

  // Track external index changes (e.g. from header < 1/3 > buttons)
  const lastSelectedIdxRef = useRef<number>(safeIdx)
  useEffect(() => {
    if (selectedRoadmapIdx !== undefined && selectedRoadmapIdx !== lastSelectedIdxRef.current) {
      setSwipeDir(selectedRoadmapIdx > lastSelectedIdxRef.current ? 'up' : 'down')
      lastSelectedIdxRef.current = selectedRoadmapIdx
    }
  }, [selectedRoadmapIdx])

  const setIndex = (idx: number, dir: SwipeDirection = 'up') => {
    setSwipeDir(dir)
    setInternalIdx(idx)
    lastSelectedIdxRef.current = idx
    setMascotOverride(null)
    if (onSelectRoadmapIdx) onSelectRoadmapIdx(idx)
  }

  const prevDeck = (dir: SwipeDirection = 'down') => {
    if (safeIdx > 0) {
      if (typeof window !== 'undefined' && window.navigator?.vibrate) window.navigator.vibrate(8)
      setIndex(safeIdx - 1, dir)
    }
  }

  const nextDeck = (dir: SwipeDirection = 'up') => {
    if (safeIdx < totalDecks - 1) {
      if (typeof window !== 'undefined' && window.navigator?.vibrate) window.navigator.vibrate(8)
      setIndex(safeIdx + 1, dir)
    }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.targetTouches[0].clientY
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndY.current = e.targetTouches[0].clientY
  }

  const handleTouchEnd = () => {
    if (touchStartY.current !== null && touchEndY.current !== null) {
      const diffY = touchStartY.current - touchEndY.current
      const threshold = 35

      if (diffY > threshold && safeIdx < totalDecks - 1) {
        nextDeck('up')
      } else if (diffY < -threshold && safeIdx > 0) {
        prevDeck('down')
      }
    }
    touchStartY.current = null
    touchEndY.current = null
  }

  // Wheel scroll handling strictly along vertical Y axis
  const wheelCooldown = useRef(false)
  const handleWheel = (e: React.WheelEvent) => {
    if (wheelCooldown.current) return
    const delta = e.deltaY

    if (Math.abs(delta) > 18) {
      wheelCooldown.current = true
      if (delta > 0 && safeIdx < totalDecks - 1) {
        nextDeck('up')
      } else if (delta < 0 && safeIdx > 0) {
        prevDeck('down')
      }
      setTimeout(() => {
        wheelCooldown.current = false
      }, 350)
    }
  }

  const handleMascotTap = () => {
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate([15, 30, 15])
    }
    const randomQuote = CHEER_QUOTES[Math.floor(Math.random() * CHEER_QUOTES.length)]
    setMascotCheer(randomQuote)

    // Randomize to a different lively mascot pose on tap for joyful interactivity
    const availableMascots = ACTIVE_MASCOTS.concat(CELEBRATING_MASCOTS)
    const nextRandomMascot = availableMascots[Math.floor(Math.random() * availableMascots.length)]
    setMascotOverride(nextRandomMascot)

    setTimeout(() => {
      setMascotCheer(null)
    }, 4500)
  }

  // Empty state if no decks are active on Home
  if (totalDecks === 0 || !deck) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-sm mx-auto my-auto select-none">
        <div className="w-18 h-18 rounded-3xl bg-orange-50 border border-orange-200/80 flex items-center justify-center text-orange-500 mb-4 shadow-2xs">
          <BookOpen className="w-8 h-8 stroke-[2.2]" />
        </div>
        <h3 className="text-base font-black text-slate-800 tracking-tight">No Active Decks on Home</h3>
        <p className="text-xs text-slate-500 mt-1 mb-5 leading-relaxed">
          Select decks from your Library or turn on decks in Manage to display them here!
        </p>
        <div className="flex items-center gap-2">
          {onOpenCustomize && (
            <button
              type="button"
              onClick={onOpenCustomize}
              className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-black hover:border-orange-300 transition-all cursor-pointer shadow-2xs"
            >
              Manage Decks
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate('/decks')}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-black shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            Explore Library →
          </button>
        </div>
      </div>
    )
  }

  // Render unified dual actions (Study & Practice) with configured modes
  const renderDualActions = (targetDeck: any, data: ReturnType<typeof computeDeckData>) => {
    return (
      <div className={cn("grid gap-2", data.isPracticeDisabled ? "grid-cols-1" : "grid-cols-2")}>
        {/* Flashcard Action Group */}
        <div className="flex items-center rounded-2xl bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 shadow-xs p-1 gap-1">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined' && window.navigator?.vibrate) window.navigator.vibrate(12)
              const id = targetDeck.deck_id ?? targetDeck.id
              if (data.activeStudyMode === 'hybrid') {
                navigate(`/hybrid/${id}/play`)
              } else {
                navigate(`/flashcard/${id}/play?mode=${data.activeStudyMode}`)
              }
            }}
            className="flex-1 py-2 px-2.5 flex items-center justify-center gap-2 text-white active:scale-95 transition-all cursor-pointer min-w-0"
            title={`Start studying with ${data.studyModeLabel}`}
          >
            <div className="w-7 h-7 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <div className="text-left min-w-0">
              <span className="text-xs sm:text-[13px] font-black tracking-wide uppercase text-white block leading-tight truncate">
                Study
              </span>
              <span className="text-[9.5px] text-orange-100 font-bold block leading-tight truncate">
                {data.studyModeLabel}
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined' && window.navigator?.vibrate) window.navigator.vibrate(8)
              onOpenStudyModal?.(targetDeck, 'flashcard')
            }}
            className="w-8 h-10 rounded-xl bg-white/15 hover:bg-white/25 active:bg-white/30 text-white flex items-center justify-center transition-all cursor-pointer shrink-0 border border-white/20"
            title="Quick Study Mode Settings"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* Practice Action Group */}
        {!data.isPracticeDisabled && (
          <div className="flex items-center rounded-2xl bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-600 shadow-xs p-1 gap-1">
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined' && window.navigator?.vibrate) window.navigator.vibrate(12)
                const id = targetDeck.deck_id ?? targetDeck.id
                if (data.activePracticeMode === 'hybrid') {
                  navigate(`/hybrid/${id}/play`)
                } else {
                  navigate(`/practice/${id}/${data.activePracticeMode}`)
                }
              }}
              className="flex-1 py-2 px-2.5 flex items-center justify-center gap-2 text-white active:scale-95 transition-all cursor-pointer min-w-0"
              title={`Start practice with ${data.practiceModeLabel}`}
            >
              <div className="w-7 h-7 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                <Trophy className="w-4 h-4 text-white" />
              </div>
              <div className="text-left min-w-0">
                <span className="text-xs sm:text-[13px] font-black tracking-wide uppercase text-white block leading-tight truncate">
                  Practice
                </span>
                <span className="text-[9.5px] text-teal-100 font-bold block leading-tight truncate">
                  {data.practiceModeLabel}
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined' && window.navigator?.vibrate) window.navigator.vibrate(8)
                onOpenStudyModal?.(targetDeck, 'practice')
              }}
              className="w-8 h-10 rounded-xl bg-white/15 hover:bg-white/25 active:bg-white/30 text-white flex items-center justify-center transition-all cursor-pointer shrink-0 border border-white/20"
              title="Quick Practice Mode Settings"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    )
  }

  // ══════════════ SPOTLIGHT HERO REEL ══════════════
  const deckData = computeDeckData(deck, userSettings, user)
  const {
    totalCards,
    learnedCards,
    unlearnedCards,
    dueRemaining,
    masteredCount,
    hasExplicitMastered,
    pct,
    isMastered,
    estimatedMins,
    retentionRate,
    authorName,
    createdAtStr,
    deckDescription
  } = deckData

  // Mascot expression & speech - Deterministically seeded per deck with tap override
  const deckSeed = Math.abs(Number(deck.deck_id ?? deck.id ?? safeIdx))

  let baseMascot: MascotProfile = SLEEPY_MASCOTS[0]
  if (isMastered) {
    baseMascot = MASTERED_MASCOTS[deckSeed % MASTERED_MASCOTS.length]
  } else if (dueRemaining === 0 && learnedCards > 0) {
    baseMascot = CELEBRATING_MASCOTS[deckSeed % CELEBRATING_MASCOTS.length]
  } else if (dueRemaining > 0) {
    baseMascot = ACTIVE_MASCOTS[deckSeed % ACTIVE_MASCOTS.length]
  }

  const currentMascot = mascotOverride || baseMascot
  const mascotImg = currentMascot.img
  const mascotHeadline = currentMascot.headline
  const mascotAlt = currentMascot.alt

  return (
    <div 
      className="flex-1 flex flex-col justify-between min-h-0 w-full p-2.5 sm:p-3 select-none touch-pan-y"
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {/* ── 2. ANIMATED DECK SLIDE (HERO STAGE + STATS + ACTIONS) ── */}
      <AnimatePresence mode="wait" custom={swipeDir}>
        <motion.div
          key={deck.deck_id ?? deck.id ?? safeIdx}
          custom={swipeDir}
          drag="y"
          dragDirectionLock={true}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.25}
          onDragEnd={(_, info) => {
            const swipeThreshold = 35
            const velocityThreshold = 250
            if (info.offset.y < -swipeThreshold || info.velocity.y < -velocityThreshold) {
              if (safeIdx < totalDecks - 1) nextDeck('up')
            } else if (info.offset.y > swipeThreshold || info.velocity.y > velocityThreshold) {
              if (safeIdx > 0) prevDeck('down')
            }
          }}
          variants={{
            enter: (direction: SwipeDirection) => ({
              opacity: 0,
              y: direction === 'down' ? -40 : 40,
              x: 0,
              scale: 0.98
            }),
            center: {
              opacity: 1,
              x: 0,
              y: 0,
              scale: 1,
              transition: {
                duration: 0.22,
                ease: [0.25, 1, 0.5, 1]
              }
            },
            exit: (direction: SwipeDirection) => ({
              opacity: 0,
              y: direction === 'down' ? 40 : -40,
              x: 0,
              scale: 0.98,
              transition: { duration: 0.18, ease: 'easeOut' }
            })
          }}
          initial="enter"
          animate="center"
          exit="exit"
          className="flex-1 flex flex-col justify-between gap-2.5 min-h-0 cursor-grab active:cursor-grabbing touch-pan-y"
        >
          {/* ── 2A. HERO STAGE (FULL-WIDTH TOP PROGRESS + RICH LEFT METRICS + ANCHORED MASCOT) ── */}
          <div className="bg-gradient-to-br from-amber-100/95 via-orange-50/85 to-amber-200/40 border border-orange-200/90 rounded-3xl p-3.5 sm:p-4.5 relative overflow-hidden shadow-2xs flex-1 flex flex-col justify-between min-h-0">
            
            {/* 1. TOP HEADER & FULL-WIDTH PROGRESS */}
            <div className="relative z-20 w-full shrink-0 space-y-2">
              {/* Deck Title, Level & Creator */}
              <div>
                <Link
                  to={`/decks/${deck.deck_id ?? deck.id}`}
                  className="inline-flex items-center gap-1.5 max-w-full group cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-xl bg-orange-500/15 border border-orange-300/70 text-orange-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                    <BookOpen className="w-4 h-4 stroke-[2.4]" />
                  </div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 truncate group-hover:text-orange-600 transition-colors">
                    {deck.title}
                  </h3>
                  {deck.level && (
                    <span className="px-1.5 py-0.2 rounded-md bg-orange-100 text-orange-700 border border-orange-200 text-[10px] font-black shrink-0">
                      {deck.level}
                    </span>
                  )}
                  <span className="text-[10px] font-black text-orange-600 bg-white/80 group-hover:bg-orange-100 border border-orange-200/60 px-1.5 py-0.5 rounded-full flex items-center gap-0.5 transition-colors shrink-0 shadow-2xs ml-0.5">
                    <span>Details</span>
                    <ChevronRight className="w-2.5 h-2.5 stroke-[2.5]" />
                  </span>
                </Link>

                {/* Creator & Creation Date Info */}
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-semibold mt-1">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3 text-slate-400" />
                    <span>Uploaded by <strong className="text-slate-800 font-black">{authorName}</strong></span>
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>{createdAtStr}</span>
                  </span>
                </div>
              </div>

              {/* GAMIFIED MASTERY & QUEST HUD */}
              <div className="bg-gradient-to-r from-orange-500/10 via-amber-400/15 to-emerald-500/15 border-2 border-orange-300/80 rounded-2xl p-2.5 sm:p-3 shadow-xs relative overflow-hidden backdrop-blur-xs">
                {/* Decorative background glow */}
                <div className="absolute -right-6 -top-6 w-20 h-20 bg-amber-400/20 rounded-full blur-xl pointer-events-none" />
                <div className="absolute -left-6 -bottom-6 w-20 h-20 bg-emerald-400/15 rounded-full blur-xl pointer-events-none" />

                {/* Top Row: Fiery Quest Badge + Status + Glowing Percentage */}
                <div className="flex items-center justify-between gap-2 mb-2 relative z-10">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 text-white flex items-center justify-center font-black shadow-md shadow-orange-500/30 shrink-0 text-sm">
                      🔥
                    </div>
                    <div className="min-w-0">
                      <span className="text-[9px] font-black uppercase tracking-wider text-orange-600 block leading-tight">
                        Daily Learning Goal
                      </span>
                      <span className="text-xs sm:text-[13px] font-black text-slate-900 truncate block leading-tight">
                        {mascotHeadline}
                      </span>
                    </div>
                  </div>

                  {/* High-impact Vibrant Percentage Badge */}
                  <div className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs sm:text-[13px] font-black shadow-sm shadow-emerald-500/25 flex items-center gap-1 shrink-0">
                    <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>{pct}% Learned</span>
                  </div>
                </div>
                
                {/* 3D Chunky Video Game XP Bar */}
                <div className="h-3.5 w-full bg-white/90 rounded-full overflow-hidden p-0.5 border border-orange-200/80 shadow-inner relative z-10">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-emerald-500 transition-all duration-500 relative shadow-xs"
                    style={{ width: `${Math.max(pct, 4)}%` }}
                  >
                    {/* Gloss Reflection Top Layer for Juicy 3D Feel */}
                    <div className="absolute inset-x-0 top-0 h-1/2 bg-white/40 rounded-t-full pointer-events-none" />
                  </div>
                </div>

                {/* Bottom Row: Milestone Metrics Summary */}
                <div className="flex items-center justify-between text-[9.5px] sm:text-[10px] font-bold text-slate-600 mt-1.5 px-0.5 relative z-10">
                  <span className="flex items-center gap-1.5 text-slate-500 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                    Overall Mastery Progress
                  </span>
                  <span className="flex items-center gap-1 text-slate-700 font-extrabold">
                    <strong>{hasExplicitMastered ? masteredCount : learnedCards}</strong> / <strong>{totalCards}</strong> cards memorized
                  </span>
                </div>
              </div>
            </div>

            {/* 2. LOWER BODY (LEFT: Description & 4-Metric Grid | RIGHT: Mascot Anchored Bottom-Right) */}
            <div className="relative z-10 flex-1 flex flex-row items-end justify-between min-h-0 pt-2 gap-2">
              
              {/* Left Column (~58% - 62% width): Balanced Center Stack to Eliminate Gaps */}
              <div className="flex-1 max-w-[58%] sm:max-w-[62%] min-w-0 flex flex-col justify-center h-full py-1 text-left gap-2">
                
                {/* Deck Description Box */}
                <div className="bg-white/90 backdrop-blur-xs border border-orange-200/80 rounded-2xl p-2.5 shadow-2xs">
                  <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-orange-600 mb-0.5">
                    <span>📖</span>
                    <span>About this deck</span>
                  </div>
                  <p className="text-[10.5px] sm:text-[11px] text-slate-700 font-medium leading-relaxed line-clamp-2">
                    {deckDescription}
                  </p>
                </div>

                {/* Rich 4-Metric Grid (Hữu ích, không trùng lặp các ô bên dưới) */}
                <div className="grid grid-cols-2 gap-1.5 shrink-0">
                  {/* 1. Total Vocab */}
                  <div className="bg-white/85 border border-orange-200/70 rounded-xl p-1.5 flex items-center gap-1.5 shadow-2xs">
                    <div className="w-5 h-5 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center text-[10px] shrink-0 font-black">
                      📚
                    </div>
                    <div className="min-w-0">
                      <span className="text-[8.5px] font-extrabold uppercase text-slate-400 block leading-tight">Total Cards</span>
                      <span className="text-[11px] font-black text-slate-800 leading-tight truncate block">{totalCards.toLocaleString()} items</span>
                    </div>
                  </div>

                  {/* 2. Algorithm */}
                  <div className="bg-white/85 border border-orange-200/70 rounded-xl p-1.5 flex items-center gap-1.5 shadow-2xs">
                    <div className="w-5 h-5 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center text-[10px] shrink-0 font-black">
                      ⚡
                    </div>
                    <div className="min-w-0">
                      <span className="text-[8.5px] font-extrabold uppercase text-slate-400 block leading-tight">Engine</span>
                      <span className="text-[11px] font-black text-slate-800 leading-tight truncate block">FSRS v6</span>
                    </div>
                  </div>

                  {/* 3. Estimated Study Time Today */}
                  <div className="bg-white/85 border border-orange-200/70 rounded-xl p-1.5 flex items-center gap-1.5 shadow-2xs">
                    <div className="w-5 h-5 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center text-[10px] shrink-0 font-black">
                      ⏱️
                    </div>
                    <div className="min-w-0">
                      <span className="text-[8.5px] font-extrabold uppercase text-slate-400 block leading-tight">Est. Time</span>
                      <span className="text-[11px] font-black text-slate-800 leading-tight truncate block">~{estimatedMins} mins</span>
                    </div>
                  </div>

                  {/* 4. Target Retention Rate */}
                  <div className="bg-white/85 border border-orange-200/70 rounded-xl p-1.5 flex items-center gap-1.5 shadow-2xs">
                    <div className="w-5 h-5 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center text-[10px] shrink-0 font-black">
                      🧠
                    </div>
                    <div className="min-w-0">
                      <span className="text-[8.5px] font-extrabold uppercase text-slate-400 block leading-tight">Retention</span>
                      <span className="text-[11px] font-black text-slate-800 leading-tight truncate block">{retentionRate}% Rate</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side: Large 3D Mascot anchored to bottom right */}
              <div 
                onClick={handleMascotTap}
                title="Tap Vocaburn mascot for extra motivation! 🔥"
                className="w-[42%] max-w-[280px] absolute right-0 bottom-0 top-0 flex items-end justify-center z-10 cursor-pointer group pointer-events-auto"
              >
                {/* Tap Speech Bubble: Positioned right above mascot head & close */}
                <AnimatePresence>
                  {mascotCheer && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.85 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.85 }}
                      className="absolute bottom-[175px] sm:bottom-[195px] right-2 bg-white/95 backdrop-blur-md border border-orange-200 text-slate-900 text-[10.5px] font-black px-3 py-2 rounded-2xl shadow-xl z-30 max-w-[165px] pointer-events-none text-center"
                    >
                      <div className="relative">
                        {mascotCheer}
                        {/* Tail pointing right down at mascot flame head */}
                        <div className="absolute -bottom-2.5 right-10 w-0 h-0 border-x-[5px] border-x-transparent border-t-[6px] border-t-white" />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Large, Beautiful Mascot anchored right as originally designed */}
                <motion.img 
                  key={mascotImg}
                  initial={{ scale: 0.88, opacity: 0, rotate: -3 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 22 }}
                  src={`${mascotImg}?v=2`} 
                  alt={mascotAlt} 
                  className="h-[105%] max-h-[220px] sm:max-h-[250px] w-auto max-w-none object-contain object-bottom drop-shadow-2xl translate-y-1 transition-transform group-hover:scale-105 active:scale-95 select-none"
                />
              </div>
            </div>
          </div>

          {/* ── 2B. 3 TRUTH STAT BOXES (DUE, UNLEARNED, LEARNED) ── */}
          <div className="grid grid-cols-3 gap-2 shrink-0">
            {/* Due for Review */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-2 sm:p-2.5 text-center shadow-2xs">
              <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400 block">
                Due for Review
              </span>
              <div className="flex items-baseline justify-center gap-1 mt-0.5">
                <span className={cn(
                  "text-base sm:text-lg font-black tabular-nums",
                  dueRemaining > 0 ? "text-purple-600" : "text-emerald-600"
                )}>
                  {dueRemaining}
                </span>
                <span className="text-[10px] font-bold text-slate-400">cards</span>
              </div>
            </div>

            {/* Unlearned / New Cards */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-2 sm:p-2.5 text-center shadow-2xs">
              <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400 block">
                Unlearned
              </span>
              <div className="flex items-baseline justify-center gap-1 mt-0.5">
                <span className="text-base sm:text-lg font-black text-orange-600 tabular-nums">
                  {unlearnedCards}
                </span>
                <span className="text-[10px] font-bold text-slate-400">cards</span>
              </div>
            </div>

            {/* Learned / Mastered Cards */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-2 sm:p-2.5 text-center shadow-2xs">
              <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400 block">
                {hasExplicitMastered ? 'Mastered' : 'Learned'}
              </span>
              <div className="flex items-baseline justify-center gap-1 mt-0.5">
                <span className="text-base sm:text-lg font-black text-emerald-600 tabular-nums">
                  {hasExplicitMastered ? masteredCount : learnedCards}
                </span>
                <span className="text-[10px] font-bold text-slate-400">cards</span>
              </div>
            </div>
          </div>

          {/* ── 2C. DUAL STUDY ACTIONS (INSTANT PLAY + QUICK MODE POPUP) ── */}
          <div className="shrink-0">
            {renderDualActions(deck, deckData)}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
