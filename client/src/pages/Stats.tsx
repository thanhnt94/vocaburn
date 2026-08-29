import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Trophy, User, Globe, TrendingUp, Zap, BrainCircuit } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { cn } from '@/lib/utils'
import LeaderboardTab from '@/components/stats/LeaderboardTab'
import type { LeaderboardCategory, LeaderboardTimeFilter, LeaderboardResponse } from '@/components/stats/LeaderboardTab'
import PersonalStatsTab from '@/components/stats/PersonalStatsTab'
import GlobalStatsTab from '@/components/stats/GlobalStatsTab'
import type { ForecastResponse } from '@/components/stats/ReviewForecastWidget'
import type { HeatmapDay } from '@/components/stats/HeatmapWidget'

export type StatsMainTab = 'leaderboard' | 'personal' | 'global'

export default function Stats() {
  const [activeTab, setActiveTab] = useState<StatsMainTab>('leaderboard')
  
  // Leaderboard filters state
  const [leaderboardCategory, setLeaderboardCategory] = useState<LeaderboardCategory>('xp')
  const [leaderboardTimeFilter, setLeaderboardTimeFilter] = useState<LeaderboardTimeFilter>('all_time')

  // 1. Detailed stats (Personal + Global summary)
  const { data: detailedStatsData, isLoading: isDetailedLoading } = useQuery({
    queryKey: ['detailed-stats'],
    queryFn: async () => {
      const res = await axios.get('/api/v1/stats/detailed')
      return res.data
    },
    staleTime: 30 * 1000
  })

  // 2. Leaderboard data
  const { data: leaderboardData, isLoading: isLeaderboardLoading } = useQuery<LeaderboardResponse>({
    queryKey: ['stats-leaderboard', leaderboardTimeFilter],
    queryFn: async () => {
      const res = await axios.get('/api/v1/stats/leaderboard', {
        params: { time_filter: leaderboardTimeFilter }
      })
      return res.data
    },
    staleTime: 30 * 1000
  })

  // 3. Daily comparison data
  const { data: dailyComparisonRaw, isLoading: isDailyComparisonLoading } = useQuery({
    queryKey: ['dailyComparison'],
    queryFn: async () => {
      const res = await axios.get('/api/v1/stats/daily-comparison')
      return res.data
    },
    staleTime: 30 * 1000
  })

  // 4. Heatmap data
  const { data: heatmapData } = useQuery<HeatmapDay[]>({
    queryKey: ['stats-heatmap'],
    queryFn: async () => {
      const res = await axios.get('/api/v1/deck/stats/heatmap')
      return res.data
    },
    staleTime: 60 * 1000
  })

  // 5. Weekly report
  const { data: weeklyReport } = useQuery({
    queryKey: ['stats-weekly-report'],
    queryFn: async () => {
      const res = await axios.get('/api/v1/deck/stats/weekly-report')
      return res.data
    },
    staleTime: 60 * 1000
  })

  // 6. Leitner distribution & hard cards
  const { data: leitnerStats } = useQuery({
    queryKey: ['stats-leitner'],
    queryFn: async () => {
      const res = await axios.get('/api/v1/deck/stats/leitner')
      return res.data
    },
    staleTime: 30 * 1000
  })

  // 7. Speed vs Accuracy
  const { data: speedAccuracyStats } = useQuery({
    queryKey: ['stats-speed-accuracy'],
    queryFn: async () => {
      const res = await axios.get('/api/v1/deck/stats/speed-accuracy')
      return res.data
    },
    staleTime: 60 * 1000
  })

  // 8. FSRS Review forecast
  const { data: forecastData } = useQuery<ForecastResponse>({
    queryKey: ['reviewForecast'],
    queryFn: async () => {
      const res = await axios.get('/api/v1/deck/stats/review-forecast')
      return res.data
    },
    staleTime: 30 * 1000
  })

  // 9. Practice modes stats
  const { data: practiceStats } = useQuery({
    queryKey: ['practiceStats'],
    queryFn: async () => {
      const res = await axios.get('/api/v1/deck/stats/practice')
      return res.data
    },
    staleTime: 30 * 1000
  })

  if (isDetailedLoading) {
    return (
      <div className="min-h-[80vh] bg-[#F8FAFC] flex flex-col items-center justify-center p-8">
        <div className="w-16 h-16 bg-white rounded-3xl border border-slate-100 flex items-center justify-center shadow-xl shadow-indigo-100 mb-4">
          <Zap className="w-8 h-8 text-indigo-600 animate-pulse" />
        </div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">
          Đang đồng bộ dữ liệu thống kê...
        </p>
      </div>
    )
  }

  if (!detailedStatsData || (detailedStatsData as any).error) {
    return (
      <div className="min-h-[80vh] bg-[#F8FAFC] flex flex-col items-center justify-center p-8 text-center">
        <BrainCircuit className="w-12 h-12 text-slate-300 mb-4" />
        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest italic">
          Không thể tải dữ liệu thống kê
        </h3>
        <p className="text-[10px] font-medium text-slate-400 mt-2">
          {(detailedStatsData as any)?.error || "Vui lòng làm mới lại trang."}
        </p>
      </div>
    )
  }

  const { personal, global } = detailedStatsData

  const tabs: Array<{ id: StatsMainTab, label: string, icon: any, color: string, badgeBg: string }> = [
    {
      id: 'leaderboard',
      label: 'Bảng Xếp Hạng',
      icon: Trophy,
      color: 'text-amber-600',
      badgeBg: 'bg-amber-50'
    },
    {
      id: 'personal',
      label: 'Thống Kê Cá Nhân',
      icon: User,
      color: 'text-indigo-600',
      badgeBg: 'bg-indigo-50'
    },
    {
      id: 'global',
      label: 'Thống Kê Website',
      icon: Globe,
      color: 'text-emerald-600',
      badgeBg: 'bg-emerald-50'
    }
  ]

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 md:pb-16 text-slate-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-5 sm:pt-8 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 text-left">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-amber-500 flex items-center justify-center text-white shadow-md shadow-indigo-200 shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-xl font-black text-slate-900 uppercase tracking-wider italic leading-none">
                Trung Tâm Thống Kê & Bảng Vinh Danh
              </h1>
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 mt-1">
                Theo dõi tiến trình cá nhân, thứ hạng thi đua và thành tích toàn nền tảng
              </p>
            </div>
          </div>

          {/* 3 Main Tabs Nav (Desktop & Mobile Unified) */}
          <div className="flex bg-slate-200/70 p-1.5 rounded-2xl border border-slate-200/90 shadow-2xs self-start sm:self-auto overflow-x-auto no-scrollbar w-full sm:w-auto">
            {tabs.map(tab => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer",
                    isActive
                      ? "bg-white text-slate-900 shadow-sm border border-slate-200/60"
                      : "text-slate-500 hover:text-slate-800 font-bold"
                  )}
                >
                  <Icon className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4", isActive ? tab.color : "text-slate-400")} />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Tab Content Display */}
        <AnimatePresence mode="wait">
          {activeTab === 'leaderboard' && (
            <motion.div
              key="tab-leaderboard"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
            >
              <LeaderboardTab
                data={leaderboardData}
                isLoading={isLeaderboardLoading}
                activeCategory={leaderboardCategory}
                onSelectCategory={setLeaderboardCategory}
                timeFilter={leaderboardTimeFilter}
                onSelectTimeFilter={setLeaderboardTimeFilter}
              />
            </motion.div>
          )}

          {activeTab === 'personal' && (
            <motion.div
              key="tab-personal"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
            >
              <PersonalStatsTab
                personalStats={personal}
                heatmapData={heatmapData}
                weeklyReport={weeklyReport}
                leitnerStats={leitnerStats}
                speedAccuracyStats={speedAccuracyStats}
                forecastData={forecastData}
                practiceStats={practiceStats}
                dailyComparisonData={dailyComparisonRaw?.days}
                dailyComparisonAvg={dailyComparisonRaw?.all_time_avg}
                isDailyComparisonLoading={isDailyComparisonLoading}
              />
            </motion.div>
          )}

          {activeTab === 'global' && (
            <motion.div
              key="tab-global"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
            >
              <GlobalStatsTab
                globalStats={global}
                isLoading={isDetailedLoading}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
