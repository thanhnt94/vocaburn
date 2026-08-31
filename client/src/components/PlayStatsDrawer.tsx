import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, TrendingUp, Target, Trophy, Flame, ChevronLeft, Crown, Medal, Award, 
  Brain, Clock, Zap, Sparkles, BookOpen, Layers, CheckCircle2, XCircle, 
  AlertCircle, BarChart3, HelpCircle, History, RotateCcw, Volume2, Calendar,
  ArrowUpRight, ArrowDownRight, Percent, Timer
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { cn } from '@/lib/utils'
import DailyComparisonChart from './DailyComparisonChart'
import { parseUTCDate, formatRelativeTime, formatOverdueTime, getCardBoxId, getFSRSIntervals } from '@/lib/flashcard-utils'
import { speakWithEdgeTTS } from '@/lib/audio'

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
  activeStatsTab?: 'performance' | 'goals' | 'leaderboard'
  setActiveStatsTab?: (tab: 'performance' | 'goals' | 'leaderboard') => void
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
  activeGoal,
  activeMode = 'fsrs',
  gamify,
  userRank,
  user,
  currentCard,
  currentIndex = 0,
  session,
}) => {
  const navigate = useNavigate()
  
  // 2 Primary Tabs: 'card' (Thẻ Này) vs 'deck' (Toàn Bộ Bộ Thẻ) vs 'rank' (Bảng Xếp Hạng & Mục Tiêu)
  const [statsViewMode, setStatsViewMode] = useState<'card' | 'deck' | 'rank'>('card')

  // Detailed data states
  const [cardDetails, setCardDetails] = useState<any>(null)
  const [isCardLoading, setIsCardLoading] = useState<boolean>(false)

  const [deckSummary, setDeckSummary] = useState<any>(null)
  const [isDeckSummaryLoading, setIsDeckSummaryLoading] = useState<boolean>(false)

  const [chartData, setChartData] = useState<any[] | null>(null)
  const [chartAvg, setChartAvg] = useState<any>(null)
  const [isChartLoading, setIsChartLoading] = useState<boolean>(true)

  // Leaderboard states
  const [timeFilter, setTimeFilter] = useState<string>('week')
  const [activeMetric, setActiveMetric] = useState<'xp' | 'time' | 'new_cards' | 'cards'>('xp')
  const [leaderboardData, setLeaderboardData] = useState<any>(null)
  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState<boolean>(false)

  // 1. Fetch detailed stats for current card
  useEffect(() => {
    if (!isOpen || !currentCard?.id) return

    let isMounted = true
    const fetchCardStats = async () => {
      setIsCardLoading(true)
      try {
        const res = await axios.get(`/api/v1/deck/question/${currentCard.id}/detailed-stats`)
        if (isMounted && res.data) {
          setCardDetails(res.data)
        }
      } catch (e) {
        console.error("Failed to load card detailed stats:", e)
      } finally {
        if (isMounted) setIsCardLoading(false)
      }
    }

    fetchCardStats()
    return () => { isMounted = false }
  }, [isOpen, currentCard?.id])

  // 2. Fetch deck overview stats & daily comparison
  useEffect(() => {
    if (!isOpen || !session?.id) return

    let isMounted = true
    const fetchDeckStats = async () => {
      setIsDeckSummaryLoading(true)
      setIsChartLoading(true)
      try {
        const [deckRes, chartRes] = await Promise.allSettled([
          axios.get(`/api/v1/deck/${session.id}/overview-stats`),
          axios.get('/api/v1/stats/daily-comparison')
        ])

        if (isMounted) {
          if (deckRes.status === 'fulfilled' && deckRes.value.data) {
            setDeckSummary(deckRes.value.data)
          }
          if (chartRes.status === 'fulfilled' && chartRes.value.data) {
            setChartData(chartRes.value.data.days || [])
            setChartAvg(chartRes.value.data.all_time_avg || null)
          }
        }
      } catch (e) {
        console.error("Failed to load deck summary:", e)
      } finally {
        if (isMounted) {
          setIsDeckSummaryLoading(false)
          setIsChartLoading(false)
        }
      }
    }

    fetchDeckStats()
    return () => { isMounted = false }
  }, [isOpen, session?.id])

  // 3. Fetch leaderboard
  useEffect(() => {
    if (!isOpen || statsViewMode !== 'rank') return

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
        console.error("Failed to fetch leaderboard:", e)
      } finally {
        if (isMounted) setIsLeaderboardLoading(false)
      }
    }

    fetchLeaderboard()
    return () => { isMounted = false }
  }, [isOpen, statsViewMode, timeFilter])

  const formatSeconds = (seconds: number) => {
    if (!seconds || seconds <= 0) return '0s'
    if (seconds < 60) return `${Math.round(seconds)}s`
    const mins = Math.floor(seconds / 60)
    const secs = Math.round(seconds % 60)
    const hours = Math.floor(mins / 60)
    if (hours > 0) {
      return `${hours}h ${mins % 60}m`
    }
    return `${mins}m ${secs > 0 ? `${secs}s` : ''}`
  }

  const formatValue = (u: any) => {
    if (activeMetric === 'xp') return `${(u.xp ?? 0).toLocaleString()} XP`
    if (activeMetric === 'time') return formatSeconds(u.total_time ?? 0)
    if (activeMetric === 'new_cards') return `${u.new_cards ?? 0} thẻ`
    return `${u.total_cards ?? 0} lượt`
  }

  // Fallback card stats from prop if API is loading
  const cardInfo = cardDetails || {
    content: currentCard?.content,
    explanation: currentCard?.explanation,
    box_level: currentCard?.box_level || 1,
    consecutive_correct: currentCard?.stats?.total || 0,
    fsrs: currentCard?.fsrs || {},
    reviews_summary: {
      total_reviews: currentCard?.stats?.total || 0,
      correct_count: currentCard?.stats?.correct || 0,
      accuracy_percent: currentCard?.stats?.total > 0 ? Math.round((currentCard.stats.correct / currentCard.stats.total) * 100) : 0,
      total_time_seconds: 0,
      avg_time_seconds: 0,
      again_count: 0,
      hard_count: 0,
      good_count: 0,
      easy_count: 0,
      again_percent: 0,
      hard_percent: 0,
      good_percent: 0,
      easy_percent: 0
    },
    history_logs: []
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0, y: 30 }} 
          animate={{ opacity: 1, y: 0 }} 
          exit={{ opacity: 0, y: 30 }} 
          className="fixed inset-x-0 top-0 bottom-12 z-[250] bg-[#F8FAFC] flex flex-col select-none overflow-hidden"
        >
          {/* ════════════ TOP HEADER ════════════ */}
          <header className="flex-shrink-0 z-[120] bg-white/95 backdrop-blur-2xl border-b border-slate-100/90 px-4 py-2 flex items-center justify-between shadow-[0_1px_15px_rgba(0,0,0,0.03)]">
            <div className="flex items-center gap-2.5 min-w-0">
              <button 
                onClick={onClose} 
                className="w-8 h-8 flex items-center justify-center bg-slate-50 border border-slate-200/70 rounded-xl text-slate-600 shadow-2xs hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-100 active:scale-90 transition-all shrink-0"
                title="Quay lại thẻ học"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex flex-col min-w-0">
                <h2 className="text-xs sm:text-sm font-black text-slate-800 tracking-tight leading-snug truncate">
                  {statsViewMode === 'card' ? 'Thống Kê Thẻ Này' : statsViewMode === 'deck' ? 'Thống Kê Toàn Bộ Bộ Thẻ' : 'Bảng Xếp Hạng & Mục Tiêu'}
                </h2>
                <p className="text-[9px] text-slate-400 font-bold truncate">
                  {statsViewMode === 'card' ? `Thẻ #${currentIndex + 1}: ${currentCard?.content || ''}` : session?.title || 'Bộ thẻ'}
                </p>
              </div>
            </div>

            {/* Quick Mode Toggle Pills */}
            <div className="flex items-center bg-slate-100/80 p-1 rounded-xl border border-slate-200/60 shadow-2xs gap-1 shrink-0">
              <button
                onClick={() => setStatsViewMode('card')}
                className={cn(
                  "px-2.5 py-1 text-[9.5px] font-black uppercase tracking-wider rounded-lg transition-all",
                  statsViewMode === 'card'
                    ? "bg-white text-indigo-600 shadow-xs border border-indigo-100 scale-105"
                    : "text-slate-400 hover:text-slate-600"
                )}
              >
                Thẻ này
              </button>
              <button
                onClick={() => setStatsViewMode('deck')}
                className={cn(
                  "px-2.5 py-1 text-[9.5px] font-black uppercase tracking-wider rounded-lg transition-all",
                  statsViewMode === 'deck'
                    ? "bg-white text-emerald-600 shadow-xs border border-emerald-100 scale-105"
                    : "text-slate-400 hover:text-slate-600"
                )}
              >
                Bộ thẻ
              </button>
              <button
                onClick={() => setStatsViewMode('rank')}
                className={cn(
                  "px-2.5 py-1 text-[9.5px] font-black uppercase tracking-wider rounded-lg transition-all",
                  statsViewMode === 'rank'
                    ? "bg-white text-amber-600 shadow-xs border border-amber-100 scale-105"
                    : "text-slate-400 hover:text-slate-600"
                )}
              >
                Đua Top
              </button>
            </div>
          </header>

          {/* ════════════ SCROLLABLE CONTENT BODY ════════════ */}
          <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 custom-scrollbar space-y-4 text-left pb-16">
            
            {/* ─────────────────────────────────────────────────────────────
                VIEW 1: THỐNG KÊ CHI TIẾT THẺ HIỆN TẠI (CURRENT CARD STATS)
               ───────────────────────────────────────────────────────────── */}
            {statsViewMode === 'card' && (
              <div className="space-y-4">
                {/* 1. Header Card Info */}
                <div className="bg-white p-4.5 rounded-3xl border border-slate-200/80 shadow-sm relative overflow-hidden space-y-3">
                  <div className="h-1.5 absolute top-0 inset-x-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                  
                  <div className="flex items-start justify-between gap-3 pt-1">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-600 text-[9px] font-black uppercase tracking-wider">
                          Thẻ #{currentIndex + 1}
                        </span>
                        <span className={cn(
                          "px-2 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-wider",
                          cardInfo.box_level === 5 ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                          cardInfo.box_level >= 3 ? "bg-blue-50 text-blue-600 border-blue-100" :
                          "bg-amber-50 text-amber-600 border-amber-100"
                        )}>
                          Leitner Box {cardInfo.box_level || 1} / 5
                        </span>
                        {cardInfo.consecutive_correct > 0 && (
                          <span className="px-2 py-0.5 rounded-md bg-orange-50 text-orange-600 border border-orange-100 text-[9px] font-black">
                            🔥 {cardInfo.consecutive_correct} đúng liên tiếp
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-black text-slate-800 leading-snug">
                        {cardInfo.content || currentCard?.content || "Nội dung thẻ"}
                      </h3>
                      {cardInfo.explanation && (
                        <p className="text-xs text-slate-500 font-semibold mt-1 leading-relaxed">
                          {cardInfo.explanation}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => speakWithEdgeTTS(cardInfo.content || currentCard?.content || '')}
                      className="w-9 h-9 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-100/60 flex items-center justify-center transition-all active:scale-90 shrink-0"
                      title="Phát âm"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 2. Four Hero KPI Cards for this Card */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {/* Lượt ôn */}
                  <div className="p-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col items-center justify-center text-center">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Tổng Lượt Ôn</span>
                    <span className="text-lg font-black text-slate-800">{cardInfo.reviews_summary?.total_reviews ?? 0}</span>
                    <span className="text-[8.5px] font-bold text-emerald-600">
                      Tỉ lệ đúng: {cardInfo.reviews_summary?.accuracy_percent ?? 0}%
                    </span>
                  </div>

                  {/* Tổng thời gian học */}
                  <div className="p-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col items-center justify-center text-center">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Tổng Thời Gian</span>
                    <span className="text-lg font-black text-indigo-600">
                      {formatSeconds(cardInfo.reviews_summary?.total_time_seconds || 0)}
                    </span>
                    <span className="text-[8.5px] font-bold text-slate-400">
                      TB {cardInfo.reviews_summary?.avg_time_seconds ?? 0}s / lần
                    </span>
                  </div>

                  {/* FSRS Stability */}
                  <div className="p-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col items-center justify-center text-center">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Độ Bền Nhớ (S)</span>
                    <span className="text-lg font-black text-purple-600">
                      {cardInfo.fsrs?.stability ? `${Number(cardInfo.fsrs.stability).toFixed(1)}d` : 'Mới học'}
                    </span>
                    <span className="text-[8.5px] font-bold text-purple-500">
                      Độ khó: {cardInfo.fsrs?.difficulty ? `${Number(cardInfo.fsrs.difficulty).toFixed(1)}/10` : 'Chuẩn'}
                    </span>
                  </div>

                  {/* FSRS Retrievability (Khả năng nhớ) */}
                  <div className="p-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col items-center justify-center text-center">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Khả Năng Nhớ (R)</span>
                    <span className={cn(
                      "text-lg font-black",
                      (cardInfo.fsrs?.retrievability ?? 90) >= 80 ? "text-emerald-600" :
                      (cardInfo.fsrs?.retrievability ?? 90) >= 50 ? "text-amber-600" : "text-rose-600"
                    )}>
                      {cardInfo.fsrs?.retrievability !== null && cardInfo.fsrs?.retrievability !== undefined
                        ? `${cardInfo.fsrs.retrievability}%` 
                        : (cardInfo.fsrs?.state === 0 ? '100%' : '90%')}
                    </span>
                    <span className="text-[8.5px] font-bold text-slate-400">
                      {formatOverdueTime(cardInfo.fsrs?.due).relative}
                    </span>
                  </div>
                </div>

                {/* 3. Four Rating Breakdown (Again, Hard, Good, Easy) */}
                <div className="bg-white p-4.5 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <BarChart3 className="w-3.5 h-3.5 text-indigo-500" />
                      Phân Bố Các Lần Chọn Nút
                    </h4>
                    <span className="text-[9px] font-bold text-slate-400">
                      {cardInfo.reviews_summary?.total_reviews ?? 0} lần đánh giá
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {/* AGAIN */}
                    <div className="p-2.5 rounded-2xl bg-rose-50/80 border border-rose-100 flex flex-col items-center justify-center text-center">
                      <span className="text-[8.5px] font-black text-rose-500 uppercase tracking-wider">AGAIN (1)</span>
                      <span className="text-base font-black text-rose-700">{cardInfo.reviews_summary?.again_count ?? 0}</span>
                      <span className="text-[8px] font-bold text-rose-500">{cardInfo.reviews_summary?.again_percent ?? 0}%</span>
                    </div>

                    {/* HARD */}
                    <div className="p-2.5 rounded-2xl bg-amber-50/80 border border-amber-100 flex flex-col items-center justify-center text-center">
                      <span className="text-[8.5px] font-black text-amber-500 uppercase tracking-wider">HARD (2)</span>
                      <span className="text-base font-black text-amber-700">{cardInfo.reviews_summary?.hard_count ?? 0}</span>
                      <span className="text-[8px] font-bold text-amber-500">{cardInfo.reviews_summary?.hard_percent ?? 0}%</span>
                    </div>

                    {/* GOOD */}
                    <div className="p-2.5 rounded-2xl bg-indigo-50/80 border border-indigo-100 flex flex-col items-center justify-center text-center">
                      <span className="text-[8.5px] font-black text-indigo-500 uppercase tracking-wider">GOOD (3)</span>
                      <span className="text-base font-black text-indigo-700">{cardInfo.reviews_summary?.good_count ?? 0}</span>
                      <span className="text-[8px] font-bold text-indigo-500">{cardInfo.reviews_summary?.good_percent ?? 0}%</span>
                    </div>

                    {/* EASY */}
                    <div className="p-2.5 rounded-2xl bg-emerald-50/80 border border-emerald-100 flex flex-col items-center justify-center text-center">
                      <span className="text-[8.5px] font-black text-emerald-500 uppercase tracking-wider">EASY (4)</span>
                      <span className="text-base font-black text-emerald-700">{cardInfo.reviews_summary?.easy_count ?? 0}</span>
                      <span className="text-[8px] font-bold text-emerald-500">{cardInfo.reviews_summary?.easy_percent ?? 0}%</span>
                    </div>
                  </div>
                </div>

                {/* 4. Deep FSRS & Timestamps Parameters */}
                <div className="bg-white p-4.5 rounded-3xl border border-slate-200/80 shadow-sm space-y-3 text-xs font-semibold">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Brain className="w-3.5 h-3.5 text-purple-500" />
                    Thông Số FSRS & Lịch Học Chi Tiết
                  </h4>

                  <div className="grid grid-cols-2 gap-2 text-[10.5px]">
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-150/60 flex flex-col gap-0.5">
                      <span className="text-[8px] font-black text-slate-400 uppercase">Trạng Thái FSRS</span>
                      <span className="font-black text-slate-700">{cardInfo.fsrs?.state_label || 'Mới (New)'}</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-150/60 flex flex-col gap-0.5">
                      <span className="text-[8px] font-black text-slate-400 uppercase">Hạn Ôn Tập (Due)</span>
                      <span className={cn("font-black", formatOverdueTime(cardInfo.fsrs?.due).overdue ? "text-rose-600" : "text-emerald-600")}>
                        {formatOverdueTime(cardInfo.fsrs?.due).full}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-150/60 flex flex-col gap-0.5">
                      <span className="text-[8px] font-black text-slate-400 uppercase">Lần Ôn Cuối Cùng</span>
                      <span className="font-bold text-slate-700">{formatRelativeTime(cardInfo.fsrs?.last_review).full}</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-150/60 flex flex-col gap-0.5">
                      <span className="text-[8px] font-black text-slate-400 uppercase">Ngày Bắt Đầu Học</span>
                      <span className="font-bold text-slate-700">{formatRelativeTime(cardInfo.fsrs?.first_learned).full}</span>
                    </div>
                  </div>

                  {/* Next Intervals Projections */}
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">
                      Khoảng Cách Hẹn Giờ Lần Tới (Next Intervals):
                    </span>
                    <div className="grid grid-cols-4 gap-1.5 text-center text-[10px] font-black">
                      <span className="py-1 rounded-lg bg-rose-50 text-rose-600 border border-rose-100">
                        Again: {getFSRSIntervals(cardInfo.fsrs)[1]}
                      </span>
                      <span className="py-1 rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
                        Hard: {getFSRSIntervals(cardInfo.fsrs)[2]}
                      </span>
                      <span className="py-1 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                        Good: {getFSRSIntervals(cardInfo.fsrs)[3]}
                      </span>
                      <span className="py-1 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                        Easy: {getFSRSIntervals(cardInfo.fsrs)[4]}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 5. Review History Timeline */}
                <div className="bg-white p-4.5 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-indigo-500" />
                      Lịch Sử Các Lần Ôn Tập
                    </h4>
                    <span className="text-[9px] font-bold text-slate-400">
                      {cardInfo.history_logs?.length || 0} lần gần nhất
                    </span>
                  </div>

                  {cardInfo.history_logs && cardInfo.history_logs.length > 0 ? (
                    <div className="space-y-1.5 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                      {cardInfo.history_logs.map((log: any, idx: number) => {
                        const ratingNames = { 1: 'Again', 2: 'Hard', 3: 'Good', 4: 'Easy' };
                        const ratingColors = {
                          1: 'bg-rose-50 text-rose-600 border-rose-100',
                          2: 'bg-amber-50 text-amber-600 border-amber-100',
                          3: 'bg-indigo-50 text-indigo-600 border-indigo-100',
                          4: 'bg-emerald-50 text-emerald-600 border-emerald-100'
                        };
                        const rColor = ratingColors[log.rating as keyof typeof ratingColors] || 'bg-slate-50 text-slate-600 border-slate-150';
                        const rName = ratingNames[log.rating as keyof typeof ratingNames] || `Đánh giá ${log.rating || '?'}`;

                        return (
                          <div 
                            key={log.id || idx}
                            className="flex items-center justify-between p-2 rounded-xl bg-slate-50/70 border border-slate-150/50 text-[10px]"
                          >
                            <div className="flex items-center gap-2">
                              <span className={cn("px-2 py-0.5 rounded-md font-black uppercase border text-[9px]", rColor)}>
                                {rName}
                              </span>
                              <span className="font-bold text-slate-600">
                                {formatRelativeTime(log.created_at).full}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-bold text-slate-400">
                                ⏱️ {log.active_time}s
                              </span>
                              {log.is_correct ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="py-6 text-center text-[10.5px] font-semibold text-slate-400 italic">
                      Chưa có lịch sử ôn tập nào được ghi nhận cho thẻ này.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ─────────────────────────────────────────────────────────────
                VIEW 2: THỐNG KÊ TOÀN BỘ BỘ THẺ (ENTIRE DECK STATS)
               ───────────────────────────────────────────────────────────── */}
            {statsViewMode === 'deck' && (
              <div className="space-y-4">
                {/* 1. Deck Hero Overview Card */}
                <div className="bg-white p-4.5 rounded-3xl border border-slate-200/80 shadow-sm relative overflow-hidden space-y-3">
                  <div className="h-1.5 absolute top-0 inset-x-0 bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-500" />
                  
                  <div className="flex items-start justify-between gap-3 pt-1">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-100 text-[9px] font-black uppercase tracking-wider">
                          Bộ thẻ tổng thể
                        </span>
                        <span className="text-xs font-black text-slate-700">
                          {deckSummary?.total_cards || session?.questions?.length || 0} thẻ
                        </span>
                      </div>
                      <h3 className="text-base font-black text-slate-800 leading-snug truncate">
                        {session?.title || 'Bộ thẻ'}
                      </h3>
                      {session?.description && (
                        <p className="text-xs text-slate-500 font-semibold mt-0.5 truncate">
                          {session.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Six Hero Deck Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {/* Số ngày đã học */}
                  <div className="p-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col items-center justify-center text-center">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Số Ngày Đã Học</span>
                    <span className="text-lg font-black text-emerald-600">{deckSummary?.active_days ?? 1} ngày</span>
                    <span className="text-[8px] font-bold text-slate-400">Kiên trì tích lũy</span>
                  </div>

                  {/* Trung bình thẻ mới/ngày */}
                  <div className="p-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col items-center justify-center text-center">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Học Mới / Ngày</span>
                    <span className="text-lg font-black text-indigo-600">{deckSummary?.avg_new_cards_per_day ?? 0}</span>
                    <span className="text-[8px] font-bold text-indigo-500">thẻ mới / ngày</span>
                  </div>

                  {/* Trung bình lượt ôn/ngày */}
                  <div className="p-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col items-center justify-center text-center">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Lượt Ôn / Ngày</span>
                    <span className="text-lg font-black text-purple-600">{deckSummary?.avg_reviews_per_day ?? 0}</span>
                    <span className="text-[8px] font-bold text-purple-500">lượt ôn / ngày</span>
                  </div>

                  {/* Tổng thời gian đã học */}
                  <div className="p-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col items-center justify-center text-center">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Tổng Thời Gian</span>
                    <span className="text-lg font-black text-slate-800">
                      {formatSeconds(deckSummary?.total_study_time_seconds || 0)}
                    </span>
                    <span className="text-[8px] font-bold text-slate-400">tổng thời gian học</span>
                  </div>

                  {/* Tổng lượt ôn */}
                  <div className="p-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col items-center justify-center text-center">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Tổng Lượt Ôn</span>
                    <span className="text-lg font-black text-slate-800">{deckSummary?.total_reviews ?? 0}</span>
                    <span className="text-[8px] font-bold text-slate-400">lượt trả lời</span>
                  </div>

                  {/* Độ chính xác tổng thể */}
                  <div className="p-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col items-center justify-center text-center">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Độ Chính Xác</span>
                    <span className="text-lg font-black text-teal-600">{deckSummary?.overall_accuracy ?? 0}%</span>
                    <span className="text-[8px] font-bold text-teal-500">toàn bộ lần trả lời</span>
                  </div>
                </div>

                {/* 3. Four Category Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-100 flex flex-col items-center text-center">
                    <span className="text-[8px] font-black text-emerald-600 uppercase">Thuần Thục (Box 5)</span>
                    <span className="text-base font-black text-emerald-700">{deckSummary?.fsrs_distribution?.mastered ?? 0}</span>
                    <span className="text-[8px] font-bold text-emerald-500">{deckSummary?.mastery_percentage ?? 0}% bộ thẻ</span>
                  </div>

                  <div className="p-2.5 rounded-2xl bg-indigo-50 border border-indigo-100 flex flex-col items-center text-center">
                    <span className="text-[8px] font-black text-indigo-600 uppercase">Đang Học (Box 1-4)</span>
                    <span className="text-base font-black text-indigo-700">{deckSummary?.fsrs_distribution?.learning ?? 0}</span>
                    <span className="text-[8px] font-bold text-indigo-500">thẻ đang ghi nhớ</span>
                  </div>

                  <div className="p-2.5 rounded-2xl bg-blue-50 border border-blue-100 flex flex-col items-center text-center">
                    <span className="text-[8px] font-black text-blue-600 uppercase">Chưa Học (Mới)</span>
                    <span className="text-base font-black text-blue-700">{deckSummary?.fsrs_distribution?.new ?? 0}</span>
                    <span className="text-[8px] font-bold text-blue-500">thẻ mới chờ học</span>
                  </div>

                  <div className="p-2.5 rounded-2xl bg-rose-50 border border-rose-100 flex flex-col items-center text-center">
                    <span className="text-[8px] font-black text-rose-600 uppercase">Cần Ôn Hôm Nay</span>
                    <span className="text-base font-black text-rose-700">{deckSummary?.fsrs_distribution?.due_today ?? 0}</span>
                    <span className="text-[8px] font-bold text-rose-500">đến hạn FSRS 🔥</span>
                  </div>
                </div>

                {/* 4. Five Leitner Box Breakdown */}
                <div className="bg-white p-4.5 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
                  <div className="flex justify-between items-center text-xs font-black">
                    <span className="text-slate-800 uppercase tracking-wider">Phân Bố 5 Hộp Leitner Mastery</span>
                    <span className="text-emerald-600">{deckSummary?.mastery_percentage ?? 0}% Hoàn Thành</span>
                  </div>

                  {/* Stacked Bar */}
                  {deckSummary?.box_distribution && (
                    <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                      {['1', '2', '3', '4', '5'].map((b) => {
                        const colors = ['bg-rose-400', 'bg-amber-400', 'bg-yellow-400', 'bg-blue-400', 'bg-emerald-500'];
                        const item = deckSummary.box_distribution[b];
                        return (
                          <div 
                            key={b}
                            title={`Box ${b}: ${item?.count || 0} thẻ (${item?.percent || 0}%)`}
                            className={cn("h-full transition-all duration-500", colors[Number(b) - 1])}
                            style={{ width: `${item?.percent || 0}%` }}
                          />
                        )
                      })}
                    </div>
                  )}

                  {/* Legend Box Pills */}
                  {deckSummary?.box_distribution && (
                    <div className="grid grid-cols-5 gap-1 pt-1 text-center">
                      {['1', '2', '3', '4', '5'].map((b) => {
                        const bgColors = ['bg-rose-50 border-rose-100 text-rose-600', 'bg-amber-50 border-amber-100 text-amber-600', 'bg-yellow-50 border-yellow-100 text-yellow-600', 'bg-blue-50 border-blue-100 text-blue-600', 'bg-emerald-50 border-emerald-100 text-emerald-600'];
                        const item = deckSummary.box_distribution[b];
                        return (
                          <div key={b} className={cn("p-1.5 rounded-xl border", bgColors[Number(b) - 1])}>
                            <span className="block text-[7.5px] font-black uppercase">Box {b}</span>
                            <span className="text-[11px] font-black block">{item?.count || 0}</span>
                            <span className="text-[7.5px] font-bold block">{item?.percent || 0}%</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* 5. Daily Comparison Chart */}
                <DailyComparisonChart 
                  data={chartData || []} 
                  allTimeAvg={chartAvg} 
                  isLoading={isChartLoading} 
                />
              </div>
            )}

            {/* ─────────────────────────────────────────────────────────────
                VIEW 3: BẢNG XẾP HẠNG & MỤC TIÊU (LEADERBOARD & GOALS)
               ───────────────────────────────────────────────────────────── */}
            {statsViewMode === 'rank' && (
              <div className="space-y-4">
                {/* Daily Goal Card */}
                {activeGoal && (
                  <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-3 text-left">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black">
                          🎯
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-slate-800">Mục Tiêu Học Tập Hôm Nay</h4>
                          <p className="text-[9px] text-slate-400 font-bold">Lộ trình thẻ mới</p>
                        </div>
                      </div>
                      <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-xl border border-indigo-100">
                        {Math.round((activeGoal.done_today / activeGoal.daily_target) * 100)}%
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-end">
                        <span className="text-xl font-black text-slate-800">
                          {activeGoal.done_today} <span className="text-xs text-slate-400 font-bold">/ {activeGoal.daily_target} thẻ</span>
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.round((activeGoal.done_today / activeGoal.daily_target) * 100))}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Leaderboard Area */}
                <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-md space-y-4">
                  {/* Time Filter Pills */}
                  <div className="flex items-center bg-slate-50 p-1 rounded-xl border border-slate-200/60 gap-1">
                    {['today', 'week', 'all'].map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setTimeFilter(filter)}
                        className={cn(
                          "flex-1 py-1 text-center font-black text-[9.5px] rounded-lg transition-all uppercase tracking-wider",
                          timeFilter === filter 
                            ? "bg-white text-indigo-600 shadow-xs border border-indigo-100 scale-[1.02]" 
                            : "text-slate-400 hover:text-slate-600"
                        )}
                      >
                        {filter === 'today' ? 'Hôm nay' : filter === 'week' ? 'Tuần này' : 'Toàn bộ'}
                      </button>
                    ))}
                  </div>

                  {/* Metric Tabs */}
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { id: 'xp', label: 'XP', icon: Zap },
                      { id: 'time', label: 'Thời gian', icon: Clock },
                      { id: 'new_cards', label: 'Thẻ mới', icon: Brain },
                      { id: 'cards', label: 'Lượt ôn', icon: Flame }
                    ].map((tab) => {
                      const Icon = tab.icon;
                      const isActive = activeMetric === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveMetric(tab.id as any)}
                          className={cn(
                            "flex flex-col items-center justify-center p-2 rounded-xl border transition-all gap-1",
                            isActive
                              ? "bg-indigo-50 border-indigo-200 text-indigo-600 shadow-xs scale-105"
                              : "bg-slate-50/60 border-slate-150 text-slate-400 hover:text-slate-600"
                          )}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span className="text-[8.5px] font-black">{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Podium & List */}
                  {isLeaderboardLoading ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-2">
                      <div className="w-7 h-7 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                      <span className="text-[9.5px] font-black text-slate-400 uppercase">Đang nạp bảng xếp hạng...</span>
                    </div>
                  ) : leaderboardData?.leaderboard && leaderboardData.leaderboard.length > 0 ? (
                    <div className="space-y-1.5 max-h-64 overflow-y-auto custom-scrollbar pr-1 pt-2">
                      {leaderboardData.leaderboard.map((u: any, idx: number) => {
                        const isCurrentUser = u.is_current_user;
                        return (
                          <div
                            key={u.user_id || idx}
                            className={cn(
                              "flex items-center justify-between p-2.5 rounded-2xl border transition-all text-xs",
                              isCurrentUser
                                ? "bg-indigo-50/90 border-indigo-200 shadow-sm"
                                : "bg-slate-50/60 border-slate-150"
                            )}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="text-[10px] font-black text-slate-400 w-5 text-center">#{u.rank || idx + 1}</span>
                              <div className={cn("w-7 h-7 rounded-full bg-gradient-to-tr flex items-center justify-center text-white font-bold text-[10px]", getAvatarGradient(u.username))}>
                                {u.username?.slice(0, 2).toUpperCase()}
                              </div>
                              <span className={cn("truncate font-bold", isCurrentUser ? "text-indigo-900 font-black" : "text-slate-700")}>
                                {u.username} {isCurrentUser && " (Bạn)"}
                              </span>
                            </div>
                            <span className={cn("font-black shrink-0", isCurrentUser ? "text-indigo-600" : "text-slate-600")}>
                              {formatValue(u)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-400 text-center py-8">Chưa có dữ liệu bảng xếp hạng.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
