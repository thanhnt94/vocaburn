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
    <div className="space-y-4 text-left max-w-5xl mx-auto">
      {/* 👑 Top Controls: Centered Category & Time Filters */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-5 shadow-sm space-y-3.5 relative overflow-hidden text-center">
        <div className="h-1 absolute top-0 inset-x-0 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500" />
        
        {/* Title Header */}
        <div className="flex items-center justify-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
            <Trophy className="w-4.5 h-4.5" />
          </div>
          <div className="text-left">
            <h2 className="text-xs sm:text-sm md:text-base font-black text-slate-900 uppercase tracking-widest italic leading-none">
              Bảng Vinh Danh Thành Viên
            </h2>
            <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 mt-1">
              Khám phá vị trí của bạn và thi đua học tập cùng cộng đồng
            </p>
          </div>
        </div>

        {/* Cohesive Centered Filter Rows (Optimized for Mobile) */}
        <div className="space-y-2 pt-0.5">
          {/* Row 1: Tiêu chí xếp hạng */}
          <div className="flex items-center justify-center">
            <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/70 w-full sm:w-auto justify-center gap-1">
              {(['xp', 'streak', 'questions', 'accuracy'] as const).map((cat) => {
                const Icon = categoryLabels[cat].icon
                const isActive = activeCategory === cat
                return (
                  <button
                    key={cat}
                    onClick={() => onSelectCategory(cat)}
                    className={cn(
                      "flex-1 sm:flex-none px-2 sm:px-4 py-1.5 rounded-xl text-[9.5px] sm:text-[11px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center justify-center gap-1",
                      isActive
                        ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm font-black"
                        : "text-slate-500 hover:text-slate-900 font-bold hover:bg-white/50"
                    )}
                  >
                    <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                    <span>{categoryLabels[cat].label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Row 2: Mốc thời gian */}
          <div className="flex items-center justify-center">
            <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/70 w-full sm:w-auto justify-center gap-1">
              {(['today', 'week', 'month', 'all_time'] as const).map((tf) => {
                const item = timeFilterLabels[tf]
                const Icon = item.icon
                const isActive = timeFilter === tf
                return (
                  <button
                    key={tf}
                    onClick={() => onSelectTimeFilter(tf)}
                    className={cn(
                      "flex-1 sm:flex-none px-2 sm:px-4 py-1.5 rounded-xl text-[9.5px] sm:text-[11px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center justify-center gap-1",
                      isActive
                        ? "bg-slate-900 text-white shadow-sm font-black"
                        : "text-slate-500 hover:text-slate-900 font-bold hover:bg-white/50"
                    )}
                  >
                    <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 🌟 My Rank Banner - Prominent Position Card */}
      {currentLeaderboard.user_rank !== -1 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-indigo-950 via-indigo-900 to-purple-950 rounded-3xl p-4 sm:p-5 text-white shadow-lg shadow-indigo-950/20 border border-indigo-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative overflow-hidden"
        >
          <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-amber-400/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0 backdrop-blur-md">
              <Trophy className="w-6 h-6 text-amber-300 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <span className="text-[8.5px] font-black uppercase tracking-widest text-indigo-300">
                  Vị trí của bạn
                </span>
                <span className="px-2 py-0.5 rounded-md bg-white/10 border border-white/10 text-[8.5px] font-bold text-amber-300">
                  {timeFilterLabels[timeFilter].label}
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-black truncate leading-tight">
                Bạn đang đứng thứ <span className="text-amber-300 font-extrabold text-base sm:text-lg">#{currentLeaderboard.user_rank}</span>
              </h3>
            </div>
          </div>

          <div className="text-left sm:text-right shrink-0 bg-white/10 px-4 py-2 rounded-2xl border border-white/10 backdrop-blur-md self-start sm:self-auto">
            <div className="text-sm sm:text-base font-black text-amber-300 tracking-tight">
              {currentLeaderboard.user_value.toLocaleString()} {categoryLabels[activeCategory].unit}
            </div>
            <span className="text-[7.5px] font-bold uppercase tracking-wider text-indigo-200 block mt-0.5">
              {categoryLabels[activeCategory].sub}
            </span>
          </div>
        </motion.div>
      )}

      {/* 🏆 Podium Top 3 & Leaderboard Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 md:p-8 shadow-sm relative overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
            <Zap className="w-8 h-8 text-amber-500 animate-pulse" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Đang tải dữ liệu bảng vinh danh...
            </span>
          </div>
        ) : (
          <>
            {/* Top 3 Podium */}
            {topThree.length > 0 && (
              <div className="flex items-end justify-center gap-3 sm:gap-6 py-6 sm:py-8 border-b border-slate-100 bg-gradient-to-b from-amber-50/20 via-slate-50/40 to-transparent rounded-3xl mb-6 px-2">
                {(() => {
                  const podiums = [
                    { item: topThree[1], pos: 2, height: 'h-24 sm:h-28', color: 'from-slate-100 to-slate-200 border-slate-300', text: 'text-slate-600', ring: 'border-slate-300', badgeBg: 'bg-slate-400' },
                    { item: topThree[0], pos: 1, height: 'h-32 sm:h-36', color: 'from-amber-100 via-amber-200 to-amber-300 border-amber-400', text: 'text-amber-700', ring: 'border-amber-400 ring-4 ring-amber-100', badgeBg: 'bg-amber-500' },
                    { item: topThree[2], pos: 3, height: 'h-20 sm:h-24', color: 'from-orange-100 to-orange-200 border-orange-300', text: 'text-orange-700', ring: 'border-orange-300', badgeBg: 'bg-orange-500' }
                  ].filter(p => p.item)

                  return podiums.map((pod) => {
                    const user = pod.item
                    const initial = (user.full_name || user.username || '?').charAt(0).toUpperCase()

                    return (
                      <div key={user.user_id} className="flex flex-col items-center w-24 sm:w-32 shrink-0 text-center">
                        <div className="relative mb-2">
                          {pod.pos === 1 && (
                            <Crown className="w-6 h-6 text-amber-500 absolute -top-5 left-1/2 -translate-x-1/2 drop-shadow-sm animate-bounce" />
                          )}
                          <div className={cn(
                            "w-12 h-12 sm:w-16 sm:h-16 rounded-full border-2 flex items-center justify-center text-sm sm:text-lg font-black bg-white shadow-md relative",
                            pod.ring
                          )}>
                            {initial}
                            <div className={cn(
                              "absolute -bottom-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-white flex items-center justify-center text-[9px] sm:text-[10px] font-black text-white shadow-sm",
                              pod.badgeBg
                            )}>
                              {pod.pos}
                            </div>
                          </div>
                        </div>

                        <div className="text-center w-full px-1">
                          <div className="text-[11px] font-black text-slate-900 truncate leading-tight">
                            {user.full_name || user.username}
                          </div>
                          <div className="text-[8px] font-black text-slate-400 uppercase mt-0.5 tracking-wider">
                            Cấp {user.level || 1}
                          </div>
                        </div>

                        <div className={cn(
                          "w-full mt-3 rounded-t-2xl flex flex-col justify-end items-center pb-2.5 bg-gradient-to-t shadow-xs border-t border-x",
                          pod.height, pod.color
                        )}>
                          <span className={cn("text-[10px] sm:text-[11px] font-black tracking-tight leading-none mb-1", pod.text)}>
                            {user.value.toLocaleString()}
                          </span>
                          <span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest leading-none">
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
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1 no-scrollbar">
              {remainingUsers.length === 0 && topThree.length === 0 ? (
                <div className="py-12 text-center text-slate-400 font-bold text-xs bg-slate-50 rounded-2xl">
                  Chưa có dữ liệu bảng xếp hạng cho mốc thời gian này.
                </div>
              ) : remainingUsers.length === 0 ? (
                <div className="py-4 text-center text-[9px] font-black text-slate-300 uppercase tracking-widest">
                  Đã hiển thị toàn bộ thành viên dẫn đầu
                </div>
              ) : (
                remainingUsers.map((user) => {
                  const initial = (user.full_name || user.username || '?').charAt(0).toUpperCase()
                  return (
                    <div
                      key={user.user_id}
                      className="flex items-center gap-3 p-3 sm:p-3.5 rounded-2xl bg-slate-50/80 border border-slate-100 hover:border-amber-200 hover:bg-amber-50/20 transition-all text-left"
                    >
                      <div className="w-7 text-[11px] font-black text-slate-400 text-center shrink-0">
                        #{user.rank}
                      </div>
                      <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-xs font-black text-slate-700 shrink-0 shadow-2xs">
                        {initial}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-black text-slate-900 truncate uppercase">
                          {user.full_name || user.username}
                        </h4>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                          Cấp độ {user.level || 1}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs font-black text-orange-600 tracking-tight">
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
