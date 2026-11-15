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
          "border border-slate-200/90 dark:border-slate-800 shadow-2xs hover:shadow-xs",
          "p-1.5 sm:p-2",
          className
        )}
        title="Click to view detailed daily learning summary"
      >
        <div className={cn("grid gap-1.5 sm:gap-2 w-full", listenCount > 0 ? "grid-cols-5" : "grid-cols-4")}>
          {/* Box 1: Time */}
          <div className="flex items-center justify-center gap-1 sm:gap-1.5 py-1.5 px-1 rounded-xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 stroke-[2.4] shrink-0" />
            <span className="text-xs sm:text-sm font-black tabular-nums tracking-tight leading-none">{timeLabel}</span>
            <span className="text-[9px] sm:text-[9.5px] font-bold text-amber-700/80 dark:text-amber-400/80 uppercase">Time</span>
          </div>

          {/* Box 2: MCQ */}
          <div className={cn(
            "flex items-center justify-center gap-1 sm:gap-1.5 py-1.5 px-1 rounded-xl border shadow-2xs transition-colors",
            mcqCount > 0
              ? "bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-200/80 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200"
              : "bg-slate-50/80 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800 text-slate-400 dark:text-slate-500"
          )}>
            <span className="text-xs shrink-0">🎯</span>
            <span className="text-xs sm:text-sm font-black tabular-nums tracking-tight leading-none text-slate-900 dark:text-white">{mcqCount}</span>
            <span className="text-[9px] sm:text-[9.5px] font-bold opacity-75 uppercase">MCQ</span>
          </div>

          {/* Box 3: Typing */}
          <div className={cn(
            "flex items-center justify-center gap-1 sm:gap-1.5 py-1.5 px-1 rounded-xl border shadow-2xs transition-colors",
            typingCount > 0
              ? "bg-violet-50/90 dark:bg-violet-950/40 border-violet-200/80 dark:border-violet-800/60 text-violet-900 dark:text-violet-200"
              : "bg-slate-50/80 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800 text-slate-400 dark:text-slate-500"
          )}>
            <span className="text-xs shrink-0">⌨️</span>
            <span className="text-xs sm:text-sm font-black tabular-nums tracking-tight leading-none text-slate-900 dark:text-white">{typingCount}</span>
            <span className="text-[9px] sm:text-[9.5px] font-bold opacity-75 uppercase">Type</span>
          </div>

          {/* Box 4: Cards */}
          <div className={cn(
            "flex items-center justify-center gap-1 sm:gap-1.5 py-1.5 px-1 rounded-xl border shadow-2xs transition-colors",
            flashcardCount > 0
              ? "bg-blue-50/90 dark:bg-blue-950/40 border-blue-200/80 dark:border-blue-800/60 text-blue-900 dark:text-blue-200"
              : "bg-slate-50/80 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800 text-slate-400 dark:text-slate-500"
          )}>
            <span className="text-xs shrink-0">🗂️</span>
            <span className="text-xs sm:text-sm font-black tabular-nums tracking-tight leading-none text-slate-900 dark:text-white">{flashcardCount}</span>
            <span className="text-[9px] sm:text-[9.5px] font-bold opacity-75 uppercase">Cards</span>
          </div>

          {/* Box 5: Optional Listening if active */}
          {listenCount > 0 && (
            <div className="flex items-center justify-center gap-1 sm:gap-1.5 py-1.5 px-1 rounded-xl bg-sky-50/90 dark:bg-sky-950/40 border border-sky-200/90 dark:border-sky-800/60 text-sky-900 dark:text-sky-200 shadow-2xs">
              <span className="text-xs shrink-0">🎧</span>
              <span className="text-xs sm:text-sm font-black tabular-nums tracking-tight leading-none text-slate-900 dark:text-white">{listenCount}</span>
              <span className="text-[9px] sm:text-[9.5px] font-bold opacity-75 uppercase">Listen</span>
            </div>
          )}
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
      {/* ROW 1: Clean Header Title + View Log Action (Zero Duplicates, No 443 Due) */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-rose-500 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
            ⚡
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs sm:text-sm font-black tracking-tight text-slate-900 dark:text-slate-100 leading-tight">
              Today's Activity
            </span>
            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 leading-tight">
              Daily learning progress & session breakdown
            </span>
          </div>
        </div>

        {/* RIGHT: Subtle View Log link (Replaces 443 Due button) */}
        <div className="flex items-center gap-1 text-[11px] font-bold text-orange-600 dark:text-orange-400 group-hover:underline shrink-0">
          <span>View Log</span>
          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>

      {/* ROW 2: Structured Mode-Centric 4-Box Metric Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* Box 1: MCQ Practice */}
        <div className={cn(
          "rounded-2xl p-2.5 flex flex-col justify-between transition-colors border",
          mcqCount > 0
            ? "bg-emerald-50/70 dark:bg-emerald-950/25 border-emerald-200/80 dark:border-emerald-800/60"
            : "bg-slate-50/70 dark:bg-slate-800/25 border-slate-200/70 dark:border-slate-800/60"
        )}>
          <div className="flex items-center justify-between">
            <span className="text-[9.5px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">MCQ</span>
            <div className={cn(
              "w-5 h-5 rounded-lg flex items-center justify-center shrink-0 text-xs",
              mcqCount > 0 ? "bg-emerald-500/15" : "bg-slate-200/50 dark:bg-slate-700/50"
            )}>
              🎯
            </div>
          </div>
          <div className="mt-1">
            <div className="flex items-baseline gap-1">
              <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
                {mcqCount}
              </span>
              <span className="text-[10px] font-bold text-slate-400">done</span>
            </div>
            <p className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 truncate mt-0.5">
              {mcqCount > 0 ? 'questions completed' : 'multiple choice'}
            </p>
          </div>
        </div>

        {/* Box 2: Typing Recall */}
        <div className={cn(
          "rounded-2xl p-2.5 flex flex-col justify-between transition-colors border",
          typingCount > 0
            ? "bg-violet-50/70 dark:bg-violet-950/25 border-violet-200/80 dark:border-violet-800/60"
            : "bg-slate-50/70 dark:bg-slate-800/25 border-slate-200/70 dark:border-slate-800/60"
        )}>
          <div className="flex items-center justify-between">
            <span className="text-[9.5px] font-black uppercase tracking-wider text-violet-800 dark:text-violet-300">Typing</span>
            <div className={cn(
              "w-5 h-5 rounded-lg flex items-center justify-center shrink-0 text-xs",
              typingCount > 0 ? "bg-violet-500/15" : "bg-slate-200/50 dark:bg-slate-700/50"
            )}>
              ⌨️
            </div>
          </div>
          <div className="mt-1">
            <div className="flex items-baseline gap-1">
              <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
                {typingCount}
              </span>
              <span className="text-[10px] font-bold text-slate-400">done</span>
            </div>
            <p className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 truncate mt-0.5">
              {typingCount > 0 ? 'spelling completed' : 'spelling recall'}
            </p>
          </div>
        </div>

        {/* Box 3: Flashcards / FSRS */}
        <div className={cn(
          "rounded-2xl p-2.5 flex flex-col justify-between transition-colors border",
          flashcardCount > 0
            ? "bg-blue-50/70 dark:bg-blue-950/25 border-blue-200/80 dark:border-blue-800/60"
            : "bg-slate-50/70 dark:bg-slate-800/25 border-slate-200/70 dark:border-slate-800/60"
        )}>
          <div className="flex items-center justify-between">
            <span className="text-[9.5px] font-black uppercase tracking-wider text-blue-800 dark:text-blue-300">Cards</span>
            <div className={cn(
              "w-5 h-5 rounded-lg flex items-center justify-center shrink-0 text-xs",
              flashcardCount > 0 ? "bg-blue-500/15" : "bg-slate-200/50 dark:bg-slate-700/50"
            )}>
              🗂️
            </div>
          </div>
          <div className="mt-1">
            <div className="flex items-baseline gap-1">
              <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
                {flashcardCount}
              </span>
              <span className="text-[10px] font-bold text-slate-400">cards</span>
            </div>
            <p className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 truncate mt-0.5">
              +{summary.new_cards} new • {summary.reviewed_cards} rev
            </p>
          </div>
        </div>

        {/* Box 4: Focus Time */}
        <div className="bg-amber-50/70 dark:bg-amber-950/25 hover:bg-amber-50/90 dark:hover:bg-amber-950/35 border border-amber-200/80 dark:border-amber-900/50 rounded-2xl p-2.5 flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[9.5px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-400">Time</span>
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
      </div>

      {/* ROW 3: Secondary badges: XP, Accuracy, Listening */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100/90 dark:border-slate-800/80">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* XP */}
          {summary.xp_earned > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-50 dark:bg-purple-950/50 border border-purple-200/60 dark:border-purple-800/50 text-purple-800 dark:text-purple-300 font-bold text-[10px]">
              <span>⚡</span>
              <span className="font-black tabular-nums">+{summary.xp_earned}</span>
              <span className="opacity-70 text-[9px]">XP</span>
            </span>
          )}

          {/* Accuracy */}
          {summary.total_cards > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300 font-bold text-[10px]">
              <span>🎯</span>
              <span className="font-black tabular-nums">{summary.accuracy}%</span>
              <span className="opacity-70 text-[9px]">({summary.correct_count} ok • {summary.wrong_count} err)</span>
            </span>
          )}

          {/* Listening if any */}
          {listenCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-sky-50 dark:bg-sky-950/50 border border-sky-200/60 dark:border-sky-800/50 text-sky-800 dark:text-sky-300 font-bold text-[10px]">
              <span>🎧</span>
              <span className="font-black tabular-nums">{listenCount}</span>
              <span className="opacity-70 text-[9px]">Listening</span>
            </span>
          )}
        </div>

        <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 hidden sm:inline group-hover:text-orange-600 transition-colors">
          Tap to view detailed logs →
        </span>
      </div>
    </div>
  )
}
