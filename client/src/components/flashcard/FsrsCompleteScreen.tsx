import React, { useEffect, useMemo } from 'react'
import { Brain, Clock, RefreshCw, BookOpen, Flame, Sparkles } from 'lucide-react'
import confetti from 'canvas-confetti'

export interface FsrsCompleteScreenProps {
  fsrsCompletionData: any
  session: any
  deckId: string | undefined
  activeMode?: string
  onFreeReview: () => void
  onViewDeckDetail: () => void
  onBackToLibrary: () => void
  onSwitchMode?: (mode: string) => void
}

export const FsrsCompleteScreen: React.FC<FsrsCompleteScreenProps> = ({
  fsrsCompletionData,
  session,
  activeMode,
  onFreeReview,
  onViewDeckDetail,
  onBackToLibrary,
  onSwitchMode
}) => {
  const nextDueText = fsrsCompletionData?.next_due_text || 'In a few hours'
  const totalCards = fsrsCompletionData?.total_cards || session?.questions?.length || 0
  const learnedCards = fsrsCompletionData?.learned_cards ?? totalCards
  const customMessage = fsrsCompletionData?.message

  const isNoLearned = fsrsCompletionData?.learned_cards === 0
  const isNewCardsCompleted = (activeMode === 'new') || (fsrsCompletionData?.unlearned_count === 0 && fsrsCompletionData?.phase === 'completed')

  const screenTitle = isNoLearned
    ? "📚 NO LEARNED CARDS YET"
    : isNewCardsCompleted
    ? "🎉 ALL NEW CARDS LEARNED!"
    : "🎉 ALL DUE CARDS COMPLETED!"

  const screenSubtitle = customMessage || (
    isNoLearned
      ? "You haven't learned any cards in this deck yet. Start by learning new cards first!"
      : isNewCardsCompleted
      ? "Congratulations! You have studied all brand-new cards in this deck."
      : "You have completed all scheduled cards for review in this deck today."
  )

  const showCountdown = !isNoLearned && !isNewCardsCompleted && Boolean(fsrsCompletionData?.next_due_text)

  // Celebratory confetti on completion
  useEffect(() => {
    if (!isNoLearned) {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.65 },
        colors: ['#f97316', '#6366f1', '#10b981', '#ec4899', '#f59e0b']
      })
    }
  }, [isNoLearned])

  // Mascot Motivation Quotes
  const praiseQuote = useMemo(() => {
    const quotes = [
      "Incredible Recall! Your synaptic pathways are firing at maximum efficiency.",
      "Daily Goal Smashed! Consistent deliberate practice compounds into mastery.",
      "Memory Stability +28%! FSRS v6 has recalibrated your optimal intervals.",
      "Brain Power Surge! Another learning milestone conquered with ease.",
      "Unstoppable Focus! You're forging long-term memory traces."
    ]
    return quotes[Math.floor(Math.random() * quotes.length)]
  }, [])

  return (
    <div className="flex-1 bg-white dark:bg-slate-900 md:rounded-[2rem] rounded-[1.25rem] border border-slate-100 dark:border-slate-800 p-6 md:p-10 flex flex-col items-center justify-center text-center gap-5 shadow-2xl shadow-indigo-100/40 dark:shadow-none min-h-[480px] w-full max-w-xl mx-auto my-auto animate-in zoom-in-95 duration-300">
      {/* Brain / Mascot Glow Badge */}
      <div className="relative">
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center shadow-xl border bg-gradient-to-tr from-orange-500 via-rose-500 to-indigo-600 text-white border-orange-300 shadow-orange-200 dark:shadow-none">
          <Flame className="w-10 h-10 animate-bounce" />
        </div>
        <span className="absolute -top-1 -right-1 flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500 items-center justify-center text-[9px] text-white font-black">★</span>
        </span>
      </div>

      {/* Title & Subtitle */}
      <div className="space-y-2 max-w-md">
        <h2 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
          {screenTitle}
        </h2>
        <p className="text-xs md:text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
          {screenSubtitle}
        </p>
      </div>

      {/* Mascot Motivational Praise Pill */}
      {!isNoLearned && (
        <div className="w-full max-w-md bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 rounded-2xl p-3 flex items-center gap-2.5 text-left text-amber-900 dark:text-amber-200 text-xs font-semibold">
          <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{praiseQuote}</span>
        </div>
      )}

      {/* FSRS Waiting / Countdown Card (if applicable) */}
      {showCountdown && (
        <div className="w-full max-w-md bg-gradient-to-br from-indigo-50/90 via-purple-50/50 to-pink-50/40 dark:from-indigo-950/40 dark:via-purple-950/30 dark:to-slate-900 border border-indigo-100 dark:border-indigo-900/50 rounded-3xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-center gap-1.5 text-indigo-700 dark:text-indigo-300 font-bold text-xs">
            <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-pulse" />
            <span className="uppercase tracking-wider">Next review due in:</span>
          </div>
          <div className="text-2xl md:text-3xl font-black text-indigo-900 dark:text-indigo-100 tracking-tight py-1">
            ⏳ {nextDueText}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-xs mx-auto">
            Optimal review intervals are calculated by FSRS v6 based on your memory stability and retention target.
          </p>
        </div>
      )}

      {/* Mini Stats Summary */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-md">
        <div className="bg-slate-50 dark:bg-slate-800/70 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Learned</span>
          <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 block mt-0.5">
            {learnedCards}/{totalCards}
          </span>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/70 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Unlearned</span>
          <span className="text-xl font-black text-indigo-600 dark:text-indigo-400 block mt-0.5">
            {Math.max(0, totalCards - learnedCards)}
          </span>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/70 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Status</span>
          <span className="text-xl font-black text-purple-600 dark:text-purple-400 block mt-0.5">
            {isNoLearned ? "Ready 🚀" : "Optimal 🧠"}
          </span>
        </div>
      </div>

      {/* Large Thumb-Reachable Action Buttons */}
      <div className="w-full max-w-md space-y-3 pt-2">
        {isNoLearned ? (
          <button
            onClick={() => onSwitchMode ? onSwitchMode('new') : onFreeReview()}
            className="w-full py-4 px-6 bg-gradient-to-r from-orange-500 via-rose-500 to-indigo-600 hover:from-orange-600 hover:to-indigo-700 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl shadow-orange-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Brain className="w-4 h-4" />
            <span>✨ Start Learning New Cards</span>
          </button>
        ) : isNewCardsCompleted ? (
          <button
            onClick={() => onSwitchMode ? onSwitchMode('review') : onFreeReview()}
            className="w-full py-4 px-6 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-700 hover:to-purple-800 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl shadow-indigo-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>📚 Continuous Review (Learned Cards)</span>
          </button>
        ) : (
          <button
            onClick={onFreeReview}
            className="w-full py-4 px-6 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-700 hover:to-purple-800 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl shadow-indigo-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>🔄 Free Practice (Card Skim)</span>
          </button>
        )}

        <button
          onClick={onViewDeckDetail}
          className="w-full py-3.5 px-4 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
        >
          <BookOpen className="w-4 h-4 text-orange-500" />
          <span>View Deck Details & Stats</span>
        </button>

        <button
          onClick={onBackToLibrary}
          className="w-full py-3 px-4 rounded-xl bg-slate-100/60 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-750 text-slate-500 dark:text-slate-400 font-bold text-xs active:scale-95 transition-all cursor-pointer"
        >
          Back to Library
        </button>
      </div>
    </div>
  )
}

export default FsrsCompleteScreen
