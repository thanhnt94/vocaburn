import { Trophy, Crown, Zap, Flame, Target, CheckCircle2, User as UserIcon, Clock, Calendar } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export type LeaderboardCategory = 'xp' | 'streak' | 'questions' | 'accuracy'
export type LeaderboardTimeFilter = 'today' | 'week' | 'month' | 'all_time'

export interface LeaderboardUser {
  rank: number
  user_id: number
  username: string
  full_name: string
  value: number
  level: number
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
  accuracy?: LeaderboardCategoryData
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
  onSelectCategory,
  timeFilter,
  onSelectTimeFilter
}: LeaderboardTabProps) {
  const currentLeaderboard = data?.[activeCategory] || { list: [], user_rank: -1, user_value: 0 }
  const topThree = currentLeaderboard.list.slice(0, 3)
  const remainingUsers = currentLeaderboard.list.slice(3)

  const categoryLabels: Record<LeaderboardCategory, { label: string, icon: any, unit: string, sub: string }> = {
    xp: { label: 'XP', icon: Zap, unit: 'XP', sub: 'Total experience' },
    streak: { label: 'Streak', icon: Flame, unit: 'days', sub: 'Daily streak' },
    questions: { label: 'Cards', icon: Target, unit: 'cards', sub: 'Cards reviewed' },
    accuracy: { label: 'Accuracy', icon: CheckCircle2, unit: '%', sub: 'Correct rate' },
  }

  const timeFilterLabels: Record<LeaderboardTimeFilter, { label: string, icon: any }> = {
    today: { label: 'Today', icon: Clock },
    week: { label: 'Week', icon: Calendar },
    month: { label: 'Month', icon: Calendar },
    all_time: { label: 'All Time', icon: Crown }
  }

  return (
    <div className="space-y-3 text-left max-w-5xl mx-auto">
      {/* 🌟 My Rank Banner - Compact Sleek Ribbon */}
      {currentLeaderboard.user_rank !== -1 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900 rounded-2xl px-3.5 py-2.5 text-white border border-slate-800 shadow-md flex items-center justify-between gap-3 relative overflow-hidden"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Trophy className="w-4 h-4 animate-pulse" />
            </div>
            <div className="min-w-0 flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vị trí của bạn:</span>
              <span className="text-xs sm:text-sm font-black text-amber-400 leading-none">#{currentLeaderboard.user_rank}</span>
              <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700 uppercase">
                {timeFilterLabels[timeFilter].label}
              </span>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-xs sm:text-sm font-black text-amber-300 tracking-tight">
              {currentLeaderboard.user_value.toLocaleString()} {categoryLabels[activeCategory].unit}
            </span>
            <span className="text-[7.5px] font-bold uppercase tracking-wider text-slate-400 block -mt-0.5">
              {categoryLabels[activeCategory].sub}
            </span>
          </div>
        </motion.div>
      )}

      {/* 🏆 Podium Top 3 & Leaderboard Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-3.5 sm:p-5 shadow-sm relative overflow-hidden">
        {isLoading ? (
          <div className="py-14 text-center flex flex-col items-center justify-center gap-2">
            <Zap className="w-6 h-6 text-amber-500 animate-pulse" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Đang tải dữ liệu bảng vinh danh...
            </span>
          </div>
        ) : (
          <>
            {/* Top 3 Podium (Compact) */}
            {topThree.length > 0 && (
              <div className="flex items-end justify-center gap-2 sm:gap-5 py-3 sm:py-4 border-b border-slate-100 bg-gradient-to-b from-amber-50/20 via-slate-50/30 to-transparent rounded-2xl mb-3 px-1">
                {(() => {
                  const podiums = [
                    { item: topThree[1], pos: 2, height: 'h-12 sm:h-14', color: 'from-slate-100 to-slate-200 border-slate-300', text: 'text-slate-600', ring: 'border-slate-300', badgeBg: 'bg-slate-400' },
                    { item: topThree[0], pos: 1, height: 'h-16 sm:h-18', color: 'from-amber-100 via-amber-200 to-amber-300 border-amber-400', text: 'text-amber-700', ring: 'border-amber-400 ring-2 ring-amber-200', badgeBg: 'bg-amber-500' },
                    { item: topThree[2], pos: 3, height: 'h-9 sm:h-11', color: 'from-orange-100 to-orange-200 border-orange-300', text: 'text-orange-700', ring: 'border-orange-300', badgeBg: 'bg-orange-500' }
                  ].filter(p => p.item)

                  return podiums.map((pod) => {
                    const user = pod.item
                    const initial = (user.full_name || user.username || '?').charAt(0).toUpperCase()

                    return (
                      <div key={user.user_id} className="flex flex-col items-center w-20 sm:w-26 shrink-0 text-center">
                        <div className="relative mb-1.5">
                          {pod.pos === 1 && (
                            <Crown className="w-4 h-4 text-amber-500 absolute -top-3.5 left-1/2 -translate-x-1/2 drop-shadow-sm" />
                          )}
                          <div className={cn(
                            "rounded-full border-2 flex items-center justify-center font-black bg-white shadow-xs relative",
                            pod.pos === 1 ? "w-10 h-10 sm:w-12 sm:h-12 text-xs sm:text-sm" : "w-8 h-8 sm:w-10 sm:h-10 text-[11px] sm:text-xs",
                            pod.ring
                          )}>
                            {initial}
                            <div className={cn(
                              "absolute -bottom-1 -right-1 w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-full border border-white flex items-center justify-center text-[7.5px] sm:text-[8.5px] font-black text-white shadow-xs",
                              pod.badgeBg
                            )}>
                              {pod.pos}
                            </div>
                          </div>
                        </div>

                        <div className="text-center w-full px-0.5">
                          <div className="text-[10px] sm:text-[11px] font-black text-slate-900 truncate leading-tight">
                            {user.full_name || user.username}
                          </div>
                          <div className="text-[7.5px] font-bold text-slate-400 uppercase tracking-wider">
                            Lv.{user.level || 1}
                          </div>
                        </div>

                        <div className={cn(
                          "w-full mt-2 rounded-t-xl flex flex-col justify-end items-center pb-1.5 bg-gradient-to-t shadow-2xs border-t border-x",
                          pod.height, pod.color
                        )}>
                          <span className={cn("text-[9px] sm:text-[10px] font-black tracking-tight leading-none mb-0.5", pod.text)}>
                            {user.value.toLocaleString()}
                          </span>
                          <span className="text-[6.5px] font-bold text-slate-500 uppercase tracking-widest leading-none">
                            {categoryLabels[activeCategory].unit}
                          </span>
                        </div>
                      </div>
                    )
                  })
                })()}
              </div>
            )}

            {/* List Top 4 - 50 */}
            <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1 no-scrollbar">
              {remainingUsers.length === 0 && topThree.length === 0 ? (
                <div className="py-8 text-center text-slate-400 font-bold text-xs bg-slate-50 rounded-xl">
                  Chưa có dữ liệu bảng xếp hạng cho mốc thời gian này.
                </div>
              ) : remainingUsers.length === 0 ? (
                <div className="py-2 text-center text-[8.5px] font-black text-slate-300 uppercase tracking-widest">
                  Đã hiển thị toàn bộ thành viên dẫn đầu
                </div>
              ) : (
                remainingUsers.map((user) => {
                  const initial = (user.full_name || user.username || '?').charAt(0).toUpperCase()
                  return (
                    <div
                      key={user.user_id}
                      className="flex items-center gap-2.5 p-2 sm:p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 hover:border-amber-200 hover:bg-amber-50/20 transition-all text-left"
                    >
                      <div className="w-5 text-[10px] font-black text-slate-400 text-center shrink-0">
                        #{user.rank}
                      </div>
                      <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[11px] font-black text-slate-700 shrink-0 shadow-2xs">
                        {initial}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[11px] font-black text-slate-900 truncate uppercase">
                          {user.full_name || user.username}
                        </h4>
                        <p className="text-[7.5px] font-bold text-slate-400 uppercase tracking-wider">
                          Cấp {user.level || 1}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[11px] font-black text-orange-600 tracking-tight">
                          {user.value.toLocaleString()} {categoryLabels[activeCategory].unit}
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
