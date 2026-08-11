import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, ChevronRight, ChevronLeft, Lock } from 'lucide-react'
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
  streakPoints?: number
  userLevel?: number
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
  subProgressTotal,
  streakCount = 0,
  streakPoints = 0,
  userLevel = 1
}) => {
  // Current active slide mode: 0 = Lộ Trình, 1 = Tiến Độ Bước, 2 = Thành Tích & Streak
  const [activeSlide, setActiveSlide] = useState<number>(0)
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

  const totalSlides = 3

  const nextSlide = (e: React.MouseEvent) => {
    e.stopPropagation()
    setActiveSlide((prev) => (prev + 1) % totalSlides)
  }

  const prevSlideHandler = (e: React.MouseEvent) => {
    e.stopPropagation()
    setActiveSlide((prev) => (prev - 1 + totalSlides) % totalSlides)
  }

  return (
    <div className={cn("relative flex items-center select-none", className)}>
      {/* Cyber Glass Header Capsule Slider */}
      <div className="relative flex items-center bg-slate-950/90 hover:bg-slate-950 border border-slate-700/80 rounded-full px-3 py-1.5 backdrop-blur-2xl shadow-[0_4px_25px_rgba(0,0,0,0.35)] transition-all duration-300 max-w-full group">
        
        {/* Left Arrow Button to Cycle Mode */}
        <button
          onClick={prevSlideHandler}
          className="p-1 rounded-full text-slate-400 hover:text-amber-400 hover:bg-slate-800/80 transition-colors shrink-0 cursor-pointer"
          title="Chuyển chế độ xem trước"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {/* Circular SVG Ring Gauge */}
        <div className="relative w-6.5 h-6.5 flex items-center justify-center shrink-0 mx-1">
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
          <span className="absolute inset-0 flex items-center justify-center text-[8.5px] font-black text-amber-300">
            {allDone ? '✓' : `${overallPercent}%`}
          </span>
        </div>

        {/* Slide Content Track */}
        <div 
          onClick={nextSlide}
          className="flex-1 overflow-hidden cursor-pointer min-w-0 px-1.5"
          title="Bấm để chuyển chế độ xem chỉ số cố định"
        >
          <AnimatePresence mode="wait">
            {/* SLIDE 0: Tổng Quan Lộ Trình */}
            {activeSlide === 0 && (
              <motion.div
                key="slide-0"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.18 }}
                className="flex items-center gap-2 min-w-0"
              >
                {deckTitle && (
                  <span className="text-xs font-black tracking-tight text-white truncate max-w-[120px] xs:max-w-[170px]">
                    {deckTitle}
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 text-[9px] font-black uppercase shrink-0 shadow-xs">
                  {allDone ? '✓ XONG' : `BƯỚC ${currentStepIndex + 1}/${pipeline.length}`}
                </span>
              </motion.div>
            )}

            {/* SLIDE 1: Chi Tiết Bước Đang Làm */}
            {activeSlide === 1 && (
              <motion.div
                key="slide-1"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.18 }}
                className="flex items-center gap-2 text-white min-w-0"
              >
                <span className="text-sm shrink-0">{meta.emoji}</span>
                <span className="font-extrabold text-[11px] text-amber-300 truncate max-w-[120px] xs:max-w-[160px]">
                  {currentStep ? (currentStep.label || meta.label) : 'Hoàn Thành'}
                </span>
                {hasSubProg && (
                  <span className="bg-orange-500/20 border border-orange-500/40 text-orange-200 px-2 py-0.5 rounded-full text-[9px] font-black shrink-0">
                    {subProgressCurr}/{subProgressTotal} ({subPercent}%)
                  </span>
                )}
              </motion.div>
            )}

            {/* SLIDE 2: Streak & Thành Tích Gamification */}
            {activeSlide === 2 && (
              <motion.div
                key="slide-2"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.18 }}
                className="flex items-center gap-2 text-white min-w-0"
              >
                <span className="text-orange-400 font-black text-xs flex items-center gap-1 shrink-0">
                  🔥 {streakCount}d Streak
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-amber-300 font-bold text-[11px] shrink-0">
                  ⚡ {streakPoints} điểm
                </span>
                <span className="text-slate-600 hidden xs:inline">•</span>
                <span className="text-emerald-400 font-bold text-[10px] hidden xs:inline shrink-0">
                  🎖️ Lvl {userLevel}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Arrow Button & Indicator Dots */}
        <div className="flex items-center gap-1 shrink-0">
          <div className="flex items-center gap-0.5 px-1">
            {[0, 1, 2].map((idx) => (
              <button
                key={idx}
                onClick={(e) => { e.stopPropagation(); setActiveSlide(idx); }}
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-all cursor-pointer",
                  activeSlide === idx ? "bg-amber-400 w-3" : "bg-slate-700 hover:bg-slate-500"
                )}
                title={`Cố định Slide ${idx + 1}`}
              />
            ))}
          </div>

          <button
            onClick={nextSlide}
            className="p-1 rounded-full text-slate-400 hover:text-amber-400 hover:bg-slate-800/80 transition-colors cursor-pointer"
            title="Chuyển chế độ xem tiếp theo"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <Link
            to={`/flashcard/${deckId}/roadmap`}
            className="p-1 text-slate-400 hover:text-white transition-colors"
            title="Xem cài đặt lộ trình chi tiết"
          >
            <Lock className="w-3 h-3 text-slate-500 hover:text-amber-400" />
          </Link>
        </div>

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
      </div>
    </div>
  )
}
