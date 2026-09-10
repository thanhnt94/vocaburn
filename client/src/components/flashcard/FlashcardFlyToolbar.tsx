import React from 'react'
import {
  Volume2,
  VolumeX,
  Sparkles,
  Zap,
  Eye,
  EyeOff,
  Shuffle,
  MousePointer,
  Star,
  Lightbulb,
  RefreshCw,
  Settings,
  X,
  Sliders,
  BookOpen,
  RotateCcw
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

export interface FlashcardFlyToolbarProps {
  isCardSlot?: boolean
  isFlyToolbarOpen: boolean
  setIsFlyToolbarOpen: React.Dispatch<React.SetStateAction<boolean>>
  triggerPlayAudio: (e: React.MouseEvent) => void
  isLoadingAudio?: boolean
  isPlayingAudio?: boolean
  autoPlayAudio: string
  setAutoPlayAudio: (val: any) => void
  sfxEnabled: boolean
  setSfxEnabled: (val: boolean) => void
  effectiveAutoAdvance: boolean
  setIsAutoAdvance: (val: boolean) => void
  setQuickLearnEnabled?: (val: boolean) => void
  showImages: any
  setShowImages: (val: any) => void
  randomEnabled: boolean
  setRandomEnabled: (val: boolean) => void
  isSelectMode: boolean
  setIsSelectMode: React.Dispatch<React.SetStateAction<boolean>>
  currentQuestion: any
  handleStarQuestion: () => void
  showHintBtn: boolean
  showingHint: boolean
  setShowingHint: React.Dispatch<React.SetStateAction<boolean>>
  showExplainBtn: boolean
  justAnswered: boolean
  mainTab: string
  setShowFeedback: (val: boolean) => void
  setIsFeedbackOpen: (val: boolean) => void
  showFlipBackBtn: boolean
  setIsFlipped: (val: boolean) => void
  setIsSettingsModalOpen: (val: boolean) => void
}

export const FlashcardFlyToolbar: React.FC<FlashcardFlyToolbarProps> = ({
  isCardSlot = false,
  isFlyToolbarOpen,
  setIsFlyToolbarOpen,
  triggerPlayAudio,
  isLoadingAudio = false,
  isPlayingAudio = false,
  autoPlayAudio,
  setAutoPlayAudio,
  sfxEnabled,
  setSfxEnabled,
  effectiveAutoAdvance,
  setIsAutoAdvance,
  setQuickLearnEnabled,
  showImages,
  setShowImages,
  randomEnabled,
  setRandomEnabled,
  isSelectMode,
  setIsSelectMode,
  currentQuestion,
  handleStarQuestion,
  showHintBtn,
  showingHint,
  setShowingHint,
  showExplainBtn,
  justAnswered,
  mainTab,
  setShowFeedback,
  setIsFeedbackOpen,
  showFlipBackBtn,
  setIsFlipped,
  setIsSettingsModalOpen
}) => {
  return (
    <>
      {/* ═══════════ COLLAPSED MICRO-PILL (On Card Corner / Practice Floating Island) ═══════════ */}
      <div
        className={cn(
          "transition-all duration-300",
          isCardSlot
            ? "relative z-30"
            : "fixed bottom-[84px] md:bottom-[90px] left-1/2 -translate-x-1/2 z-30 flex flex-col items-center pointer-events-none"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1 bg-white/95 backdrop-blur-md rounded-full border border-slate-200/90 shadow-[0_2px_12px_rgba(99,102,241,0.08)] p-1 pointer-events-auto transition-all duration-200 hover:shadow-md">
          {/* 1. Audio Button */}
          <button
            type="button"
            onClick={triggerPlayAudio}
            className={cn(
              "w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all duration-150 active:scale-90 cursor-pointer shadow-2xs group",
              isPlayingAudio
                ? "bg-indigo-600 text-white ring-2 ring-indigo-300"
                : isLoadingAudio
                ? "bg-indigo-100 text-indigo-700 animate-pulse"
                : "bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white"
            )}
            title={isLoadingAudio ? "Generating audio..." : isPlayingAudio ? "Playing audio (Click to replay)" : "Play Pronunciation (Audio)"}
          >
            {isLoadingAudio ? (
              <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin text-indigo-600" />
            ) : (
              <Volume2 className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:scale-110 transition-transform", isPlayingAudio && "animate-pulse")} />
            )}
          </button>

          {/* 2. Smart Hint Button (Only rendered if card has hint) */}
          {showHintBtn && (
            <>
              <div className="w-[1px] h-3 bg-slate-200/80" />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowingHint(prev => !prev);
                }}
                className={cn(
                  "w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all duration-150 active:scale-90 cursor-pointer shadow-2xs group",
                  showingHint
                    ? "bg-amber-100 text-amber-700 ring-2 ring-amber-300"
                    : "bg-amber-50 hover:bg-amber-500 text-amber-600 hover:text-white"
                )}
                title={showingHint ? "Hide Hint" : "Show Hint (AI)"}
              >
                <Lightbulb className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:scale-110 transition-transform" />
              </button>
            </>
          )}

          <div className="w-[1px] h-3 bg-slate-200/80" />

          {/* 3. Quick Options Menu Button (Opens Bottom Sheet) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsFlyToolbarOpen(true);
            }}
            className="h-7 sm:h-8 px-2 rounded-full flex items-center gap-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50/70 transition-all duration-150 active:scale-95 cursor-pointer text-[11px] font-bold"
            title="Quick Controls"
          >
            <Sliders className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="text-[10px] text-slate-400 font-bold leading-none">›</span>
          </button>
        </div>
      </div>

      {/* ═══════════ QUICK ACTION BOTTOM SHEET (iOS Control Center Action Grid) ═══════════ */}
      <AnimatePresence>
        {isFlyToolbarOpen && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end pointer-events-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-slate-950/45 backdrop-blur-xs"
              onClick={(e) => {
                e.stopPropagation();
                setIsFlyToolbarOpen(false);
              }}
            />

            {/* Bottom Drawer Container */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg mx-auto bg-white rounded-t-[2rem] border-t border-slate-200/90 shadow-2xl p-4 sm:p-5 flex flex-col gap-3.5 select-none z-10 max-h-[85vh] overflow-y-auto"
            >
              {/* Drag Handle Bar */}
              <div className="w-10 h-1 rounded-full bg-slate-300 mx-auto -mt-1 mb-0.5" />

              {/* Header Bar */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Sliders className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">Quick Controls</h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Flashcard Preferences</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsFlyToolbarOpen(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-all active:scale-90 cursor-pointer"
                  title="Close"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Action Grid (4 Columns, iOS Control Center Style) */}
              <div className="grid grid-cols-4 gap-2 sm:gap-2.5">
                {/* 1. Autoplay */}
                {(() => {
                  const isAutoplay = autoPlayAudio !== 'none';
                  return (
                    <button
                      type="button"
                      onClick={() => setAutoPlayAudio(isAutoplay ? 'none' : 'always')}
                      className={cn(
                        "flex flex-col items-center justify-center p-2 rounded-2xl border transition-all active:scale-95 text-center min-h-[72px] gap-1.5 cursor-pointer",
                        isAutoplay
                          ? "bg-emerald-50 border-emerald-300 text-emerald-700 shadow-2xs"
                          : "bg-slate-50 hover:bg-slate-100/80 border-slate-200/70 text-slate-500"
                      )}
                      title={`Autoplay: ${isAutoplay ? 'ON' : 'OFF'}`}
                    >
                      <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", isAutoplay ? "bg-emerald-500 text-white shadow-2xs" : "bg-white text-slate-400 border border-slate-200/60")}>
                        {isAutoplay ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                      </div>
                      <span className="text-[10px] font-bold tracking-tight">Autoplay</span>
                    </button>
                  );
                })()}

                {/* 2. SFX Sounds */}
                <button
                  type="button"
                  onClick={() => setSfxEnabled(!sfxEnabled)}
                  className={cn(
                    "flex flex-col items-center justify-center p-2 rounded-2xl border transition-all active:scale-95 text-center min-h-[72px] gap-1.5 cursor-pointer",
                    sfxEnabled
                      ? "bg-purple-50 border-purple-300 text-purple-700 shadow-2xs"
                      : "bg-slate-50 hover:bg-slate-100/80 border-slate-200/70 text-slate-500"
                  )}
                  title={`SFX Sounds: ${sfxEnabled ? 'ON' : 'OFF'}`}
                >
                  <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", sfxEnabled ? "bg-purple-500 text-white shadow-2xs" : "bg-white text-slate-400 border border-slate-200/60")}>
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold tracking-tight">SFX Audio</span>
                </button>

                {/* 3. Auto Advance */}
                <button
                  type="button"
                  onClick={() => {
                    const nextVal = !effectiveAutoAdvance;
                    setIsAutoAdvance(nextVal);
                    if (setQuickLearnEnabled) setQuickLearnEnabled(nextVal);
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center p-2 rounded-2xl border transition-all active:scale-95 text-center min-h-[72px] gap-1.5 cursor-pointer",
                    effectiveAutoAdvance
                      ? "bg-amber-50 border-amber-300 text-amber-700 shadow-2xs"
                      : "bg-slate-50 hover:bg-slate-100/80 border-slate-200/70 text-slate-500"
                  )}
                  title={`Auto Advance: ${effectiveAutoAdvance ? 'ON' : 'OFF'}`}
                >
                  <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", effectiveAutoAdvance ? "bg-amber-500 text-white shadow-2xs" : "bg-white text-slate-400 border border-slate-200/60")}>
                    <Zap className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold tracking-tight">Auto Next</span>
                </button>

                {/* 4. Card Images */}
                {(() => {
                  const isImagesOn = showImages !== 'none';
                  return (
                    <button
                      type="button"
                      onClick={() => setShowImages(isImagesOn ? 'none' : 'always')}
                      className={cn(
                        "flex flex-col items-center justify-center p-2 rounded-2xl border transition-all active:scale-95 text-center min-h-[72px] gap-1.5 cursor-pointer",
                        isImagesOn
                          ? "bg-sky-50 border-sky-300 text-sky-700 shadow-2xs"
                          : "bg-slate-50 hover:bg-slate-100/80 border-slate-200/70 text-slate-500"
                      )}
                      title={`Card Images: ${isImagesOn ? 'ON' : 'OFF'}`}
                    >
                      <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", isImagesOn ? "bg-sky-500 text-white shadow-2xs" : "bg-white text-slate-400 border border-slate-200/60")}>
                        {isImagesOn ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </div>
                      <span className="text-[10px] font-bold tracking-tight">Images</span>
                    </button>
                  );
                })()}

                {/* 5. Shuffle Order */}
                <button
                  type="button"
                  onClick={() => setRandomEnabled(!randomEnabled)}
                  className={cn(
                    "flex flex-col items-center justify-center p-2 rounded-2xl border transition-all active:scale-95 text-center min-h-[72px] gap-1.5 cursor-pointer",
                    randomEnabled
                      ? "bg-violet-50 border-violet-300 text-violet-700 shadow-2xs"
                      : "bg-slate-50 hover:bg-slate-100/80 border-slate-200/70 text-slate-500"
                  )}
                  title={`Shuffle Order: ${randomEnabled ? 'ON' : 'OFF'}`}
                >
                  <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", randomEnabled ? "bg-violet-500 text-white shadow-2xs" : "bg-white text-slate-400 border border-slate-200/60")}>
                    <Shuffle className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold tracking-tight">Shuffle</span>
                </button>

                {/* 6. Select Text Mode */}
                <button
                  type="button"
                  onClick={() => setIsSelectMode(prev => !prev)}
                  className={cn(
                    "flex flex-col items-center justify-center p-2 rounded-2xl border transition-all active:scale-95 text-center min-h-[72px] gap-1.5 cursor-pointer",
                    isSelectMode
                      ? "bg-rose-50 border-rose-300 text-rose-700 shadow-2xs"
                      : "bg-slate-50 hover:bg-slate-100/80 border-slate-200/70 text-slate-500"
                  )}
                  title={isSelectMode ? "Select Mode: ON" : "Select Mode: OFF"}
                >
                  <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", isSelectMode ? "bg-rose-500 text-white shadow-2xs" : "bg-white text-slate-400 border border-slate-200/60")}>
                    <MousePointer className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold tracking-tight">Select Text</span>
                </button>

                {/* 7. Star Card */}
                <button
                  type="button"
                  onClick={handleStarQuestion}
                  className={cn(
                    "flex flex-col items-center justify-center p-2 rounded-2xl border transition-all active:scale-95 text-center min-h-[72px] gap-1.5 cursor-pointer",
                    currentQuestion?.is_starred
                      ? "bg-amber-50 border-amber-300 text-amber-700 shadow-2xs"
                      : "bg-slate-50 hover:bg-slate-100/80 border-slate-200/70 text-slate-500"
                  )}
                  title={currentQuestion?.is_starred ? "Unstar Card" : "Star Card"}
                >
                  <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", currentQuestion?.is_starred ? "bg-amber-500 text-white shadow-2xs" : "bg-white text-slate-400 border border-slate-200/60")}>
                    <Star className={cn("w-4 h-4", currentQuestion?.is_starred && "fill-white")} />
                  </div>
                  <span className="text-[10px] font-bold tracking-tight">{currentQuestion?.is_starred ? "Starred" : "Star"}</span>
                </button>

                {/* 8. Explain / Feedback Modal */}
                {showExplainBtn ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (mainTab === 'practice') setShowFeedback(true);
                      setIsFeedbackOpen(true);
                      setIsFlyToolbarOpen(false);
                    }}
                    className={cn(
                      "flex flex-col items-center justify-center p-2 rounded-2xl border transition-all active:scale-95 text-center min-h-[72px] gap-1.5 cursor-pointer",
                      justAnswered
                        ? "bg-indigo-50 border-indigo-300 text-indigo-700 shadow-2xs"
                        : "bg-slate-50 hover:bg-slate-100/80 border-slate-200/70 text-slate-500"
                    )}
                    title="View Explanation & Details"
                  >
                    <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", justAnswered ? "bg-indigo-600 text-white shadow-2xs animate-pulse" : "bg-white text-slate-400 border border-slate-200/60")}>
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold tracking-tight">Explain</span>
                  </button>
                ) : (
                  <div className="hidden sm:block" />
                )}

                {/* 9. Flip Back (if back face) */}
                {showFlipBackBtn && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsFlipped(false);
                      setIsFlyToolbarOpen(false);
                    }}
                    className="flex flex-col items-center justify-center p-2 rounded-2xl border bg-cyan-50 border-cyan-300 text-cyan-700 transition-all active:scale-95 text-center min-h-[72px] gap-1.5 shadow-2xs cursor-pointer"
                    title="Flip Back to Front"
                  >
                    <div className="w-8 h-8 rounded-xl bg-cyan-600 text-white flex items-center justify-center shadow-2xs">
                      <RotateCcw className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold tracking-tight">Flip Back</span>
                  </button>
                )}
              </div>

              {/* Bottom Bar: Full Settings Button */}
              <button
                type="button"
                onClick={() => {
                  setIsFlyToolbarOpen(false);
                  setIsSettingsModalOpen(true);
                }}
                className="w-full h-11 rounded-2xl bg-slate-900 hover:bg-indigo-600 text-white flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider transition-all duration-150 active:scale-98 shadow-md group mt-1 cursor-pointer"
                title="Open Full Settings Console"
              >
                <Settings className="w-4 h-4 group-hover:rotate-45 transition-transform duration-300 text-slate-300 group-hover:text-white" />
                <span>All Deck Settings</span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
