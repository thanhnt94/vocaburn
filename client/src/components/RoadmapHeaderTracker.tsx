import React, { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Map, Check, Sparkles, Brain, Target, Keyboard, Clock, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { PipelineStepStatus } from '@/hooks/useRoadmapStatus'

interface RoadmapHeaderTrackerProps {
  pipeline: PipelineStepStatus[]
  currentStepIndex: number
  allDone: boolean
  deckId: string | number
  className?: string
  subProgressCurr?: number
  subProgressTotal?: number
}

const STEP_ICONS: Record<string, { icon: any; emoji: string; color: string; bg: string }> = {
  new_cards: { icon: Sparkles, emoji: '🎴', color: 'text-orange-500', bg: 'bg-orange-500' },
  fsrs_review: { icon: Brain, emoji: '🔄', color: 'text-indigo-500', bg: 'bg-indigo-500' },
  mcq: { icon: Target, emoji: '🎯', color: 'text-purple-500', bg: 'bg-purple-500' },
  typing: { icon: Keyboard, emoji: '⌨️', color: 'text-emerald-500', bg: 'bg-emerald-500' },
  study_time: { icon: Clock, emoji: '⏱️', color: 'text-blue-500', bg: 'bg-blue-500' }
}

export const RoadmapHeaderTracker: React.FC<RoadmapHeaderTrackerProps> = ({
  pipeline,
  currentStepIndex,
  allDone,
  deckId,
  className,
  subProgressCurr,
  subProgressTotal
}) => {
  if (!pipeline || pipeline.length === 0) return null

  const currentStep = pipeline[currentStepIndex] || null
  const stepMeta = currentStep ? (STEP_ICONS[currentStep.type] || STEP_ICONS.new_cards) : STEP_ICONS.new_cards

  // Calculate percentage of current sub-progress
  const hasSubProg = typeof subProgressCurr === 'number' && typeof subProgressTotal === 'number' && subProgressTotal > 0
  const subPercent = hasSubProg ? Math.min(100, Math.round((subProgressCurr / subProgressTotal) * 100)) : 0

  // Track progress increments for floating particle effect
  const [showSparkle, setShowSparkle] = useState(false)
  const prevCurrRef = useRef(subProgressCurr)

  useEffect(() => {
    if (
      typeof subProgressCurr === 'number' &&
      typeof prevCurrRef.current === 'number' &&
      subProgressCurr > prevCurrRef.current
    ) {
      setShowSparkle(true)
      const t = setTimeout(() => setShowSparkle(false), 900)
      return () => clearTimeout(t)
    }
    prevCurrRef.current = subProgressCurr
  }, [subProgressCurr])

  return (
    <div className={cn("flex flex-col gap-1 py-0.5", className)}>
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Main Roadmap Badge Link */}
        <Link
          to={`/flashcard/${deckId}/roadmap`}
          className="group relative flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white text-[10px] font-black uppercase tracking-wider transition-all shrink-0 shadow-xs hover:shadow-md hover:scale-[1.02] active:scale-95 overflow-hidden"
          title="Bấm để xem & cấu hình Lộ trình Roadmap"
        >
          {/* Light shine effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          
          <Map className="w-3.5 h-3.5 text-white animate-pulse" />
          <span className="hidden sm:inline">ROADMAP</span>
          
          <span className="bg-black/20 px-1.5 py-0.5 rounded-md text-[9.5px] font-black tracking-normal flex items-center gap-1">
            {allDone ? (
              <span className="text-emerald-200 flex items-center gap-0.5">
                <Check className="w-3 h-3 stroke-[3]" /> XONG
              </span>
            ) : (
              <span>BƯỚC {currentStepIndex + 1}/{pipeline.length}</span>
            )}
          </span>
        </Link>

        {/* Step Nodes Chain */}
        <div className="flex items-center gap-1 bg-slate-100/80 p-0.5 rounded-xl border border-slate-200/60 shadow-2xs overflow-x-auto scrollbar-none">
          {pipeline.map((st, idx) => {
            const isDone = st.done || (idx < currentStepIndex)
            const isCurrent = idx === currentStepIndex && !allDone
            const meta = STEP_ICONS[st.type] || STEP_ICONS.new_cards

            return (
              <div key={idx} className="flex items-center gap-0.5">
                {idx > 0 && <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />}
                
                <div
                  className={cn(
                    "flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[10px] font-bold transition-all relative shrink-0 select-none",
                    isDone && "bg-emerald-500 text-white shadow-2xs",
                    isCurrent && "bg-white text-slate-800 shadow-xs ring-1.5 ring-orange-500/80 font-black",
                    !isDone && !isCurrent && "bg-slate-200/50 text-slate-400 opacity-60"
                  )}
                  title={`${st.label || meta.emoji}${isDone ? ' (Đã xong)' : isCurrent ? ' (Đang làm)' : ''}`}
                >
                  <span className="text-xs">{isDone ? '✓' : meta.emoji}</span>
                  <span className="hidden md:inline text-[9.5px] max-w-[90px] truncate">
                    {st.label || st.type}
                  </span>

                  {/* Sub-progress badge on active step node */}
                  {isCurrent && hasSubProg && (
                    <span className="ml-0.5 px-1 py-0.2 bg-orange-500 text-white rounded text-[8.5px] font-black">
                      {subPercent}%
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Dynamic Sub-Progress Bar & Particle Animation for Active Step */}
      {!allDone && currentStep && (
        <div className="relative flex items-center gap-2 max-w-full">
          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50 relative">
            <motion.div
              className="h-full bg-gradient-to-r from-orange-500 via-amber-400 to-emerald-500 rounded-full relative"
              initial={{ width: '0%' }}
              animate={{ width: `${hasSubProg ? subPercent : ((currentStepIndex + 1) / pipeline.length) * 100}%` }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
            >
              {/* Shimmer sweep */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
            </motion.div>
          </div>

          <div className="text-[9px] font-black text-slate-600 shrink-0 flex items-center gap-1">
            <span className="text-orange-600">{currentStep.label || 'Đang thực hiện'}</span>
            {hasSubProg && (
              <span className="bg-slate-100 border border-slate-200 px-1 py-0.2 rounded text-[8.5px] text-slate-700">
                {subProgressCurr}/{subProgressTotal}
              </span>
            )}
          </div>

          {/* Floating Sparkle Animation on Progress (+1) */}
          <AnimatePresence>
            {showSparkle && (
              <motion.div
                initial={{ opacity: 0, y: 0, scale: 0.5 }}
                animate={{ opacity: 1, y: -16, scale: 1.2 }}
                exit={{ opacity: 0, y: -24, scale: 0.8 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="absolute right-0 top-0 pointer-events-none flex items-center gap-1 text-[10px] font-black text-orange-500 bg-orange-100 border border-orange-300 px-1.5 py-0.5 rounded-full shadow-md z-50"
              >
                <Sparkles className="w-3 h-3 text-amber-500 fill-amber-400 animate-spin" />
                <span>+1 Tiến Bộ!</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
