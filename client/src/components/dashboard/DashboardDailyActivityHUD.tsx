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
          "group w-full flex items-center justify-between gap-1.5 sm:gap-2 rounded-xl cursor-pointer select-none transition-all duration-150 active:scale-[0.99]",
          "bg-white/95 dark:bg-slate-900/90 hover:bg-slate-50 dark:hover:bg-slate-800/80",
          "border border-slate-200/80 dark:border-slate-800 shadow-2xs py-1.5 px-2.5",
          className
        )}
        title="Click to view detailed daily learning summary"
      >
        <div className="flex items-center gap-1.5 sm:gap-2.5 text-[11px] min-w-0 flex-1 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1 text-amber-700 dark:text-amber-400 shrink-0 font-black">
            <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="tabular-nums tracking-tight">{timeLabel}</span>
          </div>
          <span className="text-slate-200 dark:text-slate-700 select-none">|</span>
          <div className={cn("flex items-center gap-1 shrink-0 transition-colors", mcqCount > 0 ? "text-emerald-700 dark:text-emerald-400 font-black" : "text-slate-400 dark:text-slate-500 font-bold")}>
            <span className="text-xs leading-none">🎯</span>
            <span className="tabular-nums tracking-tight font-black">{mcqCount}</span>
            <span className="text-[9.5px] font-semibold text-slate-400 dark:text-slate-500">MCQ</span>
          </div>
          <span className="text-slate-200 dark:text-slate-700 select-none">|</span>
          <div className={cn("flex items-center gap-1 shrink-0 transition-colors", typingCount > 0 ? "text-violet-700 dark:text-violet-400 font-black" : "text-slate-400 dark:text-slate-500 font-bold")}>
            <span className="text-xs leading-none">⌨️</span>
            <span className="tabular-nums tracking-tight font-black">{typingCount}</span>
            <span className="text-[9.5px] font-semibold text-slate-400 dark:text-slate-500">Type</span>
          </div>
          <span className="text-slate-200 dark:text-slate-700 select-none">|</span>
          <div className={cn("flex items-center gap-1 shrink-0 transition-colors", flashcardCount > 0 ? "text-blue-700 dark:text-blue-400 font-black" : "text-slate-400 dark:text-slate-500 font-bold")}>
            <span className="text-xs leading-none">🗂️</span>
            <span className="tabular-nums tracking-tight font-black">{flashcardCount}</span>
            <span className="text-[9.5px] font-semibold text-slate-400 dark:text-slate-500">Cards</span>
          </div>
          {listenCount > 0 && (
            <>
              <span className="text-slate-200 dark:text-slate-700 select-none">|</span>
              <div className="flex items-center gap-1 text-sky-700 dark:text-sky-400 font-black shrink-0">
                <span className="text-xs leading-none">🎧</span>
                <span className="tabular-nums tracking-tight font-black">{listenCount}</span>
              </div>
            </>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0 pl-1">
          {globalFocus && globalFocus.total_due > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (navigator.vibrate) navigator.vibrate(8)
                navigate('/flashcard/global-focus/play?mode=fsrs&order=random')
              }}
              className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-black text-[10.5px] tracking-tight uppercase shadow-2xs active:scale-95 transition-all cursor-pointer"
              title="Open Global Due Cards Queue"
            >
              <Zap className="w-2.5 h-2.5 fill-white stroke-none" />
              <span className="tabular-nums">{globalFocus.total_due}</span>
              <span className="hidden sm:inline font-bold lowercase text-[9.5px]">due</span>
            </button>
          )}
          <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all shrink-0" />
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
