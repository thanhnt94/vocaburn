import React, { useState, useEffect, useRef } from 'react'
import { ArrowRightLeft, Flame, Trophy, Zap } from 'lucide-react'
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
  onSurgeChange?: (isSurging: boolean) => void
  onViewModeChange?: (viewMode: 0 | 1) => void
}

const STEP_META: Record<string, { emoji: string; label: string }> = {
  new_cards: { emoji: '🎴', label: 'Học Từ Mới' },
  fsrs_review: { emoji: '🔄', label: 'Ôn Tập FSRS' },
  mcq: { emoji: '🎯', label: 'Trắc Nghiệm' },
  typing: { emoji: '⌨️', label: 'Gõ Từ Vựng' },
  study_time: { emoji: '⏱️', label: 'Thời Gian Học' }
}

const OVERACHIEVE_PRAISES = [
  "⚡ NỖ LỰC PHI THƯỜNG!",
  "🚀 VƯỢT CHỈ TIÊU BỨT PHÁ!",
  "👑 BỨT PHÁ GIỚI HẠN BẢN THÂN!",
  "🔥 CHĂM CHỈ XUẤT SẮC!"
]

export const RoadmapHeaderTracker: React.FC<RoadmapHeaderTrackerProps> = ({
  pipeline,
  currentStepIndex,
  allDone,
  deckId,
  deckTitle,
  className,
  subProgressCurr,
  subProgressTotal,
  streakCount = 0,
  onSurgeChange,
  onViewModeChange
}) => {
  // Toggle State: 0 = Nấc 1 (Tên bộ thẻ), 1 = Nấc 2 (Các thông số bài học)
  const [viewMode, setViewMode] = useState<0 | 1>(0)
  const [isSurging, setIsSurging] = useState(false)
  const prevCurrRef = useRef(subProgressCurr)

  if (!pipeline || pipeline.length === 0) return null

  const currentStep = pipeline[currentStepIndex] || null
  const meta = currentStep ? (STEP_META[currentStep.type] || STEP_META.new_cards) : STEP_META.new_cards

  const hasSubProg = typeof subProgressCurr === 'number' && typeof subProgressTotal === 'number' && subProgressTotal > 0
  const subPercent = hasSubProg ? Math.min(100, Math.round((subProgressCurr / subProgressTotal) * 100)) : 0
  const isGoalReached = hasSubProg && subProgressCurr >= subProgressTotal
  const extraCount = hasSubProg && subProgressCurr > subProgressTotal ? subProgressCurr - subProgressTotal : 0
  const isOverachieved = extraCount > 0

  const praiseMsg = isOverachieved 
    ? OVERACHIEVE_PRAISES[(extraCount - 1) % OVERACHIEVE_PRAISES.length] 
    : (isGoalReached ? 'ĐÃ ĐẠT GOAL TỪ VỰNG!' : 'TIẾN BỘ TỪ VỰNG!')

  useEffect(() => {
    if (
      typeof subProgressCurr === 'number' &&
      typeof prevCurrRef.current === 'number' &&
      subProgressCurr > prevCurrRef.current
    ) {
      setIsSurging(true)
      onSurgeChange?.(true)
      const t = setTimeout(() => {
        setIsSurging(false)
        onSurgeChange?.(false)
      }, 2000)
      return () => {
        clearTimeout(t)
        onSurgeChange?.(false)
      }
    }
    prevCurrRef.current = subProgressCurr
  }, [subProgressCurr, onSurgeChange])

  const toggleViewMode = () => {
    setViewMode((prev) => {
      const next = prev === 0 ? 1 : 0
      onViewModeChange?.(next)
      return next
    })
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
      {/* FULL-HEIGHT POWER SURGE EXPANSION OVERLAY (XUẤT HIỆN KHI +1 THẺ MỚI - FULL COVERAGE) */}
      <AnimatePresence>
        {isSurging && (
          <motion.div
            initial={{ opacity: 0, scaleY: 0.1 }}
            animate={{ opacity: 1, scaleY: 1 }}
            exit={{ opacity: 0, scaleY: 0.1 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className={cn(
              "fixed inset-x-0 top-0 h-[48px] sm:h-[52px] bg-slate-950 flex items-center justify-center overflow-hidden z-[250] border-b shadow-2xl",
              isOverachieved
                ? "border-cyan-400/70 shadow-cyan-950/50"
                : isGoalReached 
                  ? "border-emerald-400/60 shadow-emerald-950/40" 
                  : "border-amber-500/50"
            )}
          >
            {/* Surge Background Beam Fill */}
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${subPercent}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className={cn(
                "absolute inset-y-0 left-0",
                isOverachieved
                  ? "bg-gradient-to-r from-emerald-600 via-teal-400 to-cyan-400 shadow-[0_0_35px_rgba(34,211,238,0.9)]"
                  : isGoalReached 
                    ? "bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-400 shadow-[0_0_30px_rgba(16,185,129,0.9)]" 
                    : "bg-gradient-to-r from-orange-600 via-amber-500 to-emerald-400 shadow-[0_0_30px_rgba(249,115,22,0.9)]"
              )}
            />
            {/* Surge Dynamic Beam Flash Sweep */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: '200%' }}
              transition={{ duration: 1.2, ease: "easeInOut", repeat: 1, repeatType: "reverse" }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none"
            />
            {/* Center Surge Text */}
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: [0.85, 1.15, 1], opacity: 1 }}
              transition={{ duration: 0.45 }}
              className="relative z-10 font-black text-white text-xs sm:text-sm tracking-wider flex items-center gap-2.5 drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)]"
            >
              {isOverachieved ? (
                <Zap className="w-4.5 h-4.5 text-cyan-300 fill-cyan-300 animate-bounce" />
              ) : isGoalReached ? (
                <Trophy className="w-4.5 h-4.5 text-emerald-300 fill-emerald-300 animate-bounce" />
              ) : (
                <Flame className="w-4.5 h-4.5 text-amber-300 fill-amber-300 animate-bounce" />
              )}
              <span>{praiseMsg}</span>
              {hasSubProg && (
                <span className={cn(
                  "px-2.5 py-0.5 rounded-full border text-xs font-black shadow-md flex items-center gap-1",
                  isOverachieved
                    ? "bg-cyan-950/90 border-cyan-400/80 text-cyan-200"
                    : isGoalReached 
                      ? "bg-emerald-950/80 border-emerald-400/60 text-emerald-200" 
                      : "bg-black/70 border-amber-300/50 text-amber-300"
                )}>
                  {isOverachieved ? `+${extraCount}` : `${subProgressCurr} / ${subProgressTotal}`}
                </span>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content Switcher: Nấc 1 vs Nấc 2 (FADES OUT WHEN SURGING TO AVOID OVERLAP, MIN HEIGHT PRESERVED) */}
      <div className="flex-1 flex items-center justify-center min-w-0 mx-auto px-2 relative z-[140] min-h-[32px]">
        <AnimatePresence mode="wait">
          {!isSurging && (
            viewMode === 0 ? (
              /* NẤC 1: TÊN BỘ THẺ */
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
                <span className={cn(
                  "px-2.5 py-0.5 rounded-full border text-[10.5px] font-black shrink-0 shadow-xs",
                  isOverachieved
                    ? "bg-cyan-950/90 border-cyan-500/70 text-cyan-300"
                    : isGoalReached 
                      ? "bg-emerald-950/90 border-emerald-500/60 text-emerald-300" 
                      : "bg-slate-900 border-slate-700 text-amber-400"
                )}>
                  {allDone ? '✓ 100%' : `${currentStepIndex + 1}/${pipeline.length}`}
                </span>
              </motion.div>
            ) : (
              /* NẤC 2: THÔNG SỐ SANG TRỌNG ĐEN HOÀN TOÀN / EMERALD GOAL REACHED / OVERACHIEVED */
              <motion.div
                key="nac-2"
                initial={{ opacity: 0, y: 4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                transition={{ duration: 0.16 }}
                className="flex items-center justify-center gap-2.5 text-xs min-w-0 overflow-x-auto scrollbar-none"
              >
                {/* Badge 1/3 */}
                <div className={cn(
                  "flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10.5px] font-black shrink-0 shadow-xs",
                  isOverachieved
                    ? "bg-cyan-950/90 border-cyan-500/70 text-cyan-300"
                    : isGoalReached 
                      ? "bg-emerald-950/90 border-emerald-500/60 text-emerald-300" 
                      : "bg-slate-900 border-slate-700 text-amber-400"
                )}>
                  <div className={cn("w-1.5 h-1.5 rounded-full animate-ping", isOverachieved ? "bg-cyan-400" : isGoalReached ? "bg-emerald-400" : "bg-amber-400")} />
                  <span>{currentStepIndex + 1}/{pipeline.length}</span>
                </div>

                {/* Tên bước học */}
                <div className="flex items-center gap-1.5 text-slate-100 font-bold text-xs shrink-0 drop-shadow-xs">
                  <span className="text-sm">{meta.emoji}</span>
                  <span className="text-white font-extrabold">{currentStep ? (currentStep.label || meta.label) : 'Đã Xong'}</span>
                </div>

                {/* Con số Tốt / Thẻ (Hiển thị gọn +N khi học vượt, hoặc 9/20 khi chưa đủ) */}
                {hasSubProg && (
                  isOverachieved ? (
                    <div className="flex items-center gap-1 border px-2.5 py-0.5 rounded-full bg-cyan-950/90 border-cyan-400/80 text-cyan-300 text-xs font-black shrink-0 shadow-[0_0_12px_rgba(34,211,238,0.4)]">
                      <Zap className="w-3.5 h-3.5 text-cyan-300 fill-cyan-300 shrink-0 animate-bounce" />
                      <span>+{extraCount}</span>
                    </div>
                  ) : (
                    <div className={cn(
                      "flex items-center gap-1 border px-3 py-0.5 rounded-full text-white font-black text-xs shrink-0 shadow-xs",
                      isGoalReached 
                        ? "bg-emerald-950/90 border-emerald-500/70 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]" 
                        : "bg-slate-900 border-slate-700/80"
                    )}>
                      {isGoalReached && <Trophy className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400 shrink-0 mr-0.5" />}
                      <span className={isGoalReached ? "text-emerald-300 font-black" : "text-amber-400 font-black"}>{subProgressCurr}</span>
                      <span className={isGoalReached ? "text-emerald-500" : "text-slate-500"}>/</span>
                      <span className={isGoalReached ? "text-emerald-200" : "text-slate-200"}>{subProgressTotal}</span>
                    </div>
                  )
                )}

                {/* Streak */}
                <div className="flex items-center gap-1 bg-orange-500/10 border border-orange-500/30 px-2.5 py-0.5 rounded-full text-orange-400 font-black text-[10.5px] shrink-0">
                  <Flame className="w-3.5 h-3.5 text-orange-400 fill-orange-400 animate-pulse" />
                  <span>{streakCount}d</span>
                </div>
              </motion.div>
            )
          )}
        </AnimatePresence>
      </div>

      {/* Mode Switcher Button (Nấc 1 ⇄ Nấc 2) */}
      <AnimatePresence>
        {!isSurging && viewMode === 0 && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => { e.stopPropagation(); toggleViewMode(); }}
            className={cn(
              "flex items-center gap-1 p-1.5 rounded-xl border text-[10px] font-black shrink-0 transition-all cursor-pointer active:scale-95 shadow-xs relative z-[140]",
              isOverachieved
                ? "bg-cyan-950/90 hover:bg-cyan-900 text-cyan-300 border-cyan-400/70"
                : isGoalReached 
                  ? "bg-emerald-950/90 hover:bg-emerald-900 text-emerald-300 border-emerald-500/60" 
                  : "bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-amber-400 border-slate-700"
            )}
            title="Chuyển chế độ Nấc 1 / Nấc 2"
          >
            <ArrowRightLeft className={cn("w-3.5 h-3.5", isOverachieved ? "text-cyan-400" : isGoalReached ? "text-emerald-400" : "text-amber-400")} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
