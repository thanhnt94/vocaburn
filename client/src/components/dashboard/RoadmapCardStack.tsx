import React from 'react'
import { Play, Sparkles, CheckCircle2, ChevronRight, BookOpen, Target, Dumbbell } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface RoadmapCardStackProps {
  roadmapDecks: any[]
  onOpenStudyModal: (deck: any, tab: 'flashcard' | 'practice') => void
  navigate: (path: string) => void
  isDesktop?: boolean
}

export function RoadmapCardStack({
  roadmapDecks,
  onOpenStudyModal,
  navigate,
  isDesktop = false
}: RoadmapCardStackProps) {
  if (!roadmapDecks || roadmapDecks.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-200 bg-white/70 p-6 text-center flex flex-col items-center justify-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center">
          <BookOpen className="w-6 h-6" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-slate-800">No Active Roadmaps</h4>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            Add decks to your roadmap to track daily step-by-step vocabulary learning goals.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/decks?tab=library')}
          className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 shadow-sm shadow-orange-500/20"
        >
          Explore Library
        </button>
      </div>
    )
  }

  return (
    <div className={cn(
      "w-full flex flex-col gap-3.5",
      isDesktop && "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
    )}>
      {roadmapDecks.map((deck, idx) => {
        const status = deck.status || {}
        const totalCards = status.total_cards || deck.total_cards || 0
        const learnedCards = status.learned_cards || deck.learned_cards || 0
        const totalPct = totalCards > 0 ? Math.min(100, Math.round((learnedCards / totalCards) * 100)) : 0

        const newTarget = status.new_target_today || 0
        const newLearned = status.new_learned_today || 0
        const reviewDue = status.review_due_today || 0
        const reviewDone = status.review_completed_today || 0

        const isNewComplete = newTarget > 0 && newLearned >= newTarget
        const isReviewComplete = reviewDue > 0 && reviewDone >= reviewDue
        const isTodayAllDone = (newTarget === 0 || isNewComplete) && (reviewDue === 0 || isReviewComplete)

        const deckId = deck.deck_id || deck.id

        return (
          <motion.div
            key={deckId || idx}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.05 }}
            className="group relative bg-white border border-slate-200/80 hover:border-orange-300 rounded-3xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all duration-200 text-left flex flex-col justify-between select-none"
          >
            {/* Header: Title + Mastered % */}
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div 
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => navigate(`/deck/${deckId}`)}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100">
                      Roadmap #{idx + 1}
                    </span>
                    {isTodayAllDone && (
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Done Today
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-black text-slate-800 tracking-tight leading-snug group-hover:text-orange-600 transition-colors truncate">
                    {deck.title}
                  </h3>
                </div>

                <div className="flex flex-col items-end flex-shrink-0">
                  <span className="text-xs font-black text-slate-700 tabular-nums">
                    {totalPct}%
                  </span>
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-tighter">
                    {learnedCards}/{totalCards}
                  </span>
                </div>
              </div>

              {/* Mini Total Progress Bar */}
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-3">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-500"
                  style={{ width: `${totalPct}%` }}
                />
              </div>

              {/* Today 2-Step Badges */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                {/* Step 1: New Cards */}
                <div className={cn(
                  "p-2 rounded-2xl border flex flex-col justify-between transition-colors",
                  isNewComplete
                    ? "bg-emerald-50/70 border-emerald-200/80 text-emerald-800"
                    : "bg-slate-50 border-slate-100 text-slate-700"
                )}>
                  <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider">
                    <span className="flex items-center gap-1">
                      <Target className="w-3 h-3 text-orange-500" />
                      Step 1: New
                    </span>
                    {isNewComplete && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                  </div>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-xs font-black tabular-nums">
                      {newLearned} / {newTarget}
                    </span>
                    <span className="text-[8px] font-bold text-slate-400">cards</span>
                  </div>
                </div>

                {/* Step 2: Review Cards */}
                <div className={cn(
                  "p-2 rounded-2xl border flex flex-col justify-between transition-colors",
                  isReviewComplete
                    ? "bg-emerald-50/70 border-emerald-200/80 text-emerald-800"
                    : "bg-slate-50 border-slate-100 text-slate-700"
                )}>
                  <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-indigo-500" />
                      Step 2: Review
                    </span>
                    {isReviewComplete && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                  </div>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-xs font-black tabular-nums">
                      {reviewDone} / {reviewDue}
                    </span>
                    <span className="text-[8px] font-bold text-slate-400">cards</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions: Primary Study + Secondary Practice */}
            <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
              <button
                type="button"
                onClick={() => onOpenStudyModal(deck, 'flashcard')}
                className="flex-1 h-9 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-xs shadow-orange-500/25 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-white text-white" />
                <span>{isTodayAllDone ? 'Review' : 'Continue'}</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenStudyModal(deck, 'practice')}
                className="w-9 h-9 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 rounded-xl flex items-center justify-center active:scale-95 transition-all cursor-pointer flex-shrink-0"
                title="Practice quizzes & tests"
              >
                <Dumbbell className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => navigate(`/deck/${deckId}`)}
                className="w-9 h-9 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-xl flex items-center justify-center active:scale-95 transition-all cursor-pointer flex-shrink-0"
                title="Deck details"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
