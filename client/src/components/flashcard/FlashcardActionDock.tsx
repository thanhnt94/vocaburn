import React from 'react'
import { ChevronRight, LayoutGrid, BookOpen, TrendingUp, Undo2, X, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

export interface FlashcardActionDockProps {
  shouldShowRoadmapStepCompleteScreen: boolean
  mainTab: string
  practiceNeedsSetup: boolean
  practiceAnswers: Record<number, any>
  currentIndex: number
  activeBottomTab: 'map' | 'flashcard' | 'stats'
  isFeedbackOpen: boolean
  showingHint: boolean
  setShowingHint: (val: boolean) => void
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
  onOpenMap: () => void
  onOpenFlashcard: () => void
  onOpenStats: () => void
  getFSRSIntervals: (fsrs?: any) => Record<number, string>
}

export const FlashcardActionDock: React.FC<FlashcardActionDockProps> = ({
  shouldShowRoadmapStepCompleteScreen,
  mainTab,
  practiceNeedsSetup,
  practiceAnswers,
  currentIndex,
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
  onOpenMap,
  onOpenFlashcard,
  onOpenStats,
  getFSRSIntervals
}) => {
  if (shouldShowRoadmapStepCompleteScreen) return null
  if (mainTab === 'practice' && practiceNeedsSetup) return null

  return (
    <footer className={cn(
      "w-full flex-shrink-0 bg-white/95 backdrop-blur-2xl border-t border-slate-100/80 px-0 pt-0 pb-0 z-[250] shadow-[0_-4px_24px_rgba(99,102,241,0.06)]",
      (isFeedbackOpen || activeBottomTab === 'map' || activeBottomTab === 'stats') ? "fixed bottom-0 inset-x-0 md:relative" : "relative"
    )}>
      <div className="max-w-2xl mx-auto w-full flex flex-col">
        {activeBottomTab === 'flashcard' && !isFeedbackOpen && (
          <>
            {/* Hint Popup Bubble */}
            <AnimatePresence>
              {showingHint && currentQuestion?.hint && !isFlipped && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="mx-3 sm:mx-4 mt-3 p-3.5 bg-amber-50 border border-amber-100 rounded-2xl shadow-md text-xs font-semibold text-amber-850 leading-relaxed relative flex items-start gap-2.5 animate-in fade-in slide-in-from-bottom-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="w-5.5 h-5.5 rounded-xl bg-amber-500 flex items-center justify-center flex-shrink-0 shadow-sm text-white font-black text-xs">
                    💡
                  </div>
                  <div className="flex-1 text-left">
                    <span className="font-black text-[9px] uppercase tracking-wider text-amber-600 block mb-0.5">💡 AI Hint</span>
                    {currentQuestion.hint}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowingHint(false);
                    }}
                    className="text-amber-400 hover:text-amber-600 active:scale-95 transition-all p-0.5 hover:bg-amber-100 rounded-lg"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* PRIMARY ACTION ZONE (Single Clean Thumb-Reachable 1-Row Action Bar) */}
            <div className="w-full px-3 sm:px-4 py-2">
              {mainTab === 'practice' ? (
                practiceAnswers[currentIndex] !== undefined ? (
                  <button 
                    onClick={handleNext}
                    className="w-full h-12 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white font-black text-xs rounded-2xl shadow-lg shadow-emerald-300/50 flex items-center justify-center gap-2.5 uppercase tracking-widest active:scale-[0.98] transition-all hover:shadow-emerald-400/60 hover:shadow-xl cursor-pointer"
                  >
                    <span>Continue</span>
                    <kbd className="hidden md:inline-flex items-center justify-center px-1.5 py-0.5 text-[9px] font-mono font-bold bg-white/20 text-white rounded border border-white/30">Space / ↵</kbd>
                    <ChevronRight className="w-4 h-4" />
                  </button>
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
              ) : !isFlipped ? (
                /* ── FRONT FACE: BIG FLIP CARD CTA BUTTON ── */
                <button 
                  onClick={() => {
                    setIsFlipped(true);
                    setJustAnswered(true);
                  }}
                  className={cn(
                    "w-full h-12 sm:h-13 font-black text-xs sm:text-sm rounded-2xl shadow-lg flex items-center justify-center gap-2.5 uppercase tracking-widest active:scale-[0.98] transition-all hover:shadow-xl cursor-pointer text-white",
                    activeMode === 'speed_skim'
                      ? "bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 shadow-amber-300/50 hover:shadow-amber-400/60"
                      : "bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-indigo-300/50 hover:shadow-indigo-400/60"
                  )}
                >
                  <span>{activeMode === 'speed_skim' ? '⚡ SKIM / FLIP' : 'FLIP CARD'}</span>
                  <kbd className="hidden md:inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-mono font-bold bg-white/20 text-white rounded border border-white/30">Space</kbd>
                  <ChevronRight className="w-4 h-4 rotate-90" />
                </button>
              ) : !hasRated && activeMode !== 'flip' && activeMode !== 'speed_skim' ? (
                /* ── BACK FACE: UNRATED (FSRS BUTTONS OR SWIPE GUIDE) ── */
                effectiveCardRatingMode === 'buttons' || effectiveCardRatingMode === 'both' ? (
                  <div className="grid grid-cols-4 gap-1.5 sm:gap-2.5 w-full">
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
                  /* SWIPE GUIDE INDICATOR */
                  <div className="w-full h-11 bg-slate-100/80 rounded-2xl border border-slate-200/80 flex items-center justify-between px-4 text-xs font-black text-slate-500">
                    <span className="flex items-center gap-1 text-rose-500">← Again</span>
                    <span className="text-[10px] font-bold text-slate-400">Swipe card to rate</span>
                    <span className="flex items-center gap-1 text-emerald-600">Good →</span>
                  </div>
                )
              ) : (
                /* ── BACK FACE: RATED (OR FLIP / SPEED_SKIM MODE FLIPPED) ── */
                <div className="w-full flex items-center gap-2 h-12 sm:h-13">
                  {/* Undo button if rated */}
                  {activelyRatedCurrentCard && hasRated && (
                    <button
                      onClick={handleUndoRating}
                      className="h-full px-3 sm:px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                      title="Undo Rating"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                      <span>Undo</span>
                    </button>
                  )}

                  {/* NEXT CARD button */}
                  <button 
                    onClick={handleNext}
                    className={cn(
                      "flex-1 h-full text-white font-black text-xs sm:text-sm rounded-2xl shadow-lg flex items-center justify-center gap-2.5 uppercase tracking-widest active:scale-[0.98] transition-all hover:shadow-xl cursor-pointer",
                      activeMode === 'speed_skim'
                        ? "bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 shadow-amber-300/50 hover:shadow-amber-400/60"
                        : "bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:to-teal-600 shadow-emerald-300/50 hover:shadow-emerald-400/60"
                    )}
                  >
                    <span>{activeMode === 'speed_skim' ? '⚡ NEXT CARD' : 'NEXT CARD'}</span>
                    <kbd className="hidden md:inline-flex items-center justify-center px-1.5 py-0.5 text-[9px] font-mono font-bold bg-white/20 text-white rounded border border-white/30">Space / ↵</kbd>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* Interactive Navigation Tabs (Always Accessible on Mobile) */}
        <div className="w-full h-12 grid grid-cols-3 bg-white border-t border-slate-100 p-0 relative md:hidden">
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
      </div>
    </footer>
  )
}
