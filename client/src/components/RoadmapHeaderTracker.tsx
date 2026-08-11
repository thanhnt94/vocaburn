import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, Sparkles, Check } from 'lucide-react'
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
}

const STEP_META: Record<string, { emoji: string; label: string; color: string; ring: string }> = {
  new_cards: { emoji: '🎴', label: 'Học Từ Mới', color: 'from-orange-500 to-amber-500', ring: '#f97316' },
  fsrs_review: { emoji: '🔄', label: 'Ôn Tập FSRS', color: 'from-indigo-500 to-blue-500', ring: '#6366f1' },
  mcq: { emoji: '🎯', label: 'Trắc Nghiệm', color: 'from-purple-500 to-fuchsia-500', ring: '#a855f7' },
  typing: { emoji: '⌨️', label: 'Gõ Từ Vựng', color: 'from-emerald-500 to-teal-500', ring: '#10b981' },
  study_time: { emoji: '⏱️', label: 'Thời Gian Học', color: 'from-blue-500 to-cyan-500', ring: '#3b82f6' }
}

export const RoadmapHeaderTracker: React.FC<RoadmapHeaderTrackerProps> = ({
  pipeline,
  currentStepIndex,
  allDone,
  deckId,
  deckTitle,
  className,
  subProgressCurr,
  subProgressTotal
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [showSparkle, setShowSparkle] = useState(false)
  const prevCurrRef = useRef(subProgressCurr)

  if (!pipeline || pipeline.length === 0) return null

  const currentStep = pipeline[currentStepIndex] || null
  const meta = currentStep ? (STEP_META[currentStep.type] || STEP_META.new_cards) : STEP_META.new_cards

  const hasSubProg = typeof subProgressCurr === 'number' && typeof subProgressTotal === 'number' && subProgressTotal > 0
  const subPercent = hasSubProg ? Math.min(100, Math.round((subProgressCurr / subProgressTotal) * 100)) : 0
  
  // Calculate overall roadmap progress percentage
  const overallPercent = allDone ? 100 : Math.min(99, Math.round(((currentStepIndex + (hasSubProg ? subPercent / 100 : 0)) / pipeline.length) * 100))

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
    <div className={cn("relative flex items-center select-none", className)}>
      {/* Smart Capsule Pill Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileTap={{ scale: 0.97 }}
        className={cn(
          "flex items-center gap-2 px-2.5 py-1 rounded-2xl transition-all duration-300 border shadow-2xs cursor-pointer overflow-hidden max-w-full",
          isOpen
            ? "bg-slate-900 text-white border-slate-700 shadow-md ring-2 ring-orange-500/30"
            : "bg-white/90 hover:bg-slate-50 text-slate-800 border-slate-200/80 hover:border-slate-300"
        )}
        title="Bấm để xem/ẩn chi tiết lộ trình"
      >
        {/* Animated SVG Circular Progress Gauge */}
        <div className="relative w-5.5 h-5.5 flex items-center justify-center shrink-0">
          <svg className="w-5.5 h-5.5 -rotate-90" viewBox="0 0 36 36">
            <path
              className={isOpen ? "text-slate-700" : "text-slate-200"}
              strokeWidth="3.5"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <motion.path
              stroke={meta.ring}
              strokeDasharray={`${overallPercent}, 100`}
              strokeWidth="3.5"
              strokeLinecap="round"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              initial={{ strokeDasharray: "0, 100" }}
              animate={{ strokeDasharray: `${overallPercent}, 100` }}
              transition={{ type: "spring", stiffness: 140, damping: 16 }}
            />
          </svg>
          <span className={cn(
            "absolute inset-0 flex items-center justify-center text-[7.5px] font-black",
            isOpen ? "text-amber-400" : "text-orange-600"
          )}>
            {allDone ? '✓' : `${overallPercent}%`}
          </span>
        </div>

        {/* Content: Animated Layer Switching (Title vs Active Step Info) */}
        <div className="flex items-center gap-1.5 overflow-hidden">
          <AnimatePresence mode="wait">
            {!isOpen ? (
              <motion.div
                key="layer-title"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-1.5 min-w-0"
              >
                {deckTitle && (
                  <span className="text-xs font-black tracking-tight text-slate-800 truncate max-w-[120px] xs:max-w-[160px] md:max-w-[220px]">
                    {deckTitle}
                  </span>
                )}
                <span className="px-1.5 py-0.5 rounded-md bg-orange-500/10 text-orange-600 text-[9px] font-black tracking-wider uppercase shrink-0">
                  {allDone ? '✓ XONG' : `BƯỚC ${currentStepIndex + 1}/${pipeline.length}`}
                </span>
              </motion.div>
            ) : (
              <motion.div
                key="layer-step"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-1.5 text-xs text-white min-w-0"
              >
                <span className="text-sm shrink-0">{meta.emoji}</span>
                <span className="font-extrabold text-[11px] text-amber-300 truncate max-w-[120px] xs:max-w-[160px]">
                  {currentStep ? (currentStep.label || meta.label) : 'Đã Xong'}
                </span>
                {hasSubProg && (
                  <span className="bg-white/20 text-white px-1.5 py-0.2 rounded text-[9.5px] font-black shrink-0">
                    {subProgressCurr}/{subProgressTotal}
                  </span>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <ChevronDown className={cn(
          "w-3.5 h-3.5 transition-transform duration-300 shrink-0",
          isOpen ? "text-amber-400 rotate-180" : "text-slate-400"
        )} />

        {/* Floating Sparkle Animation on +1 Progress */}
        <AnimatePresence>
          {showSparkle && (
            <motion.div
              initial={{ opacity: 0, y: 0, scale: 0.6 }}
              animate={{ opacity: 1, y: -20, scale: 1.1 }}
              exit={{ opacity: 0, y: -28, scale: 0.8 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="absolute right-2 top-0 pointer-events-none flex items-center gap-1 text-[9px] font-black text-amber-900 bg-amber-300 border border-amber-400 px-2 py-0.5 rounded-full shadow-lg z-50"
            >
              <Sparkles className="w-3 h-3 text-amber-600 fill-amber-500 animate-spin" />
              <span>+1 Tiến Bộ!</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Expanded Multi-Layer Dropdown Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute left-0 top-full mt-2 w-72 xs:w-80 bg-white/95 backdrop-blur-2xl border border-slate-200/90 rounded-2xl p-3.5 shadow-2xl z-[200] space-y-3"
          >
            {/* Header of Dropdown */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Tiến Độ Lộ Trình Hôm Nay</span>
              </div>
              <Link to={`/flashcard/${deckId}/roadmap`} className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 underline">
                Cài đặt Lộ Trình ➔
              </Link>
            </div>

            {/* Sub-Progress Bar in Dropdown */}
            {!allDone && currentStep && (
              <div className="space-y-1 bg-slate-50 p-2 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-700 flex items-center gap-1">
                    <span>{meta.emoji}</span>
                    <span>{currentStep.label || meta.label}</span>
                  </span>
                  <span className="text-orange-600 font-black">
                    {hasSubProg ? `${subProgressCurr}/${subProgressTotal} (${subPercent}%)` : `${subPercent}%`}
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-200/70 rounded-full overflow-hidden relative">
                  <motion.div
                    className={cn("h-full rounded-full bg-gradient-to-r", meta.color)}
                    initial={{ width: '0%' }}
                    animate={{ width: `${subPercent}%` }}
                    transition={{ type: "spring", stiffness: 180, damping: 18 }}
                  />
                </div>
              </div>
            )}

            {/* List of Steps in Pipeline */}
            <div className="space-y-1.5 pt-0.5">
              {pipeline.map((st, idx) => {
                const isDone = st.done || (idx < currentStepIndex)
                const isCurrent = idx === currentStepIndex && !allDone
                const m = STEP_META[st.type] || STEP_META.new_cards

                return (
                  <div
                    key={idx}
                    className={cn(
                      "p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 transition-all",
                      isDone ? "bg-emerald-50/60 border-emerald-200 text-emerald-950 font-medium" :
                      isCurrent ? "bg-amber-50 border-amber-300 text-amber-950 font-black shadow-xs ring-1 ring-amber-400/40" :
                      "bg-slate-50/50 border-slate-100 text-slate-400 opacity-60"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{isDone ? '✓' : m.emoji}</span>
                      <div>
                        <div className="font-bold text-[11.5px]">{st.label || m.label}</div>
                        <div className="text-[9px] text-slate-400 font-normal">Bước {idx + 1}/{pipeline.length}</div>
                      </div>
                    </div>
                    <span className={cn(
                      "text-[10px] font-extrabold px-2 py-0.5 rounded-lg border",
                      isDone ? "bg-emerald-100 text-emerald-800 border-emerald-200" :
                      isCurrent ? "bg-amber-400 text-slate-900 border-amber-500 font-black" :
                      "bg-slate-100 text-slate-400 border-slate-200"
                    )}>
                      {isDone ? 'Hoàn Thành' : isCurrent ? `Đang Làm (${subPercent}%)` : 'Chờ'}
                    </span>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
