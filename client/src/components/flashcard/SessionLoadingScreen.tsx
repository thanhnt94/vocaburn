import React, { useState, useEffect } from 'react'
import { Brain, Sparkles, ArrowLeft, CheckCircle2 } from 'lucide-react'

export interface SessionLoadingScreenProps {
  progress?: number
  statusText?: string
  subText?: string
  modeTitle?: string
  onCancel?: () => void
}

export const SessionLoadingScreen: React.FC<SessionLoadingScreenProps> = ({
  progress,
  statusText,
  subText,
  modeTitle = 'PRACTICE SESSION',
  onCancel
}) => {
  const [tipIndex, setTipIndex] = useState(0)
  const [simulatedProgress, setSimulatedProgress] = useState(12)
  const [displayProgress, setDisplayProgress] = useState(12)

  const tips = [
    "Full-deck randomization challenges your brain for instant active recall.",
    "Spaced repetition strengthens long-term memory retrieval up to 10x.",
    "Reflex training in MCQ sharpens test response time for JLPT exams.",
    "Consistent daily practice keeps your streak flame burning bright! 🔥",
    "Active recall is proven to be 300% more effective than passive reading."
  ]

  useEffect(() => {
    const timer = setInterval(() => {
      setTipIndex(prev => (prev + 1) % tips.length)
    }, 2800)
    return () => clearInterval(timer)
  }, [tips.length])

  // Internal smooth progress runner when network progress is not yet provided or estimating
  useEffect(() => {
    if (progress !== undefined) return

    const interval = setInterval(() => {
      setSimulatedProgress(prev => {
        if (prev < 40) return prev + 4
        if (prev < 75) return prev + 2
        if (prev < 92) return prev + 1
        return prev
      })
    }, 120)

    return () => clearInterval(interval)
  }, [progress])

  // Smoothly interpolate displayProgress towards target
  const target = progress !== undefined ? Math.min(100, Math.max(0, progress)) : simulatedProgress

  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayProgress(prev => {
        if (prev < target) {
          const step = Math.max(1, Math.ceil((target - prev) / 3))
          return Math.min(target, prev + step)
        }
        if (prev > target) {
          return target
        }
        return prev
      })
    }, 30)

    return () => clearInterval(interval)
  }, [target])

  const isDone = displayProgress >= 100

  return (
    <div className="h-screen h-[100dvh] flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-100 text-slate-800 p-6 selection:bg-indigo-100 overflow-hidden relative">
      {/* Background glow effects */}
      <div className="absolute top-1/4 -left-12 w-64 h-64 bg-indigo-300/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-12 w-64 h-64 bg-purple-300/15 rounded-full blur-3xl pointer-events-none" />

      {/* Main Glass Card */}
      <div className="relative flex flex-col items-center w-full max-w-sm text-center p-8 bg-white/85 backdrop-blur-xl rounded-3xl shadow-2xl shadow-indigo-100/70 border border-white/70">
        
        {/* Mode Pill Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 mb-5 text-[11px] font-black uppercase tracking-wider rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200/60 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-spin duration-3000" />
          <span>{modeTitle}</span>
        </div>

        {/* Central Animated Icon */}
        <div className="relative mb-5 flex items-center justify-center w-18 h-18 bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 rounded-2xl shadow-lg shadow-indigo-300/40 text-white transition-transform duration-300 hover:scale-105">
          {isDone ? (
            <CheckCircle2 className="w-9 h-9 text-white animate-bounce" />
          ) : (
            <Brain className="w-9 h-9 text-white animate-pulse" />
          )}
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500" />
          </span>
        </div>

        {/* Percentage Number Display */}
        <div className="flex items-baseline justify-center mb-3">
          <span className="text-5xl font-black tracking-tight text-slate-800 tabular-nums">
            {Math.round(displayProgress)}
          </span>
          <span className="text-2xl font-black text-indigo-600 ml-1">%</span>
        </div>

        {/* Modern Shimmer Progress Bar */}
        <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/80 shadow-inner mb-4 relative">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 transition-all duration-150 ease-out relative shadow-sm"
            style={{ width: `${Math.min(100, Math.max(0, displayProgress))}%` }}
          >
            <div className="absolute inset-0 bg-white/20 animate-pulse" />
          </div>
        </div>

        {/* Dynamic Status Text */}
        <h3 className="text-sm font-bold text-slate-700 tracking-wide mb-1">
          {statusText || (isDone ? "Ready! Launching session..." : "Loading session data...")}
        </h3>
        <p className="text-xs font-medium text-slate-400 mb-6">
          {subText || "Loading full deck for complete randomness"}
        </p>

        {/* Rotating Inspiring Tip */}
        <div className="w-full pt-4 border-t border-slate-100 flex items-center justify-center min-h-[46px]">
          <p className="text-xs font-semibold text-slate-500 px-2 leading-relaxed transition-opacity duration-300">
            {tips[tipIndex]}
          </p>
        </div>
      </div>

      {/* Return Button if loading takes time or user changed mind */}
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="mt-6 flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors py-2 px-4 rounded-xl hover:bg-slate-200/50"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Deck</span>
        </button>
      )}
    </div>
  )
}
