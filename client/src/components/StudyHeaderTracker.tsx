import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Clock, Flame, Trophy, Zap, X, Target, Sparkles, Brain, Gauge, ArrowRightLeft, ArrowUpDown, Shuffle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { PipelineStepStatus } from '@/hooks/useRoadmapStatus'

export interface StudyHeaderTrackerProps {
  pipeline?: PipelineStepStatus[]
  currentStepIndex?: number
  allDone?: boolean
  deckId?: string | number
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

  // Live Study Performance Stats
  answeredCount?: number
  correctCount?: number
  totalCards?: number
  cardsRemaining?: number
  activeMode?: string
  modeBadge?: { emoji: string; label: string; short: string; style: string }
  progressPillText?: string
  comboStreak?: number
  isRandom?: boolean
  onToggleOrder?: () => void
  onOpenStudyConsole?: () => void
}

const MODE_META_DICT: Record<string, { emoji: string; label: string; short: string; style: string }> = {
  speed_skim: { 
    emoji: '⚡', 
    label: 'Speed Skim', 
    short: 'SKIM',
    style: 'bg-amber-50 text-amber-950 border border-amber-300/80 shadow-2xs hover:bg-amber-100/90'
  },
  skim: { 
    emoji: '⚡', 
    label: 'Speed Skim', 
    short: 'SKIM',
    style: 'bg-amber-50 text-amber-950 border border-amber-300/80 shadow-2xs hover:bg-amber-100/90'
  },
  roadmap: { 
    emoji: '🛣️', 
    label: 'Roadmap Guided', 
    short: 'RM',
    style: 'bg-teal-50 text-teal-950 border border-teal-300/80 shadow-2xs hover:bg-teal-100/90'
  },
  roadmap_new: { 
    emoji: '🛣️', 
    label: 'Roadmap - New Cards', 
    short: 'RM',
    style: 'bg-teal-50 text-teal-950 border border-teal-300/80 shadow-2xs hover:bg-teal-100/90'
  },
  roadmap_review: { 
    emoji: '🛣️', 
    label: 'Roadmap - Review', 
    short: 'RM',
    style: 'bg-teal-50 text-teal-950 border border-teal-300/80 shadow-2xs hover:bg-teal-100/90'
  },
  new_cards: { 
    emoji: '✨', 
    label: 'Learn New Cards', 
    short: 'NEW',
    style: 'bg-indigo-50 text-indigo-950 border border-indigo-300/80 shadow-2xs hover:bg-indigo-100/90'
  },
  new: { 
    emoji: '✨', 
    label: 'Learn New Cards', 
    short: 'NEW',
    style: 'bg-indigo-50 text-indigo-950 border border-indigo-300/80 shadow-2xs hover:bg-indigo-100/90'
  },
  fsrs_review: { 
    emoji: '🧠', 
    label: 'FSRS Review', 
    short: 'FSRS',
    style: 'bg-emerald-50 text-emerald-950 border border-emerald-300/80 shadow-2xs hover:bg-emerald-100/90'
  },
  fsrs: { 
    emoji: '🧠', 
    label: 'FSRS v6 Spaced Repetition', 
    short: 'FSRS',
    style: 'bg-emerald-50 text-emerald-950 border border-emerald-300/80 shadow-2xs hover:bg-emerald-100/90'
  },
  review: { 
    emoji: '📚', 
    label: 'Review Only', 
    short: 'REV',
    style: 'bg-sky-50 text-sky-950 border border-sky-300/80 shadow-2xs hover:bg-sky-100/90'
  },
  rev: { 
    emoji: '📚', 
    label: 'Review Only', 
    short: 'REV',
    style: 'bg-sky-50 text-sky-950 border border-sky-300/80 shadow-2xs hover:bg-sky-100/90'
  },
  flip: { 
    emoji: '🔄', 
    label: 'Free Flip Mode', 
    short: 'FLIP',
    style: 'bg-slate-100 text-slate-900 border border-slate-300/80 shadow-2xs hover:bg-slate-200/90'
  },
  mcq: { 
    emoji: '🎯', 
    label: 'Multiple Choice MCQ', 
    short: 'MCQ',
    style: 'bg-rose-50 text-rose-950 border border-rose-300/80 shadow-2xs hover:bg-rose-100/90'
  },
  roadmap_mcq: { 
    emoji: '🎯', 
    label: 'Roadmap MCQ', 
    short: 'MCQ',
    style: 'bg-rose-50 text-rose-950 border border-rose-300/80 shadow-2xs hover:bg-rose-100/90'
  },
  typing: { 
    emoji: '⌨️', 
    label: 'Typing Mode', 
    short: 'TYP',
    style: 'bg-purple-50 text-purple-950 border border-purple-300/80 shadow-2xs hover:bg-purple-100/90'
  },
  roadmap_typing: { 
    emoji: '⌨️', 
    label: 'Roadmap Typing', 
    short: 'TYP',
    style: 'bg-purple-50 text-purple-950 border border-purple-300/80 shadow-2xs hover:bg-purple-100/90'
  },
  listening: { 
    emoji: '🎧', 
    label: 'Listening Mode', 
    short: 'LIS',
    style: 'bg-cyan-50 text-cyan-950 border border-cyan-300/80 shadow-2xs hover:bg-cyan-100/90'
  },
  audio: { 
    emoji: '🎧', 
    label: 'Listening Mode', 
    short: 'LIS',
    style: 'bg-cyan-50 text-cyan-950 border border-cyan-300/80 shadow-2xs hover:bg-cyan-100/90'
  },
  study_time: { 
    emoji: '⏱️', 
    label: 'Study Time', 
    short: 'TIME',
    style: 'bg-amber-50 text-amber-950 border border-amber-300/80 shadow-2xs hover:bg-amber-100/90'
  },
  roadmap_test: { 
    emoji: '🏆', 
    label: 'Roadmap Test', 
    short: 'TEST',
    style: 'bg-amber-50 text-amber-950 border border-amber-300/80 shadow-2xs hover:bg-amber-100/90'
  }
}

const OVERACHIEVE_PRAISES = [
  "⚡ OUTSTANDING EFFORT!",
  "🚀 GOAL CRUSHED!",
  "👑 LIMIT BREAKER!",
  "🔥 ON FIRE!"
]

export const StudyHeaderTracker: React.FC<StudyHeaderTrackerProps> = ({
  pipeline,
  currentStepIndex = 0,
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
  sessionXP = 0,
  answeredCount = 0,
  correctCount = 0,
  totalCards = 0,
  cardsRemaining = 0,
  activeMode,
  modeBadge,
  progressPillText,
  comboStreak = 0,
  isRandom = false,
  onToggleOrder,
  onOpenStudyConsole
}) => {
  // 0 = Mặt 1 (Tên bộ thẻ & Chế độ học), 1 = Mặt 2 (Toàn bộ các thông số chi tiết HUD)
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

  const displayCardTime = useMemo(() => `${localCardTime}s`, [localCardTime])
  const displayTodayTime = useMemo(() => formatTime(initialTodayTime + localSessionStudyTime), [initialTodayTime, localSessionStudyTime, formatTime])

  const displayTotalXP = useMemo(() => {
    if (xp >= 1000000) return `${(xp / 1000000).toFixed(1)}M`
    if (xp >= 10000) return `${(xp / 1000).toFixed(1)}k`
    return xp.toLocaleString()
  }, [xp])

  // Accuracy calculation
  const accuracyPercent = useMemo(() => {
    if (answeredCount === 0) return null
    return Math.round((correctCount / answeredCount) * 100)
  }, [answeredCount, correctCount])

  // Average speed (seconds per card)
  const avgSpeed = useMemo(() => {
    if (answeredCount === 0 || localSessionStudyTime === 0) return null
    const secPerCard = (localSessionStudyTime / answeredCount).toFixed(1)
    return `${secPerCard}s`
  }, [answeredCount, localSessionStudyTime])

  // Universal Fallback Pipeline (Always active for any deck or study mode)
  const effectivePipeline: PipelineStepStatus[] = useMemo(() => {
    if (pipeline && pipeline.length > 0) return pipeline;
    const modeKey = activeMode || 'fsrs';
    const meta = MODE_META_DICT[modeKey] || MODE_META_DICT.fsrs_review;
    return [{
      type: (['new_cards', 'fsrs_review', 'mcq', 'typing', 'study_time'].includes(modeKey) ? modeKey : 'fsrs_review') as any,
      label: meta.label,
      daily_count: subProgressTotal || totalCards || 20,
      done: false,
      url: '',
      progress: {}
    }];
  }, [pipeline, activeMode, subProgressTotal, totalCards]);

  const currentStep = effectivePipeline[Math.min(currentStepIndex || 0, effectivePipeline.length - 1)] || null
  const meta = modeBadge || (activeMode && MODE_META_DICT[activeMode]) || (currentStep ? (MODE_META_DICT[currentStep.type] || MODE_META_DICT.new_cards) : MODE_META_DICT.new_cards)

  const hasSubProg = typeof subProgressCurr === 'number' && typeof subProgressTotal === 'number' && subProgressTotal > 0
  const subPercent = hasSubProg ? Math.min(100, Math.round((subProgressCurr / subProgressTotal) * 100)) : 0
  const isGoalReached = hasSubProg && subProgressCurr >= subProgressTotal
  const extraCount = hasSubProg && subProgressCurr > subProgressTotal ? subProgressCurr - subProgressTotal : 0
  const isOverachieved = extraCount > 0

  const praiseMsg = isOverachieved 
    ? OVERACHIEVE_PRAISES[(extraCount - 1) % OVERACHIEVE_PRAISES.length] 
    : (isGoalReached ? 'DAILY GOAL REACHED!' : 'VOCAB PROGRESS!')

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
    <div className={cn("relative w-full flex items-center gap-2 select-none min-w-0 h-9", className)}>
      {/* POWER SURGE EXPANSION OVERLAY */}
      <AnimatePresence>
        {isSurging && (
          <motion.div
            initial={{ opacity: 0, scaleY: 0.1 }}
            animate={{ opacity: 1, scaleY: 1 }}
            exit={{ opacity: 0, scaleY: 0.1 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className={cn(
              "fixed inset-x-0 top-0 h-[48px] bg-white/95 backdrop-blur-xl flex items-center justify-center overflow-hidden z-[250] border-b shadow-lg pointer-events-none",
              isOverachieved
                ? "border-cyan-400/70"
                : isGoalReached 
                  ? "border-emerald-400/60" 
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
                    : "bg-gradient-to-r from-amber-600 via-orange-500 to-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.9)]"
              )}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: '200%' }}
              transition={{ duration: 1.2, ease: "easeInOut", repeat: 1, repeatType: "reverse" }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none"
            />
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: [0.9, 1.08, 1], opacity: 1 }}
              transition={{ duration: 0.35 }}
              className="relative z-10 font-black text-slate-800 text-xs sm:text-sm tracking-wider flex items-center gap-2 drop-shadow-sm"
            >
              {isOverachieved ? (
                <Zap className="w-4 h-4 text-cyan-600 fill-cyan-500 animate-bounce" />
              ) : isGoalReached ? (
                <Trophy className="w-4 h-4 text-emerald-600 fill-emerald-500 animate-bounce" />
              ) : (
                <Flame className="w-4 h-4 text-amber-600 fill-amber-500 animate-bounce" />
              )}
              <span>{praiseMsg}</span>
              {hasSubProg && (
                <span className={cn(
                  "px-2.5 py-0.5 rounded-full border text-xs font-black shadow-xs",
                  isOverachieved
                    ? "bg-cyan-50 border-cyan-300 text-cyan-700"
                    : isGoalReached 
                      ? "bg-emerald-50 border-emerald-300 text-emerald-700" 
                      : "bg-amber-50 border-amber-300 text-amber-700"
                )}>
                  {isOverachieved ? `+${extraCount}` : (progressPillText || `${subProgressCurr} / ${subProgressTotal}`)}
                </span>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. LEFT: Exit button (always on top and clickable) */}
      <div className="flex items-center shrink-0 z-[260] relative pointer-events-auto">
        {onExit && (
          <button
            onClick={onExit}
            className="w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-xl bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200/90 hover:border-rose-200 flex items-center justify-center transition-all active:scale-95 shrink-0 shadow-xs cursor-pointer"
            title="Exit session"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 2. FULL BAR FLIP CONTAINER */}
      <div 
        onClick={toggleViewMode}
        className="flex-1 flex items-center min-w-0 h-full cursor-pointer z-[140] group"
        title="Click to toggle between Deck Info ⇄ Live HUD Stats"
      >
        <div className="w-full h-full flex items-center rounded-full bg-white/90 hover:bg-white border border-slate-200/90 hover:border-indigo-200/90 px-2.5 sm:px-3.5 backdrop-blur-md shadow-xs shadow-indigo-100/30 transition-all overflow-hidden relative">
          <AnimatePresence mode="wait" initial={false}>
            {viewMode === 0 ? (
              /* ========================================================================= */
              /* FACE 1: DECK TITLE & MODE                                                 */
              /* ========================================================================= */
              <motion.div
                key="face-deck-title"
                initial={{ opacity: 0, rotateX: 90 }}
                animate={{ opacity: 1, rotateX: 0 }}
                exit={{ opacity: 0, rotateX: -90 }}
                transition={{ duration: 0.18, ease: "easeInOut" }}
                className="w-full flex items-center justify-between gap-2 min-w-0"
              >
                {/* Left side of Face 1: Deck Title with vibrant accent dot */}
                <div className="flex items-center min-w-0 flex-1 pl-0.5 gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 shadow-[0_0_6px_rgba(99,102,241,0.5)] shrink-0 animate-pulse" />
                  <h1 className="text-xs sm:text-sm font-extrabold text-slate-800 tracking-tight truncate" title={deckTitle}>
                    {deckTitle || 'Vocaburn Study Session'}
                  </h1>
                </div>

                {/* Right side of Face 1: Mode + Step Dots + Progress */}
                <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
                  {/* Step Stepper Dots */}
                  {effectivePipeline.length > 1 && (
                    <div className="flex items-center gap-1 shrink-0" title={`Step ${(currentStepIndex || 0) + 1}/${effectivePipeline.length}`}>
                      {effectivePipeline.map((_, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            "h-1.5 rounded-full transition-all duration-300",
                            idx === currentStepIndex
                              ? "w-3.5 bg-gradient-to-r from-indigo-500 to-purple-600 shadow-[0_0_8px_rgba(99,102,241,0.5)]"
                              : idx < (currentStepIndex || 0)
                                ? "w-1.5 bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.4)]"
                                : "w-1.5 bg-slate-200"
                          )}
                        />
                      ))}
                    </div>
                  )}

                  {/* Mode & Order Dual-Segmented Capsule */}
                  <div className="flex items-center p-0.5 rounded-xl bg-slate-100/90 border border-slate-200/90 shadow-2xs gap-1 shrink-0">
                    {/* Segment 1: Mode Badge - Clickable to open Study Console Modal */}
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onOpenStudyConsole?.()
                      }}
                      className={cn(
                        "flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-black shrink-0 tracking-tight transition-all",
                        onOpenStudyConsole ? "cursor-pointer hover:opacity-90 active:scale-95" : "",
                        meta.style || "bg-amber-50 text-amber-950 border border-amber-300/80"
                      )}
                      title={onOpenStudyConsole ? `${currentStep?.label || meta.label} • Click to switch mode` : currentStep?.label || meta.label}
                    >
                      <span className="text-[10px] sm:text-xs leading-none">{meta.emoji}</span>
                      <span className="text-[10px] sm:text-[11px] font-black tracking-tight">
                        {meta.short}
                      </span>
                    </button>

                    {/* Segment 2: Order Indicator (⇅ SEQ vs 🔀 RND) - Clickable to toggle Order */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (onToggleOrder) {
                          onToggleOrder()
                        } else {
                          onOpenStudyConsole?.()
                        }
                      }}
                      className={cn(
                        "flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[9px] sm:text-[10px] font-black shrink-0 tracking-tight transition-all cursor-pointer active:scale-95",
                        isRandom 
                          ? "bg-violet-600 text-white shadow-2xs hover:bg-violet-700" 
                          : "bg-white text-slate-700 border border-slate-200/90 hover:bg-slate-50 hover:text-slate-900 shadow-2xs"
                      )}
                      title={isRandom ? "Shuffle: ON (Random Order) • Click to toggle" : "Order: Sequential (In-Order) • Click to toggle"}
                    >
                      {isRandom ? (
                        <>
                          <Shuffle className="w-2.5 h-2.5 stroke-[2.5]" />
                          <span className="font-black uppercase tracking-wider">RND</span>
                        </>
                      ) : (
                        <>
                          <ArrowUpDown className="w-2.5 h-2.5 text-slate-400 stroke-[2.5]" />
                          <span className="font-bold uppercase tracking-wider text-slate-600">SEQ</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Combo Streak Flame Badge */}
                  {comboStreak >= 3 && (
                    <div 
                      className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg bg-gradient-to-r from-amber-500 to-rose-500 text-white text-[10px] font-black shrink-0 animate-pulse shadow-2xs"
                      title={`${comboStreak} consecutive correct answers!`}
                    >
                      <Flame className="w-3 h-3 fill-white text-white animate-bounce" />
                      <span>{comboStreak}x</span>
                    </div>
                  )}

                  {/* Micro Progress Counter Pill */}
                  <div className="flex items-center gap-1 text-[10px] sm:text-xs font-black font-mono tracking-tight text-slate-700 bg-slate-50/90 px-2.5 py-0.5 rounded-lg border border-slate-200/90 shadow-2xs shrink-0">
                    {progressPillText ? (
                      <span className={cn(
                        isOverachieved ? "text-cyan-600" : isGoalReached ? "text-emerald-600" : "text-amber-600 font-bold"
                      )}>
                        {progressPillText}
                      </span>
                    ) : (
                      <>
                        <span className={cn(
                          isOverachieved ? "text-cyan-600" : isGoalReached ? "text-emerald-600" : "text-indigo-600 font-extrabold"
                        )}>
                          {hasSubProg ? subProgressCurr : (currentIndex + 1)}
                        </span>
                        <span className="text-slate-300 font-normal">/</span>
                        <span className="text-slate-500 font-bold">
                          {hasSubProg ? subProgressTotal : (totalCards || '--')}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            ) : (
              /* ========================================================================= */
              /* FACE 2: SLEEK & HARMONIOUS LIVE HUD STATS                                 */
              /* ========================================================================= */
              <motion.div
                key="face-stats-hud"
                initial={{ opacity: 0, rotateX: -90 }}
                animate={{ opacity: 1, rotateX: 0 }}
                exit={{ opacity: 0, rotateX: 90 }}
                transition={{ duration: 0.18, ease: "easeInOut" }}
                className="w-full flex items-center justify-around gap-1 text-xs min-w-0 font-mono py-0.5"
              >
                {/* 1. Timer */}
                <div 
                  className="flex items-center justify-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-50/80 border border-emerald-200/50 hover:bg-emerald-100/80 transition-colors shrink-0" 
                  title={`Card: ${displayCardTime} • Today: ${displayTodayTime}`}
                >
                  <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="font-black text-[11px] text-emerald-700 tracking-tight">{displayCardTime}</span>
                  <span className="text-emerald-700/60 text-[9.5px] hidden md:inline font-bold">({displayTodayTime})</span>
                </div>

                <div className="w-[1px] h-3.5 bg-slate-200/80 shrink-0" />

                {/* 2. Progress */}
                <div 
                  className="flex items-center justify-center gap-1.5 px-2 py-0.5 rounded-lg bg-indigo-50/80 border border-indigo-200/50 hover:bg-indigo-100/80 transition-colors shrink-0" 
                  title="Current card progress"
                >
                  <Target className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span className="font-black text-[11px] text-indigo-800 tracking-tight">
                    {hasSubProg ? `${subProgressCurr}/${subProgressTotal}` : `${currentIndex + 1}/${totalCards || '--'}`}
                  </span>
                  {cardsRemaining > 0 && (
                    <span className="text-indigo-600/70 text-[9px] hidden lg:inline font-bold">({cardsRemaining} left)</span>
                  )}
                </div>

                {/* 3. Accuracy (if available) */}
                {accuracyPercent !== null && (
                  <>
                    <div className="w-[1px] h-3.5 bg-slate-200/80 hidden sm:block shrink-0" />
                    <div 
                      className="hidden sm:flex items-center justify-center gap-1.5 px-2 py-0.5 rounded-lg bg-teal-50/80 border border-teal-200/50 hover:bg-teal-100/80 transition-colors shrink-0" 
                      title={`Accuracy: ${correctCount}/${answeredCount} correct`}
                    >
                      <Gauge className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      <span className={cn(
                        "font-black text-[11px] tracking-tight",
                        accuracyPercent >= 80 ? "text-emerald-700" : accuracyPercent >= 60 ? "text-amber-700" : "text-rose-700"
                      )}>
                        {accuracyPercent}%
                      </span>
                    </div>
                  </>
                )}

                {/* 4. Avg Speed (large screens) */}
                {avgSpeed && (
                  <>
                    <div className="w-[1px] h-3.5 bg-slate-200/80 hidden xl:block shrink-0" />
                    <div 
                      className="hidden xl:flex items-center justify-center gap-1 px-2 py-0.5 rounded-lg bg-cyan-50/80 border border-cyan-200/50 hover:bg-cyan-100/80 transition-colors shrink-0" 
                      title="Average speed per card"
                    >
                      <Zap className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                      <span className="font-black text-[10.5px] text-cyan-700">{avgSpeed}/c</span>
                    </div>
                  </>
                )}

                <div className="w-[1px] h-3.5 bg-slate-200/80 shrink-0" />

                {/* 5. XP Score */}
                <div 
                  className="flex items-center justify-center gap-1.5 px-2 py-0.5 rounded-lg bg-amber-50/80 border border-amber-200/50 hover:bg-amber-100/80 transition-colors shrink-0" 
                  title={`Session: +${sessionXP} XP | Total: ${xp.toLocaleString()} XP`}
                >
                  <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="font-black text-[11px] text-amber-800 tracking-tight">
                    {sessionXP > 0 ? `+${sessionXP}` : displayTotalXP}
                  </span>
                  <span className="text-[9px] text-amber-600/80 font-black">XP</span>
                </div>

                {/* 6. Streak or Combo */}
                {(streakCount > 0 || comboStreak >= 3) && (
                  <>
                    <div className="w-[1px] h-3.5 bg-slate-200/80 shrink-0" />
                    <div 
                      className="flex items-center justify-center gap-1.5 px-2 py-0.5 rounded-lg bg-orange-50/80 border border-orange-200/50 hover:bg-orange-100/80 transition-colors shrink-0" 
                      title={comboStreak >= 3 ? `Combo: ${comboStreak} correct streak | Streak: ${streakCount}d` : `Streak: ${streakCount} consecutive days`}
                    >
                      <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500 shrink-0" />
                      <span className="font-black text-[11px] text-orange-700 tracking-tight">
                        {comboStreak >= 3 ? `${comboStreak}x` : `${streakCount}d`}
                      </span>
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
