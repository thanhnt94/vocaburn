import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { 
  Clock, 
  Layers, 
  Target, 
  Zap, 
  RotateCcw, 
  ChevronRight, 
  Activity, 
  History, 
  X,
  BookOpen,
  Calendar
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { resolveMediaUrl } from '@/components/common/MediaUrlInput'

interface DashboardDailyDrawerProps {
  isOpen: boolean
  onClose: () => void
  navigate: (url: string) => void
  onSwitchTab?: (tab: 'roadmap' | 'learning') => void
}

const MODE_META: Record<string, { label: string; emoji: string; color: string; badgeBg: string }> = {
  fsrs: { label: 'FSRS Spaced Repetition', emoji: '⚡', color: 'text-indigo-600', badgeBg: 'bg-indigo-50 border-indigo-200/80 text-indigo-700' },
  new: { label: 'Learn New Words', emoji: '✨', color: 'text-purple-600', badgeBg: 'bg-purple-50 border-purple-200/80 text-purple-700' },
  review: { label: 'Continuous Review', emoji: '🔄', color: 'text-blue-600', badgeBg: 'bg-blue-50 border-blue-200/80 text-blue-700' },
  skim: { label: 'Speed Skim', emoji: '⚡', color: 'text-amber-600', badgeBg: 'bg-amber-50 border-amber-200/80 text-amber-700' },
  mcq: { label: '4-Choice Quiz', emoji: '🎯', color: 'text-emerald-600', badgeBg: 'bg-emerald-50 border-emerald-200/80 text-emerald-700' },
  typing: { label: 'Spelling Recall', emoji: '⌨️', color: 'text-violet-600', badgeBg: 'bg-violet-50 border-violet-200/80 text-violet-700' },
  listening: { label: 'Audio Dictation', emoji: '🎧', color: 'text-sky-600', badgeBg: 'bg-sky-50 border-sky-200/80 text-sky-700' },
}

export function DashboardDailyDrawer({
  isOpen,
  onClose,
  navigate,
  onSwitchTab
}: DashboardDailyDrawerProps) {
  const tzOffset = new Date().getTimezoneOffset()
  const touchStartY = useRef<number | null>(null)

  // Close on ESC key
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['daily-summary', tzOffset],
    queryFn: async () => {
      const res = await axios.get(`/api/v1/stats/daily-summary?tz_offset=${tzOffset}`)
      return res.data
    },
    staleTime: 15 * 1000,
    refetchInterval: 30 * 1000,
    enabled: isOpen
  })

  const summary = data?.summary || {
    total_cards: 0,
    new_cards: 0,
    reviewed_cards: 0,
    correct_count: 0,
    wrong_count: 0,
    accuracy: 0,
    total_time_seconds: 0,
    total_time_minutes: 0,
    total_sessions: 0,
    first_session_time: null,
    last_session_time: null,
    xp_earned: 0,
    points_earned: 0,
    streak_count: 0,
    streak_completed_today: false
  }

  const sessions = data?.sessions || []
  const hourlyActivity: number[] = data?.hourly_activity || Array(24).fill(0)
  const modeBreakdown = data?.mode_breakdown || []
  const decksStudied = data?.decks_studied || []
  const roadmapGoals = data?.roadmap_goals || []

  const maxHourlyCount = Math.max(1, ...hourlyActivity)

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[280] select-none font-sans">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => {
              if (navigator.vibrate) navigator.vibrate(6)
              onClose()
            }}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm cursor-pointer"
          />

          {/* Drawer Sheet Container */}
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className={cn(
              "fixed z-[290] bg-[#f8fafc] flex flex-col overflow-hidden text-left shadow-2xl",
              // Mobile styles: bottom sheet
              "inset-x-0 bottom-0 h-[88vh] max-h-[88vh] rounded-t-[2.5rem] border-t border-slate-200/90",
              // Desktop styles: centered modal
              "md:inset-x-auto md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-2xl md:h-[86vh] md:max-h-[800px] md:rounded-[2.5rem] md:border md:border-slate-200/90"
            )}
          >
            {/* Mobile Drag Handle Bar */}
            <div 
              className="md:hidden pt-3 pb-1 flex justify-center cursor-grab active:cursor-grabbing shrink-0"
              onTouchStart={(e) => {
                touchStartY.current = e.touches[0].clientY
              }}
              onTouchEnd={(e) => {
                if (touchStartY.current !== null) {
                  const diffY = e.changedTouches[0].clientY - touchStartY.current
                  if (diffY > 60) {
                    if (navigator.vibrate) navigator.vibrate(8)
                    onClose()
                  }
                }
                touchStartY.current = null
              }}
            >
              <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
            </div>

            {/* ═══════════ TOP HEADER ═══════════ */}
            <div className="bg-white px-4 sm:px-6 py-3.5 border-b border-slate-200/80 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-500 via-amber-500 to-rose-500 flex items-center justify-center text-white font-black text-lg shadow-md shadow-orange-500/20 shrink-0">
                  📊
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight leading-tight">
                      Today's Activity
                    </h2>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black border uppercase tracking-wider",
                      summary.streak_completed_today
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                        : "bg-amber-50 border-amber-200 text-amber-700"
                    )}>
                      {summary.streak_completed_today ? "🔥 Streak Active" : "⚡ In Progress"}
                    </span>
                  </div>
                  <p className="text-[11px] font-bold text-slate-400 mt-0.5 truncate">
                    {data?.date_str || new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>

              {/* Header Actions: Refresh & Close */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-600 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                  title="Refresh statistics"
                >
                  <RotateCcw className={cn("w-3.5 h-3.5", isFetching && "animate-spin text-orange-500")} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (navigator.vibrate) navigator.vibrate(6)
                    onClose()
                  }}
                  className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-600 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ═══════════ SCROLLABLE CONTENT BODY ═══════════ */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3.5 sm:p-5 space-y-3.5 sm:space-y-4">
              {isLoading ? (
                <div className="py-16 flex flex-col items-center justify-center text-center">
                  <div className="w-9 h-9 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mb-3" />
                  <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Loading today's stats...</p>
                </div>
              ) : (
                <>
                  {/* ═══════════ 4 CORE METRIC HUD CARDS ═══════════ */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {/* Card 1: Study Time */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-3 shadow-2xs flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Study Time</span>
                        <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                          <Clock className="w-3 h-3" />
                        </span>
                      </div>
                      <div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-lg sm:text-xl font-black text-slate-900 tabular-nums">
                            {summary.total_time_minutes > 0 ? summary.total_time_minutes : (summary.total_time_seconds > 0 ? Math.ceil(summary.total_time_seconds / 60) : 0)}
                          </span>
                          <span className="text-[11px] font-black text-slate-500">mins</span>
                        </div>
                        <p className="text-[9.5px] text-slate-400 font-bold truncate mt-0.5">
                          {summary.first_session_time 
                            ? `${summary.first_session_time} → ${summary.last_session_time || summary.first_session_time}`
                            : 'No session yet'}
                        </p>
                      </div>
                    </div>

                    {/* Card 2: Cards Studied */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-3 shadow-2xs flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Cards</span>
                        <span className="w-6 h-6 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                          <Layers className="w-3 h-3" />
                        </span>
                      </div>
                      <div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-lg sm:text-xl font-black text-slate-900 tabular-nums">
                            {summary.total_cards}
                          </span>
                          <span className="text-[11px] font-black text-slate-500">cards</span>
                        </div>
                        <p className="text-[9.5px] text-slate-400 font-bold truncate mt-0.5">
                          +{summary.new_cards} new • {summary.reviewed_cards} rev
                        </p>
                      </div>
                    </div>

                    {/* Card 3: Accuracy */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-3 shadow-2xs flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Accuracy</span>
                        <span className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                          <Target className="w-3 h-3" />
                        </span>
                      </div>
                      <div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-lg sm:text-xl font-black text-slate-900 tabular-nums">
                            {summary.accuracy}%
                          </span>
                        </div>
                        <p className="text-[9.5px] text-slate-400 font-bold truncate mt-0.5">
                          {summary.correct_count} correct • {summary.wrong_count} wrong
                        </p>
                      </div>
                    </div>

                    {/* Card 4: XP Earned */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-3 shadow-2xs flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">XP Earned</span>
                        <span className="w-6 h-6 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                          <Zap className="w-3 h-3 fill-current" />
                        </span>
                      </div>
                      <div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-lg sm:text-xl font-black text-orange-600 tabular-nums">
                            +{summary.xp_earned}
                          </span>
                          <span className="text-[11px] font-black text-slate-500">XP</span>
                        </div>
                        <p className="text-[9.5px] text-slate-400 font-bold truncate mt-0.5">
                          +{summary.points_earned} pts • {summary.total_sessions} sess
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* ═══════════ HOURLY FOCUS HEATMAP (00:00 - 23:00) ═══════════ */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-2xs flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-orange-500 stroke-[2.2]" />
                        <h3 className="text-xs sm:text-sm font-black text-slate-800">Hourly Study Pulse</h3>
                      </div>
                      <span className="text-[9.5px] font-bold text-slate-400">Cards / hour today</span>
                    </div>

                    {/* 24-hour visual bar distribution */}
                    <div className="flex items-end gap-1 sm:gap-1.5 h-16 pt-2 border-b border-slate-100">
                      {hourlyActivity.map((count, hour) => {
                        const heightPercent = count > 0 ? Math.max(14, Math.round((count / maxHourlyCount) * 100)) : 4
                        const isPeak = count > 0 && count === maxHourlyCount
                        return (
                          <div
                            key={hour}
                            className="flex-1 flex flex-col items-center gap-1 group relative h-full justify-end cursor-pointer"
                            title={`${count} cards at ${hour}:00`}
                          >
                            <div className="absolute -top-6 hidden group-hover:flex items-center px-1.5 py-0.5 rounded bg-slate-900 text-white text-[8.5px] font-black z-20 whitespace-nowrap shadow-md pointer-events-none">
                              {hour}:00 • {count} cards
                            </div>
                            <div
                              style={{ height: `${heightPercent}%` }}
                              className={cn(
                                "w-full rounded-t-sm transition-all duration-200",
                                count === 0
                                  ? "bg-slate-100 group-hover:bg-slate-200"
                                  : isPeak
                                  ? "bg-gradient-to-t from-orange-500 to-amber-400 shadow-xs"
                                  : "bg-gradient-to-t from-indigo-500 to-purple-400 group-hover:brightness-110"
                              )}
                            />
                          </div>
                        )
                      })}
                    </div>

                    {/* Hour Axis Labels */}
                    <div className="flex items-center justify-between text-[8.5px] font-bold text-slate-400 px-0.5">
                      <span>00:00</span>
                      <span>06:00</span>
                      <span>12:00</span>
                      <span>18:00</span>
                      <span>23:00</span>
                    </div>
                  </div>

                  {/* ═══════════ TODAY'S SESSIONS TIMELINE ═══════════ */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-2xs flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <History className="w-4 h-4 text-indigo-600 stroke-[2.2]" />
                        <h3 className="text-xs sm:text-sm font-black text-slate-800">Today's Session Feed</h3>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400">
                        {sessions.length} {sessions.length === 1 ? 'session' : 'sessions'}
                      </span>
                    </div>

                    {sessions.length === 0 ? (
                      <div className="py-6 text-center flex flex-col items-center justify-center gap-2">
                        <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center text-xl shadow-xs">
                          🔥
                        </div>
                        <p className="text-xs font-black text-slate-700">No study sessions recorded yet today</p>
                        <p className="text-[10.5px] text-slate-400 font-medium max-w-xs">
                          Start a quick practice session or review your cards to ignite your daily streak!
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            if (navigator.vibrate) navigator.vibrate(6)
                            onClose()
                            if (onSwitchTab) onSwitchTab('roadmap')
                            else navigate('/decks')
                          }}
                          className="mt-1.5 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs shadow-md shadow-orange-500/20 active:scale-95 transition-all cursor-pointer"
                        >
                          <span>Start Learning Now</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {sessions.map((sess: any, idx: number) => {
                          const meta = MODE_META[sess.mode] || {
                            label: sess.mode,
                            emoji: '🎴',
                            color: 'text-slate-600',
                            badgeBg: 'bg-slate-100 text-slate-700 border-slate-200'
                          }

                          return (
                            <div
                              key={sess.attempt_id || idx}
                              onClick={() => {
                                if (sess.deck_id) {
                                  if (navigator.vibrate) navigator.vibrate(6)
                                  onClose()
                                  navigate(`/decks/${sess.deck_id}`)
                                }
                              }}
                              className="p-2.5 sm:p-3 rounded-xl border border-slate-100 hover:border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer active:scale-[0.99]"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-9 h-9 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center text-base shrink-0 overflow-hidden shadow-2xs">
                                  {sess.deck_cover ? (
                                    <img src={resolveMediaUrl(sess.deck_cover)} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <span>{meta.emoji}</span>
                                  )}
                                </div>

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-xs font-black text-slate-900 truncate max-w-[160px] sm:max-w-[220px]">
                                      {sess.deck_title}
                                    </span>
                                    <span className={cn(
                                      "px-1.5 py-0.2 rounded text-[9px] font-black border flex items-center gap-0.5 shrink-0",
                                      meta.badgeBg
                                    )}>
                                      <span>{meta.emoji}</span>
                                      <span>{meta.label}</span>
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2.5 text-[9.5px] font-bold text-slate-400 mt-0.5">
                                    <span>⏱️ {sess.started_at ? sess.started_at.slice(11, 16) : '--:--'}</span>
                                    <span>•</span>
                                    <span>{sess.time_spent > 0 ? `${Math.ceil(sess.time_spent / 60)}m` : '<1m'}</span>
                                    <span>•</span>
                                    <span>{sess.total_cards} cards</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center justify-between sm:justify-end gap-3 self-end sm:self-center border-t sm:border-t-0 pt-1 sm:pt-0 border-slate-100 w-full sm:w-auto">
                                <div className="text-left sm:text-right">
                                  <div className="text-xs font-black text-slate-800">
                                    {sess.score !== undefined ? `${sess.score}%` : `${sess.accuracy}%`}
                                  </div>
                                  <div className="text-[9px] font-bold text-slate-400">
                                    {sess.score !== undefined ? 'Score' : 'Accuracy'}
                                  </div>
                                </div>
                                <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* ═══════════ DECKS STUDIED & MODE BREAKDOWN ═══════════ */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-4">
                    {/* Decks Studied */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-2xs flex flex-col gap-2">
                      <div className="flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-orange-500" />
                        <h4 className="text-xs font-black text-slate-800">Decks Studied Today</h4>
                      </div>
                      {decksStudied.length === 0 ? (
                        <p className="text-[10px] text-slate-400 font-medium py-2">No decks studied yet</p>
                      ) : (
                        <div className="space-y-1.5">
                          {decksStudied.map((d: any) => (
                            <div
                              key={d.deck_id}
                              onClick={() => {
                                if (navigator.vibrate) navigator.vibrate(6)
                                onClose()
                                navigate(`/decks/${d.deck_id}`)
                              }}
                              className="flex items-center justify-between p-2 rounded-xl bg-slate-50 hover:bg-orange-50/50 transition-colors cursor-pointer text-left"
                            >
                              <span className="text-[11px] font-black text-slate-800 truncate max-w-[150px]">
                                {d.title}
                              </span>
                              <span className="text-[10px] font-bold text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200/60 tabular-nums">
                                {d.cards_count} cards
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Mode Breakdown */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-2xs flex flex-col gap-2">
                      <div className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-indigo-600" />
                        <h4 className="text-xs font-black text-slate-800">Learning Modes</h4>
                      </div>
                      {modeBreakdown.length === 0 ? (
                        <p className="text-[10px] text-slate-400 font-medium py-2">No mode activity recorded yet</p>
                      ) : (
                        <div className="space-y-1.5">
                          {modeBreakdown.map((m: any) => {
                            const meta = MODE_META[m.mode] || { emoji: '🎴', label: m.mode }
                            return (
                              <div
                                key={m.mode}
                                className="flex items-center justify-between p-2 rounded-xl bg-slate-50 text-left"
                              >
                                <span className="text-[11px] font-black text-slate-800 flex items-center gap-1.5 truncate">
                                  <span>{meta.emoji}</span>
                                  <span>{meta.label}</span>
                                </span>
                                <span className="text-[10px] font-bold text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200/60 tabular-nums">
                                  {m.sessions_count} {m.sessions_count === 1 ? 'sess' : 'sess'}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}

export default DashboardDailyDrawer
