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

const STEP_META: Record<string, { emoji: string; label: string; ringColor: string }> = {
  new_cards: { emoji: '🎴', label: 'Học Từ Mới', ringColor: '#f97316' },
  fsrs_review: { emoji: '🔄', label: 'Ôn Tập FSRS', ringColor: '#6366f1' },
  mcq: { emoji: '🎯', label: 'Trắc Nghiệm', ringColor: '#a855f7' },
  typing: { emoji: '⌨️', label: 'Gõ Từ Vựng', ringColor: '#10b981' },
  study_time: { emoji: '⏱️', label: 'Thời Gian Học', ringColor: '#3b82f6' }
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
      const t = setTimeout(() => setShowSparkle(false), 950)
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
        "relative flex-1 flex items-center justify-between min-w-0 cursor-pointer select-none py-0.5 px-1 rounded-xl hover:bg-slate-100/60 transition-colors group",
        className
      )}
      title="Bấm vào thanh này để chuyển giữa Nấc 1 (Tên bộ thẻ) & Nấc 2 (Thông số bài học)"
    >
      {/* Content Switcher: Nấc 1 vs Nấc 2 (PERFECTLY CENTERED, LIGHT THEME) */}
      <div className="flex-1 flex items-center justify-center min-w-0 mx-auto px-2">
        <AnimatePresence mode="wait">
          {/* NẤC 1: TÊN BỘ THẺ */}
          {viewMode === 0 ? (
            <motion.div
              key="nac-1"
              initial={{ opacity: 0, y: 6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.16 }}
              className="flex items-center justify-center gap-2.5 min-w-0"
            >
              <h1 className="text-xs md:text-sm font-extrabold text-slate-800 tracking-tight truncate">
                {deckTitle || 'Phiên Học Lộ Trình'}
              </h1>
              <span className="px-2 py-0.5 rounded-md bg-orange-50 border border-orange-200/80 text-orange-600 text-[9.5px] font-black uppercase shrink-0 shadow-2xs">
                {allDone ? '✓ HOÀN THÀNH' : `BƯỚC ${currentStepIndex + 1}/${pipeline.length}`}
              </span>
            </motion.div>
          ) : (
            /* NẤC 2: CÁC THÔNG SỐ BÀI HỌC */
            <motion.div
              key="nac-2"
              initial={{ opacity: 0, y: 6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.16 }}
              className="flex items-center justify-center gap-2.5 text-xs min-w-0 overflow-x-auto scrollbar-none"
            >
              {/* Badge Bước */}
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-orange-50 border border-orange-200/80 text-orange-600 text-[10px] font-black shrink-0">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping" />
                <span>BƯỚC {currentStepIndex + 1}/{pipeline.length}</span>
              </div>

              {/* Tên bước học */}
              <div className="flex items-center gap-1 text-slate-700 font-bold text-xs shrink-0">
                <span>{meta.emoji}</span>
                <span className="text-slate-900 font-black">{currentStep ? (currentStep.label || meta.label) : 'Đã Xong'}</span>
              </div>

              {/* Vòng tròn phần trăm + Số từ */}
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2 py-0.5 rounded-md shadow-2xs shrink-0">
                <div className="relative w-4.5 h-4.5 flex items-center justify-center shrink-0">
                  <svg className="w-4.5 h-4.5 -rotate-90" viewBox="0 0 36 36">
                    <path className="text-slate-200" strokeWidth="4" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    <motion.path stroke={meta.ringColor} strokeDasharray={`${overallPercent}, 100`} strokeWidth="4" strokeLinecap="round" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" animate={{ strokeDasharray: `${overallPercent}, 100` }} />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[7px] font-black text-orange-600">{overallPercent}%</span>
                </div>
                {hasSubProg && (
                  <span className="text-[10.5px] font-black text-slate-800">
                    {subProgressCurr}/{subProgressTotal}
                  </span>
                )}
              </div>

              {/* Streak */}
              <div className="flex items-center gap-1 bg-orange-50 border border-orange-200/80 px-2 py-0.5 rounded-md text-orange-600 font-black text-[10.5px] shrink-0">
                <Flame className="w-3 h-3 text-orange-500 fill-orange-500 animate-pulse" />
                <span>{streakCount}d Streak</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mode Switcher Button (Nấc 1 ⇄ Nấc 2 - Light Theme) */}
      <button
        onClick={(e) => { e.stopPropagation(); toggleViewMode(); }}
        className="flex items-center gap-1 p-1.5 rounded-xl bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 border border-slate-200/60 text-[10px] font-black shrink-0 transition-all cursor-pointer active:scale-95 shadow-2xs"
        title="Chuyển chế độ Nấc 1 / Nấc 2"
      >
        <ArrowRightLeft className="w-3.5 h-3.5 text-amber-500" />
      </button>

      {/* Floating Sparkle Animation on +1 Progress (Centered Above Header) */}
      <AnimatePresence>
        {showSparkle && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.7 }}
            animate={{ opacity: 1, y: -26, scale: 1.1 }}
            exit={{ opacity: 0, y: -36, scale: 0.8 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-1/2 -translate-x-1/2 top-0 pointer-events-none flex items-center gap-1.5 text-[10px] font-black text-slate-950 bg-gradient-to-r from-amber-300 via-orange-400 to-amber-300 border border-amber-200 px-3 py-1 rounded-full shadow-[0_4px_15px_rgba(249,115,22,0.4)] z-[250]"
          >
            <Sparkles className="w-3.5 h-3.5 text-slate-950 fill-slate-950 animate-spin" />
            <span>+1 Tiến Bộ! ✨</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
