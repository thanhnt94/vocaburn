import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, TrendingUp, Target, Trophy, Flame, ChevronLeft, Crown, Medal, Award, Brain, Clock, Zap } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { cn } from '@/lib/utils'
import DailyComparisonChart from './DailyComparisonChart'

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
              onClick={() => navigate('/')} 
              className="w-8.5 h-8.5 flex items-center justify-center bg-slate-50 border border-slate-200/60 rounded-xl text-slate-600 shadow-sm hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-100 active:scale-90 transition-all flex-shrink-0"
              title="Quay lại thư viện"
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

                return (
                  <>
                    {/* Leaderboard */}
                    <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
                      {/* Metric Filter Tabs */}
                      <div className="flex bg-slate-100/60 p-1 rounded-xl border border-slate-200/40 w-full overflow-x-auto no-scrollbar">
                        {[
                          { id: 'xp', label: 'XP' },
                          { id: 'time', label: 'Thời gian' },
                          { id: 'new_cards', label: 'Thẻ mới' },
                          { id: 'cards', label: 'Lượt ôn' }
                        ].map(tab => (
                          <button
                            key={tab.id}
                            onClick={() => setActiveMetric(tab.id as any)}
                            className={cn(
                              "flex-1 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all whitespace-nowrap px-1.5",
                              activeMetric === tab.id
                                ? "bg-white text-indigo-600 shadow-sm border border-slate-200/30"
                                : "text-slate-500 hover:bg-white/40"
                            )}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>

                      {/* Time Range Filter Tabs */}
                      <div className="flex bg-slate-50 p-0.5 rounded-lg border border-slate-100/80 self-start">
                        {[
                          { id: 'today', label: 'Hôm nay' },
                          { id: 'week', label: 'Tuần này' },
                          { id: 'all_time', label: 'Toàn bộ' }
                        ].map(filter => (
                          <button
                            key={filter.id}
                            onClick={() => setTimeFilter(filter.id)}
                            className={cn(
                              "px-2.5 py-1 rounded-md text-[8px] font-black uppercase tracking-widest transition-all",
                              timeFilter === filter.id
                                ? "bg-white text-indigo-600 shadow-sm border border-slate-150/40"
                                : "text-slate-400 hover:text-slate-600"
                            )}
                          >
                            {filter.label}
                          </button>
                        ))}
                      </div>

                      {isLeaderboardLoading ? (
                        <p className="text-[10px] text-slate-400 text-center py-6 animate-pulse">Đang tải bảng xếp hạng...</p>
                      ) : currentList && currentList.length > 0 ? (
                        <div className="space-y-1.5 py-1">
                          {currentList.map((u: any) => {
                            const isSelf = u.is_current_user || u.user_id === user?.id;
                            const showDots = u.out_of_top_5;
                            
                            return (
                              <React.Fragment key={u.user_id}>
                                {showDots && (
                                  <div className="text-center text-[10px] font-black text-slate-350 tracking-widest leading-none my-1">•••</div>
                                )}
                                <div 
                                  className={cn(
                                    "flex items-center justify-between p-2 rounded-2xl border transition-all text-xs",
                                    isSelf 
                                      ? "bg-indigo-550/10 border-indigo-200/50 font-black text-indigo-950 shadow-sm shadow-indigo-100/50" 
                                      : "bg-slate-50/40 border-slate-100/40 text-slate-700 hover:border-slate-200/60"
                                  )}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="w-5 text-center font-bold text-slate-400">
                                      {u.rank === 1 ? "🥇" : u.rank === 2 ? "🥈" : u.rank === 3 ? "🥉" : `#${u.rank}`}
                                    </span>
                                    <span className="font-bold truncate text-[11px] uppercase">
                                      {u.full_name || u.username}
                                    </span>
                                    {activeMetric === 'xp' && u.level !== undefined && (
                                      <span className="text-[9px] text-slate-400 font-medium shrink-0">
                                        Lv.{u.level}
                                      </span>
                                    )}
                                    {activeMetric === 'xp' && u.streak !== undefined && u.streak > 0 && (
                                      <span className="text-[9px] text-orange-500 font-bold shrink-0">
                                        🔥 {u.streak}d
                                      </span>
                                    )}
                                  </div>
                                  <span className={cn("font-black text-[11px] shrink-0", isSelf ? "text-indigo-600" : "text-slate-900")}>
                                    {formatValue(u)}
                                  </span>
                                </div>
                              </React.Fragment>
                            )
                          })}
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-400 text-center py-6">Chưa có dữ liệu xếp hạng trong khoảng thời gian này.</p>
                      )}
                      
                      {!isLeaderboardLoading && leaderboardData && (
                        <div className="p-3 bg-indigo-50/30 rounded-2xl border border-indigo-100/30">
                          <p className="text-[11px] text-slate-600 leading-relaxed font-semibold">
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
