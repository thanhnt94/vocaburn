import { Trophy, Crown, Zap, Flame, Target, Clock, Calendar } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export type LeaderboardCategory = 'xp' | 'streak' | 'questions' | 'time'
export type LeaderboardTimeFilter = 'today' | 'week' | 'month' | 'all_time'

export interface LeaderboardUser {
  rank: number
  user_id: number
  username: string
  full_name: string
  value: number
  level: number
  active_status?: 'online' | 'away' | 'offline'
  active_text?: string
}

export interface LeaderboardCategoryData {
  list: LeaderboardUser[]
  user_rank: number
  user_value: number
}

export interface LeaderboardResponse {
  xp?: LeaderboardCategoryData
  streak?: LeaderboardCategoryData
  questions?: LeaderboardCategoryData
  time?: LeaderboardCategoryData
  accuracy?: LeaderboardCategoryData
}

export function formatStudyTime(seconds: number): string {
  if (!seconds || seconds <= 0) return '0m'
  const totalMinutes = Math.floor(seconds / 60)
  if (totalMinutes < 60) {
    return totalMinutes === 0 ? `${seconds}s` : `${totalMinutes}m`
  }
  const hours = Math.floor(totalMinutes / 60)
  const remainingMinutes = totalMinutes % 60
  if (remainingMinutes === 0) {
    return `${hours}h`
  }
  return `${hours}h ${remainingMinutes}m`
}

interface LeaderboardTabProps {
  data: LeaderboardResponse | undefined
  isLoading: boolean
  activeCategory: LeaderboardCategory
  onSelectCategory: (category: LeaderboardCategory) => void
  timeFilter: LeaderboardTimeFilter
  onSelectTimeFilter: (filter: LeaderboardTimeFilter) => void
}

export default function LeaderboardTab({
  data,
  isLoading,
  activeCategory,
  onSelectCategory: _onSelectCategory,
  timeFilter: _timeFilter,
  onSelectTimeFilter: _onSelectTimeFilter
}: LeaderboardTabProps) {
  const currentLeaderboard = data?.[activeCategory] || { list: [], user_rank: -1, user_value: 0 }
  const topThree = currentLeaderboard.list.slice(0, 3)
  const remainingUsers = currentLeaderboard.list.slice(3)

  const categoryLabels: Record<LeaderboardCategory, { label: string, icon: any, unit: string, sub: string }> = {
    xp: { label: 'XP', icon: Zap, unit: 'XP', sub: 'Total experience' },
    streak: { label: 'Streak', icon: Flame, unit: 'days', sub: 'Daily streak' },
    questions: { label: 'Cards', icon: Target, unit: 'cards', sub: 'Cards reviewed' },
    time: { label: 'Time', icon: Clock, unit: '', sub: 'Study time' },
  }

  return (
    <div className="space-y-2.5 text-left w-full max-w-5xl mx-auto flex flex-col h-full min-h-0 overflow-hidden">
      {/* 🌟 Your Rank Banner (Full-Width Fixed Top) */}
      {currentLeaderboard.user_rank !== -1 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900 rounded-2xl px-4 py-2.5 text-white border border-slate-800 shadow-md flex items-center justify-between gap-3 w-full shrink-0 select-none"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-2xs">
              <Trophy className="w-4 h-4 animate-pulse" />
            </div>
            <div className="min-w-0 flex items-center gap-2 flex-wrap">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">YOUR POSITION:</span>
              <span className="text-sm sm:text-base font-black text-amber-400 leading-none">#{currentLeaderboard.user_rank}</span>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-xs sm:text-sm font-black text-amber-300 tracking-tight">
              {activeCategory === 'time'
                ? formatStudyTime(currentLeaderboard.user_value)
                : `${currentLeaderboard.user_value.toLocaleString()} ${categoryLabels[activeCategory].unit}`}
            </span>
            <span className="text-[7.5px] font-bold uppercase tracking-wider text-slate-400 block -mt-0.5">
              {categoryLabels[activeCategory].sub}
            </span>
          </div>
        </motion.div>
      )}

      {/* 🏆 Full-Width Unified Leaderboard Card (Podium + Rankings List) */}
      <div className="w-full bg-white rounded-3xl border border-slate-200/80 p-3 sm:p-5 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center flex flex-col items-center justify-center gap-2.5 my-auto">
            <Zap className="w-7 h-7 text-amber-500 animate-pulse" />
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
              Loading leaderboard data...
            </span>
          </div>
        ) : (
          <>
            {/* Top 3 Podium (Full-Width 3-Column Grid) */}
            {topThree.length > 0 && (
              <div className="w-full grid grid-cols-3 gap-2 sm:gap-4 items-end py-3 sm:py-4 border-b border-slate-100 bg-gradient-to-b from-amber-50/40 via-slate-50/50 to-transparent rounded-2xl mb-3 px-2 sm:px-4 shrink-0">
                {(() => {
                  const podiums = [
                    { item: topThree[1], pos: 2, height: 'h-16 sm:h-20', color: 'from-slate-100 via-slate-200 to-slate-300 border-slate-300', text: 'text-slate-700', ring: 'border-slate-300 ring-2 ring-slate-200', badgeBg: 'bg-slate-500' },
                    { item: topThree[0], pos: 1, height: 'h-24 sm:h-28', color: 'from-amber-100 via-amber-200 to-amber-300 border-amber-400', text: 'text-amber-800', ring: 'border-amber-400 ring-4 ring-amber-200', badgeBg: 'bg-amber-500' },
                    { item: topThree[2], pos: 3, height: 'h-13 sm:h-16', color: 'from-orange-100 via-orange-200 to-orange-300 border-orange-300', text: 'text-orange-800', ring: 'border-orange-300 ring-2 ring-orange-200', badgeBg: 'bg-orange-500' }
                  ].filter(p => p.item)

                  return podiums.map((pod) => {
                    const user = pod.item
                    const initial = (user.full_name || user.username || '?').charAt(0).toUpperCase()

                    return (
                      <div key={user.user_id} className="w-full flex flex-col items-center text-center">
                        <div className="relative mb-2">
                          {pod.pos === 1 && (
                            <Crown className="w-6 h-6 text-amber-500 absolute -top-5 left-1/2 -translate-x-1/2 drop-shadow-sm animate-bounce" />
                          )}
                          <div className={cn(
                            "rounded-full border-2 flex items-center justify-center font-black bg-white shadow-sm relative",
                            pod.pos === 1 ? "w-13 h-13 sm:w-16 sm:h-16 text-base sm:text-lg" : "w-10 h-10 sm:w-12 sm:h-12 text-xs sm:text-sm",
                            pod.ring
                          )}>
                            {initial}
                            {/* Rank Badge */}
                            <div className={cn(
                              "absolute -bottom-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 border-white flex items-center justify-center text-[9px] sm:text-[10px] font-black text-white shadow-xs",
                              pod.badgeBg
                            )}>
                              {pod.pos}
                            </div>

                            {/* Active Status Indicator Dot */}
                            <div
                              className={cn(
                                "absolute -top-1 -right-0.5 rounded-full border-2 border-white shadow-xs flex items-center justify-center",
                                pod.pos === 1 ? "w-4.5 h-4.5" : "w-3.5 h-3.5",
                                user.active_status === 'online'
                                  ? "bg-emerald-500"
                                  : user.active_status === 'away'
                                    ? "bg-amber-400"
                                    : "bg-slate-300"
                              )}
                              title={user.active_text || (user.active_status === 'online' ? 'Active now' : user.active_status === 'away' ? 'Away' : 'Offline')}
                            >
                              {user.active_status === 'online' && (
                                <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping opacity-75" />
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-center w-full px-1">
                          <div className="text-xs sm:text-sm font-black text-slate-900 truncate leading-tight">
                            {user.full_name || user.username}
                          </div>
                          <div className="flex items-center justify-center gap-1.5 mt-0.5">
                            <span className="text-[8.5px] sm:text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">
                              Lv.{user.level || 1}
                            </span>
                            <span className="text-slate-300 text-[8px]">•</span>
                            <span className={cn(
                              "text-[8px] sm:text-[8.5px] font-black tracking-tight",
                              user.active_status === 'online'
                                ? "text-emerald-600"
                                : user.active_status === 'away'
                                  ? "text-amber-600"
                                  : "text-slate-400"
                            )}>
                              {user.active_status === 'online' ? 'Online' : user.active_text || 'Offline'}
                            </span>
                          </div>
                        </div>

                        <div className={cn(
                          "w-full mt-2.5 rounded-t-2xl flex flex-col justify-end items-center pb-2 bg-gradient-to-t shadow-2xs border-t border-x",
                          pod.height, pod.color
                        )}>
                          <span className={cn("text-[10.5px] sm:text-xs font-black tracking-tight leading-none mb-0.5", pod.text)}>
                            {activeCategory === 'time' ? formatStudyTime(user.value) : user.value.toLocaleString()}
                          </span>
                          <span className="text-[7.5px] font-bold text-slate-500 uppercase tracking-widest leading-none">
                            {categoryLabels[activeCategory].unit}
                          </span>
                        </div>
                      </div>
                    )
                  })
                })()}
              </div>
            )}

            {/* List Top 4 - 50 (Full-Width Dedicated Internal Scroll) */}
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-1.5 pr-1 w-full">
              {remainingUsers.length === 0 && topThree.length === 0 ? (
                <div className="py-10 text-center text-slate-400 font-bold text-xs bg-slate-50 rounded-2xl">
                  No leaderboard data for this period.
                </div>
              ) : remainingUsers.length === 0 ? (
                <div className="py-3 text-center text-[9px] font-black text-slate-300 uppercase tracking-widest">
                  All top members displayed above
                </div>
              ) : (
                remainingUsers.map((user) => {
                  const initial = (user.full_name || user.username || '?').charAt(0).toUpperCase()
                  return (
                    <div
                      key={user.user_id}
                      className="w-full flex items-center gap-3 p-2.5 sm:p-3 rounded-2xl bg-slate-50/90 border border-slate-100 hover:border-amber-200 hover:bg-amber-50/20 transition-all text-left"
                    >
                      <div className="w-6 text-xs font-black text-slate-400 text-center shrink-0">
                        #{user.rank}
                      </div>
                      <div className="relative shrink-0">
                        <div className="w-8.5 h-8.5 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-xs font-black text-slate-700 shadow-2xs">
                          {initial}
                        </div>
                        {/* Active Status Badge Dot */}
                        <span
                          className={cn(
                            "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white shadow-xs flex items-center justify-center",
                            user.active_status === 'online'
                              ? "bg-emerald-500"
                              : user.active_status === 'away'
                                ? "bg-amber-400"
                                : "bg-slate-300"
                          )}
                          title={user.active_text || (user.active_status === 'online' ? 'Active now' : user.active_status === 'away' ? 'Away' : 'Offline')}
                        >
                          {user.active_status === 'online' && (
                            <span className="w-1 h-1 bg-white rounded-full animate-ping opacity-75" />
                          )}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-black text-slate-900 truncate uppercase">
                            {user.full_name || user.username}
                          </h4>
                          {user.active_status === 'online' && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-black bg-emerald-50 text-emerald-600 border border-emerald-200/60 leading-none">
                              <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                              Active
                            </span>
                          )}
                          {user.active_status === 'away' && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-amber-50 text-amber-600 border border-amber-200/60 leading-none">
                              {user.active_text || 'Away'}
                            </span>
                          )}
                        </div>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                          Lv.{user.level || 1}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs sm:text-sm font-black text-orange-600 tracking-tight">
                          {activeCategory === 'time'
                            ? formatStudyTime(user.value)
                            : `${user.value.toLocaleString()} ${categoryLabels[activeCategory].unit}`}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
