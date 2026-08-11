import React, { useState, useEffect, useRef } from 'react'
import { Sparkles, ArrowRightLeft, Flame } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { PipelineStepStatus } from '@/hooks/useRoadmapStatus'

interface RoadmapHeaderTrackerProps {
  pipeline: PipelineStepStatus[]
  currentStepIndex: number
  allDone: boolean
  deckId: string | number
  deckTitle?: string
  className?: string
  subProgressCurr?: number
  subProgressTotal?: number
  streakCount?: number
}

const STEP_META: Record<string, { emoji: string; label: string; barGradient: string }> = {
  new_cards: { emoji: '🎴', label: 'Học Từ Mới', barGradient: 'from-orange-500 via-amber-500 to-yellow-400' },
  fsrs_review: { emoji: '🔄', label: 'Ôn Tập FSRS', barGradient: 'from-indigo-500 via-purple-500 to-indigo-400' },
  mcq: { emoji: '🎯', label: 'Trắc Nghiệm', barGradient: 'from-purple-500 via-fuchsia-500 to-pink-400' },
  typing: { emoji: '⌨️', label: 'Gõ Từ Vựng', barGradient: 'from-emerald-500 via-teal-500 to-cyan-400' },
  study_time: { emoji: '⏱️', label: 'Thời Gian Học', barGradient: 'from-blue-500 via-cyan-500 to-sky-400' }
}

export const RoadmapHeaderTracker: React.FC<RoadmapHeaderTrackerProps> = ({
  pipeline,
  currentStepIndex,
  allDone,
  deckId,
  deckTitle,
  className,
  subProgressCurr,
  subProgressTotal,
  streakCount = 0
}) => {
  // Toggle State: 0 = Nấc 1 (Tên bộ thẻ), 1 = Nấc 2 (Các thông số bài học)
  const [viewMode, setViewMode] = useState<0 | 1>(0)
  const [showSparkle, setShowSparkle] = useState(false)
  const prevCurrRef = useRef(subProgressCurr)

  if (!pipeline || pipeline.length === 0) return null

  const currentStep = pipeline[currentStepIndex] || null
  const meta = currentStep ? (STEP_META[currentStep.type] || STEP_META.new_cards) : STEP_META.new_cards

  const hasSubProg = typeof subProgressCurr === 'number' && typeof subProgressTotal === 'number' && subProgressTotal > 0
  const subPercent = hasSubProg ? Math.min(100, Math.round((subProgressCurr / subProgressTotal) * 100)) : 0
  
  const overallPercent = allDone ? 100 : Math.min(99, Math.round(((currentStepIndex + (hasSubProg ? subPercent / 100 : 0)) / pipeline.length) * 100))

  useEffect(() => {
    if (
      typeof subProgressCurr === 'number' &&
      typeof prevCurrRef.current === 'number' &&
      subProgressCurr > prevCurrRef.current
    ) {
      setShowSparkle(true)
      const t = setTimeout(() => setShowSparkle(false), 1200)
      return () => clearTimeout(t)
    }
    prevCurrRef.current = subProgressCurr
  }, [subProgressCurr])

  const toggleViewMode = () => {
    setViewMode((prev) => (prev === 0 ? 1 : 0))
  }

  return (
    <div 
      onClick={toggleViewMode}
      className={cn(
        "relative flex-1 flex items-center justify-between min-w-0 cursor-pointer select-none py-0.5 px-1 rounded-xl hover:bg-white/5 transition-colors group",
        className
      )}
      title="Bấm vào thanh này để chuyển giữa Nấc 1 (Tên bộ thẻ) & Nấc 2 (Thông số bài học)"
    >
      {/* Content Switcher: Nấc 1 vs Nấc 2 (PERFECTLY CENTERED) */}
      <div className="flex-1 flex items-center justify-center min-w-0 mx-auto px-2">
        <AnimatePresence mode="wait">
          {/* NẤC 1: TÊN BỘ THẺ */}
          {viewMode === 0 ? (
            <motion.div
              key="nac-1"
              initial={{ opacity: 0, y: 4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.16 }}
              className="flex items-center justify-center gap-2.5 min-w-0"
            >
              <h1 className="text-xs md:text-sm font-black text-white tracking-tight truncate drop-shadow-xs">
                {deckTitle || 'Phiên Học Lộ Trình'}
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-orange-500/25 to-amber-500/25 border border-orange-400/40 text-orange-300 text-[10px] font-black shrink-0">
                {allDone ? '✓ 100%' : `${currentStepIndex + 1}/${pipeline.length}`}
              </span>
            </motion.div>
          ) : (
            /* NẤC 2: CÁC THÔNG SỐ BÀI HỌC VỚI THANH GAME XP BAR */
            <motion.div
              key="nac-2"
              initial={{ opacity: 0, y: 4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.16 }}
              className="flex items-center justify-center gap-2.5 text-xs min-w-0 overflow-x-auto scrollbar-none"
            >
              {/* Badge 1/3 */}
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-orange-500/20 border border-orange-400/40 text-orange-300 text-[10px] font-black shrink-0">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-ping" />
                <span>{currentStepIndex + 1}/{pipeline.length}</span>
              </div>

              {/* Tên bước học */}
              <div className="flex items-center gap-1 text-slate-200 font-bold text-xs shrink-0">
                <span>{meta.emoji}</span>
                <span className="text-amber-300 font-extrabold">{currentStep ? (currentStep.label || meta.label) : 'Đã Xong'}</span>
              </div>

              {/* GAME EXP PROGRESS BAR */}
              <div className="relative flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 px-2 py-1 rounded-full shrink-0 shadow-inner min-w-[120px] xs:min-w-[140px]">
                <div className="relative flex-1 bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-700/60 min-w-[60px]">
                  <motion.div 
                    className={cn("h-full rounded-full bg-gradient-to-r shadow-[0_0_10px_rgba(249,115,22,0.6)]", meta.barGradient)}
                    initial={{ width: 0 }}
                    animate={{ width: `${overallPercent}%` }}
                    transition={{ type: "spring", stiffness: 120, damping: 15 }}
                  />
                </div>
                <span className="text-[10px] font-black text-amber-300 shrink-0 min-w-[28px] text-right">
                  {hasSubProg ? `${subProgressCurr}/${subProgressTotal}` : `${overallPercent}%`}
                </span>
              </div>

              {/* Streak */}
              <div className="flex items-center gap-1 bg-orange-500/10 border border-orange-500/30 px-2 py-0.5 rounded-full text-orange-400 font-black text-[10.5px] shrink-0">
                <Flame className="w-3 h-3 text-orange-400 fill-orange-400 animate-pulse" />
                <span>{streakCount}d</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mode Switcher Button (Nấc 1 ⇄ Nấc 2 - Dark Button) */}
      <button
        onClick={(e) => { e.stopPropagation(); toggleViewMode(); }}
        className="flex items-center gap-1 p-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-amber-400 border border-slate-700/80 text-[10px] font-black shrink-0 transition-all cursor-pointer active:scale-95 shadow-xs"
        title="Chuyển chế độ Nấc 1 / Nấc 2"
      >
        <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400" />
      </button>

      {/* Gamified XP Pop-up Animation ON TOP OF HEADER (STAYS INSIDE VIEWPORT) */}
      <AnimatePresence>
        {showSparkle && (
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.6 }}
            animate={{ opacity: 1, y: 2, scale: 1.1 }}
            exit={{ opacity: 0, y: -8, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="absolute left-1/2 -translate-x-1/2 top-full mt-1 pointer-events-none flex items-center gap-1.5 text-[10.5px] font-black text-slate-950 bg-gradient-to-r from-amber-300 via-orange-400 to-amber-300 border border-amber-200 px-3 py-1 rounded-full shadow-[0_4px_20px_rgba(249,115,22,0.8)] z-[300]"
          >
            <Sparkles className="w-3.5 h-3.5 text-slate-950 fill-slate-950 animate-spin" />
            <span>+1 TIẾN BỘ XP! ✨</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
