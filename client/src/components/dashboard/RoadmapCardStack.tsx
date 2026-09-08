import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  Layers, 
  Play, 
  Brain, 
  Trophy, 
  CheckCircle2, 
  Circle, 
  Flame, 
  ChevronRight, 
  SlidersHorizontal,
  BookOpen,
  Plus
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface RoadmapCardStackProps {
  roadmapDecks: any[]
  onOpenStudyModal: (deck: any, tab: 'flashcard' | 'practice') => void
  navigate: (url: string) => void
  onOpenCustomize?: () => void
}

export function RoadmapCardStack({
  roadmapDecks = [],
  onOpenStudyModal,
  navigate,
  onOpenCustomize
}: RoadmapCardStackProps) {
  if (roadmapDecks.length === 0) {
    return (
      <div className="w-full bg-white border border-slate-200/80 rounded-3xl p-6 text-center shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-200/60 text-orange-500 flex items-center justify-center mx-auto mb-3">
          <Layers className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-black text-slate-900 tracking-tight">No Active Roadmaps Yet</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
          Choose any deck from your collection and set it as your daily roadmap to build a continuous learning streak.
        </p>
        <Link
          to="/decks"
          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm active:scale-95 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Pick a Deck</span>
        </Link>
      </div>
    )
  }

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Section Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-orange-100/70 text-orange-600 flex items-center justify-center">
            <Layers className="w-3.5 h-3.5 stroke-[2.4]" />
          </div>
          <h3 className="text-sm font-black text-slate-900 tracking-tight">Active Roadmaps</h3>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-200/60 tabular-nums">
            {roadmapDecks.length}
          </span>
        </div>

        {onOpenCustomize && (
          <button
            type="button"
            onClick={onOpenCustomize}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition-colors cursor-pointer"
            title="Customize Roadmaps"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Vertical Stack of Cards */}
      <div className="flex flex-col gap-3">
        {roadmapDecks.map((deck, idx) => {
          const st = deck?.status || {}
          const newTarget = st.new_target_today || 0
          const newLearned = st.new_learned_today || 0
          const reviewCompleted = st.review_completed_today || 0
          const reviewDue = st.review_due_today || 0
          const s1 = st.stage_1_done
          const s2 = st.stage_2_done
          const allDone = st.all_done
          const nextUrl = st.next_action_url || `/decks/${deck.deck_id || deck.id}`
          const deckStreak = st.streak || deck.streak || 0

          const totalCards = st.total_cards || deck.total_cards || deck.questions_count || 0
          const learnedCards = st.learned_cards || 0
          const totalPct = totalCards > 0 ? Math.min(100, Math.round((learnedCards / totalCards) * 100)) : 0

          return (
            <motion.div
              key={deck.deck_id || deck.id || idx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.25 }}
              className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs hover:border-orange-200 hover:shadow-sm transition-all text-left flex flex-col gap-3 relative overflow-hidden"
            >
              {/* Header: Title, Streak, and Link */}
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-100 to-amber-100 border border-orange-200/60 text-orange-600 flex items-center justify-center font-black text-sm shrink-0 shadow-2xs">
                    {deck.title ? deck.title.charAt(0).toUpperCase() : 'D'}
                  </div>

                  <div className="min-w-0">
                    <Link
                      to={`/decks/${deck.deck_id || deck.id}`}
                      className="text-sm font-black text-slate-900 hover:text-orange-600 tracking-tight truncate block transition-colors"
                    >
                      {deck.title || 'Untitled Deck'}
                    </Link>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-bold text-slate-400">
                        {learnedCards}/{totalCards} cards ({totalPct}%)
                      </span>
                      {deckStreak > 0 && (
                        <span className="flex items-center gap-0.5 text-[9px] font-black text-orange-600 bg-orange-50 px-1.5 py-0.2 rounded-md border border-orange-100">
                          <Flame className="w-2.5 h-2.5 fill-orange-500 text-orange-500" />
                          {deckStreak}d
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <Link
                  to={`/decks/${deck.deck_id || deck.id}`}
                  className="w-7 h-7 rounded-xl flex items-center justify-center text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition-colors shrink-0"
                >
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <motion.div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    allDone
                      ? "bg-emerald-500"
                      : "bg-gradient-to-r from-orange-500 to-amber-500"
                  )}
                  initial={{ width: 0 }}
                  animate={{ width: `${totalPct}%` }}
                />
              </div>

              {/* Today's Step Chips */}
              <div className="grid grid-cols-3 gap-2 py-1">
                {/* Step 1: New Words */}
                <div className={cn(
                  "px-2 py-1.5 rounded-xl border text-center flex flex-col justify-center",
                  s1
                    ? "bg-emerald-50/70 border-emerald-200/70 text-emerald-800"
                    : "bg-slate-50 border-slate-200/70 text-slate-700"
                )}>
                  <div className="flex items-center justify-center gap-1">
                    {s1 ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Circle className="w-3 h-3 text-slate-400" />
                    )}
                    <span className="text-[9px] font-black uppercase tracking-wider">Step 1: New</span>
                  </div>
                  <span className="text-[10px] font-bold mt-0.5 tabular-nums">
                    {newLearned}/{newTarget}
                  </span>
                </div>

                {/* Step 2: MCQ Quiz */}
                <div className={cn(
                  "px-2 py-1.5 rounded-xl border text-center flex flex-col justify-center",
                  s2
                    ? "bg-emerald-50/70 border-emerald-200/70 text-emerald-800"
                    : "bg-slate-50 border-slate-200/70 text-slate-700"
                )}>
                  <div className="flex items-center justify-center gap-1">
                    {s2 ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Circle className="w-3 h-3 text-slate-400" />
                    )}
                    <span className="text-[9px] font-black uppercase tracking-wider">Step 2: Quiz</span>
                  </div>
                  <span className="text-[10px] font-bold mt-0.5">
                    {s2 ? "Passed" : "Pending"}
                  </span>
                </div>

                {/* Step 3: FSRS Review */}
                <div className={cn(
                  "px-2 py-1.5 rounded-xl border text-center flex flex-col justify-center",
                  reviewDue === 0
                    ? "bg-emerald-50/70 border-emerald-200/70 text-emerald-800"
                    : "bg-orange-50/70 border-orange-200/70 text-orange-800"
                )}>
                  <div className="flex items-center justify-center gap-1">
                    {reviewDue === 0 ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Circle className="w-3 h-3 text-orange-500" />
                    )}
                    <span className="text-[9px] font-black uppercase tracking-wider">Step 3: Review</span>
                  </div>
                  <span className="text-[10px] font-bold mt-0.5 tabular-nums">
                    {reviewDue > 0 ? `${reviewDue} due` : `${reviewCompleted} done`}
                  </span>
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => navigate(nextUrl)}
                  className={cn(
                    "flex-1 py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider text-white flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-[0.98] cursor-pointer",
                    allDone
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-orange-500/20"
                  )}
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span className="truncate">
                    {allDone
                      ? "All Completed Today 🎉"
                      : !s1
                      ? "Learn New Words"
                      : !s2
                      ? "Take MCQ Quiz"
                      : "Review Due Cards"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenStudyModal({
                    id: deck.deck_id || deck.id,
                    title: deck.title,
                    questions_count: totalCards,
                    practice_settings: deck.practice_settings
                  }, 'flashcard')}
                  className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-orange-50 hover:text-orange-600 text-slate-700 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                  title="Study Flashcards"
                >
                  <Brain className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => onOpenStudyModal({
                    id: deck.deck_id || deck.id,
                    title: deck.title,
                    questions_count: totalCards,
                    practice_settings: deck.practice_settings
                  }, 'practice')}
                  className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-600 text-slate-700 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                  title="Practice Quiz"
                >
                  <Trophy className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
