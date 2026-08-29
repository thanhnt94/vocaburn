import { useState, useMemo } from 'react'
import { Target, Activity, Clock, CheckCircle2, Flame, Award, Calendar, Layers, Timer, Zap } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Cell } from 'recharts'
import { cn } from '@/lib/utils'
import ReviewForecastWidget from './ReviewForecastWidget'
import type { ForecastResponse } from './ReviewForecastWidget'
import HeatmapWidget from './HeatmapWidget'
import type { HeatmapDay } from './HeatmapWidget'
import LeitnerDistributionWidget from './LeitnerDistributionWidget'
import SpeedAccuracyWidget from './SpeedAccuracyWidget'
import PracticeStatsWidget from './PracticeStatsWidget'
import DailyComparisonChart from '@/components/DailyComparisonChart'

export type PersonalPeriod = 'day' | 'week' | 'month' | 'year' | 'all'

interface PersonalStatsTabProps {
  personalStats: {
    daily_activity: Array<{ date: string, attempted: number, correct: number, accuracy: number, time_minutes: number }>
    category_performance: Array<{ category: string, total: number, correct: number, accuracy: number, avg_time: number }>
    hourly_distribution: Array<{ hour: string, count: number, average: number }>
    recent_sessions: Array<{ title: string, score: number, total: number, date: string }>
    summary: { total_questions: number, total_correct: number, total_time_hours: number, global_accuracy: number }
  } | undefined
  heatmapData: HeatmapDay[] | undefined
  weeklyReport: any
  leitnerStats: any
  speedAccuracyStats: any
  forecastData: ForecastResponse | undefined
  practiceStats: any
  dailyComparisonData: any
  dailyComparisonAvg: any
  isDailyComparisonLoading?: boolean
}

export default function PersonalStatsTab({
  personalStats,
  heatmapData,
  weeklyReport,
  leitnerStats,
  speedAccuracyStats,
  forecastData,
  practiceStats,
  dailyComparisonData,
  dailyComparisonAvg,
  isDailyComparisonLoading
}: PersonalStatsTabProps) {
  const [personalPeriod, setPersonalPeriod] = useState<PersonalPeriod>('week')
  const [activeChartTab, setActiveChartTab] = useState<'activity' | 'time' | 'hours'>('activity')

  // Filter daily activity based on chosen period
  const filteredDailyActivity = useMemo(() => {
    const dailyAct = personalStats?.daily_activity
    if (!dailyAct) return []
    if (personalPeriod === 'day') return dailyAct.slice(-1)
    if (personalPeriod === 'week') return dailyAct.slice(-7)
    if (personalPeriod === 'month') return dailyAct.slice(-30)
    if (personalPeriod === 'year') return dailyAct.slice(-365)
    return dailyAct
  }, [personalStats, personalPeriod])

  // Synchronized KPIs based on period
  const periodSummary = useMemo(() => {
    if (personalPeriod === 'all' && personalStats?.summary) {
      return {
        total_questions: personalStats.summary.total_questions || 0,
        total_correct: personalStats.summary.total_correct || 0,
        total_time_hours: (personalStats.summary.total_time_hours || 0).toFixed(1),
        total_time_minutes: Math.round((personalStats.summary.total_time_hours || 0) * 60),
        global_accuracy: personalStats.summary.global_accuracy || 0,
        best_day: weeklyReport?.best_day || 'N/A'
      }
    }

    if (!filteredDailyActivity || filteredDailyActivity.length === 0) {
      return {
        total_questions: personalStats?.summary?.total_questions || 0,
        total_correct: personalStats?.summary?.total_correct || 0,
        total_time_hours: (personalStats?.summary?.total_time_hours || 0).toFixed(1),
        total_time_minutes: Math.round((personalStats?.summary?.total_time_hours || 0) * 60),
        global_accuracy: personalStats?.summary?.global_accuracy || 0,
        best_day: weeklyReport?.best_day || 'N/A'
      }
    }

    const total_questions = filteredDailyActivity.reduce((acc, c) => acc + (c.attempted || 0), 0)
    const total_correct = filteredDailyActivity.reduce((acc, c) => acc + (c.correct || 0), 0)
    const total_time_minutes = Math.round(filteredDailyActivity.reduce((acc, c) => acc + (c.time_minutes || 0), 0))
    const total_time_hours = (total_time_minutes / 60).toFixed(1)
    const global_accuracy = total_questions > 0 ? Math.round((total_correct / total_questions) * 1000) / 10 : 0

    let bestDayObj = filteredDailyActivity[0]
    filteredDailyActivity.forEach(day => {
      if ((day.correct || 0) > (bestDayObj?.correct || 0)) {
        bestDayObj = day
      }
    })

    let best_day = 'N/A'
    if (bestDayObj?.date) {
      const d = new Date(bestDayObj.date)
      const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy']
      best_day = dayNames[d.getDay()] || bestDayObj.date
    }

    return {
      total_questions,
      total_correct,
      total_time_hours,
      total_time_minutes,
      global_accuracy,
      best_day
    }
  }, [filteredDailyActivity, personalStats, weeklyReport, personalPeriod])

  const periodLabels: Record<PersonalPeriod, string> = {
    day: 'Today',
    week: '7 Days',
    month: '30 Days',
    year: 'Year',
    all: 'All Time'
  }

  return (
    <div className="space-y-6 text-left max-w-5xl mx-auto">
      {/* 📅 Sticky Top Synchronized Time Horizon Bar */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-5 shadow-sm space-y-3 relative overflow-hidden">
        <div className="h-1 absolute top-0 inset-x-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200 shrink-0">
              <Target className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-widest italic leading-none">
                Thống Kê Hiệu Suất Cá Nhân
              </h2>
              <p className="text-[9px] font-bold text-slate-400 mt-1">
                Lựa chọn mốc thời gian để đồng bộ toàn bộ chỉ số học tập
              </p>
            </div>
          </div>

          {/* Time Filter Buttons */}
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/70 overflow-x-auto no-scrollbar shrink-0 w-full sm:w-auto justify-center gap-1">
            {(['day', 'week', 'month', 'year', 'all'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setPersonalPeriod(period)}
                className={cn(
                  "flex-1 sm:flex-none px-2.5 sm:px-3.5 py-1.5 rounded-xl text-[9.5px] sm:text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap text-center",
                  personalPeriod === period
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20 font-black"
                    : "text-slate-500 hover:text-slate-900 font-bold hover:bg-white/50"
                )}
              >
                {periodLabels[period]}
              </button>
            ))}
          </div>
        </div>

        {/* 4 Hero KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100">
          <div className="bg-indigo-50/70 p-3 rounded-2xl border border-indigo-100/60">
            <span className="text-[8px] font-black text-indigo-400 uppercase tracking-wider block">Thẻ Đã Học</span>
            <div className="text-lg sm:text-xl font-black text-indigo-600 mt-0.5">
              {periodSummary.total_questions.toLocaleString()} <span className="text-[10px] font-bold text-slate-400">thẻ</span>
            </div>
            <p className="text-[7.5px] font-bold text-slate-400 uppercase mt-0.5">Trong {periodLabels[personalPeriod].toLowerCase()}</p>
          </div>

          <div className="bg-emerald-50/70 p-3 rounded-2xl border border-emerald-100/60">
            <span className="text-[8px] font-black text-emerald-500 uppercase tracking-wider block">Độ Chính Xác</span>
            <div className="text-lg sm:text-xl font-black text-emerald-600 mt-0.5">
              {periodSummary.global_accuracy}%
            </div>
            <p className="text-[7.5px] font-bold text-slate-400 uppercase mt-0.5">{periodSummary.total_correct} câu đúng</p>
          </div>

          <div className="bg-amber-50/70 p-3 rounded-2xl border border-amber-100/60">
            <span className="text-[8px] font-black text-amber-500 uppercase tracking-wider block">Thời Gian Học</span>
            <div className="text-lg sm:text-xl font-black text-amber-600 mt-0.5">
              {periodSummary.total_time_hours} <span className="text-[10px] font-bold text-slate-400">giờ</span>
            </div>
            <p className="text-[7.5px] font-bold text-slate-400 uppercase mt-0.5">~{periodSummary.total_time_minutes} phút tập trung</p>
          </div>

          <div className="bg-purple-50/70 p-3 rounded-2xl border border-purple-100/60">
            <span className="text-[8px] font-black text-purple-400 uppercase tracking-wider block">Ngày Năng Suất Nhất</span>
            <div className="text-sm sm:text-base font-black text-purple-700 mt-1 truncate">
              {periodSummary.best_day}
            </div>
            <p className="text-[7.5px] font-bold text-slate-400 uppercase mt-0.5">Hiệu quả ghi nhớ cao</p>
          </div>
        </div>
      </div>

      {/* 📈 Activity & Focus Trend Chart Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 md:p-7 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Activity className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-widest italic leading-none">
                Biểu Đồ Xu Hướng Học Tập
              </h3>
              <p className="text-[9px] font-bold text-slate-400 mt-1">
                Theo dõi tiến độ câu hỏi và thời gian tập trung ({periodLabels[personalPeriod]})
              </p>
            </div>
          </div>

          {/* Chart View Switcher */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/60 self-start sm:self-auto">
            <button
              onClick={() => setActiveChartTab('activity')}
              className={cn(
                "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer",
                activeChartTab === 'activity' ? "bg-white text-indigo-600 shadow-2xs" : "text-slate-400 hover:text-slate-600"
              )}
            >
              Số Thẻ
            </button>
            <button
              onClick={() => setActiveChartTab('time')}
              className={cn(
                "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer",
                activeChartTab === 'time' ? "bg-white text-emerald-600 shadow-2xs" : "text-slate-400 hover:text-slate-600"
              )}
            >
              Thời Gian
            </button>
            <button
              onClick={() => setActiveChartTab('hours')}
              className={cn(
                "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer",
                activeChartTab === 'hours' ? "bg-white text-amber-600 shadow-2xs" : "text-slate-400 hover:text-slate-600"
              )}
            >
              Khung Giờ
            </button>
          </div>
        </div>

        {/* Chart View Content */}
        <div className="h-[220px] w-full -ml-4 pr-2">
          <ResponsiveContainer width="100%" height="100%">
            {activeChartTab === 'activity' ? (
              <AreaChart data={filteredDailyActivity}>
                <defs>
                  <linearGradient id="actGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 8, fontWeight: 900, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 8, fontWeight: 900, fill: '#94a3b8' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 900 }} 
                />
                <Area type="monotone" dataKey="attempted" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#actGrad)" name="Thẻ đã học" />
                <Area type="monotone" dataKey="correct" stroke="#10b981" strokeWidth={2} fillOpacity={0} name="Số câu đúng" />
              </AreaChart>
            ) : activeChartTab === 'time' ? (
              <AreaChart data={filteredDailyActivity}>
                <defs>
                  <linearGradient id="timeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 8, fontWeight: 900, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 8, fontWeight: 900, fill: '#94a3b8' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 900 }} 
                />
                <Area type="monotone" dataKey="time_minutes" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#timeGrad)" name="Số phút học" />
              </AreaChart>
            ) : (
              <BarChart data={personalStats?.hourly_distribution || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fontSize: 8, fontWeight: 900, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 8, fontWeight: 900, fill: '#94a3b8' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 900 }} 
                />
                <Bar dataKey="average" radius={[4, 4, 0, 0]} name="Thẻ/ngày">
                  {(personalStats?.hourly_distribution || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={(entry.average || 0) > 0 ? "#f59e0b" : "#e2e8f0"} />
                  ))}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* 🧠 FSRS Review Forecast Widget */}
      <ReviewForecastWidget data={forecastData} activePeriod={personalPeriod} />

      {/* 📊 Daily Comparison Chart (Hôm nay vs Hôm qua) */}
      {dailyComparisonData && (
        <DailyComparisonChart 
          data={dailyComparisonData} 
          allTimeAvg={dailyComparisonAvg} 
          isLoading={isDailyComparisonLoading} 
        />
      )}

      {/* 📦 Leitner 5-Box Memory Distribution & Hard Cards */}
      <LeitnerDistributionWidget leitnerStats={leitnerStats} />

      {/* ⚡ Speed vs Accuracy Correlation */}
      <SpeedAccuracyWidget speedAccuracyStats={speedAccuracyStats} />

      {/* 🗓️ 365-Day Streak Heatmap Consistency */}
      <HeatmapWidget data={heatmapData} />

      {/* 🎯 Practice Modes Summary */}
      <PracticeStatsWidget practiceStats={practiceStats} />
    </div>
  )
}
