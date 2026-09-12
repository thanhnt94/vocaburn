import React from 'react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { 
  Clock, 
  Layers, 
  Target, 
  Zap, 
  Flame, 
  Calendar, 
  ArrowRight, 
  CheckCircle2, 
  RotateCcw, 
  BookOpen, 
  Sparkles, 
  Award,
  ChevronRight,
  TrendingUp,
  Activity,
  History
} from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { resolveMediaUrl } from '@/components/common/MediaUrlInput'

interface DashboardDailySectionProps {
  navigate: (url: string) => void
  isDesktop?: boolean
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

export function DashboardDailySection({
  navigate,
  isDesktop = false,
  onSwitchTab
}: DashboardDailySectionProps) {
  const tzOffset = new Date().getTimezoneOffset()

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['daily-summary', tzOffset],
    queryFn: async () => {
      const res = await axios.get(`/api/v1/stats/daily-summary?tz_offset=${tzOffset}`)
      return res.data
    },
    staleTime: 15 * 1000,
    refetchInterval: 30 * 1000,
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

  // Max hourly card count for graph scaling
  const maxHourlyCount = Math.max(1, ...hourlyActivity)

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-9 h-9 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Syncing Today's Activity...</p>
      </div>
    )
  }

  return (
    <div className={cn(
      "flex-1 overflow-y-auto custom-scrollbar flex flex-col text-left select-none",
      isDesktop ? "p-6 gap-6" : "p-3 sm:p-4 gap-4 pb-20"
    )}>
      {/* ═══════════ TOP HEADER & DATE BANNER ═══════════ */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-orange-500 via-amber-500 to-rose-500 flex items-center justify-center text-white font-black text-xl shadow-md shadow-orange-500/20 shrink-0">
            📊
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">Today's Activity</h2>
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider",
                summary.streak_completed_today
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                  : "bg-amber-50 border-amber-200 text-amber-700"
              )}>
                {summary.streak_completed_today ? "🔥 Streak Active" : "⚡ In Progress"}
              </span>
            </div>
            <p className="text-xs font-bold text-slate-400 mt-0.5">
              {data?.date_str || new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Right side: Refresh & Sessions count */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            type="button"
            onClick={() => refetch()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-600 text-xs font-black transition-all active:scale-95 cursor-pointer"
            title="Refresh statistics"
          >
            <RotateCcw className={cn("w-3.5 h-3.5", isFetching && "animate-spin text-orange-500")} />
            <span className="text-[11px]">Refresh</span>
          </button>
        </div>
      </div>

      {/* ═══════════ 4 CORE METRIC HUD CARDS ═══════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
        {/* Card 1: Total Study Time */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Study Time</span>
            <span className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-black text-slate-900 tabular-nums">
                {summary.total_time_minutes > 0 ? summary.total_time_minutes : (summary.total_time_seconds > 0 ? Math.ceil(summary.total_time_seconds / 60) : 0)}
              </span>
              <span className="text-xs font-black text-slate-500">mins</span>
            </div>
            <p className="text-[10px] text-slate-400 font-bold truncate mt-0.5">
              {summary.first_session_time 
                ? `${summary.first_session_time} → ${summary.last_session_time || summary.first_session_time}`
                : 'No session yet'}
            </p>
          </div>
        </div>

        {/* Card 2: Cards Studied */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Cards Studied</span>
            <span className="w-7 h-7 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Layers className="w-3.5 h-3.5" />
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-black text-slate-900 tabular-nums">
                {summary.total_cards}
              </span>
              <span className="text-xs font-black text-slate-500">cards</span>
            </div>
            <p className="text-[10px] text-slate-400 font-bold truncate mt-0.5">
              +{summary.new_cards} new • {summary.reviewed_cards} review
            </p>
          </div>
        </div>

        {/* Card 3: Accuracy Rate */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Accuracy</span>
            <span className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Target className="w-3.5 h-3.5" />
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-black text-slate-900 tabular-nums">
                {summary.accuracy}%
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-bold truncate mt-0.5">
              {summary.correct_count} correct • {summary.wrong_count} wrong
            </p>
          </div>
        </div>

        {/* Card 4: XP & Points */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">XP Earned</span>
            <span className="w-7 h-7 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 fill-current" />
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-black text-orange-600 tabular-nums">
                +{summary.xp_earned}
              </span>
              <span className="text-xs font-black text-slate-500">XP</span>
            </div>
            <p className="text-[10px] text-slate-400 font-bold truncate mt-0.5">
              +{summary.points_earned} streak pts • {summary.total_sessions} sessions
            </p>
          </div>
        </div>
      </div>

      {/* ═══════════ HOURLY FOCUS HEATMAP (00:00 - 23:00) ═══════════ */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-orange-500" />
            <h3 className="text-xs sm:text-sm font-black text-slate-800">Hourly Study Pulse</h3>
          </div>
          <span className="text-[10px] font-bold text-slate-400">Cards per hour today</span>
        </div>

        {/* 24-hour visual bar distribution */}
        <div className="flex items-end gap-1 sm:gap-1.5 h-20 pt-3 border-b border-slate-100">
          {hourlyActivity.map((count, hour) => {
            const heightPercent = count > 0 ? Math.max(12, Math.round((count / maxHourlyCount) * 100)) : 4
            const isPeak = count > 0 && count === maxHourlyCount
            return (
              <div
                key={hour}
                className="flex-1 flex flex-col items-center gap-1 group relative h-full justify-end cursor-pointer"
                title={`${count} cards at ${hour}:00`}
              >
                {/* Tooltip on hover */}
                <div className="absolute -top-7 hidden group-hover:flex items-center px-1.5 py-0.5 rounded bg-slate-900 text-white text-[9px] font-black z-20 whitespace-nowrap shadow-md pointer-events-none">
                  {hour}:00 • {count} cards
                </div>

                <div
                  style={{ height: `${heightPercent}%` }}
                  className={cn(
                    "w-full rounded-t-sm transition-all duration-300",
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
        <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 px-0.5">
          <span>00:00</span>
          <span>06:00</span>
          <span>12:00</span>
          <span>18:00</span>
          <span>23:00</span>
        </div>
      </div>

      {/* ═══════════ TODAY'S SESSIONS TIMELINE ═══════════ */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col gap-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs sm:text-sm font-black text-slate-800">Today's Session Feed</h3>
          </div>
          <span className="text-[10px] font-bold text-slate-400">
            {sessions.length} {sessions.length === 1 ? 'session' : 'sessions'}
          </span>
        </div>

        {sessions.length === 0 ? (
          <div className="py-8 text-center flex flex-col items-center justify-center gap-2">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center text-2xl shadow-xs">
              🔥
            </div>
            <p className="text-xs font-black text-slate-700">No study sessions recorded yet today</p>
            <p className="text-[11px] text-slate-400 font-medium max-w-xs">
              Jump into your daily roadmap or start a quick practice session to ignite your streak!
            </p>
            <button
              type="button"
              onClick={() => {
                if (onSwitchTab) onSwitchTab('roadmap')
                else navigate('/decks')
              }}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs shadow-md shadow-orange-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <span>Start Learning Now</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
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
                  className="p-3 sm:p-3.5 rounded-2xl border border-slate-100 hover:border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Deck Cover or Emoji Avatar */}
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center text-lg shrink-0 overflow-hidden shadow-2xs">
                      {sess.deck_cover ? (
                        <img src={resolveMediaUrl(sess.deck_cover)} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span>{meta.emoji}</span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black text-slate-900 truncate">
                          {sess.deck_title}
                        </span>
                        <span className={cn(
                          "px-2 py-0.5 rounded-md text-[10px] font-black border flex items-center gap-1 shrink-0",
                          meta.badgeBg
                        )}>
                          <span>{meta.emoji}</span>
                          <span>{meta.label}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 mt-1">
                        <span className="text-slate-600 font-extrabold">{sess.started_at}</span>
                        {sess.duration_minutes > 0 && (
                          <span>• {sess.duration_minutes}m duration</span>
                        )}
                        <span>• {sess.total_cards} cards</span>
                        {sess.accuracy !== undefined && (
                          <span className={cn(
                            "font-extrabold",
                            sess.accuracy >= 80 ? "text-emerald-600" : "text-amber-600"
                          )}>
                            • {sess.accuracy}% acc
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: XP badge & Launch */}
                  <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/50">
                    <span className="text-xs font-black text-orange-600 bg-orange-50/80 border border-orange-200/60 px-2 py-0.5 rounded-lg">
                      +{sess.xp_earned || 15} XP
                    </span>

                    <button
                      type="button"
                      onClick={() => navigate(`/decks/${sess.deck_id}`)}
                      className="p-1.5 rounded-xl hover:bg-white text-slate-400 hover:text-slate-800 transition-colors cursor-pointer"
                      title="Open deck"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ═══════════ DECKS STUDIED & MODE BREAKDOWN GRID ═══════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* Decks Studied Today */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-purple-600" />
            <h3 className="text-xs sm:text-sm font-black text-slate-800">Decks Studied Today</h3>
          </div>

          {decksStudied.length === 0 ? (
            <p className="text-xs text-slate-400 font-bold py-4 text-center">No decks studied yet today</p>
          ) : (
            <div className="space-y-2">
              {decksStudied.map((d: any) => (
                <div
                  key={d.deck_id}
                  onClick={() => navigate(`/decks/${d.deck_id}`)}
                  className="p-2.5 rounded-2xl border border-slate-100 hover:border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition-all flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center text-sm shrink-0 overflow-hidden shadow-2xs">
                      {d.deck_cover ? (
                        <img src={resolveMediaUrl(d.deck_cover)} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span>🎴</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className="block text-xs font-black text-slate-800 truncate group-hover:text-orange-600 transition-colors">
                        {d.deck_title}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {d.cards_count} cards • {d.accuracy}% acc • {d.study_minutes}m
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mode Breakdown */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs sm:text-sm font-black text-slate-800">Learning Mode Breakdown</h3>
          </div>

          {modeBreakdown.length === 0 ? (
            <p className="text-xs text-slate-400 font-bold py-4 text-center">No mode activity recorded yet</p>
          ) : (
            <div className="space-y-2">
              {modeBreakdown.map((m: any) => {
                const meta = MODE_META[m.mode] || {
                  label: m.mode,
                  emoji: '🎴',
                  badgeBg: 'bg-slate-100 text-slate-700'
                }
                return (
                  <div
                    key={m.mode}
                    className="p-2.5 rounded-2xl border border-slate-100 bg-slate-50/60 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base">{meta.emoji}</span>
                      <div className="min-w-0">
                        <span className="block text-xs font-black text-slate-800 truncate">{meta.label}</span>
                        <span className="text-[10px] font-bold text-slate-400">
                          {m.cards} cards • {m.study_minutes}m • {m.accuracy}% accuracy
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-black text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-lg shrink-0">
                      {m.cards}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ═══════════ ROADMAP GOALS COMPLETED TODAY ═══════════ */}
      {roadmapGoals.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <h3 className="text-xs sm:text-sm font-black text-slate-800">Today's Roadmap Goal Completion</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {roadmapGoals.map((g: any) => (
              <div
                key={g.goal_id}
                className={cn(
                  "p-3 rounded-2xl border transition-all flex items-center justify-between",
                  g.is_target_met
                    ? "bg-emerald-50/60 border-emerald-200/80 text-emerald-900"
                    : "bg-slate-50/60 border-slate-200/80 text-slate-800"
                )}
              >
                <div className="min-w-0 flex-1">
                  <span className="block text-xs font-black truncate">{g.deck_title}</span>
                  <span className="text-[10px] font-bold text-slate-400 mt-0.5 block">
                    {g.done_today} / {g.target} new words completed
                  </span>
                </div>
                {g.is_target_met ? (
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <CheckCircle2 className="w-4 h-4" />
                  </span>
                ) : (
                  <span className="text-[10px] font-black text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg shrink-0">
                    In Progress
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default DashboardDailySection
