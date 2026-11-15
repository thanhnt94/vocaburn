import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, X } from 'lucide-react'
import type { Question } from '@/types/flashcard'

export interface FloatingToastsProps {
  badgeVisible?: boolean
  selectedOption?: number | null
  currentQuestion?: Question | null
  badgeMessage?: string
  xpFloat?: { visible: boolean; amount: number }
  activeGoal?: any
  goalToast?: any
  setGoalToast?: React.Dispatch<React.SetStateAction<any>>
  learningModeAlert?: { visible: boolean; message: string; type?: 'info' | 'warning' } | null
  setLearningModeAlert?: React.Dispatch<React.SetStateAction<{ visible: boolean; message: string; type?: 'info' | 'warning' } | null>>
}

export const FloatingToasts: React.FC<FloatingToastsProps> = ({
  learningModeAlert,
  setLearningModeAlert
}) => {
  return (
    <>
      {/* Learning Mode Alert Toast (Top Right) */}
      <AnimatePresence>
        {learningModeAlert && learningModeAlert.visible && (
          <motion.div
            initial={{ opacity: 0, x: 200, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 200, scale: 0.9 }}
            className="fixed top-24 right-6 z-[1002] max-w-sm w-82 bg-white/95 backdrop-blur-xl border border-slate-100 shadow-[0_20px_50px_rgba(99,102,241,0.15)] rounded-[2rem] p-5 flex items-start gap-4 text-slate-900 transition-all duration-300"
          >
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[8px] font-black tracking-widest uppercase px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600">
                  SMART LEARNING
                </span>
              </div>
              <p className="font-bold text-xs leading-relaxed pr-2 text-slate-600">
                {learningModeAlert.message}
              </p>
            </div>

            <button
              onClick={() => setLearningModeAlert?.(null)}
              className="absolute top-4 right-4 w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
