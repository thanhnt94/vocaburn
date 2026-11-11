import React from 'react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { Clock, Zap, ChevronRight } from 'lucide-react'
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

  // Calculate specific activity modes (supporting normalized & raw mode identifiers)
  const modeBreakdown: Array<{ mode: string; cards: number }> = dailyData?.mode_breakdown || []
  
  const mcqCount = modeBreakdown
    .filter(m => m.mode === 'mcq' || m.mode === 'roadmap_mcq')
    .reduce((sum, m) => sum + (m.cards || 0), 0)

  const typingCount = modeBreakdown
    .filter(m => m.mode === 'typing' || m.mode === 'roadmap_typing')
    .reduce((sum, m) => sum + (m.cards || 0), 0)

  const listenCount = modeBreakdown
    .filter(m => m.mode === 'listening' || m.mode === 'listen' || m.mode === 'roadmap_listen')
    .reduce((sum, m) => sum + (m.cards || 0), 0)

  // Flashcards count: either sum of flashcard modes or non-practice cards
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
      return mins > 0 ? `${hrs}h${mins}m` : `${hrs}h`
    }
    if (minutes > 0) {
      return `${Math.round(minutes)}m`
    }
    if (seconds > 0) {
      return `<1m`
    }
    return `0m`
  }

  const timeLabel = formatTime(summary.total_time_minutes, summary.total_time_seconds)

  return (
    <div
      onClick={() => {
        if (navigator.vibrate) navigator.vibrate(8)
        onOpenDrawer()
      }}
      className={cn(
        "group w-full flex items-center justify-between gap-2 rounded-xl cursor-pointer select-none transition-all duration-150 active:scale-[0.99]",
        "bg-white/95 dark:bg-slate-900/90 hover:bg-slate-50 dark:hover:bg-slate-800/80",
        "border border-slate-200/80 dark:border-slate-800 shadow-2xs",
        compact ? "py-1.5 px-2.5" : "py-2 px-3",
        className
      )}
      title="Click to view full Daily Activity report"
    >
      {/* LEFT: Sleek High-Density Metrics Row (NO SCROLLBAR, FITS ALL SCREENS) */}
      <div className="flex items-center gap-2 sm:gap-3 text-[11px] min-w-0 flex-1">
        {/* Metric 1: Time */}
        <div className="flex items-center gap-1 text-amber-700 dark:text-amber-400 shrink-0 font-black">
          <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span className="tabular-nums tracking-tight">{timeLabel}</span>
        </div>

        <span className="text-slate-200 dark:text-slate-700 select-none">|</span>

        {/* Metric 2: MCQ */}
        <div 
          className={cn(
            "flex items-center gap-1 shrink-0 transition-colors",
            mcqCount > 0 
              ? "text-emerald-700 dark:text-emerald-400 font-black" 
              : "text-slate-400 dark:text-slate-500 font-bold"
          )}
        >
          <span className="text-xs leading-none">🎯</span>
          <span className="tabular-nums tracking-tight font-black">{mcqCount}</span>
          <span className="text-[9.5px] font-semibold text-slate-400 dark:text-slate-500 hidden min-[360px]:inline">
            MCQ
          </span>
        </div>

        <span className="text-slate-200 dark:text-slate-700 select-none">|</span>

        {/* Metric 3: Typing */}
        <div 
          className={cn(
            "flex items-center gap-1 shrink-0 transition-colors",
            typingCount > 0 
              ? "text-violet-700 dark:text-violet-400 font-black" 
              : "text-slate-400 dark:text-slate-500 font-bold"
          )}
        >
          <span className="text-xs leading-none">⌨️</span>
          <span className="tabular-nums tracking-tight font-black">{typingCount}</span>
          <span className="text-[9.5px] font-semibold text-slate-400 dark:text-slate-500 hidden min-[360px]:inline">
            Type
          </span>
        </div>

        <span className="text-slate-200 dark:text-slate-700 select-none">|</span>

        {/* Metric 4: Flashcards */}
        <div 
          className={cn(
            "flex items-center gap-1 shrink-0 transition-colors",
            flashcardCount > 0 
              ? "text-blue-700 dark:text-blue-400 font-black" 
              : "text-slate-400 dark:text-slate-500 font-bold"
          )}
        >
          <span className="text-xs leading-none">🗂️</span>
          <span className="tabular-nums tracking-tight font-black">{flashcardCount}</span>
          <span className="text-[9.5px] font-semibold text-slate-400 dark:text-slate-500 hidden min-[360px]:inline">
            Cards
          </span>
        </div>

        {/* Metric 5: Listening (Only if any recorded) */}
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

      {/* RIGHT: Quick Action Pill for Due Cards & Chevron */}
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
