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
  Sliders
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

export interface FlashcardFlyToolbarProps {
  isCardSlot?: boolean
  isFlyToolbarOpen: boolean
  setIsFlyToolbarOpen: React.Dispatch<React.SetStateAction<boolean>>
  triggerPlayAudio: (e: React.MouseEvent) => void
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
      {/* Backdrop: Clicking outside closes the fly toolbar */}
      {isFlyToolbarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[0.5px]"
          onClick={(e) => {
            e.stopPropagation();
            setIsFlyToolbarOpen(false);
          }}
        />
      )}

      <div
        className={cn(
          "transition-all duration-300",
          isCardSlot
            ? "relative z-30"
            : "fixed bottom-[84px] md:bottom-[90px] left-1/2 -translate-x-1/2 z-30 flex flex-col items-center pointer-events-none"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Closed State Pill: [ 🔊 | 🎚️ > ] */}
        {!isFlyToolbarOpen && (
          <div className="flex items-center gap-1 bg-white/95 backdrop-blur-md rounded-full border border-slate-200/90 shadow-[0_2px_12px_rgba(99,102,241,0.12)] p-1 pointer-events-auto transition-all duration-200 hover:shadow-md">
            {/* Audio Button */}
            <button
              type="button"
              onClick={triggerPlayAudio}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white transition-all duration-150 active:scale-90 cursor-pointer shadow-2xs group"
              title="Play Pronunciation (Audio)"
            >
              <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:scale-110 transition-transform" />
            </button>

            <div className="w-[1px] h-3.5 bg-slate-200/90" />

            {/* Tuning Icon */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsFlyToolbarOpen(true);
              }}
              className="h-7 sm:h-8 pl-1.5 pr-2 rounded-full flex items-center gap-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50/60 transition-all duration-150 active:scale-95 cursor-pointer text-[11px] font-bold"
              title="Quick Options"
            >
              <Sliders className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-[10px] text-slate-400 font-bold leading-none">›</span>
            </button>
          </div>
        )}

        {/* Expanded State: Two-Row Controls */}
        <AnimatePresence>
          {isFlyToolbarOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: isCardSlot ? 6 : 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: isCardSlot ? 6 : 8 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              className={cn(
                "bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-2xl p-2 shadow-2xl flex flex-col gap-1.5 pointer-events-auto z-50",
                isCardSlot
                  ? "absolute left-0 bottom-0 origin-bottom-left max-w-[calc(100vw-3rem)] w-max"
                  : "w-auto max-w-[95vw] origin-bottom"
              )}
            >
              {/* ── ROW 1: QUICK TOGGLES ── */}
              <div className="flex items-center gap-1 shrink-0">
                {/* 1.0 Primary Audio */}
                <button
                  type="button"
                  onClick={triggerPlayAudio}
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white transition-all duration-150 active:scale-90 cursor-pointer shrink-0 shadow-2xs group"
                  title="Play Pronunciation (Audio)"
                >
                  <Volume2 className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                </button>

                {/* 1.1 Autoplay Audio */}
                {(() => {
                  const isAutoplay = autoPlayAudio !== 'none';
                  return (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAutoPlayAudio(isAutoplay ? 'none' : 'always');
                      }}
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90 cursor-pointer shrink-0 shadow-xs border",
                        isAutoplay
                          ? "bg-emerald-50 border-emerald-300 text-emerald-600"
                          : "bg-slate-50 hover:bg-slate-100 border-slate-200/70 text-slate-400 hover:text-slate-600"
                      )}
                      title={`Autoplay Audio: ${isAutoplay ? 'ON' : 'OFF'}`}
                    >
                      {isAutoplay ? (
                        <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </button>
                  );
                })()}

                {/* 1.2 SFX Sounds */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSfxEnabled(!sfxEnabled);
                  }}
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90 cursor-pointer shrink-0 shadow-xs border",
                    sfxEnabled
                      ? "bg-purple-50 border-purple-300 text-purple-600"
                      : "bg-slate-50 hover:bg-slate-100 border-slate-200/70 text-slate-400 hover:text-slate-600"
                  )}
                  title={`SFX Sounds: ${sfxEnabled ? 'ON' : 'OFF'}`}
                >
                  <Sparkles className={cn("w-3.5 h-3.5", sfxEnabled ? "text-purple-600" : "text-slate-400")} />
                </button>

                {/* Divider 1 */}
                <div className="w-[1px] h-4 bg-slate-200/90 mx-0.5 shrink-0" />

                {/* 1.3 Auto Advance */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const nextVal = !effectiveAutoAdvance;
                    setIsAutoAdvance(nextVal);
                    if (setQuickLearnEnabled) setQuickLearnEnabled(nextVal);
                  }}
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90 cursor-pointer shrink-0 shadow-xs border relative",
                    effectiveAutoAdvance
                      ? "bg-amber-50 border-amber-400 text-amber-600 ring-1 ring-amber-300/50"
                      : "bg-slate-50 hover:bg-slate-100 border-slate-200/70 text-slate-400 hover:text-slate-600"
                  )}
                  title={`Auto Advance: ${effectiveAutoAdvance ? 'ON' : 'OFF'}`}
                >
                  <Zap className={cn("w-3.5 h-3.5", effectiveAutoAdvance ? "fill-amber-500 text-amber-600" : "text-slate-400")} />
                  {effectiveAutoAdvance && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 absolute -top-0.5 -right-0.5 ring-1 ring-white" />
                  )}
                </button>

                {/* 1.4 Card Images */}
                {(() => {
                  const isImagesOn = showImages !== 'none';
                  return (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowImages(isImagesOn ? 'none' : 'always');
                      }}
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90 cursor-pointer shrink-0 shadow-xs border",
                        isImagesOn
                          ? "bg-sky-50 border-sky-300 text-sky-600"
                          : "bg-slate-50 hover:bg-slate-100 border-slate-200/70 text-slate-400 hover:text-slate-600"
                      )}
                      title={`Card Images: ${isImagesOn ? 'ON' : 'OFF'}`}
                    >
                      {isImagesOn ? (
                        <Eye className="w-3.5 h-3.5 text-sky-600" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </button>
                  );
                })()}

                {/* 1.5 Shuffle */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setRandomEnabled(!randomEnabled);
                  }}
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90 cursor-pointer shrink-0 shadow-xs border",
                    randomEnabled
                      ? "bg-violet-50 border-violet-300 text-violet-600"
                      : "bg-slate-50 hover:bg-slate-100 border-slate-200/70 text-slate-400 hover:text-slate-600"
                  )}
                  title={`Shuffle: ${randomEnabled ? 'ON' : 'OFF'}`}
                >
                  <Shuffle className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* ── ROW 2: ACTIONS & SETTINGS ── */}
              <div className="flex items-center gap-1 shrink-0">
                {/* 2.1 Select Mode */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsSelectMode(prev => !prev);
                  }}
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90 cursor-pointer shrink-0 shadow-xs border relative",
                    isSelectMode
                      ? "bg-rose-500 text-white border-rose-600 shadow-xs"
                      : "bg-slate-50 hover:bg-slate-100 border-slate-200/70 text-slate-500 hover:text-slate-700"
                  )}
                  title={isSelectMode ? "Select Mode: ON" : "Select Mode: OFF"}
                >
                  <MousePointer className="w-3.5 h-3.5" />
                  {isSelectMode && <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-ping absolute -top-0.5 -right-0.5" />}
                </button>

                {/* 2.2 Star / Bookmark */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStarQuestion();
                  }}
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90 cursor-pointer shrink-0 shadow-xs border group",
                    currentQuestion?.is_starred
                      ? "bg-amber-50 border-amber-300 text-amber-500 shadow-xs"
                      : "bg-slate-50 hover:bg-amber-50 border-slate-200/70 text-slate-400 hover:text-amber-500"
                  )}
                  title={currentQuestion?.is_starred ? "Unstar Card" : "Star Card"}
                >
                  <Star className={cn("w-3.5 h-3.5 group-hover:scale-110 transition-transform", currentQuestion?.is_starred && "fill-amber-400 text-amber-500")} />
                </button>

                {/* 2.3 AI Hint or Explanation */}
                {showHintBtn ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowingHint(prev => !prev);
                    }}
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90 cursor-pointer shrink-0 shadow-xs border",
                      showingHint
                        ? "bg-amber-500 text-white border-amber-600 shadow-xs"
                        : "bg-slate-50 hover:bg-amber-50 border-slate-200/70 text-amber-500"
                    )}
                    title="AI Hint"
                  >
                    <Lightbulb className="w-3.5 h-3.5" />
                  </button>
                ) : showExplainBtn ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (mainTab === 'practice') setShowFeedback(true);
                      setIsFeedbackOpen(true);
                    }}
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90 cursor-pointer shrink-0 shadow-xs border relative",
                      justAnswered
                        ? "bg-indigo-600 text-white border-indigo-700 shadow-xs animate-pulse"
                        : "bg-slate-50 hover:bg-indigo-50 border-slate-200/70 text-indigo-600"
                    )}
                    title="View Explanation & Details"
                  >
                    <Lightbulb className="w-3.5 h-3.5" />
                    {justAnswered && <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping absolute -top-0.5 -right-0.5" />}
                  </button>
                ) : null}

                {/* 2.4 Flip Back (Back face only) */}
                {showFlipBackBtn && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsFlipped(false);
                      setIsFlyToolbarOpen(false);
                    }}
                    className="w-8 h-8 rounded-full bg-slate-50 hover:bg-cyan-50 text-cyan-600 border border-slate-200/70 hover:border-cyan-300 flex items-center justify-center transition-all duration-200 active:scale-90 cursor-pointer shrink-0 shadow-xs group"
                    title="Flip Back to Front"
                  >
                    <RefreshCw className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-500" />
                  </button>
                )}

                {/* Divider 2 */}
                <div className="w-[1px] h-4 bg-slate-200/90 mx-0.5 shrink-0" />

                {/* 2.5 Settings Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsSettingsModalOpen(true);
                    setIsFlyToolbarOpen(false);
                  }}
                  className="h-8 px-2.5 rounded-full bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white border border-indigo-200/80 flex items-center gap-1 text-[11px] font-bold transition-all duration-150 active:scale-95 cursor-pointer shrink-0 shadow-xs group"
                  title="Open Full Settings Console"
                >
                  <Settings className="w-3.5 h-3.5 group-hover:rotate-45 transition-transform duration-300" />
                  <span>Settings</span>
                </button>

                {/* 2.6 Close Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFlyToolbarOpen(false);
                  }}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-500 border border-slate-200/70 hover:border-rose-200 flex items-center justify-center transition-all duration-150 active:scale-90 cursor-pointer shrink-0 shadow-2xs"
                  title="Close Quick Options"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}
