import React, { useState, useRef, useCallback, useEffect } from 'react'
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
  RotateCcw, 
  Play, 
  Settings,
  Layers,
  CheckCircle2,
  HelpCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface DashboardRoadmapSectionProps {
  roadmapDecks: any[] | undefined
  remainingTime?: string
  selectedRoadmapIdx: number
  onSelectRoadmapIdx: (idx: number) => void
  onOpenStudyModal: (deck: any, tab: 'flashcard' | 'practice') => void
  navigate: (url: string) => void
  isDesktop?: boolean
  displayMode?: 'carousel' | 'vertical' | 'compact'
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
  isDesktop = false,
  displayMode = 'carousel',
  onOpenCustomize
}: DashboardRoadmapSectionProps) {
  const [mascotCheer, setMascotCheer] = useState<string | null>(null)

  const safeDecks = roadmapDecks || []
  const totalDecks = safeDecks.length
  const safeIdx = totalDecks > 0 ? Math.min(Math.max(0, selectedRoadmapIdx), totalDecks - 1) : 0
  const deck = safeDecks[safeIdx] || null

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

  const prevDeck = () => {
    if (safeIdx > 0) {
      if (typeof window !== 'undefined' && window.navigator?.vibrate) window.navigator.vibrate(8)
      onSelectRoadmapIdx(safeIdx - 1)
    }
  }

  const nextDeck = () => {
    if (safeIdx < totalDecks - 1) {
      if (typeof window !== 'undefined' && window.navigator?.vibrate) window.navigator.vibrate(8)
      onSelectRoadmapIdx(safeIdx + 1)
    }
  }

  // If no decks are active on Home
  if (totalDecks === 0 || !deck) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-sm mx-auto my-auto select-none">
        <div className="w-20 h-20 rounded-3xl bg-orange-50 border border-orange-200/80 flex items-center justify-center text-orange-500 mb-4 shadow-sm">
          <BookOpen className="w-10 h-10" />
        </div>
        <h3 className="text-base font-black text-slate-800 tracking-tight">No Decks on Home</h3>
        <p className="text-xs text-slate-500 mt-1 mb-5 leading-relaxed">
          Select decks from your Library or turn on decks in Manage to display them here!
        </p>
        <button
          type="button"
          onClick={() => navigate('/decks')}
          className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-black uppercase tracking-wider shadow-md shadow-orange-500/25 active:scale-95 transition-all cursor-pointer"
        >
          Explore Deck Library →
        </button>
      </div>
    )
  }

  // ══════════════ STATS CALCULATION FOR CURRENT DECK (NO FAKE ROADMAP QUOTAS!) ══════════════
  const st = deck.status || {}
  const totalCards = Number(st.total_cards || deck.total_cards || deck.questions_count || 0)
  const learnedCards = Number(st.learned_cards || deck.learned_cards || 0)
  const unlearnedCards = Math.max(0, totalCards - learnedCards)
  const dueRemaining = Number(st.review_due_today ?? deck.review_remaining ?? 0)
  const streak = Number(st.streak || deck.streak || 0)
  const pct = totalCards > 0 ? Math.min(100, Math.round((learnedCards / totalCards) * 100)) : 0
  const isMastered = totalCards > 0 && learnedCards >= totalCards

  // Practice enabled / disabled check
  const disabledModes = (st.disabled_modes || deck.practice_settings?.disabled_modes || deck.disabled_modes || []) as string[]
  const isPracticeDisabled = Boolean(
    st.is_practice_disabled ||
    deck.is_practice_disabled ||
    disabledModes.includes('practice') ||
    disabledModes.includes('all_practice') ||
    ['mcq', 'typing', 'listening_mcq', 'listening_typing'].every(m => disabledModes.includes(m))
  )

  // Mascot expression based on actual learning status
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

  // ══════════════ COMPACT VIEW ══════════════
  if (displayMode === 'compact') {
    return (
      <div className="h-full w-full flex flex-col overflow-hidden text-left select-none p-3 space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-black text-slate-800">{totalDecks} Active Decks</span>
          {onOpenCustomize && (
            <button
              onClick={onOpenCustomize}
              className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Manage</span>
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {safeDecks.map((d: any, i: number) => {
            const dTotal = Number(d.total_cards || d.status?.total_cards || d.questions_count || 0)
            const dLearned = Number(d.learned_cards || d.status?.learned_cards || 0)
            const dDue = Number(d.status?.review_due_today ?? d.review_remaining ?? 0)
            const dPct = dTotal > 0 ? Math.min(100, Math.round((dLearned / dTotal) * 100)) : 0

            return (
              <div
                key={d.deck_id || i}
                className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-2xs hover:border-orange-300 transition-all flex flex-col gap-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div 
                    onClick={() => navigate(`/decks/${d.deck_id}`)}
                    className="flex-1 min-w-0 cursor-pointer group"
                  >
                    <h4 className="text-xs sm:text-sm font-black text-slate-900 truncate group-hover:text-orange-600 transition-colors">
                      {d.title}
                    </h4>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold mt-0.5">
                      <span>{dLearned}/{dTotal} words ({dPct}%)</span>
                      {dDue > 0 && <span className="text-orange-600 font-black">• {dDue} due</span>}
                    </div>
                  </div>
                  <Link to={`/decks/${d.deck_id}`} className="text-slate-400 hover:text-orange-600 p-1">
                    <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                  </Link>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => navigate(`/flashcard/${d.deck_id}/play`)}
                    className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-black uppercase tracking-wider shadow-xs hover:from-orange-600 hover:to-amber-600 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Brain className="w-3.5 h-3.5" />
                    <span>Study Flashcards</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate(`/practice/${d.deck_id}`)}
                    className="px-3 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-black border border-teal-200/80 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Trophy className="w-3.5 h-3.5" />
                    <span>Practice</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ══════════════ SPOTLIGHT REEL VIEW (RECOMMENDED HERO DESIGN) ══════════════
  return (
    <div className="flex-1 flex flex-col justify-between gap-3 min-h-0 w-full p-3 sm:p-4 select-none">
      {/* ── Top Bar: Deck Selector & Navigation ── */}
      <div className="flex items-center justify-between shrink-0 px-0.5">
        {/* Left: Deck Carousel Navigator */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center bg-white px-2 py-0.5 rounded-full border border-slate-200/80 shadow-2xs">
            <button
              type="button"
              onClick={prevDeck}
              disabled={safeIdx === 0}
              className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center transition-all",
                safeIdx === 0 ? "text-slate-300 cursor-not-allowed" : "text-slate-700 hover:bg-slate-100 cursor-pointer active:scale-90"
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
                safeIdx === totalDecks - 1 ? "text-slate-300 cursor-not-allowed" : "text-slate-700 hover:bg-slate-100 cursor-pointer active:scale-90"
              )}
              title="Next deck"
            >
              <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>

          <span className="text-[11px] font-bold text-slate-400 truncate max-w-[140px] sm:max-w-none">
            {deck.title}
          </span>
        </div>

        {/* Right: Deck Details Link */}
        <Link 
          to={`/decks/${deck.deck_id}`}
          className="text-xs font-black text-orange-600 hover:text-orange-700 bg-white hover:bg-orange-50/50 border border-slate-200/80 hover:border-orange-200 px-2.5 py-0.5 rounded-full flex items-center gap-1 transition-all cursor-pointer shrink-0 shadow-2xs active:scale-95"
        >
          <span>Deck Details</span>
          <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
        </Link>
      </div>

      {/* ── ═══════════ HERO SPOTLIGHT MASCOT CARD ═══════════ ── */}
      <div className="bg-gradient-to-br from-amber-100/95 via-orange-50/75 to-amber-200/40 border border-orange-200/90 rounded-3xl p-4 sm:p-5 relative overflow-hidden shadow-xs flex flex-row items-center justify-between flex-1 min-h-[220px] shrink-0">
        {/* Left Side: Deck Info, Mastery Progress & Motivation */}
        <div className="relative z-20 flex-1 max-w-[62%] min-w-0 flex flex-col justify-center gap-2.5 py-1">
          {/* Deck Title & Level */}
          <Link
            to={`/decks/${deck.deck_id}`}
            className="inline-flex items-center gap-2 max-w-full text-left group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-orange-500/15 border border-orange-300/70 flex items-center justify-center text-orange-600 shrink-0 group-hover:scale-105 transition-transform">
              <BookOpen className="w-4 h-4" />
            </div>
            <span className="text-sm sm:text-base font-black text-slate-900 truncate group-hover:text-orange-600 transition-colors">
              {deck.title}
            </span>
            {deck.level && (
              <span className="px-2 py-0.5 rounded-lg bg-orange-500/15 text-orange-700 border border-orange-200/80 text-[11px] font-black shrink-0">
                {deck.level}
              </span>
            )}
          </Link>

          {/* Badges Row: Streak & Mastery % */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {streak > 0 && (
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-full text-[11px] font-black shadow-xs shrink-0">
                <Flame className="w-3 h-3 fill-amber-200 text-amber-200" />
                <span>{streak}d Streak</span>
              </div>
            )}

            {/* Total Mastery Bar Pill */}
            <div className="inline-flex items-center gap-1.5 shrink-0">
              <div className="relative h-6 min-w-[130px] sm:min-w-[150px] bg-white/90 backdrop-blur-xs border border-orange-200/90 rounded-full p-0.5 shadow-2xs overflow-hidden flex items-center">
                <div 
                  className="absolute inset-y-0.5 left-0.5 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-500 shadow-2xs"
                  style={{ width: `${pct}%` }}
                />
                <span className="relative z-10 font-black text-[11px] text-slate-900 px-2.5 truncate">
                  {learnedCards.toLocaleString()} / {totalCards.toLocaleString()} words
                </span>
              </div>
              <span className="font-black text-xs sm:text-sm text-emerald-600 tabular-nums shrink-0">
                {pct}%
              </span>
            </div>
          </div>

          {/* Motivation Speech */}
          <div className="flex flex-col gap-0.5 pt-0.5">
            <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight leading-tight">
              {mascotHeadline}
            </h2>
            <p className="text-xs font-bold text-slate-600 leading-snug">
              {mascotSubline}
            </p>
          </div>
        </div>

        {/* Right Side: Animated 3D Mascot with Cheer Bubble */}
        <div 
          onClick={handleMascotTap}
          title="Tap the mascot for extra motivation! 🔥"
          className="w-[42%] max-w-[260px] absolute right-1 sm:right-3 bottom-0 top-0 flex items-end justify-center z-10 cursor-pointer group"
        >
          <AnimatePresence>
            {mascotCheer && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.85 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.85 }}
                className="absolute top-2 right-2 bg-white/95 backdrop-blur-md border border-orange-200 text-slate-900 text-[11px] font-black p-2.5 rounded-2xl shadow-xl z-30 max-w-[170px] pointer-events-none text-center"
              >
                <div className="relative">
                  {mascotCheer}
                  <div className="absolute -bottom-4 right-6 w-0 h-0 border-x-[6px] border-x-transparent border-t-[8px] border-t-white" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.img 
            key={mascotImg}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
            src={`${mascotImg}?v=clean_v12`} 
            alt="Vocaburn Mascot" 
            className="h-[105%] max-h-[290px] w-auto max-w-none object-contain object-bottom drop-shadow-2xl translate-y-1 transition-transform group-hover:scale-105 active:scale-95 select-none"
          />
        </div>
      </div>

      {/* ── ═══════════ REAL DECK STATS BAR (NO FAKE ROADMAP QUOTAS!) ═══════════ ── */}
      <div className="grid grid-cols-3 gap-2 shrink-0">
        {/* Due Cards */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-2.5 sm:p-3 shadow-2xs flex flex-col justify-between">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            Due for Review
          </span>
          <div className="flex items-baseline gap-1 mt-1">
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
        <div className="bg-white border border-slate-200/80 rounded-2xl p-2.5 sm:p-3 shadow-2xs flex flex-col justify-between">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            Unlearned
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-base sm:text-lg font-black text-orange-600 tabular-nums">
              {unlearnedCards}
            </span>
            <span className="text-[10px] font-bold text-slate-400">cards</span>
          </div>
        </div>

        {/* Mastered Cards */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-2.5 sm:p-3 shadow-2xs flex flex-col justify-between">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            Mastered
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-base sm:text-lg font-black text-emerald-600 tabular-nums">
              {learnedCards}
            </span>
            <span className="text-[10px] font-bold text-slate-400">cards</span>
          </div>
        </div>
      </div>

      {/* ── ═══════════ DIRECT 1-CLICK STUDY ACTIONS (NO DUPLICATES!) ═══════════ ── */}
      <div className="shrink-0 pt-0.5">
        <div className={cn("grid gap-2.5", isPracticeDisabled ? "grid-cols-1" : "grid-cols-2")}>
          {/* Primary Action: Study Flashcards */}
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined' && window.navigator?.vibrate) window.navigator.vibrate(12)
              navigate(`/flashcard/${deck.deck_id}/play`)
            }}
            className="relative overflow-hidden bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-2xl p-3 sm:p-3.5 flex items-center gap-3 shadow-md shadow-orange-500/25 active:scale-[0.98] transition-all cursor-pointer group text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs sm:text-sm font-black tracking-wide uppercase text-white block truncate">
                Study Flashcards
              </span>
              <span className="text-[10px] sm:text-[11px] text-orange-100 font-medium block truncate">
                {dueRemaining > 0 ? `${dueRemaining} reviews waiting` : 'Review & Learn'}
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-orange-200 group-hover:translate-x-0.5 transition-transform shrink-0" />
          </button>

          {/* Secondary Action: Practice Quiz */}
          {!isPracticeDisabled && (
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined' && window.navigator?.vibrate) window.navigator.vibrate(12)
                navigate(`/practice/${deck.deck_id}`)
              }}
              className="relative overflow-hidden bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-600 hover:from-teal-600 hover:to-emerald-600 text-white rounded-2xl p-3 sm:p-3.5 flex items-center gap-3 shadow-md shadow-teal-500/25 active:scale-[0.98] transition-all cursor-pointer group text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs sm:text-sm font-black tracking-wide uppercase text-white block truncate">
                  Practice Quiz
                </span>
                <span className="text-[10px] sm:text-[11px] text-teal-100 font-medium block truncate">
                  MCQ, Typing & Tests
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-teal-200 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
