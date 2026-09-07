import React, { useState, useEffect, useMemo, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Brain, Trophy, ChevronRight, LayoutGrid, Users, Zap, Flame, BrainCircuit, X, Play, Crown, Medal, Star, CheckCircle2, Circle, Swords, Settings, Target, RefreshCw, User, BookOpen, Sparkles, TrendingUp, Clock, Layers, Compass, ArrowRight, FileText, RotateCcw, Search, Plus, ArrowDown, Calendar, Keyboard, Volume2, SlidersHorizontal } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import DailyComparisonChart from '@/components/DailyComparisonChart'
import { VocaburnLogo } from '@/components/VocaburnLogo'
import { JoinRoomModal } from '@/components/dashboard/JoinRoomModal'
import { PracticeModeModal } from '@/components/dashboard/PracticeModeModal'
import { StudyModeModal } from '@/components/dashboard/StudyModeModal'
import { DashboardRoadmapSection } from '@/components/dashboard/DashboardRoadmapSection'
import { DashboardQuickDecksWidget } from '@/components/dashboard/DashboardQuickDecksWidget'
import { HomeCustomizeModal } from '@/components/dashboard/HomeCustomizeModal'



interface ActiveGoal {
  goal_id: number
  deck_id: number
  quiz_id: number
  deck_title: string
  quiz_title: string
  cover_image: string | null
  total_cards: number
  total_questions: number
  total_learned: number
  daily_target: number
  daily_time_target: number
  daily_card_target: number
  daily_new_card_target: number
  actual_time_minutes: number
  actual_cards_completed: number
  actual_new_cards_completed: number
  done_today: number
  is_target_met: boolean
  streak_count: number
  days_remaining_est: number
}

interface DashboardData {
  user: { id: number, username: string, email: string }
  gamify: { level: number, xp: number, streak: number }
  stats_summary: { avg_accuracy: number, total_time_hours: number, total_questions: number }
  my_decks?: any[]
  created_decks?: any[]
  discover_decks?: any[]
}

interface HeatmapDay {
  date: string
  count: number
}

interface LeaderboardEntry {
  rank: number
  user_id: number
  username: string
  xp: number
  level: number
  streak: number
  is_current_user: boolean
  out_of_top_10?: boolean
  active_status?: string
  active_text?: string
}

interface Challenge {
  id: string
  title: string
  description: string
  emoji: string
  reward_xp: number
  target_value: number
  current_value: number
  is_completed: boolean
  detail: string
}

interface ForecastHour {
  hour: number
  label: string
  count: number
  cumulative: number
}

interface ForecastDay {
  day_index: number
  date: string
  label: string
  count: number
  cumulative: number
}

interface ForecastWeek {
  week_index: number
  label: string
  range: string
  count: number
  cumulative: number
}

interface ForecastResponse {
  hourly: ForecastHour[]
  daily: ForecastDay[]
  weekly: ForecastWeek[]
}

// ─── FSRS Review Forecast ──────────────────────────────────────────────────────
function ReviewForecastWidget({ data }: { data: ForecastResponse | undefined }) {
  const [viewMode, setViewMode] = useState<'hourly' | 'daily' | 'weekly'>('daily')
  const [daysRange, setDaysRange] = useState<7 | 14 | 30>(14)

  const chartData = useMemo<any[]>(() => {
    if (!data) return []
    if (viewMode === 'hourly') return data.hourly
    if (viewMode === 'weekly') return data.weekly
    return data.daily.slice(0, daysRange)
  }, [data, viewMode, daysRange])

  if (!data || !data.daily || data.daily.length === 0) {
    return (
      <div className="bg-white border border-slate-200/60 rounded-[2.5rem] p-6 shadow-sm flex flex-col items-center justify-center text-center h-48">
        <TrendingUp className="w-8 h-8 text-slate-350 animate-pulse mb-3" />
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Calculating review forecast data...</span>
      </div>
    )
  }

  const todayCount = viewMode === 'hourly' 
    ? (data.daily[0]?.count || 0) 
    : viewMode === 'daily' 
      ? (data.daily[0]?.count || 0) 
      : (data.weekly[0]?.count || 0)

  const maxCumulative = chartData.length > 0 
    ? chartData[chartData.length - 1]?.cumulative 
    : 0

  return (
    <div className="bg-white border border-slate-200/60 rounded-[2.5rem] p-6 shadow-sm flex flex-col gap-4 text-left relative overflow-hidden flex-shrink-0">
      <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full bg-orange-50/20 blur-md pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col gap-3 pb-3 border-b border-slate-100/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500 shadow-sm shadow-orange-100">
              <TrendingUp className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-widest italic leading-none">FSRS Review Forecast</h3>
              <p className="text-[9px] font-bold text-slate-400 mt-1">Expected review cards</p>
            </div>
          </div>

          {/* View Mode Tabs */}
          <div className="flex items-center bg-slate-50 p-1 rounded-xl border border-slate-100 self-start sm:self-auto">
            {(['hourly', 'daily', 'weekly'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={cn(
                  "px-2 sm:px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all cursor-pointer",
                  viewMode === mode
                    ? "bg-white text-orange-600 shadow-sm border border-slate-100/50"
                    : "text-slate-400 hover:text-slate-600"
                )}
              >
                {mode === 'hourly' ? 'Hour' : mode === 'daily' ? 'Day' : 'Week'}
              </button>
            ))}
          </div>
        </div>

        {/* Range Selector removed per request */}
      </div>

      {/* Stats summary banner */}
      <div className="grid grid-cols-2 gap-3 bg-gradient-to-r from-orange-50/50 to-indigo-50/30 p-3 rounded-2xl border border-slate-100">
        <div className="flex flex-col">
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider">
            {viewMode === 'hourly' ? "Due today" : viewMode === 'daily' ? "Due today" : "Due this week"}
          </span>
          <span className="text-sm font-black text-orange-600 mt-0.5">{todayCount} cards</span>
        </div>
        <div className="flex flex-col border-l border-slate-100 pl-3">
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider">
            {viewMode === 'hourly' ? "24h Cumulative" : viewMode === 'daily' ? `${daysRange}-day Cumulative` : "4-week Cumulative"}
          </span>
          <span className="text-sm font-black text-indigo-600 mt-0.5">{maxCumulative} cards</span>
        </div>
      </div>

      {/* Chart container */}
      <div className="h-[220px] w-full mt-2 -ml-6 pr-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData}>
            <defs>
              <linearGradient id="forecastBarGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f97316" stopOpacity={0.95} />
                <stop offset="100%" stopColor="#ea580c" stopOpacity={0.3} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 8, fontWeight: 900, fill: '#94a3b8' }}
            />
            {/* Dual Y-Axes */}
            <YAxis
              yAxisId="left"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 8, fontWeight: 900, fill: '#f97316' }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 8, fontWeight: 900, fill: '#6366f1' }}
            />
            <Tooltip
              content={({ active, payload }: any) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload
                  let titleStr = d.date || ""
                  if (viewMode === 'hourly') {
                    titleStr = `Giờ ${d.label} (UTC Today)`
                  } else if (viewMode === 'weekly') {
                    titleStr = `${d.label} (${d.range})`
                  }
                  return (
                    <div className="bg-slate-900 text-white p-3 rounded-2xl border border-slate-800 text-[10px] font-black uppercase tracking-wider shadow-xl flex flex-col gap-1.5">
                      <p className="text-slate-400 font-bold border-b border-slate-800 pb-1">{titleStr}</p>
                      <p className="text-orange-400">Đến hạn: <span className="text-white font-extrabold">{d.count} thẻ</span></p>
                      <p className="text-indigo-400">Tích lũy: <span className="text-white font-extrabold">{d.cumulative} thẻ</span></p>
                    </div>
                  )
                }
                return null
              }}
              cursor={{ fill: '#f8fafc' }}
            />
            {/* Bar for review count on Left axis */}
            <Bar
              yAxisId="left"
              dataKey="count"
              fill="url(#forecastBarGrad)"
              radius={[4, 4, 0, 0]}
              barSize={viewMode === 'hourly' ? 6 : viewMode === 'weekly' ? 32 : 16}
            />
            {/* Line for Cumulative reviews on Right axis */}
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="cumulative"
              stroke="#6366f1"
              strokeWidth={2}
              dot={{ r: 2, stroke: '#6366f1', strokeWidth: 1, fill: '#fff' }}
              activeDot={{ r: 4, stroke: '#6366f1', strokeWidth: 2, fill: '#fff' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ─── Mini Contribution Heatmap ────────────────────────────────────────────────
function MiniHeatmap({ data }: { data: HeatmapDay[] }) {
  const WEEKS = 15 // show 15 weeks = ~3.5 months
  const today = new Date()
  // Build a day map for O(1) lookup
  const dayMap = useMemo(() => {
    const m: Record<string, number> = {}
    data.forEach(d => { m[d.date] = d.count })
    return m
  }, [data])

  // Build grid: weeks columns (oldest left), 7 rows (Mon→Sun)
  const cells: { date: string; count: number }[][] = useMemo(() => {
    const cols: { date: string; count: number }[][] = []
    // Start from (WEEKS * 7) days ago, rounded to Monday of that week
    const startDate = new Date(today)
    startDate.setDate(startDate.getDate() - (WEEKS * 7 - 1))
    // Align to Sunday
    const dayOfWeek = startDate.getDay()
    startDate.setDate(startDate.getDate() - dayOfWeek)

    for (let w = 0; w < WEEKS; w++) {
      const weekCells: { date: string; count: number }[] = []
      for (let d = 0; d < 7; d++) {
        const cell = new Date(startDate)
        cell.setDate(startDate.getDate() + w * 7 + d)
        const ds = cell.toISOString().split('T')[0]
        weekCells.push({ date: ds, count: dayMap[ds] || 0 })
      }
      cols.push(weekCells)
    }
    return cols
  }, [dayMap])

  const getColor = (count: number) => {
    if (count === 0) return 'bg-slate-100'
    if (count < 5) return 'bg-indigo-200'
    if (count < 15) return 'bg-indigo-400'
    if (count < 30) return 'bg-indigo-600'
    return 'bg-indigo-800'
  }

  const totalThisMonth = useMemo(() => {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    return data.filter(d => d.date >= monthStart).reduce((sum, d) => sum + d.count, 0)
  }, [data])

  return (
    <div className="bg-white border border-slate-200/60 rounded-[2rem] p-5 shadow-sm flex flex-col gap-3 text-left flex-shrink-0">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Study History</span>
        <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
          {totalThisMonth} cards this month
        </span>
      </div>
      <div className="flex justify-center gap-[3px] py-2 overflow-x-auto scrollbar-none">
        {cells.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((cell, di) => (
              <div
                key={di}
                title={`${cell.date}: ${cell.count} cards`}
                className={cn(
                  'w-3 h-3 rounded-[3px] transition-all hover:scale-125 cursor-default',
                  getColor(cell.count)
                )}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-center gap-1.5 mt-0.5 border-t border-slate-50 pt-2.5">
        <span className="text-[8px] font-bold text-slate-400">Less</span>
        {['bg-slate-100', 'bg-indigo-200', 'bg-indigo-400', 'bg-indigo-600', 'bg-indigo-800'].map((c, i) => (
          <div key={i} className={cn('w-2.5 h-2.5 rounded-[2px]', c)} />
        ))}
        <span className="text-[8px] font-bold text-slate-400">More</span>
      </div>
    </div>
  )
}

// ─── Leaderboard Widget ────────────────────────────────────────────────────────
// ─── Ultra-Modern App Leaderboard Widget ───────────────────────────────────────
// ─── Luxury Minimalist Leaderboard Widget (White & Flame Gold) ──────────────────
export type LeaderboardCategory = 'xp' | 'streak' | 'questions' | 'time'
export type LeaderboardTimeFilter = 'today' | 'week' | 'month' | 'all_time'

// ─── Ultra-Modern App Leaderboard Widget (Matching Stats Leaderboard) ───────────
function LeaderboardWidget({ 
  data, 
  activeFilter, 
  onFilterChange 
}: { 
  data: any, 
  activeFilter: LeaderboardTimeFilter, 
  onFilterChange: (f: LeaderboardTimeFilter) => void 
}) {
  const [activeCategory, setActiveCategory] = useState<LeaderboardCategory>('xp')

  const formatStudyTime = (seconds: number): string => {
    if (!seconds || seconds <= 0) return '0m'
    const totalMinutes = Math.floor(seconds / 60)
    if (totalMinutes < 60) {
      return totalMinutes === 0 ? `${seconds}s` : `${totalMinutes}m`
    }
    const hours = Math.floor(totalMinutes / 60)
    const remainingMinutes = totalMinutes % 60
    if (remainingMinutes === 0) {
      return `${hours}h`
    }
    return `${hours}h ${remainingMinutes}m`
  }

  const categoryMeta: Record<LeaderboardCategory, { label: string, icon: any, unit: string }> = {
    xp: { label: 'XP', icon: Zap, unit: 'XP' },
    streak: { label: 'Streak', icon: Flame, unit: 'days' },
    questions: { label: 'Cards', icon: Target, unit: 'cards' },
    time: { label: 'Time', icon: Clock, unit: '' }
  }

  // Handle both data formats (Stats format: data[category] = { list, user_rank, user_value } or legacy fallback)
  const categoryData = data?.[activeCategory] || (
    activeCategory === 'xp'
      ? { list: data?.leaderboard || [], user_rank: data?.current_user_rank, user_value: 0 }
      : activeCategory === 'time'
        ? { list: data?.time_leaderboard || [], user_rank: data?.current_user_time_rank, user_value: 0 }
        : activeCategory === 'questions'
          ? { list: data?.cards_leaderboard || [], user_rank: data?.current_user_cards_rank, user_value: 0 }
          : { list: data?.new_cards_leaderboard || [], user_rank: data?.current_user_new_cards_rank, user_value: 0 }
  )

  const currentList = categoryData.list || []
  const userRank = categoryData.user_rank
  const userValue = categoryData.user_value

  return (
    <div className="bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-3xl p-3.5 shadow-xs flex flex-col gap-2.5 text-left flex-shrink-0">
      
      {/* Header & Controls */}
      <div className="flex flex-col gap-2.5 pb-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-500 shadow-2xs">
            <Trophy className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-xs font-black text-slate-800 tracking-tight">
            Leaderboard
          </h3>
        </div>

        {/* Row 1: Metric Switcher Segmented Control (XP, Streak, Cards, Time) - Full Width */}
        <div className="grid grid-cols-4 bg-slate-100/90 p-1 rounded-xl border border-slate-200/50 gap-1 w-full">
          {(['xp', 'streak', 'questions', 'time'] as const).map(cat => {
            const meta = categoryMeta[cat]
            const Icon = meta.icon
            const isActive = activeCategory === cat
            return (
              <button
                key={cat}
                onClick={() => {
                  if (navigator.vibrate) navigator.vibrate(6)
                  setActiveCategory(cat)
                }}
                className={cn(
                  "flex items-center justify-center gap-1 py-1 rounded-lg text-[9.5px] font-black transition-all cursor-pointer",
                  isActive
                    ? "bg-white text-orange-600 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                )}
                title={meta.label}
              >
                <Icon className="w-2.5 h-2.5 shrink-0" />
                <span>{meta.label}</span>
              </button>
            )
          })}
        </div>

        {/* Row 2: Time Filters Pills (Today, Week, Month, All Time) - Full Width */}
        <div className="grid grid-cols-4 bg-slate-50/90 p-1 rounded-xl border border-slate-100 gap-1 w-full">
          {[
            { id: 'today', label: 'Today' },
            { id: 'week', label: 'Week' },
            { id: 'month', label: 'Month' },
            { id: 'all_time', label: 'All Time' }
          ].map(filter => (
            <button
              key={filter.id}
              onClick={() => {
                if (navigator.vibrate) navigator.vibrate(6)
                onFilterChange(filter.id as LeaderboardTimeFilter)
              }}
              className={cn(
                "text-center py-1 rounded-lg text-[9.5px] font-bold transition-all cursor-pointer",
                activeFilter === filter.id
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "text-slate-500 hover:bg-white hover:text-slate-800"
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* 🌟 Your Rank Banner */}
      {userRank && userRank > 0 && (
        <div className="bg-slate-900 rounded-2xl px-3 py-1.5 text-white border border-slate-800 shadow-xs flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Your Rank:</span>
            <span className="text-xs font-black text-amber-400 leading-none">#{userRank}</span>
          </div>
          {userValue !== undefined && userValue > 0 && (
            <span className="text-[10px] font-black text-amber-300">
              {activeCategory === 'time' ? formatStudyTime(userValue) : `${userValue.toLocaleString()} ${categoryMeta[activeCategory].unit}`}
            </span>
          )}
        </div>
      )}

      {/* User Rank List (Natural Unconstrained Height with Presence Indicators) */}
      <div className="flex flex-col gap-1.5">
        {currentList.map((entry: any) => {
          const isRank1 = entry.rank === 1
          const isRank2 = entry.rank === 2
          const isRank3 = entry.rank === 3
          const isCurrentUser = entry.is_current_user || entry.user_id === data?.current_user_id
          const displayName = entry.full_name || entry.username || 'User'
          const val = entry.value !== undefined ? entry.value : (activeCategory === 'xp' ? entry.xp : activeCategory === 'time' ? entry.total_time : entry.total_cards || 0)

          return (
            <div
              key={entry.user_id}
              className={cn(
                'flex items-center gap-2 px-2.5 py-1.5 rounded-2xl border transition-all relative overflow-hidden',
                isCurrentUser
                  ? 'bg-amber-50/80 border-amber-300 shadow-xs ring-1 ring-amber-400/30'
                  : isRank1
                    ? 'bg-amber-50/40 border-amber-200/60 shadow-2xs'
                    : isRank2
                      ? 'bg-slate-50/70 border-slate-200/60'
                      : isRank3
                        ? 'bg-amber-900/5 border-amber-900/10'
                        : 'bg-white border-slate-100 hover:border-slate-200'
              )}
            >
              {/* Rank Icon Badge */}
              <div className="w-5 h-5 rounded-lg flex items-center justify-center font-black shrink-0 text-xs">
                {isRank1 ? (
                  <span className="text-sm">👑</span>
                ) : isRank2 ? (
                  <span className="text-sm">🥈</span>
                ) : isRank3 ? (
                  <span className="text-sm">🥉</span>
                ) : (
                  <span className="text-[10px] font-bold text-slate-400">#{entry.rank}</span>
                )}
              </div>

              {/* Avatar Circle with Presence Dot */}
              <div className="relative shrink-0">
                <div className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 shadow-2xs',
                  isCurrentUser
                    ? 'bg-amber-500 text-white'
                    : isRank1
                      ? 'bg-amber-400 text-white'
                      : isRank2
                        ? 'bg-slate-300 text-slate-700'
                        : isRank3
                          ? 'bg-amber-700 text-white'
                          : 'bg-slate-200 text-slate-600'
                )}>
                  {displayName.slice(0, 2).toUpperCase()}
                </div>
                {/* Active Status Badge Dot */}
                <span
                  className={cn(
                    "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white shadow-2xs flex items-center justify-center",
                    entry.active_status === 'online'
                      ? "bg-emerald-500"
                      : entry.active_status === 'away'
                        ? "bg-amber-400"
                        : "bg-slate-300"
                  )}
                  title={entry.active_text || (entry.active_status === 'online' ? 'Active now' : entry.active_status === 'away' ? 'Away' : 'Offline')}
                >
                  {entry.active_status === 'online' && (
                    <span className="w-full h-full rounded-full bg-emerald-400 animate-ping opacity-75" />
                  )}
                </span>
              </div>

              {/* User Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className={cn(
                    'text-xs font-bold truncate',
                    isCurrentUser ? 'text-amber-950' : 'text-slate-800'
                  )}>
                    {displayName}
                  </span>
                  {isCurrentUser && (
                    <span className="text-[7px] font-black px-1.5 py-0.2 bg-amber-500 text-white rounded-full uppercase tracking-wider">
                      You
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-[9px] font-semibold text-slate-400">
                    Lv {entry.level || 1}
                  </span>
                  <span className="text-slate-300 text-[8px]">•</span>
                  <span className={cn(
                    "text-[8px] font-bold tracking-tight",
                    entry.active_status === 'online'
                      ? "text-emerald-600 font-bold"
                      : entry.active_status === 'away'
                        ? "text-amber-600"
                        : "text-slate-400"
                  )}>
                    {entry.active_status === 'online' ? 'Online' : entry.active_text || 'Offline'}
                  </span>
                </div>
              </div>

              {/* Value Badge */}
              <div className="shrink-0 text-right">
                <span className={cn(
                  'text-xs font-black block leading-tight',
                  isRank1 ? 'text-amber-600' : isCurrentUser ? 'text-amber-600' : 'text-slate-800'
                )}>
                  {activeCategory === 'time'
                    ? formatStudyTime(val)
                    : `${val.toLocaleString()} ${categoryMeta[activeCategory].unit}`}
                </span>
              </div>
            </div>
          )
        })}
        
        {currentList.length === 0 && (
          <div className="py-4 text-center text-xs font-medium text-slate-400">
            No leaderboard data for this period.
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Luxury Minimalist Badge Achievements Widget ───────────────────────────────
interface BadgeProgress {
  id: string
  name: string
  description: string
  icon: string
  criteria_type: string
  target_value: number
  current_value: number
  percentage: number
}

function BadgeProgressWidget({ data }: { data: BadgeProgress[] }) {
  const iconsMap: Record<string, React.ComponentType<any>> = {
    Zap: Zap,
    Flame: Flame,
    Award: Trophy,
    CheckCircle2: CheckCircle2,
    Activity: Zap,
    Target: Trophy,
    Trophy: Trophy
  }

  return (
    <div className="bg-white border border-neutral-100 rounded-3xl p-4 shadow-[0_4px_25px_rgba(0,0,0,0.03)] flex flex-col gap-3 text-left flex-shrink-0">
      <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-amber-50 border border-amber-200/50 flex items-center justify-center text-amber-500 shadow-2xs">
            <Trophy className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-800 block">Thành Tích Đạt Được</span>
            <span className="text-[9px] font-medium text-neutral-400 block mt-0.5">Tiến trình huy hiệu của bạn</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {data.map(badge => {
          const IconComponent = iconsMap[badge.icon] || Trophy;
          const isComplete = badge.percentage >= 100;

          return (
            <div key={badge.id} className="flex items-center gap-3 p-3 rounded-2xl border border-neutral-100 bg-neutral-50/50 transition-all">
              <div className={cn(
                "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs",
                isComplete 
                  ? "bg-amber-500 text-white shadow-amber-200" 
                  : "bg-amber-50 border border-amber-100 text-amber-600"
              )}>
                <IconComponent className="w-4.5 h-4.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-800 truncate">{badge.name}</span>
                  <span className="text-[10px] font-bold text-amber-600">{badge.percentage}%</span>
                </div>
                <p className="text-[10px] font-medium text-neutral-400 truncate mt-0.5">{badge.description}</p>
                <div className="h-1.5 bg-neutral-200/60 rounded-full mt-2 overflow-hidden w-full relative">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-700"
                    style={{ width: `${badge.percentage}%` }}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
function TodayFocusWidget({
  roadmapDecks,
  onStartPractice,
  navigate
}: {
  roadmapDecks: any[] | undefined;
  onStartPractice: (quiz: any) => void;
  navigate: any;
}) {
  const hasRoadmaps = roadmapDecks && roadmapDecks.length > 0;

  return (
    <div className={cn(
      "rounded-[2rem] p-5 md:p-6 text-left mb-2 flex-shrink-0 transition-all duration-700 bg-white shadow-sm border border-slate-100",
      hasRoadmaps ? "shadow-[0_20px_50px_rgba(99,102,241,0.02)]" : ""
    )}>
      {!hasRoadmaps ? (
        <div className="text-center py-10 bg-slate-50/50 rounded-[2rem] border border-dashed border-slate-200/80">
          <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center mx-auto mb-3 text-indigo-500 shadow-inner">
            <Compass className="w-6 h-6 animate-pulse" />
          </div>
          <span className="text-xs font-black text-slate-700 block uppercase tracking-wider">Bạn chưa kích hoạt Lộ trình học nào.</span>
          <p className="text-[10px] text-slate-400 mt-2 max-w-xs mx-auto font-bold uppercase tracking-wider leading-relaxed">Hãy chọn một bộ thẻ từ thư viện và bật "Lộ trình học" để hệ thống tự động thiết lập mục tiêu hàng ngày cho bạn.</p>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/decks?tab=library')}
            className="mt-4 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-750 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-md shadow-indigo-100 transition-all cursor-pointer"
          >
            📚 Đi tới Thư viện
          </motion.button>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {roadmapDecks.map((deck) => {
            const status = deck.status || {};
            const newTarget = status.new_target_today || 0;
            const newLearned = status.new_learned_today || 0;
            const reviewDue = status.review_due_today || 0;
            const reviewDone = status.review_completed_today || 0;

            const totalTasks = newTarget + reviewDue;
            const totalDone = newLearned + reviewDone;
            const percentComplete = totalTasks > 0 ? Math.min(100, Math.round((totalDone / totalTasks) * 100)) : (status.all_done ? 100 : 0);
            const isStage1Done = status.stage_1_done;
            const isStage2Done = status.stage_2_done;
            const nextActionUrl = status.next_action_url;
            const streak = status.streak || deck.streak || 0;

            const radius = 28;
            const strokeWidth = 5;
            const circumference = 2 * Math.PI * radius;
            const strokeDashoffset = circumference - (circumference * percentComplete) / 100;

            return (
              <div key={deck.deck_id} className="bg-white rounded-[2rem] p-5 border border-slate-100 shadow-sm relative overflow-hidden flex flex-col justify-between space-y-4 hover:shadow-md transition-all">
                <div className="space-y-3.5">
                  {/* Header Badge */}
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-orange-50 text-orange-600 border border-orange-100/60 flex items-center gap-1.5 shadow-2xs">
                      🎯 TIẾN ĐỘ LỘ TRÌNH
                    </span>
                    {streak > 0 && (
                      <span className="text-[9px] font-black text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-100/60 flex items-center gap-1">
                        🔥 {streak}d
                      </span>
                    )}
                  </div>

                  {/* Circle Ring & Deck Stats */}
                  <div className="flex items-center gap-4">
                    {/* SVG Circle Progress */}
                    <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="32" cy="32" r={radius} fill="transparent" stroke="#f1f5f9" strokeWidth={strokeWidth} />
                        <circle
                          cx="32"
                          cy="32"
                          r={radius}
                          fill="transparent"
                          stroke="#6366f1"
                          strokeWidth={strokeWidth}
                          strokeDasharray={circumference}
                          strokeDashoffset={strokeDashoffset}
                          strokeLinecap="round"
                          className="transition-all duration-700 ease-out"
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center justify-center text-center">
                        <span className="text-xs font-black text-slate-800 tracking-tight">{percentComplete}%</span>
                      </div>
                    </div>

                    {/* Deck Title & Details */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xs md:text-sm font-black text-slate-900 truncate leading-snug">
                        {deck.title}
                      </h3>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 font-bold mt-1 flex-wrap">
                        <span>Học mới: <span className="text-orange-600 font-black">{newLearned}/{newTarget}</span></span>
                        <span className="text-slate-300">·</span>
                        <span>Ôn tập: <span className="text-orange-600 font-black">{reviewDone}/{reviewDue}</span></span>
                      </div>

                      {/* Step Badges with Direct Click Jumping */}
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/flashcard/${deck.deck_id}/play?mode=roadmap`);
                          }}
                          className={cn(
                            "text-[9px] font-black px-2.5 py-1 rounded-xl flex items-center gap-1 transition-all cursor-pointer shadow-2xs active:scale-95",
                            isStage1Done 
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100" 
                              : "bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100"
                          )}
                          title="Bước 1: Học từ mới & Ôn tập FSRS"
                        >
                          {isStage1Done ? "✓ Bước 1: Đạt chỉ tiêu" : "▶ Bước 1: Học từ mới"}
                        </button>
                        {status.has_stage_2 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/practice/${deck.deck_id}/mcq?mode=roadmap_test`);
                            }}
                            className={cn(
                              "text-[9px] font-black px-2.5 py-1 rounded-xl flex items-center gap-1 transition-all cursor-pointer shadow-2xs active:scale-95",
                              isStage2Done 
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100" 
                                : isStage1Done 
                                ? "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 animate-pulse" 
                                : "bg-slate-50 text-slate-400 border border-slate-200 opacity-80"
                            )}
                            title="Bước 2: Bài test kiểm tra lộ trình"
                          >
                            {isStage2Done ? "✓ Bước 2: Đã đạt bài test" : "▶ Bước 2: Bài test"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Row: Main CTA + Quick Detail Link */}
                <div className="flex items-center gap-2 mt-1">
                  <button
                    onClick={() => {
                      if (nextActionUrl) {
                        navigate(nextActionUrl);
                      } else {
                        navigate(`/decks/${deck.deck_id}`);
                      }
                    }}
                    className="flex-1 py-3 px-5 bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-orange-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current shrink-0" />
                    <span className="truncate">
                      {status.all_done
                        ? '✓ HOÀN THÀNH LỘ TRÌNH HÔM NAY'
                        : isStage1Done
                        ? 'BẮT ĐẦU BÀI TEST LỘ TRÌNH'
                        : 'BẮT ĐẦU HỌC LỘ TRÌNH'}
                    </span>
                  </button>
                  <button
                    onClick={() => navigate(`/decks/${deck.deck_id}`)}
                    className="py-3 px-4 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-800 font-black text-xs uppercase tracking-wider rounded-2xl border border-slate-200/80 transition-all active:scale-[0.98] cursor-pointer shrink-0"
                    title="Xem chi tiết bộ thẻ"
                  >
                    Chi tiết
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function GoalSettingsModal({
  isOpen,
  onClose,
  initialTime,
  initialCard,
  initialNewCard,
  onSave
}: {
  isOpen: boolean;
  onClose: () => void;
  initialTime: number;
  initialCard: number;
  initialNewCard: number;
  onSave: (time: number, card: number, newCard: number) => Promise<void>;
}) {
  const [timeTarget, setTimeTarget] = useState(initialTime)
  const [cardTarget, setCardTarget] = useState(initialCard)
  const [newCardTarget, setNewCardTarget] = useState(initialNewCard)
  const [isSaving, setIsSaving] = useState(false)

  const timePresets = [10, 20, 30, 60]
  const cardPresets = [10, 20, 30, 50]

  useEffect(() => {
    if (isOpen) {
      setTimeTarget(initialTime)
      setCardTarget(initialCard)
      setNewCardTarget(initialNewCard)
    }
  }, [isOpen, initialTime, initialCard, initialNewCard])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave(timeTarget, cardTarget, newCardTarget)
      onClose()
    } catch (e) {
      alert("Lỗi khi lưu mục tiêu")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl relative z-10 p-8 border border-slate-100 text-left"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Learning Goal Settings</h3>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Time Goal */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Daily Study Time Target (mins/day)</label>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {timePresets.map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setTimeTarget(preset)}
                      className={cn(
                        "py-2.5 rounded-xl text-[10px] font-black tracking-wider transition-all border",
                        timeTarget === preset
                          ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      )}
                    >
                      {preset}m
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min="1"
                  max="480"
                  value={timeTarget}
                  onChange={(e) => setTimeTarget(Math.max(1, parseInt(e.target.value) || 0))}
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-bold text-slate-750 focus:border-indigo-500 focus:bg-white outline-none transition-all"
                  placeholder="Custom minutes..."
                />
              </div>

              {/* Card Goal */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Daily Total Cards Target (cards/day)</label>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {cardPresets.map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setCardTarget(preset)}
                      className={cn(
                        "py-2.5 rounded-xl text-[10px] font-black tracking-wider transition-all border",
                        cardTarget === preset
                          ? "bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-100"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      )}
                    >
                      {preset} Cards
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={cardTarget}
                  onChange={(e) => setCardTarget(Math.max(1, parseInt(e.target.value) || 0))}
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-bold text-slate-750 focus:border-indigo-500 focus:bg-white outline-none transition-all"
                  placeholder="Custom cards count..."
                />
              </div>

              {/* New Card Goal */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Daily New Cards Target (cards/day)</label>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {cardPresets.map(preset => (
                    <button
                      key={`new-${preset}`}
                      type="button"
                      onClick={() => setNewCardTarget(preset)}
                      className={cn(
                        "py-2.5 rounded-xl text-[10px] font-black tracking-wider transition-all border",
                        newCardTarget === preset
                          ? "bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-100"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      )}
                    >
                      {preset} Cards
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={newCardTarget}
                  onChange={(e) => setNewCardTarget(Math.max(1, parseInt(e.target.value) || 0))}
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-bold text-slate-750 focus:border-amber-500 focus:bg-white outline-none transition-all"
                  placeholder="Custom new cards..."
                />
              </div>

              <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-150 transition-all flex items-center justify-center"
              >
                {isSaving ? "SAVING..." : "SAVE GOALS"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

function DeckGoalSettingsModal({
  isOpen,
  onClose,
  deckId,
  deckTitle,
  initialTime,
  initialCard,
  initialNewCard,
  onSave
}: {
  isOpen: boolean;
  onClose: () => void;
  deckId: number;
  deckTitle: string;
  initialTime: number;
  initialCard: number;
  initialNewCard: number;
  onSave: (deckId: number, time: number, card: number, newCard: number) => Promise<void>;
}) {
  const [timeTarget, setTimeTarget] = useState(initialTime)
  const [cardTarget, setCardTarget] = useState(initialCard)
  const [newCardTarget, setNewCardTarget] = useState(initialNewCard)
  const [isSaving, setIsSaving] = useState(false)

  const timePresets = [10, 20, 30, 60]
  const cardPresets = [10, 20, 30, 50]

  useEffect(() => {
    if (isOpen) {
      setTimeTarget(initialTime)
      setCardTarget(initialCard)
      setNewCardTarget(initialNewCard)
    }
  }, [isOpen, initialTime, initialCard, initialNewCard])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave(deckId, timeTarget, cardTarget, newCardTarget)
      onClose()
    } catch (e) {
      alert("Failed to save deck goals")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl relative z-10 p-8 border border-slate-100 text-left"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-[8px] font-black text-indigo-600 uppercase tracking-widest block">Deck Target</span>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight mt-0.5 truncate max-w-[200px]">{deckTitle}</h3>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Daily Study Time (mins/day)</label>
                <div className="grid grid-cols-4 gap-1.5 mb-2">
                  {timePresets.map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setTimeTarget(preset)}
                      className={cn(
                        "py-2 rounded-xl text-[9px] font-black tracking-wider transition-all border",
                        timeTarget === preset
                          ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      )}
                    >
                      {preset}m
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min="0"
                  max="480"
                  value={timeTarget}
                  onChange={(e) => setTimeTarget(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-bold text-slate-750 focus:border-indigo-500 focus:bg-white outline-none transition-all"
                  placeholder="Enter minutes (0 = unlimited)..."
                />
              </div>

              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Daily Total Cards (cards/day)</label>
                <div className="grid grid-cols-4 gap-1.5 mb-2">
                  {cardPresets.map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setCardTarget(preset)}
                      className={cn(
                        "py-2 rounded-xl text-[9px] font-black tracking-wider transition-all border",
                        cardTarget === preset
                          ? "bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-100"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      )}
                    >
                      {preset} Cards
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min="0"
                  max="1000"
                  value={cardTarget}
                  onChange={(e) => setCardTarget(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-bold text-slate-750 focus:border-indigo-500 focus:bg-white outline-none transition-all"
                  placeholder="Enter cards (0 = unlimited)..."
                />
              </div>

              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Daily New Cards (cards/day)</label>
                <div className="grid grid-cols-4 gap-1.5 mb-2">
                  {cardPresets.map(preset => (
                    <button
                      key={`new-${preset}`}
                      type="button"
                      onClick={() => setNewCardTarget(preset)}
                      className={cn(
                        "py-2 rounded-xl text-[9px] font-black tracking-wider transition-all border",
                        newCardTarget === preset
                          ? "bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-100"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      )}
                    >
                      {preset} Cards
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min="0"
                  max="1000"
                  value={newCardTarget}
                  onChange={(e) => setNewCardTarget(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-bold text-slate-750 focus:border-amber-500 focus:bg-white outline-none transition-all"
                  placeholder="Enter new cards (0 = unlimited)..."
                />
              </div>

              <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-150 transition-all flex items-center justify-center"
              >
                {isSaving ? "SAVING..." : "SAVE GOALS"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

// ─── Main Dashboard Component ─────────────────────────────────────────────────
export default function Dashboard() {
  const { setUser, setGamify, updateUserSettings, userSettings } = useAppStore()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState(false)
  const [activeHomeTab, setActiveHomeTab] = useState<'roadmap' | 'learning'>('roadmap')

  useEffect(() => {
    if (userSettings?.home_active_tab) {
      setActiveHomeTab(userSettings.home_active_tab)
    }
  }, [userSettings?.home_active_tab])

  const [selectedStudyQuiz, setSelectedStudyQuiz] = useState<any | null>(null)
  const [isStudyModalOpen, setIsStudyModalOpen] = useState(false)
  const [studyModalTab, setStudyModalTab] = useState<'flashcard' | 'practice'>('flashcard')
  const [selectedPracticeQuiz, setSelectedPracticeQuiz] = useState<any | null>(null)
  const [isPracticeModalOpen, setIsPracticeModalOpen] = useState(false)
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false)
  const [roomCode, setRoomCode] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [mobileRoadmapIdx, setMobileRoadmapIdx] = useState(0)
  const [timeFilter, setTimeFilter] = useState<LeaderboardTimeFilter>('week')
  const [remainingTime, setRemainingTime] = useState<string>('')
  const [deckSearchTerm, setDeckSearchTerm] = useState('')
  const deckListRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom of deck list by default on Slide 1 (Thẻ Học)
  useEffect(() => {
    if (currentSlide === 1 && deckListRef.current) {
      const timer = setTimeout(() => {
        if (deckListRef.current) {
          deckListRef.current.scrollTo({
            top: deckListRef.current.scrollHeight,
            behavior: 'smooth'
          })
        }
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [currentSlide])

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date()
      // VPS resets daily goal at 23:59:59 UTC
      const endOfUtcDay = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        23, 59, 59, 999
      ))
      const diffMs = Math.max(0, endOfUtcDay.getTime() - now.getTime())
      const hours = Math.floor(diffMs / (1000 * 60 * 60))
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000)
      setRemainingTime(`${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`)
    }
    updateCountdown()
    const timer = setInterval(updateCountdown, 1000)
    return () => clearInterval(timer)
  }, [])

  const [selectedRoadmapIdx, setSelectedRoadmapIdx] = useState(0)
  const [mascotCheer, setMascotCheer] = useState<string | null>(null)
  const roadmapContainerRef = useRef<HTMLDivElement>(null)

  const cheerQuotes = [
    "Keep it up! You're on fire with this streak! 🔥",
    "Every word learned today is a major leap forward! 🚀",
    "With dedication like this, you'll reach your goal in no time! 🌟",
    "I'm here cheering you on every single day! 💪",
    "Outstanding work! Let's conquer all today's steps! 🎉",
    "Your brain is absorbing vocabulary at lightning speed! 🧠⚡"
  ];

  const handleMascotTap = () => {
    if (navigator.vibrate) navigator.vibrate([15, 30, 15]);
    const randomQuote = cheerQuotes[Math.floor(Math.random() * cheerQuotes.length)];
    setMascotCheer(randomQuote);
    setTimeout(() => {
      setMascotCheer(null);
    }, 4000);
  };

  const handleRoadmapScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.clientHeight > 0) {
      const idx = Math.round(target.scrollTop / target.clientHeight);
      if (idx !== selectedRoadmapIdx) {
        setSelectedRoadmapIdx(idx);
      }
    }
  };

  const scrollToRoadmapDeck = (idx: number) => {
    if (navigator.vibrate) navigator.vibrate(8);
    setSelectedRoadmapIdx(idx);
    if (roadmapContainerRef.current) {
      roadmapContainerRef.current.scrollTo({
        top: idx * roadmapContainerRef.current.clientHeight,
        behavior: 'smooth'
      });
    }
  };

  const { data: roadmapDecks, isLoading: isRoadmapDecksLoading, refetch: refetchRoadmapDecks } = useQuery<any[]>({
    queryKey: ['roadmapDecks'],
    queryFn: async () => {
      const res = await axios.get('/api/v1/deck/roadmap/decks')
      return res.data?.decks || []
    }
  })

  const { data: todayReview, isLoading: isTodayReviewLoading } = useQuery({
    queryKey: ['todayReview'],
    queryFn: async () => {
      const res = await axios.get('/api/v1/deck/today-review')
      return res.data
    }
  })

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await axios.get('/api/v1/dashboard/data')
      setUser(res.data.user)
      setGamify(res.data.gamify)
      return res.data
    },
    retry: false
  })

  const activeDecks = useMemo(() => {
    const list: any[] = [];
    const seenIds = new Set<number>();
    
    // Add roadmap decks first
    if (roadmapDecks) {
      roadmapDecks.forEach(d => {
        if (!seenIds.has(d.deck_id)) {
          seenIds.add(d.deck_id);
          const status = d.status || {};
          list.push({
            deck_id: d.deck_id,
            title: d.title,
            cover_image: d.cover_image,
            total_cards: status.total_cards || d.total_cards || 0,
            learned_cards: status.learned_cards || d.learned_cards || 0,
            new_remaining: Math.max(0, (status.new_target_today || 0) - (status.new_learned_today || 0)),
            review_remaining: Math.max(0, (status.review_due_today || 0) - (status.review_completed_today || 0)),
            total_pct: status.total_cards > 0 ? Math.min(100, Math.round((status.learned_cards / status.total_cards) * 100)) : 0,
            has_due: ((status.new_target_today || 0) - (status.new_learned_today || 0) > 0) || ((status.review_due_today || 0) - (status.review_completed_today || 0) > 0)
          });
        }
      });
    }
    
    // Add FSRS due decks from todayReview
    if (todayReview?.decks_summary) {
      todayReview.decks_summary.forEach((d: any) => {
        if (!seenIds.has(d.deck_id)) {
          seenIds.add(d.deck_id);
          list.push({
            deck_id: d.deck_id,
            title: d.title,
            cover_image: d.cover_image,
            total_cards: d.total_cards || 0,
            learned_cards: d.learned_cards || 0,
            new_remaining: d.new_count || 0,
            review_remaining: d.due_count || 0,
            total_pct: d.total_cards > 0 ? Math.min(100, Math.round(((d.learned_cards || 0) / d.total_cards) * 100)) : 0,
            has_due: (d.new_count > 0 || d.due_count > 0)
          });
        } else {
          const existing = list.find(item => item.deck_id === d.deck_id);
          if (existing) {
            existing.new_remaining += d.new_count || 0;
            existing.review_remaining += d.due_count || 0;
            existing.has_due = existing.has_due || (d.new_count > 0 || d.due_count > 0);
          }
        }
      });
    }

    // Add all decks from dashboard data (my_decks / created_decks)
    const allDashDecks = [...(data?.my_decks || []), ...(data?.created_decks || [])];
    allDashDecks.forEach((d: any) => {
      const id = d.id || d.deck_id;
      if (id && !seenIds.has(id)) {
        seenIds.add(id);
        const cardCnt = d.cards_count || d.questions_count || 0;
        const learnedCnt = d.learned_cards || 0;
        list.push({
          deck_id: id,
          title: d.title,
          cover_image: d.cover_image,
          total_cards: cardCnt,
          learned_cards: learnedCnt,
          new_remaining: 0,
          review_remaining: 0,
          total_pct: cardCnt > 0 ? Math.min(100, Math.round((learnedCnt / cardCnt) * 100)) : 0,
          has_due: false
        });
      }
    });

    // Sort by deck_id ascending so older decks are at top and NEWEST DECKS ARE AT THE BOTTOM
    return list.sort((a, b) => a.deck_id - b.deck_id);
  }, [roadmapDecks, todayReview, data]);

  const sortedRoadmapDecks = useMemo(() => {
    if (!roadmapDecks || roadmapDecks.length === 0) return []
    const order = (userSettings?.roadmap_deck_order || []).map((x: any) => String(x))
    if (order.length === 0) return roadmapDecks
    return [...roadmapDecks].sort((a, b) => {
      const idA = String(a.deck_id ?? a.id ?? '')
      const idB = String(b.deck_id ?? b.id ?? '')
      const idxA = order.indexOf(idA)
      const idxB = order.indexOf(idB)
      if (idxA !== -1 && idxB !== -1) return idxA - idxB
      if (idxA !== -1) return -1
      if (idxB !== -1) return 1
      return 0
    })
  }, [roadmapDecks, userSettings?.roadmap_deck_order]);

  const sortedActiveDecks = useMemo(() => {
    if (!activeDecks || activeDecks.length === 0) return []
    const order = (userSettings?.learning_deck_order || []).map((x: any) => String(x))
    if (order.length === 0) return activeDecks
    return [...activeDecks].sort((a, b) => {
      const idA = String(a.deck_id ?? a.id ?? '')
      const idB = String(b.deck_id ?? b.id ?? '')
      const idxA = order.indexOf(idA)
      const idxB = order.indexOf(idB)
      if (idxA !== -1 && idxB !== -1) return idxA - idxB
      if (idxA !== -1) return -1
      if (idxB !== -1) return 1
      return 0
    })
  }, [activeDecks, userSettings?.learning_deck_order]);

  const { data: weeklyReport } = useQuery({
    queryKey: ['weeklyReport'],
    queryFn: async () => {
      const res = await axios.get('/api/v1/deck/stats/weekly-report')
      return res.data
    }
  })

  const { data: heatmapData } = useQuery<HeatmapDay[]>({
    queryKey: ['stats-heatmap'],
    queryFn: async () => {
      const res = await axios.get('/api/v1/deck/stats/heatmap')
      return res.data
    }
  })

  const { data: leaderboardData } = useQuery({
    queryKey: ['stats-leaderboard', timeFilter],
    queryFn: async () => {
      const res = await axios.get('/api/v1/stats/leaderboard', { params: { time_filter: timeFilter } })
      return res.data
    },
    staleTime: 30 * 1000,
  })

  const { data: badgesProgress } = useQuery<BadgeProgress[]>({
    queryKey: ['badgesProgress'],
    queryFn: async () => {
      const res = await axios.get('/api/v1/gamification/badges/progress')
      return res.data
    }
  })

  const { data: forecastData } = useQuery<ForecastResponse>({
    queryKey: ['reviewForecast'],
    queryFn: async () => {
      const res = await axios.get('/api/v1/deck/stats/review-forecast')
      return res.data
    }
  })

  const { data: dailyComparisonRaw, isLoading: isDailyComparisonLoading } = useQuery<any>({
    queryKey: ['dailyComparison'],
    queryFn: async () => {
      const res = await axios.get('/api/v1/stats/daily-comparison')
      return res.data
    }
  })
  const dailyComparisonData = dailyComparisonRaw?.days
  const dailyComparisonAvg = dailyComparisonRaw?.all_time_avg

  // Lock scroll on desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        document.body.style.overflow = 'hidden'
        document.body.style.height = '100vh'
        document.documentElement.style.overflow = 'hidden'
        document.documentElement.style.height = '100vh'
      } else {
        document.body.style.overflow = ''
        document.body.style.height = ''
        document.documentElement.style.overflow = ''
        document.documentElement.style.height = ''
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      document.body.style.overflow = ''
      document.body.style.height = ''
      document.documentElement.style.overflow = ''
      document.documentElement.style.height = ''
    }
  }, [])

  const handleJoinRoom = async (code?: string) => {
    const targetCode = (typeof code === 'string' && code.trim()) ? code.trim() : roomCode
    if (!targetCode) return
    setIsJoining(true)
    try {
      await axios.post('/api/v1/deck/room/join', { room_code: targetCode })
      navigate(`/room/${targetCode.toUpperCase()}`)
    } catch (e) {
      alert("Room not found or expired")
    } finally {
      setIsJoining(false)
    }
  }

  const handleOpenStudyModal = (deck: any, tab: 'flashcard' | 'practice') => {
    const id = deck.deck_id || deck.id
    const status = deck.status || {}
    setSelectedStudyQuiz({
      id: id,
      title: deck.title,
      questions_count: status.total_cards || deck.total_cards || deck.questions_count || 0,
      practice_settings: deck.practice_settings
    })
    setStudyModalTab(tab)
    setIsStudyModalOpen(true)
  }

  const renderTodayReviewWidget = () => {
    if (isTodayReviewLoading || !todayReview) return null
    const { due_cards_count, decks_summary, streak_at_risk, estimated_minutes } = todayReview

    if (due_cards_count === 0) {
      return (
        <div className="rounded-2xl p-6 text-left border relative overflow-hidden transition-all duration-300 shadow-sm bg-gradient-to-r from-emerald-500/10 to-teal-500/10 text-slate-800 border-emerald-500/20 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                ✅ ALL CAUGHT UP
              </span>
              <h3 className="text-sm font-bold text-slate-800 tracking-tight mt-1.5">
                You've completed all study & review cards for today! Excellent! 🎉
              </h3>
            </div>
            <Link
              to="/decks?tab=library"
              className="h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center justify-center gap-1.5 self-start sm:self-center"
            >
              Browse Library
            </Link>
          </div>
        </div>
      )
    }

    const hasMultipleDecks = decks_summary?.length > 1

    return (
      <div className="rounded-2xl p-4 text-left border relative overflow-hidden transition-all duration-300 shadow-sm flex-shrink-0 mb-4 bg-slate-900 text-white border-indigo-500/20 shadow-indigo-100/5">
        <div className="absolute right-0 top-0 w-36 h-36 bg-indigo-500/10 rounded-full blur-[40px] pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 relative z-10">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
              <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-500/30">
                ⚠️ REVIEW DUE
              </span>
              {streak_at_risk && (
                <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-500/30 animate-pulse">
                  🔥 Streak at risk
                </span>
              )}
              <span className="text-[9px] font-black text-slate-400">
                ⏱️ ~{estimated_minutes} min
              </span>
            </div>

            <h3 className="text-sm font-bold text-white tracking-tight truncate leading-tight">
              You have <span className="text-indigo-400 font-extrabold">{due_cards_count} cards</span> due for study & review today
            </h3>
          </div>

          <button
            onClick={() => {
              navigate(`/flashcard/quick/play`)
            }}
            className="w-full sm:w-auto h-9 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5 self-start sm:self-center flex-shrink-0"
          >
            <Brain className="w-3.5 h-3.5" /> Bắt đầu ôn tập
          </button>
        </div>

        {hasMultipleDecks && (
          <div className="mt-3 pt-3 border-t border-slate-800 flex flex-col gap-1.5">
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">
              Chi tiết các bộ thẻ:
            </span>
            <div className="flex flex-wrap gap-2">
              {decks_summary.map((deck: any) => (
                <div
                  key={deck.deck_id}
                  className="px-2.5 py-1 rounded-lg bg-slate-950/65 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer flex items-center gap-2 text-[9px] font-bold text-slate-300"
                  onClick={() => navigate(`/flashcard/${deck.deck_id}/play`)}
                >
                  <span className="truncate max-w-[120px]">{deck.title}</span>
                  <div className="flex items-center gap-1">
                    {deck.due_count > 0 && (
                      <span className="text-[7px] font-black text-indigo-400 bg-indigo-950/60 px-1 py-0.2 rounded">
                        {deck.due_count}
                      </span>
                    )}
                    {deck.new_count > 0 && (
                      <span className="text-[7px] font-black text-emerald-400 bg-emerald-950/60 px-1 py-0.2 rounded">
                        {deck.new_count}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }


  if (isLoading || !data) return (
    <div className="h-screen flex items-center justify-center font-black animate-pulse text-indigo-600 tracking-widest uppercase bg-[#fafbfd]">
      🚀 NEURAL SYNCING...
    </div>
  )

  return (
    <div className="flex flex-col bg-white md:bg-gradient-to-br md:from-[#f8fafc] md:via-[#f1f6fa] md:to-[#f8fafc] min-h-[calc(100vh-6rem)] relative overflow-x-hidden md:overflow-hidden md:min-h-0 md:h-full">

      {/* Soft blobs - desktop only */}
      <div className="hidden md:block absolute top-[20%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-indigo-200/10 blur-[130px] pointer-events-none" />
      <div className="hidden md:block absolute bottom-[20%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-pink-200/10 blur-[130px] pointer-events-none" />

      {/* MOBILE HEADER - hidden because swiper overlay has its own */}
      <div className="hidden">
        <div className="px-4 py-2 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-1.5 flex-shrink-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-orange-500 to-rose-500 flex items-center justify-center text-white shadow-sm shadow-orange-500/25">
              <BookOpen className="w-4 h-4" />
            </div>
            <span className="text-[13px] font-black text-slate-800 tracking-tight">
              Voca<span className="text-orange-500">burn</span>
            </span>
          </Link>

          {/* Quick HUD Stats */}
          <div className="flex items-center gap-2">
            {/* Level Badge */}
            <span className="flex items-center gap-0.5 px-2.5 py-1 bg-indigo-50 border border-indigo-100 rounded-full text-[10px] font-bold text-indigo-650">
              Lv {data.gamify?.level}
            </span>
            
            {/* Streak Badge */}
            <span className="flex items-center gap-1 px-2.5 py-1 bg-orange-50 border border-orange-100 rounded-full text-[10px] font-bold text-orange-600">
              <Flame className="w-3.5 h-3.5 fill-orange-500 text-orange-500" />
              {data.gamify?.streak}d
            </span>

            {/* Avatar */}
            <Link to="/profile" className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200/50 flex items-center justify-center text-slate-500 active:scale-95 transition-all">
              <User className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* DESKTOP 3-COLUMN ZERO-WINDOW-SCROLL LAYOUT */}
      <div className="hidden md:grid md:grid-cols-12 w-full h-full overflow-hidden px-6 py-4 gap-6">

        {/* COLUMN 1: Profile, Level/Streak/XP, Heatmap, Rich Leaderboard (Col 3 of 12) */}
        <aside className="col-span-3 h-full overflow-y-auto custom-scrollbar flex flex-col gap-4 pr-1 pb-4">
          {/* User profile card */}
          <div className="bg-white/80 backdrop-blur-md border border-slate-200/70 rounded-3xl p-5 shadow-xs flex flex-col gap-3.5 text-left relative overflow-hidden flex-shrink-0">
            <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full bg-orange-100/40 blur-xl pointer-events-none" />

            <div className="flex items-center gap-3 z-10">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-orange-500 via-amber-500 to-rose-500 flex items-center justify-center text-white shadow-md text-xl shadow-orange-200">
                👋
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Welcome back</span>
                <h2 className="text-sm font-black text-slate-800 leading-tight mt-0.5 truncate">
                  {data.user?.username}
                </h2>
              </div>
            </div>

            <div className="flex flex-col gap-2 mt-0.5">
              <div className="flex items-center justify-between p-2.5 bg-slate-50/80 border border-slate-100/80 rounded-2xl">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-500 animate-pulse" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Streak</span>
                </div>
                <span className="text-xs font-black text-orange-600 bg-white px-2.5 py-0.5 rounded-xl shadow-2xs border border-orange-100">{data.gamify?.streak} days 🔥</span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-slate-50/80 border border-slate-100/80 rounded-2xl">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-indigo-500" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Level</span>
                </div>
                <span className="text-xs font-black text-indigo-600 bg-white px-2.5 py-0.5 rounded-xl shadow-2xs border border-indigo-100">Lvl {data.gamify?.level} ⭐</span>
              </div>

              {/* XP progress to next level */}
              <div className="px-1 mt-1">
                <div className="flex justify-between text-[8px] font-black text-slate-400 mb-1">
                  <span>{data.gamify?.xp?.toLocaleString()} XP</span>
                  <span>{((data.gamify?.level || 1) * 1000).toLocaleString()} XP next lv</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-orange-500 via-amber-500 to-indigo-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, ((data.gamify?.xp || 0) % 1000) / 10)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Rich Leaderboard */}
          {leaderboardData && (
            <LeaderboardWidget data={leaderboardData} activeFilter={timeFilter} onFilterChange={setTimeFilter} />
          )}

          {/* Heatmap (Study History) */}
          {heatmapData && heatmapData.length > 0 && <MiniHeatmap data={heatmapData} />}
        </aside>

        {/* COLUMN 2: Roadmap Hub (Center Stage - Col 5 of 12) */}
        <section className="col-span-5 h-full overflow-hidden flex flex-col">
          <DashboardRoadmapSection
            roadmapDecks={sortedRoadmapDecks}
            remainingTime={remainingTime}
            selectedRoadmapIdx={selectedRoadmapIdx}
            onSelectRoadmapIdx={setSelectedRoadmapIdx}
            onOpenStudyModal={handleOpenStudyModal}
            navigate={navigate}
            isDesktop={true}
            displayMode={userSettings?.roadmap_display_mode || 'carousel'}
            onOpenCustomize={() => setIsCustomizeModalOpen(true)}
          />
        </section>

        {/* COLUMN 3: Option C - Quick Decks Hub & Multiplayer Arena (Col 4 of 12) */}
        <section className="col-span-4 h-full overflow-hidden flex flex-col">
          <DashboardQuickDecksWidget
            todayReview={todayReview}
            activeDecks={sortedActiveDecks}
            onOpenStudyModal={handleOpenStudyModal}
            onJoinRoom={handleJoinRoom}
            isJoiningRoom={isJoining}
            navigate={navigate}
          />
        </section>
      </div>

      {/* MOBILE FEED — Exact Mockup Design with Unified Header & Flame Logo */}
      <div 
        className="md:hidden flex flex-col bg-[#f3f5f8] fixed inset-0 top-0 bottom-[60px] z-[100] overflow-hidden select-none font-sans"
        onTouchStart={(e) => {
          (window as any)._touchStartX = e.touches[0].clientX;
          (window as any)._touchStartY = e.touches[0].clientY;
        }}
        onTouchEnd={(e) => {
          const startX = (window as any)._touchStartX;
          const startY = (window as any)._touchStartY;
          if (startX === undefined || startY === undefined) return;
          const endX = e.changedTouches[0].clientX;
          const endY = e.changedTouches[0].clientY;
          const diffX = endX - startX;
          const diffY = endY - startY;

          // Pull to refresh detection
          if (diffY > 120 && Math.abs(diffX) < 50) {
            if (navigator.vibrate) navigator.vibrate(20);
            queryClient.invalidateQueries();
            return;
          }
        }}
      >
        {/* UNIFIED TOP APP HEADER (Sleek, Modern, High-End Studio Bar) */}
        <div className="bg-white border-b border-slate-200/70 flex flex-col flex-shrink-0 z-30 shadow-xs">
          {/* Top Bar: Brand Logo + Utility Cluster */}
          <div className="flex items-center justify-between px-3.5 pt-2.5 pb-1 w-full max-w-[1700px] mx-auto">
            <Link to="/" className="active:scale-95 transition-transform flex items-center">
              <VocaburnLogo height="md" />
            </Link>
            
            <div className="flex items-center gap-2">
              <span 
                className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 text-white rounded-full text-xs font-black shadow-md shadow-orange-500/20"
                title="Daily Streak"
              >
                <Zap className="w-3.5 h-3.5 fill-white text-white animate-pulse" />
                {data?.gamify?.streak || 0}d
              </span>

              {/* ⚙️ Customize / Options Button (Sleek Rounded Button) */}
              <button
                type="button"
                onClick={() => setIsCustomizeModalOpen(true)}
                className="w-8.5 h-8.5 rounded-full bg-slate-100/80 hover:bg-orange-50 text-slate-600 hover:text-orange-600 border border-slate-200/60 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs"
                title="Customize Home display mode & deck order"
              >
                <SlidersHorizontal className="w-4 h-4 stroke-[2.2]" />
              </button>

              <Link 
                to="/profile" 
                className="w-8.5 h-8.5 rounded-full bg-slate-100 border border-slate-200/60 flex items-center justify-center text-slate-700 active:scale-95 transition-all shadow-2xs"
              >
                <User className="w-4.5 h-4.5" />
              </Link>
            </div>
          </div>

          {/* Bottom Bar: Minimalist Studio Navigation Tabs */}
          <div className="px-4 flex items-center gap-6 relative w-full max-w-[1700px] mx-auto">
            {/* Tab 1: Roadmap */}
            <button
              type="button"
              onClick={() => {
                setActiveHomeTab('roadmap')
                if (navigator.vibrate) navigator.vibrate(6)
                updateUserSettings({ home_active_tab: 'roadmap' }).catch(console.error)
              }}
              className={cn(
                "relative pt-1.5 pb-2.5 flex items-center gap-2 text-xs font-bold transition-all cursor-pointer select-none",
                activeHomeTab === 'roadmap' ? "text-slate-900 font-black" : "text-slate-400 hover:text-slate-600 font-semibold"
              )}
            >
              <Layers className={cn("w-4 h-4 transition-colors", activeHomeTab === 'roadmap' ? "text-orange-500 stroke-[2.5]" : "text-slate-400")} />
              <span className="text-[13px] tracking-tight">Roadmap</span>
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-black leading-none tabular-nums transition-all",
                activeHomeTab === 'roadmap'
                  ? "bg-orange-500 text-white shadow-sm shadow-orange-500/25"
                  : "bg-slate-100 text-slate-500"
              )}>
                {sortedRoadmapDecks.length}
              </span>

              {/* Animated underline indicator */}
              {activeHomeTab === 'roadmap' && (
                <motion.div
                  layoutId="activeTabUnderline"
                  className="absolute bottom-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 rounded-full"
                  transition={{ type: "spring", stiffness: 450, damping: 35 }}
                />
              )}
            </button>

            {/* Tab 2: Learning */}
            <button
              type="button"
              onClick={() => {
                setActiveHomeTab('learning')
                if (navigator.vibrate) navigator.vibrate(6)
                updateUserSettings({ home_active_tab: 'learning' }).catch(console.error)
              }}
              className={cn(
                "relative pt-1.5 pb-2.5 flex items-center gap-2 text-xs font-bold transition-all cursor-pointer select-none",
                activeHomeTab === 'learning' ? "text-slate-900 font-black" : "text-slate-400 hover:text-slate-600 font-semibold"
              )}
            >
              <BookOpen className={cn("w-4 h-4 transition-colors", activeHomeTab === 'learning' ? "text-orange-500 stroke-[2.5]" : "text-slate-400")} />
              <span className="text-[13px] tracking-tight">Learning</span>
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-black leading-none tabular-nums transition-all",
                activeHomeTab === 'learning'
                  ? "bg-orange-500 text-white shadow-sm shadow-orange-500/25"
                  : "bg-slate-100 text-slate-500"
              )}>
                {sortedActiveDecks.length}
              </span>

              {/* Animated underline indicator */}
              {activeHomeTab === 'learning' && (
                <motion.div
                  layoutId="activeTabUnderline"
                  className="absolute bottom-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 rounded-full"
                  transition={{ type: "spring", stiffness: 450, damping: 35 }}
                />
              )}
            </button>
          </div>
        </div>

        {/* MOBILE MAIN CONTENT */}
        <div className="flex-1 bg-[#f3f5f8] overflow-hidden relative flex flex-col min-h-0">
          {activeHomeTab === 'roadmap' ? (
            <DashboardRoadmapSection
              roadmapDecks={sortedRoadmapDecks}
              remainingTime={remainingTime}
              selectedRoadmapIdx={selectedRoadmapIdx}
              onSelectRoadmapIdx={setSelectedRoadmapIdx}
              onOpenStudyModal={handleOpenStudyModal}
              navigate={navigate}
              isDesktop={false}
              displayMode={userSettings?.roadmap_display_mode || 'carousel'}
              onOpenCustomize={() => setIsCustomizeModalOpen(true)}
            />
          ) : (
            <div className="flex-1 overflow-y-auto p-3 sm:p-4">
              <DashboardQuickDecksWidget
                todayReview={todayReview}
                activeDecks={sortedActiveDecks}
                onOpenStudyModal={handleOpenStudyModal}
                onJoinRoom={handleJoinRoom}
                isJoiningRoom={isJoining}
                navigate={navigate}
              />
            </div>
          )}
        </div>

      </div>
      {/* MODALS */}
      <AnimatePresence>
        <JoinRoomModal
          isOpen={isJoinModalOpen}
          onClose={() => setIsJoinModalOpen(false)}
          roomCode={roomCode}
          setRoomCode={setRoomCode}
          onJoin={handleJoinRoom}
          isJoining={isJoining}
        />

        <PracticeModeModal
          isOpen={isPracticeModalOpen}
          onClose={() => setIsPracticeModalOpen(false)}
          selectedPracticeQuiz={selectedPracticeQuiz}
          onSelectMode={(mode) => {
            setIsPracticeModalOpen(false)
            navigate(`/practice/${selectedPracticeQuiz.id}/${mode}`)
          }}
        />

        <StudyModeModal
          isOpen={isStudyModalOpen}
          onClose={() => setIsStudyModalOpen(false)}
          selectedStudyQuiz={selectedStudyQuiz}
          studyModalTab={studyModalTab}
          onSelectFlashcardMode={(mode) => {
            setIsStudyModalOpen(false)
            updateUserSettings({ quiz_learning_mode: mode as any })
            navigate(`/flashcard/${selectedStudyQuiz.id}/play?mode=${mode}`)
          }}
          onSelectPracticeMode={(mode) => {
            setIsStudyModalOpen(false)
            updateUserSettings({ practice_submode: mode as any })
            navigate(`/practice/${selectedStudyQuiz.id}/${mode}`)
          }}
        />

        <HomeCustomizeModal
          isOpen={isCustomizeModalOpen}
          onClose={() => setIsCustomizeModalOpen(false)}
          roadmapDecks={sortedRoadmapDecks}
          activeDecks={sortedActiveDecks}
        />

      </AnimatePresence>
    </div>
  )
}
