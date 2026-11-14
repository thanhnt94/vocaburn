import React from 'react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { Clock, Zap, ChevronRight, Sparkles, Layers, Target } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DashboardDailyActivityHUDProps {
  onOpenDrawer: () => void
  navigate: (path: string) => void
  globalFocus?: {
    total_due: number
    active_decks_count: number
  } | null
  className?: string
  compact?: boolean
}

export function DashboardDailyActivityHUD({
  onOpenDrawer,
  navigate,
  globalFocus,
  className,
  compact = false
}: DashboardDailyActivityHUDProps) {
  const tzOffset = new Date().getTimezoneOffset()

  const { data: dailyData } = useQuery({
    queryKey: ['daily-summary', tzOffset],
    queryFn: async () => {
      const res = await axios.get(`/api/v1/stats/daily-summary?tz_offset=${tzOffset}`)
      return res.data
    },
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchInterval: 15 * 1000
  })

  const summary = dailyData?.summary || {
    total_cards: 0,
    new_cards: 0,
    reviewed_cards: 0,
    correct_count: 0,
    total_time_seconds: 0,
    total_time_minutes: 0,
    streak_count: 0
  }

  // Calculate specific activity modes
  const modeBreakdown: Array<{ mode: string; cards: number }> = dailyData?.mode_breakdown || []
  
  const mcqCount = modeBreakdown
    .filter(m => m.mode === 'mcq' || m.mode === 'roadmap_mcq' || m.mode === 'practice')
    .reduce((sum, m) => sum + (m.cards || 0), 0)

  const typingCount = modeBreakdown
    .filter(m => m.mode === 'typing' || m.mode === 'roadmap_typing')
    .reduce((sum, m) => sum + (m.cards || 0), 0)

  const listenCount = modeBreakdown
    .filter(m => m.mode === 'listening' || m.mode === 'listen' || m.mode === 'roadmap_listen')
    .reduce((sum, m) => sum + (m.cards || 0), 0)

  // Flashcards count: distinct flashcard modes or non-practice cards
  const flashcardModes = ['fsrs', 'new', 'review', 'skim', 'speed_skim', 'play', 'continuous', 'learn_new']
  const matchedFlashcards = modeBreakdown
    .filter(m => flashcardModes.includes(m.mode))
    .reduce((sum, m) => sum + (m.cards || 0), 0)

  const flashcardCount = matchedFlashcards > 0 
    ? matchedFlashcards 
    : Math.max(0, (summary.total_cards || 0) - mcqCount - typingCount - listenCount)

  // Format active study time
  const formatTime = (minutes: number, seconds: number) => {
    if (minutes >= 60) {
      const hrs = Math.floor(minutes / 60)
      const mins = Math.round(minutes % 60)
      return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`
    }
    if (minutes > 0) {
      return `${Math.round(minutes)}m`
    }
    if (seconds > 0) {
      return `< 1m`
    }
    return `0m`
  }

  const timeLabel = formatTime(summary.total_time_minutes, summary.total_time_seconds)
  const hasAnyActivity = mcqCount > 0 || typingCount > 0 || flashcardCount > 0 || listenCount > 0 || summary.total_time_seconds > 0

  if (compact) {
    return (
      <div
        onClick={() => {
          if (navigator.vibrate) navigator.vibrate(8)
          onOpenDrawer()
        }}
        className={cn(
          "group w-full rounded-2xl cursor-pointer select-none transition-all duration-200 active:scale-[0.99]",
          "bg-white/95 dark:bg-slate-900/90 hover:bg-slate-50 dark:hover:bg-slate-850",
          "border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-sm",
          "py-2 px-2.5 sm:py-2.5 sm:px-3 flex items-center justify-center",
          className
        )}
        title="Click to view detailed daily learning summary"
      >
        <div className="flex items-center justify-center gap-1.5 sm:gap-2.5 flex-wrap w-full">
          {/* Box 1: Time */}
          <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/90 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 shadow-2xs">
            <div className="w-5 h-5 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
              <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 stroke-[2.4]" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xs sm:text-sm font-black tabular-nums tracking-tight leading-none">{timeLabel}</span>
              <span className="text-[9.5px] font-bold text-amber-700/80 dark:text-amber-400/80 uppercase">Time</span>
            </div>
          </div>

          {/* Box 2: MCQ */}
          <div className={cn(
            "flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border shadow-2xs transition-colors",
            mcqCount > 0
              ? "bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-200/90 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200"
              : "bg-slate-50/80 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800 text-slate-400 dark:text-slate-500"
          )}>
            <div className={cn(
              "w-5 h-5 rounded-lg flex items-center justify-center shrink-0 text-xs",
              mcqCount > 0 ? "bg-emerald-500/15" : "bg-slate-200/50 dark:bg-slate-700/50"
            )}>
              🎯
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xs sm:text-sm font-black tabular-nums tracking-tight leading-none">{mcqCount}</span>
              <span className="text-[9.5px] font-bold opacity-75 uppercase">MCQ</span>
            </div>
          </div>

          {/* Box 3: Typing */}
          <div className={cn(
            "flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border shadow-2xs transition-colors",
            typingCount > 0
              ? "bg-violet-50/90 dark:bg-violet-950/40 border-violet-200/90 dark:border-violet-800/60 text-violet-900 dark:text-violet-200"
              : "bg-slate-50/80 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800 text-slate-400 dark:text-slate-500"
          )}>
            <div className={cn(
              "w-5 h-5 rounded-lg flex items-center justify-center shrink-0 text-xs",
              typingCount > 0 ? "bg-violet-500/15" : "bg-slate-200/50 dark:bg-slate-700/50"
            )}>
              ⌨️
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xs sm:text-sm font-black tabular-nums tracking-tight leading-none">{typingCount}</span>
              <span className="text-[9.5px] font-bold opacity-75 uppercase">Type</span>
            </div>
          </div>

          {/* Box 4: Cards */}
          <div className={cn(
            "flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border shadow-2xs transition-colors",
            flashcardCount > 0
              ? "bg-blue-50/90 dark:bg-blue-950/40 border-blue-200/90 dark:border-blue-800/60 text-blue-900 dark:text-blue-200"
              : "bg-slate-50/80 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800 text-slate-400 dark:text-slate-500"
          )}>
            <div className={cn(
              "w-5 h-5 rounded-lg flex items-center justify-center shrink-0 text-xs",
              flashcardCount > 0 ? "bg-blue-500/15" : "bg-slate-200/50 dark:bg-slate-700/50"
            )}>
              🗂️
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xs sm:text-sm font-black tabular-nums tracking-tight leading-none">{flashcardCount}</span>
              <span className="text-[9.5px] font-bold opacity-75 uppercase">Cards</span>
            </div>
          </div>

          {/* Box 5: Optional Listening if active */}
          {listenCount > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-sky-50/90 dark:bg-sky-950/40 border border-sky-200/90 dark:border-sky-800/60 text-sky-900 dark:text-sky-200 shadow-2xs">
              <div className="w-5 h-5 rounded-lg bg-sky-500/15 flex items-center justify-center shrink-0 text-xs">
                🎧
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xs sm:text-sm font-black tabular-nums tracking-tight leading-none">{listenCount}</span>
                <span className="text-[9.5px] font-bold opacity-75 uppercase">Listen</span>
              </div>
            </div>
          )}

          {/* Box 6: XP Gain / Streak */}
          <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-orange-50/90 dark:bg-orange-950/40 border border-orange-200/90 dark:border-orange-800/60 text-orange-900 dark:text-orange-200 shadow-2xs">
            <div className="w-5 h-5 rounded-lg bg-orange-500/15 flex items-center justify-center shrink-0">
              <Zap className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400 fill-orange-500 stroke-none" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xs sm:text-sm font-black tabular-nums tracking-tight leading-none">
                {summary.xp_earned > 0 ? `+${summary.xp_earned}` : `${summary.streak_count}d`}
              </span>
              <span className="text-[9.5px] font-bold text-orange-700/80 dark:text-orange-400/80 uppercase">
                {summary.xp_earned > 0 ? 'XP' : 'Streak'}
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      onClick={() => {
        if (navigator.vibrate) navigator.vibrate(8)
        onOpenDrawer()
      }}
      className={cn(
        "group w-full rounded-3xl cursor-pointer select-none transition-all duration-200 active:scale-[0.99]",
        "bg-white/95 dark:bg-slate-900/90 hover:bg-slate-50/80 dark:hover:bg-slate-850",
        "border border-slate-200/90 dark:border-slate-800 shadow-2xs hover:shadow-xs",
        "p-3 sm:p-3.5 flex flex-col gap-2.5",
        className
      )}
      title="Click to view detailed daily learning summary"
    >
      {/* ROW 1: Header + Active Time + Quick Action Button */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-rose-500 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
            ⚡
          </div>
          <div className="flex items-center gap-1.5 truncate">
            <span className="text-xs sm:text-sm font-black tracking-tight text-slate-900 dark:text-slate-100">
              Today's Activity
            </span>
            <span className="text-[10px] font-black text-orange-700 dark:text-orange-300 bg-orange-100/90 dark:bg-orange-950/70 px-1.5 py-0.5 rounded-md flex items-center gap-1 tabular-nums">
              <Clock className="w-2.5 h-2.5 text-orange-600 dark:text-orange-400 shrink-0" />
              <span>{timeLabel}</span>
            </span>
          </div>
        </div>

        {/* RIGHT: Quick Action CTA (Due queue review or View summary) */}
        <div className="flex items-center gap-1.5 shrink-0">
          {globalFocus && globalFocus.total_due > 0 ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (navigator.vibrate) navigator.vibrate(10)
                navigate('/flashcard/global-focus/play?mode=fsrs&order=random')
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-[11px] shadow-2xs active:scale-95 transition-all cursor-pointer"
            >
              <Zap className="w-3 h-3 fill-white stroke-none" />
              <span>{globalFocus.total_due} Due</span>
              <ChevronRight className="w-3 h-3 stroke-[3]" />
            </button>
          ) : (
            <div className="flex items-center gap-1 text-[11px] font-bold text-orange-600 dark:text-orange-400 group-hover:underline">
              <span>View Log</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          )}
        </div>
      </div>

      {/* ROW 2: Structured 4-Box Metric Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* Box 1: Study Time */}
        <div className="bg-amber-50/60 dark:bg-amber-950/20 hover:bg-amber-50/90 dark:hover:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/40 rounded-2xl p-2.5 flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-wider text-amber-800/70 dark:text-amber-400/70">Time</span>
            <div className="w-5 h-5 rounded-lg bg-amber-100/80 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
              <Clock className="w-3 h-3" />
            </div>
          </div>
          <div className="mt-1">
            <div className="flex items-baseline gap-1">
              <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
                {timeLabel}
              </span>
            </div>
            <p className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 truncate mt-0.5">
              {summary.first_session_time 
                ? `${summary.first_session_time} → ${summary.last_session_time || summary.first_session_time}`
                : 'active study'}
            </p>
          </div>
        </div>

        {/* Box 2: Cards Studied */}
        <div className="bg-indigo-50/60 dark:bg-indigo-950/20 hover:bg-indigo-50/90 dark:hover:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-900/40 rounded-2xl p-2.5 flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-wider text-indigo-800/70 dark:text-indigo-400/70">Studied</span>
            <div className="w-5 h-5 rounded-lg bg-indigo-100/80 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0">
              <Layers className="w-3 h-3" />
            </div>
          </div>
          <div className="mt-1">
            <div className="flex items-baseline gap-1">
              <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
                {summary.total_cards}
              </span>
              <span className="text-[10px] font-bold text-slate-400">cards</span>
            </div>
            <p className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 truncate mt-0.5">
              +{summary.new_cards} new • {summary.reviewed_cards} rev
            </p>
          </div>
        </div>

        {/* Box 3: Practice & Accuracy */}
        <div className="bg-emerald-50/60 dark:bg-emerald-950/20 hover:bg-emerald-50/90 dark:hover:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/40 rounded-2xl p-2.5 flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-wider text-emerald-800/70 dark:text-emerald-400/70">Accuracy</span>
            <div className="w-5 h-5 rounded-lg bg-emerald-100/80 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
              <Target className="w-3 h-3" />
            </div>
          </div>
          <div className="mt-1">
            <div className="flex items-baseline gap-1">
              <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
                {summary.total_cards > 0 ? `${summary.accuracy}%` : `${mcqCount + typingCount}`}
              </span>
              {summary.total_cards === 0 && <span className="text-[10px] font-bold text-slate-400">done</span>}
            </div>
            <p className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 truncate mt-0.5">
              {summary.correct_count} ok • {summary.wrong_count} err
            </p>
          </div>
        </div>

        {/* Box 4: XP Earned & Streak */}
        <div className="bg-purple-50/60 dark:bg-purple-950/20 hover:bg-purple-50/90 dark:hover:bg-purple-950/30 border border-purple-200/70 dark:border-purple-900/40 rounded-2xl p-2.5 flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-wider text-purple-800/70 dark:text-purple-400/70">Gain</span>
            <div className="w-5 h-5 rounded-lg bg-purple-100/80 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0">
              <Zap className="w-3 h-3 fill-current" />
            </div>
          </div>
          <div className="mt-1">
            <div className="flex items-baseline gap-1">
              <span className="text-base sm:text-lg font-black text-purple-700 dark:text-purple-300 tabular-nums tracking-tight">
                +{summary.xp_earned}
              </span>
              <span className="text-[10px] font-bold text-slate-400">XP</span>
            </div>
            <p className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 truncate mt-0.5">
              Streak: {summary.streak_count}d 🔥
            </p>
          </div>
        </div>
      </div>

      {/* ROW 3: Sub-breakdown chips if any activity exists */}
      {hasAnyActivity && (
        <div className="flex items-center gap-1.5 flex-wrap pt-0.5 border-t border-slate-100/80 dark:border-slate-800/80">
          {mcqCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 font-bold text-[10.5px]">
              <span>🎯</span>
              <span className="tabular-nums font-black">{mcqCount}</span>
              <span className="opacity-70 text-[9.5px]">MCQ</span>
            </span>
          )}
          {typingCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-violet-50 dark:bg-violet-950/60 border border-violet-200/60 dark:border-violet-800/60 text-violet-800 dark:text-violet-300 font-bold text-[10.5px]">
              <span>⌨️</span>
              <span className="tabular-nums font-black">{typingCount}</span>
              <span className="opacity-70 text-[9.5px]">Typing</span>
            </span>
          )}
          {flashcardCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/60 text-blue-800 dark:text-blue-300 font-bold text-[10.5px]">
              <span>🗂️</span>
              <span className="tabular-nums font-black">{flashcardCount}</span>
              <span className="opacity-70 text-[9.5px]">Cards</span>
            </span>
          )}
          {listenCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-sky-50 dark:bg-sky-950/60 border border-sky-200/60 dark:border-sky-800/60 text-sky-800 dark:text-sky-300 font-bold text-[10.5px]">
              <span>🎧</span>
              <span className="tabular-nums font-black">{listenCount}</span>
              <span className="opacity-70 text-[9.5px]">Listening</span>
            </span>
          )}
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 ml-auto hidden sm:inline">
            Tap for full session logs & charts →
          </span>
        </div>
      )}
    </div>
  )
}
