import { useAppStore } from '@/store/useAppStore'
import { Settings, Shield, LogOut, ChevronRight, Zap, Flame, Award, CheckCircle2, Activity, Target, Trophy, X, Lock, BrainCircuit, User, PieChart, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface BadgeData {
  id: string
  name: string
  description: string
  icon: string
  criteria_type: string
  criteria_value: number
  is_unlocked: boolean
  progress: number
}

interface BadgesResponse {
  badges: BadgeData[]
  total_unlocked: number
  total_count: number
}

const ICON_MAP: Record<string, any> = {
  Zap,
  Flame,
  Award,
  CheckCircle2,
  Activity,
  Target,
  Trophy
}

const BADGE_THEMES: Record<string, { bg: string, text: string, glow: string, border: string, color: string }> = {
  first_steps: { bg: 'bg-amber-500/10', text: 'text-amber-500', glow: 'shadow-amber-500/20', border: 'border-amber-500/20', color: '#f59e0b' },
  streak_starter: { bg: 'bg-rose-500/10', text: 'text-rose-500', glow: 'shadow-rose-500/20', border: 'border-rose-500/20', color: '#f43f5e' },
  streak_legend: { bg: 'bg-purple-500/10', text: 'text-purple-500', glow: 'shadow-purple-500/20', border: 'border-purple-500/20', color: '#a855f7' },
  perfect_score: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', glow: 'shadow-emerald-500/20', border: 'border-emerald-500/20', color: '#10b981' },
  speed_demon: { bg: 'bg-cyan-500/10', text: 'text-cyan-500', glow: 'shadow-cyan-500/20', border: 'border-cyan-500/20', color: '#06b6d4' },
  goal_crusher: { bg: 'bg-indigo-500/10', text: 'text-indigo-500', glow: 'shadow-indigo-500/20', border: 'border-indigo-500/20', color: '#6366f1' },
  card_master: { bg: 'bg-yellow-500/10', text: 'text-yellow-500', glow: 'shadow-yellow-500/20', border: 'border-yellow-500/20', color: '#eab308' },
}

export default function Profile() {
  const { user, gamify } = useAppStore()
  const [selectedBadge, setSelectedBadge] = useState<BadgeData | null>(null)

  const progress = (gamify.xp % 1000) / 10

  const { data: badgesData, isLoading } = useQuery<BadgesResponse>({
    queryKey: ['user-badges'],
    queryFn: async () => {
      const res = await axios.get('/api/v1/deck/gamification/badges')
      return res.data
    }
  })

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-28">
      {/* Mobile Top Header */}
      <div className="sticky top-0 left-0 right-0 z-30 md:hidden px-4 py-3 bg-white/95 backdrop-blur-md border-b border-slate-100 flex items-center justify-between">
        <h1 className="text-base font-black text-slate-900 tracking-tight">Hồ sơ cá nhân</h1>
        <div className="flex items-center gap-1.5">
          <Link 
            to="/decks"
            className="px-2.5 py-1.5 rounded-xl bg-orange-50 text-orange-600 flex items-center gap-1 text-[11px] font-black border border-orange-200/60 active:scale-95 transition-all"
          >
            <BrainCircuit className="w-3.5 h-3.5" />
            <span>Studio</span>
          </Link>
          <Link 
            to="/settings"
            className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 active:scale-95 transition-all"
            title="Cài đặt"
          >
            <Settings className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <div className="px-3.5 sm:px-6 max-w-lg mx-auto pt-3.5 md:pt-8 space-y-3.5">
        {/* Desktop Header */}
        <div className="hidden md:flex items-center justify-between mb-2">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Hồ sơ cá nhân</h1>
          <Link 
            to="/decks"
            className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white flex items-center gap-2 shadow-sm text-xs font-black uppercase tracking-wider active:scale-95 transition-all"
          >
            <BrainCircuit className="w-4 h-4" />
            <span>Creator Studio</span>
          </Link>
        </div>

        {/* Compact User Info Card (One-Hand Ergonomic Layout) */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-xs border border-slate-100 relative overflow-hidden">
          <div className="flex items-center gap-3.5">
            {/* Avatar with Level Badge */}
            <div className="relative shrink-0">
              <div className="w-15 h-15 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-600 flex items-center justify-center text-white text-2xl font-black shadow-md border-2 border-white">
                {user?.username?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-slate-900 text-amber-400 text-[9px] font-black px-1.5 py-0.5 rounded-md border border-white shadow-xs">
                Lv.{gamify.level}
              </div>
            </div>

            {/* User Details & Level Progress */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <h2 className="text-base sm:text-lg font-black text-slate-900 truncate">
                  {user?.username || 'Học viên'}
                </h2>
                <span className="px-2 py-0.5 bg-orange-50 text-orange-600 border border-orange-200 text-[10px] font-extrabold rounded-full shrink-0">
                  {user?.role === 'admin' ? 'Quản trị viên' : 'Thành viên'}
                </span>
              </div>
              
              <p className="text-xs font-medium text-slate-400 truncate mb-1.5">
                {user?.email || 'MindStack Learner'}
              </p>

              {/* Compact Level Progress Bar */}
              <div className="w-full bg-slate-50 rounded-xl p-2 border border-slate-100">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 mb-1">
                  <span>Tiến độ Cấp {gamify.level}</span>
                  <span className="text-orange-600 font-extrabold">{gamify.xp % 1000} / 1000 XP</span>
                </div>
                <div className="h-1.5 bg-slate-200/70 rounded-full overflow-hidden w-full">
                  <div 
                    className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-700" 
                    style={{ width: `${progress}%` }} 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 3 Quick Stats Chips (One-Hand Reachable) */}
          <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100">
            <div className="bg-orange-50/50 rounded-xl p-2 text-center border border-orange-100/60">
              <div className="flex items-center justify-center gap-1 text-orange-600 font-black text-sm sm:text-base">
                <Flame className="w-3.5 h-3.5 fill-orange-500 text-orange-500 shrink-0" />
                <span>{gamify.streak}</span>
              </div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mt-0.5">Ngày Streak</span>
            </div>

            <div className="bg-amber-50/50 rounded-xl p-2 text-center border border-amber-100/60">
              <div className="flex items-center justify-center gap-1 text-amber-600 font-black text-sm sm:text-base">
                <Zap className="w-3.5 h-3.5 fill-amber-500 text-amber-500 shrink-0" />
                <span>{gamify.xp}</span>
              </div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mt-0.5">Tổng XP</span>
            </div>

            <div className="bg-emerald-50/50 rounded-xl p-2 text-center border border-emerald-100/60">
              <div className="flex items-center justify-center gap-1 text-emerald-600 font-black text-sm sm:text-base">
                <Award className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>{badgesData?.total_unlocked || 0}/{badgesData?.total_count || 7}</span>
              </div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mt-0.5">Huy hiệu</span>
            </div>
          </div>
        </div>

        {/* Achievements / Badges Showcase (Compact Grid) */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-xs border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-500 fill-amber-400" />
              <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider">
                Huy hiệu vinh danh
              </h3>
            </div>
            <div className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-amber-200/80">
              {badgesData?.total_unlocked || 0} / {badgesData?.total_count || 7} Đã mở
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 py-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-slate-50 border border-slate-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
              {badgesData?.badges.map((badge) => {
                const Icon = ICON_MAP[badge.icon] || Trophy
                const theme = BADGE_THEMES[badge.id] || BADGE_THEMES.first_steps
                
                return (
                  <motion.div
                    key={badge.id}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      if (navigator.vibrate) navigator.vibrate(8);
                      setSelectedBadge(badge);
                    }}
                    className={cn(
                      "p-2.5 rounded-2xl border text-center cursor-pointer transition-all relative overflow-hidden flex flex-col items-center justify-between min-h-[110px]",
                      badge.is_unlocked 
                        ? cn("bg-white border-slate-100 shadow-2xs", theme.glow) 
                        : "bg-slate-50/50 border-slate-100 opacity-70"
                    )}
                  >
                    <div className="absolute top-1.5 right-1.5">
                      {!badge.is_unlocked && <Lock className="w-3 h-3 text-slate-300" />}
                    </div>

                    <div className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center mb-1.5 transition-all shrink-0",
                      badge.is_unlocked 
                        ? cn(theme.bg, theme.text, "shadow-xs") 
                        : "bg-slate-100 text-slate-300"
                    )}>
                      <Icon className="w-5 h-5" />
                    </div>

                    <div className="w-full">
                      <h4 className={cn(
                        "text-[9px] sm:text-[10px] font-black uppercase tracking-wider leading-tight mb-1 truncate px-0.5",
                        badge.is_unlocked ? "text-slate-800" : "text-slate-400"
                      )}>
                        {badge.name}
                      </h4>
                      
                      {/* Sub progress line */}
                      <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            badge.is_unlocked ? "bg-orange-500" : "bg-slate-300"
                          )} 
                          style={{ width: `${Math.min(100, badge.progress)}%` }} 
                        />
                      </div>
                      <p className="text-[8px] font-bold text-slate-400 mt-0.5">
                        {Math.round(badge.progress)}%
                      </p>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>

        {/* Account & Navigation Settings (Grouped One-Hand Card) */}
        <div className="space-y-1.5">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
            Cài đặt & Tiện ích
          </h3>
          
          <div className="bg-white rounded-3xl border border-slate-100 divide-y divide-slate-50 overflow-hidden shadow-xs">
            <MenuRowItem 
              icon={Settings} 
              label="Cài đặt học tập & Giao diện" 
              desc="Âm thanh, chế độ học, FSRS"
              href="/settings" 
            />
            <MenuRowItem 
              icon={PieChart} 
              label="Bảng xếp hạng & Thống kê" 
              desc="Xem thứ hạng và tiến độ tổng"
              href="/stats" 
            />
            <MenuRowItem 
              icon={Layers} 
              label="Kho bộ thẻ & Tạo thẻ mới" 
              desc="Quản lý các bộ từ vựng"
              href="/decks" 
            />
            <MenuRowItem 
              icon={Shield} 
              label="Bảo mật & Tài khoản" 
              desc="Đổi mật khẩu, phiên đăng nhập"
              href="/settings" 
            />
            <MenuRowItem 
              icon={LogOut} 
              label="Đăng xuất tài khoản" 
              desc="Thoát khỏi phiên hiện tại"
              variant="danger" 
              href="/logout" 
            />
          </div>
        </div>
      </div>

      {/* Frosted Glass Detail Modal */}
      <AnimatePresence>
        {selectedBadge && (() => {
          const Icon = ICON_MAP[selectedBadge.icon] || Trophy
          const theme = BADGE_THEMES[selectedBadge.id] || BADGE_THEMES.first_steps
          
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={() => setSelectedBadge(null)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-100 shadow-2xl relative overflow-hidden text-center"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Backdrop Glow */}
                <div 
                  className={cn("absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full blur-[60px] opacity-40 -z-10 transition-all", 
                    selectedBadge.is_unlocked ? theme.bg : "bg-slate-300"
                  )} 
                />

                <button
                  onClick={() => setSelectedBadge(null)}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="mt-2 flex flex-col items-center">
                  <div className={cn(
                    "w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-md transition-all relative",
                    selectedBadge.is_unlocked 
                      ? cn(theme.bg, theme.text, theme.glow, "scale-105") 
                      : "bg-slate-100 text-slate-300"
                  )}>
                    <Icon className="w-8 h-8" />
                    {!selectedBadge.is_unlocked && (
                      <div className="absolute bottom-0 right-0 bg-slate-400 text-white rounded-full p-1 border-2 border-white shadow-xs">
                        <Lock className="w-2.5 h-2.5" />
                      </div>
                    )}
                  </div>

                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-1">
                    {selectedBadge.name}
                  </h3>
                  
                  <div className={cn(
                    "text-[9px] font-black px-2.5 py-0.5 rounded-full border mb-4 uppercase tracking-wider",
                    selectedBadge.is_unlocked 
                      ? "bg-emerald-50 text-emerald-600 border-emerald-200" 
                      : "bg-slate-50 text-slate-400 border-slate-200"
                  )}>
                    {selectedBadge.is_unlocked ? '🏆 ĐÃ MỞ KHÓA' : '🔒 CHƯA MỞ KHÓA'}
                  </div>

                  <p className="text-xs font-medium text-slate-500 leading-relaxed px-2 mb-4">
                    {selectedBadge.description}
                  </p>

                  {/* Progress Block */}
                  <div className="w-full bg-slate-50 rounded-2xl p-4 border border-slate-100 text-left">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                        TIẾN ĐỘ THỬ THÁCH
                      </span>
                      <span className="text-[10px] font-black text-slate-700">
                        {Math.round(selectedBadge.progress)}%
                      </span>
                    </div>

                    <div className="w-full h-2 bg-white border border-slate-100 rounded-full overflow-hidden mb-2">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all duration-700",
                          selectedBadge.is_unlocked ? "bg-orange-500" : "bg-slate-300"
                        )} 
                        style={{ width: `${Math.min(100, selectedBadge.progress)}%` }} 
                      />
                    </div>
                    
                    <p className="text-[10px] font-medium text-slate-400">
                      {selectedBadge.is_unlocked 
                        ? 'Xuất sắc! Bạn đã hoàn thành thử thách này. 🎉'
                        : `Tiến độ hiện tại: ${Math.round(selectedBadge.progress)}% hướng tới hoàn thành.`}
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )
        })()}
      </AnimatePresence>
    </div>
  )
}

function MenuRowItem({ icon: Icon, label, desc, variant = 'default', href = '#' }: any) {
  const isDanger = variant === 'danger'
  const isLogout = href === '/logout'
  
  const content = (
    <div className={cn(
      "p-3.5 sm:p-4 flex items-center justify-between group transition-colors cursor-pointer active:bg-slate-50",
      isDanger ? "hover:bg-rose-50/40 text-rose-600" : "hover:bg-slate-50/80 text-slate-700"
    )}>
      <div className="flex items-center gap-3 min-w-0">
        <div className={cn(
          "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors",
          isDanger 
            ? "bg-rose-50 text-rose-500" 
            : "bg-slate-50 text-slate-500 group-hover:bg-orange-50 group-hover:text-orange-600"
        )}>
          <Icon className="w-4.5 h-4.5" />
        </div>
        <div className="min-w-0">
          <span className={cn(
            "text-xs sm:text-sm font-bold block truncate",
            isDanger ? "text-rose-600" : "text-slate-800"
          )}>
            {label}
          </span>
          {desc && (
            <span className="text-[10px] font-medium text-slate-400 block truncate mt-0.5">
              {desc}
            </span>
          )}
        </div>
      </div>
      <ChevronRight className={cn(
        "w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5",
        isDanger ? "text-rose-300" : "text-slate-300"
      )} />
    </div>
  )

  if (isLogout) {
    return <a href={href}>{content}</a>
  }

  return <Link to={href}>{content}</Link>
}
