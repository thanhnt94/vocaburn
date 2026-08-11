import React, { useState, useEffect, useRef } from 'react'
import { ArrowRightLeft, Flame, Sparkles } from 'lucide-react'
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

const STEP_META: Record<string, { emoji: string; label: string }> = {
  new_cards: { emoji: '🎴', label: 'Học Từ Mới' },
  fsrs_review: { emoji: '🔄', label: 'Ôn Tập FSRS' },
  mcq: { emoji: '🎯', label: 'Trắc Nghiệm' },
  typing: { emoji: '⌨️', label: 'Gõ Từ Vựng' },
  study_time: { emoji: '⏱️', label: 'Thời Gian Học' }
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
  const [isFireFlaring, setIsFireFlaring] = useState(false)
  const prevCurrRef = useRef(subProgressCurr)

  if (!pipeline || pipeline.length === 0) return null

  const currentStep = pipeline[currentStepIndex] || null
  const meta = currentStep ? (STEP_META[currentStep.type] || STEP_META.new_cards) : STEP_META.new_cards

  const hasSubProg = typeof subProgressCurr === 'number' && typeof subProgressTotal === 'number' && subProgressTotal > 0

  useEffect(() => {
    if (
      typeof subProgressCurr === 'number' &&
      typeof prevCurrRef.current === 'number' &&
      subProgressCurr > prevCurrRef.current
    ) {
      setIsFireFlaring(true)
      const t = setTimeout(() => setIsFireFlaring(false), 850)
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
        "relative flex-1 flex items-center justify-between min-w-0 cursor-pointer select-none py-0.5 px-1 rounded-xl transition-colors group z-[140]",
        className
      )}
      title="Bấm vào thanh này để chuyển giữa Nấc 1 (Tên bộ thẻ) & Nấc 2 (Thông số bài học)"
    >
      {/* Fiery Burst Animation Wave Overlay (Ngọn Lửa Vụt Cháy khi học thêm từ) */}
      <AnimatePresence>
        {isFireFlaring && (
          <motion.div
            initial={{ opacity: 0, scaleY: 0 }}
            animate={{ opacity: [0, 1, 0.8, 0], scaleY: [0.3, 1.6, 1.2, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="absolute inset-x-0 -bottom-2 h-10 bg-gradient-to-t from-orange-500/60 via-amber-500/30 to-transparent pointer-events-none z-[135] blur-xs"
          />
        )}
      </AnimatePresence>

      {/* Content Switcher: Nấc 1 vs Nấc 2 (PERFECTLY CENTERED OBSIDIAN BLACK STYLE) */}
      <div className="flex-1 flex items-center justify-center min-w-0 mx-auto px-2 relative z-[140]">
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
              <h1 className="text-xs md:text-sm font-black text-white tracking-tight truncate drop-shadow-md">
                {deckTitle || 'Phiên Học Lộ Trình'}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-amber-400 text-[10.5px] font-black shrink-0 shadow-xs">
                {allDone ? '✓ 100%' : `${currentStepIndex + 1}/${pipeline.length}`}
              </span>
            </motion.div>
          ) : (
            /* NẤC 2: THÔNG SỐ SANG TRỌNG ĐEN HOÀN TOÀN + NGỌN LỬA VỤT CHÁY */
            <motion.div
              key="nac-2"
              initial={{ opacity: 0, y: 4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.16 }}
              className="flex items-center justify-center gap-3 text-xs min-w-0 overflow-x-auto scrollbar-none"
            >
              {/* Badge 1/3 */}
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-amber-400 text-[10.5px] font-black shrink-0 shadow-xs">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                <span>{currentStepIndex + 1}/{pipeline.length}</span>
              </div>

              {/* Tên bước học */}
              <div className="flex items-center gap-1.5 text-slate-100 font-bold text-xs shrink-0 drop-shadow-xs">
                <span className="text-sm">{meta.emoji}</span>
                <span className="text-white font-extrabold">{currentStep ? (currentStep.label || meta.label) : 'Đã Xong'}</span>
              </div>

              {/* Con số Tốt / Thẻ (Ví dụ: 9/20) với Ngọn lửa bùng cháy khi tăng tiến độ */}
              {hasSubProg && (
                <div className="relative flex items-center">
                  <motion.div 
                    animate={isFireFlaring ? { scale: [1, 1.35, 1], textShadow: "0 0 16px rgba(249,115,22,1)" } : { scale: 1 }}
                    transition={{ duration: 0.4 }}
                    className="flex items-center gap-1 bg-slate-900 border border-slate-700/80 px-3 py-0.5 rounded-full text-white font-black text-xs shrink-0 shadow-xs"
                  >
                    <span className="text-amber-400 font-black">{subProgressCurr}</span>
                    <span className="text-slate-500">/</span>
                    <span className="text-slate-200">{subProgressTotal}</span>
                  </motion.div>

                  {/* Flame Flare Burst Overlay Icon */}
                  <AnimatePresence>
                    {isFireFlaring && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.5, y: 0 }}
                        animate={{ opacity: 1, scale: [1, 1.8, 1], y: -16, rotate: [0, -20, 20, 0] }}
                        exit={{ opacity: 0, scale: 0.5, y: -24 }}
                        transition={{ duration: 0.7 }}
                        className="absolute left-1/2 -translate-x-1/2 top-0 pointer-events-none text-orange-500 drop-shadow-[0_0_12px_rgba(249,115,22,1)]"
                      >
                        <Flame className="w-5 h-5 fill-orange-500 text-amber-300 animate-pulse" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Streak */}
              <div className="flex items-center gap-1 bg-orange-500/10 border border-orange-500/30 px-2.5 py-0.5 rounded-full text-orange-400 font-black text-[10.5px] shrink-0">
                <Flame className="w-3.5 h-3.5 text-orange-400 fill-orange-400 animate-pulse" />
                <span>{streakCount}d</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mode Switcher Button (Nấc 1 ⇄ Nấc 2) */}
      <button
        onClick={(e) => { e.stopPropagation(); toggleViewMode(); }}
        className="flex items-center gap-1 p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-amber-400 border border-slate-700 text-[10px] font-black shrink-0 transition-all cursor-pointer active:scale-95 shadow-xs relative z-[140]"
        title="Chuyển chế độ Nấc 1 / Nấc 2"
      >
        <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400" />
      </button>
    </div>
  )
}
