import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, TrendingUp, Target, Trophy, Flame, ChevronLeft, Crown, Medal, Award, Brain, Clock, Zap, Sparkles, BookOpen, Layers, CheckCircle2, AlertCircle, BarChart3, HelpCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { cn } from '@/lib/utils'
import DailyComparisonChart from './DailyComparisonChart'
import { parseUTCDate, formatRelativeTime, formatOverdueTime, getCardBoxId } from '@/lib/flashcard-utils'

const getAvatarGradient = (username: string) => {
  if (!username) return 'from-slate-400 to-slate-500';
  const hash = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const gradients = [
    'from-indigo-400 to-purple-500',
    'from-purple-500 to-pink-500',
    'from-pink-500 to-rose-500',
    'from-rose-400 to-orange-500',
    'from-orange-400 to-amber-500',
    'from-emerald-400 to-teal-500',
    'from-blue-400 to-indigo-500',
    'from-cyan-400 to-blue-500'
  ];
  return gradients[hash % gradients.length];
};

interface PlayStatsDrawerProps {
  isOpen: boolean
  onClose: () => void
  activeStatsTab: 'performance' | 'goals' | 'leaderboard'
  setActiveStatsTab: (tab: 'performance' | 'goals' | 'leaderboard') => void
  dailyComparisonData?: any[]
  dailyComparisonAvg?: any
  isDailyComparisonLoading?: boolean
  activeGoal?: any
  activeMode?: string
  gamify: {
    streak: number
    level: number
    xp: number
  }
  xpLeaderboard?: {
    list?: any[]
  }
  userRank?: number
  leaderboardMsg?: string
  user: any
  currentCard?: any
  currentIndex?: number
  session?: any
  sessionStatsNode?: React.ReactNode
  practiceStatsNode?: React.ReactNode
}

export const PlayStatsDrawer: React.FC<PlayStatsDrawerProps> = ({
  isOpen,
  onClose,
  activeStatsTab,
  setActiveStatsTab,
  dailyComparisonData: propComparisonData,
  dailyComparisonAvg: propComparisonAvg,
  isDailyComparisonLoading: propComparisonLoading,
  activeGoal,
  activeMode = 'fsrs',
  gamify,
  xpLeaderboard,
  userRank,
  leaderboardMsg,
  user,
  currentCard,
  currentIndex = 0,
  session,
  sessionStatsNode,
  practiceStatsNode,
}) => {
  const navigate = useNavigate()
  const [timeFilter, setTimeFilter] = React.useState<string>('week')
  const [activeMetric, setActiveMetric] = React.useState<'xp' | 'time' | 'new_cards' | 'cards'>('xp')
  const [leaderboardData, setLeaderboardData] = React.useState<any>(null)
  const [isLeaderboardLoading, setIsLeaderboardLoading] = React.useState<boolean>(false)

  // Internal state for daily comparison data auto-fetch
  const [chartData, setChartData] = React.useState<any[] | null>(propComparisonData || null)
  const [chartAvg, setChartAvg] = React.useState<any>(propComparisonAvg || null)
  const [isChartLoading, setIsChartLoading] = React.useState<boolean>(propComparisonLoading ?? true)

  // Auto-fetch comparison chart data whenever drawer opens
  React.useEffect(() => {
    if (!isOpen) return

    let isMounted = true
    const fetchComparisonData = async () => {
      if (propComparisonData && propComparisonData.length > 0) {
        setChartData(propComparisonData)
        setChartAvg(propComparisonAvg)
        setIsChartLoading(false)
        return
      }

      setIsChartLoading(true)
      try {
        const res = await axios.get('/api/v1/stats/daily-comparison')
        if (isMounted && res.data) {
          setChartData(res.data.days || [])
          setChartAvg(res.data.all_time_avg || null)
        }
      } catch (e) {
        console.error("Failed to load daily comparison in drawer:", e)
      } finally {
        if (isMounted) setIsChartLoading(false)
      }
    }

    fetchComparisonData()
    return () => {
      isMounted = false
    }
  }, [isOpen, propComparisonData, propComparisonAvg])

  // Fetch leaderboard when in leaderboard tab
  React.useEffect(() => {
    if (!isOpen || activeStatsTab !== 'leaderboard') return

    let isMounted = true
    const fetchLeaderboard = async () => {
      setIsLeaderboardLoading(true)
      try {
        const res = await axios.get('/api/v1/gamification/leaderboard', {
          params: { time_filter: timeFilter }
        })
        if (isMounted) {
          setLeaderboardData(res.data)
        }
      } catch (e) {
        console.error("Failed to fetch leaderboard in stats drawer:", e)
      } finally {
        if (isMounted) {
          setIsLeaderboardLoading(false)
        }
      }
    }

    fetchLeaderboard()
    return () => {
      isMounted = false
    }
  }, [isOpen, activeStatsTab, timeFilter])

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const mins = Math.floor(seconds / 60)
    const hours = Math.floor(mins / 60)
    if (hours > 0) {
      return `${hours}h ${mins % 60}m`
    }
    return `${mins}m`
  }

  const formatValue = (u: any) => {
    if (activeMetric === 'xp') {
      return `${(u.xp ?? 0).toLocaleString()} XP`
    }
    if (activeMetric === 'time') {
      return formatTime(u.total_time ?? 0)
    }
    if (activeMetric === 'new_cards') {
      return `${u.new_cards ?? 0} thẻ`
    }
    return `${u.total_cards ?? 0} lượt`
  }

  // Calculate Deck-level statistics
  const deckStats = React.useMemo(() => {
    const questions: any[] = session?.questions || []
    const total = questions.length
    if (total === 0) {
      return {
        total: 0,
        mastered: 0,
        learning: 0,
        newCards: 0,
        dueCount: 0,
        boxCounts: [0, 0, 0, 0, 0, 0],
        accuracy: 0,
        masteryPercent: 0
      }
    }

    let mastered = 0
    let learning = 0
    let newCards = 0
    let dueCount = 0
    const boxCounts = [0, 0, 0, 0, 0, 0] // 0 unused, 1..5 for Box 1 to 5
    const now = Date.now()

    questions.forEach((q: any) => {
      const box = q.box_level || 1
      if (box >= 1 && box <= 5) {
        boxCounts[box] = (boxCounts[box] || 0) + 1
      }

      if (box === 5) {
        mastered++
      } else if (q.fsrs?.state === 0 && !q.fsrs?.last_review) {
        newCards++
      } else {
        learning++
      }

      // Check due
      if (q.fsrs?.due && !q.is_ignored) {
        const isDue = parseUTCDate(q.fsrs.due).getTime() - 30000 <= now
        if (isDue && (q.fsrs?.state !== 0 || q.fsrs?.last_review)) {
          dueCount++
        }
      }
    })

    const masteryPercent = total > 0 ? Math.round((mastered / total) * 100) : 0

    return {
      total,
      mastered,
      learning,
      newCards,
      dueCount,
      boxCounts,
      masteryPercent
    }
  }, [session])

  const getHeaderInfo = () => {
    switch (activeStatsTab) {
      case 'performance':
        return { title: 'Thống Kê Thẻ & Bộ Thẻ', sub: 'Chi tiết thẻ hiện tại & tiến độ bộ thẻ' };
      case 'goals':
        return { title: 'Mục Tiêu Hàng Ngày', sub: 'Theo dõi & hoàn thành mục tiêu học tập' };
      case 'leaderboard':
        const metricName = activeMetric === 'xp' ? 'XP' : activeMetric === 'time' ? 'Thời gian' : activeMetric === 'new_cards' ? 'Thẻ mới' : 'Lượt ôn';
        const filterName = timeFilter === 'today' ? 'hôm nay' : timeFilter === 'week' ? 'tuần này' : 'toàn bộ';
        return { title: `Bảng Xếp Hạng ${metricName}`, sub: `Đua top ${metricName} ${filterName}` };
      default:
        return { title: 'Thống Kê Hiệu Suất', sub: 'Theo dõi tiến độ học tập của bạn' };
    }
  };
  const headerInfo = getHeaderInfo();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0, y: 50 }} 
          animate={{ opacity: 1, y: 0 }} 
          exit={{ opacity: 0, y: 50 }} 
          className="fixed inset-x-0 top-0 bottom-[32px] sm:bottom-[38px] z-[200] bg-[#F8FAFC] lg:hidden flex flex-col"
        >
          {/* Header */}
          <header className="flex-shrink-0 z-[120] bg-white/95 backdrop-blur-2xl border-b border-slate-100/80 px-4 py-2 flex items-center gap-3 shadow-[0_1px_20px_rgba(99,102,241,0.04)]">
            <button 
              onClick={onClose} 
              className="w-8.5 h-8.5 flex items-center justify-center bg-slate-50 border border-slate-200/60 rounded-xl text-slate-600 shadow-sm hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-100 active:scale-90 transition-all flex-shrink-0"
              title="Quay lại thẻ học"
            >
              <ChevronLeft className="w-4.5 h-4.5" />
            </button>
            <div className="flex flex-col min-w-0">
              <h2 className="text-xs md:text-sm font-extrabold text-slate-800 tracking-tight leading-snug">
                {headerInfo.title}
              </h2>
              <p className="text-[9px] text-slate-400 font-bold">
                {headerInfo.sub}
              </p>
            </div>
          </header>

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4 text-left pb-24">
            {activeStatsTab === 'performance' && (
              <div className="space-y-4">
                {/* ═════════════════ SECTION 1: CURRENT CARD STATS ═════════════════ */}
                {currentCard && (
                  <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-4 text-left relative overflow-hidden">
                    <div className="h-1 absolute top-0 inset-x-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                    
                    {/* Card Header & Content */}
                    <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-100/60 text-indigo-600 text-[9px] font-black uppercase tracking-wider">
                            Thẻ #{currentIndex + 1}
                          </span>
                          <span className={cn(
                            "px-2 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-wider",
                            (currentCard.box_level || 1) === 5 ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                            (currentCard.box_level || 1) >= 3 ? "bg-blue-50 text-blue-600 border-blue-100" :
                            "bg-amber-50 text-amber-600 border-amber-100"
                          )}>
                            Box {currentCard.box_level || 1} / 5
                          </span>
                        </div>
                        <h3 className="text-sm font-black text-slate-800 truncate">
                          {currentCard.content || "Nội dung thẻ"}
                        </h3>
                        {currentCard.explanation && (
                          <p className="text-xs text-slate-500 font-semibold truncate mt-0.5">
                            {currentCard.explanation}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* FSRS Metrics Grid */}
                    {currentCard.fsrs && (() => {
                      const stateLabels = ['Mới (New)', 'Đang học (Learning)', 'Ôn tập (Review)', 'Học lại (Relearning)'];
                      const stateColors = [
                        'bg-blue-50 text-blue-600 border-blue-100',
                        'bg-amber-50 text-amber-600 border-amber-100',
                        'bg-emerald-50 text-emerald-600 border-emerald-100',
                        'bg-rose-50 text-rose-600 border-rose-100'
                      ];
                      const stateIdx = currentCard.fsrs.state || 0;
                      const overdueInfo = formatOverdueTime(currentCard.fsrs.due);
                      const lastReviewedInfo = formatRelativeTime(currentCard.fsrs.last_reviewed);
                      const firstLearnedInfo = formatRelativeTime(currentCard.fsrs.first_learned);

                      return (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {/* 1. FSRS State */}
                          <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-150/60 flex flex-col gap-1">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Trạng thái</span>
                            <span className={cn("px-1.5 py-0.5 rounded-lg border text-[10px] font-black text-center truncate", stateColors[stateIdx] || stateColors[0])}>
                              {stateLabels[stateIdx] || stateLabels[0]}
                            </span>
                          </div>

                          {/* 2. Stability */}
                          <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-150/60 flex flex-col gap-1">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Độ ổn định</span>
                            <span className="text-xs font-black text-indigo-600">
                              {currentCard.fsrs.stability ? `${Number(currentCard.fsrs.stability).toFixed(1)} ngày` : 'Mới học'}
                            </span>
                          </div>

                          {/* 3. Difficulty */}
                          <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-150/60 flex flex-col gap-1">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Độ khó</span>
                            <span className="text-xs font-black text-amber-600">
                              {currentCard.fsrs.difficulty ? `${Number(currentCard.fsrs.difficulty).toFixed(1)} / 10` : 'Chuẩn'}
                            </span>
                          </div>

                          {/* 4. Overdue */}
                          <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-150/60 flex flex-col gap-1">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Hạn ôn tập</span>
                            <span className={cn("text-[10.5px] font-black truncate", overdueInfo.overdue ? "text-rose-600" : "text-emerald-600")}>
                              {overdueInfo.relative}
                            </span>
                          </div>
                        </div>
                      )
                    })()}

                    {/* Review Timestamps */}
                    <div className="grid grid-cols-2 gap-2 text-[10px] font-bold bg-slate-50/60 rounded-2xl p-2.5 border border-slate-100">
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">Ôn gần nhất: {formatRelativeTime(currentCard.fsrs?.last_reviewed).relative}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Sparkles className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">Học lần đầu: {formatRelativeTime(currentCard.fsrs?.first_learned).relative}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* ═════════════════ SECTION 2: ENTIRE DECK OVERVIEW ═════════════════ */}
                <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-4 text-left relative overflow-hidden">
                  <div className="h-1 absolute top-0 inset-x-0 bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-500" />
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 font-black">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-800">Thống Kê Toàn Bộ Thẻ</h4>
                        <p className="text-[9px] text-slate-400 font-bold">{session?.title || 'Bộ thẻ hiện tại'}</p>
                      </div>
                    </div>
                    <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-100">
                      {deckStats.total} Thẻ Tổng Cộng
                    </span>
                  </div>

                  {/* 4 Summary Stat Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-100/60 flex flex-col items-center justify-center text-center">
                      <span className="text-[8px] font-black text-emerald-600 uppercase tracking-wider mb-0.5">Thuần Thục (Box 5)</span>
                      <span className="text-base font-black text-emerald-700">{deckStats.mastered}</span>
                      <span className="text-[8px] text-emerald-500 font-bold">
                        {deckStats.total > 0 ? Math.round((deckStats.mastered / deckStats.total) * 100) : 0}% bộ thẻ
                      </span>
                    </div>

                    <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-100/60 flex flex-col items-center justify-center text-center">
                      <span className="text-[8px] font-black text-indigo-600 uppercase tracking-wider mb-0.5">Đang Học (Box 1-4)</span>
                      <span className="text-base font-black text-indigo-700">{deckStats.learning}</span>
                      <span className="text-[8px] text-indigo-500 font-bold">
                        {deckStats.total > 0 ? Math.round((deckStats.learning / deckStats.total) * 100) : 0}% bộ thẻ
                      </span>
                    </div>

                    <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-100/60 flex flex-col items-center justify-center text-center">
                      <span className="text-[8px] font-black text-blue-600 uppercase tracking-wider mb-0.5">Chưa Học (Mới)</span>
                      <span className="text-base font-black text-blue-700">{deckStats.newCards}</span>
                      <span className="text-[8px] text-blue-500 font-bold">
                        {deckStats.total > 0 ? Math.round((deckStats.newCards / deckStats.total) * 100) : 0}% bộ thẻ
                      </span>
                    </div>

                    <div className="p-3 rounded-2xl bg-rose-50/70 border border-rose-100/60 flex flex-col items-center justify-center text-center">
                      <span className="text-[8px] font-black text-rose-600 uppercase tracking-wider mb-0.5">Cần Ôn Hôm Nay</span>
                      <span className="text-base font-black text-rose-700">{deckStats.dueCount}</span>
                      <span className="text-[8px] text-rose-500 font-bold">Đến hạn ôn FSRS 🔥</span>
                    </div>
                  </div>

                  {/* Leitner Box Breakdown Bar */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                      <span>Phân bố 5 Hộp Ghi Nhớ (Leitner Mastery):</span>
                      <span className="font-black text-emerald-600">{deckStats.masteryPercent}% Hoàn Thành</span>
                    </div>
                    
                    {/* Stacked Progress Bar */}
                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                      {deckStats.total > 0 && (
                        <>
                          <div 
                            title={`Box 1: ${deckStats.boxCounts[1]} thẻ`}
                            className="h-full bg-rose-400 transition-all duration-500" 
                            style={{ width: `${(deckStats.boxCounts[1] / deckStats.total) * 100}%` }} 
                          />
                          <div 
                            title={`Box 2: ${deckStats.boxCounts[2]} thẻ`}
                            className="h-full bg-amber-400 transition-all duration-500" 
                            style={{ width: `${(deckStats.boxCounts[2] / deckStats.total) * 100}%` }} 
                          />
                          <div 
                            title={`Box 3: ${deckStats.boxCounts[3]} thẻ`}
                            className="h-full bg-yellow-400 transition-all duration-500" 
                            style={{ width: `${(deckStats.boxCounts[3] / deckStats.total) * 100}%` }} 
                          />
                          <div 
                            title={`Box 4: ${deckStats.boxCounts[4]} thẻ`}
                            className="h-full bg-blue-400 transition-all duration-500" 
                            style={{ width: `${(deckStats.boxCounts[4] / deckStats.total) * 100}%` }} 
                          />
                          <div 
                            title={`Box 5 (Mastered): ${deckStats.boxCounts[5]} thẻ`}
                            className="h-full bg-emerald-500 transition-all duration-500" 
                            style={{ width: `${(deckStats.boxCounts[5] / deckStats.total) * 100}%` }} 
                          />
                        </>
                      )}
                    </div>

                    {/* Box Legend Pills */}
                    <div className="grid grid-cols-5 gap-1 pt-1 text-center">
                      <div className="p-1.5 rounded-xl bg-rose-50 border border-rose-100">
                        <span className="block text-[8px] font-black text-rose-500 uppercase">Box 1</span>
                        <span className="text-[11px] font-black text-rose-700">{deckStats.boxCounts[1]}</span>
                      </div>
                      <div className="p-1.5 rounded-xl bg-amber-50 border border-amber-100">
                        <span className="block text-[8px] font-black text-amber-500 uppercase">Box 2</span>
                        <span className="text-[11px] font-black text-amber-700">{deckStats.boxCounts[2]}</span>
                      </div>
                      <div className="p-1.5 rounded-xl bg-yellow-50 border border-yellow-100">
                        <span className="block text-[8px] font-black text-yellow-600 uppercase">Box 3</span>
                        <span className="text-[11px] font-black text-yellow-700">{deckStats.boxCounts[3]}</span>
                      </div>
                      <div className="p-1.5 rounded-xl bg-blue-50 border border-blue-100">
                        <span className="block text-[8px] font-black text-blue-500 uppercase">Box 4</span>
                        <span className="text-[11px] font-black text-blue-700">{deckStats.boxCounts[4]}</span>
                      </div>
                      <div className="p-1.5 rounded-xl bg-emerald-50 border border-emerald-100">
                        <span className="block text-[8px] font-black text-emerald-500 uppercase">Box 5 🏆</span>
                        <span className="text-[11px] font-black text-emerald-700">{deckStats.boxCounts[5]}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ═════════════════ SECTION 3: DAILY COMPARISON CHART ═════════════════ */}
                <DailyComparisonChart 
                  data={chartData || []} 
                  allTimeAvg={chartAvg} 
                  isLoading={isChartLoading} 
                />
              </div>
            )}

            {activeStatsTab === 'goals' && (
              <>
                {/* Daily Goal Card */}
                {activeMode !== 'review' && (
                  <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black">
                          🗺️
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-slate-800">Lộ Trình Roadmap</h4>
                          <p className="text-[10px] text-slate-400 font-semibold">Cá nhân hóa</p>
                        </div>
                      </div>
                    </div>
                    {activeGoal ? (
                      <div className="space-y-3">
                        <div className="flex justify-between items-end">
                          <span className="text-2xl font-black text-slate-800">
                            {activeGoal.done_today} <span className="text-xs text-slate-400 font-bold">/ {activeGoal.daily_target} cards</span>
                          </span>
                          <span className="text-xs font-black text-indigo-600">
                            {Math.round((activeGoal.done_today / activeGoal.daily_target) * 100)}%
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.round((activeGoal.done_today / activeGoal.daily_target) * 100))}%` }}
                          />
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                          {activeGoal.is_target_met 
                            ? "🎉 Awesome! You've met your daily goal. Keep pushing your limits!"
                            : `🎯 You need to study ${activeGoal.daily_target - activeGoal.done_today} more new cards to complete your daily goal!`
                          }
                        </p>
                      </div>
                    ) : (
                      <div className="py-1">
                        <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                          You haven't set a daily goal for this deck yet. Set a goal on the home page to maintain your daily habit! 💡
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Learning Streak & Level */}
                <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500">
                        <Flame className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-700">Learning Streak</h4>
                        <p className="text-[10px] text-slate-400 font-medium">Consecutive days</p>
                      </div>
                    </div>
                    <span className="text-xs font-black text-orange-600 bg-orange-50 px-2.5 py-1 rounded-xl border border-orange-100 shadow-sm">
                      {gamify.streak} days 🔥
                    </span>
                  </div>
                  <div className="pt-3 border-t border-slate-50 space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-600">Level {gamify.level}</span>
                      <span className="font-bold text-slate-400">{gamify.xp % 1000} / 1000 XP</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-orange-400 rounded-full"
                        style={{ width: `${(gamify.xp % 1000) / 10}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium">
                      {1000 - (gamify.xp % 1000)} XP more to reach level {gamify.level + 1}!
                    </p>
                  </div>
                </div>
              </>
            )}

            {activeStatsTab === 'leaderboard' && (() => {
              const currentList = leaderboardData 
                ? (activeMetric === 'xp' 
                  ? leaderboardData.leaderboard 
                  : activeMetric === 'time' 
                    ? (leaderboardData.time_leaderboard || []) 
                    : activeMetric === 'new_cards' 
                      ? (leaderboardData.new_cards_leaderboard || []) 
                      : (leaderboardData.cards_leaderboard || []))
                : []

              const top1 = currentList.find((u: any) => u.rank === 1)
              const top2 = currentList.find((u: any) => u.rank === 2)
              const top3 = currentList.find((u: any) => u.rank === 3)
              const remainingList = currentList.filter((u: any) => u.rank > 3)

              const tabs = [
                { id: 'xp', label: 'XP', icon: Zap },
                { id: 'time', label: 'Thời gian', icon: Clock },
                { id: 'new_cards', label: 'Thẻ mới', icon: Brain },
                { id: 'cards', label: 'Lượt ôn', icon: Flame }
              ]

              return (
                <>
                  <div className="bg-white p-5 rounded-[2.5rem] border border-slate-100/80 shadow-md space-y-5">
                    {/* Time Filter Pills */}
                    <div className="flex items-center bg-slate-50/80 p-1.5 rounded-2xl border border-slate-150/60 shadow-xs gap-1">
                      {['today', 'week', 'all'].map((filter) => (
                        <button
                          key={filter}
                          onClick={() => setTimeFilter(filter)}
                          className={cn(
                            "flex-1 py-1.5 text-center font-black text-[10px] rounded-xl transition-all duration-300 uppercase tracking-wider",
                            timeFilter === filter 
                              ? "bg-white text-indigo-600 shadow-sm border border-indigo-100/80 scale-[1.02]" 
                              : "text-slate-400 hover:text-slate-600"
                          )}
                        >
                          {filter === 'today' ? 'Hôm nay' : filter === 'week' ? 'Tuần này' : 'Toàn bộ'}
                        </button>
                      ))}
                    </div>

                    {/* Metric Selector Tabs */}
                    <div className="grid grid-cols-4 gap-1.5">
                      {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeMetric === tab.id;
                        return (
                          <button
                            key={tab.id}
                            onClick={() => setActiveMetric(tab.id as any)}
                            className={cn(
                              "flex flex-col items-center justify-center p-2 rounded-2xl border transition-all duration-300 gap-1",
                              isActive
                                ? "bg-indigo-50/90 border-indigo-200/80 text-indigo-600 shadow-sm scale-105"
                                : "bg-slate-50/60 border-slate-150/50 text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                            )}
                          >
                            <Icon className="w-4 h-4" />
                            <span className="text-[9px] font-black tracking-tight">{tab.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {isLeaderboardLoading ? (
                      <div className="py-12 flex flex-col items-center justify-center gap-3">
                        <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đang tải bảng xếp hạng...</span>
                      </div>
                    ) : currentList && currentList.length > 0 ? (
                      <div className="space-y-4 pt-2">
                        {/* Podium Top 3 */}
                        <div className="flex items-end justify-center gap-2 pt-4 pb-2 px-1">
                          {/* Rank 2 */}
                          {top2 && (
                            <div className="flex flex-col items-center flex-1 max-w-[90px]">
                              <div className="relative mb-2">
                                <div className={cn("w-11 h-11 rounded-full bg-gradient-to-tr flex items-center justify-center text-white font-bold text-xs shadow-md border-2 border-slate-200", getAvatarGradient(top2.username))}>
                                  {top2.username?.slice(0, 2).toUpperCase()}
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-200 border border-white flex items-center justify-center text-[10px] font-black text-slate-700 shadow-xs">
                                  2
                                </div>
                              </div>
                              <span className="text-[11px] font-black text-slate-700 truncate w-full text-center">{top2.username}</span>
                              <span className="text-[9px] font-bold text-slate-400 mt-0.5">{formatValue(top2)}</span>
                            </div>
                          )}

                          {/* Rank 1 */}
                          {top1 && (
                            <div className="flex flex-col items-center flex-1 max-w-[105px] -mt-4">
                              <Crown className="w-5 h-5 text-amber-500 animate-bounce mb-1" />
                              <div className="relative mb-2">
                                <div className={cn("w-14 h-14 rounded-full bg-gradient-to-tr flex items-center justify-center text-white font-black text-sm shadow-lg border-2 border-amber-300 ring-4 ring-amber-100", getAvatarGradient(top1.username))}>
                                  {top1.username?.slice(0, 2).toUpperCase()}
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-400 border-2 border-white flex items-center justify-center text-xs font-black text-white shadow-sm">
                                  1
                                </div>
                              </div>
                              <span className="text-xs font-black text-slate-800 truncate w-full text-center">{top1.username}</span>
                              <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full mt-0.5 border border-amber-100">{formatValue(top1)}</span>
                            </div>
                          )}

                          {/* Rank 3 */}
                          {top3 && (
                            <div className="flex flex-col items-center flex-1 max-w-[90px]">
                              <div className="relative mb-2">
                                <div className={cn("w-11 h-11 rounded-full bg-gradient-to-tr flex items-center justify-center text-white font-bold text-xs shadow-md border-2 border-amber-600/30", getAvatarGradient(top3.username))}>
                                  {top3.username?.slice(0, 2).toUpperCase()}
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-600/20 border border-white flex items-center justify-center text-[10px] font-black text-amber-800 shadow-xs">
                                  3
                                </div>
                              </div>
                              <span className="text-[11px] font-black text-slate-700 truncate w-full text-center">{top3.username}</span>
                              <span className="text-[9px] font-bold text-slate-400 mt-0.5">{formatValue(top3)}</span>
                            </div>
                          )}
                        </div>

                        {/* List from 4th */}
                        {remainingList.length > 0 && (
                          <div className="space-y-1.5 max-h-60 overflow-y-auto custom-scrollbar pr-1 pt-2 border-t border-slate-100">
                            {remainingList.map((u: any) => {
                              const isCurrentUser = u.is_current_user;
                              return (
                                <div
                                  key={u.user_id || u.rank}
                                  className={cn(
                                    "flex items-center justify-between p-2.5 rounded-2xl border transition-all duration-200",
                                    isCurrentUser
                                      ? "bg-indigo-50/80 border-indigo-200/90 shadow-sm"
                                      : "bg-slate-50/50 border-slate-150/40 hover:bg-slate-50"
                                  )}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <span className="text-[10px] font-black text-slate-400 w-5 text-center">#{u.rank}</span>
                                    <div className={cn("w-7 h-7 rounded-full bg-gradient-to-tr flex items-center justify-center text-white font-bold text-[10px]", getAvatarGradient(u.username))}>
                                      {u.username?.slice(0, 2).toUpperCase()}
                                    </div>
                                    <span className={cn("text-xs font-bold truncate", isCurrentUser ? "text-indigo-900 font-black" : "text-slate-700")}>
                                      {u.username} {isCurrentUser && " (Bạn)"}
                                    </span>
                                  </div>
                                  <span className={cn("text-xs font-black shrink-0", isCurrentUser ? "text-indigo-600" : "text-slate-600")}>
                                    {formatValue(u)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-400 text-center py-8 font-medium">Chưa có dữ liệu xếp hạng trong khoảng thời gian này.</p>
                    )}
                  </div>
                </>
              )
            })()}
          </div>

          {/* Sticky Bottom Footer */}
          <div className="flex items-center justify-center py-3 border-t border-slate-100 bg-white/95 backdrop-blur-xl sticky bottom-0 z-50 px-4">
            <div className="flex items-center bg-slate-50 p-1 rounded-2xl h-12 border border-slate-200/60 shadow-inner gap-1 flex-1 max-w-[320px] justify-center">
              <button
                onClick={() => setActiveStatsTab('performance')}
                className={cn(
                  "flex-1 h-9 flex items-center justify-center rounded-xl transition-all duration-300 gap-1 px-1 text-[10px] font-black uppercase tracking-wider",
                  activeStatsTab === 'performance'
                    ? "text-indigo-600 bg-white shadow-md border border-indigo-100/60 scale-105"
                    : "text-slate-400 hover:text-slate-600"
                )}
              >
                <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">STATS</span>
              </button>

              <button
                onClick={() => setActiveStatsTab('goals')}
                className={cn(
                  "flex-1 h-9 flex items-center justify-center rounded-xl transition-all duration-300 gap-1 px-1 text-[10px] font-black uppercase tracking-wider",
                  activeStatsTab === 'goals'
                    ? "text-orange-500 bg-white shadow-md border border-orange-100/60 scale-105"
                    : "text-slate-400 hover:text-slate-600"
                )}
              >
                <Target className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">GOALS</span>
              </button>

              <button
                onClick={() => setActiveStatsTab('leaderboard')}
                className={cn(
                  "flex-1 h-9 flex items-center justify-center rounded-xl transition-all duration-300 gap-1 px-1 text-[10px] font-black uppercase tracking-wider",
                  activeStatsTab === 'leaderboard'
                    ? "text-amber-500 bg-white shadow-md border border-amber-100/60 scale-105"
                    : "text-slate-400 hover:text-slate-600"
                )}
              >
                <Trophy className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">RANK</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
