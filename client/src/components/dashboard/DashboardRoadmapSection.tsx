import React, { useState, useRef } from 'react'
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
  SlidersHorizontal
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface DashboardRoadmapSectionProps {
  roadmapDecks: any[] | undefined
  remainingTime?: string
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

export function DashboardRoadmapSection({
  roadmapDecks,
  selectedRoadmapIdx,
  onSelectRoadmapIdx,
  onOpenStudyModal,
  navigate,
  onOpenCustomize
}: DashboardRoadmapSectionProps) {
  const [mascotCheer, setMascotCheer] = useState<string | null>(null)
  const [internalIdx, setInternalIdx] = useState(0)

  // Touch swipe handling for 1-deck-per-page swiping
  const touchStartX = useRef<number | null>(null)
  const touchEndX = useRef<number | null>(null)

  const safeDecks = roadmapDecks || []
  const totalDecks = safeDecks.length
  const currentIdx = selectedRoadmapIdx !== undefined ? selectedRoadmapIdx : internalIdx
  const safeIdx = totalDecks > 0 ? Math.min(Math.max(0, currentIdx), totalDecks - 1) : 0
  const deck = safeDecks[safeIdx] || null

  const setIndex = (idx: number) => {
    setInternalIdx(idx)
    if (onSelectRoadmapIdx) onSelectRoadmapIdx(idx)
  }

  const prevDeck = () => {
    if (safeIdx > 0) {
      if (typeof window !== 'undefined' && window.navigator?.vibrate) window.navigator.vibrate(8)
      setIndex(safeIdx - 1)
    }
  }

  const nextDeck = () => {
    if (safeIdx < totalDecks - 1) {
      if (typeof window !== 'undefined' && window.navigator?.vibrate) window.navigator.vibrate(8)
      setIndex(safeIdx + 1)
    }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX
  }

  const handleTouchEnd = () => {
    if (touchStartX.current !== null && touchEndX.current !== null) {
      const diff = touchStartX.current - touchEndX.current
      const threshold = 45 // min swipe distance
      if (diff > threshold && safeIdx < totalDecks - 1) {
        nextDeck()
      } else if (diff < -threshold && safeIdx > 0) {
        prevDeck()
      }
    }
    touchStartX.current = null
    touchEndX.current = null
  }

  const handleMascotTap = () => {
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate([15, 30, 15])
    }
    const randomQuote = CHEER_QUOTES[Math.floor(Math.random() * CHEER_QUOTES.length)]
    setMascotCheer(randomQuote)
    setTimeout(() => {
      setMascotCheer(null)
    }, 4000)
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

  // ══════════════ STATS CALCULATION FOR CURRENT DECK ══════════════
  const st = deck.status || {}
  const totalCards = Number(st.total_cards || deck.total_cards || deck.questions_count || 0)
  const learnedCards = Number(st.learned_cards || deck.learned_cards || 0)
  const unlearnedCards = Math.max(0, totalCards - learnedCards)
  const dueRemaining = Number(st.review_due_today ?? deck.review_remaining ?? 0)
  const streak = Number(st.streak || deck.streak || 0)
  const pct = totalCards > 0 ? Math.min(100, Math.round((learnedCards / totalCards) * 100)) : 0
  const isMastered = totalCards > 0 && learnedCards >= totalCards

  // Check if practice quiz disabled
  const disabledModes = (st.disabled_modes || deck.practice_settings?.disabled_modes || deck.disabled_modes || []) as string[]
  const isPracticeDisabled = Boolean(
    st.is_practice_disabled ||
    deck.is_practice_disabled ||
    disabledModes.includes('practice') ||
    disabledModes.includes('all_practice') ||
    ['mcq', 'typing', 'listening_mcq', 'listening_typing'].every(m => disabledModes.includes(m))
  )

  // Mascot expression & speech
  let mascotImg = '/mascot/sleepy.png'
  let mascotHeadline = 'Ready to study!'
  let mascotSubline = "Let's learn new words today."

  if (isMastered) {
    mascotImg = '/mascot/celebrating.png'
    mascotHeadline = 'All Mastered! 🎉'
    mascotSubline = 'Outstanding! You have mastered this entire deck.'
  } else if (dueRemaining === 0 && learnedCards > 0) {
    mascotImg = '/mascot/celebrating.png'
    mascotHeadline = 'All caught up! ✨'
    mascotSubline = 'Zero reviews due. Ready to learn new words.'
  } else if (dueRemaining > 0) {
    mascotImg = '/mascot/excited.png'
    mascotHeadline = `${dueRemaining} cards due for review!`
    mascotSubline = 'Keep your memory strong with FSRS.'
  }

  return (
    <div 
      className="flex-1 flex flex-col justify-between min-h-0 w-full p-2.5 sm:p-3 select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── 1. TOP CAROUSEL NAVIGATOR (SWIPE INDICATOR) ── */}
      <div className="flex items-center justify-between shrink-0 px-0.5 pb-1">
        {/* Left: Previous / Next & Page Count */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white px-2 py-0.5 rounded-full border border-slate-200/90 shadow-2xs">
            <button
              type="button"
              onClick={prevDeck}
              disabled={safeIdx === 0}
              className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center transition-all",
                safeIdx === 0 ? "text-slate-300 cursor-not-allowed" : "text-slate-700 hover:bg-orange-50 cursor-pointer active:scale-90"
              )}
              title="Previous deck"
            >
              <ChevronLeft className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
            <span className="text-[11px] font-black text-slate-800 px-1.5 tabular-nums">
              {safeIdx + 1} / {totalDecks}
            </span>
            <button
              type="button"
              onClick={nextDeck}
              disabled={safeIdx === totalDecks - 1}
              className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center transition-all",
                safeIdx === totalDecks - 1 ? "text-slate-300 cursor-not-allowed" : "text-slate-700 hover:bg-orange-50 cursor-pointer active:scale-90"
              )}
              title="Next deck"
            >
              <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>

          {/* Dot Indicators */}
          {totalDecks > 1 && (
            <div className="flex items-center gap-1">
              {safeDecks.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIndex(i)}
                  className={cn(
                    "h-1.5 rounded-full transition-all cursor-pointer",
                    i === safeIdx ? "w-4 bg-orange-500" : "w-1.5 bg-slate-200 hover:bg-slate-300"
                  )}
                  title={`Go to deck ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right: Deck Details Link */}
        <Link 
          to={`/decks/${deck.deck_id ?? deck.id}`}
          className="text-[11px] font-black text-orange-600 hover:text-orange-700 bg-white hover:bg-orange-50 border border-slate-200/90 hover:border-orange-200 px-2.5 py-0.5 rounded-full flex items-center gap-0.5 shadow-2xs active:scale-95 transition-all shrink-0"
        >
          <span>Deck Details</span>
          <ChevronRight className="w-3 h-3 stroke-[2.5]" />
        </Link>
      </div>

      {/* ── 2. ANIMATED DECK SLIDE (HERO STAGE + STATS + ACTIONS) ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={deck.deck_id ?? deck.id ?? safeIdx}
          initial={{ opacity: 0, x: 18 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -18 }}
          transition={{ duration: 0.2 }}
          className="flex-1 flex flex-col justify-between gap-2.5 min-h-0"
        >
          {/* ── 2A. HERO MASCOT CARD (LARGE, PROMINENT, GAMIFIED) ── */}
          <div className="bg-gradient-to-br from-amber-100/95 via-orange-50/85 to-amber-200/40 border border-orange-200/90 rounded-3xl p-4 sm:p-5 relative overflow-hidden shadow-2xs flex-1 flex flex-col justify-between items-center text-center">
            
            {/* Ambient Warm Sunburst Glow */}
            <div className="absolute inset-x-12 top-10 h-44 bg-gradient-to-t from-orange-400/20 via-amber-300/30 to-transparent rounded-full filter blur-2xl pointer-events-none" />

            {/* Top Deck Tag & Streak Strip */}
            <div className="w-full flex items-center justify-between gap-2 z-10 shrink-0">
              <Link 
                to={`/decks/${deck.deck_id ?? deck.id}`}
                className="flex items-center gap-1.5 min-w-0 max-w-[70%] hover:opacity-85 transition-opacity text-left group/deck"
              >
                <div className="w-7 h-7 rounded-xl bg-orange-500/15 border border-orange-300/70 text-orange-600 flex items-center justify-center shrink-0 group-hover/deck:scale-105 transition-transform shadow-2xs">
                  <BookOpen className="w-4 h-4 stroke-[2.4]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm sm:text-base font-black text-slate-900 truncate group-hover/deck:text-orange-600 transition-colors">
                      {deck.title}
                    </h3>
                    {deck.level && (
                      <span className="px-1.5 py-0.2 rounded-md bg-orange-100 text-orange-700 border border-orange-200 text-[10px] font-black shrink-0">
                        {deck.level}
                      </span>
                    )}
                  </div>
                </div>
              </Link>

              <div className="flex items-center gap-1.5 shrink-0">
                {streak > 0 && (
                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-full text-[10px] font-black shadow-2xs">
                    <Flame className="w-3 h-3 fill-amber-200 text-amber-200" />
                    <span>{streak}d Streak</span>
                  </div>
                )}
                <span className="px-2 py-0.5 rounded-full bg-white/90 border border-orange-200/80 text-[10px] font-bold text-slate-600 shadow-2xs">
                  {totalCards.toLocaleString()} words
                </span>
              </div>
            </div>

            {/* Centerpiece: Big, Lovable Mascot + Companion Speech Bubble */}
            <div 
              onClick={handleMascotTap}
              title="Tap the mascot for extra motivation! 🔥"
              className="relative my-auto flex flex-col items-center justify-center cursor-pointer group py-1.5 z-10"
            >
              {/* Interactive Speech Bubble */}
              <div className="relative mb-2">
                <motion.div 
                  key={mascotCheer || mascotHeadline}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-white/95 backdrop-blur-md border border-orange-200/90 text-slate-800 text-[11px] sm:text-xs font-black py-1.5 px-3.5 rounded-2xl shadow-sm text-center max-w-[240px] flex items-center gap-1.5"
                >
                  <span>{mascotCheer || mascotHeadline}</span>
                  <span className="text-orange-500 text-xs">✨</span>
                </motion.div>
                <div className="w-0 h-0 border-x-[6px] border-x-transparent border-t-[6px] border-t-white mx-auto" />
              </div>

              {/* Large, Crisp Mascot Illustration */}
              <motion.img 
                src={`${mascotImg}?v=clean_v18`} 
                alt="Vocaburn Mascot" 
                className="h-[175px] sm:h-[215px] w-auto max-w-full object-contain drop-shadow-2xl select-none transition-transform group-hover:scale-105 active:scale-95"
              />
            </div>

            {/* Bottom Motivation Headline & Mastery Progress Bar */}
            <div className="w-full z-10 shrink-0 space-y-2 pt-1 max-w-md mx-auto">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 px-0.5">
                <span className="truncate">{mascotSubline}</span>
                <span className="text-emerald-600 font-black tabular-nums shrink-0">{pct}% Mastered</span>
              </div>

              {/* Mastery Progress Bar */}
              <div className="h-2 w-full bg-white/90 rounded-full overflow-hidden p-0.5 border border-orange-200/70 shadow-2xs">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </div>

          {/* ── 2B. 3 TRUTH STAT BOXES (DUE, NEW, MASTERED) ── */}
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

            {/* Mastered Cards */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-2 sm:p-2.5 text-center shadow-2xs">
              <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400 block">
                Mastered
              </span>
              <div className="flex items-baseline justify-center gap-1 mt-0.5">
                <span className="text-base sm:text-lg font-black text-emerald-600 tabular-nums">
                  {learnedCards}
                </span>
                <span className="text-[10px] font-bold text-slate-400">cards</span>
              </div>
            </div>
          </div>

          {/* ── 2C. DUAL STUDY ACTIONS (INSTANT PLAY + QUICK MODE POPUP) ── */}
          <div className="shrink-0">
            <div className={cn("grid gap-2", isPracticeDisabled ? "grid-cols-1" : "grid-cols-2")}>
              
              {/* Flashcard Action Group */}
              <div className="flex items-center rounded-2xl bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 shadow-xs p-1 gap-1">
                {/* Primary: Study Flashcards Instant Play */}
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== 'undefined' && window.navigator?.vibrate) window.navigator.vibrate(12)
                    navigate(`/flashcard/${deck.deck_id ?? deck.id}/play`)
                  }}
                  className="flex-1 py-2 px-2.5 flex items-center justify-center gap-2 text-white active:scale-95 transition-all cursor-pointer min-w-0"
                  title="Start studying with FSRS spaced repetition"
                >
                  <div className="w-7 h-7 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                    <Brain className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-left min-w-0">
                    <span className="text-xs sm:text-[13px] font-black tracking-wide uppercase text-white block leading-tight truncate">
                      Study Flashcards
                    </span>
                    <span className="text-[9.5px] text-orange-100 font-bold block leading-tight truncate">
                      {dueRemaining > 0 ? `${dueRemaining} reviews waiting` : 'Review & Learn'}
                    </span>
                  </div>
                </button>

                {/* Secondary: Quick Mode Select Popup */}
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== 'undefined' && window.navigator?.vibrate) window.navigator.vibrate(8)
                    onOpenStudyModal?.(deck, 'flashcard')
                  }}
                  className="w-8 h-10 rounded-xl bg-white/15 hover:bg-white/25 active:bg-white/30 text-white flex items-center justify-center transition-all cursor-pointer shrink-0 border border-white/20"
                  title="Quick Study Mode Settings (FSRS, Leitner, Skim...)"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                </button>
              </div>

              {/* Practice Action Group */}
              {!isPracticeDisabled && (
                <div className="flex items-center rounded-2xl bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-600 shadow-xs p-1 gap-1">
                  {/* Primary: Practice Quiz Instant Play */}
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== 'undefined' && window.navigator?.vibrate) window.navigator.vibrate(12)
                      navigate(`/practice/${deck.deck_id ?? deck.id}`)
                    }}
                    className="flex-1 py-2 px-2.5 flex items-center justify-center gap-2 text-white active:scale-95 transition-all cursor-pointer min-w-0"
                    title="Start practice quiz"
                  >
                    <div className="w-7 h-7 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                      <Trophy className="w-4 h-4 text-white" />
                    </div>
                    <div className="text-left min-w-0">
                      <span className="text-xs sm:text-[13px] font-black tracking-wide uppercase text-white block leading-tight truncate">
                        Practice Quiz
                      </span>
                      <span className="text-[9.5px] text-teal-100 font-bold block leading-tight truncate">
                        MCQ, Typing & Tests
                      </span>
                    </div>
                  </button>

                  {/* Secondary: Quick Practice Mode Select Popup */}
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== 'undefined' && window.navigator?.vibrate) window.navigator.vibrate(8)
                      onOpenStudyModal?.(deck, 'practice')
                    }}
                    className="w-8 h-10 rounded-xl bg-white/15 hover:bg-white/25 active:bg-white/30 text-white flex items-center justify-center transition-all cursor-pointer shrink-0 border border-white/20"
                    title="Quick Practice Mode Settings (MCQ, Typing, Listening...)"
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
