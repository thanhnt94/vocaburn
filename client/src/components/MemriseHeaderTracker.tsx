import React, { useEffect, useState } from 'react'
import { X, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

export interface MemriseHeaderTrackerProps {
  currentStage: number
  bloomedCount: number
  totalCards: number
  onExit: () => void
}

const PLANT_STAGES = [
  { stage: 1, emoji: '🫘', label: 'Seed' },
  { stage: 2, emoji: '🌱', label: 'Sprout' },
  { stage: 3, emoji: '🌿', label: 'Leaves' },
  { stage: 4, emoji: '🪴', label: 'Bud' },
  { stage: 5, emoji: '🌺', label: 'Flower' },
  { stage: 6, emoji: '🏆', label: 'Bloomed' }
]

export const MemriseHeaderTracker: React.FC<MemriseHeaderTrackerProps> = ({
  currentStage,
  bloomedCount,
  totalCards,
  onExit
}) => {
  const [prevStage, setPrevStage] = useState(currentStage)
  const [isEvolving, setIsEvolving] = useState(false)

  const currentPlant = PLANT_STAGES.find(p => p.stage === currentStage) || PLANT_STAGES[0]
  const progressPercent = totalCards > 0 ? (bloomedCount / totalCards) * 100 : 0

  useEffect(() => {
    if (currentStage > prevStage) {
      setIsEvolving(true)
      const t = setTimeout(() => setIsEvolving(false), 1000)
      return () => clearTimeout(t)
    }
    setPrevStage(currentStage)
  }, [currentStage, prevStage])

  return (
    <header className="w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm z-50 flex-shrink-0">
      <div className="max-w-2xl mx-auto w-full px-3 h-14 flex items-center gap-3">
        {/* Exit Button */}
        <button
          onClick={onExit}
          className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-500 hover:text-rose-600 flex items-center justify-center transition-all shrink-0 cursor-pointer"
          title="Exit Session"
        >
          <X className="w-4.5 h-4.5" />
        </button>

        {/* Progress Bar & Plant */}
        <div className="flex-1 flex flex-col justify-center gap-1.5 h-full pt-1">
          <div className="flex items-center justify-between text-xs font-bold px-1 relative">
            <span className="text-slate-400 dark:text-slate-500 tracking-wider">MEMRISE SESSION</span>
            
            {/* The Plant Badge */}
            <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/60 shadow-xs relative">
              
              <AnimatePresence>
                {isEvolving && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5, y: 10 }}
                    animate={{ opacity: 1, scale: 1.2, y: -20 }}
                    exit={{ opacity: 0, scale: 1.5, y: -30 }}
                    className="absolute -top-1 left-1/2 -translate-x-1/2 pointer-events-none z-10 text-xl"
                  >
                    ✨
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.span 
                key={currentPlant.emoji}
                initial={{ scale: 0.5, rotate: -180, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                className="text-base leading-none -mt-0.5 inline-block drop-shadow-sm"
              >
                {currentPlant.emoji}
              </motion.span>
              <span className="tracking-wide font-black">{bloomedCount} / {totalCards}</span>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden relative border border-slate-200/50 dark:border-slate-700/50">
            <motion.div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full shadow-[inset_0_1px_rgba(255,255,255,0.4)]"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            />
          </div>
        </div>
      </div>
    </header>
  )
}
