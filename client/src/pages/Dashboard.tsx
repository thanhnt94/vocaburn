import React, { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Brain, Trophy, ChevronRight, LayoutGrid, Users, Zap, Flame, BrainCircuit, X, Play, Crown, Medal, Star, CheckCircle2, Circle, Swords, Settings, Target, RefreshCw, User, BookOpen, Sparkles, TrendingUp } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'


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
  done_today: number
  is_target_met: boolean
  streak_count: number
  days_remaining_est: number
}

interface DashboardData {
  user: { id: number, username: string, email: string }
  gamify: { level: number, xp: number, streak: number }
  stats_summary: { avg_accuracy: number, total_time_hours: number, total_questions: number }
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
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đang tính toán dữ liệu dự báo...</span>
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
              <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-widest italic leading-none">Dự báo ôn tập FSRS</h3>
              <p className="text-[9px] font-bold text-slate-400 mt-1">Lượng thẻ ôn tập dự kiến</p>
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
                    ? "bg-white text-orange-650 shadow-sm border border-slate-100/50"
                    : "text-slate-400 hover:text-slate-600"
                )}
              >
                {mode === 'hourly' ? 'Giờ' : mode === 'daily' ? 'Ngày' : 'Tuần'}
              </button>
            ))}
          </div>
        </div>

        {/* Range Selector (Only shown in Daily view) */}
        {viewMode === 'daily' && (
          <div className="flex items-center justify-end gap-2 mt-1">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Phạm vi:</span>
            <div className="flex items-center bg-slate-50 p-1 rounded-xl border border-slate-100">
              {([7, 14, 30] as const).map(range => (
                <button
                  key={range}
                  onClick={() => setDaysRange(range)}
                  className={cn(
                    "px-2.5 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all cursor-pointer",
                    daysRange === range
                      ? "bg-white text-orange-650 shadow-sm border border-slate-100/50"
                      : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  {range} ngày
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Stats summary banner */}
      <div className="grid grid-cols-2 gap-3 bg-gradient-to-r from-orange-50/50 to-indigo-50/30 p-3 rounded-2xl border border-slate-100">
        <div className="flex flex-col">
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider">
            {viewMode === 'hourly' ? "Hôm nay cần ôn" : viewMode === 'daily' ? "Hôm nay cần ôn" : "Tuần này cần ôn"}
          </span>
          <span className="text-sm font-black text-orange-650 mt-0.5">{todayCount} thẻ</span>
        </div>
        <div className="flex flex-col border-l border-slate-100 pl-3">
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider">
            {viewMode === 'hourly' ? "Tích lũy 24h" : viewMode === 'daily' ? `Tích lũy ${daysRange} ngày` : "Tích lũy 4 tuần"}
          </span>
          <span className="text-sm font-black text-indigo-600 mt-0.5">{maxCumulative} thẻ</span>
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
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Lịch sử học tập</span>
        <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
          {totalThisMonth} thẻ tháng này
        </span>
      </div>
      <div className="flex justify-center gap-[3px] py-2 overflow-x-auto scrollbar-none">
        {cells.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((cell, di) => (
              <div
                key={di}
                title={`${cell.date}: ${cell.count} thẻ`}
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
        <span className="text-[8px] font-bold text-slate-400">Ít</span>
        {['bg-slate-100', 'bg-indigo-200', 'bg-indigo-400', 'bg-indigo-600', 'bg-indigo-800'].map((c, i) => (
          <div key={i} className={cn('w-2.5 h-2.5 rounded-[2px]', c)} />
        ))}
        <span className="text-[8px] font-bold text-slate-400">Nhiều</span>
      </div>
    </div>
  )
}

// ─── Leaderboard Widget ────────────────────────────────────────────────────────
function LeaderboardWidget({ data, activeFilter, onFilterChange }: { 
  data: { 
    leaderboard: any[], 
    current_user_rank: number | null,
    time_leaderboard?: any[],
    current_user_time_rank?: number | null,
    cards_leaderboard?: any[],
    current_user_cards_rank?: number | null,
    new_cards_leaderboard?: any[],
    current_user_new_cards_rank?: number | null
  },
  activeFilter: string,
  onFilterChange: (f: string) => void
}) {
  const [activeTab, setActiveTab] = useState<'xp' | 'time' | 'new_cards' | 'cards'>('xp')

  const rankIcons: Record<number, React.ReactNode> = {
    1: <Crown className="w-4 h-4 text-amber-500" />,
    2: <Medal className="w-4 h-4 text-slate-400" />,
    3: <Medal className="w-4 h-4 text-amber-700" />,
  }
  const rankColors: Record<number, string> = {
    1: 'from-amber-50 to-orange-50 border-amber-200/80',
    2: 'from-slate-50 to-slate-50/80 border-slate-200/60',
    3: 'from-amber-50/50 to-orange-50/30 border-amber-100/60',
  }

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const mins = Math.floor(seconds / 60)
    const hours = Math.floor(mins / 60)
    if (hours > 0) {
      return `${hours}h ${mins % 60}m`
    }
    return `${mins}m`
  }

  const currentList = activeTab === 'xp' 
    ? data.leaderboard 
    : activeTab === 'time' 
      ? (data.time_leaderboard || []) 
      : activeTab === 'new_cards' 
        ? (data.new_cards_leaderboard || []) 
        : (data.cards_leaderboard || [])
  const currentRank = activeTab === 'xp' 
    ? data.current_user_rank 
    : activeTab === 'time' 
      ? data.current_user_time_rank 
      : activeTab === 'new_cards' 
        ? data.current_user_new_cards_rank 
        : data.current_user_cards_rank

  return (
    <div className="bg-white border border-slate-200/60 rounded-[2rem] p-5 shadow-sm flex flex-col gap-4 text-left flex-shrink-0">
      <div className="flex flex-col gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">🏆 Bảng xếp hạng</span>
          
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
            <button
              onClick={() => setActiveTab('xp')}
              className={cn(
                "px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider transition-all",
                activeTab === 'xp' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
            >
              XP
            </button>
            <button
              onClick={() => setActiveTab('time')}
              className={cn(
                "px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider transition-all",
                activeTab === 'time' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
            >
              Thời gian
            </button>
            <button
              onClick={() => setActiveTab('new_cards')}
              className={cn(
                "px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider transition-all",
                activeTab === 'new_cards' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
            >
              Thẻ mới
            </button>
            <button
              onClick={() => setActiveTab('cards')}
              className={cn(
                "px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider transition-all",
                activeTab === 'cards' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
            >
              Lượt ôn
            </button>
          </div>
        </div>

        {/* Time Filters */}
        <div className="flex items-center gap-1.5 self-start">
          {[
            { id: 'today', label: 'Hôm nay' },
            { id: 'week', label: 'Tuần này' },
            { id: 'all_time', label: 'Toàn bộ' }
          ].map(filter => (
            <button
              key={filter.id}
              onClick={() => onFilterChange(filter.id)}
              className={cn(
                "px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-all",
                activeFilter === filter.id
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200"
                  : "bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        {currentList.map((entry, index) => {
          const isOutOfTop5 = (entry as any).out_of_top_5 || (entry as any).out_of_top_10
          
          return (
            <React.Fragment key={entry.user_id}>
              {isOutOfTop5 && index > 0 && (
                <div className="flex justify-center py-1">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-200"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-200"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-200"></span>
                  </div>
                </div>
              )}
              
              <div
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-xl border bg-gradient-to-r transition-all',
                  entry.is_current_user
                    ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-300/50'
                    : rankColors[entry.rank as number] || 'border-slate-100 bg-slate-50/50',
                  isOutOfTop5 && 'border-dashed'
                )}
              >
                <div className="w-6 flex items-center justify-center flex-shrink-0">
                  {rankIcons[entry.rank as number] || (
                    <span className="text-[9px] font-black text-slate-400">#{entry.rank}</span>
                  )}
                </div>

                {/* Avatar */}
                <div className={cn(
                  'w-7 h-7 rounded-xl flex items-center justify-center text-[10px] font-black flex-shrink-0',
                  entry.is_current_user
                    ? 'bg-indigo-600 text-white'
                    : entry.rank === 1
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-200 text-slate-600'
                )}>
                  {entry.username.slice(0, 2).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <span className={cn(
                    'text-[10px] font-black truncate block',
                    entry.is_current_user ? 'text-indigo-700' : 'text-slate-700'
                  )}>
                    {entry.username} {entry.is_current_user && '(Bạn)'}
                  </span>
                  {activeTab === 'xp' ? (
                    <span className="text-[8px] font-bold text-slate-400 flex items-center gap-1">
                      Lvl {entry.level} · 🔥 {entry.streak}d
                    </span>
                  ) : activeTab === 'time' ? (
                    <span className="text-[8px] font-bold text-slate-400 flex items-center gap-1">
                      Tổng thời gian học
                    </span>
                  ) : activeTab === 'new_cards' ? (
                    <span className="text-[8px] font-bold text-slate-400 flex items-center gap-1">
                      Tổng số thẻ mới học
                    </span>
                  ) : (
                    <span className="text-[8px] font-bold text-slate-400 flex items-center gap-1">
                      Tổng số lượt ôn tập
                    </span>
                  )}
                </div>

                <div className="flex-shrink-0 text-right">
                  <span className={cn(
                    'text-[10px] font-black',
                    entry.rank === 1 ? 'text-amber-600' : entry.is_current_user ? 'text-indigo-600' : 'text-slate-600'
                  )}>
                    {activeTab === 'xp' 
                      ? entry.xp.toLocaleString() 
                      : activeTab === 'time' 
                        ? formatTime(entry.total_time || 0) 
                        : activeTab === 'new_cards' 
                          ? `${entry.new_cards || 0} thẻ` 
                          : `${entry.total_cards || 0} lượt`}
                  </span>
                  <span className="text-[7px] font-black text-slate-400 block">
                    {activeTab === 'xp' ? 'XP' : activeTab === 'time' ? 'Đã học' : activeTab === 'new_cards' ? 'Thẻ mới' : 'Lượt ôn'}
                  </span>
                </div>
              </div>
            </React.Fragment>
          )
        })}
        {currentList.length === 0 && (
          <div className="py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Chưa có dữ liệu
          </div>
        )}
      </div>

      {currentRank && (
        <div className="pt-1 border-t border-slate-100 text-center mt-2">
          <span className="text-[9px] font-black text-slate-400">
            Hạng của bạn: <span className="text-indigo-600 font-extrabold">#{currentRank}</span> toàn hệ thống
          </span>
        </div>
      )}
    </div>
  )
}

// ─── Daily Challenges Widget ───────────────────────────────────────────────────
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
    <div className="bg-white border border-slate-200/60 rounded-[2rem] p-5 shadow-sm flex flex-col gap-3.5 text-left flex-shrink-0">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Hành trình danh hiệu</span>
          <span className="text-[8px] font-black text-indigo-600 uppercase tracking-wider block mt-0.5">
            🏆 Sắp đạt được
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {data.map(badge => {
          const IconComponent = iconsMap[badge.icon] || Trophy
          return (
            <div key={badge.id} className="flex items-center gap-3 p-3.5 rounded-2xl border border-slate-100 bg-slate-50/30">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100/50 flex items-center justify-center text-indigo-600 flex-shrink-0">
                <IconComponent className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-black text-slate-800 truncate">{badge.name}</span>
                  <span className="text-[9px] font-black text-indigo-600">{badge.percentage}%</span>
                </div>
                <p className="text-[8px] font-medium text-slate-400 truncate mt-0.5">{badge.description}</p>
                <div className="h-1 bg-slate-100 rounded-full mt-2 overflow-hidden w-full relative">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all"
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

interface GlobalGoals {
  daily_time_target: number
  daily_card_target: number
  daily_new_card_target: number
  actual_time_minutes: number
  actual_cards_completed: number
  actual_new_cards_completed: number
  actual_correct_answers?: number
  actual_xp_gained_today?: number
}

function TodayFocusWidget({
  data,
  activeGoals,
  todayReview,
  onOpenSettings,
  onStartPractice,
  navigate
}: {
  data: GlobalGoals;
  activeGoals: ActiveGoal[] | undefined;
  todayReview: any | undefined;
  onOpenSettings: () => void;
  onStartPractice: (quiz: any) => void;
  navigate: any;
}) {
  const timePercentage = data.daily_time_target > 0 ? Math.min(100, Math.round((data.actual_time_minutes / data.daily_time_target) * 100)) : 0
  const cardPercentage = data.daily_card_target > 0 ? Math.min(100, Math.round((data.actual_cards_completed / data.daily_card_target) * 100)) : 0
  const newCardPercentage = data.daily_new_card_target > 0 ? Math.min(100, Math.round((data.actual_new_cards_completed / data.daily_new_card_target) * 100)) : 0

  const isAllGoalsMet = timePercentage >= 100 && cardPercentage >= 100 && newCardPercentage >= 100;
  const reviewCards = Math.max(0, data.actual_cards_completed - data.actual_new_cards_completed);
  const accuracy = data.actual_cards_completed > 0 ? Math.round(((data.actual_correct_answers || 0) / data.actual_cards_completed) * 100) : 0;
  
  // Use exact XP tracking from DB
  const exactXp = data.actual_xp_gained_today || 0;

  return (
    <div className={cn(
      "border rounded-[2.5rem] p-6 shadow-sm relative overflow-hidden text-left mb-5 flex-shrink-0 transition-all duration-700",
      isAllGoalsMet 
        ? "bg-white border-emerald-400 ring-2 ring-emerald-400/20 shadow-emerald-100/50" 
        : "bg-white border-slate-200/60"
    )}>
      <div className={cn(
        "absolute -right-8 -top-8 w-24 h-24 rounded-full blur-md pointer-events-none transition-all duration-700",
        isAllGoalsMet ? "bg-emerald-400/10" : "bg-indigo-50/30"
      )} />
      
      <div className="flex items-center justify-between mb-5 relative z-10">
        <div>
          <span className={cn(
            "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg transition-colors",
            isAllGoalsMet ? "text-emerald-700 bg-emerald-50 border border-emerald-200/50" : "text-indigo-600 bg-indigo-50"
          )}>
            {isAllGoalsMet ? "🎉 MỤC TIÊU HOÀN THÀNH" : "🎯 TODAY'S FOCUS"}
          </span>
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight mt-1">Mục tiêu ngày của bạn</h3>
        </div>
        <button
          onClick={onOpenSettings}
          className="w-8.5 h-8.5 rounded-xl bg-white/60 border border-slate-200/60 flex items-center justify-center text-slate-600 shadow-sm active:scale-90 hover:bg-slate-100 transition-all backdrop-blur-sm"
          title="Cài đặt mục tiêu"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-4 relative z-10 mb-5">
        {/* Time Target */}
        <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1 sm:gap-3 bg-white/60 backdrop-blur-sm p-2 sm:p-3.5 rounded-2xl sm:rounded-[1.5rem] border border-slate-100">
          <div className="relative w-10 h-10 sm:w-14 sm:h-14 flex-shrink-0 flex items-center justify-center rounded-full bg-white shadow-sm">
            <svg className="w-10 h-10 sm:w-14 sm:h-14 transform -rotate-90">
              <circle cx="50%" cy="50%" r="40%" className="stroke-slate-100 fill-none" strokeWidth="3" />
              <circle
                cx="50%" cy="50%" r="40%"
                className="stroke-indigo-600 fill-none transition-all duration-500 ease-out"
                strokeWidth="3"
                strokeDasharray="250%"
                strokeDashoffset={`${250 - (timePercentage / 100) * 250}%`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute text-[8px] sm:text-[10px] font-black text-indigo-600">
              {timePercentage}%
            </span>
          </div>
          <div className="text-center sm:text-left mt-1 sm:mt-0">
            <span className="text-[7px] sm:text-[9px] font-black text-slate-400 uppercase tracking-wider block leading-none sm:leading-normal">TG Học</span>
            <span className="text-[9px] sm:text-xs font-black text-slate-850 block mt-0.5 whitespace-nowrap">
              {data.actual_time_minutes}/{data.daily_time_target}m
            </span>
          </div>
        </div>

        {/* Reviewed Card Target */}
        <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1 sm:gap-3 bg-white/60 backdrop-blur-sm p-2 sm:p-3.5 rounded-2xl sm:rounded-[1.5rem] border border-slate-100">
          <div className="relative w-10 h-10 sm:w-14 sm:h-14 flex-shrink-0 flex items-center justify-center rounded-full bg-white shadow-sm">
            <svg className="w-10 h-10 sm:w-14 sm:h-14 transform -rotate-90">
              <circle cx="50%" cy="50%" r="40%" className="stroke-slate-100 fill-none" strokeWidth="3" />
              <circle
                cx="50%" cy="50%" r="40%"
                className="stroke-emerald-500 fill-none transition-all duration-500 ease-out"
                strokeWidth="3"
                strokeDasharray="250%"
                strokeDashoffset={`${250 - (cardPercentage / 100) * 250}%`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute text-[8px] sm:text-[10px] font-black text-emerald-600">
              {cardPercentage}%
            </span>
          </div>
          <div className="text-center sm:text-left mt-1 sm:mt-0">
            <span className="text-[7px] sm:text-[9px] font-black text-slate-400 uppercase tracking-wider block leading-none sm:leading-normal">Đã học</span>
            <span className="text-[9px] sm:text-xs font-black text-slate-850 block mt-0.5 whitespace-nowrap">
              {data.actual_cards_completed}/{data.daily_card_target}
            </span>
          </div>
        </div>

        {/* New Card Target */}
        <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1 sm:gap-3 bg-white/60 backdrop-blur-sm p-2 sm:p-3.5 rounded-2xl sm:rounded-[1.5rem] border border-slate-100">
          <div className="relative w-10 h-10 sm:w-14 sm:h-14 flex-shrink-0 flex items-center justify-center rounded-full bg-white shadow-sm">
            <svg className="w-10 h-10 sm:w-14 sm:h-14 transform -rotate-90">
              <circle cx="50%" cy="50%" r="40%" className="stroke-slate-100 fill-none" strokeWidth="3" />
              <circle
                cx="50%" cy="50%" r="40%"
                className="stroke-amber-500 fill-none transition-all duration-500 ease-out"
                strokeWidth="3"
                strokeDasharray="250%"
                strokeDashoffset={`${250 - (newCardPercentage / 100) * 250}%`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute text-[8px] sm:text-[10px] font-black text-amber-600">
              {newCardPercentage}%
            </span>
          </div>
          <div className="text-center sm:text-left mt-1 sm:mt-0">
            <span className="text-[7px] sm:text-[9px] font-black text-slate-400 uppercase tracking-wider block leading-none sm:leading-normal">Học mới</span>
            <span className="text-[9px] sm:text-xs font-black text-slate-850 block mt-0.5 whitespace-nowrap">
              {data.actual_new_cards_completed}/{data.daily_new_card_target}
            </span>
          </div>
        </div>
      </div>

      {/* Deck-specific targets section */}
      <div className="border-t border-slate-100 pt-5 relative z-10">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-3.5">Mục tiêu theo từng bộ thẻ:</span>
        
        {!activeGoals || activeGoals.length === 0 ? (
          <div className="text-center py-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200/80">
            <span className="text-[10px] font-bold text-slate-400">Chưa thiết lập mục tiêu cho bộ thẻ nào.</span>
            <Link to="/library" className="text-[10px] font-black text-indigo-600 uppercase tracking-wider block mt-1 hover:underline">📚 Đi đến thư viện</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {activeGoals.map(goal => {
              const deckReview = todayReview?.decks_summary?.find((d: any) => d.deck_id === goal.deck_id)
              const dueReviews = deckReview ? deckReview.due_count : 0
              const isGoalMet = goal.done_today >= goal.daily_target
              const goalPercentage = goal.daily_target > 0 ? Math.min(100, Math.round((goal.done_today / goal.daily_target) * 100)) : 0
              const remainingNewToday = Math.max(0, goal.daily_target - goal.done_today)
              const totalRemainingNew = goal.total_questions - goal.total_learned
              const newCountLabel = remainingNewToday > 0 ? remainingNewToday : (totalRemainingNew > 0 ? totalRemainingNew : 0)
              const hasNewCards = totalRemainingNew > 0

              return (
                <div key={goal.goal_id} className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/30 hover:bg-slate-50/60 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Ring for specific deck new cards target */}
                    <div className="relative w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-full bg-white shadow-sm border border-slate-100">
                      <svg className="w-11 h-11 transform -rotate-90">
                        <circle cx="22" cy="22" r="17" className="stroke-slate-50 fill-none" strokeWidth="2.5" />
                        <circle
                          cx="22" cy="22" r="17"
                          className={cn("fill-none transition-all duration-500 ease-out", isGoalMet ? "stroke-amber-400" : "stroke-indigo-600")}
                          strokeWidth="2.5"
                          strokeDasharray={2 * Math.PI * 17}
                          strokeDashoffset={2 * Math.PI * 17 - (goalPercentage / 100) * 2 * Math.PI * 17}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className={cn("absolute text-[8px] font-black", isGoalMet ? "text-amber-500" : "text-indigo-600")}>
                        {goal.done_today}/{goal.daily_target}
                      </span>
                    </div>

                    <div className="min-w-0 text-left">
                      <h4 className="text-xs font-black text-slate-850 truncate leading-snug">{goal.quiz_title}</h4>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-orange-50 text-orange-600 border border-orange-100/60">
                          🔥 {goal.streak_count}D
                        </span>
                        {dueReviews > 0 ? (
                          <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-100/60 animate-pulse">
                            ⚠️ {dueReviews} thẻ cần ôn
                          </span>
                        ) : (
                          <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-100/60">
                            ✅ Đã sạch thẻ ôn
                          </span>
                        )}
                        <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-sky-50 text-sky-600 border border-sky-100/60">
                          📚 Đã học: {goal.total_learned}/{goal.total_questions}
                        </span>
                        {(() => {
                          const d = new Date()
                          d.setDate(d.getDate() + goal.days_remaining_est)
                          return (
                            <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-100/60 flex items-center gap-1">
                              <Target className="w-2.5 h-2.5" />
                              Dự kiến xong: {d.toLocaleDateString('vi-VN')}
                            </span>
                          )
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 self-end sm:self-center">
                    <button
                      onClick={() => {
                        if (hasNewCards) {
                          navigate(`/flashcard/${goal.deck_id}/play?mode=new`)
                        }
                      }}
                      className={cn(
                        "h-8.5 px-2 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm active:scale-95 transition-all",
                        hasNewCards
                          ? "bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white shadow-orange-100"
                          : "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200/50"
                      )}
                      disabled={!hasNewCards}
                      title="Học từ mới"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Mới {newCountLabel > 0 && `(${newCountLabel})`}
                    </button>
                    <button
                      onClick={() => navigate(`/flashcard/${goal.deck_id}/play?mode=fsrs`)}
                      className={cn(
                        "h-8.5 px-2 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm active:scale-95 transition-all",
                        dueReviews > 0
                          ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                      )}
                      title="Spaced Repetition"
                    >
                      <Brain className="w-3.5 h-3.5" />
                      Ôn {dueReviews > 0 && `(${dueReviews})`}
                    </button>
                    <button
                      onClick={() => onStartPractice({ id: goal.deck_id, title: goal.quiz_title, questions_count: goal.total_questions })}
                      className="h-8.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm shadow-emerald-100 active:scale-95 transition-all"
                      title="Luyện tập tự do"
                    >
                      <Trophy className="w-3.5 h-3.5" />
                      Tập
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
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
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Cài đặt mục tiêu học</h3>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Time Goal */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Mục tiêu thời gian học (phút/ngày)</label>
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
                  placeholder="Nhập số phút tùy chọn..."
                />
              </div>

              {/* Card Goal */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Mục tiêu số thẻ học (thẻ/ngày)</label>
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
                      {preset} Thẻ
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
                  placeholder="Nhập số thẻ tùy chọn..."
                />
              </div>

              {/* New Card Goal */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Mục tiêu số thẻ mới (thẻ/ngày)</label>
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
                      {preset} Thẻ
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
                  placeholder="Nhập số thẻ mới tùy chọn..."
                />
              </div>

              <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-150 transition-all flex items-center justify-center"
              >
                {isSaving ? "ĐANG LƯU..." : "LƯU MỤC TIÊU"}
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
  const { setUser, setGamify } = useAppStore()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const [selectedPracticeQuiz, setSelectedPracticeQuiz] = useState<any | null>(null)
  const [isPracticeModalOpen, setIsPracticeModalOpen] = useState(false)
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false)
  const [roomCode, setRoomCode] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false)
  
  const [timeFilter, setTimeFilter] = useState('all_time')

  const { data: globalGoals, refetch: refetchGlobalGoals } = useQuery<GlobalGoals>({
    queryKey: ['globalGoals'],
    queryFn: async () => {
      const res = await axios.get('/api/v1/deck/goals/global')
      return res.data
    }
  })

  const handleSaveGlobalGoals = async (timeTarget: number, cardTarget: number, newCardTarget: number) => {
    await axios.post('/api/v1/deck/goals/global', {
      daily_time_target: timeTarget,
      daily_card_target: cardTarget,
      daily_new_card_target: newCardTarget
    })
    refetchGlobalGoals()
  }

  const todayStr = new Date().toISOString().slice(0, 10)

  const { data: activeGoals, isLoading: isGoalsLoading } = useQuery<ActiveGoal[]>({
    queryKey: ['activeGoals', todayStr],
    queryFn: async () => {
      const res = await axios.get('/api/v1/deck/goals/active', { params: { local_date: todayStr } })
      return res.data
    }
  })

  const { data: todayReview, isLoading: isTodayReviewLoading } = useQuery({
    queryKey: ['todayReview'],
    queryFn: async () => {
      const res = await axios.get('/api/v1/deck/today-review')
      return res.data
    }
  })

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
    queryKey: ['leaderboard', timeFilter],
    queryFn: async () => {
      const res = await axios.get('/api/v1/gamification/leaderboard', { params: { time_filter: timeFilter } })
      return res.data
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
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

  const handleJoinRoom = async () => {
    if (!roomCode) return
    setIsJoining(true)
    try {
      await axios.post('/api/v1/deck/room/join', { room_code: roomCode })
      navigate(`/room/${roomCode.toUpperCase()}`)
    } catch (e) {
      alert("Room not found or expired")
    } finally {
      setIsJoining(false)
    }
  }

  const renderTodayReviewWidget = () => {
    if (isTodayReviewLoading || !todayReview) return null
    const { due_cards_count, decks_summary, streak_at_risk, estimated_minutes } = todayReview

    if (due_cards_count === 0) {
      return (
        <div className="rounded-2xl p-6 text-left border relative overflow-hidden transition-all duration-300 shadow-sm bg-gradient-to-r from-emerald-500/10 to-teal-500/10 text-slate-800 border-emerald-500/20 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                ✅ ALL CAUGHT UP
              </span>
              <h3 className="text-sm font-bold text-slate-800 tracking-tight mt-1.5">
                Bạn đã hoàn thành tất cả thẻ học & ôn tập hôm nay! Tuyệt vời! 🎉
              </h3>
            </div>
            <Link
              to="/library"
              className="h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center justify-center gap-1.5 self-start sm:self-center"
            >
              Vào Thư Viện Học Thêm
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
              Bạn có <span className="text-indigo-400 font-extrabold">{due_cards_count} thẻ</span> cần học & ôn tập hôm nay
            </h3>
          </div>

          <button
            onClick={() => {
              const first = decks_summary?.[0]
              if (first) navigate(`/flashcard/${first.deck_id}/play`)
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

  const renderActiveGoals = (isMobile: boolean) => {
    if (isGoalsLoading) {
      return <div className="text-center py-8 text-xs font-bold text-slate-400 animate-pulse">ĐANG TẢI MỤC TIÊU...</div>
    }

    if (!activeGoals || activeGoals.length === 0) {
      return (
        <div className="w-full bg-white border border-slate-200/60 rounded-3xl p-8 text-center flex flex-col items-center justify-center shadow-sm">
          <span className="text-3xl mb-3">🎯</span>
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-1">Chưa có mục tiêu học tập</h3>
          <p className="text-[10px] text-slate-400 max-w-[240px] leading-relaxed mb-4">Đặt mục tiêu ôn luyện hàng ngày để duy trì streak và học tập hiệu quả hơn.</p>
          <Link
            to="/library"
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95"
          >
            Khám Phá Thư Viện Thẻ
          </Link>
        </div>
      )
    }

    return (
      <div className={cn(
        "grid gap-4",
        isMobile ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"
      )}>
        {activeGoals.map(goal => {
          const isLimitless = goal.done_today > goal.daily_target
          const percentage = goal.daily_target > 0 ? Math.min(100, Math.round((goal.done_today / goal.daily_target) * 100)) : 0

          return (
            <div
              key={goal.goal_id}
              className={cn(
                "p-4 rounded-[1.75rem] border flex items-center justify-between gap-4 transition-all duration-300 bg-white",
                isLimitless
                  ? "border-amber-500/30 shadow-[0_4px_20px_rgba(245,158,11,0.08)] bg-gradient-to-r from-white to-amber-50/10"
                  : "border-slate-200/50 shadow-sm"
              )}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="relative w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-full bg-slate-50">
                  <svg className="w-12 h-12 transform -rotate-90">
                    <circle cx="24" cy="24" r="20" className="stroke-slate-100 fill-none" strokeWidth="3.5" />
                    <circle
                      cx="24" cy="24" r="20"
                      className={cn("fill-none transition-all duration-500 ease-out", isLimitless ? "stroke-amber-400" : "stroke-indigo-600")}
                      strokeWidth="3.5"
                      strokeDasharray={2 * Math.PI * 20}
                      strokeDashoffset={2 * Math.PI * 20 - (percentage / 100) * 2 * Math.PI * 20}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className={cn("absolute text-[9px] font-black", isLimitless ? "text-amber-500" : "text-indigo-600")}>
                    {goal.done_today}/{goal.daily_target}
                  </span>
                </div>

                <div className="min-w-0 text-left">
                  <h4 className="text-xs font-black text-slate-800 truncate leading-snug">{goal.quiz_title}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[8px] font-black px-1 py-0.5 rounded bg-orange-50 text-orange-600 border border-orange-100">
                      🔥 {goal.streak_count}D
                    </span>
                    <span className="text-[8px] font-bold text-slate-400">
                      {isLimitless ? "Đã đạt mục tiêu ⚡" : `Còn lại ${goal.daily_target - goal.done_today} câu`}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Link
                  to={`/flashcard/${goal.deck_id}/play`}
                  className="w-8.5 h-8.5 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-100 hover:scale-105 active:scale-95 transition-all"
                  title="Spaced Repetition"
                >
                  <Brain className="w-4 h-4" />
                </Link>
                <button
                  onClick={() => {
                    setSelectedPracticeQuiz({ id: goal.deck_id, title: goal.quiz_title, questions_count: goal.total_questions })
                    setIsPracticeModalOpen(true)
                  }}
                  className="w-8.5 h-8.5 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-100 hover:scale-105 active:scale-95 transition-all"
                  title="Luyện tập tự do"
                >
                  <Trophy className="w-4 h-4" />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  if (isLoading || !data) return (
    <div className="h-screen flex items-center justify-center font-black animate-pulse text-indigo-600 tracking-widest uppercase bg-[#fafbfd]">
      🚀 NEURAL SYNCING...
    </div>
  )

  return (
    <div className="flex flex-col bg-gradient-to-br from-[#f8fafc] via-[#f1f6fa] to-[#f8fafc] min-h-[calc(100vh-6rem)] relative overflow-x-hidden md:overflow-hidden md:min-h-0 md:h-full">

      {/* Soft blobs */}
      <div className="absolute top-[20%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-indigo-200/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-pink-200/10 blur-[130px] pointer-events-none" />

      {/* MOBILE HEADER */}
      <div className="fixed top-0 left-0 right-0 z-[150] bg-white/75 backdrop-blur-3xl border-b border-slate-200/40 md:hidden flex-shrink-0 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.02)]">
        <div className="px-5 py-3.5 flex items-center justify-between gap-4">
          {/* Logo & Brand Vocaburn on the Left */}
          <Link to="/" className="flex items-center gap-2 group flex-shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20 group-hover:rotate-12 transition-transform">
              <BookOpen className="w-5 h-5" />
            </div>
            <span className="text-xs font-black tracking-wider text-slate-800 uppercase">
              Voca<span className="text-orange-500">burn</span>
            </span>
          </Link>

          {/* User Info & Avatar on the Right */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <h1 className="text-[12px] font-black text-slate-900 leading-none mb-1.5">Hello {data.user?.username}! 👋</h1>
              <div className="flex items-center gap-1.5 justify-end">
                <span className="flex items-center gap-0.5 px-2 py-0.5 bg-indigo-50 border border-indigo-100/30 rounded-lg text-[8px] font-black text-indigo-600 uppercase tracking-wider shadow-sm">
                  <BrainCircuit className="w-2.5 h-2.5" />
                  LVL {data.gamify?.level}
                </span>
                <span className="flex items-center gap-0.5 px-2 py-0.5 bg-orange-50 border border-orange-100/30 rounded-lg text-[8px] font-black text-orange-650 uppercase tracking-wider shadow-sm">
                  <Flame className="w-2.5 h-2.5 text-orange-500 fill-orange-500" />
                  {data.gamify?.streak}D Streak
                </span>
              </div>
            </div>
            
            {/* User Avatar (Normal style: square box with User icon) */}
            <Link to="/profile" className="w-11 h-11 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-450 shadow-sm active:scale-95 transition-all hover:bg-slate-100">
              <User className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>

      {/* DESKTOP LAYOUT */}
      <div className="hidden md:flex w-full h-full overflow-hidden px-8 py-6 gap-8">

        {/* LEFT COLUMN: Sidebar */}
        <aside className="w-80 flex-shrink-0 flex flex-col gap-5 h-full overflow-y-auto pr-2 pb-6 scrollbar-thin">

          {/* User profile card */}
          <div className="bg-white border border-slate-200/60 rounded-[2rem] p-6 shadow-sm flex flex-col gap-4 text-left relative overflow-hidden flex-shrink-0">
            <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full bg-indigo-50/40 blur-md pointer-events-none" />

            <div className="flex items-center gap-3.5 z-10">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-md text-2xl shadow-indigo-100">
                👋
              </div>
              <div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Welcome back</span>
                <h2 className="text-base font-black text-slate-800 leading-tight mt-0.5 truncate max-w-[170px]">
                  {data.user?.username}
                </h2>
              </div>
            </div>

            <div className="flex flex-col gap-2 mt-1">
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-orange-50 to-amber-50/50 border border-orange-100 rounded-2xl shadow-sm">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-500 animate-pulse" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Streak</span>
                </div>
                <span className="text-xs font-black text-orange-600 bg-white px-2.5 py-1 rounded-xl border border-orange-200">{data.gamify?.streak} ngày 🔥</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-indigo-50 to-purple-50/50 border border-indigo-100 rounded-2xl shadow-sm">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-indigo-500" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Level</span>
                </div>
                <span className="text-xs font-black text-indigo-600 bg-white px-2.5 py-1 rounded-xl border border-indigo-200">Lvl {data.gamify?.level} ⭐</span>
              </div>

              {/* XP progress to next level */}
              <div className="px-1">
                <div className="flex justify-between text-[8px] font-black text-slate-400 mb-1">
                  <span>{data.gamify?.xp} XP</span>
                  <span>{(data.gamify?.level || 1) * 1000} XP next lv</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all"
                    style={{ width: `${Math.min(100, ((data.gamify?.xp || 0) % 1000) / 10)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Heatmap */}
          {heatmapData && heatmapData.length > 0 && <MiniHeatmap data={heatmapData} />}

          {/* Studio Manage shortcut */}
          <div className="bg-white border border-slate-200/60 rounded-[2rem] p-5 shadow-sm flex flex-col gap-3 text-left flex-shrink-0">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Quản lý bộ thẻ</span>
            <Link
              to="/manage"
              className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-md shadow-slate-200 flex items-center justify-center gap-2 active:scale-95"
            >
              <LayoutGrid className="w-4 h-4" />
              Creator Studio
            </Link>
          </div>
        </aside>

        {/* RIGHT COLUMN: Today's targets */}
        <section className="flex-1 h-full flex flex-col gap-5 overflow-y-auto pr-2 scrollbar-thin text-left pb-8">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight italic">Mục tiêu hôm nay</h2>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-0.5">Today's Study Targets & Goals</p>
            </div>
            <Link
              to="/library"
              className="h-10 px-5 bg-white border border-slate-200/80 rounded-xl text-[10px] font-black text-indigo-600 uppercase tracking-wider hover:bg-slate-50 active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-sm"
            >
              Thư Viện 📚
            </Link>
          </div>

          {/* Global Study Goals Widget (Includes individual deck targets & actions) */}
          {globalGoals && (
            <TodayFocusWidget
              data={globalGoals}
              activeGoals={activeGoals}
              todayReview={todayReview}
              onOpenSettings={() => setIsGoalModalOpen(true)}
              onStartPractice={(quiz) => {
                setSelectedPracticeQuiz(quiz)
                setIsPracticeModalOpen(true)
              }}
              navigate={navigate}
            />
          )}

          <ReviewForecastWidget data={forecastData} />

          {/* Badge Progress Roadmap */}
          {badgesProgress && <BadgeProgressWidget data={badgesProgress} />}

          {/* Leaderboard */}
          {leaderboardData && leaderboardData.leaderboard?.length > 0 && (
            <LeaderboardWidget data={leaderboardData} activeFilter={timeFilter} onFilterChange={setTimeFilter} />
          )}
        </section>
      </div>

      {/* MOBILE FEED */}
      <div className="md:hidden px-4 w-full pt-[80px] flex-grow space-y-4 overflow-y-auto pb-24">
        {/* Global Study Goals Widget (Includes individual deck targets & actions) */}
        {globalGoals && (
          <TodayFocusWidget
            data={globalGoals}
            activeGoals={activeGoals}
            todayReview={todayReview}
            onOpenSettings={() => setIsGoalModalOpen(true)}
            onStartPractice={(quiz) => {
              setSelectedPracticeQuiz(quiz)
              setIsPracticeModalOpen(true)
            }}
            navigate={navigate}
          />
        )}

        <ReviewForecastWidget data={forecastData} />

        {/* Badge Progress Roadmap */}
        {badgesProgress && <BadgeProgressWidget data={badgesProgress} />}

        {/* Leaderboard */}
        {leaderboardData && leaderboardData.leaderboard?.length > 0 && (
          <LeaderboardWidget data={leaderboardData} activeFilter={timeFilter} onFilterChange={setTimeFilter} />
        )}

        {/* Heatmap */}
        {heatmapData && heatmapData.length > 0 && <MiniHeatmap data={heatmapData} />}
      </div>

      {/* JOIN ROOM MODAL */}
      <AnimatePresence>
        {isJoinModalOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsJoinModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl relative z-10 p-8 border border-slate-100"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-base font-black text-slate-800 uppercase tracking-widest">Enter Arena Room</h3>
                <button onClick={() => setIsJoinModalOpen(false)} className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Enter Arena Room Code</label>
                  <input
                    type="text"
                    placeholder="e.g. AZ78K"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    className="w-full h-16 bg-slate-50 border-2 border-slate-200 rounded-2xl px-6 text-2xl font-black tracking-[0.3em] text-center text-indigo-600 focus:border-indigo-500 focus:bg-white outline-none transition-all placeholder:text-slate-300 placeholder:tracking-normal placeholder:text-sm"
                  />
                </div>

                <button
                  onClick={handleJoinRoom}
                  disabled={!roomCode || isJoining}
                  className="w-full h-14 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 disabled:bg-slate-200 disabled:shadow-none"
                >
                  {isJoining ? 'CONNECTING...' : 'ENTER ROOM NOW'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* PRACTICE MODE SELECTOR MODAL */}
        {isPracticeModalOpen && selectedPracticeQuiz && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPracticeModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl relative z-10 p-8 border border-slate-100 text-left overflow-hidden"
            >
              <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-emerald-100/40 blur-2xl pointer-events-none" />

              <div className="flex items-center justify-between mb-5 relative z-10">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest leading-none mb-1">Practice Mode</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Chọn chế độ luyện tập</p>
                  </div>
                </div>
                <button onClick={() => setIsPracticeModalOpen(false)} className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200/50 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4 relative z-10">
                <div className="bg-slate-50/60 rounded-2xl p-4 border border-slate-100 mb-2">
                  <h4 className="text-xs font-black text-indigo-600 leading-snug line-clamp-1">{selectedPracticeQuiz.title}</h4>
                  <p className="text-[9px] text-slate-400 uppercase tracking-wider font-black mt-0.5 flex items-center gap-1">
                    <BrainCircuit className="w-3 h-3 text-slate-400" />
                    {selectedPracticeQuiz.questions_count} câu hỏi có sẵn
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <button
                    onClick={() => {
                      setIsPracticeModalOpen(false)
                      navigate(`/practice/${selectedPracticeQuiz.id}/mcq`)
                    }}
                    className="group w-full flex items-center gap-4 p-4 rounded-[1.75rem] border border-slate-200/60 bg-white hover:border-emerald-500 hover:bg-emerald-50/10 active:scale-[0.98] transition-all text-left shadow-sm"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100/50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all flex-shrink-0">
                      <LayoutGrid className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider block mb-0.5 group-hover:text-indigo-600 transition-colors">Trắc nghiệm (MCQ)</span>
                      <span className="text-[9px] font-medium text-slate-400 block line-clamp-1">Luyện tập phản xạ nhanh với 4 lựa chọn có sẵn</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
                  </button>

                  <button
                    onClick={() => {
                      setIsPracticeModalOpen(false)
                      navigate(`/practice/${selectedPracticeQuiz.id}/typing`)
                    }}
                    className="group w-full flex items-center gap-4 p-4 rounded-[1.75rem] border border-slate-200/60 bg-white hover:border-emerald-500 hover:bg-emerald-50/10 active:scale-[0.98] transition-all text-left shadow-sm"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100/50 flex items-center justify-center text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition-all flex-shrink-0">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider block mb-0.5 group-hover:text-rose-600 transition-colors">Gõ từ vựng (Typing)</span>
                      <span className="text-[9px] font-medium text-slate-400 block line-clamp-1">Gõ trực tiếp ký tự Kanji, Hiragana hoặc Romaji để ghi nhớ sâu</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
                  </button>

                  <button
                    onClick={() => {
                      setIsPracticeModalOpen(false)
                      navigate(`/practice/${selectedPracticeQuiz.id}/listening`)
                    }}
                    className="group w-full flex items-center gap-4 p-4 rounded-[1.75rem] border border-slate-200/60 bg-white hover:border-emerald-500 hover:bg-emerald-50/10 active:scale-[0.98] transition-all text-left shadow-sm"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100/50 flex items-center justify-center text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-all flex-shrink-0">
                      <Play className="w-5 h-5 fill-amber-600 group-hover:fill-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider block mb-0.5 group-hover:text-amber-600 transition-colors">Luyện nghe (Listening)</span>
                      <span className="text-[9px] font-medium text-slate-400 block line-clamp-1">Nghe phát âm chuẩn và chọn đáp án đúng cực nhạy</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Global Goals Settings Modal */}
        {globalGoals && (
          <GoalSettingsModal
            isOpen={isGoalModalOpen}
            onClose={() => setIsGoalModalOpen(false)}
            initialTime={globalGoals.daily_time_target}
            initialCard={globalGoals.daily_card_target}
            initialNewCard={globalGoals.daily_new_card_target}
            onSave={handleSaveGlobalGoals}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
