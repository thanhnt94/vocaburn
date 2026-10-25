import { useState, useMemo } from 'react'
import { Target, Activity, Clock, CheckCircle2, Flame, Award, Calendar, Layers, Timer, Zap, TrendingUp, BrainCircuit, BarChart2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Cell } from 'recharts'
import { cn } from '@/lib/utils'
import ReviewForecastWidget from './ReviewForecastWidget'
import type { ForecastResponse } from './ReviewForecastWidget'
import HeatmapWidget from './HeatmapWidget'
import type { HeatmapDay } from './HeatmapWidget'
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
  speedAccuracyStats,
  forecastData,
  practiceStats,
  dailyComparisonData,
  dailyComparisonAvg,
  isDailyComparisonLoading
}: PersonalStatsTabProps) {
  const [personalPeriod, setPersonalPeriod] = useState<PersonalPeriod>('week')
  const [activeChartTab, setActiveChartTab] = useState<'activity' | 'time' | 'hours'>('activity')

  // Multi-view states to consolidate charts without endless scrolling
  const [card1View, setCard1View] = useState<'trend' | 'comparison'>('trend')
  const [card2View, setCard2View] = useState<'forecast' | 'speed'>('forecast')
  const [card3View, setCard3View] = useState<'heatmap' | 'practice'>('heatmap')

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
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
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
    <div className="space-y-6 text-left w-full max-w-[1700px] 2xl:max-w-[1900px] mx-auto">
      {/* 📅 Top Horizon & Executive KPI Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-6 shadow-sm space-y-4 text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs shrink-0">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-widest leading-none">
                Personal Learning Performance
              </h2>
              <p className="text-[9px] font-bold text-slate-400 mt-1">
                Select a time horizon to synchronize all metrics
              </p>
            </div>
          </div>

          {/* Time Filter Segmented Buttons */}
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/70 overflow-x-auto no-scrollbar shrink-0 w-full sm:w-auto justify-center gap-1">
            {(['day', 'week', 'month', 'year', 'all'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setPersonalPeriod(period)}
                className={cn(
                  "flex-1 sm:flex-none px-3 py-1.5 rounded-xl text-[9.5px] sm:text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap text-center",
                  personalPeriod === period
                    ? "bg-white text-slate-900 shadow-sm border border-slate-200/60"
                    : "text-slate-500 hover:text-slate-900 font-bold hover:bg-white/40"
                )}
              >
                {periodLabels[period]}
              </button>
            ))}
          </div>
        </div>

        {/* 4 Hero KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 border-t border-slate-100">
          <div className="bg-indigo-50/50 p-3.5 rounded-2xl border border-indigo-100/70">
            <span className="text-[8px] font-black text-indigo-500 uppercase tracking-wider block">Cards Studied</span>
            <div className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">
              {periodSummary.total_questions.toLocaleString()} <span className="text-[10px] font-bold text-slate-400">cards</span>
            </div>
            <p className="text-[7.5px] font-bold text-slate-400 uppercase mt-0.5">In {periodLabels[personalPeriod].toLowerCase()}</p>
          </div>

          <div className="bg-emerald-50/50 p-3.5 rounded-2xl border border-emerald-100/70">
            <span className="text-[8px] font-black text-emerald-600 uppercase tracking-wider block">Accuracy</span>
            <div className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">
              {periodSummary.global_accuracy}%
            </div>
            <p className="text-[7.5px] font-bold text-slate-400 uppercase mt-0.5">{periodSummary.total_correct} correct cards</p>
          </div>

          <div className="bg-amber-50/50 p-3.5 rounded-2xl border border-amber-100/70">
            <span className="text-[8px] font-black text-amber-600 uppercase tracking-wider block">Focus Time</span>
            <div className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">
              {periodSummary.total_time_hours} <span className="text-[10px] font-bold text-slate-400">hrs</span>
            </div>
            <p className="text-[7.5px] font-bold text-slate-400 uppercase mt-0.5">~{periodSummary.total_time_minutes} mins total</p>
          </div>

          <div className="bg-purple-50/50 p-3.5 rounded-2xl border border-purple-100/70">
            <span className="text-[8px] font-black text-purple-600 uppercase tracking-wider block">Peak Day</span>
            <div className="text-sm sm:text-base font-black text-slate-900 mt-1 truncate">
              {periodSummary.best_day}
            </div>
            <p className="text-[7.5px] font-bold text-slate-400 uppercase mt-0.5">Optimal retention session</p>
          </div>
        </div>
      </div>

      {/* 🚀 Master Multi-View Card 1: Learning Activity & Day-to-Day Comparison */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 md:p-6 shadow-sm relative overflow-hidden text-left space-y-4">
        {/* Module Header with View Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-widest leading-none">
                Learning Activity & Pace
              </h3>
              <p className="text-[9px] font-bold text-slate-400 mt-1">
                {card1View === 'trend'
                  ? `Card volume & focused duration over ${periodLabels[personalPeriod].toLowerCase()}`
                  : "Daily comparative performance vs yesterday and historical average"}
              </p>
            </div>
          </div>

          {/* Module Multi-View Segmented Toggle */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/70 self-start sm:self-auto gap-1">
            <button
              onClick={() => setCard1View('trend')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[9.5px] font-black uppercase tracking-wider transition-all cursor-pointer",
                card1View === 'trend'
                  ? "bg-white text-indigo-600 shadow-sm border border-slate-200/50"
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              Activity Trend
            </button>
            <button
              onClick={() => setCard1View('comparison')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[9.5px] font-black uppercase tracking-wider transition-all cursor-pointer",
                card1View === 'comparison'
                  ? "bg-white text-orange-600 shadow-sm border border-slate-200/50"
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              Day vs Yesterday
            </button>
          </div>
        </div>

        {/* Module Content */}
        {card1View === 'trend' ? (
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                Display Metric:
              </span>
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/60 gap-1">
                <button
                  onClick={() => setActiveChartTab('activity')}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[8.5px] font-black uppercase tracking-wider transition-all cursor-pointer",
                    activeChartTab === 'activity' ? "bg-white text-indigo-600 shadow-xs" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  Cards
                </button>
                <button
                  onClick={() => setActiveChartTab('time')}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[8.5px] font-black uppercase tracking-wider transition-all cursor-pointer",
                    activeChartTab === 'time' ? "bg-white text-emerald-600 shadow-xs" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  Time
                </button>
                <button
                  onClick={() => setActiveChartTab('hours')}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[8.5px] font-black uppercase tracking-wider transition-all cursor-pointer",
                    activeChartTab === 'hours' ? "bg-white text-amber-600 shadow-xs" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  Hourly
                </button>
              </div>
            </div>

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
                      contentStyle={{ borderRadius: '0.75rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)', fontSize: '10px', fontWeight: 800 }} 
                    />
                    <Area type="monotone" dataKey="attempted" stroke="#4f46e5" strokeWidth={2.5} fillOpacity={1} fill="url(#actGrad)" name="Cards studied" />
                    <Area type="monotone" dataKey="correct" stroke="#10b981" strokeWidth={2} fillOpacity={0} name="Correct answers" />
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
                      contentStyle={{ borderRadius: '0.75rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)', fontSize: '10px', fontWeight: 800 }} 
                    />
                    <Area type="monotone" dataKey="time_minutes" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#timeGrad)" name="Minutes focused" />
                  </AreaChart>
                ) : (
                  <BarChart data={personalStats?.hourly_distribution || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fontSize: 8, fontWeight: 900, fill: '#94a3b8' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 8, fontWeight: 900, fill: '#94a3b8' }} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '0.75rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)', fontSize: '10px', fontWeight: 800 }} 
                    />
                    <Bar dataKey="average" radius={[4, 4, 0, 0]} name="Cards/day">
                      {(personalStats?.hourly_distribution || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={(entry.average || 0) > 0 ? "#f59e0b" : "#e2e8f0"} />
                      ))}
                    </Bar>
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <DailyComparisonChart 
            data={dailyComparisonData} 
            allTimeAvg={dailyComparisonAvg} 
            isLoading={isDailyComparisonLoading} 
            embedded={true}
          />
        )}
      </div>

      {/* 🧠 Master Multi-View Card 2: Memory Retention & Reaction Velocity */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 md:p-6 shadow-sm relative overflow-hidden text-left space-y-4">
        {/* Module Header with View Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-widest leading-none">
                Memory Retention & Velocity
              </h3>
              <p className="text-[9px] font-bold text-slate-400 mt-1">
                {card2View === 'forecast'
                  ? "Projected FSRS review load calculated by memory interval stability"
                  : "Response latency distribution and neural reaction velocity"}
              </p>
            </div>
          </div>

          {/* Module Multi-View Segmented Toggle */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/70 self-start sm:self-auto gap-1">
            <button
              onClick={() => setCard2View('forecast')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[9.5px] font-black uppercase tracking-wider transition-all cursor-pointer",
                card2View === 'forecast'
                  ? "bg-white text-orange-600 shadow-sm border border-slate-200/50"
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              FSRS Forecast
            </button>
            <button
              onClick={() => setCard2View('speed')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[9.5px] font-black uppercase tracking-wider transition-all cursor-pointer",
                card2View === 'speed'
                  ? "bg-white text-emerald-600 shadow-sm border border-slate-200/50"
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              Speed & Accuracy
            </button>
          </div>
        </div>

        {/* Module Content */}
        {card2View === 'forecast' ? (
          <ReviewForecastWidget data={forecastData} activePeriod={personalPeriod} embedded={true} />
        ) : (
          <SpeedAccuracyWidget speedAccuracyStats={speedAccuracyStats} embedded={true} />
        )}
      </div>

      {/* 🗓️ Master Multi-View Card 3: Consistency Heatmap & Practice Modes */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 md:p-6 shadow-sm relative overflow-hidden text-left space-y-4">
        {/* Module Header with View Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-widest leading-none">
                Habit Consistency & Practice Modes
              </h3>
              <p className="text-[9px] font-bold text-slate-400 mt-1">
                {card3View === 'heatmap'
                  ? "365-day streak commitment and daily study frequency record"
                  : "Multi-modal performance breakdown across practice drills"}
              </p>
            </div>
          </div>

          {/* Module Multi-View Segmented Toggle */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/70 self-start sm:self-auto gap-1">
            <button
              onClick={() => setCard3View('heatmap')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[9.5px] font-black uppercase tracking-wider transition-all cursor-pointer",
                card3View === 'heatmap'
                  ? "bg-white text-indigo-600 shadow-sm border border-slate-200/50"
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              Consistency Heatmap
            </button>
            <button
              onClick={() => setCard3View('practice')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[9.5px] font-black uppercase tracking-wider transition-all cursor-pointer",
                card3View === 'practice'
                  ? "bg-white text-violet-600 shadow-sm border border-slate-200/50"
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              Practice Modes
            </button>
          </div>
        </div>

        {/* Module Content */}
        {card3View === 'heatmap' ? (
          <HeatmapWidget data={heatmapData} embedded={true} />
        ) : (
          <PracticeStatsWidget practiceStats={practiceStats} embedded={true} />
        )}
      </div>
    </div>
  )
}
