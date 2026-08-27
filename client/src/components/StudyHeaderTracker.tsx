import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Clock, Flame, Trophy, Zap, X, Target, Sparkles, Brain, Gauge, ArrowRightLeft } from 'lucide-react'
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
}

const MODE_META_DICT: Record<string, { emoji: string; label: string; short: string; style: string }> = {
  roadmap: { 
    emoji: '🛣️', 
    label: 'Roadmap Guided', 
    short: 'RM',
    style: 'bg-amber-500/15 border-amber-500/30 text-amber-300'
  },
  roadmap_new: { 
    emoji: '🛣️', 
    label: 'Roadmap - New Cards', 
    short: 'RM',
    style: 'bg-amber-500/15 border-amber-500/30 text-amber-300'
  },
  roadmap_review: { 
    emoji: '🛣️', 
    label: 'Roadmap - Review', 
    short: 'RM',
    style: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
  },
  new_cards: { 
    emoji: '✨', 
    label: 'Learn New Cards', 
    short: 'NEW',
    style: 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300'
  },
  new: { 
    emoji: '✨', 
    label: 'Learn New Cards', 
    short: 'NEW',
    style: 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300'
  },
  fsrs_review: { 
    emoji: '🧠', 
    label: 'FSRS Review', 
    short: 'FSRS',
    style: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
  },
  fsrs: { 
    emoji: '🧠', 
    label: 'FSRS v6 Spaced Repetition', 
    short: 'FSRS',
    style: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
  },
  review: { 
    emoji: '📚', 
    label: 'Review Only', 
    short: 'REV',
    style: 'bg-teal-500/15 border-teal-500/30 text-teal-300'
  },
  rev: { 
    emoji: '📚', 
    label: 'Review Only', 
    short: 'REV',
    style: 'bg-teal-500/15 border-teal-500/30 text-teal-300'
  },
  flip: { 
    emoji: '🔄', 
    label: 'Free Flip Mode', 
    short: 'FLIP',
    style: 'bg-amber-500/15 border-amber-500/30 text-amber-300'
  },
  mcq: { 
    emoji: '🎯', 
    label: 'Multiple Choice MCQ', 
    short: 'MCQ',
    style: 'bg-rose-500/15 border-rose-500/30 text-rose-300'
  },
  roadmap_mcq: { 
    emoji: '🎯', 
    label: 'Roadmap MCQ', 
    short: 'MCQ',
    style: 'bg-rose-500/15 border-rose-500/30 text-rose-300'
  },
  typing: { 
    emoji: '⌨️', 
    label: 'Typing Mode', 
    short: 'TYP',
    style: 'bg-purple-500/15 border-purple-500/30 text-purple-300'
  },
  roadmap_typing: { 
    emoji: '⌨️', 
    label: 'Roadmap Typing', 
    short: 'TYP',
    style: 'bg-purple-500/15 border-purple-500/30 text-purple-300'
  },
  listening: { 
    emoji: '🎧', 
    label: 'Listening Mode', 
    short: 'LIS',
    style: 'bg-sky-500/15 border-sky-500/30 text-sky-300'
  },
  audio: { 
    emoji: '🎧', 
    label: 'Listening Mode', 
    short: 'LIS',
    style: 'bg-sky-500/15 border-sky-500/30 text-sky-300'
  },
  study_time: { 
    emoji: '⏱️', 
    label: 'Study Time', 
    short: 'TIME',
    style: 'bg-amber-500/15 border-amber-500/30 text-amber-300'
  },
  roadmap_test: { 
    emoji: '🏆', 
    label: 'Roadmap Test', 
    short: 'TEST',
    style: 'bg-amber-500/15 border-amber-500/30 text-amber-300'
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
  progressPillText
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
              "fixed inset-x-0 top-0 h-[48px] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center overflow-hidden z-[250] border-b shadow-2xl",
              isOverachieved
                ? "border-cyan-400/70 shadow-cyan-950/50"
                : isGoalReached 
                  ? "border-emerald-400/60 shadow-emerald-950/40" 
                  : "border-amber-500/50 shadow-amber-950/40"
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
              className="relative z-10 font-black text-white text-xs sm:text-sm tracking-wider flex items-center gap-2 drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]"
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
                  {isOverachieved ? `+${extraCount}` : (progressPillText || `${subProgressCurr} / ${subProgressTotal}`)}
                </span>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. LEFT: Exit button */}
      <div className="flex items-center shrink-0 z-[140]">
        {onExit && (
          <button
            onClick={onExit}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-rose-300 border border-slate-800 hover:border-slate-700 flex items-center justify-center transition-all active:scale-95 shrink-0 shadow-sm cursor-pointer"
            title="Exit session"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 2. FULL BAR FLIP CONTAINER */}
      <div 
        onClick={toggleViewMode}
        className="flex-1 flex items-center min-w-0 h-full cursor-pointer z-[140]"
        title="Click to toggle between Deck Info ⇄ Live HUD Stats"
      >
        <div className="w-full h-full flex items-center rounded-full bg-slate-900/80 hover:bg-slate-900/95 border border-slate-800 hover:border-slate-700/80 px-2.5 sm:px-3.5 backdrop-blur-md shadow-sm transition-all overflow-hidden relative">
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
                {/* Left side of Face 1: Deck Title */}
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="text-xs shrink-0">{meta.emoji || '🎴'}</span>
                  <h1 className="text-xs sm:text-sm font-bold text-slate-100 tracking-tight truncate" title={deckTitle}>
                    {deckTitle || 'Vocaburn Study Session'}
                  </h1>
                </div>

                {/* Right side of Face 1: Mode + Step Dots + Progress + Flip Hint */}
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
                              ? "w-3 bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)]"
                              : idx < (currentStepIndex || 0)
                                ? "w-1.5 bg-emerald-400"
                                : "w-1.5 bg-slate-700"
                          )}
                        />
                      ))}
                    </div>
                  )}

                  {/* Mode Badge (Ultra-clean acronym: NEW, FSRS, REV, FLIP, MCQ, TYP, LIS, TEST, RM) */}
                  <div 
                    className={cn(
                      "flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-xs font-black shrink-0 tracking-wide shadow-sm",
                      meta.style || "bg-amber-500/15 border-amber-500/30 text-amber-300"
                    )}
                    title={currentStep?.label || meta.label}
                  >
                    <span className="text-[10px] sm:text-xs">{meta.emoji}</span>
                    <span className="text-[10px] sm:text-[11px] font-black">
                      {meta.short}
                    </span>
                  </div>

                  {/* Micro Progress Counter Pill */}
                  <div className="flex items-center gap-1 text-[10px] sm:text-xs font-black font-mono tracking-tight text-slate-300 bg-slate-950/80 px-2 py-0.5 rounded-md border border-slate-800/90 shrink-0">
                    {progressPillText ? (
                      <span className={cn(
                        isOverachieved ? "text-cyan-300" : isGoalReached ? "text-emerald-400" : "text-amber-300 font-bold"
                      )}>
                        {progressPillText}
                      </span>
                    ) : (
                      <>
                        <span className={cn(
                          isOverachieved ? "text-cyan-300" : isGoalReached ? "text-emerald-400" : "text-slate-100"
                        )}>
                          {hasSubProg ? subProgressCurr : (currentIndex + 1)}
                        </span>
                        <span className="text-slate-600 font-normal">/</span>
                        <span className="text-slate-400">
                          {hasSubProg ? subProgressTotal : (totalCards || '--')}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            ) : (
              /* ========================================================================= */
              /* FACE 2: SEGMENTED NEON DOCK (Full Live HUD Dashboard)                     */
              /* ========================================================================= */
              <motion.div
                key="face-stats-hud"
                initial={{ opacity: 0, rotateX: -90 }}
                animate={{ opacity: 1, rotateX: 0 }}
                exit={{ opacity: 0, rotateX: 90 }}
                transition={{ duration: 0.18, ease: "easeInOut" }}
                className="w-full flex items-center justify-between gap-1 sm:gap-1.5 text-xs min-w-0 font-mono"
              >
                {/* 1. Segment: Timer (Card & Today) */}
                <div 
                  className="flex-1 flex items-center justify-center gap-1 sm:gap-1.5 py-1 px-1.5 sm:px-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-emerald-300 transition-all shadow-xs group min-w-0" 
                  title="Card timer & Today's study time"
                >
                  <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0 animate-pulse group-hover:scale-110 transition-transform" />
                  <span className="font-black text-[11px] tracking-tight">{displayCardTime}</span>
                  <span className="text-emerald-500/40 hidden sm:inline">•</span>
                  <span className="text-emerald-400/80 text-[10px] hidden sm:inline font-semibold" title="Today's study time">{displayTodayTime}</span>
                </div>

                {/* 2. Segment: Progress & Remaining */}
                <div 
                  className="flex-1 flex items-center justify-center gap-1 sm:gap-1.5 py-1 px-1.5 sm:px-2 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/25 text-indigo-300 transition-all shadow-xs group min-w-0" 
                  title="Current card progress"
                >
                  <Target className="w-3.5 h-3.5 text-indigo-400 shrink-0 group-hover:scale-110 transition-transform" />
                  <span className="font-black text-[11px] text-slate-100 tracking-tight truncate">
                    {hasSubProg ? `${subProgressCurr}/${subProgressTotal}` : `${currentIndex + 1}/${totalCards || '--'}`}
                  </span>
                  {cardsRemaining > 0 && (
                    <span className="text-indigo-400/70 text-[9.5px] hidden md:inline font-semibold">({cardsRemaining} left)</span>
                  )}
                </div>

                {/* 3. Segment: Accuracy % */}
                {accuracyPercent !== null && (
                  <div 
                    className="flex-1 hidden sm:flex items-center justify-center gap-1 sm:gap-1.5 py-1 px-1.5 sm:px-2 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/25 text-teal-300 transition-all shadow-xs group min-w-0" 
                    title={`Accuracy: ${correctCount}/${answeredCount} correct`}
                  >
                    <Gauge className="w-3.5 h-3.5 text-teal-400 shrink-0 group-hover:scale-110 transition-transform" />
                    <span className={cn(
                      "font-black text-[11px] tracking-tight",
                      accuracyPercent >= 80 ? "text-emerald-300" : accuracyPercent >= 60 ? "text-amber-300" : "text-rose-300"
                    )}>
                      {accuracyPercent}%
                    </span>
                  </div>
                )}

                {/* 4. Segment: Avg Speed */}
                {avgSpeed && (
                  <div 
                    className="hidden lg:flex items-center justify-center gap-1 py-1 px-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/25 text-cyan-300 transition-all shadow-xs group shrink-0" 
                    title="Average time per card"
                  >
                    <Zap className="w-3 h-3 text-cyan-400 shrink-0 group-hover:scale-110 transition-transform" />
                    <span className="font-black text-[10px] text-cyan-200">{avgSpeed}/c</span>
                  </div>
                )}

                {/* 5. Segment: XP Score */}
                <div 
                  className="flex-1 flex items-center justify-center gap-1 sm:gap-1.5 py-1 px-1.5 sm:px-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-amber-300 transition-all shadow-xs group min-w-0" 
                  title={`Session: +${sessionXP} XP | Total: ${xp.toLocaleString()} XP`}
                >
                  <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0 group-hover:scale-110 transition-transform" />
                  <span className="font-black text-[11px] text-amber-300 tracking-tight">
                    {sessionXP > 0 ? `+${sessionXP}` : displayTotalXP}
                  </span>
                  <span className="text-[9.5px] text-amber-400/80 font-bold">XP</span>
                </div>

                {/* 6. Segment: Streak Flame */}
                {streakCount > 0 && (
                  <div 
                    className="flex-1 flex items-center justify-center gap-1 sm:gap-1.5 py-1 px-1.5 sm:px-2 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/25 text-orange-300 transition-all shadow-xs group min-w-0" 
                    title={`Streak: ${streakCount} consecutive days`}
                  >
                    <Flame className="w-3.5 h-3.5 text-orange-400 fill-orange-400 shrink-0 animate-pulse group-hover:scale-110 transition-transform" />
                    <span className="font-black text-[11px] text-orange-300 tracking-tight">{streakCount}d</span>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
