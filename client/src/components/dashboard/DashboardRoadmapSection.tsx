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

  // ══════════════ ALL-IN-ONE DECK STUDIO (RECOMMENDED HERO DESIGN) ══════════════
  return (
    <div className="flex-1 flex flex-col justify-between min-h-0 w-full p-2.5 sm:p-3 select-none">
      {/* ── ═══════════ UNIFIED ALL-IN-ONE DECK STUDIO CARD ═══════════ ── */}
      <div className="bg-gradient-to-br from-amber-50/90 via-orange-50/40 to-amber-100/35 border border-orange-200/80 rounded-3xl p-3.5 sm:p-4 shadow-2xs flex-1 flex flex-col justify-between min-h-0 relative overflow-hidden">
        
        {/* ── 1. CARD TOP: Deck Navigator & Title & Streak & Details ── */}
        <div className="flex items-center justify-between gap-2 shrink-0 pb-2 border-b border-orange-200/60">
          {/* Deck Navigator Pill & Title */}
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <div className="flex items-center bg-white/95 px-2 py-0.5 rounded-full border border-orange-200/80 shadow-2xs shrink-0">
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
              <span className="text-[11px] font-black text-slate-800 px-1 tabular-nums">
                {safeIdx + 1}/{totalDecks}
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

            <Link
              to={`/decks/${deck.deck_id}`}
              className="text-xs sm:text-sm font-black text-slate-900 truncate hover:text-orange-600 transition-colors"
              title={deck.title}
            >
              {deck.title}
            </Link>
            {deck.level && (
              <span className="px-1.5 py-0.2 rounded-md bg-orange-100 text-orange-700 border border-orange-200 text-[10px] font-black shrink-0">
                {deck.level}
              </span>
            )}
          </div>

          {/* Right: Streak & Details link */}
          <div className="flex items-center gap-1.5 shrink-0">
            {streak > 0 && (
              <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-full text-[10px] font-black shadow-2xs">
                <Flame className="w-3 h-3 fill-amber-200 text-amber-200" />
                <span>{streak}d</span>
              </div>
            )}
            <Link 
              to={`/decks/${deck.deck_id}`}
              className="text-[11px] font-black text-orange-600 hover:text-orange-700 bg-white/95 hover:bg-orange-50 border border-orange-200/80 px-2.5 py-0.5 rounded-full flex items-center gap-0.5 shadow-2xs active:scale-95 transition-all"
            >
              <span>Details</span>
              <ChevronRight className="w-3 h-3 stroke-[2.5]" />
            </Link>
          </div>
        </div>

        {/* ── 2. CARD CENTER: Progression & Truth Stats & Balanced Mascot ── */}
        <div className="flex-1 flex items-center justify-between gap-2.5 min-h-0 py-2.5 relative">
          {/* Left Panel: Headline, Progress Bar & 3-Stat Strip */}
          <div className="flex-1 max-w-[62%] sm:max-w-[65%] flex flex-col justify-center gap-2 z-10">
            {/* Motivation Headline */}
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight leading-tight">
                {mascotHeadline}
              </h2>
              <p className="text-[11px] font-bold text-slate-600 leading-snug line-clamp-1 mt-0.5">
                {mascotSubline}
              </p>
            </div>

            {/* Mastery Progress Bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                <span>Mastery Progress</span>
                <span className="text-emerald-600 font-black tabular-nums">{pct}%</span>
              </div>
              <div className="h-2 w-full bg-slate-200/70 rounded-full overflow-hidden p-0.5">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="text-[10px] text-slate-400 font-semibold truncate">
                {learnedCards.toLocaleString()} / {totalCards.toLocaleString()} words learned
              </div>
            </div>

            {/* Integrated 3 Truth Stats Strip */}
            <div className="grid grid-cols-3 gap-1.5 pt-0.5">
              {/* Due for Review */}
              <div className="bg-white/90 backdrop-blur-xs border border-orange-200/70 rounded-xl p-1.5 text-center shadow-2xs">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block">Due</span>
                <span className={cn(
                  "text-xs sm:text-sm font-black tabular-nums block mt-0.2",
                  dueRemaining > 0 ? "text-purple-600" : "text-emerald-600"
                )}>
                  {dueRemaining}
                </span>
              </div>

              {/* Unlearned */}
              <div className="bg-white/90 backdrop-blur-xs border border-orange-200/70 rounded-xl p-1.5 text-center shadow-2xs">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block">New</span>
                <span className="text-xs sm:text-sm font-black text-orange-600 tabular-nums block mt-0.2">
                  {unlearnedCards}
                </span>
              </div>

              {/* Mastered */}
              <div className="bg-white/90 backdrop-blur-xs border border-orange-200/70 rounded-xl p-1.5 text-center shadow-2xs">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block">Mastered</span>
                <span className="text-xs sm:text-sm font-black text-emerald-600 tabular-nums block mt-0.2">
                  {learnedCards}
                </span>
              </div>
            </div>
          </div>

          {/* Right Stage: Animated Mascot with Cheer Bubble */}
          <div 
            onClick={handleMascotTap}
            title="Tap the mascot for extra motivation! 🔥"
            className="w-[38%] sm:w-[35%] h-full flex items-end justify-center relative cursor-pointer group"
          >
            <AnimatePresence>
              {mascotCheer && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.85 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.85 }}
                  className="absolute top-0 right-0 bg-white/95 backdrop-blur-md border border-orange-200 text-slate-900 text-[10px] font-black p-2 rounded-2xl shadow-xl z-30 max-w-[150px] pointer-events-none text-center"
                >
                  <div className="relative">
                    {mascotCheer}
                    <div className="absolute -bottom-3 right-4 w-0 h-0 border-x-[5px] border-x-transparent border-t-[6px] border-t-white" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.img 
              key={mascotImg}
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.25 }}
              src={`${mascotImg}?v=clean_v12`} 
              alt="Vocaburn Mascot" 
              className="max-h-[165px] sm:max-h-[195px] w-auto max-w-full object-contain object-bottom drop-shadow-xl select-none transition-transform group-hover:scale-105 active:scale-95"
            />
          </div>
        </div>

        {/* ── 3. CARD BOTTOM: Direct 1-Click Action Buttons ── */}
        <div className="pt-2 border-t border-orange-200/60 shrink-0">
          <div className={cn("grid gap-2", isPracticeDisabled ? "grid-cols-1" : "grid-cols-2")}>
            {/* Study Flashcards */}
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined' && window.navigator?.vibrate) window.navigator.vibrate(12)
                navigate(`/flashcard/${deck.deck_id}/play`)
              }}
              className="relative overflow-hidden bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-2xl py-2 px-3 flex items-center justify-center gap-2 shadow-xs active:scale-[0.98] transition-all cursor-pointer group"
            >
              <div className="w-7 h-7 rounded-lg bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                <Brain className="w-4 h-4 text-white" />
              </div>
              <div className="text-left min-w-0">
                <span className="text-xs font-black tracking-wide uppercase text-white block leading-tight truncate">
                  Study Flashcards
                </span>
                <span className="text-[9.5px] text-orange-100 font-bold block leading-tight truncate">
                  {dueRemaining > 0 ? `${dueRemaining} reviews waiting` : 'Review & Learn'}
                </span>
              </div>
            </button>

            {/* Practice Quiz */}
            {!isPracticeDisabled && (
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined' && window.navigator?.vibrate) window.navigator.vibrate(12)
                  navigate(`/practice/${deck.deck_id}`)
                }}
                className="relative overflow-hidden bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-600 hover:from-teal-600 hover:to-emerald-600 text-white rounded-2xl py-2 px-3 flex items-center justify-center gap-2 shadow-xs active:scale-[0.98] transition-all cursor-pointer group"
              >
                <div className="w-7 h-7 rounded-lg bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                  <Trophy className="w-4 h-4 text-white" />
                </div>
                <div className="text-left min-w-0">
                  <span className="text-xs font-black tracking-wide uppercase text-white block leading-tight truncate">
                    Practice Quiz
                  </span>
                  <span className="text-[9.5px] text-teal-100 font-bold block leading-tight truncate">
                    MCQ, Typing & Tests
                  </span>
                </div>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
