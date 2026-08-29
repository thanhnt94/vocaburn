import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy } from 'lucide-react'
import confetti from 'canvas-confetti'

export interface GoalCelebrationModalProps {
  isOpen: boolean
  onClose: () => void
  goalToast: any
}

export const GoalCelebrationModal: React.FC<GoalCelebrationModalProps> = ({
  isOpen,
  onClose,
  goalToast
}) => {
  return (
    <AnimatePresence>
      {isOpen && goalToast && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md pointer-events-auto"
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 50 }}
            transition={{ type: 'spring', bounce: 0.35, duration: 0.6 }}
            className="relative w-full max-w-md bg-white rounded-[2rem] p-8 shadow-[0_25px_60px_rgba(99,102,241,0.3)] border border-slate-100/80 overflow-hidden text-center z-10 pointer-events-auto"
          >
            {/* Top premium border indicator */}
            <div className="absolute top-0 left-0 w-full h-2.5 bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500"></div>
            
            {/* Spinning/glowing light background aura */}
            <div className="absolute top-12 left-1/2 -translate-x-1/2 w-56 h-56 bg-gradient-to-tr from-amber-200/20 to-orange-200/20 rounded-full blur-3xl animate-pulse pointer-events-none" />
            
            {/* Giant Bouncing Trophy Icon */}
            <div className="relative w-28 h-28 mx-auto mb-6 flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-tr from-amber-400 to-orange-500 rounded-[2.5rem] rotate-12 scale-95 opacity-20 animate-pulse" />
              <div className="relative w-24 h-24 bg-gradient-to-tr from-amber-400 via-orange-500 to-red-500 rounded-[2rem] flex items-center justify-center shadow-lg shadow-orange-300 transform hover:scale-105 transition-all">
                <Trophy className="w-12 h-12 text-white fill-white animate-bounce" />
              </div>
            </div>
            
            <span className="text-[10px] font-black text-amber-600 bg-amber-50 border border-amber-100 px-4 py-1.5 rounded-full uppercase tracking-[0.2em] mb-4 inline-block shadow-sm">
              Daily Goal Achieved! 🏆
            </span>
            
            <h3 className="text-3xl font-black text-slate-800 tracking-tight leading-tight mb-3">
              SUPER STUDY DISCIPLINE!
            </h3>
            
            <p className="text-slate-500 font-bold text-xs leading-relaxed mb-8 px-4">
              {goalToast.message}
            </p>
            
            {/* Rewards Summary Grid */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-gradient-to-br from-indigo-50/50 via-purple-50/30 to-white border border-indigo-100/50 rounded-3xl p-5 flex flex-col items-center justify-center shadow-sm">
                <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1.5">BONUS REWARD</span>
                <span className="text-xl font-black text-indigo-600">⚡ +{goalToast.bonusXP || 50} XP</span>
              </div>
              <div className="bg-gradient-to-br from-orange-50/50 via-amber-50/30 to-white border border-orange-100/50 rounded-3xl p-5 flex flex-col items-center justify-center shadow-sm">
                <span className="text-[9px] font-black text-orange-400 uppercase tracking-widest mb-1.5">DAILY STREAK</span>
                <span className="text-xl font-black text-orange-600">🔥 {goalToast.streakCount}d</span>
              </div>
            </div>
            
            {/* High Motivation Action Button */}
            <button 
              onClick={() => {
                onClose()
                confetti({ zIndex: 9999, particleCount: 80, spread: 60, origin: { y: 0.6 } })
              }}
              className="w-full py-4 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-orange-200 hover:shadow-orange-300 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              AWESOME, KEEP GOING! 🚀
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
