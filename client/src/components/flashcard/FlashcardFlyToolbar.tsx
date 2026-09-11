import React from 'react'
import { createPortal } from 'react-dom'
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
  RefreshCw,
  Settings,
  X,
  Sliders,
  RotateCcw,
  Hand,
  Layers
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

export interface FlashcardFlyToolbarProps {
  isCardSlot?: boolean
  isFlyToolbarOpen?: boolean
  setIsFlyToolbarOpen: React.Dispatch<React.SetStateAction<boolean>>
  triggerPlayAudio: (e: React.MouseEvent) => void
  isLoadingAudio?: boolean
  isPlayingAudio?: boolean
  autoPlayAudio?: string
  setAutoPlayAudio?: (val: any) => void
  sfxEnabled?: boolean
  setSfxEnabled?: (val: boolean) => void
  effectiveAutoAdvance?: boolean
  setIsAutoAdvance?: (val: boolean) => void
  setQuickLearnEnabled?: (val: boolean) => void
  showImages?: any
  setShowImages?: (val: any) => void
  randomEnabled?: boolean
  setRandomEnabled?: (val: boolean) => void
  onToggleRandom?: (nextVal: boolean) => void
  isSpeedSkimMode?: boolean
  showLocalToast?: (msg: string, type?: 'info' | 'success' | 'warning') => void
  isSelectMode?: boolean
  setIsSelectMode?: React.Dispatch<React.SetStateAction<boolean>>
  currentQuestion?: any
  handleStarQuestion?: () => void
  showHintBtn?: boolean
  showingHint?: boolean
  setShowingHint?: React.Dispatch<React.SetStateAction<boolean>>
  showExplainBtn?: boolean
  justAnswered?: boolean
  mainTab?: string
  setShowFeedback?: (val: boolean) => void
  setIsFeedbackOpen?: (val: boolean) => void
  showFlipBackBtn?: boolean
  setIsFlipped?: (val: boolean) => void
  setIsSettingsModalOpen?: (val: boolean) => void
  onOpenCardHub?: (subTab?: 'stats' | 'insight' | 'note' | 'community') => void
}

/**
 * Collapsed micro-pill rendered on the card corner (or floating island in Practice mode)
 */
export const FlashcardFlyToolbar: React.FC<FlashcardFlyToolbarProps> = ({
  isCardSlot = false,
  setIsFlyToolbarOpen,
  triggerPlayAudio,
  isLoadingAudio = false,
  isPlayingAudio = false,
}) => {
  return (
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

        <div className="w-[1px] h-3 bg-slate-200/80" />

        {/* 2. Quick Options Menu Button (Opens Bottom Sheet) */}
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
  )
}

export interface FlashcardQuickControlsSheetProps {
  isOpen: boolean
  onClose: () => void
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
  onToggleRandom?: (nextVal: boolean) => void
  isSpeedSkimMode?: boolean
  showLocalToast?: (msg: string, type?: 'info' | 'success' | 'warning') => void
  isSelectMode: boolean
  setIsSelectMode: React.Dispatch<React.SetStateAction<boolean>>
  currentQuestion: any
  handleStarQuestion: () => void
  showFlipBackBtn: boolean
  setIsFlipped: (val: boolean) => void
  setIsSettingsModalOpen: (val: boolean) => void
  activeMode?: string
  onSelectMode?: (mode: string) => void
  tapToFlip?: boolean
  onToggleTapToFlip?: () => void
  showActionDock?: boolean
  onToggleActionDock?: () => void
}

const FLASHCARD_MODES = [
  { id: 'fsrs', short: 'FSRS', name: 'FSRS Repetition', icon: '🧠', activeClass: 'bg-emerald-600 text-white shadow-xs font-black' },
  { id: 'skim', short: 'SKIM', name: 'Speed Skim', icon: '⚡', activeClass: 'bg-amber-500 text-white shadow-xs font-black' },
  { id: 'autoplay', short: 'AUTO', name: 'Auto Play (Hands-Free)', icon: '🎧', activeClass: 'bg-cyan-600 text-white shadow-xs font-black' },
  { id: 'review', short: 'REV', name: 'Review Due', icon: '📚', activeClass: 'bg-sky-600 text-white shadow-xs font-black' },
  { id: 'new', short: 'NEW', name: 'Learn New', icon: '✨', activeClass: 'bg-indigo-600 text-white shadow-xs font-black' },
]

/**
 * Standalone, root-level bottom sheet attached via Portal to document.body
 * Completely immune to 3D card CSS transform / perspective containment bugs.
 */
export const FlashcardQuickControlsSheet: React.FC<FlashcardQuickControlsSheetProps> = ({
  isOpen,
  onClose,
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
  onToggleRandom,
  isSpeedSkimMode,
  showLocalToast,
  isSelectMode,
  setIsSelectMode,
  currentQuestion,
  handleStarQuestion,
  showFlipBackBtn,
  setIsFlipped,
  setIsSettingsModalOpen,
  activeMode,
  onSelectMode,
  tapToFlip = true,
  onToggleTapToFlip,
  showActionDock = true,
  onToggleActionDock,
}) => {
  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex flex-col justify-end pointer-events-auto">
          {/* Fullscreen Uniform Dimmed Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs"
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
          />

          {/* Bottom Drawer Container */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg mx-auto bg-white rounded-t-[2.2rem] border-t border-slate-200/90 shadow-2xl p-4 sm:p-5 pb-6 sm:pb-8 flex flex-col gap-3.5 select-none z-10 max-h-[85vh] overflow-y-auto"
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
                onClick={onClose}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-all active:scale-90 cursor-pointer"
                title="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 5 Flashcard Modes Quick Switcher */}
            {onSelectMode && (
              <div className="flex flex-col gap-1 text-left px-0.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Flashcard Study Mode
                  </span>
                  <span className="text-[9px] font-bold text-slate-400">
                    5 Modes Available
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1.5 p-1 rounded-2xl bg-slate-100 border border-slate-200/80">
                  {FLASHCARD_MODES.map((m) => {
                    const isActive = activeMode === m.id || (m.id === 'skim' && (activeMode === 'speed_skim' || activeMode === 'flip'));
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          onSelectMode(m.id);
                        }}
                        className={cn(
                          "flex flex-col items-center justify-center py-2 px-0.5 rounded-xl transition-all cursor-pointer select-none",
                          isActive
                            ? cn(m.activeClass, "scale-[1.02]")
                            : "bg-transparent text-slate-600 hover:bg-white/70 hover:text-slate-900"
                        )}
                        title={m.name}
                      >
                        <span className="text-base leading-none mb-1">{m.icon}</span>
                        <span className="text-[9.5px] font-black tracking-tight uppercase leading-tight">{m.short}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Action Grid (4 Columns, iOS Control Center Style) */}
            <div className="grid grid-cols-4 gap-2 sm:gap-2.5">
              {/* 1. Autoplay */}
              {(() => {
                const isAutoplay = autoPlayAudio !== 'none'
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
                )
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
                  if (isSpeedSkimMode) {
                    if (showLocalToast) {
                      showLocalToast("Auto Next is permanently active in Skim Mode", "info")
                    }
                    return
                  }
                  const nextVal = !effectiveAutoAdvance
                  setIsAutoAdvance(nextVal)
                  if (setQuickLearnEnabled) setQuickLearnEnabled(nextVal)
                }}
                className={cn(
                  "flex flex-col items-center justify-center p-2 rounded-2xl border transition-all active:scale-95 text-center min-h-[72px] gap-1.5 cursor-pointer",
                  effectiveAutoAdvance
                    ? isSpeedSkimMode
                      ? "bg-amber-500 border-amber-600 text-white shadow-md shadow-amber-500/25"
                      : "bg-amber-50 border-amber-300 text-amber-700 shadow-2xs"
                    : "bg-slate-50 hover:bg-slate-100/80 border-slate-200/70 text-slate-500"
                )}
                title={isSpeedSkimMode ? "Auto Next: Permanently ON in Skim Mode" : `Auto Advance: ${effectiveAutoAdvance ? 'ON' : 'OFF'}`}
              >
                <div className={cn(
                  "w-8 h-8 rounded-xl flex items-center justify-center", 
                  effectiveAutoAdvance 
                    ? isSpeedSkimMode ? "bg-white/20 text-white" : "bg-amber-500 text-white shadow-2xs" 
                    : "bg-white text-slate-400 border border-slate-200/60"
                )}>
                  <Zap className={cn("w-4 h-4", isSpeedSkimMode && "animate-pulse")} />
                </div>
                <div className="flex flex-col items-center leading-none gap-0.5">
                  <span className="text-[10px] font-bold tracking-tight">Auto Next</span>
                  {isSpeedSkimMode ? (
                    <span className="text-[8px] font-black uppercase tracking-wider text-amber-100">
                      ⚡ Skim (ON)
                    </span>
                  ) : (
                    <span className={cn("text-[8px] font-black uppercase tracking-wider", effectiveAutoAdvance ? "text-amber-600" : "text-slate-400")}>
                      {effectiveAutoAdvance ? "ON" : "OFF"}
                    </span>
                  )}
                </div>
              </button>

              {/* 4. Card Images */}
              {(() => {
                const isImagesOn = showImages !== 'none'
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
                )
              })()}

              {/* 5. Shuffle Order */}
              <button
                type="button"
                onClick={() => {
                  const nextVal = !randomEnabled
                  if (onToggleRandom) {
                    onToggleRandom(nextVal)
                  } else {
                    setRandomEnabled(nextVal)
                  }
                }}
                className={cn(
                  "flex flex-col items-center justify-center p-2 rounded-2xl border transition-all active:scale-95 text-center min-h-[72px] gap-1.5 cursor-pointer",
                  randomEnabled
                    ? "bg-violet-500 border-violet-600 text-white shadow-md shadow-violet-500/25"
                    : "bg-slate-50 hover:bg-slate-100/80 border-slate-200/70 text-slate-500"
                )}
                title={`Shuffle Order: ${randomEnabled ? 'ON' : 'OFF'}`}
              >
                <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", randomEnabled ? "bg-white/20 text-white shadow-2xs" : "bg-white text-slate-400 border border-slate-200/60")}>
                  <Shuffle className="w-4 h-4" />
                </div>
                <div className="flex flex-col items-center leading-none gap-0.5">
                  <span className="text-[10px] font-bold tracking-tight">Shuffle</span>
                  <span className={cn("text-[8px] font-black uppercase tracking-wider", randomEnabled ? "text-violet-100" : "text-slate-400")}>
                    {randomEnabled ? "ON" : "OFF"}
                  </span>
                </div>
              </button>

              {/* 6. Tap Card to Flip */}
              <button
                type="button"
                onClick={() => {
                  if (tapToFlip && !showActionDock) {
                    showLocalToast?.("Cannot disable Tap to Flip while Action Buttons are hidden!", "warning");
                    return;
                  }
                  onToggleTapToFlip?.();
                }}
                className={cn(
                  "flex flex-col items-center justify-center p-2 rounded-2xl border transition-all active:scale-95 text-center min-h-[72px] gap-1.5 cursor-pointer",
                  tapToFlip
                    ? "bg-indigo-50 border-indigo-300 text-indigo-700 shadow-2xs"
                    : "bg-slate-50 hover:bg-slate-100/80 border-slate-200/70 text-slate-500"
                )}
                title={`Tap Card to Flip: ${tapToFlip ? 'ON' : 'OFF'}`}
              >
                <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", tapToFlip ? "bg-indigo-600 text-white shadow-2xs" : "bg-white text-slate-400 border border-slate-200/60")}>
                  <Hand className="w-4 h-4" />
                </div>
                <div className="flex flex-col items-center leading-none gap-0.5">
                  <span className="text-[10px] font-bold tracking-tight">Tap Flip</span>
                  <span className={cn("text-[8px] font-black uppercase tracking-wider", tapToFlip ? "text-indigo-600" : "text-slate-400")}>
                    {tapToFlip ? "ON" : "OFF"}
                  </span>
                </div>
              </button>

              {/* 7. Action Buttons (Dock) */}
              <button
                type="button"
                onClick={() => {
                  if (showActionDock && !tapToFlip) {
                    showLocalToast?.("Cannot hide Action Buttons while Tap to Flip is disabled!", "warning");
                    return;
                  }
                  onToggleActionDock?.();
                }}
                className={cn(
                  "flex flex-col items-center justify-center p-2 rounded-2xl border transition-all active:scale-95 text-center min-h-[72px] gap-1.5 cursor-pointer",
                  showActionDock
                    ? "bg-teal-50 border-teal-300 text-teal-700 shadow-2xs"
                    : "bg-slate-50 hover:bg-slate-100/80 border-slate-200/70 text-slate-500"
                )}
                title={`Action Buttons: ${showActionDock ? 'ON' : 'OFF'}`}
              >
                <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", showActionDock ? "bg-teal-600 text-white shadow-2xs" : "bg-white text-slate-400 border border-slate-200/60")}>
                  <Layers className="w-4 h-4" />
                </div>
                <div className="flex flex-col items-center leading-none gap-0.5">
                  <span className="text-[10px] font-bold tracking-tight">Buttons</span>
                  <span className={cn("text-[8px] font-black uppercase tracking-wider", showActionDock ? "text-teal-600" : "text-slate-400")}>
                    {showActionDock ? "ON" : "OFF"}
                  </span>
                </div>
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

              {/* 8. Flip Back (if back face) */}
              {showFlipBackBtn && (
                <button
                  type="button"
                  onClick={() => {
                    setIsFlipped(false)
                    onClose()
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
                onClose()
                setIsSettingsModalOpen(true)
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
    </AnimatePresence>,
    document.body
  )
}
