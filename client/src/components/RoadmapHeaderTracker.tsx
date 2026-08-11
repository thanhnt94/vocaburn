import React, { useState, useEffect, useRef } from 'react'
import { ArrowRightLeft, Flame } from 'lucide-react'
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
  const [isBouncing, setIsBouncing] = useState(false)
  const prevCurrRef = useRef(subProgressCurr)

  if (!pipeline || pipeline.length === 0) return null

  const currentStep = pipeline[currentStepIndex] || null
  const meta = currentStep ? (STEP_META[currentStep.type] || STEP_META.new_cards) : STEP_META.new_cards

  const hasSubProg = typeof subProgressCurr === 'number' && typeof subProgressTotal === 'number' && subProgressTotal > 0
  const subPercent = hasSubProg ? Math.min(100, Math.round((subProgressCurr / subProgressTotal) * 100)) : 0

  useEffect(() => {
    if (
      typeof subProgressCurr === 'number' &&
      typeof prevCurrRef.current === 'number' &&
      subProgressCurr > prevCurrRef.current
    ) {
      setIsBouncing(true)
      const t = setTimeout(() => setIsBouncing(false), 700)
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
      {/* Content Switcher: Nấc 1 vs Nấc 2 (PERFECTLY CENTERED BROADCAST STYLE) */}
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
              <h1 className="text-xs md:text-sm font-black text-white tracking-tight truncate drop-shadow-md">
                {deckTitle || 'Phiên Học Lộ Trình'}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-black/40 border border-amber-400/40 text-amber-300 text-[10.5px] font-black shrink-0 shadow-xs">
                {allDone ? '✓ 100%' : `${currentStepIndex + 1}/${pipeline.length}`}
              </span>
            </motion.div>
          ) : (
            /* NẤC 2: THÔNG SỐ TRUYỀN HÌNH PREMIER LEAGUE STYLE */
            <motion.div
              key="nac-2"
              initial={{ opacity: 0, y: 4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.16 }}
              className="flex items-center justify-center gap-3 text-xs min-w-0 overflow-x-auto scrollbar-none"
            >
              {/* Badge 1/3 */}
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/40 border border-amber-400/40 text-amber-300 text-[10.5px] font-black shrink-0 shadow-xs">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                <span>{currentStepIndex + 1}/${pipeline.length}</span>
              </div>

              {/* Tên bước học */}
              <div className="flex items-center gap-1.5 text-slate-100 font-bold text-xs shrink-0 drop-shadow-xs">
                <span className="text-sm">{meta.emoji}</span>
                <span className="text-white font-extrabold">{currentStep ? (currentStep.label || meta.label) : 'Đã Xong'}</span>
              </div>

              {/* Con số Tốt / Thẻ (Ví dụ: 7/20) với hiệu ứng nổ Bounce khi ghi bàn / học từ */}
              {hasSubProg && (
                <motion.div 
                  animate={isBouncing ? { scale: [1, 1.3, 1], textShadow: "0 0 12px rgba(251,191,36,1)" } : { scale: 1 }}
                  transition={{ duration: 0.4 }}
                  className="flex items-center gap-1 bg-black/40 border border-white/20 px-3 py-0.5 rounded-full text-white font-black text-xs shrink-0 shadow-xs"
                >
                  <span className="text-amber-300 font-black">{subProgressCurr}</span>
                  <span className="text-slate-400">/</span>
                  <span className="text-slate-200">{subProgressTotal}</span>
                </motion.div>
              )}

              {/* Streak */}
              <div className="flex items-center gap-1 bg-orange-500/20 border border-orange-500/40 px-2.5 py-0.5 rounded-full text-orange-300 font-black text-[10.5px] shrink-0">
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
        className="flex items-center gap-1 p-1.5 rounded-xl bg-black/40 hover:bg-black/60 text-slate-200 hover:text-amber-300 border border-white/20 text-[10px] font-black shrink-0 transition-all cursor-pointer active:scale-95 shadow-xs"
        title="Chuyển chế độ Nấc 1 / Nấc 2"
      >
        <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400" />
      </button>
    </div>
  )
}
