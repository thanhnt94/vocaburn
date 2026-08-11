import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, Sparkles, Layers } from 'lucide-react'
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

const STEP_META: Record<string, { emoji: string; label: string; ringColor: string; bgGradient: string }> = {
  new_cards: { emoji: '🎴', label: 'Học Từ Mới', ringColor: '#f97316', bgGradient: 'from-orange-500 to-amber-500' },
  fsrs_review: { emoji: '🔄', label: 'Ôn Tập FSRS', ringColor: '#6366f1', bgGradient: 'from-indigo-500 to-blue-500' },
  mcq: { emoji: '🎯', label: 'Trắc Nghiệm', ringColor: '#a855f7', bgGradient: 'from-purple-500 to-fuchsia-500' },
  typing: { emoji: '⌨️', label: 'Gõ Từ Vựng', ringColor: '#10b981', bgGradient: 'from-emerald-500 to-teal-500' },
  study_time: { emoji: '⏱️', label: 'Thời Gian Học', ringColor: '#3b82f6', bgGradient: 'from-blue-500 to-cyan-500' }
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
      {/* Cyberpunk Luxury Glass Capsule Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileTap={{ scale: 0.96 }}
        className={cn(
          "relative flex items-center gap-2.5 px-3 py-1.5 rounded-full transition-all duration-300 backdrop-blur-2xl shadow-[0_4px_25px_rgba(0,0,0,0.3)] cursor-pointer overflow-hidden border max-w-full",
          isOpen
            ? "bg-slate-950 text-white border-orange-500/60 ring-2 ring-orange-500/40 shadow-[0_0_30px_rgba(249,115,22,0.4)]"
            : "bg-slate-900/90 hover:bg-slate-950 text-white border-slate-700/80 hover:border-orange-500/50 shadow-[0_0_15px_rgba(0,0,0,0.4)]"
        )}
        title="Bấm để ẩn/hiển thị tiến độ & thông tin các bước"
      >
        {/* Glowing Background Light Sweep */}
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent pointer-events-none" />

        {/* Futuristic SVG Ring Progress Gauge */}
        <div className="relative w-6.5 h-6.5 flex items-center justify-center shrink-0">
          <svg className="w-6.5 h-6.5 -rotate-90 filter drop-shadow-[0_0_6px_rgba(249,115,22,0.6)]" viewBox="0 0 36 36">
            <path
              className="text-slate-800"
              strokeWidth="4"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <motion.path
              stroke={meta.ringColor}
              strokeDasharray={`${overallPercent}, 100`}
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              initial={{ strokeDasharray: "0, 100" }}
              animate={{ strokeDasharray: `${overallPercent}, 100` }}
              transition={{ type: "spring", stiffness: 150, damping: 16 }}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[8.5px] font-black text-amber-300 drop-shadow-sm">
            {allDone ? '✓' : `${overallPercent}%`}
          </span>
        </div>

        {/* Layer Content (Deck Title vs Active Step Progress) */}
        <div className="flex items-center gap-2 overflow-hidden">
          <AnimatePresence mode="wait">
            {!isOpen ? (
              <motion.div
                key="layer-title"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-2 min-w-0"
              >
                {deckTitle && (
                  <span className="text-xs font-black tracking-tight text-slate-100 truncate max-w-[120px] xs:max-w-[170px] md:max-w-[240px] drop-shadow-xs">
                    {deckTitle}
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 text-[9px] font-black tracking-wider uppercase shrink-0 shadow-[0_0_10px_rgba(249,115,22,0.4)]">
                  {allDone ? '✓ XONG' : `BƯỚC ${currentStepIndex + 1}/${pipeline.length}`}
                </span>
              </motion.div>
            ) : (
              <motion.div
                key="layer-step"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-2 text-xs text-white min-w-0"
              >
                <span className="text-sm shrink-0">{meta.emoji}</span>
                <span className="font-extrabold text-[11.5px] text-amber-300 truncate max-w-[120px] xs:max-w-[180px]">
                  {currentStep ? (currentStep.label || meta.label) : 'Hoàn Thành'}
                </span>
                {hasSubProg && (
                  <span className="bg-orange-500/30 border border-orange-400/40 text-orange-200 px-2 py-0.5 rounded-full text-[9.5px] font-black shrink-0 shadow-inner">
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
              initial={{ opacity: 0, y: 0, scale: 0.5 }}
              animate={{ opacity: 1, y: -22, scale: 1.15 }}
              exit={{ opacity: 0, y: -30, scale: 0.8 }}
              transition={{ duration: 0.75, ease: "easeOut" }}
              className="absolute right-2 top-0 pointer-events-none flex items-center gap-1 text-[9.5px] font-black text-slate-950 bg-gradient-to-r from-amber-300 to-orange-400 border border-amber-200 px-2.5 py-0.5 rounded-full shadow-[0_0_15px_rgba(251,191,36,0.6)] z-50"
            >
              <Sparkles className="w-3 h-3 text-slate-950 fill-slate-950 animate-spin" />
              <span>+1 Tiến Bộ!</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Cyberpunk Glass Popover Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute left-0 top-full mt-2.5 w-76 xs:w-84 bg-slate-950/95 backdrop-blur-3xl border border-slate-800 rounded-3xl p-4 shadow-[0_20px_60px_rgba(0,0,0,0.8)] z-[300] space-y-3.5"
          >
            {/* Header of Dropdown */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
              <div className="flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
                <span className="text-[10.5px] font-black uppercase text-slate-400 tracking-wider">Tiến Độ Lộ Trình Hôm Nay</span>
              </div>
              <Link to={`/flashcard/${deckId}/roadmap`} className="text-[10.5px] font-bold text-amber-400 hover:text-amber-300 underline">
                Cài Đặt Lộ Trình ➔
              </Link>
            </div>

            {/* Active Sub-Progress Bar inside Dropdown */}
            {!allDone && currentStep && (
              <div className="space-y-1.5 bg-slate-900/90 p-2.5 rounded-2xl border border-slate-800/80 shadow-inner">
                <div className="flex items-center justify-between text-xs font-extrabold">
                  <span className="text-slate-200 flex items-center gap-1.5">
                    <span>{meta.emoji}</span>
                    <span>{currentStep.label || meta.label}</span>
                  </span>
                  <span className="text-amber-400 font-black">
                    {hasSubProg ? `${subProgressCurr}/${subProgressTotal} (${subPercent}%)` : `${subPercent}%`}
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden relative">
                  <motion.div
                    className={cn("h-full rounded-full bg-gradient-to-r", meta.bgGradient)}
                    initial={{ width: '0%' }}
                    animate={{ width: `${subPercent}%` }}
                    transition={{ type: "spring", stiffness: 180, damping: 18 }}
                  />
                </div>
              </div>
            )}

            {/* List of Steps in Pipeline */}
            <div className="space-y-2 pt-0.5">
              {pipeline.map((st, idx) => {
                const isDone = st.done || (idx < currentStepIndex)
                const isCurrent = idx === currentStepIndex && !allDone
                const m = STEP_META[st.type] || STEP_META.new_cards

                return (
                  <div
                    key={idx}
                    className={cn(
                      "p-3 rounded-2xl border text-xs flex items-center justify-between gap-3 transition-all",
                      isDone ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-200" :
                      isCurrent ? "bg-amber-500/10 border-orange-500/60 text-amber-200 font-black ring-1 ring-orange-500/40 shadow-[0_0_15px_rgba(249,115,22,0.2)]" :
                      "bg-slate-900/40 border-slate-800/60 text-slate-500 opacity-60"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-base shrink-0">{isDone ? '✓' : m.emoji}</span>
                      <div>
                        <div className="font-bold text-[12px] text-white">{st.label || m.label}</div>
                        <div className="text-[9.5px] text-slate-400 font-medium">Bước {idx + 1}/{pipeline.length}</div>
                      </div>
                    </div>
                    <span className={cn(
                      "text-[10px] font-black px-2.5 py-0.5 rounded-full border shrink-0",
                      isDone ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" :
                      isCurrent ? "bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 border-orange-400 font-black shadow-[0_0_10px_rgba(249,115,22,0.4)]" :
                      "bg-slate-800 text-slate-400 border-slate-700"
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
