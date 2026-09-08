import React, { useMemo } from 'react'
import { Flame, Play, Sparkles, CheckCircle2, Clock, Zap, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface HeroTodayCardProps {
  user: { username: string; email?: string } | null
  gamify: { level: number; xp: number; streak: number }
  todayReview: any
  roadmapDecks: any[]
  remainingTime?: string
  onStartStudy: () => void
  onBrowseLibrary?: () => void
}

export function HeroTodayCard({
  user,
  gamify,
  todayReview,
  roadmapDecks,
  remainingTime,
  onStartStudy,
  onBrowseLibrary
}: HeroTodayCardProps) {
  // Calculate aggregate cards done vs goal today
  const stats = useMemo(() => {
    let targetCards = 0
    let completedCards = 0
    let dueCards = todayReview?.due_cards_count || 0

    if (roadmapDecks && roadmapDecks.length > 0) {
      roadmapDecks.forEach(d => {
        const s = d.status || {}
        const newTarget = s.new_target_today || 0
        const newDone = s.new_learned_today || 0
        const revDue = s.review_due_today || 0
        const revDone = s.review_completed_today || 0

        targetCards += (newTarget + revDue)
        completedCards += (newDone + revDone)
      })
    }

    // Fallback if target is 0 but we have todayReview data
    if (targetCards === 0) {
      targetCards = Math.max(dueCards, 20)
      completedCards = Math.max(0, targetCards - dueCards)
    }

    const percentage = targetCards > 0 
      ? Math.min(100, Math.round((completedCards / targetCards) * 100))
      : (dueCards === 0 ? 100 : 0)

    const isAllDone = dueCards === 0 && (completedCards > 0 || (roadmapDecks && roadmapDecks.length > 0))

    // Determine top active deck to study
    let activeDeckName = 'Daily Vocabulary Focus'
    if (todayReview?.decks_summary && todayReview.decks_summary.length > 0) {
      activeDeckName = todayReview.decks_summary[0].title
    } else if (roadmapDecks && roadmapDecks.length > 0) {
      activeDeckName = roadmapDecks[0].title
    }

    const estimatedMinutes = todayReview?.estimated_minutes || Math.max(5, Math.ceil(dueCards * 0.8))

    return {
      targetCards,
      completedCards,
      dueCards,
      percentage,
      isAllDone,
      activeDeckName,
      estimatedMinutes
    }
  }, [todayReview, roadmapDecks])

  // SVG Ring calculation
  const size = 100
  const strokeWidth = 9
  const center = size / 2
  const radius = center - strokeWidth
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (stats.percentage / 100) * circumference

  return (
    <div className={cn(
      "relative rounded-3xl p-5 sm:p-6 text-white overflow-hidden transition-all duration-300 select-none shadow-xl",
      stats.isAllDone
        ? "bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 shadow-emerald-500/20"
        : "bg-gradient-to-br from-orange-500 via-amber-500 to-rose-500 shadow-orange-500/25"
    )}>
      {/* Decorative ambient background glows */}
      <div className="absolute -right-10 -top-10 w-44 h-44 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      <div className="absolute -left-12 -bottom-12 w-40 h-40 rounded-full bg-black/10 blur-2xl pointer-events-none" />

      {/* Top HUD Badges */}
      <div className="relative z-10 flex items-center justify-between gap-2 mb-4">
        {/* Streak Badge with pulse */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white shadow-xs">
          <Flame className="w-4 h-4 fill-amber-300 text-amber-300 animate-pulse" />
          <span className="text-xs font-black tracking-tight">{gamify.streak} Day Streak</span>
        </div>

        {/* Time / Countdown */}
        {remainingTime ? (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/20 backdrop-blur-md text-[11px] font-bold text-white/90">
            <Clock className="w-3 h-3 text-white/80" />
            <span>Resets in {remainingTime}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-bold text-white">
            <Sparkles className="w-3 h-3 text-amber-200" />
            <span>Lv.{gamify.level} • {gamify.xp} XP</span>
          </div>
        )}
      </div>

      {/* Main Content: Ring + Target Stats */}
      <div className="relative z-10 flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-white/80 flex items-center gap-1">
            {stats.isAllDone ? (
              <>
                <CheckCircle2 className="w-3 h-3 text-emerald-200" />
                Goal Completed Today
              </>
            ) : (
              <>
                <Zap className="w-3 h-3 text-amber-200 fill-amber-200" />
                Today's Daily Target
              </>
            )}
          </span>

          <h2 className="text-lg sm:text-xl font-black text-white tracking-tight mt-0.5 truncate leading-tight">
            {stats.isAllDone ? "Outstanding Work! 🎉" : stats.activeDeckName}
          </h2>

          <p className="text-xs font-semibold text-white/85 mt-1 leading-normal line-clamp-2">
            {stats.isAllDone ? (
              "You've crushed all your flashcard targets for today! Review tomorrow to keep your memory permanent."
            ) : (
              stats.dueCards > 0 ? (
                <>
                  <strong className="text-white font-black">{stats.dueCards} cards</strong> waiting for study & review (~{stats.estimatedMinutes}m)
                </>
              ) : (
                <>Ready to learn new vocabulary words today!</>
              )
            )}
          </p>
        </div>

        {/* Animated Circular Progress Ring */}
        <div className="relative flex-shrink-0 flex items-center justify-center">
          <svg width={size} height={size} className="transform -rotate-90">
            {/* Background circle */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className="text-white/20"
              fill="transparent"
            />
            {/* Foreground animated progress circle */}
            <motion.circle
              cx={center}
              cy={center}
              r={radius}
              stroke="white"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 0.9, ease: "easeOut" }}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>

          {/* Center Text inside ring */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            {stats.isAllDone ? (
              <CheckCircle2 className="w-7 h-7 text-white animate-bounce" />
            ) : (
              <>
                <span className="text-base font-black text-white leading-none">
                  {stats.percentage}%
                </span>
                <span className="text-[9px] font-extrabold text-white/80 uppercase tracking-tighter mt-0.5">
                  {stats.completedCards}/{stats.targetCards}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Big 1-Tap Action Button */}
      <div className="relative z-10 mt-5">
        {stats.isAllDone ? (
          <button
            type="button"
            onClick={onBrowseLibrary || onStartStudy}
            className="w-full h-12 bg-white text-emerald-800 hover:bg-emerald-50 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-black/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>Explore Library & Extra Practice</span>
            <ArrowRight className="w-4 h-4 text-emerald-600" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onStartStudy}
            className="w-full h-12 bg-white text-orange-600 hover:bg-orange-50 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-black/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-orange-600 text-orange-600" />
            <span>Start Today's Session ({stats.dueCards > 0 ? `${stats.dueCards} Due` : 'New Cards'})</span>
            <ArrowRight className="w-4 h-4 text-orange-600" />
          </button>
        )}
      </div>
    </div>
  )
}
