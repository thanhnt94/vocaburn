import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Play, Flame, Trophy, CheckCircle2, Clock, Target, Brain, Award } from 'lucide-react'

interface Badge {
  id: string
  name: string
  description: string
  xp_reward: number
}

interface BadgeUnlockOverlayProps {
  badge: Badge | null
  onClose: () => void
}

const getBadgeIcon = (badgeId: string) => {
  switch (badgeId) {
    case 'first_steps':
      return Play
    case 'streak_starter':
      return Flame
    case 'streak_legend':
      return Trophy
    case 'perfect_score':
      return CheckCircle2
    case 'speed_demon':
      return Clock
    case 'goal_crusher':
      return Target
    case 'card_master':
      return Brain
    default:
      return Award
  }
}

export const BadgeUnlockOverlay: React.FC<BadgeUnlockOverlayProps> = ({ badge, onClose }) => {
  return (
    <AnimatePresence>
      {badge && (() => {
        const BadgeIcon = getBadgeIcon(badge.id)
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
          >
            {/* Radial glow background effect */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.15),transparent_60%)] animate-pulse pointer-events-none" />

            <motion.div
              initial={{ scale: 0.9, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 50 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative max-w-md w-full bg-slate-900/95 border border-violet-500/30 rounded-[3rem] p-8 text-center shadow-[0_0_80px_rgba(139,92,246,0.35)] overflow-hidden"
            >
              {/* Background neon splashes */}
              <div className="absolute -top-12 -left-12 w-48 h-48 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-pink-600/10 rounded-full blur-3xl pointer-events-none" />

              {/* Sparkling particles background */}
              <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,rgba(0,0,0,0.4))] pointer-events-none" />

              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Animated Badge Hexagon Glow container */}
              <div className="relative mx-auto w-32 h-32 flex items-center justify-center mb-6 mt-4">
                {/* Hexagon Neon Ring */}
                <div className="absolute inset-0 bg-gradient-to-tr from-violet-500 via-fuchsia-500 to-pink-500 rounded-[2.5rem] rotate-45 opacity-20 blur-md animate-pulse" />
                <div className="absolute inset-2 bg-gradient-to-tr from-violet-600 via-fuchsia-600 to-pink-600 rounded-[2rem] rotate-12 animate-spin-slow" />
                
                {/* Frosted Icon Shield */}
                <div className="relative w-20 h-20 rounded-2xl bg-slate-950/60 border border-white/15 flex items-center justify-center shadow-2xl backdrop-blur-md">
                  <BadgeIcon className="w-10 h-10 text-transparent bg-clip-text bg-gradient-to-tr from-violet-400 via-fuchsia-400 to-pink-400" />
                </div>
              </div>

              <span className="text-[10px] font-black tracking-[0.3em] text-violet-400 uppercase bg-violet-500/10 px-4 py-1.5 rounded-full border border-violet-500/20 mb-2 inline-block">
                ACHIEVEMENT UNLOCKED
              </span>

              <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-3 uppercase bg-gradient-to-tr from-white via-slate-100 to-slate-300 bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(255,255,255,0.15)]">
                {badge.name}
              </h2>

              <p className="text-slate-400 text-sm font-bold leading-relaxed mb-6 px-4">
                {badge.description}
              </p>

              {/* Reward stats display */}
              <div className="flex items-center justify-center gap-4 mb-8 bg-slate-950/40 border border-white/5 rounded-2xl p-4">
                <div className="text-center flex-1 border-r border-white/5">
                  <span className="text-[10px] font-black tracking-widest text-slate-500 block uppercase mb-1">XP REWARD</span>
                  <span className="text-lg font-black text-amber-400">+{badge.xp_reward} XP ✨</span>
                </div>
                <div className="text-center flex-1">
                  <span className="text-[10px] font-black tracking-widest text-slate-500 block uppercase mb-1">BONUS REWARD</span>
                  <span className="text-lg font-black text-violet-400">🏅 BADGE</span>
                </div>
              </div>

              {/* Manual Dismiss CTA */}
              <button
                onClick={onClose}
                className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 text-white shadow-lg shadow-violet-600/35 hover:shadow-violet-600/50 hover:brightness-110 active:scale-[0.98] transition-all duration-200"
              >
                AWESOME, CLAIM IT! 🏆
              </button>
            </motion.div>
          </motion.div>
        )
      })()}
    </AnimatePresence>
  )
}
