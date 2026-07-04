import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, TrendingUp, Target, Trophy, Flame, ChevronLeft, Crown, Medal, Award, Brain, Clock, Zap, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { cn } from '@/lib/utils'
import DailyComparisonChart from './DailyComparisonChart'

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
  dailyComparisonData: any[]
  dailyComparisonAvg?: any
  isDailyComparisonLoading: boolean
  activeGoal: any
  activeMode?: string
  gamify: {
    streak: number
    level: number
    xp: number
  }
  xpLeaderboard: {
    list?: any[]
  }
  userRank: number
  leaderboardMsg: string
  user: any
  sessionStatsNode?: React.ReactNode
  practiceStatsNode?: React.ReactNode
}

export const PlayStatsDrawer: React.FC<PlayStatsDrawerProps> = ({
  isOpen,
  onClose,
  activeStatsTab,
  setActiveStatsTab,
  dailyComparisonData,
  dailyComparisonAvg,
  isDailyComparisonLoading,
  activeGoal,
  activeMode = 'fsrs',
  gamify,
  xpLeaderboard,
  userRank,
  leaderboardMsg,
  user,
  sessionStatsNode,
  practiceStatsNode,
}) => {
  const navigate = useNavigate()
  const [timeFilter, setTimeFilter] = React.useState<string>('week')
  const [activeMetric, setActiveMetric] = React.useState<'xp' | 'time' | 'new_cards' | 'cards'>('xp')
  const [leaderboardData, setLeaderboardData] = React.useState<any>(null)
  const [isLeaderboardLoading, setIsLeaderboardLoading] = React.useState<boolean>(false)

  React.useEffect(() => {
    if (!isOpen) return

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
  }, [isOpen, timeFilter])

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

  const getLeaderboardMessage = () => {
    if (!leaderboardData) return ""
    const rank = activeMetric === 'xp' 
      ? leaderboardData.current_user_rank 
      : activeMetric === 'time' 
        ? leaderboardData.current_user_time_rank 
        : activeMetric === 'new_cards' 
          ? leaderboardData.current_user_new_cards_rank 
          : leaderboardData.current_user_cards_rank
          
    const currentList = activeMetric === 'xp' 
      ? leaderboardData.leaderboard 
      : activeMetric === 'time' 
        ? (leaderboardData.time_leaderboard || []) 
        : activeMetric === 'new_cards' 
          ? (leaderboardData.new_cards_leaderboard || []) 
          : (leaderboardData.cards_leaderboard || [])

    if (rank === 1) {
      return "Bạn đang dẫn đầu Bảng xếp hạng! Hãy giữ vững ngôi vương nhé! 👑"
    } else if (rank && rank > 1) {
      const topUser = currentList[0]
      const prevUser = currentList.find((u: any) => u.rank === rank - 1)
      let msg = ""
      if (topUser) {
        const topVal = activeMetric === 'xp' ? (topUser.xp || 0) : activeMetric === 'time' ? (topUser.total_time || 0) : activeMetric === 'new_cards' ? (topUser.new_cards || 0) : (topUser.total_cards || 0)
        const selfVal = activeMetric === 'xp' ? (leaderboardData.leaderboard.find((u: any) => u.is_current_user)?.xp || 0) : activeMetric === 'time' ? (leaderboardData.time_leaderboard?.find((u: any) => u.is_current_user)?.total_time || 0) : activeMetric === 'new_cards' ? (leaderboardData.new_cards_leaderboard?.find((u: any) => u.is_current_user)?.new_cards || 0) : (leaderboardData.cards_leaderboard?.find((u: any) => u.is_current_user)?.total_cards || 0)
        const diff = topVal - selfVal
        if (diff > 0) {
          if (activeMetric === 'xp') {
            msg += `Cần thêm ${diff.toLocaleString()} XP nữa để đạt Top 1! 🚀 `
          } else if (activeMetric === 'time') {
            msg += `Cần thêm ${formatTime(diff)} nữa để đạt Top 1! 🚀 `
          } else if (activeMetric === 'new_cards') {
            msg += `Cần thêm ${diff} thẻ mới nữa để đạt Top 1! 🚀 `
          } else {
            msg += `Cần thêm ${diff} lượt ôn nữa để đạt Top 1! 🚀 `
          }
        }
      }
      if (prevUser) {
        const prevVal = activeMetric === 'xp' ? (prevUser.xp || 0) : activeMetric === 'time' ? (prevUser.total_time || 0) : activeMetric === 'new_cards' ? (prevUser.new_cards || 0) : (prevUser.total_cards || 0)
        const selfVal = activeMetric === 'xp' ? (leaderboardData.leaderboard.find((u: any) => u.is_current_user)?.xp || 0) : activeMetric === 'time' ? (leaderboardData.time_leaderboard?.find((u: any) => u.is_current_user)?.total_time || 0) : activeMetric === 'new_cards' ? (leaderboardData.new_cards_leaderboard?.find((u: any) => u.is_current_user)?.new_cards || 0) : (leaderboardData.cards_leaderboard?.find((u: any) => u.is_current_user)?.total_cards || 0)
        const diff = prevVal - selfVal
        if (diff > 0) {
          if (activeMetric === 'xp') {
            msg += `Cách Hạng #${rank - 1} (${prevUser.username}) ${diff.toLocaleString()} XP! 💪`
          } else if (activeMetric === 'time') {
            msg += `Cách Hạng #${rank - 1} (${prevUser.username}) ${formatTime(diff)}! 💪`
          } else if (activeMetric === 'new_cards') {
            msg += `Cách Hạng #${rank - 1} (${prevUser.username}) ${diff} thẻ mới! 💪`
          } else {
            msg += `Cách Hạng #${rank - 1} (${prevUser.username}) ${diff} lượt ôn! 💪`
          }
        }
      }
      return msg || "Hãy tích lũy thêm thành tích để thăng hạng! 🏆"
    }
    return "Hãy tích lũy thêm thành tích để ghi danh lên Bảng xếp hạng! 🏆"
  }

  const getHeaderInfo = () => {
    switch (activeStatsTab) {
      case 'performance':
        return { title: 'Thống kê hiệu suất', sub: 'Theo dõi tiến độ học tập của bạn' };
      case 'goals':
        return { title: 'Mục tiêu hàng ngày', sub: 'Theo dõi & hoàn thành mục tiêu học tập' };
      case 'leaderboard':
        const metricName = activeMetric === 'xp' ? 'XP' : activeMetric === 'time' ? 'Thời gian' : activeMetric === 'new_cards' ? 'Thẻ mới' : 'Lượt ôn';
        const filterName = timeFilter === 'today' ? 'hôm nay' : timeFilter === 'week' ? 'tuần này' : 'toàn bộ';
        return { title: `Bảng xếp hạng ${metricName.toLowerCase()}`, sub: `Đua top ${metricName} ${filterName}` };
      default:
        return { title: 'Thống kê hiệu suất', sub: 'Theo dõi tiến độ học tập của bạn' };
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
          <header className="flex-shrink-0 z-[120] bg-white/95 backdrop-blur-2xl border-b border-slate-100/80 px-4 py-1.5 flex items-center gap-3 shadow-[0_1px_20px_rgba(99,102,241,0.04)]">
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
               <>
                 {/* Daily Comparison Chart */}
                 <DailyComparisonChart data={dailyComparisonData || []} allTimeAvg={dailyComparisonAvg} isLoading={isDailyComparisonLoading} />
               </>
             )}

             {activeStatsTab === 'goals' && (
               <>
                 {/* Daily Goal Card */}
                 {activeMode !== 'review' && (
                   <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
                     <div className="flex items-center gap-2.5">
                       <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                         <Target className="w-4.5 h-4.5" />
                       </div>
                       <div>
                         <h4 className="text-xs font-black text-slate-700">Deck Goal</h4>
                         <p className="text-[10px] text-slate-400 font-medium">Daily Practice</p>
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
                    {/* Leaderboard */}
                    <div className="bg-white p-5 rounded-[2.5rem] border border-slate-100/80 shadow-md space-y-5">
                      {/* Metric Filter Tabs */}
                      <div className="flex bg-slate-100/55 p-1 rounded-2xl border border-slate-200/30 w-full overflow-x-auto no-scrollbar gap-1">
                        {tabs.map(tab => {
                          const IconComp = tab.icon
                          const isActive = activeMetric === tab.id
                          return (
                            <button
                              key={tab.id}
                              onClick={() => setActiveMetric(tab.id as any)}
                              className={cn(
                                "flex-1 py-2 px-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all duration-200 whitespace-nowrap flex items-center justify-center gap-1.5",
                                isActive
                                  ? "bg-gradient-to-r from-indigo-650 via-indigo-700 to-purple-650 text-white shadow-md shadow-indigo-250/20 border-none scale-102"
                                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/20"
                              )}
                            >
                              <IconComp className={cn("w-3.5 h-3.5 shrink-0", isActive ? "text-white" : "text-slate-400")} />
                              <span>{tab.label}</span>
                            </button>
                          )
                        })}
                      </div>

                      {/* Time Range Filter Tabs */}
                      <div className="flex bg-slate-100/50 p-1 rounded-full border border-slate-200/30 w-fit mx-auto gap-0.5">
                        {[
                          { id: 'today', label: 'Hôm nay' },
                          { id: 'week', label: 'Tuần này' },
                          { id: 'all_time', label: 'Toàn bộ' }
                        ].map(filter => (
                          <button
                            key={filter.id}
                            onClick={() => setTimeFilter(filter.id)}
                            className={cn(
                              "px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all duration-200",
                              timeFilter === filter.id
                                ? "bg-slate-900 text-white shadow-md shadow-slate-900/10 scale-102"
                                : "text-slate-400 hover:text-slate-700 hover:bg-white/40"
                            )}
                          >
                            {filter.label}
                          </button>
                        ))}
                      </div>

                      {isLeaderboardLoading ? (
                        <p className="text-[10px] text-slate-400 text-center py-8 animate-pulse font-bold">Đang tải bảng xếp hạng...</p>
                      ) : currentList && currentList.length > 0 ? (
                        <div className="space-y-4">
                          {/* Podium Grid (ranks 1, 2, 3) */}
                          {top1 && (
                            <div className="grid grid-cols-3 gap-2.5 items-end pt-5 pb-2 px-1 text-center bg-gradient-to-b from-indigo-50/[0.08] to-transparent rounded-3xl border border-indigo-100/[0.04]">
                              {/* Rank 2 */}
                              <div className="flex flex-col items-center">
                                {top2 ? (
                                  <motion.div 
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3, delay: 0.1 }}
                                    className={cn(
                                      "w-full flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-white border border-slate-150/70 shadow-sm relative h-[120px] justify-end",
                                      (top2.is_current_user || top2.user_id === user?.id) && "ring-2 ring-indigo-500/50 bg-indigo-50/10 border-indigo-200"
                                    )}
                                  >
                                    <div className="relative">
                                      <div className={cn(
                                        "w-9 h-9 rounded-full flex items-center justify-center text-white text-[11px] font-black shadow-md bg-gradient-to-br ring-2 ring-slate-200", 
                                        getAvatarGradient(top2.username)
                                      )}>
                                        {top2.username.charAt(0).toUpperCase()}
                                      </div>
                                      <span className="absolute -bottom-1.5 -right-1 w-4.5 h-4.5 rounded-full bg-slate-355 text-white border-2 border-white flex items-center justify-center text-[8px] font-black shadow-sm">
                                        2
                                      </span>
                                    </div>
                                    <div className="text-center w-full min-w-0">
                                      <p className="text-[9px] font-extrabold text-slate-700 truncate leading-snug">
                                        {top2.full_name || top2.username}
                                      </p>
                                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-tight mt-0.5">
                                        {formatValue(top2)}
                                      </p>
                                    </div>
                                  </motion.div>
                                ) : (
                                  <div className="w-full h-[120px] rounded-2xl border border-dashed border-slate-200/50 bg-slate-50/20 flex items-center justify-center">
                                    <span className="text-[10px] font-bold text-slate-300">-</span>
                                  </div>
                                )}
                                <div className="w-full h-5 bg-slate-100/70 rounded-t-lg mt-2.5 flex items-center justify-center border-t border-slate-200/30">
                                  <span className="text-[9px] font-black text-slate-400">🥈</span>
                                </div>
                              </div>

                              {/* Rank 1 */}
                              <div className="flex flex-col items-center relative -top-2">
                                <motion.div 
                                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  transition={{ type: "spring", stiffness: 260, damping: 15 }}
                                  className={cn(
                                    "w-full flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-gradient-to-b from-amber-50/50 via-white to-white border-2 border-amber-200/80 shadow-md relative h-[135px] justify-end ring-4 ring-amber-100/20",
                                    (top1.is_current_user || top1.user_id === user?.id) && "ring-2 ring-indigo-500/50"
                                  )}
                                >
                                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
                                    <Crown className="w-5 h-5 text-amber-500 fill-amber-400 drop-shadow-[0_2px_4px_rgba(245,158,11,0.3)] animate-pulse" />
                                  </div>
                                  <div className="relative mt-1">
                                    <div className={cn(
                                      "w-11 h-11 rounded-full flex items-center justify-center text-white text-xs font-black shadow-md bg-gradient-to-br ring-2 ring-amber-350", 
                                      getAvatarGradient(top1.username)
                                    )}>
                                      {top1.username.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="absolute -bottom-1.5 -right-1 w-5 h-5 rounded-full bg-amber-400 text-amber-955 border-2 border-white flex items-center justify-center text-[9px] font-black shadow-sm">
                                      1
                                    </span>
                                  </div>
                                  <div className="text-center w-full min-w-0">
                                    <p className="text-[10px] font-black text-slate-800 truncate leading-snug">
                                      {top1.full_name || top1.username}
                                    </p>
                                    <p className="text-[9px] font-black text-amber-600 uppercase tracking-tight mt-0.5">
                                      {formatValue(top1)}
                                    </p>
                                  </div>
                                </motion.div>
                                <div className="w-full h-8 bg-amber-100/40 rounded-t-lg mt-2.5 flex items-center justify-center border-t border-amber-200/30 shadow-inner">
                                  <span className="text-[9px] font-black text-amber-600/70">🏆</span>
                                </div>
                              </div>

                              {/* Rank 3 */}
                              <div className="flex flex-col items-center">
                                {top3 ? (
                                  <motion.div 
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3, delay: 0.2 }}
                                    className={cn(
                                      "w-full flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-white border border-slate-150/70 shadow-sm relative h-[110px] justify-end",
                                      (top3.is_current_user || top3.user_id === user?.id) && "ring-2 ring-indigo-500/50 bg-indigo-50/10 border-indigo-200"
                                    )}
                                  >
                                    <div className="relative">
                                      <div className={cn(
                                        "w-9 h-9 rounded-full flex items-center justify-center text-white text-[11px] font-black shadow-md bg-gradient-to-br ring-2 ring-amber-600/10", 
                                        getAvatarGradient(top3.username)
                                      )}>
                                        {top3.username.charAt(0).toUpperCase()}
                                      </div>
                                      <span className="absolute -bottom-1.5 -right-1 w-4.5 h-4.5 rounded-full bg-amber-705 text-amber-900 border-2 border-white flex items-center justify-center text-[8px] font-black shadow-sm">
                                        3
                                      </span>
                                    </div>
                                    <div className="text-center w-full min-w-0">
                                      <p className="text-[9px] font-extrabold text-slate-700 truncate leading-snug">
                                        {top3.full_name || top3.username}
                                      </p>
                                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-tight mt-0.5">
                                        {formatValue(top3)}
                                      </p>
                                    </div>
                                  </motion.div>
                                ) : (
                                  <div className="w-full h-[110px] rounded-2xl border border-dashed border-slate-200/50 bg-slate-50/20 flex items-center justify-center">
                                    <span className="text-[10px] font-bold text-slate-300">-</span>
                                  </div>
                                )}
                                <div className="w-full h-3 bg-slate-100/50 rounded-t-lg mt-2.5 flex items-center justify-center border-t border-slate-200/20">
                                  <span className="text-[9px] font-black text-amber-800/50">🥉</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Remaining List (Ranks 4+) */}
                          {remainingList.length > 0 && (
                            <div className="space-y-2 py-1">
                              {remainingList.map((u: any, index: number) => {
                                const isSelf = u.is_current_user || u.user_id === user?.id
                                const showDots = u.out_of_top_5
                                
                                return (
                                  <React.Fragment key={u.user_id}>
                                    {showDots && (
                                      <div className="text-center text-[10px] font-black text-slate-350 tracking-widest leading-none my-2.5">•••</div>
                                    )}
                                    <motion.div 
                                      initial={{ opacity: 0, x: -8 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.3) }}
                                      className={cn(
                                        "flex items-center justify-between p-3 rounded-2xl border transition-all text-xs relative overflow-hidden",
                                        isSelf 
                                          ? "bg-gradient-to-r from-indigo-50 to-purple-50/50 border-indigo-200/70 font-black text-indigo-950 shadow-sm" 
                                          : "bg-slate-50/40 border-slate-100/50 text-slate-700 hover:border-slate-200/80 hover:bg-slate-50/80"
                                      )}
                                    >
                                      {isSelf && (
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600" />
                                      )}
                                      <div className="flex items-center gap-3 min-w-0">
                                        <span className={cn(
                                          "w-6 h-6 rounded-full flex items-center justify-center font-extrabold text-[9px] shrink-0 border",
                                          isSelf 
                                            ? "bg-indigo-600 text-white border-indigo-500 shadow-sm" 
                                            : "bg-slate-100 text-slate-500 border-slate-200/40"
                                        )}>
                                          #{u.rank}
                                        </span>
                                        
                                        {/* Avatar */}
                                        <div className={cn(
                                          "w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-black shadow-sm bg-gradient-to-br shrink-0", 
                                          getAvatarGradient(u.username)
                                        )}>
                                          {u.username.charAt(0).toUpperCase()}
                                        </div>

                                        <div className="flex flex-col min-w-0">
                                          <span className="font-extrabold truncate text-[11px] uppercase tracking-wide">
                                            {u.full_name || u.username} {isSelf && <span className="text-[8px] text-indigo-600 font-bold lowercase bg-indigo-100/50 px-1.5 py-0.5 rounded-full ml-1 shrink-0">bạn</span>}
                                          </span>
                                          <div className="flex items-center gap-2 mt-0.5">
                                            {activeMetric === 'xp' && u.level !== undefined && (
                                              <span className="text-[8px] text-slate-400 font-bold bg-slate-100 px-1 rounded shrink-0">
                                                Lv.{u.level}
                                              </span>
                                            )}
                                            {u.streak !== undefined && u.streak > 0 && (
                                              <span className="text-[8px] text-orange-500 font-extrabold flex items-center gap-0.5 shrink-0">
                                                🔥 {u.streak}d
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                      
                                      <span className={cn(
                                        "font-black text-xs shrink-0 tracking-wide", 
                                        isSelf ? "text-indigo-600 bg-indigo-100/30 px-2 py-0.5 rounded-lg" : "text-slate-800"
                                      )}>
                                        {formatValue(u)}
                                      </span>
                                    </motion.div>
                                  </React.Fragment>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-400 text-center py-8 font-medium">Chưa có dữ liệu xếp hạng trong khoảng thời gian này.</p>
                      )}
                      
                      {!isLeaderboardLoading && leaderboardData && (
                        <div className="p-3.5 bg-gradient-to-r from-indigo-50/40 via-indigo-50/10 to-purple-50/40 rounded-2.5xl border border-indigo-100/35 shadow-sm flex items-start gap-3">
                          <div className="w-8 h-8 rounded-xl bg-indigo-50/70 border border-indigo-100/50 flex items-center justify-center shrink-0 shadow-sm">
                            <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
                          </div>
                          <p className="text-[11px] text-slate-600 leading-relaxed font-bold mt-0.5">
                            {getLeaderboardMessage()}
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                )
              })()}
           </div>

          {/* Sticky Bottom Footer */}
          <div className="flex items-center justify-center py-3 border-t border-slate-100 bg-white/95 backdrop-blur-xl sticky bottom-0 z-50 px-4">
            <div className="flex items-center bg-slate-50 p-1 rounded-2xl h-12 border border-slate-200/60 shadow-inner gap-1 flex-1 max-w-[310px] justify-center">
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
