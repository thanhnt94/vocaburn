import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Clock, Flame, Trophy, Zap, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { PipelineStepStatus } from '@/hooks/useRoadmapStatus'

export interface RoadmapHeaderTrackerProps {
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

  // Navigation & Exit
  onExit?: () => void

  // Timer Props
  timeMode?: 'card' | 'today' | 'all'
  onToggleTimeMode?: () => void
  initialTodayTime?: number
  initialAllTimeTime?: number
  showFeedback?: boolean
  hasRated?: boolean
  currentIndex?: number
  timeLeftRef?: React.MutableRefObject<number>
  sessionStudyTimeRef?: React.MutableRefObject<number>
  formatHeaderTime?: (secs: number) => string

  // XP & Gamification Props
  scoreMode?: 'all' | 'today'
  onToggleScoreMode?: () => void
  xp?: number
  todayXP?: number
  sessionXP?: number
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
  onViewModeChange,
  onExit,
  timeMode = 'card',
  onToggleTimeMode,
  initialTodayTime = 0,
  initialAllTimeTime = 0,
  showFeedback = false,
  hasRated = false,
  currentIndex = 0,
  timeLeftRef,
  sessionStudyTimeRef,
  formatHeaderTime,
  scoreMode = 'today',
  onToggleScoreMode,
  xp = 0,
  todayXP = 0,
  sessionXP = 0
}) => {
  // Toggle State: 0 = Nấc 1 (Tên bộ thẻ), 1 = Nấc 2 (Chỉ số bước học)
  const [viewMode, setViewMode] = useState<0 | 1>(0)
  const [isSurging, setIsSurging] = useState(false)
  const prevCurrRef = useRef(subProgressCurr)

  // Local Timer tracking
  const [localCardTime, setLocalCardTime] = useState(0)
  const [localSessionStudyTime, setLocalSessionStudyTime] = useState(0)

  useEffect(() => {
    setLocalCardTime(0)
    if (timeLeftRef) timeLeftRef.current = 0
  }, [currentIndex, timeLeftRef])

  useEffect(() => {
    if (timeLeftRef) timeLeftRef.current = localCardTime
  }, [localCardTime, timeLeftRef])

  useEffect(() => {
    if (sessionStudyTimeRef) sessionStudyTimeRef.current = localSessionStudyTime
  }, [localSessionStudyTime, sessionStudyTimeRef])

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.hidden || !document.hasFocus()) return
      if (showFeedback || hasRated) return

      setLocalCardTime(prev => prev + 1)
      setLocalSessionStudyTime(prev => prev + 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [showFeedback, hasRated])

  const defaultFormatTime = (secs: number) => {
    if (secs < 60) return `${secs}s`
    const m = Math.floor(secs / 60)
    const s = secs % 60
    if (m < 60) return `${m}m ${s < 10 ? '0' : ''}${s}s`
    const h = Math.floor(m / 60)
    const remM = m % 60
    return `${h}h ${remM}m`
  }

  const formatTime = formatHeaderTime || defaultFormatTime

  const displayTime = useMemo(() => {
    if (timeMode === 'card') {
      return `${localCardTime}s`
    }
    const baseTime = timeMode === 'today' ? initialTodayTime : initialAllTimeTime
    return formatTime(baseTime + localSessionStudyTime)
  }, [timeMode, localCardTime, localSessionStudyTime, initialTodayTime, initialAllTimeTime, formatTime])

  const displayScore = useMemo(() => {
    const val = scoreMode === 'all' ? xp : todayXP
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`
    if (val >= 10000) return `${(val / 1000).toFixed(1)}k`
    return val.toLocaleString()
  }, [scoreMode, xp, todayXP])

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
    <div className={cn("relative w-full flex items-center justify-between gap-2 md:gap-4 select-none min-w-0 h-9", className)}>
      {/* POWER SURGE EXPANSION OVERLAY */}
      <AnimatePresence>
        {isSurging && (
          <motion.div
            initial={{ opacity: 0, scaleY: 0.1 }}
            animate={{ opacity: 1, scaleY: 1 }}
            exit={{ opacity: 0, scaleY: 0.1 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className={cn(
              "fixed inset-x-0 top-0 h-[48px] bg-slate-950 flex items-center justify-center overflow-hidden z-[250] border-b shadow-2xl",
              isOverachieved
                ? "border-cyan-400/70 shadow-cyan-950/50"
                : isGoalReached 
                  ? "border-emerald-400/60 shadow-emerald-950/40" 
                  : "border-amber-500/50"
            )}
          >
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
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: '200%' }}
              transition={{ duration: 1.2, ease: "easeInOut", repeat: 1, repeatType: "reverse" }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none"
            />
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: [0.85, 1.15, 1], opacity: 1 }}
              transition={{ duration: 0.45 }}
              className="relative z-10 font-black text-white text-xs sm:text-sm tracking-wider flex items-center gap-2.5 drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)]"
            >
              {isOverachieved ? (
                <Zap className="w-4 h-4 text-cyan-300 fill-cyan-300 animate-bounce" />
              ) : isGoalReached ? (
                <Trophy className="w-4 h-4 text-emerald-300 fill-emerald-300 animate-bounce" />
              ) : (
                <Flame className="w-4 h-4 text-amber-300 fill-amber-300 animate-bounce" />
              )}
              <span>{praiseMsg}</span>
              {hasSubProg && (
                <span className={cn(
                  "px-2.5 py-0.5 rounded-full border text-xs font-black shadow-md",
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

      {/* 1. LEFT: Exit button */}
      <div className="flex items-center flex-shrink-0 z-[140]">
        {onExit && (
          <button
            onClick={onExit}
            className="w-7 h-7 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-rose-300 border border-slate-800 hover:border-slate-700 flex items-center justify-center transition-all active:scale-95"
            title="Thoát phiên học"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 2. CENTER: Interactive Flip Capsule (Bấm để chuyển giữa Tên bộ thẻ & Chỉ số bài học) */}
      <div 
        onClick={toggleViewMode}
        className="flex-1 flex items-center justify-center min-w-0 px-1 z-[140] cursor-pointer"
        title="Bấm để chuyển đổi giữa Tên bộ thẻ & Chỉ số bài học"
      >
        <div className="flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-900/70 hover:bg-slate-900/90 border border-slate-800/80 hover:border-slate-700 backdrop-blur-md text-xs shadow-sm transition-all select-none">
          <AnimatePresence mode="wait">
            {viewMode === 0 ? (
              /* NẤC 1: TÊN BỘ THẺ + DOTS */
              <motion.div
                key="nac-title"
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-2 min-w-0"
              >
                <h1 className="text-xs sm:text-sm font-bold text-slate-200 tracking-tight truncate max-w-[180px] xs:max-w-[240px] sm:max-w-[340px] md:max-w-[440px]" title={deckTitle}>
                  {deckTitle || 'Phiên Học Lộ Trình'}
                </h1>

                <div className="w-[1px] h-3 bg-slate-800 shrink-0" />

                {/* Step Dots */}
                <div className="flex items-center gap-1 shrink-0" title={`Bước ${currentStepIndex + 1}/${pipeline.length}`}>
                  {pipeline.map((_, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "h-1.5 rounded-full transition-all duration-300",
                        idx === currentStepIndex
                          ? "w-3 bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)]"
                          : idx < currentStepIndex
                            ? "w-1.5 bg-emerald-400"
                            : "w-1.5 bg-slate-700"
                      )}
                    />
                  ))}
                </div>
              </motion.div>
            ) : (
              /* NẤC 2: CHỈ SỐ BÀI HỌC */
              <motion.div
                key="nac-stats"
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-2 min-w-0"
              >
                {/* Step Dots */}
                <div className="flex items-center gap-1 shrink-0" title={`Bước ${currentStepIndex + 1}/${pipeline.length}`}>
                  {pipeline.map((_, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "h-1.5 rounded-full transition-all duration-300",
                        idx === currentStepIndex
                          ? "w-3 bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)]"
                          : idx < currentStepIndex
                            ? "w-1.5 bg-emerald-400"
                            : "w-1.5 bg-slate-700"
                      )}
                    />
                  ))}
                </div>

                <div className="w-[1px] h-3 bg-slate-800 shrink-0" />

                {/* Active Step Label */}
                <div className="flex items-center gap-1 font-bold text-slate-100 shrink-0">
                  <span className="text-xs">{meta.emoji}</span>
                  <span className="font-extrabold text-[11px] text-amber-300 truncate max-w-[130px] sm:max-w-none">
                    {currentStep?.label || meta.label}
                  </span>
                </div>

                {/* Counter */}
                {hasSubProg && (
                  <>
                    <div className="w-[1px] h-3 bg-slate-800 shrink-0" />
                    <div className="flex items-center gap-0.5 font-bold font-mono text-[11px] shrink-0">
                      {isGoalReached && <Trophy className="w-3 h-3 text-emerald-400 fill-emerald-400 mr-0.5 shrink-0" />}
                      <span className={isGoalReached ? "text-emerald-400 font-extrabold" : "text-amber-400 font-extrabold"}>
                        {isOverachieved ? `+${extraCount}` : subProgressCurr}
                      </span>
                      {!isOverachieved && (
                        <>
                          <span className="text-slate-600">/</span>
                          <span className="text-slate-400">{subProgressTotal}</span>
                        </>
                      )}
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 3. RIGHT: One Unified Clean HUD Bar (Timer | XP | Streak) */}
      <div className="flex items-center flex-shrink-0 z-[140]">
        <div className="flex items-center gap-2 sm:gap-2.5 px-2.5 py-1 rounded-full bg-slate-900/70 border border-slate-800/80 backdrop-blur-md shadow-sm text-xs">
          {/* Timer */}
          <div
            onClick={onToggleTimeMode}
            className="flex items-center gap-1 text-emerald-400 font-bold font-mono cursor-pointer active:scale-95 transition-transform"
            title={
              timeMode === 'card'
                ? "Thời gian làm thẻ này (Bấm để đổi)"
                : timeMode === 'today'
                  ? "Thời gian học hôm nay (Bấm để đổi)"
                  : "Tổng thời gian học (Bấm để đổi)"
            }
          >
            <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={displayTime}
                initial={{ y: 5, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -5, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="text-[11px] font-extrabold"
              >
                {displayTime}
              </motion.span>
            </AnimatePresence>
          </div>

          <div className="w-[1px] h-3 bg-slate-800" />

          {/* XP */}
          <div
            onClick={onToggleScoreMode}
            className="flex items-center gap-1 text-amber-300 font-bold font-mono cursor-pointer active:scale-95 transition-transform"
            title={scoreMode === 'all' ? "Tổng XP (Bấm để đổi)" : "XP hôm nay (Bấm để đổi)"}
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={displayScore}
                initial={{ y: 5, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -5, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="text-[11px] font-extrabold"
              >
                {displayScore}
              </motion.span>
            </AnimatePresence>
          </div>

          {/* Streak */}
          {streakCount > 0 && (
            <>
              <div className="w-[1px] h-3 bg-slate-800" />
              <div
                className="flex items-center gap-1 text-orange-400 font-bold font-mono"
                title={`Chuỗi ${streakCount} ngày liên tục`}
              >
                <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500 shrink-0 animate-pulse" />
                <span className="text-[11px] font-extrabold">{streakCount}d</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}


