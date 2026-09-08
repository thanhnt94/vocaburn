import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Flame, Zap, Play, CheckCircle2, Clock, Sparkles, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'

interface HeroTodayCardProps {
  user?: { username?: string }
  gamify?: { level?: number; xp?: number; streak?: number }
  todayReview?: {
    due_cards_count?: number
    decks_summary?: any[]
    streak_at_risk?: boolean
    estimated_minutes?: number
  }
  roadmapDecks?: any[]
  remainingTime?: string
  navigate: (url: string) => void
  onOpenStudyModal?: (deck: any, tab: 'flashcard' | 'practice') => void
  className?: string
}

export function HeroTodayCard({
  user,
  gamify,
  todayReview,
  roadmapDecks = [],
  remainingTime,
  navigate,
  onOpenStudyModal,
  className
}: HeroTodayCardProps) {
  // 1. Time-based Greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour >= 5 && hour < 12) return { text: 'Good morning', emoji: '🌤️' }
    if (hour >= 12 && hour < 18) return { text: 'Good afternoon', emoji: '☀️' }
    if (hour >= 18 && hour < 22) return { text: 'Good evening', emoji: '🌆' }
    return { text: 'Night study', emoji: '🦉' }
  }, [])

  // 2. Calculate Today's Progress Stats across all roadmap decks + reviews
  const stats = useMemo(() => {
    let completedCards = 0
    let targetCards = 0
    let firstIncompleteUrl: string | null = null
    let firstDeck: any = null

    roadmapDecks.forEach((deck) => {
      const st = deck?.status || {}
      const newTarget = st.new_target_today || 0
      const newLearned = st.new_learned_today || 0
      const reviewCompleted = st.review_completed_today || 0
      const reviewDue = st.review_due_today || 0

      completedCards += newLearned + reviewCompleted
      targetCards += newTarget + (reviewCompleted + reviewDue)

      if (!st.all_done && !firstIncompleteUrl) {
        firstIncompleteUrl = st.next_action_url || `/flashcard/${deck.deck_id || deck.id}/play`
        firstDeck = deck
      }
    })

    const reviewDueCount = todayReview?.due_cards_count || 0
    if (targetCards === 0 && reviewDueCount > 0) {
      targetCards = reviewDueCount
    } else if (targetCards === 0) {
      targetCards = 20 // default baseline goal
    }

    const isAllDone = targetCards > 0 && completedCards >= targetCards && reviewDueCount === 0
    const pct = targetCards > 0 ? Math.min(100, Math.round((completedCards / targetCards) * 100)) : 0

    return {
      completedCards,
      targetCards,
      pct,
      isAllDone,
      firstIncompleteUrl,
      firstDeck,
      reviewDueCount
    }
  }, [roadmapDecks, todayReview])

  const primaryActionUrl = stats.firstIncompleteUrl || (stats.reviewDueCount > 0 ? '/flashcard/quick/play' : '/decks')

  // SVG Ring Calculations
  const radius = 38
  const stroke = 7
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (stats.pct / 100) * circumference

  return (
    <div
      className={cn(
        "w-full rounded-[2rem] p-5 sm:p-6 text-left relative overflow-hidden transition-all duration-300 shadow-sm border",
        stats.isAllDone
          ? "bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-amber-500/10 border-emerald-500/20 text-slate-800 shadow-emerald-500/5"
          : "bg-gradient-to-br from-[#FFF8F0] via-white to-[#FFF2E6] border-orange-200/80 text-slate-900 shadow-orange-500/5",
        className
      )}
    >
      {/* Background Decorative Auras */}
      <div className="absolute -right-12 -top-12 w-44 h-44 rounded-full bg-gradient-to-br from-orange-400/15 via-amber-300/10 to-rose-400/10 blur-2xl pointer-events-none" />
      <div className="absolute -left-10 -bottom-10 w-36 h-36 rounded-full bg-gradient-to-tr from-amber-400/10 via-orange-300/5 to-transparent blur-xl pointer-events-none" />

      {/* TOP ROW: Time-based Greeting & Daily Streak HUD */}
      <div className="flex items-center justify-between gap-3 relative z-10 mb-4 pb-3 border-b border-slate-200/50">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-orange-600/90">
            <span>{greeting.emoji}</span>
            <span>{greeting.text}</span>
          </div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight truncate mt-0.5">
            {user?.username ? `Ready to study, ${user.username}?` : "Let's learn new words today!"}
          </h2>
        </div>

        {/* Streak Pill with Glowing Pulse */}
        <div className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-full shadow-sm shadow-orange-500/25 shrink-0">
          <Flame className="w-4 h-4 fill-white text-white animate-pulse" />
          <span className="text-xs font-black tracking-tight">{gamify?.streak || 0}d streak</span>
        </div>
      </div>

      {/* MIDDLE: Circular Progress Ring + Status Info */}
      <div className="flex items-center gap-4 sm:gap-6 relative z-10">
        {/* Animated SVG Progress Ring */}
        <div className="relative w-22 h-22 sm:w-24 sm:h-24 shrink-0 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 96 96">
            {/* Background Track Circle */}
            <circle
              cx="48"
              cy="48"
              r={radius}
              stroke="currentColor"
              strokeWidth={stroke}
              fill="transparent"
              className={stats.isAllDone ? "text-emerald-100" : "text-orange-100/90"}
            />
            {/* Animated Value Circle */}
            <motion.circle
              cx="48"
              cy="48"
              r={radius}
              stroke="currentColor"
              strokeWidth={stroke}
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              strokeLinecap="round"
              fill="transparent"
              className={stats.isAllDone ? "text-emerald-500" : "text-orange-500"}
            />
          </svg>

          {/* Inner Content of the Ring */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            {stats.isAllDone ? (
              <CheckCircle2 className="w-7 h-7 text-emerald-500" />
            ) : (
              <>
                <span className="text-base sm:text-lg font-black text-slate-900 leading-none">
                  {stats.pct}%
                </span>
                <span className="text-[9px] font-extrabold text-orange-600/80 uppercase tracking-tight mt-0.5">
                  DONE
                </span>
              </>
            )}
          </div>
        </div>

        {/* Right Info Section */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span
              className={cn(
                "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border",
                stats.isAllDone
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-orange-50 text-orange-700 border-orange-200"
              )}
            >
              {stats.isAllDone ? "TARGET ACHIEVED" : "DAILY GOAL"}
            </span>

            {remainingTime && (
              <span className="text-[10px] font-extrabold text-slate-500 flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>{remainingTime} left</span>
              </span>
            )}
          </div>

          <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight leading-snug">
            {stats.isAllDone
              ? "Awesome work! All today's cards finished! 🎉"
              : stats.reviewDueCount > 0
              ? `${stats.reviewDueCount} cards due for study & review`
              : `${stats.completedCards}/${stats.targetCards} cards completed today`}
          </h3>

          <p className="text-xs text-slate-500 font-medium mt-0.5 line-clamp-1">
            {stats.isAllDone
              ? "Your streak is safely locked for today. Keep shining tomorrow!"
              : todayReview?.estimated_minutes
              ? `Estimated ~${todayReview.estimated_minutes} min to conquer this step`
              : "Keep learning daily to level up your retention"}
          </p>
        </div>
      </div>

      {/* BOTTOM ACTION CTA */}
      <div className="mt-4 pt-3.5 border-t border-slate-200/50 relative z-10 flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => navigate(primaryActionUrl)}
          className={cn(
            "flex-1 py-3 px-4 rounded-2xl text-xs sm:text-sm font-black uppercase tracking-wider text-white flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] cursor-pointer",
            stats.isAllDone
              ? "bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-500/20"
              : "bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-orange-500/25"
          )}
        >
          {stats.isAllDone ? (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Study Extra / Explore Library</span>
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 fill-white" />
              <span>Start Today's Study</span>
            </>
          )}
        </button>

        {stats.firstDeck && onOpenStudyModal && (
          <button
            type="button"
            onClick={() => onOpenStudyModal(stats.firstDeck, 'practice')}
            className="h-11 px-3.5 bg-white hover:bg-orange-50/80 border border-slate-200/90 hover:border-orange-200 rounded-2xl text-xs font-black text-slate-700 flex items-center gap-1.5 transition-all shadow-2xs active:scale-95 shrink-0 cursor-pointer"
            title="Practice Quiz Mode"
          >
            <Trophy className="w-4 h-4 text-amber-500" />
            <span className="hidden sm:inline">Quiz</span>
          </button>
        )}
      </div>
    </div>
  )
}
