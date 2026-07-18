import React, { useState, useEffect, useMemo, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Brain, Trophy, ChevronRight, LayoutGrid, Users, Zap, Flame, BrainCircuit, X, Play, Crown, Medal, Star, CheckCircle2, Circle, Swords, Settings, Target, RefreshCw, User, BookOpen, Sparkles, TrendingUp, Clock, Layers, Compass } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import DailyComparisonChart from '@/components/DailyComparisonChart'



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
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">🏆 Leaderboard</span>
          
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
              Time
            </button>
            <button
              onClick={() => setActiveTab('new_cards')}
              className={cn(
                "px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider transition-all",
                activeTab === 'new_cards' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
            >
              New
            </button>
            <button
              onClick={() => setActiveTab('cards')}
              className={cn(
                "px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider transition-all",
                activeTab === 'cards' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
            >
              Reviews
            </button>
          </div>
        </div>

        {/* Time Filters */}
        <div className="flex items-center gap-1.5 self-start">
          {[
            { id: 'today', label: 'Today' },
            { id: 'week', label: 'This Week' },
            { id: 'all_time', label: 'All Time' }
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
                    {entry.username} {entry.is_current_user && '(You)'}
                  </span>
                  {activeTab === 'xp' ? (
                    <span className="text-[8px] font-bold text-slate-400 flex items-center gap-1">
                      Lvl {entry.level} · 🔥 {entry.streak}d
                    </span>
                  ) : activeTab === 'time' ? (
                    <span className="text-[8px] font-bold text-slate-400 flex items-center gap-1">
                      Total study time
                    </span>
                  ) : activeTab === 'new_cards' ? (
                    <span className="text-[8px] font-bold text-slate-400 flex items-center gap-1">
                      Total new cards
                    </span>
                  ) : (
                    <span className="text-[8px] font-bold text-slate-400 flex items-center gap-1">
                      Total card reviews
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
                          ? `${entry.new_cards || 0} cards` 
                          : `${entry.total_cards || 0} reviews`}
                  </span>
                  <span className="text-[7px] font-black text-slate-400 block">
                    {activeTab === 'xp' ? 'XP' : activeTab === 'time' ? 'STUDIED' : activeTab === 'new_cards' ? 'NEW' : 'REVIEWS'}
                  </span>
                </div>
              </div>
            </React.Fragment>
          )
        })}
        {currentList.length === 0 && (
          <div className="py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
            No data available
          </div>
        )}
      </div>

      {currentRank && (
        <div className="pt-1 border-t border-slate-100 text-center mt-2">
          <span className="text-[9px] font-black text-slate-400">
            Your rank: <span className="text-indigo-600 font-extrabold">#{currentRank}</span> system-wide
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
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Achievements Roadmap</span>
          <span className="text-[8px] font-black text-indigo-600 uppercase tracking-wider block mt-0.5">
            🏆 Near Completion
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
      "rounded-[2rem] p-5 md:p-8 text-left mb-6 flex-shrink-0 transition-all duration-700 bg-white shadow-sm border border-slate-100",
      hasRoadmaps ? "shadow-[0_20px_50px_rgba(99,102,241,0.02)]" : ""
    )}>
      <div className="flex items-center justify-between mb-5 relative z-10">
        <div>
          <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-xl text-indigo-600 bg-indigo-50 inline-block">
            🎯 LỘ TRÌNH HỌC HÔM NAY
          </span>
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight mt-2 font-bold">Mục tiêu học tập hàng ngày</h3>
        </div>
      </div>

      {!hasRoadmaps ? (
        <div className="text-center py-12 bg-slate-50/50 rounded-[2rem] border border-dashed border-slate-200/80">
          <div className="w-14 h-14 rounded-full bg-indigo-50 flex items-center justify-center mx-auto mb-4 text-indigo-500 shadow-inner">
            <Compass className="w-7 h-7 animate-pulse" />
          </div>
          <span className="text-xs font-black text-slate-700 block uppercase tracking-wider">Bạn chưa kích hoạt Lộ trình học nào.</span>
          <p className="text-[10px] text-slate-400 mt-2 max-w-xs mx-auto font-bold uppercase tracking-wider leading-relaxed">Hãy chọn một bộ thẻ từ thư viện và bật "Lộ trình học" để hệ thống tự động thiết lập mục tiêu hàng ngày cho bạn.</p>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/library')}
            className="mt-5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-750 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-md shadow-indigo-100 transition-all cursor-pointer"
          >
            📚 Đi tới Thư viện
          </motion.button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {roadmapDecks.map((deck) => {
            const status = deck.status || {};
            const totalLearnedPct = status.total_cards > 0 ? Math.min(100, Math.round((status.learned_cards / status.total_cards) * 100)) : 0;
            const streak = status.streak || 0;
            
            return (
              <div key={deck.deck_id} className="group relative rounded-[2rem] border border-slate-100/80 bg-white hover:shadow-[0_15px_40px_rgba(99,102,241,0.06)] transition-all duration-300 flex flex-col overflow-hidden shadow-sm">
                
                {/* Visual Header / Cover Image Banner */}
                <div className="relative h-32 w-full bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                  {deck.cover_image ? (
                    <img src={deck.cover_image} alt={deck.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center" />
                  )}
                  {/* Subtle Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/20 to-transparent" />
                  
                  {/* Title & Floating Elements inside Image */}
                  <div className="absolute bottom-3.5 left-4 right-4 flex items-end justify-between gap-3 text-white">
                    <h4 className="text-[12px] sm:text-xs font-black uppercase tracking-wider truncate leading-tight drop-shadow-md">{deck.title}</h4>
                    {streak > 0 && (
                      <span className="text-[8px] font-black text-orange-600 bg-white/95 px-2 py-1 rounded-lg flex items-center gap-0.5 shrink-0 shadow-sm leading-none uppercase tracking-wider">
                        🔥 {streak} ngày
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress / stats bar */}
                <div className="p-4 flex flex-col gap-4">
                  <div className="flex items-center justify-between gap-2 text-[8px] font-black text-slate-400 uppercase tracking-widest">
                    <span>Đã học {status.learned_cards}/{status.total_cards} ({totalLearnedPct}%)</span>
                    {status.estimated_completion_date && (
                      <span className="text-emerald-600 bg-emerald-50/80 px-2 py-0.5 rounded-md flex items-center gap-0.5 normal-case font-bold border border-emerald-100/50">
                        🎯 Kết thúc: {new Date(status.estimated_completion_date).toLocaleDateString('vi-VN')}
                      </span>
                    )}
                  </div>
                  
                  <div className="w-full h-2 bg-slate-100/80 rounded-full overflow-hidden shrink-0 p-[1px]">
                    <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-700 ease-out" style={{ width: `${totalLearnedPct}%` }} />
                  </div>

                  {/* Daily Quota Pills */}
                  <div className="grid grid-cols-2 gap-3 mt-1">
                    <div className="bg-orange-50/30 rounded-2xl p-3 border border-orange-100/30 flex items-center justify-between gap-1.5 transition-colors hover:bg-orange-50/50">
                      <div className="min-w-0">
                        <span className="text-[8px] font-black text-orange-600/70 uppercase tracking-widest block">Từ mới</span>
                        <span className="text-[12px] font-black text-slate-800 mt-1 block leading-none">
                          {status.new_learned_today} <span className="text-slate-400 font-bold">/ {status.new_target_today}</span>
                        </span>
                      </div>
                      <div className="relative w-8 h-8 shrink-0 flex items-center justify-center bg-white rounded-xl shadow-sm border border-orange-100/20">
                        <Sparkles className="w-4 h-4 text-orange-500" />
                      </div>
                    </div>

                    <div className="bg-indigo-50/30 rounded-2xl p-3 border border-indigo-100/30 flex items-center justify-between gap-1.5 transition-colors hover:bg-indigo-50/50">
                      <div className="min-w-0">
                        <span className="text-[8px] font-black text-indigo-650/70 uppercase tracking-widest block">Ôn tập</span>
                        <span className="text-[12px] font-black text-slate-800 mt-1 block leading-none">
                          {status.review_completed_today} <span className="text-slate-400 font-bold">/ {status.review_due_today}</span>
                        </span>
                      </div>
                      <div className="relative w-8 h-8 shrink-0 flex items-center justify-center bg-white rounded-xl shadow-sm border border-indigo-100/20">
                        <Brain className="w-4 h-4 text-indigo-500" />
                      </div>
                    </div>
                  </div>

                  {/* Action buttons list */}
                  <div className="flex items-center gap-2 mt-2 pt-4 border-t border-slate-100">
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      onClick={() => navigate(`/flashcard/${deck.deck_id}/play?mode=roadmap`)}
                      className="flex-1 h-9 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1 shadow-md shadow-orange-100/50 border-b-2 border-rose-700 transition-all cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Học lộ trình
                    </motion.button>
                    
                    <motion.button
                      whileTap={{ scale: 0.93 }}
                      onClick={() => navigate(`/flashcard/${deck.deck_id}/play?mode=fsrs`)}
                      className="h-9 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-150/40 text-indigo-650 text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer"
                      title="Học FSRS"
                    >
                      <Brain className="w-3.5 h-3.5" />
                    </motion.button>

                    <motion.button
                      whileTap={{ scale: 0.93 }}
                      onClick={() => {
                        onStartPractice({ id: deck.deck_id, title: deck.title, questions_count: status.total_cards });
                      }}
                      className="h-9 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-150/40 text-emerald-655 text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer"
                      title="Luyện tập tự do"
                    >
                      <Trophy className="w-3.5 h-3.5" />
                    </motion.button>
                  </div>
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
      alert("Lỗi khi lưu mục tiêu bộ thẻ")
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
                <span className="text-[8px] font-black text-indigo-600 uppercase tracking-widest block">Mục tiêu bộ thẻ</span>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight mt-0.5 truncate max-w-[200px]">{deckTitle}</h3>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Thời gian học (phút/ngày)</label>
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
                  placeholder="Nhập số phút (0 = không giới hạn)..."
                />
              </div>

              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Mục tiêu số thẻ học (thẻ/ngày)</label>
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
                      {preset}
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
                  placeholder="Nhập số thẻ (0 = không giới hạn)..."
                />
              </div>

              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Mục tiêu số thẻ mới (thẻ/ngày)</label>
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
                      {preset}
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
                  placeholder="Nhập số thẻ mới (0 = không giới hạn)..."
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
  const [timeFilter, setTimeFilter] = useState('all_time')
  const [activeMobileTab, setActiveMobileTab] = useState<'study' | 'stats'>('study')
  const carouselRef = useRef<HTMLDivElement>(null)
  const scrollCarousel = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const scrollAmount = 240;
      carouselRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  }

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
          // Update existing deck with FSRS info if applicable
          const existing = list.find(item => item.deck_id === d.deck_id);
          if (existing) {
            existing.new_remaining += d.new_count || 0;
            existing.review_remaining += d.due_count || 0;
            existing.has_due = existing.has_due || (d.new_count > 0 || d.due_count > 0);
          }
        }
      });
    }
    
    return list;
  }, [roadmapDecks, todayReview]);

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

  const { data: dailyComparisonRaw, isLoading: isDailyComparisonLoading } = useQuery<any>({
    queryKey: ['dailyComparison'],
    queryFn: async () => {
      const res = await axios.get('/api/v1/stats/daily-comparison')
      return res.data
    }
  })
  const dailyComparisonData = dailyComparisonRaw?.days
  const dailyComparisonAvg = dailyComparisonRaw?.all_time_avg



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

      {/* MOBILE HEADER */}
      <div className="fixed top-0 left-0 right-0 z-[150] bg-white/95 backdrop-blur-md border-b border-slate-100 md:hidden flex-shrink-0">
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

      {/* DESKTOP LAYOUT */}
      <div className="hidden md:flex w-full h-full overflow-hidden px-8 py-6 gap-8">

        {/* LEFT COLUMN: Sidebar */}
        <aside className="w-80 flex-shrink-0 flex flex-col gap-5 h-full overflow-y-auto pr-2 pb-6 scrollbar-thin">

          {/* User profile card */}
          <div className="bg-white/40 backdrop-blur-md border border-white/40 rounded-[2rem] p-6 shadow-sm shadow-slate-100/40 flex flex-col gap-4 text-left relative overflow-hidden flex-shrink-0">
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
              <div className="flex items-center justify-between p-3.5 bg-[#F8FAFC]/75 border-none rounded-2xl transition-colors hover:bg-[#F8FAFC]">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-500 animate-pulse" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Streak</span>
                </div>
                <span className="text-xs font-black text-orange-655 bg-white px-3 py-1 rounded-xl shadow-sm border border-slate-100/50">{data.gamify?.streak} ngày 🔥</span>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-[#F8FAFC]/75 border-none rounded-2xl transition-colors hover:bg-[#F8FAFC]">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-indigo-500" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Level</span>
                </div>
                <span className="text-xs font-black text-indigo-650 bg-white px-3 py-1 rounded-xl shadow-sm border border-slate-100/50">Lvl {data.gamify?.level} ⭐</span>
              </div>

              {/* XP progress to next level */}
              <div className="px-1 mt-1.5">
                <div className="flex justify-between text-[8px] font-black text-slate-400 mb-1.5">
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

          {/* Leaderboard */}
          {leaderboardData && leaderboardData.leaderboard?.length > 0 && (
            <LeaderboardWidget data={leaderboardData} activeFilter={timeFilter} onFilterChange={setTimeFilter} />
          )}

        </aside>

        {/* MAIN FEED: Scrollable container */}
        <section className="flex-1 h-full flex flex-col gap-5 overflow-y-auto pr-2 scrollbar-thin text-left pb-8">
          
          <TodayFocusWidget
            roadmapDecks={roadmapDecks}
            onStartPractice={(quiz) => {
              setSelectedPracticeQuiz(quiz)
              setIsPracticeModalOpen(true)
            }}
            navigate={navigate}
          />

          {/* Charts Side-by-Side Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 w-full">
            <ReviewForecastWidget data={forecastData} />
            <DailyComparisonChart data={dailyComparisonData} allTimeAvg={dailyComparisonAvg} isLoading={isDailyComparisonLoading} />
          </div>

          {/* Badge Progress Roadmap Footer */}
          {badgesProgress && <BadgeProgressWidget data={badgesProgress} />}
        </section>
      </div>

      {/* MOBILE FEED */}
      <div className="md:hidden px-4 w-full pt-[60px] flex-grow space-y-4 overflow-y-auto pb-28 scrollbar-none text-left bg-gradient-to-b from-slate-50/60 via-indigo-50/10 to-slate-50/80">

        {/* ── Circular Daily Goal Widget ── */}
        {(() => {
          const hasRoadmaps = roadmapDecks && roadmapDecks.length > 0;
          const fsrsDueCount = todayReview?.due_cards_count || 0;
          const estMinutes = todayReview?.estimated_minutes || 0;
          const streakAtRisk = todayReview?.streak_at_risk || 0;

          // If no active roadmap decks and no FSRS cards due
          if (!hasRoadmaps && fsrsDueCount === 0) {
            return (
              <div className="bg-white rounded-[2rem] p-6 text-center border border-slate-100 shadow-sm flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-3">
                  <Compass className="w-6 h-6 text-slate-400" />
                </div>
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">Bạn chưa kích hoạt lộ trình học nào</h3>
                <p className="text-[10px] text-slate-400 mt-2 leading-relaxed max-w-[260px] mx-auto">
                  Hãy chọn một bộ thẻ từ thư viện và bật "Lộ trình học" để hệ thống tự động thiết lập mục tiêu hàng ngày cho bạn.
                </p>
                <button
                  onClick={() => navigate('/library')}
                  className="mt-4 px-6 h-11 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all active:scale-[0.98] shadow-sm shadow-indigo-100"
                >
                  Đi tới Thư viện
                </button>
              </div>
            );
          }

          // Case: User has NO active roadmap goals, but has FSRS cards to review!
          if (!hasRoadmaps && fsrsDueCount > 0) {
            return (
              <div className="bg-white rounded-[2rem] p-5 border border-slate-100 shadow-sm flex items-center gap-4 relative overflow-hidden">
                <div className="absolute right-[-10%] top-[-20%] w-24 h-24 rounded-full bg-indigo-50/10 blur-xl pointer-events-none" />
                
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 flex-shrink-0 border border-indigo-100/50">
                  <Brain className="w-6 h-6 text-indigo-600 animate-pulse" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[8.5px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-650 border border-indigo-100/30">
                      ⚡ Chế độ FSRS
                    </span>
                    {estMinutes > 0 && (
                      <span className="text-[8.5px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                        ⏱️ ~{estMinutes}m
                      </span>
                    )}
                  </div>
                  <h2 className="text-[13px] font-black text-slate-800 leading-snug">Bạn có thẻ đến hạn ôn tập FSRS</h2>
                  <p className="text-[10px] font-bold text-rose-500 mt-0.5">Số thẻ cần ôn tập: {fsrsDueCount} thẻ</p>
                </div>
              </div>
            );
          }

          // Case: User has active roadmap goals! Show the circular progress widget tracking today's progress.
          const totalNew = roadmapDecks?.reduce((sum: number, d: any) => sum + (d.status?.new_target_today || 0), 0) || 0;
          const totalNewDone = roadmapDecks?.reduce((sum: number, d: any) => sum + (d.status?.new_learned_today || 0), 0) || 0;
          const totalReview = roadmapDecks?.reduce((sum: number, d: any) => sum + (d.status?.review_due_today || 0), 0) || 0;
          const totalReviewDone = roadmapDecks?.reduce((sum: number, d: any) => sum + (d.status?.review_completed_today || 0), 0) || 0;

          const totalTasks = totalNew + totalReview;
          const totalDone = totalNewDone + totalReviewDone;
          const percentComplete = totalTasks > 0 
            ? Math.min(100, Math.round((totalDone / totalTasks) * 100)) 
            : 100;
          const allFinished = totalTasks > 0 && totalDone >= totalTasks;

          const radius = 32;
          const strokeWidth = 6;
          const circumference = 2 * Math.PI * radius;
          const strokeDashoffset = circumference - (circumference * percentComplete) / 100;

          return (
            <div className="bg-white rounded-[2rem] p-5 border border-slate-100 shadow-sm flex items-center gap-5 relative overflow-hidden">
              <div className="absolute right-[-10%] top-[-20%] w-24 h-24 rounded-full bg-indigo-50/15 blur-xl pointer-events-none" />
              
              {/* SVG Circular Progress */}
              <div className="relative w-20 h-20 flex-shrink-0 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="40"
                    cy="40"
                    r={radius}
                    fill="transparent"
                    stroke="#f1f5f9"
                    strokeWidth={strokeWidth}
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r={radius}
                    fill="transparent"
                    stroke="#6366f1"
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-xs font-black text-slate-800">{percentComplete}%</span>
                  <span className="text-[7.5px] font-bold text-slate-400 uppercase tracking-wider">Tiến độ</span>
                </div>
              </div>

              {/* Goal Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[8.5px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100/50">
                    🎯 Hôm nay
                  </span>
                  {estMinutes > 0 && (
                    <span className="text-[8.5px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                      ⏱️ {estMinutes}m
                    </span>
                  )}
                  {streakAtRisk && (
                    <span className="text-[8.5px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-500 animate-pulse border border-rose-100/30">
                      🔥 Sắp mất streak
                    </span>
                  )}
                </div>
                
                <h2 className="text-[13px] font-black text-slate-800 leading-snug tracking-tight">
                  {allFinished ? "Tất cả mục tiêu đã hoàn thành! 🎉" : "Tiến độ học tập theo lộ trình"}
                </h2>
                
                <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold mt-1.5">
                  <span>Học mới: <span className="text-indigo-650 font-black">{totalNewDone}/{totalNew}</span></span>
                  <span className="text-slate-200">·</span>
                  <span>Ôn tập: <span className="text-indigo-650 font-black">{totalReviewDone}/{totalReview}</span></span>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── Active Deck Quick-Resume Banner ── */}
        {(() => {
          const activeDeck = activeDecks?.[0];
          if (!activeDeck) return null;

          return (
            <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 border border-indigo-500/25 rounded-[2.25rem] p-5 text-white shadow-lg shadow-indigo-950/20 relative overflow-hidden">
              <div className="absolute right-[-10%] top-[-20%] w-28 h-28 rounded-full bg-white/10 blur-xl pointer-events-none" />
              <div className="absolute left-[-10%] bottom-[-20%] w-20 h-20 rounded-full bg-white/10 blur-xl pointer-events-none" />
              
              <div className="flex items-center justify-between mb-2">
                <span className="text-[8.5px] font-black uppercase tracking-widest text-indigo-200 bg-white/10 px-2.5 py-0.5 rounded-full">
                  🔥 Học tiếp
                </span>
                {activeDeck.has_due && (
                  <span className="text-[8.5px] font-black uppercase tracking-widest text-amber-300 bg-amber-400/10 px-2.5 py-0.5 rounded-full animate-pulse border border-amber-400/20">
                    Hôm nay: {activeDeck.new_remaining > 0 ? `${activeDeck.new_remaining} mới` : ''}{activeDeck.new_remaining > 0 && activeDeck.review_remaining > 0 ? ', ' : ''}{activeDeck.review_remaining > 0 ? `${activeDeck.review_remaining} ôn` : ''}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 mt-3">
                <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-2xl border border-white/10 flex-shrink-0 overflow-hidden">
                  {activeDeck.cover_image ? (
                    <img src={activeDeck.cover_image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span>📘</span>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-black truncate leading-tight">{activeDeck.title}</h3>
                  <p className="text-[10px] text-indigo-100 font-bold mt-1">
                    Tiến độ: {activeDeck.learned_cards}/{activeDeck.total_cards} thẻ ({activeDeck.total_pct}%)
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 bg-white/15 rounded-full overflow-hidden mt-4 mb-4">
                <div 
                  className="h-full bg-white rounded-full transition-all" 
                  style={{ width: `${activeDeck.total_pct}%` }} 
                />
              </div>

              <button
                onClick={() => {
                  if (todayReview?.due_cards_count > 0 && todayReview?.decks_summary?.[0]?.deck_id === activeDeck.deck_id) {
                    navigate(`/flashcard/${activeDeck.deck_id}/play?mode=fsrs`);
                  } else {
                    navigate(`/flashcard/${activeDeck.deck_id}/play?mode=${activeDeck.has_due ? 'roadmap' : 'fsrs'}`);
                  }
                }}
                className="w-full h-11 bg-white hover:bg-slate-50 text-indigo-700 font-black text-[11px] rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Play className="w-3 h-3 fill-current" />
                HỌC TIẾP NGAY
              </button>
            </div>
          );
        })()}

        {/* ── Horizontal Decks Carousel ── */}
        {activeDecks && activeDecks.length > 1 && (
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Các bộ thẻ đang học</h3>
              {activeDecks.length > 2 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => scrollCarousel('left')}
                    className="w-6 h-6 rounded-full bg-white border border-slate-150 flex items-center justify-center text-[10px] font-black text-slate-500 shadow-sm active:scale-90 transition-all hover:bg-slate-50"
                    title="Cuộn trái"
                  >
                    ❮
                  </button>
                  <button
                    onClick={() => scrollCarousel('right')}
                    className="w-6 h-6 rounded-full bg-white border border-slate-150 flex items-center justify-center text-[10px] font-black text-slate-500 shadow-sm active:scale-90 transition-all hover:bg-slate-50"
                    title="Cuộn phải"
                  >
                    ❯
                  </button>
                </div>
              )}
            </div>

            <div 
              ref={carouselRef}
              className="flex overflow-x-auto gap-4 pb-2 px-1 snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
              {activeDecks.slice(1).map((deck: any) => {
                return (
                  <div
                    key={deck.deck_id}
                    onClick={() => navigate(`/flashcard/${deck.deck_id}`)}
                    className="bg-white rounded-2xl border border-slate-100 p-4 shadow-[0_2px_10px_rgba(0,0,0,0.01)] active:bg-slate-50/80 transition-all cursor-pointer flex-shrink-0 w-[230px] snap-start flex flex-col justify-between"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-lg flex-shrink-0 overflow-hidden border border-slate-100">
                        {deck.cover_image ? (
                          <img src={deck.cover_image} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span>📘</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[12px] font-bold text-slate-800 truncate leading-snug">{deck.title}</h4>
                        <span className="text-[9px] font-bold text-slate-400 mt-0.5 block">{deck.learned_cards}/{deck.total_cards} thẻ ({deck.total_pct}%)</span>
                      </div>
                    </div>

                    <div>
                      {/* Progress bar */}
                      <div className="h-1 bg-slate-100 rounded-full overflow-hidden mb-2.5">
                        <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${deck.total_pct}%` }} />
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black text-indigo-650 bg-indigo-50/50 px-2 py-0.5 rounded-md">
                          {deck.has_due ? 'Còn hạn học' : 'Đã xong'}
                        </span>
                        {deck.has_due && (
                          <span className="text-[9px] font-bold text-rose-500">
                            {deck.new_remaining > 0 ? `${deck.new_remaining} mới` : ''}{deck.new_remaining > 0 && deck.review_remaining > 0 ? ', ' : ''}{deck.review_remaining > 0 ? `${deck.review_remaining} ôn` : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Heatmap & Leaderboard directly integrated underneath ── */}
        {heatmapData && heatmapData.length > 0 && (
          <div className="pt-2">
            <MiniHeatmap data={heatmapData} />
          </div>
        )}

        {leaderboardData && leaderboardData.leaderboard?.length > 0 && (
          <div className="pt-1 pb-4">
            <LeaderboardWidget data={leaderboardData} activeFilter={timeFilter} onFilterChange={setTimeFilter} />
          </div>
        )}

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


      </AnimatePresence>
    </div>
  )
}
