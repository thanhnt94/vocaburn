import React from 'react'
import { 
  Trophy, 
  Crown, 
  Zap, 
  Flame, 
  Target, 
  Clock, 
  Sparkles, 
  Medal, 
  Award, 
  TrendingUp,
  Star,
  ShieldCheck,
  ChevronRight
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
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

const AVATAR_GRADIENTS = [
  'from-blue-600 to-indigo-600 text-white',
  'from-violet-600 to-purple-600 text-white',
  'from-emerald-500 to-teal-600 text-white',
  'from-amber-500 to-orange-600 text-white',
  'from-rose-500 to-pink-600 text-white',
  'from-fuchsia-600 to-pink-600 text-white',
  'from-cyan-500 to-blue-600 text-white',
  'from-indigo-600 to-cyan-600 text-white',
]

export function getAvatarGradient(name: string): string {
  if (!name) return AVATAR_GRADIENTS[0]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % AVATAR_GRADIENTS.length
  return AVATAR_GRADIENTS[index]
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
    activeBg: string
    activeBorder: string
    textColor: string
    glowShadow: string
    dotColor: string
  }> = {
    xp: {
      label: 'XP',
      icon: Zap,
      unit: 'XP',
      sub: 'Total Experience',
      activeBg: 'bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 text-slate-950 font-black',
      activeBorder: 'border-amber-400/80',
      textColor: 'text-amber-500',
      glowShadow: 'shadow-md shadow-amber-500/25',
      dotColor: 'bg-amber-400'
    },
    streak: {
      label: 'Streak',
      icon: Flame,
      unit: 'days',
      sub: 'Daily Streak',
      activeBg: 'bg-gradient-to-r from-orange-500 via-red-500 to-rose-500 text-white font-black',
      activeBorder: 'border-orange-500/80',
      textColor: 'text-orange-500',
      glowShadow: 'shadow-md shadow-orange-500/25',
      dotColor: 'bg-orange-500'
    },
    questions: {
      label: 'Cards',
      icon: Target,
      unit: 'cards',
      sub: 'Cards Reviewed',
      activeBg: 'bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 text-white font-black',
      activeBorder: 'border-indigo-500/80',
      textColor: 'text-indigo-500',
      glowShadow: 'shadow-md shadow-indigo-500/25',
      dotColor: 'bg-indigo-500'
    },
    time: {
      label: 'Time',
      icon: Clock,
      unit: '',
      sub: 'Study Time',
      activeBg: 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white font-black',
      activeBorder: 'border-emerald-500/80',
      textColor: 'text-emerald-500',
      glowShadow: 'shadow-md shadow-emerald-500/25',
      dotColor: 'bg-emerald-500'
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
    <div className="space-y-3 text-left w-full mx-auto flex flex-col h-full min-h-0 overflow-hidden">
      {/* ═══════════ VIP PLAYER RANK CARD ═══════════ */}
      {currentLeaderboard.user_rank !== -1 && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0a0f1d] via-[#101733] to-[#0a0f1d] text-white border border-amber-500/30 shadow-lg shadow-indigo-950/20 px-3.5 sm:px-5 py-2.5 sm:py-3 select-none shrink-0"
        >
          {/* Subtle top edge shimmer */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent opacity-80" />
          <div className="absolute -top-12 -right-12 w-44 h-44 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex items-center justify-between gap-3">
            {/* Left: Avatar + Identity */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0">
                <div className={cn(
                  "w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center font-black text-sm sm:text-base shadow-md border transition-transform",
                  currentLeaderboard.user_rank === 1
                    ? "bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-950 border-amber-300 ring-2 ring-amber-400/50 shadow-amber-500/30"
                    : currentLeaderboard.user_rank === 2
                    ? "bg-gradient-to-tr from-slate-200 to-slate-400 text-slate-950 border-slate-300 ring-2 ring-slate-400/40"
                    : currentLeaderboard.user_rank === 3
                    ? "bg-gradient-to-tr from-amber-700 to-orange-500 text-white border-amber-500 ring-2 ring-amber-600/40"
                    : "bg-gradient-to-tr from-indigo-600 to-violet-600 text-white border-indigo-400"
                )}>
                  {userInitial}
                </div>
                {/* Floating Rank Pill Badge */}
                <span className={cn(
                  "absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded-full text-[9px] font-black leading-none border shadow-xs flex items-center gap-0.5",
                  currentLeaderboard.user_rank === 1
                    ? "bg-amber-400 text-slate-950 border-white"
                    : currentLeaderboard.user_rank === 2
                    ? "bg-slate-200 text-slate-950 border-white"
                    : currentLeaderboard.user_rank === 3
                    ? "bg-amber-600 text-white border-white"
                    : "bg-indigo-600 text-white border-indigo-300"
                )}>
                  #{currentLeaderboard.user_rank}
                </span>
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs sm:text-sm font-black text-white tracking-tight truncate">
                    {userName}
                  </span>
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-[8.5px] font-black uppercase tracking-wider shrink-0">
                    YOU
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">
                    Lv.{userLevel}
                  </span>
                  <span className="text-slate-600 text-[8px]">•</span>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[9.5px] font-semibold text-emerald-400">Online</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Center (Desktop/Tablet): Motivational Gap Pill */}
            {topThree[0] && currentLeaderboard.user_rank > 1 && (
              <div className="hidden md:flex flex-col items-center justify-center max-w-[240px] text-center px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs">
                <span className="text-[10px] font-black text-amber-300 flex items-center gap-1 tracking-tight">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  {currentLeaderboard.user_rank === 2 ? '🥈 Á quân (Runner-Up)' : `Top ${currentLeaderboard.user_rank} Toàn cầu`}
                </span>
                <span className="text-[9px] text-slate-300 mt-0.5 truncate max-w-full">
                  Cách Top 1: <strong className="text-amber-200 font-mono font-bold">
                    {activeCategory === 'time' ? formatStudyTime(gapToFirst) : `${gapToFirst.toLocaleString()} ${activeCat.unit}`}
                  </strong>
                </span>
              </div>
            )}

            {/* Right: Big Score Typography */}
            <div className="text-right shrink-0">
              <div className="text-sm sm:text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 tracking-tight font-mono">
                {activeCategory === 'time'
                  ? formatStudyTime(currentLeaderboard.user_value)
                  : `${currentLeaderboard.user_value.toLocaleString()} ${activeCat.unit}`}
              </div>
              <span className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-widest block -mt-0.5">
                {activeCat.sub}
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* ═══════════ MAIN LEADERBOARD CARD ═══════════ */}
      <div className="w-full bg-white rounded-3xl border border-slate-200/80 p-3 sm:p-4 shadow-xs flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* ── HIGH-TECH FILTER HUB ── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pb-3 border-b border-slate-100 shrink-0">
          {/* Category Selector with Glowing Active Colors */}
          <div className="grid grid-flow-col auto-cols-fr w-full sm:w-auto p-1 rounded-2xl bg-slate-100/90 border border-slate-200/70 shadow-inner gap-1">
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
                    "relative flex items-center justify-center gap-1.5 py-1.5 px-2.5 sm:px-3 rounded-xl text-xs font-bold transition-all select-none cursor-pointer",
                    isActive
                      ? cn(cfg.activeBg, cfg.glowShadow)
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                  )}
                >
                  <Icon className={cn(
                    "w-3.5 h-3.5 shrink-0 transition-transform",
                    isActive ? "stroke-[2.5] scale-105" : "text-slate-400"
                  )} />
                  <span className="text-[11px] sm:text-xs truncate">{cfg.label}</span>
                </button>
              )
            })}
          </div>

          {/* Timeframe Selector with Spring Pill */}
          <div className="grid grid-flow-col auto-cols-fr w-full sm:w-auto p-1 rounded-2xl bg-slate-100/90 border border-slate-200/70 shadow-inner gap-1">
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
                    "relative flex items-center justify-center py-1 px-2.5 sm:px-3 rounded-xl text-[10.5px] sm:text-xs font-bold transition-all select-none cursor-pointer",
                    isActive ? "text-slate-900 font-black" : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeLeadTimePill"
                      className="absolute inset-0 bg-white rounded-xl shadow-xs border border-slate-200/80"
                      transition={{ type: "spring", bounce: 0.15, duration: 0.35 }}
                    />
                  )}
                  <span className="relative z-10 truncate">{tfLabels[tf]}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── CONTENT BODY ── */}
        {isLoading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center gap-3 my-auto">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-500 shadow-sm animate-bounce">
              <Trophy className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-xs font-black text-slate-800 uppercase tracking-widest block">
                Đang tải bảng xếp hạng...
              </span>
              <span className="text-[10px] text-slate-400 font-medium mt-0.5 block">
                Đang đồng bộ thứ hạng từ máy chủ
              </span>
            </div>
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden pt-2">
            {/* ── 3D CHAMPIONS PODIUM STAGE ── */}
            {topThree.length > 0 && (
              <div className="relative w-full rounded-3xl bg-gradient-to-b from-amber-50/40 via-slate-50/30 to-white border border-slate-200/60 p-3 sm:p-5 pt-7 pb-2 shrink-0 overflow-hidden shadow-xs mb-2">
                {/* Stadium Spotlight Aura */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-300/15 via-amber-100/5 to-transparent pointer-events-none" />

                <div className="relative z-10 grid grid-cols-3 gap-2 sm:gap-4 items-end max-w-xl mx-auto">
                  {/* PODIUM #2: Silver (Left) */}
                  {topThree[1] && (() => {
                    const user = topThree[1]
                    const initial = (user.full_name || user.username || '?').charAt(0).toUpperCase()
                    const isCurrentUser = user.rank === currentLeaderboard.user_rank
                    return (
                      <div className="flex flex-col items-center text-center w-full">
                        <div className="relative mb-1.5">
                          <div className={cn(
                            "w-11 h-11 sm:w-13 sm:h-13 rounded-full ring-4 ring-slate-300/80 ring-offset-2 ring-offset-white shadow-md bg-gradient-to-tr from-slate-200 via-slate-100 to-slate-300 flex items-center justify-center font-black text-slate-800 text-xs sm:text-sm relative transition-transform hover:scale-105",
                            isCurrentUser && "ring-amber-400 shadow-amber-400/20"
                          )}>
                            {initial}
                            <div className="absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded-full bg-gradient-to-r from-slate-300 to-slate-400 text-slate-900 font-black text-[8px] sm:text-[9px] border border-white shadow-xs leading-none">
                              🥈 2
                            </div>
                          </div>
                        </div>

                        {/* User Identity */}
                        <div className="text-center w-full px-0.5">
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-[11px] sm:text-xs font-black text-slate-900 truncate max-w-[75px] sm:max-w-[110px]">
                              {user.full_name || user.username}
                            </span>
                            {isCurrentUser && (
                              <span className="px-1 py-0.2 bg-amber-400 text-slate-950 text-[7.5px] font-black rounded-full leading-none shrink-0">YOU</span>
                            )}
                          </div>
                          <div className="flex items-center justify-center gap-1 mt-0.5 text-[8.5px] text-slate-400">
                            <span className="font-bold">Lv.{user.level || 1}</span>
                            <span>•</span>
                            <span className={user.active_status === 'online' ? "text-emerald-600 font-bold" : ""}>
                              {user.active_status === 'online' ? 'Online' : user.active_text || 'Offline'}
                            </span>
                          </div>
                        </div>

                        {/* Pedestal Block #2 */}
                        <div className="w-full mt-2 rounded-t-2xl flex flex-col justify-between items-center py-2 px-1 bg-gradient-to-b from-slate-200/90 via-slate-100/50 to-slate-50/20 border-t-4 border-x border-slate-300 shadow-sm relative overflow-hidden h-20 sm:h-24">
                          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-slate-300 via-white to-slate-300" />
                          <span className="absolute bottom-1 text-4xl sm:text-5xl font-black text-slate-300/30 pointer-events-none select-none font-mono">2</span>
                          
                          <div className="relative z-10 text-center space-y-0.5 mt-1">
                            <span className="text-[10.5px] sm:text-xs font-black text-slate-900 tracking-tight block font-mono">
                              {activeCategory === 'time' ? formatStudyTime(user.value) : user.value.toLocaleString()}
                            </span>
                            <span className="inline-block px-1.5 py-0.2 rounded-full bg-slate-300/50 text-slate-700 text-[7.5px] sm:text-[8px] font-black uppercase tracking-wider leading-tight">
                              {activeCat.unit || 'Score'}
                            </span>
                          </div>

                          <div className="relative z-10 text-[7.5px] sm:text-[8px] font-black text-slate-500 uppercase tracking-widest pb-0.5">
                            RUNNER-UP
                          </div>
                        </div>
                      </div>
                    )
                  })()}

                  {/* PODIUM #1: Gold Champion (Center) */}
                  {topThree[0] && (() => {
                    const user = topThree[0]
                    const initial = (user.full_name || user.username || '?').charAt(0).toUpperCase()
                    const isCurrentUser = user.rank === currentLeaderboard.user_rank
                    return (
                      <div className="flex flex-col items-center text-center w-full">
                        <div className="relative mb-2">
                          {/* Floating Crown Animation */}
                          <motion.div 
                            animate={{ y: [0, -3, 0] }} 
                            transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
                            className="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center justify-center pointer-events-none"
                          >
                            <Crown className="w-6 h-6 sm:w-7 sm:h-7 text-amber-500 fill-amber-400 filter drop-shadow-[0_2px_8px_rgba(245,158,11,0.5)]" />
                          </motion.div>

                          {/* Avatar Circle */}
                          <div className={cn(
                            "w-13 h-13 sm:w-16 sm:h-16 rounded-full ring-4 ring-amber-400 ring-offset-2 ring-offset-white shadow-xl shadow-amber-500/25 bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-500 flex items-center justify-center font-black text-slate-950 text-sm sm:text-lg relative transition-transform hover:scale-105",
                            isCurrentUser && "ring-offset-amber-200"
                          )}>
                            {initial}
                            <div className="absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-[9px] sm:text-[10px] border border-white shadow-xs leading-none">
                              🥇 1
                            </div>
                          </div>
                        </div>

                        {/* User Identity */}
                        <div className="text-center w-full px-0.5">
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-xs sm:text-sm font-black text-slate-900 truncate max-w-[85px] sm:max-w-[125px]">
                              {user.full_name || user.username}
                            </span>
                            {isCurrentUser && (
                              <span className="px-1 py-0.2 bg-amber-400 text-slate-950 text-[7.5px] font-black rounded-full leading-none shrink-0">YOU</span>
                            )}
                          </div>
                          <div className="flex items-center justify-center gap-1 mt-0.5 text-[8.5px] text-slate-400">
                            <span className="font-bold">Lv.{user.level || 1}</span>
                            <span>•</span>
                            <span className={user.active_status === 'online' ? "text-emerald-600 font-bold" : ""}>
                              {user.active_status === 'online' ? 'Online' : user.active_text || 'Offline'}
                            </span>
                          </div>
                        </div>

                        {/* Pedestal Block #1 */}
                        <div className="w-full mt-2 rounded-t-2xl flex flex-col justify-between items-center py-2 px-1 bg-gradient-to-b from-amber-300/90 via-amber-200/50 to-amber-100/20 border-t-4 border-x border-amber-400 shadow-md relative overflow-hidden h-28 sm:h-34">
                          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-300 via-yellow-100 to-amber-300" />
                          <span className="absolute bottom-1 text-5xl sm:text-6xl font-black text-amber-400/25 pointer-events-none select-none font-mono">1</span>
                          
                          <div className="relative z-10 text-center space-y-0.5 mt-1.5">
                            <span className="text-xs sm:text-sm font-black text-amber-950 tracking-tight block font-mono">
                              {activeCategory === 'time' ? formatStudyTime(user.value) : user.value.toLocaleString()}
                            </span>
                            <span className="inline-block px-2 py-0.2 rounded-full bg-amber-400/40 text-amber-950 text-[8px] sm:text-[8.5px] font-black uppercase tracking-wider leading-tight">
                              {activeCat.unit || 'Score'}
                            </span>
                          </div>

                          <div className="relative z-10 text-[8px] sm:text-[9px] font-black text-amber-800 uppercase tracking-widest pb-0.5">
                            CHAMPION
                          </div>
                        </div>
                      </div>
                    )
                  })()}

                  {/* PODIUM #3: Bronze (Right) */}
                  {topThree[2] && (() => {
                    const user = topThree[2]
                    const initial = (user.full_name || user.username || '?').charAt(0).toUpperCase()
                    const isCurrentUser = user.rank === currentLeaderboard.user_rank
                    return (
                      <div className="flex flex-col items-center text-center w-full">
                        <div className="relative mb-1.5">
                          <div className={cn(
                            "w-10 h-10 sm:w-12 sm:h-12 rounded-full ring-4 ring-amber-600/70 ring-offset-2 ring-offset-white shadow-md bg-gradient-to-tr from-amber-600 via-amber-500 to-orange-400 flex items-center justify-center font-black text-white text-xs sm:text-sm relative transition-transform hover:scale-105",
                            isCurrentUser && "ring-amber-400 shadow-amber-400/20"
                          )}>
                            {initial}
                            <div className="absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded-full bg-gradient-to-r from-amber-600 to-orange-500 text-white font-black text-[8px] sm:text-[9px] border border-white shadow-xs leading-none">
                              🥉 3
                            </div>
                          </div>
                        </div>

                        {/* User Identity */}
                        <div className="text-center w-full px-0.5">
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-[11px] sm:text-xs font-black text-slate-900 truncate max-w-[75px] sm:max-w-[110px]">
                              {user.full_name || user.username}
                            </span>
                            {isCurrentUser && (
                              <span className="px-1 py-0.2 bg-amber-400 text-slate-950 text-[7.5px] font-black rounded-full leading-none shrink-0">YOU</span>
                            )}
                          </div>
                          <div className="flex items-center justify-center gap-1 mt-0.5 text-[8.5px] text-slate-400">
                            <span className="font-bold">Lv.{user.level || 1}</span>
                            <span>•</span>
                            <span className={user.active_status === 'online' ? "text-emerald-600 font-bold" : ""}>
                              {user.active_status === 'online' ? 'Online' : user.active_text || 'Offline'}
                            </span>
                          </div>
                        </div>

                        {/* Pedestal Block #3 */}
                        <div className="w-full mt-2 rounded-t-2xl flex flex-col justify-between items-center py-2 px-1 bg-gradient-to-b from-orange-200/80 via-amber-100/40 to-orange-50/20 border-t-4 border-x border-orange-300 shadow-sm relative overflow-hidden h-16 sm:h-20">
                          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-300 via-amber-200 to-orange-300" />
                          <span className="absolute bottom-1 text-3xl sm:text-4xl font-black text-orange-400/25 pointer-events-none select-none font-mono">3</span>
                          
                          <div className="relative z-10 text-center space-y-0.5 mt-0.5">
                            <span className="text-[10px] sm:text-[11px] font-black text-orange-950 tracking-tight block font-mono">
                              {activeCategory === 'time' ? formatStudyTime(user.value) : user.value.toLocaleString()}
                            </span>
                            <span className="inline-block px-1.5 py-0.2 rounded-full bg-orange-300/50 text-orange-900 text-[7px] sm:text-[7.5px] font-black uppercase tracking-wider leading-tight">
                              {activeCat.unit || 'Score'}
                            </span>
                          </div>

                          <div className="relative z-10 text-[7px] sm:text-[7.5px] font-black text-orange-700 uppercase tracking-widest pb-0.5">
                            3RD PLACE
                          </div>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </div>
            )}

            {/* ── LIST RANKS #4 TO #50 ── */}
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1 w-full space-y-2 pt-1">
              {remainingUsers.length === 0 && topThree.length === 0 ? (
                <div className="py-12 text-center text-slate-400 font-bold text-xs bg-slate-50 rounded-2xl border border-slate-100">
                  Chưa có dữ liệu bảng xếp hạng cho khoảng thời gian này.
                </div>
              ) : remainingUsers.length === 0 ? (
                <div className="py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Tất cả các thành viên hàng đầu đã hiển thị ở bục vinh danh
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
                  {remainingUsers.map((user) => {
                    const initial = (user.full_name || user.username || '?').charAt(0).toUpperCase()
                    const isCurrentUser = user.rank === currentLeaderboard.user_rank
                    const isTopTen = user.rank <= 10
                    const pctOfMax = Math.min(100, Math.max(4, Math.round((user.value / topOneScore) * 100)))

                    return (
                      <div
                        key={user.user_id}
                        className={cn(
                          "w-full flex items-center justify-between gap-3 p-2.5 sm:p-3 rounded-2xl border transition-all text-left group",
                          isCurrentUser
                            ? "bg-gradient-to-r from-amber-50/90 via-amber-50/40 to-white border-amber-300 shadow-sm ring-1 ring-amber-400/40"
                            : "bg-white hover:bg-slate-50/80 border-slate-200/80 hover:border-slate-300 shadow-2xs"
                        )}
                      >
                        {/* Left Group: Rank Badge + Avatar + Identity */}
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Rank Badge */}
                          <div className={cn(
                            "w-7 h-7 rounded-xl flex items-center justify-center font-mono font-black text-xs shrink-0 transition-transform group-hover:scale-105",
                            isTopTen
                              ? "bg-slate-900 text-amber-400 shadow-xs border border-slate-800"
                              : "bg-slate-100 text-slate-500"
                          )}>
                            #{user.rank}
                          </div>

                          {/* Avatar with colorful gradient */}
                          <div className="relative shrink-0">
                            <div className={cn(
                              "w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-xs sm:text-sm font-black shadow-xs bg-gradient-to-tr transition-transform group-hover:scale-105",
                              isCurrentUser
                                ? "bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-950 font-black ring-2 ring-amber-400/60"
                                : getAvatarGradient(user.username || user.full_name)
                            )}>
                              {initial}
                            </div>
                            {/* Status indicator dot */}
                            <span
                              className={cn(
                                "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white shadow-xs",
                                user.active_status === 'online'
                                  ? "bg-emerald-500 ring-1 ring-emerald-400"
                                  : user.active_status === 'away'
                                  ? "bg-amber-400"
                                  : "bg-slate-300"
                              )}
                            />
                          </div>

                          {/* Identity Details */}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-xs sm:text-sm font-black text-slate-900 truncate">
                                {user.full_name || user.username}
                              </h4>
                              {isCurrentUser && (
                                <span className="px-1.5 py-0.2 bg-amber-400 text-slate-950 text-[8px] font-black rounded-md uppercase tracking-wider shrink-0">
                                  YOU
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-600 text-[8.5px] font-bold">
                                Lv.{user.level || 1}
                              </span>
                              <span className="text-slate-300 text-[7px]">•</span>
                              <span className={cn(
                                "text-[9px] font-semibold leading-none",
                                user.active_status === 'online'
                                  ? "text-emerald-600 font-bold"
                                  : user.active_status === 'away'
                                  ? "text-amber-600 font-bold"
                                  : "text-slate-400"
                              )}>
                                {user.active_status === 'online' ? 'Active' : user.active_text || 'Offline'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Right Group: Score + Mini Relative Progress */}
                        <div className="text-right shrink-0">
                          <div className={cn(
                            "text-xs sm:text-sm font-black tracking-tight font-mono",
                            isCurrentUser ? "text-amber-600" : activeCat.textColor
                          )}>
                            {activeCategory === 'time'
                              ? formatStudyTime(user.value)
                              : `${user.value.toLocaleString()} ${activeCat.unit}`}
                          </div>

                          {/* Relative progress bar vs Rank #1 */}
                          <div className="w-16 sm:w-20 h-1 bg-slate-100 rounded-full overflow-hidden mt-1 ml-auto">
                            <div 
                              className={cn(
                                "h-full rounded-full transition-all duration-500",
                                isCurrentUser ? "bg-amber-400" : activeCat.dotColor
                              )}
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
