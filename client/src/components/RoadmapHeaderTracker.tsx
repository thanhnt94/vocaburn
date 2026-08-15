import React, { useState, useEffect, useRef, useMemo } from 'react'
import { ArrowLeft, Clock, Flame, Trophy, Zap, Check, ChevronRight, X, Sparkles, BookOpen, Brain, Target, ShieldCheck } from 'lucide-react'
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

const STEP_META: Record<string, { emoji: string; label: string; icon: React.ComponentType<{ className?: string }> }> = {
  new_cards: { emoji: '🎴', label: 'Học Từ Mới', icon: Sparkles },
  fsrs_review: { emoji: '🔄', label: 'Ôn Tập FSRS', icon: Brain },
  mcq: { emoji: '🎯', label: 'Trắc Nghiệm', icon: Target },
  typing: { emoji: '⌨️', label: 'Gõ Từ Vựng', icon: BookOpen },
  study_time: { emoji: '⏱️', label: 'Thời Gian Học', icon: Clock }
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
  const [isSurging, setIsSurging] = useState(false)
  const prevCurrRef = useRef(subProgressCurr)

  // Local Timer tracking if refs provided
  const [localCardTime, setLocalCardTime] = useState(0)
  const [localSessionStudyTime, setLocalSessionStudyTime] = useState(0)

  // Reset card timer on index change
  useEffect(() => {
    setLocalCardTime(0)
    if (timeLeftRef) timeLeftRef.current = 0
  }, [currentIndex, timeLeftRef])

  // Sync ref
  useEffect(() => {
    if (timeLeftRef) timeLeftRef.current = localCardTime
  }, [localCardTime, timeLeftRef])

  useEffect(() => {
    if (sessionStudyTimeRef) sessionStudyTimeRef.current = localSessionStudyTime
  }, [localSessionStudyTime, sessionStudyTimeRef])

  // Timer interval
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

  return (
    <div className={cn("relative w-full flex items-center justify-between gap-2 md:gap-4 select-none min-w-0", className)}>
      {/* FULL-HEIGHT POWER SURGE EXPANSION OVERLAY (XUẤT HIỆN KHI +1 THẺ MỚI - FULL COVERAGE) */}
      <AnimatePresence>
        {isSurging && (
          <motion.div
            initial={{ opacity: 0, scaleY: 0.1 }}
            animate={{ opacity: 1, scaleY: 1 }}
            exit={{ opacity: 0, scaleY: 0.1 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className={cn(
              "fixed inset-x-0 top-0 h-[52px] sm:h-[56px] bg-slate-950 flex items-center justify-center overflow-hidden z-[250] border-b shadow-2xl",
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
                <Zap className="w-5 h-5 text-cyan-300 fill-cyan-300 animate-bounce" />
              ) : isGoalReached ? (
                <Trophy className="w-5 h-5 text-emerald-300 fill-emerald-300 animate-bounce" />
              ) : (
                <Flame className="w-5 h-5 text-amber-300 fill-amber-300 animate-bounce" />
              )}
              <span>{praiseMsg}</span>
              {hasSubProg && (
                <span className={cn(
                  "px-3 py-0.5 rounded-full border text-xs font-black shadow-md flex items-center gap-1",
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

      {/* 1. LEFT SECTION: Exit Button & Deck Identity */}
      <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-shrink-0 z-[140]">
        {onExit && (
          <button
            onClick={onExit}
            className="w-8 h-8 rounded-xl bg-slate-900/90 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-800/80 hover:border-rose-500/40 flex items-center justify-center transition-all duration-200 active:scale-95 shadow-sm group"
            title="Thoát phiên học (Về trang chủ)"
          >
            <X className="w-4 h-4 transition-transform group-hover:scale-110" />
          </button>
        )}

        <div className="flex flex-col min-w-0 max-w-[130px] sm:max-w-[200px] md:max-w-[260px]">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400/90 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 shrink-0 hidden sm:inline-flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" />
              <span>ROADMAP</span>
            </span>
            <h1 className="text-xs md:text-sm font-black text-slate-100 tracking-tight truncate drop-shadow-sm" title={deckTitle}>
              {deckTitle || 'Phiên Học Lộ Trình'}
            </h1>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold">
            <span className="text-amber-400 font-extrabold">Bước {currentStepIndex + 1}</span>
            <span className="text-slate-600">/</span>
            <span>{pipeline.length}</span>
            <span className="text-slate-600">•</span>
            <span className="truncate text-slate-300 font-semibold">{currentStep?.label || meta.label}</span>
          </div>
        </div>
      </div>

      {/* 2. CENTER SECTION: Interactive Pipeline Stepper & Progress Badge */}
      <div className="flex-1 flex items-center justify-center min-w-0 px-1 md:px-2 z-[140]">
        {/* Desktop Pipeline Pills (sm+) */}
        <div className="hidden lg:flex items-center gap-1.5 p-1 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)] backdrop-blur-md">
          {pipeline.map((step, idx) => {
            const stepMeta = STEP_META[step.type] || STEP_META.new_cards
            const isCurrent = idx === currentStepIndex
            const isCompleted = idx < currentStepIndex || Boolean(step.done)
            
            return (
              <React.Fragment key={step.type || idx}>
                <div
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all duration-300",
                    isCurrent
                      ? "bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-amber-500/20 border border-amber-500/50 text-white shadow-[0_0_15px_rgba(245,158,11,0.25)]"
                      : isCompleted
                        ? "bg-emerald-950/40 border border-emerald-500/30 text-emerald-400"
                        : "bg-slate-950/40 border border-slate-800/40 text-slate-500"
                  )}
                >
                  <span className="text-xs">{stepMeta.emoji}</span>
                  <span className={cn(
                    "font-extrabold text-[11px] whitespace-nowrap",
                    isCurrent ? "text-amber-300" : isCompleted ? "text-emerald-300" : "text-slate-400"
                  )}>
                    {step.label || stepMeta.label}
                  </span>

                  {isCurrent && hasSubProg && (
                    <span className={cn(
                      "ml-1 px-1.5 py-0.2 rounded-md text-[10px] font-black border tracking-tight shadow-xs",
                      isOverachieved
                        ? "bg-cyan-950/80 border-cyan-400/80 text-cyan-300"
                        : isGoalReached
                          ? "bg-emerald-950/80 border-emerald-400/60 text-emerald-300"
                          : "bg-amber-950/80 border-amber-400/60 text-amber-300"
                    )}>
                      {isOverachieved ? `+${extraCount}` : `${subProgressCurr}/${subProgressTotal}`}
                    </span>
                  )}

                  {isCompleted && !isCurrent && (
                    <div className="w-3.5 h-3.5 rounded-full bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-emerald-400 stroke-[3]" />
                    </div>
                  )}
                </div>

                {idx < pipeline.length - 1 && (
                  <ChevronRight className="w-3 h-3 text-slate-700 shrink-0" />
                )}
              </React.Fragment>
            )
          })}
        </div>

        {/* Mobile / Tablet Compact Active Pill */}
        <div className="flex lg:hidden items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900/90 border border-slate-800/90 shadow-md backdrop-blur-md">
          {/* Stepper Dots */}
          <div className="flex items-center gap-1 mr-1">
            {pipeline.map((_, idx) => (
              <div
                key={idx}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  idx === currentStepIndex
                    ? "w-3.5 bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.7)]"
                    : idx < currentStepIndex
                      ? "w-1.5 bg-emerald-400"
                      : "w-1.5 bg-slate-700"
                )}
              />
            ))}
          </div>

          <div className="w-[1px] h-3 bg-slate-700 mx-0.5" />

          {/* Active Step Label + Emoji */}
          <div className="flex items-center gap-1 text-xs font-black text-white">
            <span>{meta.emoji}</span>
            <span className="text-amber-300 font-extrabold text-[11px] truncate max-w-[90px] xs:max-w-[120px]">
              {currentStep?.label || meta.label}
            </span>
          </div>

          {/* Sub Progress Counter */}
          {hasSubProg && (
            <>
              <div className="w-[1px] h-3 bg-slate-700 mx-0.5" />
              <div className="flex items-center gap-0.5 text-xs font-black">
                {isGoalReached && <Trophy className="w-3 h-3 text-emerald-400 fill-emerald-400 mr-0.5 shrink-0" />}
                <span className={isGoalReached ? "text-emerald-400" : "text-amber-400"}>
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
        </div>
      </div>

      {/* 3. RIGHT SECTION: Pro Live HUD Widgets (Timer, XP Score, Streak Flame) */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 z-[140]">
        {/* HUD Item 1: Live Card/Session Timer */}
        <div
          onClick={onToggleTimeMode}
          className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 border border-emerald-500/30 hover:border-emerald-500/50 shadow-sm cursor-pointer active:scale-95 transition-all group backdrop-blur-md"
          title={
            timeMode === 'card'
              ? "Thời gian làm thẻ này - Bấm để chuyển sang thời gian học hôm nay"
              : timeMode === 'today'
                ? "Thời gian học trong ngày - Bấm để chuyển sang tổng thời gian"
                : "Tổng thời gian học toàn bộ - Bấm để chuyển sang thời gian thẻ này"
          }
        >
          <div className="w-5 h-5 rounded-lg bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.2)]">
            <Clock className="w-3 h-3 animate-pulse text-emerald-400" />
          </div>
          <div className="flex flex-col min-w-0 text-left">
            <span className="text-[7px] font-black uppercase tracking-wider text-emerald-400/80 leading-none">
              {timeMode === 'card' ? 'CARD' : timeMode === 'today' ? 'TODAY' : 'TOTAL'}
            </span>
            <div className="h-3 overflow-hidden relative min-w-[24px]">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={displayTime}
                  initial={{ y: 8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -8, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 350, damping: 18 }}
                  className="text-[10px] sm:text-[11px] font-black text-slate-100 leading-none block font-mono"
                >
                  {displayTime}
                </motion.span>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* HUD Item 2: XP / Gamification Score */}
        <div
          onClick={onToggleScoreMode}
          className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 border border-amber-500/30 hover:border-amber-500/50 shadow-sm cursor-pointer active:scale-95 transition-all group backdrop-blur-md"
          title={
            scoreMode === 'all'
              ? "Tổng điểm XP - Bấm để xem XP hôm nay"
              : "Điểm XP hôm nay - Bấm để xem tổng XP"
          }
        >
          <div className="w-5 h-5 rounded-lg bg-amber-950/80 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-[0_0_8px_rgba(245,158,11,0.2)]">
            <Trophy className="w-3 h-3 text-amber-400" />
          </div>
          <div className="flex flex-col min-w-0 text-left">
            <span className="text-[7px] font-black uppercase tracking-wider text-amber-400/80 leading-none">
              {scoreMode === 'all' ? 'TOTAL XP' : 'TODAY XP'}
            </span>
            <div className="h-3 overflow-hidden relative min-w-[24px]">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={scoreMode === 'all' ? xp : todayXP}
                  initial={{ y: 8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -8, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 350, damping: 18 }}
                  className="text-[10px] sm:text-[11px] font-black text-amber-300 leading-none block font-mono"
                >
                  {scoreMode === 'all' ? xp.toLocaleString() : todayXP.toLocaleString()}
                </motion.span>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* HUD Item 3: Streak Flame */}
        {streakCount > 0 && (
          <div
            className="flex items-center gap-1 px-2 py-1 rounded-xl bg-gradient-to-r from-orange-950/60 to-amber-950/60 border border-orange-500/40 shadow-sm backdrop-blur-md"
            title={`Chuỗi học liên tục ${streakCount} ngày!`}
          >
            <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500 animate-pulse shrink-0 drop-shadow-[0_0_6px_rgba(249,115,22,0.6)]" />
            <span className="text-[11px] font-black text-orange-400 font-mono">
              {streakCount}d
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

