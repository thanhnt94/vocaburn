import React from 'react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { Clock, Zap, ChevronRight, CheckCircle2, Flame } from 'lucide-react'
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
    staleTime: 15 * 1000,
    refetchInterval: 30 * 1000
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
  const mcqCount = modeBreakdown.find(m => m.mode === 'mcq')?.cards || 0
  const typingCount = modeBreakdown.find(m => m.mode === 'typing')?.cards || 0
  const listenCount = modeBreakdown.find(m => m.mode === 'listening' || m.mode === 'listen')?.cards || 0
  
  // Flashcard cards (FSRS + Continuous + Skim + Learn New)
  const flashcardCount = (summary.reviewed_cards || 0) + (summary.new_cards || 0)

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
  const hasStudied = summary.total_cards > 0 || summary.total_time_seconds > 0

  return (
    <div
      onClick={() => {
        if (navigator.vibrate) navigator.vibrate(8)
        onOpenDrawer()
      }}
      className={cn(
        "group relative flex items-center justify-between gap-2.5 rounded-2xl cursor-pointer select-none transition-all duration-200 active:scale-[0.99]",
        "bg-white/95 dark:bg-slate-900/90 hover:bg-slate-50/95 dark:hover:bg-slate-800/90",
        "border border-slate-200/90 dark:border-slate-800 shadow-2xs hover:shadow-xs",
        compact ? "py-1.5 px-3 text-xs" : "py-2 px-3.5 text-xs",
        className
      )}
      title="Click to view full Daily Activity report"
    >
      {/* LEFT: Live Pulse Badge */}
      <div className="flex items-center gap-1.5 shrink-0">
        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black text-[10px] tracking-wide">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span>TODAY</span>
        </div>
      </div>

      {/* CENTER: Dynamic Metrics Stream */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none min-w-0 py-0.5 flex-1">
        {/* Metric 1: Time */}
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-800 dark:text-amber-300 font-extrabold text-[11px] shrink-0">
          <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="tabular-nums">{timeLabel}</span>
        </div>

        {/* Metric 2: MCQ */}
        <div 
          className={cn(
            "flex items-center gap-1 px-2 py-0.5 rounded-lg font-extrabold text-[11px] shrink-0 transition-colors",
            mcqCount > 0 
              ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300" 
              : "bg-slate-100 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500"
          )}
        >
          <span>🎯</span>
          <span className="tabular-nums">{mcqCount}</span>
          <span className="text-[10px] opacity-80">MCQ</span>
        </div>

        {/* Metric 3: Typing */}
        <div 
          className={cn(
            "flex items-center gap-1 px-2 py-0.5 rounded-lg font-extrabold text-[11px] shrink-0 transition-colors",
            typingCount > 0 
              ? "bg-violet-500/10 text-violet-800 dark:text-violet-300" 
              : "bg-slate-100 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500"
          )}
        >
          <span>⌨️</span>
          <span className="tabular-nums">{typingCount}</span>
          <span className="text-[10px] opacity-80">Type</span>
        </div>

        {/* Metric 4: Flashcards */}
        <div 
          className={cn(
            "flex items-center gap-1 px-2 py-0.5 rounded-lg font-extrabold text-[11px] shrink-0 transition-colors",
            flashcardCount > 0 
              ? "bg-blue-500/10 text-blue-800 dark:text-blue-300" 
              : "bg-slate-100 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500"
          )}
        >
          <span>🗂️</span>
          <span className="tabular-nums">{flashcardCount}</span>
          <span className="text-[10px] opacity-80">Cards</span>
        </div>

        {/* Optional Metric 5: Listening (if any) */}
        {listenCount > 0 && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-sky-500/10 text-sky-800 dark:text-sky-300 font-extrabold text-[11px] shrink-0">
            <span>🎧</span>
            <span className="tabular-nums">{listenCount}</span>
            <span className="text-[10px] opacity-80">Listen</span>
          </div>
        )}

        {/* Streak badge if available */}
        {summary.streak_count > 0 && (
          <div className="hidden md:flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-orange-500/10 text-orange-700 dark:text-orange-400 font-black text-[10.5px] shrink-0">
            <Flame className="w-3 h-3 text-orange-500 fill-orange-500 shrink-0" />
            <span className="tabular-nums">{summary.streak_count}</span>
          </div>
        )}
      </div>

      {/* RIGHT: Focus Queue Quick Pill or Status */}
      <div className="flex items-center gap-1.5 shrink-0 pl-1">
        {globalFocus && globalFocus.total_due > 0 ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (navigator.vibrate) navigator.vibrate(10)
              navigate('/flashcard/global-focus/play?mode=fsrs&order=random')
            }}
            className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-[10px] tracking-tight uppercase shadow-2xs hover:scale-105 active:scale-95 transition-all cursor-pointer"
            title="Open Global Due Cards Queue"
          >
            <Zap className="w-2.5 h-2.5 fill-white stroke-none" />
            <span className="tabular-nums">{globalFocus.total_due}</span>
            <span className="hidden sm:inline">due</span>
          </button>
        ) : (
          <div className="hidden sm:flex items-center gap-1 text-[10.5px] font-bold text-slate-400 dark:text-slate-500">
            <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
            <span className="hidden lg:inline">Clean</span>
          </div>
        )}

        <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 group-hover:translate-x-0.5 transition-all shrink-0" />
      </div>
    </div>
  )
}

