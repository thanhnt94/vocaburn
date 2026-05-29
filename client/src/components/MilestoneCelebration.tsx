import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Award, Flame, Target, CheckCircle2 } from 'lucide-react'
import confetti from 'canvas-confetti'

interface MilestoneCelebrationProps {
  type: 'streak_10' | 'halfway' | 'mastery' | 'goal_met'
  title: string
  message: string
  onClose: () => void
}

export const MilestoneCelebration: React.FC<MilestoneCelebrationProps> = ({
  type,
  title,
  message,
  onClose
}) => {
  useEffect(() => {
    // Trigger confetti based on celebration type
    if (type === 'streak_10' || type === 'goal_met') {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.8 }
      })
    } else if (type === 'halfway') {
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      })
    } else if (type === 'mastery') {
      const end = Date.now() + 2 * 1000

      const frame = () => {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0 }
        })
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1 }
        })

        if (Date.now() < end) {
          requestAnimationFrame(frame)
        }
      }
      frame()
    }
  }, [type])

  const getIcon = () => {
    switch (type) {
      case 'streak_10':
        return <Flame className="w-16 h-16 text-orange-500 animate-bounce" />
      case 'halfway':
        return <Target className="w-16 h-16 text-indigo-500 animate-pulse" />
      case 'mastery':
        return <Trophy className="w-16 h-16 text-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.4)] animate-bounce" />
      case 'goal_met':
        return <CheckCircle2 className="w-16 h-16 text-emerald-500 animate-bounce" />
    }
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 30 }}
        className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl relative z-10 p-8 border border-slate-100 text-center flex flex-col items-center gap-6"
      >
        <div className="p-5 rounded-[2rem] bg-slate-50 border border-slate-100">
          {getIcon()}
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase">
            {title}
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed font-semibold">
            {message}
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-slate-200"
        >
          Let's Go! 🚀
        </button>
      </motion.div>
    </div>
  )
}
