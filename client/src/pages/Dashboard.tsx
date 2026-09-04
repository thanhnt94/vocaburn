import React, { useState, useEffect, useMemo, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Brain, Trophy, ChevronRight, LayoutGrid, Users, Zap, Flame, BrainCircuit, X, Play, Crown, Medal, Star, CheckCircle2, Circle, Swords, Settings, Target, RefreshCw, User, BookOpen, Sparkles, TrendingUp, Clock, Layers, Compass, ArrowRight, FileText, RotateCcw, Search, Plus, ArrowDown, Calendar, Keyboard, Volume2 } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import DailyComparisonChart from '@/components/DailyComparisonChart'
import { VocaburnLogo } from '@/components/VocaburnLogo'
import { TelegramRoadmapReminderToggle } from '@/components/TelegramRoadmapReminderToggle'
import { JoinRoomModal } from '@/components/dashboard/JoinRoomModal'
import { PracticeModeModal } from '@/components/dashboard/PracticeModeModal'
import { StudyModeModal } from '@/components/dashboard/StudyModeModal'



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
function LeaderboardWidget({ 
  data, 
  activeFilter, 
  onFilterChange 
}: { 
  data: any, 
  activeFilter: string, 
  onFilterChange: (f: any) => void 
}) {
  const [activeTab, setActiveTab] = useState<'xp' | 'time' | 'new_cards' | 'cards'>('xp')

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const mins = Math.floor(seconds / 60)
    const hours = Math.floor(mins / 60)
    if (hours > 0) return `${hours}h ${mins % 60}m`
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
    <div className="bg-white border border-neutral-100 rounded-3xl p-4 shadow-[0_4px_25px_rgba(0,0,0,0.03)] flex flex-col gap-3.5 text-left flex-shrink-0">
      
      {/* Header & Controls */}
      <div className="flex flex-col gap-2.5 pb-2.5 border-b border-neutral-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-amber-50 border border-amber-200/50 flex items-center justify-center text-amber-500 shadow-2xs">
              <Trophy className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-xs font-bold text-slate-800">
              Bảng Xếp Hạng
            </h3>
          </div>

          {/* Metric Switcher Segmented Control */}
          <div className="flex items-center bg-neutral-100/80 p-0.5 rounded-full border border-neutral-200/40">
            {[
              { id: 'xp', label: 'XP' },
              { id: 'time', label: 'Thời gian' },
              { id: 'new_cards', label: 'Từ mới' },
              { id: 'cards', label: 'Ôn tập' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  if (navigator.vibrate) navigator.vibrate(6);
                  setActiveTab(tab.id as any);
                }}
                className={cn(
                  "px-2.5 py-0.5 rounded-full text-[9px] font-medium transition-all cursor-pointer",
                  activeTab === tab.id
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-neutral-500 hover:text-slate-700"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Time Filters Pills */}
        <div className="flex items-center gap-1.5 self-start">
          {[
            { id: 'today', label: 'Hôm nay' },
            { id: 'week', label: 'Tuần này' },
            { id: 'all_time', label: 'Tất cả' }
          ].map(filter => (
            <button
              key={filter.id}
              onClick={() => {
                if (navigator.vibrate) navigator.vibrate(6);
                onFilterChange(filter.id);
              }}
              className={cn(
                "px-3 py-0.5 rounded-full text-[10px] font-medium transition-all cursor-pointer",
                activeFilter === filter.id
                  ? "bg-amber-500 text-white font-bold shadow-xs shadow-amber-200"
                  : "bg-neutral-100/70 text-neutral-500 hover:bg-neutral-200/60"
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* User Rank List (Subtle Luxury Cards) */}
      <div className="flex flex-col gap-2">
        {currentList.map((entry: any) => {
          const isRank1 = entry.rank === 1;
          const isRank2 = entry.rank === 2;
          const isRank3 = entry.rank === 3;
          const isCurrentUser = entry.is_current_user;

          return (
            <div
              key={entry.user_id}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-2xl border transition-all relative overflow-hidden',
                isCurrentUser
                  ? 'bg-amber-50/70 border-amber-300/80 shadow-xs ring-1 ring-amber-400/30'
                  : isRank1
                    ? 'bg-amber-50/40 border-amber-200/60 shadow-2xs'
                    : isRank2
                      ? 'bg-neutral-50/60 border-neutral-200/50'
                      : isRank3
                        ? 'bg-amber-900/5 border-amber-900/10'
                        : 'bg-white border-neutral-100 hover:border-neutral-200'
              )}
            >
              {/* Rank Icon Badge */}
              <div className="w-6 h-6 rounded-lg flex items-center justify-center font-bold shrink-0 text-xs">
                {isRank1 ? (
                  <span className="text-sm">👑</span>
                ) : isRank2 ? (
                  <span className="text-sm">🥈</span>
                ) : isRank3 ? (
                  <span className="text-sm">🥉</span>
                ) : (
                  <span className="text-[10px] font-medium text-neutral-400">#{entry.rank}</span>
                )}
              </div>

              {/* Avatar Circle */}
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 shadow-2xs',
                isCurrentUser
                  ? 'bg-amber-500 text-white'
                  : isRank1
                    ? 'bg-amber-400 text-white'
                    : isRank2
                      ? 'bg-slate-300 text-slate-700'
                      : isRank3
                        ? 'bg-amber-700 text-white'
                        : 'bg-neutral-200 text-slate-600'
              )}>
                {entry.username.slice(0, 2).toUpperCase()}
              </div>

              {/* User Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={cn(
                    'text-xs font-bold truncate',
                    isCurrentUser ? 'text-amber-950' : 'text-slate-800'
                  )}>
                    {entry.username}
                  </span>
                  {isCurrentUser && (
                    <span className="text-[8px] font-bold px-1.5 py-0.2 bg-amber-500 text-white rounded-full uppercase tracking-wider">
                      Bạn
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium text-neutral-400 flex items-center gap-1 mt-0.5">
                  Lv {entry.level} · 🔥 {entry.streak}d
                </span>
              </div>

              {/* Value Badge */}
              <div className="shrink-0 text-right">
                <span className={cn(
                  'text-xs font-bold block',
                  isRank1 ? 'text-amber-600' : isCurrentUser ? 'text-amber-600' : 'text-slate-800'
                )}>
                  {activeTab === 'xp' 
                    ? entry.xp.toLocaleString() 
                    : activeTab === 'time' 
                      ? formatTime(entry.total_time || 0) 
                      : activeTab === 'new_cards' 
                        ? `${entry.new_cards || 0}` 
                        : `${entry.total_cards || 0}`}
                </span>
                <span className="text-[7px] font-semibold text-neutral-400 uppercase tracking-wider">
                  {activeTab === 'xp' ? 'XP' : activeTab === 'time' ? 'HỌC' : activeTab === 'new_cards' ? 'THẺ MỚI' : 'ÔN TẬP'}
                </span>
              </div>
            </div>
          );
        })}
        
        {currentList.length === 0 && (
          <div className="py-5 text-center text-xs font-medium text-neutral-400">
            Chưa có dữ liệu xếp hạng
          </div>
        )}
      </div>

      {currentRank && (
        <div className="pt-2 border-t border-neutral-100 text-center">
          <span className="text-[10px] font-medium text-neutral-400">
            Hạng hiện tại của bạn: <strong className="text-amber-600 font-bold">#{currentRank}</strong> toàn hệ thống
          </span>
        </div>
      )}
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
  const { setUser, setGamify, updateUserSettings } = useAppStore()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

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
  const [timeFilter, setTimeFilter] = useState<'all' | 'month' | 'week'>('week')
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
        {/* UNIFIED TOP HEADER (Clean Header without redundant tabs) */}
        <div className="bg-white flex-shrink-0 z-20 shadow-2xs border-b border-slate-100">
          <div className="flex items-center justify-between px-3.5 py-1 sm:py-1.5 w-full max-w-[1700px] 2xl:max-w-[1900px] mx-auto">
            <Link to="/" className="active:scale-95 transition-all flex items-center">
              <VocaburnLogo height="md" />
            </Link>
            
            <div className="flex items-center gap-2">
              <span 
                className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 text-white rounded-full text-xs font-bold shadow-md shadow-orange-500/20"
                title="Daily Streak"
              >
                <Zap className="w-3.5 h-3.5 fill-white text-white animate-pulse" />
                {data?.gamify?.streak || 0}d
              </span>

              <Link 
                to="/profile" 
                className="w-8.5 h-8.5 rounded-full bg-slate-100 border border-slate-200/60 flex items-center justify-center text-slate-700 active:scale-95 transition-all shadow-2xs"
              >
                <User className="w-4.5 h-4.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* MAIN ROADMAP CONTAINER */}
        <div className="flex-1 bg-[#f3f5f8] overflow-hidden relative flex flex-col">
          {(() => {
            const hasRoadmapDecks = roadmapDecks && roadmapDecks.length > 0;
            
            if (!hasRoadmapDecks) {
              return (
                <div className="flex-1 overflow-y-auto px-4 py-8 flex flex-col items-center justify-center text-center max-w-md mx-auto my-auto">
                  {/* Mascot & Illustration */}
                  <div className="relative mb-5">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br from-orange-100 via-amber-50 to-orange-50 flex items-center justify-center border-2 border-orange-200/80 shadow-md">
                      <Compass className="w-10 h-10 sm:w-12 sm:h-12 text-orange-500 animate-pulse" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-md text-sm font-bold">
                      ✨
                    </div>
                  </div>

                  {/* Title & Introduction */}
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-tight italic leading-tight">
                    Activate Learning Roadmap
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed mt-1.5 mb-6 max-w-xs">
                    Dashboard is your daily learning hub. Activate a roadmap to automatically schedule new vocabulary and FSRS reviews each day!
                  </p>

                  {/* 3-Step Guide Cards */}
                  <div className="w-full space-y-2.5 mb-6 text-left">
                    <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                      <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center text-xs font-black shrink-0 shadow-xs">
                        1
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-black text-slate-900">Go to "Decks" tab</h4>
                        <p className="text-[11px] text-slate-500 font-medium">Choose a deck from the Library or create your custom deck.</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                      <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center text-xs font-black shrink-0 shadow-xs">
                        2
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-black text-slate-900">Turn on "Daily Roadmap"</h4>
                        <p className="text-[11px] text-slate-500 font-medium">Set your daily target to activate intelligent spaced repetition.</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center text-xs font-black shrink-0 shadow-xs">
                        3
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-black text-slate-900">Complete 3 steps & Keep streak</h4>
                        <p className="text-[11px] text-slate-500 font-medium">Master: 1. New words ➔ 2. MCQ Quiz ➔ 3. FSRS Review.</p>
                      </div>
                    </div>
                  </div>

                  {/* CTA Buttons */}
                  <div className="w-full space-y-2">
                    <button
                      onClick={() => {
                        if (navigator.vibrate) navigator.vibrate(10);
                        navigate('/decks');
                      }}
                      className="w-full h-12 bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-2xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all active:scale-[0.98] shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Layers className="w-4 h-4" />
                      <span>Explore Decks & Activate Roadmap →</span>
                    </button>
                  </div>
                </div>
              );
            }

            const renderRoadmapCard = (deck: any, deckIdx: number, totalDecks: number) => {
              const st = deck?.status || {};
              const nT = st.new_target_today || 0;
              const nL = st.new_learned_today || 0;
              const rDn = st.review_completed_today || 0;
              const dueRemaining = st.review_due_today || 0;
              const rD = rDn + dueRemaining;
              const tT = nT + rD;
              const tD = nL + rDn;
              const pct = st.all_done ? 100 : (tT > 0 ? Math.min(100, Math.round((tD / tT) * 100)) : 0);
              const s1 = st.stage_1_done;
              const s2 = st.stage_2_done;
              const nUrl = st.next_action_url;

              const newPct = nT > 0 ? Math.min(100, Math.round((nL / nT) * 100)) : 100;
              const revPct = rD > 0 ? Math.min(100, Math.round((rDn / rD) * 100)) : 100;
              const mcqStep = st.pipeline?.find((p: any) => p.type === 'mcq' || p.type === 'typing');
              const mcqTarget = mcqStep?.question_count || st.roadmap_daily_new || (nT > 0 ? nT : 20);
              const mcqDone = s2 
                ? mcqTarget 
                : (mcqStep?.progress?.answered_today !== undefined 
                    ? Math.min(mcqTarget, mcqStep.progress.answered_today) 
                    : (mcqStep?.progress?.best_score ? Math.round((mcqStep.progress.best_score / 100) * mcqTarget) : 0)
                  );
              const mcqPct = mcqTarget > 0 ? Math.min(100, Math.round((mcqDone / mcqTarget) * 100)) : 0;

              // Mascot selection with 2-line English Slogan & deck streak
              const deckStreak = st.streak || 0;
              let mascotImg = '/mascot/sleepy.png';
              let mascotLine1 = 'No cards learned yet today,';
              let mascotLine2 = "let's get started! 🚀";
              
              if (st.all_done) {
                mascotImg = '/mascot/celebrating.png';
                mascotLine1 = 'Brilliant!';
                mascotLine2 = "You've completed today's roadmap! 🎉";
              } else if (pct >= 30 || s1) {
                mascotImg = '/mascot/excited.png';
                mascotLine1 = 'On fire!';
                mascotLine2 = 'Keep up the great momentum 🔥';
              } else if (pct > 0 || nL > 0 || rDn > 0) {
                mascotImg = '/mascot/excited.png';
                mascotLine1 = 'Off to a great start!';
                mascotLine2 = "Let's conquer today's goals 💪";
              }

              // Estimated completion date computation
              const totalCards = st.total_cards || deck.questions_count || 0;
              const learnedCards = st.learned_cards || 0;
              const unlearnedCards = st.unlearned_cards !== undefined ? st.unlearned_cards : Math.max(0, totalCards - learnedCards);
              const isDeckAllLearned = totalCards > 0 && (unlearnedCards === 0 || learnedCards >= totalCards);

              let estimatedDateText = '—';
              if (isDeckAllLearned) {
                estimatedDateText = 'Mastered 🎉';
              } else if (st.roadmap_type === 'accumulation') {
                estimatedDateText = 'Endless';
              } else if (st.estimated_completion_date) {
                try {
                  const d = new Date(st.estimated_completion_date);
                  if (!isNaN(d.getTime())) {
                    estimatedDateText = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                  } else {
                    estimatedDateText = st.estimated_completion_date;
                  }
                } catch {
                  estimatedDateText = st.estimated_completion_date;
                }
              } else {
                const dailyNew = st.roadmap_daily_new || st.new_target_today || 20;
                if (dailyNew > 0 && unlearnedCards > 0) {
                  const daysLeft = Math.ceil(unlearnedCards / dailyNew);
                  const targetDate = new Date();
                  targetDate.setDate(targetDate.getDate() + daysLeft);
                  estimatedDateText = targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                }
              }

              const stepsCompletedCount = (s1 ? 1 : 0) + (s2 ? 1 : 0) + (st.all_done ? 1 : 0);

              return (
                <div key={deck.deck_id} className="h-full w-full min-h-full snap-start snap-always flex-shrink-0 flex flex-col">
                  {/* DECK SUBHEADER BAR: ROADMAP INDEX + COUNTDOWN TIMER + DETAILS LINK */}
                  <div className="px-4 py-2 bg-white flex items-center justify-between flex-shrink-0 text-xs font-semibold text-slate-500 border-b border-slate-100/90 gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 text-slate-900 font-black tracking-tight text-xs">
                        <Layers className="w-3.5 h-3.5 text-orange-500" />
                        <span>{totalDecks > 1 ? `Roadmap ${deckIdx + 1}/${totalDecks}` : 'Daily Roadmap'}</span>
                      </div>

                      {/* COUNTDOWN TIMER BADGE ON THE ROADMAP BAR */}
                      {!st.all_done ? (
                        <div className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 text-amber-950 border border-amber-300/80 rounded-full text-[10px] sm:text-[11px] font-black shadow-2xs">
                          <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-700 shrink-0" />
                          <span className="tabular-nums font-extrabold">{remainingTime} left</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-950 border border-emerald-300/80 rounded-full text-[10px] sm:text-[11px] font-black shadow-2xs">
                          <span className="text-xs">✓</span>
                          <span>Completed today</span>
                        </div>
                      )}
                    </div>

                    <Link 
                      to={`/decks/${deck.deck_id}`}
                      className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-0.5 transition-colors cursor-pointer shrink-0 ml-auto"
                    >
                      <span>Details</span>
                      <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
                    </Link>
                  </div>

                  {/* CARD BODY (EXPANDED LAYOUT WITH HERO MASCOT EXPANDING VERTICALLY) */}
                  <div className="flex-1 flex flex-col justify-between p-3.5 sm:p-4 overflow-y-auto [&::-webkit-scrollbar]:hidden gap-3 min-h-0 max-w-lg mx-auto w-full">
                    
                    {/* HERO MASCOT CARD (CLEAN, SPACIOUS & BOLD TYPOGRAPHY) */}
                    <div className="bg-gradient-to-br from-amber-100/95 via-orange-50/70 to-amber-200/40 border border-orange-200/90 rounded-3xl p-4 sm:p-5 relative overflow-hidden shadow-xs flex flex-row items-center justify-between flex-1 min-h-[185px] sm:min-h-[210px]">
                      
                      {/* LEFT SIDE: DECK TITLE, CLEAN PILLS & SLOGAN */}
                      <div className="relative z-20 flex-1 max-w-[62%] sm:max-w-[66%] min-w-0 flex flex-col justify-center gap-2.5 py-0.5">
                        
                        {/* 1. DECK TITLE & LEVEL (BIG & BOLD) */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStudyQuiz({
                              id: deck.deck_id,
                              title: deck.title,
                              questions_count: st.total_cards || deck.questions_count || 0,
                              practice_settings: deck.practice_settings
                            });
                            setStudyModalTab('flashcard');
                            setIsStudyModalOpen(true);
                          }}
                          className="inline-flex items-center gap-2 max-w-full text-left group cursor-pointer"
                        >
                          <div className="w-7 h-7 rounded-xl bg-orange-500/15 border border-orange-300/70 flex items-center justify-center text-orange-600 shrink-0 group-hover:scale-105 transition-transform">
                            <BookOpen className="w-4 h-4" />
                          </div>
                          <span className="text-sm sm:text-base font-black text-slate-900 truncate group-hover:text-orange-600 transition-colors">
                            {deck.title}
                          </span>
                          {deck.level && (
                            <span className="px-2 py-0.5 rounded-lg bg-orange-500/15 text-orange-700 border border-orange-200/80 text-[11px] font-black shrink-0">
                              {deck.level}
                            </span>
                          )}
                        </button>

                        {/* 2. PROMINENT PILLS (STREAK, PROGRESS, EST DATE) */}
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          {/* 🔥 STREAK */}
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-full text-xs font-black shadow-xs shrink-0">
                            <Flame className="w-3.5 h-3.5 fill-amber-200 text-amber-200" />
                            <span>{deckStreak} Day Streak</span>
                          </div>

                          {/* 🎓 WORDS PROGRESS BAR WITH GREEN FILL & % NUMBER OUTSIDE */}
                          <div className="inline-flex items-center gap-1.5 shrink-0">
                            <div className="relative h-6 sm:h-6.5 min-w-[135px] sm:min-w-[155px] bg-white/90 backdrop-blur-xs border border-orange-200/90 rounded-full p-0.5 shadow-2xs overflow-hidden flex items-center">
                              {/* Green Fill Bar */}
                              <div 
                                className="absolute inset-y-0.5 left-0.5 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-500 shadow-2xs"
                                style={{ width: `${Math.max(0, Math.min(100, (learnedCards / (totalCards || 1)) * 100))}%` }}
                              />
                              {/* Text inside the bar */}
                              <span className="relative z-10 font-black text-[11px] sm:text-xs text-slate-900 px-2.5 truncate">
                                {learnedCards.toLocaleString()}/{totalCards.toLocaleString()} words
                              </span>
                            </div>

                            {/* 21% Number Outside */}
                            <span className="font-black text-xs sm:text-sm text-emerald-600 tabular-nums shrink-0">
                              {totalCards > 0 ? Math.round((learnedCards / totalCards) * 100) : 0}%
                            </span>
                          </div>

                          {/* 📅 EST DATE */}
                          <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/80 backdrop-blur-xs text-slate-600 border border-orange-200/70 rounded-full text-[11px] sm:text-xs font-semibold shadow-2xs shrink-0">
                            {isDeckAllLearned ? (
                              <span className="text-emerald-700 font-black">Mastered 🎉</span>
                            ) : (
                              <span>Est: {estimatedDateText}</span>
                            )}
                          </div>
                        </div>

                        {/* 3. INSPIRING SLOGAN (CLEAR & BOLD) */}
                        <div className="flex flex-col gap-0.5 pt-0.5">
                          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-tight">
                            {mascotLine1}
                          </h2>
                          <p className="text-xs sm:text-sm font-bold text-slate-600 leading-snug">
                            {mascotLine2}
                          </p>
                        </div>

                      </div>

                      {/* RIGHT SIDE: MASCOT WITH INTERACTIVE CHEER */}
                      <div 
                        onClick={handleMascotTap}
                        title="Tap the mascot for extra motivation! 🔥"
                        className="w-[45%] max-w-[260px] absolute right-1 sm:right-3 bottom-0 top-0 flex items-end justify-center z-10 cursor-pointer group"
                      >
                        {/* FLOATING SPEECH BUBBLE ON TAP */}
                        <AnimatePresence>
                          {mascotCheer && (
                            <motion.div
                              initial={{ opacity: 0, y: 10, scale: 0.85 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -10, scale: 0.85 }}
                              className="absolute top-2 right-2 bg-white/95 backdrop-blur-md border border-orange-200 text-slate-900 text-[11px] font-black p-2.5 rounded-2xl shadow-xl z-30 max-w-[170px] pointer-events-none text-center"
                            >
                              <div className="relative">
                                {mascotCheer}
                                <div className="absolute -bottom-4 right-6 w-0 h-0 border-x-[6px] border-x-transparent border-t-[8px] border-t-white" />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <motion.img 
                          key={mascotImg}
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.3 }}
                          src={`${mascotImg}?v=exact_blackbg_v11`} 
                          alt="Vocaburn Mascot" 
                          className="h-[105%] max-h-[280px] w-auto max-w-none object-contain object-bottom drop-shadow-2xl translate-y-1 transition-transform group-hover:scale-105 active:scale-95 select-none"
                        />
                      </div>

                      {/* 2 ACTION BUTTONS: FLASHCARD (BRAIN) & PRACTICE (TROPHY) */}
                      {!st.all_done && (
                        <div className="absolute right-3 sm:right-4 bottom-3 sm:bottom-4 z-30 flex items-center gap-2 pointer-events-auto">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStudyQuiz({
                                id: deck.deck_id,
                                title: deck.title,
                                questions_count: st.total_cards || deck.questions_count || 0,
                                practice_settings: deck.practice_settings
                              });
                              setStudyModalTab('flashcard');
                              setIsStudyModalOpen(true);
                            }}
                            className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white flex items-center justify-center shadow-lg shadow-orange-500/30 border border-white/50 active:scale-90 transition-all cursor-pointer flex-shrink-0"
                            title="Study Flashcards"
                          >
                            <Brain className="w-4.5 h-4.5 text-white" />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStudyQuiz({
                                id: deck.deck_id,
                                title: deck.title,
                                questions_count: st.total_cards || deck.questions_count || 0,
                                practice_settings: deck.practice_settings
                              });
                              setStudyModalTab('practice');
                              setIsStudyModalOpen(true);
                            }}
                            className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 border border-white/50 active:scale-90 transition-all cursor-pointer flex-shrink-0"
                            title="Practice Quiz"
                          >
                            <Trophy className="w-4.5 h-4.5 text-white" />
                          </button>
                        </div>
                      )}

                    </div>

                    {/* SECTION TITLE: TODAY'S STEPS */}
                    <div className="px-1 shrink-0 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-amber-500 fill-amber-400" />
                        <h3 className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight">
                          Today's Steps
                        </h3>
                      </div>

                      <div className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200/70 text-[10px] sm:text-[11px] font-bold">
                        <span>{stepsCompletedCount}/3 completed</span>
                      </div>
                    </div>

                    {/* 3 STEPS CONTAINER (TIMELINE CONNECTORS & SPEECH POINTER CARDS) */}
                    <div className="flex flex-col gap-2.5 relative pt-0.5">
                      
                      {/* Step 1 Item */}
                      <div className="flex items-center gap-3.5 relative">
                        {/* Number Circle 1 */}
                        <div className={cn(
                          "w-8.5 h-8.5 rounded-full font-black text-xs flex items-center justify-center shrink-0 shadow-2xs text-white z-10 transition-all",
                          s1 ? "bg-emerald-500" : "bg-gradient-to-tr from-orange-500 to-amber-500 scale-105 ring-2 ring-orange-200"
                        )}>
                          {s1 ? '✓' : '1'}
                        </div>

                        {/* Card with Left Speech Pointer */}
                        <div 
                          onClick={() => {
                            if (navigator.vibrate) navigator.vibrate(8);
                            navigate(st.pipeline?.[0]?.url || nUrl || `/flashcard/${deck.deck_id}/play?mode=roadmap`);
                          }}
                          title={s1 ? "Goal completed. Tap to review or learn more words!" : "Start learning new words today"}
                          className={cn(
                            "flex-1 bg-white border rounded-2xl p-3 sm:p-3.5 shadow-2xs flex items-center gap-3 relative transition-all cursor-pointer hover:shadow-sm active:scale-[0.99]",
                            s1 ? "border-emerald-200/90 bg-emerald-50/20" : "border-orange-300/90 bg-orange-50/20 hover:border-orange-400"
                          )}
                        >
                          {/* Left Speech Bubble Triangle Pointer */}
                          <div className={cn(
                            "absolute -left-2 top-1/2 -translate-y-1/2 w-0 h-0 border-y-[6px] border-y-transparent border-r-[8px] z-20",
                            s1 ? "border-r-emerald-100" : "border-r-orange-200"
                          )} />

                          <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100/80 flex items-center justify-center shrink-0 text-orange-500">
                            <BookOpen className="w-5 h-5" />
                          </div>

                          <div className="flex-1 min-w-0 flex flex-col gap-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-xs sm:text-sm text-slate-900 truncate">Learn New Words</span>
                              {s1 && (
                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-200 text-[10px] font-bold rounded-full shrink-0">✓ Done</span>
                              )}
                            </div>

                            <div className="text-xs font-bold text-slate-500 flex items-baseline gap-1">
                              <span className={cn("text-sm font-black", !s1 ? "text-orange-600" : "text-slate-500")}>{nL}</span>
                              <span className="text-slate-400 font-medium text-xs">/ {nT} new words</span>
                            </div>

                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden w-full my-0.5">
                              <div className="h-full bg-gradient-to-r from-orange-500 via-amber-400 to-orange-500 rounded-full transition-all" style={{ width: `${newPct}%` }} />
                            </div>
                          </div>

                          <div className="w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center shrink-0 text-slate-400">
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        </div>
                      </div>

                      {/* Connecting Line 1 -> 2 */}
                      <div className="absolute top-[34px] bottom-[110px] left-[16px] w-0.5 bg-slate-200 z-0 pointer-events-none" />

                      {/* Step 2 Item */}
                      <div className="flex items-center gap-3.5 relative">
                        {/* Number Circle 2 */}
                        <div className={cn(
                          "w-8.5 h-8.5 rounded-full font-black text-xs flex items-center justify-center shrink-0 shadow-2xs text-white z-10 transition-all",
                          s2 ? "bg-emerald-500" : s1 ? "bg-gradient-to-tr from-amber-500 to-orange-500 scale-105 ring-2 ring-amber-200" : "bg-slate-200 text-slate-400"
                        )}>
                          {s2 ? '✓' : '2'}
                        </div>

                        {/* Card with Left Speech Pointer */}
                        <div 
                          onClick={() => {
                            if (!s1) return;
                            if (navigator.vibrate) navigator.vibrate(8);
                            const testUrl = mcqStep?.url || `/practice/${deck.deck_id}/roadmap_mcq`;
                            navigate(testUrl);
                          }}
                          title={!s1 ? "Complete Step 1 (Learn New Words) first" : s2 ? "Target achieved! Tap to review or retake test" : "Start MCQ test"}
                          className={cn(
                            "flex-1 bg-white border rounded-2xl p-3 sm:p-3.5 shadow-2xs flex items-center gap-3 relative transition-all",
                            !s1 ? "cursor-not-allowed opacity-60 bg-slate-50/60 border-slate-200/60" : "cursor-pointer hover:shadow-sm active:scale-[0.99]",
                            s2 ? "border-emerald-200/90 bg-emerald-50/20" : s1 ? "border-amber-300/90 bg-amber-50/20 hover:border-amber-400" : ""
                          )}
                        >
                          {/* Left Speech Bubble Triangle Pointer */}
                          <div className={cn(
                            "absolute -left-2 top-1/2 -translate-y-1/2 w-0 h-0 border-y-[6px] border-y-transparent border-r-[8px] z-20",
                            s2 ? "border-r-emerald-100" : s1 ? "border-r-amber-200" : "border-r-slate-200/60"
                          )} />

                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
                            s2 ? "bg-emerald-50 border-emerald-100 text-emerald-600" : s1 ? "bg-amber-50 border-amber-200 text-amber-600" : "bg-slate-100 border-slate-200/60 text-slate-400"
                          )}>
                            {mcqStep?.type === 'typing' ? (
                              <Keyboard className="w-5 h-5" />
                            ) : (
                              <FileText className="w-5 h-5" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0 flex flex-col gap-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                                {mcqStep?.type === 'typing' ? 'Typing Test' : 'MCQ Quiz'}
                              </span>
                              {s2 && (
                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-200 text-[10px] font-bold rounded-full shrink-0">✓ Done</span>
                              )}
                            </div>

                            <div className="text-xs font-bold text-slate-500 flex items-baseline gap-1">
                              <span className={cn("text-sm font-black", s1 ? "text-amber-600" : "text-slate-400")}>{mcqDone}</span>
                              <span className="text-slate-400 font-medium text-xs">/ {mcqTarget} questions</span>
                            </div>

                            {s1 && (
                              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden w-full my-0.5">
                                <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all" style={{ width: `${mcqPct}%` }} />
                              </div>
                            )}
                          </div>

                          <div className="w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center shrink-0 text-slate-400">
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        </div>
                      </div>

                      {/* Connecting Line 2 -> 3 */}
                      <div className="absolute top-[110px] bottom-[34px] left-[16px] w-0.5 bg-slate-200 z-0 pointer-events-none" />

                      {/* Step 3 Item */}
                      <div className="flex items-center gap-3.5 relative">
                        {/* Number Circle 3 */}
                        <div className={cn(
                          "w-8.5 h-8.5 rounded-full font-black text-xs flex items-center justify-center shrink-0 shadow-2xs text-white z-10 transition-all",
                          st.all_done ? "bg-emerald-500" : s2 ? "bg-gradient-to-tr from-purple-500 to-indigo-600 scale-105 ring-2 ring-purple-200" : "bg-slate-200 text-slate-400"
                        )}>
                          {st.all_done ? '✓' : '3'}
                        </div>

                        {/* Card with Left Speech Pointer */}
                        <div 
                          onClick={() => {
                            if (!s1 || !s2) return;
                            if (navigator.vibrate) navigator.vibrate(8);
                            const fsrsStep = st.pipeline?.find((p: any) => p.type === 'fsrs_review');
                            const fsrsUrl = fsrsStep?.url || `/flashcard/${deck.deck_id}/play?mode=roadmap&step=fsrs_review`;
                            navigate(fsrsUrl);
                          }}
                          title={!s1 ? "Complete Step 1 (Learn New Words) first" : !s2 ? "Complete Step 2 (MCQ Quiz) first" : st.all_done ? "FSRS review finished! Tap to review or study more" : "Start FSRS review"}
                          className={cn(
                            "flex-1 bg-white border rounded-2xl p-3 sm:p-3.5 shadow-2xs flex items-center gap-3 relative transition-all",
                            (!s1 || !s2) ? "cursor-not-allowed opacity-60 bg-slate-50/60 border-slate-200/60" : "cursor-pointer hover:shadow-sm active:scale-[0.99]",
                            st.all_done ? "border-emerald-200/90 bg-emerald-50/20" : (s1 && s2) ? "border-purple-300/90 bg-purple-50/20 hover:border-purple-400" : ""
                          )}
                        >
                          {/* Left Speech Bubble Triangle Pointer */}
                          <div className={cn(
                            "absolute -left-2 top-1/2 -translate-y-1/2 w-0 h-0 border-y-[6px] border-y-transparent border-r-[8px] z-20",
                            st.all_done ? "border-r-emerald-100" : (s1 && s2) ? "border-r-purple-200" : "border-r-slate-200/60"
                          )} />

                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
                            st.all_done ? "bg-emerald-50 border-emerald-100 text-emerald-600" : s2 ? "bg-purple-50 border-purple-200 text-purple-600" : "bg-slate-100 border-slate-200/60 text-slate-400"
                          )}>
                            <RotateCcw className="w-5 h-5" />
                          </div>

                          <div className="flex-1 min-w-0 flex flex-col gap-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-xs sm:text-sm text-slate-900 truncate">FSRS Review</span>
                              {st.all_done && (
                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-200 text-[10px] font-bold rounded-full shrink-0">✓ Done</span>
                              )}
                            </div>

                            <div className="text-xs font-bold text-slate-500 flex items-baseline gap-1">
                              <span className={cn("text-sm font-black", s2 ? "text-purple-600" : "text-slate-400")}>{rDn}</span>
                              <span className="text-slate-400 font-medium text-xs">/ {rD} cards due</span>
                            </div>

                            {s2 && (
                              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden w-full my-0.5">
                                <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full transition-all" style={{ width: `${revPct}%` }} />
                              </div>
                            )}
                          </div>

                          <div className="w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center shrink-0 text-slate-400">
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* CTA ACTION AREA (SLEEK & REFINED) */}
                    <div className="pt-0.5 flex-shrink-0">
                      {st.all_done ? (
                        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 w-full">
                          {/* BUTTON 1: CONTINUE FSRS */}
                          <button
                            type="button"
                            onClick={() => {
                              if (navigator.vibrate) navigator.vibrate(12);
                              setSelectedStudyQuiz({
                                id: deck.deck_id,
                                title: deck.title,
                                questions_count: st.total_cards || deck.questions_count || 0,
                                practice_settings: deck.practice_settings
                              });
                              setStudyModalTab('flashcard');
                              setIsStudyModalOpen(true);
                            }}
                            className="relative overflow-hidden bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-white rounded-2xl p-3 sm:p-3.5 flex items-center gap-2.5 sm:gap-3 shadow-md shadow-orange-500/25 active:scale-[0.98] transition-all cursor-pointer group text-left"
                          >
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                              <Brain className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-xs sm:text-sm font-black tracking-wide uppercase text-white block truncate">
                                Continue FSRS
                              </span>
                              <span className="text-[10px] sm:text-[11px] text-orange-100 font-medium block truncate mt-0.5">
                                Review / Learn cards
                              </span>
                            </div>
                          </button>

                          {/* BUTTON 2: PRACTICE QUIZ */}
                          <button
                            type="button"
                            onClick={() => {
                              if (navigator.vibrate) navigator.vibrate(12);
                              setSelectedStudyQuiz({
                                id: deck.deck_id,
                                title: deck.title,
                                questions_count: st.total_cards || deck.questions_count || 0,
                                practice_settings: deck.practice_settings
                              });
                              setStudyModalTab('practice');
                              setIsStudyModalOpen(true);
                            }}
                            className="relative overflow-hidden bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:to-teal-600 text-white rounded-2xl p-3 sm:p-3.5 flex items-center gap-2.5 sm:gap-3 shadow-md shadow-emerald-500/25 active:scale-[0.98] transition-all cursor-pointer group text-left"
                          >
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                              <Trophy className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-xs sm:text-sm font-black tracking-wide uppercase text-white block truncate">
                                Practice Quiz
                              </span>
                              <span className="text-[10px] sm:text-[11px] text-emerald-100 font-medium block truncate mt-0.5">
                                MCQ / Typing test
                              </span>
                            </div>
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { 
                            if (navigator.vibrate) navigator.vibrate(12);
                            if (nUrl) navigate(nUrl); 
                            else navigate(`/decks/${deck.deck_id}`); 
                          }}
                          className="w-full relative overflow-hidden bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-2xl px-4 py-3 sm:py-3.5 flex items-center justify-between shadow-lg shadow-orange-500/25 active:scale-[0.98] transition-all duration-200 cursor-pointer group"
                        >
                          {/* Left Play Icon */}
                          <div className="w-8.5 h-8.5 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 text-white">
                            <Play className="w-4 h-4 fill-white ml-0.5" />
                          </div>

                          {/* Center Text Section */}
                          <div className="flex-1 flex flex-col items-center justify-center text-center px-3">
                            <span className="text-sm sm:text-base font-extrabold tracking-wide uppercase text-white leading-tight">
                              {!s1
                                ? 'LEARN NEW WORDS'
                                : !s2
                                ? 'TAKE MCQ QUIZ'
                                : 'FSRS REVIEW'}
                            </span>
                            <span className="text-[11px] sm:text-xs text-orange-100 font-medium mt-0.5">
                              {!s1
                                ? `${Math.max(0, nT - nL)} new words left today`
                                : !s2
                                ? 'Score ≥80% to pass'
                                : `${Math.max(0, rD - rDn)} cards due for review`}
                            </span>
                          </div>

                          {/* Right Arrow */}
                          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0 text-white group-hover:translate-x-0.5 transition-transform">
                            <ChevronRight className="w-4.5 h-4.5 stroke-[2.5]" />
                          </div>
                        </button>
                      )}
                    </div>

                  </div>
                </div>
              );
            };

            if (roadmapDecks && roadmapDecks.length > 1) {
              return (
                <div 
                  ref={roadmapContainerRef}
                  onScroll={handleRoadmapScroll}
                  className="flex-1 overflow-y-auto snap-y snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] w-full h-full"
                >
                  {roadmapDecks.map((deck: any, idx: number) => renderRoadmapCard(deck, idx, roadmapDecks.length))}
                </div>
              );
            }

            if (roadmapDecks && roadmapDecks.length > 0) {
              return renderRoadmapCard(roadmapDecks[0], 0, 1);
            }

            return null;
          })()}
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

      </AnimatePresence>
    </div>
  )
}
