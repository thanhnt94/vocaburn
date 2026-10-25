import React from 'react'
import { 
  Trophy, 
  Crown, 
  Zap, 
  Flame, 
  Target, 
  Clock, 
  Sparkles,
  TrendingUp,
  Award
} from 'lucide-react'
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
  onSelectCategory,
  timeFilter,
  onSelectTimeFilter
}: LeaderboardTabProps) {
  const currentLeaderboard = data?.[activeCategory] || { list: [], user_rank: -1, user_value: 0 }
  const topThree = currentLeaderboard.list.slice(0, 3)
  const remainingUsers = currentLeaderboard.list.slice(3)
  const topOneScore = topThree[0]?.value || 1

  const categoryConfig: Record<LeaderboardCategory, {
    label: string
    icon: any
    unit: string
    sub: string
    color: string
    activeBar: string
  }> = {
    xp: {
      label: 'XP',
      icon: Zap,
      unit: 'XP',
      sub: 'Total Experience',
      color: 'text-amber-600',
      activeBar: 'bg-amber-500'
    },
    streak: {
      label: 'Streak',
      icon: Flame,
      unit: 'days',
      sub: 'Daily Streak',
      color: 'text-orange-600',
      activeBar: 'bg-orange-500'
    },
    questions: {
      label: 'Cards',
      icon: Target,
      unit: 'cards',
      sub: 'Cards Reviewed',
      color: 'text-indigo-600',
      activeBar: 'bg-indigo-500'
    },
    time: {
      label: 'Time',
      icon: Clock,
      unit: '',
      sub: 'Study Time',
      color: 'text-emerald-600',
      activeBar: 'bg-emerald-500'
    },
  }

  const activeCat = categoryConfig[activeCategory]

  // Extract info for the current user's personal card
  const currentUserObj = currentLeaderboard.list.find(u => u.rank === currentLeaderboard.user_rank)
  const userName = currentUserObj?.full_name || currentUserObj?.username || 'You'
  const userInitial = userName.charAt(0).toUpperCase()
  const userLevel = currentUserObj?.level || 1
  const gapToFirst = topThree[0] && currentLeaderboard.user_rank > 1
    ? Math.max(0, topThree[0].value - currentLeaderboard.user_value)
    : 0

  return (
    <div className="space-y-3 text-left w-full mx-auto flex flex-col h-full min-h-0 overflow-hidden font-sans">
      {/* ── 1. YOUR STANDING CARD (MINIMALIST APPLE/LINEAR STYLE) ── */}
      {currentLeaderboard.user_rank !== -1 && (
        <div className="bg-white rounded-2xl border border-slate-200/90 px-4 py-3 shadow-xs flex items-center justify-between gap-3 shrink-0 select-none">
          {/* User Avatar + Identity */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-black text-sm flex items-center justify-center shadow-xs">
                {userInitial}
              </div>
              <span className="absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded-full bg-slate-100 border border-slate-300 text-slate-800 font-mono font-black text-[9px] leading-tight">
                #{currentLeaderboard.user_rank}
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900 truncate">
                  {userName}
                </span>
                <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[9px] font-black tracking-wider uppercase">
                  YOU
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-400 font-medium">
                <span>Lv.{userLevel}</span>
                <span>•</span>
                <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Online
                </span>
              </div>
            </div>
          </div>

          {/* Motivational standing note (Desktop/Tablet) */}
          {topThree[0] && (
            <div className="hidden sm:flex flex-col items-center justify-center text-center px-3 py-1 rounded-xl bg-slate-50 border border-slate-200/60">
              <span className="text-[11px] font-bold text-slate-700">
                {currentLeaderboard.user_rank === 1
                  ? '👑 1st Place · Leading the leaderboard'
                  : currentLeaderboard.user_rank === 2
                  ? `🥈 2nd Place · ${activeCategory === 'time' ? formatStudyTime(gapToFirst) : gapToFirst.toLocaleString() + ' ' + activeCat.unit} behind #1`
                  : `Rank #${currentLeaderboard.user_rank} · ${activeCategory === 'time' ? formatStudyTime(gapToFirst) : gapToFirst.toLocaleString() + ' ' + activeCat.unit} to Top 1`}
              </span>
            </div>
          )}

          {/* Score */}
          <div className="text-right shrink-0">
            <div className="text-base sm:text-lg font-black text-slate-900 font-mono tracking-tight leading-none">
              {activeCategory === 'time'
                ? formatStudyTime(currentLeaderboard.user_value)
                : `${currentLeaderboard.user_value.toLocaleString()} ${activeCat.unit}`}
            </div>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mt-1">
              {activeCat.sub}
            </span>
          </div>
        </div>
      )}

      {/* ── 2. MAIN LEADERBOARD CONTAINER ── */}
      <div className="w-full bg-white rounded-3xl border border-slate-200/90 p-3.5 sm:p-5 shadow-xs flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* ── FILTER CONTROLS (LINEAR STYLE) ── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pb-3 border-b border-slate-100 shrink-0">
          {/* Category Tabs */}
          <div className="flex items-center w-full sm:w-auto p-1 rounded-xl bg-slate-100 border border-slate-200/70 gap-1">
            {(['xp', 'streak', 'questions', 'time'] as const).map((cat) => {
              const isActive = activeCategory === cat
              const cfg = categoryConfig[cat]
              const Icon = cfg.icon
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => onSelectCategory(cat)}
                  className={cn(
                    "flex-1 sm:flex-none flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all select-none cursor-pointer",
                    isActive
                      ? "bg-white text-slate-900 shadow-xs border border-slate-200/80 font-black"
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  <Icon className={cn(
                    "w-3.5 h-3.5 shrink-0",
                    isActive ? cfg.color : "text-slate-400"
                  )} />
                  <span className="truncate">{cfg.label}</span>
                </button>
              )
            })}
          </div>

          {/* Timeframe Tabs */}
          <div className="flex items-center w-full sm:w-auto p-1 rounded-xl bg-slate-100 border border-slate-200/70 gap-1">
            {(['all_time', 'month', 'week', 'today'] as const).map((tf) => {
              const isActive = timeFilter === tf
              const tfLabels: Record<string, string> = {
                all_time: 'All Time',
                month: 'Month',
                week: 'Week',
                today: 'Today'
              }
              return (
                <button
                  key={tf}
                  type="button"
                  onClick={() => onSelectTimeFilter(tf)}
                  className={cn(
                    "relative flex-1 sm:flex-none flex items-center justify-center py-1.5 px-3 rounded-lg text-xs font-bold transition-all select-none cursor-pointer",
                    isActive ? "text-slate-900 font-black" : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeLinearTimePill"
                      className="absolute inset-0 bg-white rounded-lg shadow-xs border border-slate-200/80"
                      transition={{ type: "spring", bounce: 0.15, duration: 0.3 }}
                    />
                  )}
                  <span className="relative z-10 truncate">{tfLabels[tf]}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── BODY ── */}
        {isLoading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center gap-2 my-auto">
            <div className="w-8 h-8 rounded-full border-2 border-slate-300 border-t-slate-800 animate-spin" />
            <span className="text-xs font-bold text-slate-400 mt-2">
              Loading rankings...
            </span>
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden pt-2.5">
            {/* ── 3. TOP 3 PODIUM (CLEAN APPLE/LINEAR SHOWCASE) ── */}
            {topThree.length > 0 && (
              <div className="grid grid-cols-3 gap-2 sm:gap-3 items-stretch pb-3 border-b border-slate-100 shrink-0">
                {/* RANK 2: Silver (Left) */}
                {topThree[1] && (() => {
                  const user = topThree[1]
                  const initial = (user.full_name || user.username || '?').charAt(0).toUpperCase()
                  const isCurrentUser = user.rank === currentLeaderboard.user_rank
                  return (
                    <div className={cn(
                      "flex flex-col items-center justify-between p-3 rounded-2xl border transition-all text-center",
                      isCurrentUser 
                        ? "bg-slate-50 border-slate-300 ring-2 ring-slate-300/60 shadow-xs" 
                        : "bg-slate-50/70 border-slate-200/80 hover:bg-slate-50"
                    )}>
                      {/* Badge */}
                      <span className="px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700 text-[9.5px] font-black uppercase tracking-wider mb-2">
                        🥈 2nd
                      </span>

                      {/* Avatar */}
                      <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-slate-200 text-slate-700 font-bold text-sm flex items-center justify-center shadow-xs mb-1.5">
                        {initial}
                      </div>

                      {/* Identity */}
                      <div className="w-full truncate px-1">
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {user.full_name || user.username}
                          </span>
                          {isCurrentUser && (
                            <span className="px-1 py-0.2 rounded bg-slate-200 text-slate-800 text-[8px] font-black shrink-0">YOU</span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                          Lv.{user.level || 1}
                        </span>
                      </div>

                      {/* Score */}
                      <div className="mt-2.5 pt-2 border-t border-slate-200/60 w-full text-center">
                        <span className="text-xs sm:text-sm font-black text-slate-900 font-mono block">
                          {activeCategory === 'time' ? formatStudyTime(user.value) : user.value.toLocaleString()}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mt-0.5">
                          {activeCat.unit || 'Score'}
                        </span>
                      </div>
                    </div>
                  )
                })()}

                {/* RANK 1: Gold (Center) */}
                {topThree[0] && (() => {
                  const user = topThree[0]
                  const initial = (user.full_name || user.username || '?').charAt(0).toUpperCase()
                  const isCurrentUser = user.rank === currentLeaderboard.user_rank
                  return (
                    <div className={cn(
                      "flex flex-col items-center justify-between p-3 rounded-2xl border transition-all text-center",
                      isCurrentUser 
                        ? "bg-amber-50/70 border-amber-300 ring-2 ring-amber-300/80 shadow-xs" 
                        : "bg-amber-50/30 border-amber-200 hover:bg-amber-50/50 shadow-xs"
                    )}>
                      {/* Badge */}
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 border border-amber-200 text-amber-800 text-[9.5px] font-black uppercase tracking-wider mb-2 flex items-center gap-1">
                        🥇 1st Place
                      </span>

                      {/* Avatar */}
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-amber-400 text-slate-950 font-black text-base flex items-center justify-center shadow-sm mb-1.5 ring-2 ring-amber-300">
                        {initial}
                      </div>

                      {/* Identity */}
                      <div className="w-full truncate px-1">
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-xs sm:text-sm font-black text-slate-900 truncate">
                            {user.full_name || user.username}
                          </span>
                          {isCurrentUser && (
                            <span className="px-1 py-0.2 rounded bg-amber-400 text-slate-950 text-[8px] font-black shrink-0">YOU</span>
                          )}
                        </div>
                        <span className="text-[10px] text-amber-700/80 font-bold block mt-0.5">
                          Lv.{user.level || 1}
                        </span>
                      </div>

                      {/* Score */}
                      <div className="mt-2.5 pt-2 border-t border-amber-200/60 w-full text-center">
                        <span className="text-xs sm:text-sm font-black text-amber-950 font-mono block">
                          {activeCategory === 'time' ? formatStudyTime(user.value) : user.value.toLocaleString()}
                        </span>
                        <span className="text-[9px] font-black text-amber-700 uppercase tracking-wider block mt-0.5">
                          {activeCat.unit || 'Score'}
                        </span>
                      </div>
                    </div>
                  )
                })()}

                {/* RANK 3: Bronze (Right) */}
                {topThree[2] && (() => {
                  const user = topThree[2]
                  const initial = (user.full_name || user.username || '?').charAt(0).toUpperCase()
                  const isCurrentUser = user.rank === currentLeaderboard.user_rank
                  return (
                    <div className={cn(
                      "flex flex-col items-center justify-between p-3 rounded-2xl border transition-all text-center",
                      isCurrentUser 
                        ? "bg-orange-50/70 border-orange-300 ring-2 ring-orange-300/60 shadow-xs" 
                        : "bg-orange-50/30 border-orange-200/80 hover:bg-orange-50/50"
                    )}>
                      {/* Badge */}
                      <span className="px-2 py-0.5 rounded-full bg-orange-100/80 text-orange-800 text-[9.5px] font-black uppercase tracking-wider mb-2">
                        🥉 3rd
                      </span>

                      {/* Avatar */}
                      <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-orange-200 text-orange-900 font-bold text-sm flex items-center justify-center shadow-xs mb-1.5">
                        {initial}
                      </div>

                      {/* Identity */}
                      <div className="w-full truncate px-1">
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {user.full_name || user.username}
                          </span>
                          {isCurrentUser && (
                            <span className="px-1 py-0.2 rounded bg-orange-200 text-orange-900 text-[8px] font-black shrink-0">YOU</span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                          Lv.{user.level || 1}
                        </span>
                      </div>

                      {/* Score */}
                      <div className="mt-2.5 pt-2 border-t border-orange-200/60 w-full text-center">
                        <span className="text-xs sm:text-sm font-black text-slate-900 font-mono block">
                          {activeCategory === 'time' ? formatStudyTime(user.value) : user.value.toLocaleString()}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mt-0.5">
                          {activeCat.unit || 'Score'}
                        </span>
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}

            {/* ── 4. RANKINGS LIST (#4 TO #50) (LINEAR STYLE) ── */}
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1 w-full space-y-1.5 pt-2.5">
              {remainingUsers.length === 0 && topThree.length === 0 ? (
                <div className="py-12 text-center text-slate-400 font-medium text-xs bg-slate-50 rounded-2xl border border-slate-100">
                  No leaderboard data for this period.
                </div>
              ) : remainingUsers.length === 0 ? (
                <div className="py-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  All top members displayed above
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-1.5">
                  {remainingUsers.map((user) => {
                    const initial = (user.full_name || user.username || '?').charAt(0).toUpperCase()
                    const isCurrentUser = user.rank === currentLeaderboard.user_rank
                    const pctOfMax = Math.min(100, Math.max(3, Math.round((user.value / topOneScore) * 100)))

                    return (
                      <div
                        key={user.user_id}
                        className={cn(
                          "w-full flex items-center justify-between gap-3 p-2.5 sm:p-3 rounded-xl border transition-all text-left",
                          isCurrentUser
                            ? "bg-amber-50/50 border-amber-300 ring-1 ring-amber-300/80 shadow-xs"
                            : "bg-white hover:bg-slate-50/70 border-slate-200/70 shadow-2xs"
                        )}
                      >
                        {/* Rank + Avatar + Name */}
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Rank */}
                          <span className="w-6 text-[11px] font-mono font-bold text-slate-400 text-center shrink-0">
                            #{user.rank}
                          </span>

                          {/* Avatar */}
                          <div className="relative shrink-0">
                            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center border border-slate-200/70">
                              {initial}
                            </div>
                            {user.active_status === 'online' && (
                              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
                            )}
                          </div>

                          {/* Details */}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                                {user.full_name || user.username}
                              </span>
                              {isCurrentUser && (
                                <span className="px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 text-[8px] font-black uppercase tracking-wider shrink-0">
                                  YOU
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-[9.5px] text-slate-400 font-medium">
                              <span>Lv.{user.level || 1}</span>
                              <span>•</span>
                              <span className={user.active_status === 'online' ? "text-emerald-600 font-semibold" : ""}>
                                {user.active_status === 'online' ? 'Online' : user.active_text || 'Offline'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Score + Relative Bar */}
                        <div className="text-right shrink-0">
                          <span className="text-xs sm:text-sm font-bold text-slate-900 font-mono block leading-none">
                            {activeCategory === 'time'
                              ? formatStudyTime(user.value)
                              : `${user.value.toLocaleString()} ${activeCat.unit}`}
                          </span>
                          {/* Slim progress relative to #1 */}
                          <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden mt-1.5 ml-auto">
                            <div 
                              className={cn("h-full rounded-full transition-all duration-300", isCurrentUser ? "bg-amber-500" : "bg-slate-400")} 
                              style={{ width: `${pctOfMax}%` }} 
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
