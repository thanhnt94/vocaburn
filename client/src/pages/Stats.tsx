import { useState, useRef } from 'react'
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

  // Touch swipe handling for horizontal thumb navigation
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return
    const diffX = touchStartX.current - e.changedTouches[0].clientX
    const diffY = touchStartY.current - e.changedTouches[0].clientY
    
    // Swipe left/right with minimum distance and horizontal dominance
    if (Math.abs(diffX) > 45 && Math.abs(diffX) > Math.abs(diffY) * 1.4) {
      const tabOrder: StatsMainTab[] = ['leaderboard', 'personal', 'global']
      const currentIndex = tabOrder.indexOf(activeTab)
      if (diffX > 0 && currentIndex < tabOrder.length - 1) {
        // Swiped left -> Next tab
        if (navigator.vibrate) navigator.vibrate(8)
        setActiveTab(tabOrder[currentIndex + 1])
      } else if (diffX < 0 && currentIndex > 0) {
        // Swiped right -> Previous tab
        if (navigator.vibrate) navigator.vibrate(8)
        setActiveTab(tabOrder[currentIndex - 1])
      }
    }
    touchStartX.current = null
    touchStartY.current = null
  }

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
          Syncing stats data...
        </p>
      </div>
    )
  }

  if (!detailedStatsData || (detailedStatsData as any).error) {
    return (
      <div className="min-h-[80vh] bg-[#F8FAFC] flex flex-col items-center justify-center p-8 text-center">
        <BrainCircuit className="w-12 h-12 text-slate-300 mb-4" />
        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest italic">
          Unable to load stats
        </h3>
        <p className="text-[10px] font-medium text-slate-400 mt-2">
          {(detailedStatsData as any)?.error || "Please refresh the page."}
        </p>
      </div>
    )
  }

  const { personal, global } = detailedStatsData

  const tabs: Array<{ id: StatsMainTab, label: string, shortLabel: string, icon: any, color: string, badgeBg: string }> = [
    {
      id: 'leaderboard',
      label: 'Leaderboard',
      shortLabel: 'Leaderboard',
      icon: Trophy,
      color: 'text-amber-600',
      badgeBg: 'bg-amber-50'
    },
    {
      id: 'personal',
      label: 'Personal Stats',
      shortLabel: 'Personal',
      icon: User,
      color: 'text-indigo-600',
      badgeBg: 'bg-indigo-50'
    },
    {
      id: 'global',
      label: 'Global Stats',
      shortLabel: 'Global',
      icon: Globe,
      color: 'text-emerald-600',
      badgeBg: 'bg-emerald-50'
    }
  ]

  return (
    <div className="fixed inset-0 top-0 bottom-[68px] md:relative md:inset-auto md:top-auto md:bottom-auto md:h-full md:min-h-0 md:w-full flex flex-col bg-[#F8FAFC] overflow-hidden text-left select-none">
      {/* ═══════════ TOP UNIFIED HEADER ═══════════ */}
      <div className="shrink-0 z-30 bg-white/90 backdrop-blur-2xl border-b border-slate-200/70 shadow-2xs px-3.5 sm:px-6 lg:px-8 xl:px-10 py-2 sm:py-3">
        <div className="w-full max-w-[1700px] 2xl:max-w-[1900px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 text-left">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-md shadow-slate-900/10 shrink-0">
              <TrendingUp className="w-4.5 h-4.5 sm:w-5 sm:h-5 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-lg md:text-xl font-black text-slate-900 uppercase tracking-tight italic leading-none truncate">
                Stats & Leaderboard
              </h1>
              <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider sm:tracking-[0.2em] mt-0.5 truncate">
                Track Personal Progress & Global Rankings
              </p>
            </div>
          </div>

          {/* Unified Responsive Segmented Tab Switcher */}
          <div className="flex items-center bg-slate-100/90 p-1 rounded-2xl border border-slate-200/70 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] gap-1 w-full sm:w-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (navigator.vibrate) navigator.vibrate(8)
                    setActiveTab(tab.id)
                  }}
                  className={cn(
                    "relative flex-1 sm:flex-initial flex items-center justify-center gap-1.5 py-1.5 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition-all select-none cursor-pointer",
                    isActive ? "text-orange-600 font-extrabold" : "text-slate-600 hover:text-slate-900 hover:bg-white/50 font-semibold"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="unifiedStatsTabPill"
                      className="absolute inset-0 bg-white rounded-xl shadow-xs border border-slate-200/80"
                      transition={{ type: "spring", stiffness: 450, damping: 32 }}
                    />
                  )}
                  <Icon className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4 relative z-10 shrink-0", isActive ? "text-orange-500 stroke-[2.2]" : "text-slate-400 stroke-[1.8]")} />
                  <span className="relative z-10 text-[11px] sm:text-xs md:text-sm truncate">{tab.shortLabel}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ═══════════ TAB CONTENT AREA WITH HORIZONTAL TOUCH SWIPE ═══════════ */}
      <div 
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="flex-1 min-h-0 flex flex-col overflow-hidden px-3.5 sm:px-6 lg:px-8 xl:px-10 py-2 sm:py-2.5"
      >
        <div className="w-full max-w-[1700px] 2xl:max-w-[1900px] mx-auto w-full flex-1 min-h-0 flex flex-col overflow-hidden">
          <AnimatePresence mode="wait">
            {activeTab === 'leaderboard' && (
              <motion.div
                key="tab-leaderboard"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="h-full flex flex-col min-h-0"
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
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="h-full overflow-y-auto custom-scrollbar space-y-4 pb-6"
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
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="h-full overflow-y-auto custom-scrollbar space-y-4 pb-6"
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
    </div>
  )
}
