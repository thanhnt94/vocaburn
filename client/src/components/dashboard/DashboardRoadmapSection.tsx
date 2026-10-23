import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ChevronRight, 
  BookOpen, 
  Flame, 
  Brain, 
  Trophy, 
  Sparkles, 
  SlidersHorizontal,
  Plus
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
  navigate,
  onOpenCustomize
}: DashboardRoadmapSectionProps) {
  const [mascotCheer, setMascotCheer] = useState<string | null>(null)

  const safeDecks = roadmapDecks || []
  const totalDecks = safeDecks.length

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

  // Calculate total due across all learning decks
  const totalDueAllDecks = safeDecks.reduce((sum, d) => {
    const due = Number(d.status?.review_due_today ?? d.review_remaining ?? 0)
    return sum + due
  }, 0)

  // Empty state if no decks are active on Home
  if (totalDecks === 0) {
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

  return (
    <div className="flex-1 flex flex-col min-h-0 w-full overflow-hidden text-left select-none p-2.5 sm:p-3 space-y-3">
      
      {/* ── ═══════════ TOP HERO MASCOT GREETING BANNER (~120px) ═══════════ ── */}
      <div className="bg-gradient-to-r from-amber-100/95 via-orange-50/90 to-amber-200/40 border border-orange-200/90 rounded-3xl p-3 sm:p-4 shadow-2xs flex items-center justify-between shrink-0 relative overflow-hidden">
        
        {/* Left Side: Dynamic Motivation & Tap Quote */}
        <div className="flex-1 max-w-[62%] sm:max-w-[68%] min-w-0 z-10 flex flex-col justify-center gap-1.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
            <span className="text-[11px] font-black uppercase tracking-wider text-orange-700">
              {totalDueAllDecks > 0 ? 'Daily Study Pulse' : 'All Caught Up'}
            </span>
          </div>

          <div>
            <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight leading-tight">
              {totalDueAllDecks > 0 
                ? `${totalDueAllDecks} reviews waiting today! 🔥` 
                : 'Zero reviews due right now! 🎉'}
            </h2>
            <p className="text-[11px] font-bold text-slate-600 leading-snug mt-0.5 line-clamp-1">
              {totalDueAllDecks > 0 
                ? 'Keep your memory strong with spaced repetition.' 
                : 'Great work! Pick a deck below to learn new words.'}
            </p>
          </div>

          {/* Quick Stats Pill */}
          <div className="flex items-center gap-2 pt-0.5">
            <span className="text-[10px] font-extrabold text-orange-800/80 bg-orange-500/15 px-2 py-0.5 rounded-md border border-orange-200/80">
              {totalDecks} active {totalDecks === 1 ? 'deck' : 'decks'}
            </span>
            {onOpenCustomize && (
              <button
                type="button"
                onClick={onOpenCustomize}
                className="text-[10px] font-black text-orange-600 hover:text-orange-700 flex items-center gap-0.5 hover:underline cursor-pointer"
              >
                <span>Edit Home</span>
                <ChevronRight className="w-2.5 h-2.5 stroke-[3]" />
              </button>
            )}
          </div>
        </div>

        {/* Right Side: Animated 3D Mascot with Cheer Speech Bubble */}
        <div 
          onClick={handleMascotTap}
          title="Tap Vocaburn mascot for daily motivation! 🔥"
          className="w-[38%] sm:w-[32%] h-full flex items-end justify-center relative cursor-pointer group shrink-0"
        >
          <AnimatePresence>
            {mascotCheer && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.85 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.85 }}
                className="absolute -top-1 right-0 bg-white/95 backdrop-blur-md border border-orange-200 text-slate-900 text-[10px] font-black p-2 rounded-2xl shadow-xl z-30 max-w-[155px] pointer-events-none text-center"
              >
                <div className="relative">
                  {mascotCheer}
                  <div className="absolute -bottom-3 right-5 w-0 h-0 border-x-[5px] border-x-transparent border-t-[6px] border-t-white" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <img 
            src="/mascot/excited.png?v=clean_v14" 
            alt="Vocaburn Mascot" 
            className="h-[105px] sm:h-[115px] w-auto object-contain object-bottom drop-shadow-md select-none transition-transform group-hover:scale-105 active:scale-95"
          />
        </div>
      </div>

      {/* ── ═══════════ ACTIVE LEARNING DECKS SCROLLABLE FEED ═══════════ ── */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-0.5 pb-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200">
        {safeDecks.map((deck: any, idx: number) => {
          const deckId = deck.deck_id ?? deck.id
          const st = deck.status || {}
          const totalCards = Number(st.total_cards || deck.total_cards || deck.questions_count || 0)
          const learnedCards = Number(st.learned_cards || deck.learned_cards || 0)
          const unlearnedCards = Math.max(0, totalCards - learnedCards)
          const dueRemaining = Number(st.review_due_today ?? deck.review_remaining ?? 0)
          const streak = Number(st.streak || deck.streak || 0)
          const pct = totalCards > 0 ? Math.min(100, Math.round((learnedCards / totalCards) * 100)) : 0

          // Check if practice quiz disabled
          const disabledModes = (st.disabled_modes || deck.practice_settings?.disabled_modes || deck.disabled_modes || []) as string[]
          const isPracticeDisabled = Boolean(
            st.is_practice_disabled ||
            deck.is_practice_disabled ||
            disabledModes.includes('practice') ||
            disabledModes.includes('all_practice') ||
            ['mcq', 'typing', 'listening_mcq', 'listening_typing'].every(m => disabledModes.includes(m))
          )

          return (
            <div 
              key={deckId || idx}
              className="bg-white border border-slate-200/90 hover:border-orange-300 rounded-3xl p-3.5 sm:p-4 shadow-2xs transition-all flex flex-col gap-3 group"
            >
              {/* Deck Header: Title, Level, Streak, Link */}
              <div className="flex items-center justify-between gap-2">
                <Link 
                  to={`/decks/${deckId}`}
                  className="flex items-center gap-2 min-w-0 flex-1 group/title"
                >
                  <div className="w-8 h-8 rounded-xl bg-orange-50 border border-orange-200/80 text-orange-600 flex items-center justify-center shrink-0 group-hover/title:scale-105 transition-transform">
                    <BookOpen className="w-4 h-4 stroke-[2.4]" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-sm font-black text-slate-900 truncate group-hover/title:text-orange-600 transition-colors">
                        {deck.title}
                      </h4>
                      {deck.level && (
                        <span className="px-1.5 py-0.2 rounded-md bg-orange-100 text-orange-700 border border-orange-200 text-[10px] font-black shrink-0">
                          {deck.level}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 mt-0.5 truncate">
                      {learnedCards.toLocaleString()} / {totalCards.toLocaleString()} words learned ({pct}%)
                    </div>
                  </div>
                </Link>

                <div className="flex items-center gap-1.5 shrink-0">
                  {streak > 0 && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-full text-[10px] font-black shadow-2xs">
                      <Flame className="w-3 h-3 fill-amber-200 text-amber-200" />
                      <span>{streak}d</span>
                    </div>
                  )}
                  <Link 
                    to={`/decks/${deckId}`}
                    className="text-slate-400 hover:text-orange-600 p-1 transition-colors"
                    title="View deck details"
                  >
                    <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                  </Link>
                </div>
              </div>

              {/* Progress Bar with Mastery % */}
              <div className="space-y-1">
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden p-0.5">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              {/* 3 Truth Stats (FSRS) */}
              <div className="grid grid-cols-3 gap-1.5">
                <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-1.5 text-center">
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block">Due</span>
                  <span className={cn(
                    "text-xs sm:text-sm font-black tabular-nums block mt-0.5",
                    dueRemaining > 0 ? "text-purple-600" : "text-emerald-600"
                  )}>
                    {dueRemaining}
                  </span>
                </div>

                <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-1.5 text-center">
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block">New</span>
                  <span className="text-xs sm:text-sm font-black text-orange-600 tabular-nums block mt-0.5">
                    {unlearnedCards}
                  </span>
                </div>

                <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-1.5 text-center">
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block">Mastered</span>
                  <span className="text-xs sm:text-sm font-black text-emerald-600 tabular-nums block mt-0.5">
                    {learnedCards}
                  </span>
                </div>
              </div>

              {/* 2 Direct 1-Click Action Buttons */}
              <div className={cn("grid gap-2 pt-0.5", isPracticeDisabled ? "grid-cols-1" : "grid-cols-2")}>
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== 'undefined' && window.navigator?.vibrate) window.navigator.vibrate(10)
                    navigate(`/flashcard/${deckId}/play`)
                  }}
                  className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer"
                >
                  <Brain className="w-3.5 h-3.5" />
                  <span>Study Flashcards</span>
                  {dueRemaining > 0 && (
                    <span className="px-1.5 py-0.2 rounded-md bg-white/25 text-[10px] font-extrabold tabular-nums">
                      {dueRemaining}
                    </span>
                  )}
                </button>

                {!isPracticeDisabled && (
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== 'undefined' && window.navigator?.vibrate) window.navigator.vibrate(10)
                      navigate(`/practice/${deckId}`)
                    }}
                    className="py-2.5 px-3 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200/80 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                  >
                    <Trophy className="w-3.5 h-3.5" />
                    <span>Practice</span>
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
