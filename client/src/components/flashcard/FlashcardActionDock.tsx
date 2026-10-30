import React, { useRef } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  BookOpen,
  TrendingUp,
  Undo2,
  X,
  Sparkles,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCw,
  RotateCcw,
  Volume2,
  RefreshCw,
  Lightbulb,
  Check
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

export interface FlashcardActionDockProps {
  shouldShowFsrsCompleteScreen?: boolean
  mainTab: string
  practiceNeedsSetup: boolean
  practiceSubMode?: string
  typingInput?: string
  handleTypingAnswer?: () => void
  practiceAnswers: Record<number, any>
  currentIndex: number
  totalCards?: number
  activeBottomTab: 'map' | 'flashcard' | 'stats'
  isFeedbackOpen: boolean
  showingHint: boolean
  setShowingHint: (val: boolean) => void
  showActionDock?: boolean
  currentQuestion: any
  isFlipped: boolean
  setIsFlipped: (val: boolean) => void
  setJustAnswered: (val: boolean) => void
  hasRated: boolean
  activeMode: string
  effectiveCardRatingMode: string
  handleReviewRating: (rating: number) => void
  handleNext: () => void
  handleUndoRating: () => void
  activelyRatedCurrentCard: boolean
  isAutoPlayPaused?: boolean
  onToggleAutoPlayPause?: () => void
  onPrevCard?: () => void
  isWakeLockActive?: boolean
  onOpenMap: () => void
  onOpenFlashcard: () => void
  onOpenStats: () => void
  onOpenQuickSettings?: () => void
  onOpenInsights?: () => void
  onTriggerPlayAudio?: () => void
  isLoadingAudio?: boolean
  isPlayingAudio?: boolean
  getFSRSIntervals: (fsrs?: any) => Record<number, string>
  showBottomNavTabs?: boolean
}

export const FlashcardActionDock: React.FC<FlashcardActionDockProps> = ({
  shouldShowFsrsCompleteScreen = false,
  mainTab,
  practiceNeedsSetup,
  practiceSubMode,
  typingInput,
  handleTypingAnswer,
  practiceAnswers,
  currentIndex,
  totalCards,
  activeBottomTab,
  isFeedbackOpen,
  showingHint,
  setShowingHint,
  currentQuestion,
  isFlipped,
  setIsFlipped,
  setJustAnswered,
  hasRated,
  activeMode,
  effectiveCardRatingMode,
  handleReviewRating,
  handleNext,
  handleUndoRating,
  activelyRatedCurrentCard,
  isAutoPlayPaused = false,
  onToggleAutoPlayPause,
  onPrevCard,
  isWakeLockActive = false,
  onOpenMap,
  onOpenFlashcard,
  onOpenStats,
  onOpenQuickSettings,
  onOpenInsights,
  onTriggerPlayAudio,
  isLoadingAudio = false,
  isPlayingAudio = false,
  getFSRSIntervals,
  showActionDock = true,
  showBottomNavTabs = false
}) => {
  const touchStartYRef = useRef<number | null>(null)
  const touchStartXRef = useRef<number | null>(null)

  const handleBarTouchStart = (e: React.TouchEvent | React.PointerEvent) => {
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.PointerEvent).clientY
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.PointerEvent).clientX
    touchStartYRef.current = clientY
    touchStartXRef.current = clientX
  }

  const handleBarTouchEnd = (e: React.TouchEvent | React.PointerEvent) => {
    if (touchStartYRef.current === null) return
    const clientY = 'changedTouches' in e ? e.changedTouches[0].clientY : (e as React.PointerEvent).clientY
    const clientX = 'changedTouches' in e ? e.changedTouches[0].clientX : (e as React.PointerEvent).clientX
    const deltaY = touchStartYRef.current - clientY
    const deltaX = Math.abs(clientX - (touchStartXRef.current || 0))
    touchStartYRef.current = null
    touchStartXRef.current = null

    // Upward swipe threshold: pulled up > 35px, primarily vertical
    if (deltaY > 35 && deltaY > deltaX * 0.8) {
      onOpenQuickSettings?.()
    }
  }
  if (shouldShowFsrsCompleteScreen) return null
  if (mainTab === 'practice' && practiceNeedsSetup) return null

  const isSkimOrFlipMode = activeMode === 'speed_skim' || activeMode === 'skim' || activeMode === 'flip'

  const hasActionButtons = Boolean(
    showActionDock && (
      mainTab === 'practice' ||
      activeMode === 'autoplay' ||
      isSkimOrFlipMode ||
      !isFlipped ||
      (isFlipped && !hasRated && activeMode !== 'autoplay') ||
      (isFlipped && hasRated && activeMode !== 'autoplay')
    )
  );

  return (
    <footer 
      onTouchStart={!showBottomNavTabs ? handleBarTouchStart : undefined}
      onTouchEnd={!showBottomNavTabs ? handleBarTouchEnd : undefined}
      onPointerDown={!showBottomNavTabs ? handleBarTouchStart : undefined}
      onPointerUp={!showBottomNavTabs ? handleBarTouchEnd : undefined}
      className={cn(
        "w-full flex-shrink-0 bg-white/95 backdrop-blur-2xl border-t border-slate-100/80 px-0 pt-0 pb-0 z-[250] shadow-[0_-4px_24px_rgba(99,102,241,0.06)] relative touch-pan-x",
        (isFeedbackOpen || activeBottomTab === 'map' || activeBottomTab === 'stats') ? "fixed bottom-0 inset-x-0 md:relative" : "relative",
        !hasActionButtons && "md:hidden"
      )}
      title={!showBottomNavTabs ? "Swipe up for Quick Settings" : undefined}
    >
      {/* Quick Settings Grabber Pill (Visible on mobile when no bottom tabs; on desktop always visible) */}
      {onOpenQuickSettings && (
        <div 
          onClick={(e) => {
            e.stopPropagation();
            onOpenQuickSettings();
          }}
          className={cn(
            "absolute -top-1.5 left-1/2 -translate-x-1/2 w-9 h-1.5 rounded-full bg-slate-300/80 hover:bg-slate-400 dark:bg-slate-600 cursor-pointer transition-all active:scale-95 z-30",
            !showBottomNavTabs ? "block" : "hidden md:block"
          )}
          title="Click or swipe up for Quick Settings"
        />
      )}
      <div className="max-w-2xl mx-auto w-full flex flex-col">
        {activeBottomTab === 'flashcard' && !isFeedbackOpen && (
          <>
            {/* PRIMARY ACTION ZONE (Single Clean Thumb-Reachable 1-Row Action Bar) */}
            {hasActionButtons && (
              <div className="w-full px-3 sm:px-4 py-2">
              {mainTab === 'practice' ? (
                practiceAnswers[currentIndex] !== undefined ? (
                  <div className="flex gap-2 w-full h-12">
                    {onOpenInsights && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onOpenInsights()
                        }}
                        className="w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 text-amber-500 hover:text-amber-600 transition-all active:scale-95 shadow-xs cursor-pointer"
                        title="Card Insights & AI Explanation"
                      >
                        <Lightbulb className="w-4 h-4 text-amber-500 fill-amber-400/20" />
                      </button>
                    )}
                    <button 
                      onClick={handleNext}
                      className="flex-1 h-12 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white font-black text-xs rounded-2xl shadow-lg shadow-emerald-300/50 flex items-center justify-center gap-2.5 uppercase tracking-widest active:scale-[0.98] transition-all hover:shadow-emerald-400/60 hover:shadow-xl cursor-pointer"
                    >
                      <span>Continue</span>
                      <kbd className="hidden md:inline-flex items-center justify-center px-1.5 py-0.5 text-[9px] font-mono font-bold bg-white/20 text-white rounded border border-white/30">Space / ↵</kbd>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                ) : practiceSubMode === 'typing' ? (
                  <div className="flex gap-2 h-12 w-full">
                    <button
                      onClick={handleNext}
                      className="w-24 h-12 bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100 font-black text-xs rounded-2xl flex items-center justify-center gap-1 uppercase tracking-widest active:scale-[0.98] transition-all cursor-pointer"
                    >
                      Skip
                    </button>
                    <button
                      onClick={() => {
                        if (typingInput && typingInput.trim() && handleTypingAnswer) {
                          handleTypingAnswer()
                        }
                      }}
                      disabled={!typingInput || !typingInput.trim()}
                      className={cn(
                        "flex-1 h-12 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer",
                        typingInput && typingInput.trim()
                          ? "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-indigo-500/25 active:scale-95"
                          : "bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-600 border border-slate-200/60 dark:border-slate-750 cursor-not-allowed opacity-60"
                      )}
                    >
                      <span>Submit Answer</span>
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2 h-12 w-full">
                    <button
                      onClick={handleNext}
                      className="flex-1 h-12 bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100 font-black text-xs rounded-2xl flex items-center justify-center gap-1.5 uppercase tracking-widest active:scale-[0.98] transition-all cursor-pointer"
                    >
                      Skip <ChevronRight className="w-4 h-4" />
                    </button>
                    <div className="flex-[2] h-12 bg-slate-100 text-slate-400 font-black text-xs rounded-2xl flex items-center justify-center uppercase tracking-widest pointer-events-none select-none">
                      Waiting...
                    </div>
                  </div>
                )
              ) : activeMode === 'autoplay' ? (
                /* ── AUTOPLAY HANDS-FREE CONTROLLER ── */
                <div className="w-full flex flex-col gap-1.5">
                  {/* Status row */}
                  <div className="flex items-center justify-between px-1 text-[11px] font-bold">
                    <div className="flex items-center gap-1.5">
                      <span className={cn(
                        "w-2 h-2 rounded-full",
                        isAutoPlayPaused ? "bg-amber-500" : "bg-cyan-500 animate-pulse"
                      )} />
                      <span className="text-cyan-950 font-black tracking-wider uppercase text-[10px]">
                        {isAutoPlayPaused ? 'Paused' : 'Auto Playing...'}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="text-slate-500 text-[10px] font-semibold">
                        {isFlipped ? 'Back' : 'Front'}
                      </span>
                    </div>

                    <div className={cn(
                      "flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase border",
                      isWakeLockActive 
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                        : "bg-slate-50 text-slate-500 border-slate-200"
                    )}>
                      <span className={cn("w-1.5 h-1.5 rounded-full", isWakeLockActive ? "bg-emerald-500" : "bg-slate-400")} />
                      <span>{isWakeLockActive ? 'Screen Awake' : 'Screen Normal'}</span>
                    </div>
                  </div>

                  {/* Controller Action Bar */}
                  <div className="flex items-center gap-2 h-12 sm:h-13 w-full">
                    {/* Prev Card */}
                    <button
                      onClick={onPrevCard}
                      className="h-full px-3.5 sm:px-4 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 border border-slate-200/80 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0"
                      title="Previous Card"
                    >
                      <SkipBack className="w-4 h-4" />
                      <span className="hidden sm:inline">Prev</span>
                    </button>

                    {/* Pause / Resume Button */}
                    <button
                      onClick={onToggleAutoPlayPause}
                      className={cn(
                        "flex-1 h-full text-white font-black text-xs sm:text-sm rounded-2xl shadow-lg flex items-center justify-center gap-2 uppercase tracking-widest active:scale-[0.98] transition-all hover:shadow-xl cursor-pointer",
                        isAutoPlayPaused
                          ? "bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:to-teal-600 shadow-emerald-300/40"
                          : "bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-700 hover:to-indigo-700 shadow-cyan-300/40"
                      )}
                      title={isAutoPlayPaused ? "Resume Auto Play" : "Pause Auto Play"}
                    >
                      {isAutoPlayPaused ? (
                        <>
                          <Play className="w-4 h-4 fill-white" />
                          <span>Resume</span>
                        </>
                      ) : (
                        <>
                          <Pause className="w-4 h-4 fill-white" />
                          <span>Pause</span>
                        </>
                      )}
                      <kbd className="hidden md:inline-flex items-center justify-center px-1.5 py-0.5 text-[9px] font-mono font-bold bg-white/20 text-white rounded border border-white/30">Space</kbd>
                    </button>

                    {/* Manual Flip */}
                    <button
                      onClick={() => {
                        setIsFlipped(!isFlipped);
                        setJustAnswered(true);
                      }}
                      className="h-full px-3 sm:px-3.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 border border-slate-200/80 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer shrink-0"
                      title="Flip Card"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Flip</span>
                    </button>

                    {/* Next Card */}
                    <button
                      onClick={handleNext}
                      className="h-full px-3.5 sm:px-4 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 border border-slate-200/80 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0"
                      title="Next Card"
                    >
                      <span className="hidden sm:inline">Next</span>
                      <SkipForward className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : isSkimOrFlipMode ? (
                /* ─── SKIM / FLIP DOCKED NAVIGATION BAR (Audio, Insights, Settings | Prev, Flip, Next) ─── */
                <div className="w-full flex items-center justify-between gap-1.5 sm:gap-2 h-11 sm:h-12">
                  {/* 1. Audio Button */}
                  {onTriggerPlayAudio && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onTriggerPlayAudio()
                      }}
                      className={cn(
                        "w-10 sm:w-11 h-full rounded-2xl border flex items-center justify-center transition-all active:scale-95 cursor-pointer shrink-0 shadow-xs",
                        isPlayingAudio
                          ? "bg-indigo-600 text-white border-indigo-600 ring-2 ring-indigo-300 animate-pulse"
                          : isLoadingAudio
                          ? "bg-indigo-100 text-indigo-700 border-indigo-200 animate-pulse"
                          : "bg-white hover:bg-indigo-50 text-indigo-600 border-slate-200/80"
                      )}
                      title="Play Pronunciation (Audio)"
                    >
                      {isLoadingAudio ? (
                        <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                      ) : (
                        <Volume2 className={cn("w-4 h-4", isPlayingAudio && "animate-pulse")} />
                      )}
                    </button>
                  )}

                  {/* 2. Lightbulb (Insights / Card Explanation - only after flipped or rated) */}
                  {onOpenInsights && (isFlipped || hasRated) && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onOpenInsights()
                      }}
                      className="w-10 sm:w-11 h-full rounded-2xl bg-white hover:bg-amber-50 text-amber-600 border border-slate-200/80 flex items-center justify-center transition-all active:scale-95 cursor-pointer shrink-0 shadow-xs"
                      title="Card Insights & AI Explanation"
                    >
                      <Lightbulb className="w-4 h-4 text-amber-500 fill-amber-400/20" />
                    </button>
                  )}

                  {/* Vertical Divider */}
                  <div className="w-[1.5px] h-6 bg-slate-200/80 shrink-0 mx-0.5" />

                  {/* 4. Prev Card */}
                  <button
                    type="button"
                    disabled={currentIndex === 0}
                    onClick={(e) => {
                      e.stopPropagation()
                      onPrevCard?.()
                    }}
                    className={cn(
                      "w-10 sm:w-11 h-full rounded-2xl flex items-center justify-center transition-all duration-200 active:scale-90 cursor-pointer shrink-0 border shadow-2xs",
                      currentIndex === 0
                        ? "opacity-30 cursor-not-allowed bg-slate-50 border-slate-200/50 text-slate-400"
                        : "bg-slate-100/90 hover:bg-slate-200 border-slate-200/80 text-slate-700 hover:text-slate-900"
                    )}
                    title="Previous Card"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  {/* 5. Flip Card (Icon Only - RotateCw without raw text) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setIsFlipped(!isFlipped)
                      setJustAnswered(true)
                    }}
                    className={cn(
                      "w-10 sm:w-11 h-full rounded-2xl flex items-center justify-center transition-all duration-200 active:scale-90 cursor-pointer shrink-0 border shadow-2xs",
                      isFlipped
                        ? "bg-amber-50 border-amber-300 text-amber-600 ring-2 ring-amber-200/60"
                        : "bg-slate-100/90 hover:bg-amber-50 border-slate-200/80 text-slate-700 hover:text-amber-600 hover:border-amber-200"
                    )}
                    title={isFlipped ? "Flip to front side" : "Flip to back side"}
                  >
                    <RotateCw className={cn("w-5 h-5 transition-transform duration-300", isFlipped && "rotate-180 text-amber-600")} />
                  </button>

                  {/* 6. Next Card */}
                  <button
                    type="button"
                    onClick={handleNext}
                    className="flex-1 h-full rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/25 active:scale-95 transition-all duration-200 cursor-pointer"
                    title="Next Card"
                  >
                    <span>Next</span>
                    {totalCards ? (
                      <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[10px] font-mono font-bold leading-none">
                        {currentIndex + 1}/{totalCards}
                      </span>
                    ) : null}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              ) : !isFlipped ? (
                /* ─── FRONT FACE (FSRS): FLIP CARD CTA BUTTON + AUDIO / LIGHTBULB / SETTINGS ─── */
                <div className="w-full flex items-center gap-2 h-12 sm:h-13">
                  {/* Audio Button */}
                  {onTriggerPlayAudio && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onTriggerPlayAudio();
                      }}
                      className={cn(
                        "h-full px-3.5 sm:px-4 rounded-2xl border flex items-center justify-center transition-all active:scale-95 cursor-pointer shrink-0 shadow-xs",
                        isPlayingAudio
                          ? "bg-indigo-600 text-white border-indigo-600 ring-2 ring-indigo-300"
                          : isLoadingAudio
                          ? "bg-indigo-100 text-indigo-700 border-indigo-200 animate-pulse"
                          : "bg-white hover:bg-indigo-50 text-indigo-600 border-slate-200/80"
                      )}
                      title="Play Pronunciation (Audio)"
                    >
                      {isLoadingAudio ? (
                        <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                      ) : (
                        <Volume2 className={cn("w-4 h-4", isPlayingAudio && "animate-pulse")} />
                      )}
                    </button>
                  )}

                  {/* Lightbulb (Insights & AI Explanation) */}
                  {onOpenInsights && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenInsights();
                      }}
                      className="h-full px-3.5 sm:px-4 rounded-2xl bg-white hover:bg-amber-50 text-amber-600 border border-slate-200/80 flex items-center justify-center transition-all active:scale-95 cursor-pointer shrink-0 shadow-xs"
                      title="Card Insights & AI Explanation (💡)"
                    >
                      <Lightbulb className="w-4 h-4 text-amber-500 fill-amber-400/20" />
                    </button>
                  )}

                  {/* FLIP CARD CTA BUTTON */}
                  <button 
                    onClick={() => {
                      setIsFlipped(true);
                      setJustAnswered(true);
                    }}
                    className="flex-1 h-full font-black text-xs sm:text-sm rounded-2xl shadow-lg flex items-center justify-center gap-2.5 uppercase tracking-widest active:scale-[0.98] transition-all hover:shadow-xl cursor-pointer text-white bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-indigo-300/50 hover:shadow-indigo-400/60"
                  >
                    <span>FLIP CARD</span>
                    <kbd className="hidden md:inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-mono font-bold bg-white/20 text-white rounded border border-white/30">Space</kbd>
                    <ChevronRight className="w-4 h-4 rotate-90" />
                  </button>
                </div>
              ) : !hasRated && activeMode !== 'autoplay' ? (
                /* ── BACK FACE: UNRATED (4 FSRS BUTTONS) ── */
                <div className="grid grid-cols-4 gap-1.5 sm:gap-2 w-full">

                  {/* AGAIN (1) */}
                  <button
                    onClick={() => handleReviewRating(1)}
                    className="flex flex-col items-center justify-center py-2 sm:py-2.5 px-1 rounded-2xl border border-rose-200 bg-rose-50/80 hover:bg-rose-100/90 text-rose-600 shadow-xs active:scale-95 transition-all cursor-pointer group"
                    title="Shortcut: 1"
                  >
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] sm:text-[11px] font-black tracking-wider uppercase text-rose-600">AGAIN</span>
                      <kbd className="hidden md:inline-flex px-1 py-0.2 text-[8px] font-mono font-black rounded border border-rose-300 bg-rose-100 text-rose-700">1</kbd>
                    </div>
                    <span className="text-[11px] sm:text-xs font-black text-rose-700 mt-0.5">
                      {getFSRSIntervals(currentQuestion?.fsrs)?.[1] || "10m"}
                    </span>
                  </button>

                  {/* HARD (2) */}
                  <button
                    onClick={() => handleReviewRating(2)}
                    className="flex flex-col items-center justify-center py-2 sm:py-2.5 px-1 rounded-2xl border border-amber-200 bg-amber-50/80 hover:bg-amber-100/90 text-amber-600 shadow-xs active:scale-95 transition-all cursor-pointer group"
                    title="Shortcut: 2"
                  >
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] sm:text-[11px] font-black tracking-wider uppercase text-amber-600">HARD</span>
                      <kbd className="hidden md:inline-flex px-1 py-0.2 text-[8px] font-mono font-black rounded border border-amber-300 bg-amber-100 text-amber-700">2</kbd>
                    </div>
                    <span className="text-[11px] sm:text-xs font-black text-amber-700 mt-0.5">
                      {getFSRSIntervals(currentQuestion?.fsrs)?.[2] || "1d"}
                    </span>
                  </button>

                  {/* GOOD (3) */}
                  <button
                    onClick={() => handleReviewRating(3)}
                    className="flex flex-col items-center justify-center py-2 sm:py-2.5 px-1 rounded-2xl border-2 border-indigo-300 bg-indigo-50/90 hover:bg-indigo-100 text-indigo-600 shadow-xs ring-2 ring-indigo-400/20 active:scale-95 transition-all cursor-pointer group"
                    title="Shortcut: 3"
                  >
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] sm:text-[11px] font-black tracking-wider uppercase text-indigo-600">GOOD</span>
                      <kbd className="hidden md:inline-flex px-1 py-0.2 text-[8px] font-mono font-black rounded border border-indigo-300 bg-indigo-100 text-indigo-700">3</kbd>
                    </div>
                    <span className="text-[11px] sm:text-xs font-black text-indigo-700 mt-0.5">
                      {getFSRSIntervals(currentQuestion?.fsrs)?.[3] || "4d"}
                    </span>
                  </button>

                  {/* EASY (4) */}
                  <button
                    onClick={() => handleReviewRating(4)}
                    className="flex flex-col items-center justify-center py-2 sm:py-2.5 px-1 rounded-2xl border border-emerald-200 bg-emerald-50/80 hover:bg-emerald-100/90 text-emerald-600 shadow-xs active:scale-95 transition-all cursor-pointer group"
                    title="Shortcut: 4"
                  >
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] sm:text-[11px] font-black tracking-wider uppercase text-emerald-600">EASY</span>
                      <kbd className="hidden md:inline-flex px-1 py-0.2 text-[8px] font-mono font-black rounded border border-emerald-300 bg-emerald-100 text-emerald-700">4</kbd>
                    </div>
                    <span className="text-[11px] sm:text-xs font-black text-emerald-700 mt-0.5">
                      {getFSRSIntervals(currentQuestion?.fsrs)?.[4] || "12d"}
                    </span>
                  </button>
                </div>
              ) : (
                /* ── BACK FACE: RATED (SHOW NEXT CARD + AUDIO + LIGHTBULB + SETTINGS) ── */
                <div className="w-full flex items-center gap-2 h-12 sm:h-13">
                  {/* Audio Button */}
                  {onTriggerPlayAudio && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onTriggerPlayAudio();
                      }}
                      className={cn(
                        "h-full px-3.5 sm:px-4 bg-white hover:bg-indigo-50 text-indigo-600 border border-slate-200/80 rounded-2xl flex items-center justify-center transition-all active:scale-95 cursor-pointer shrink-0 shadow-xs",
                        isPlayingAudio && "bg-indigo-600 text-white border-indigo-600 ring-2 ring-indigo-300"
                      )}
                      title="Play Pronunciation (Audio)"
                    >
                      <Volume2 className={cn("w-4 h-4", isPlayingAudio && "animate-pulse")} />
                    </button>
                  )}

                  {/* Lightbulb (Insights / Card Explanation) */}
                  {onOpenInsights && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenInsights();
                      }}
                      className="h-full px-3 sm:px-3.5 rounded-2xl bg-white hover:bg-amber-50 text-amber-600 border border-slate-200/80 flex items-center justify-center transition-all active:scale-95 cursor-pointer shrink-0 shadow-xs"
                      title="Card Insights & Explanation"
                    >
                      <Lightbulb className="w-4 h-4 text-amber-500 fill-amber-400/20" />
                    </button>
                  )}

                  {/* If card was rated, show Undo ONLY */}
                  {activelyRatedCurrentCard && hasRated && (
                    <button
                      onClick={handleUndoRating}
                      className="h-full px-3 sm:px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80 rounded-2xl flex items-center justify-center active:scale-95 transition-all cursor-pointer shrink-0 shadow-xs"
                      title="Undo Rating"
                      aria-label="Undo Rating"
                    >
                      <Undo2 className="w-4 h-4 text-slate-600" />
                    </button>
                  )}

                  {/* NEXT CARD button */}
                  <button 
                    onClick={handleNext}
                    className="flex-1 h-full text-white font-black text-xs sm:text-sm rounded-2xl shadow-lg flex items-center justify-center gap-2.5 uppercase tracking-widest active:scale-[0.98] transition-all hover:shadow-xl cursor-pointer bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:to-teal-600 shadow-emerald-300/50 hover:shadow-emerald-400/60"
                  >
                    <span>NEXT CARD</span>
                    <kbd className="hidden md:inline-flex items-center justify-center px-1.5 py-0.5 text-[9px] font-mono font-bold bg-white/20 text-white rounded border border-white/30">Space / ➔</kbd>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
            )}
          </>
        )}

        {/* Interactive Navigation Tabs (Conditional on showBottomNavTabs) */}
        {showBottomNavTabs && (
          <div 
            onTouchStart={handleBarTouchStart}
            onTouchEnd={handleBarTouchEnd}
            onPointerDown={handleBarTouchStart}
            onPointerUp={handleBarTouchEnd}
            className="w-full h-12 grid grid-cols-3 bg-white border-t border-slate-100 p-0 relative md:hidden select-none touch-pan-x"
            title="Swipe up for Quick Settings"
          >
            {/* Subtle Pull-up Indicator Pill */}
            <div 
              onClick={(e) => {
                e.stopPropagation();
                onOpenQuickSettings?.();
              }}
              className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-9 h-1.5 rounded-full bg-slate-300/90 dark:bg-slate-600 cursor-pointer hover:bg-slate-400 active:scale-95 transition-all z-20"
              title="Swipe up or tap for Quick Settings"
            />
            {/* 1. Card Map Tab */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenMap();
              }}
              className="relative flex items-center justify-center gap-1.5 py-3 px-1 transition-all active:scale-95 overflow-hidden"
              title="Card Map"
            >
              {activeBottomTab === 'map' && (
                <motion.div
                  layoutId="activeBottomTabBg"
                  className="absolute inset-0 bg-amber-500/10"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <span className={cn(
                "relative z-10 flex items-center justify-center gap-1.5 text-[9px] font-black uppercase tracking-wider truncate transition-colors duration-200",
                activeBottomTab === 'map' ? "text-amber-600 font-black" : "text-slate-400 hover:text-slate-600"
              )}>
                <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
                MAP
              </span>
            </button>
            {/* 2. Flashcard Active View Tab */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onOpenFlashcard();
              }}
              className="relative flex items-center justify-center gap-1.5 py-3 px-1 transition-all active:scale-95 overflow-hidden"
              title="Current Flashcard"
            >
              {activeBottomTab === 'flashcard' && (
                <motion.div
                  layoutId="activeBottomTabBg"
                  className="absolute inset-0 bg-amber-500/10"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <span className={cn(
                "relative z-10 flex items-center justify-center gap-1.5 text-[9px] font-black uppercase tracking-wider truncate transition-colors duration-200",
                activeBottomTab === 'flashcard' ? "text-amber-600 font-black" : "text-slate-400 hover:text-slate-600"
              )}>
                <BookOpen className="w-3.5 h-3.5 shrink-0" />
                FLASHCARD
              </span>
            </button>
            {/* 3. Card Hub Tab (Replaced STATS) */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenStats();
              }}
              className="relative flex items-center justify-center gap-1.5 py-3 px-1 transition-all active:scale-95 overflow-hidden cursor-pointer"
              title="Card Hub & Stats"
            >
              {activeBottomTab === 'stats' && (
                <motion.div
                  layoutId="activeBottomTabBg"
                  className="absolute inset-0 bg-amber-500/10"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <span className={cn(
                "relative z-10 flex items-center justify-center gap-1.5 text-[9px] font-black uppercase tracking-wider truncate transition-colors duration-200",
                activeBottomTab === 'stats' ? "text-amber-600 font-black" : "text-slate-400 hover:text-slate-600"
              )}>
                <Sparkles className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                CARD HUB
              </span>
            </button>
          </div>
        )}
      </div>
    </footer>
  )
}
