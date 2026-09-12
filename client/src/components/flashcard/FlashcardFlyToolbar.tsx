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
  Layers,
  MoveHorizontal,
  Vibrate,
  VibrateOff,
  Pencil,
  Type,
  FileText,
  Brain,
  Lightbulb
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
  showFlipBackBtn?: boolean
  setIsFlipped?: (val: boolean) => void
  setIsSettingsModalOpen: (val: boolean) => void
  activeMode?: string
  onSelectMode?: (mode: string) => void
  ratingMode?: 'both' | 'swipe_4way' | 'buttons'
  onCycleRatingMode?: () => void
  swipeToRate?: boolean
  onToggleSwipeToRate?: () => void
  showActionDock?: boolean
  onToggleActionDock?: () => void
  hapticEnabled?: boolean
  setHapticEnabled?: (val: boolean) => void
  triggerHaptic?: (type?: any) => void
  frontFontSize?: string
  setFrontFontSize?: (size: string) => void
  canEdit?: boolean
  onOpenEditModal?: () => void
  onOpenCardHub?: (subTab: 'stats' | 'insight' | 'note' | 'community') => void
  handleToggleHint?: (e?: React.MouseEvent) => void
  showingHint?: boolean
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
  ratingMode,
  onCycleRatingMode,
  swipeToRate = true,
  onToggleSwipeToRate,
  showActionDock = true,
  onToggleActionDock,
  hapticEnabled = true,
  setHapticEnabled,
  triggerHaptic,
  frontFontSize = '100%',
  setFrontFontSize,
  canEdit = false,
  onOpenEditModal,
  onOpenCardHub,
  handleToggleHint,
  showingHint = false,
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

            {/* Action Grid (Structured iOS Control Center Layout) */}
            {(() => {
              // 1. Autoplay cycle & meta
              const autoplayMeta = (() => {
                switch (autoPlayAudio) {
                  case 'always':
                    return {
                      label: 'BOTH',
                      color: 'text-emerald-600',
                      container: 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-2xs',
                      iconBox: 'bg-emerald-500 text-white shadow-2xs',
                      icon: <Volume2 className="w-4 h-4" />,
                      title: 'Autoplay: Both Sides'
                    }
                  case 'front':
                    return {
                      label: 'FRONT',
                      color: 'text-sky-600',
                      container: 'bg-sky-50 border-sky-300 text-sky-700 shadow-2xs',
                      iconBox: 'bg-sky-500 text-white shadow-2xs',
                      icon: <Volume2 className="w-4 h-4" />,
                      title: 'Autoplay: Front Only'
                    }
                  case 'back':
                    return {
                      label: 'BACK',
                      color: 'text-indigo-600',
                      container: 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-2xs',
                      iconBox: 'bg-indigo-600 text-white shadow-2xs',
                      icon: <Volume2 className="w-4 h-4" />,
                      title: 'Autoplay: Back Only'
                    }
                  default:
                    return {
                      label: 'OFF',
                      color: 'text-slate-400',
                      container: 'bg-slate-50 hover:bg-slate-100/80 border-slate-200/70 text-slate-500',
                      iconBox: 'bg-white text-slate-400 border border-slate-200/60',
                      icon: <VolumeX className="w-4 h-4" />,
                      title: 'Autoplay: OFF'
                    }
                }
              })()

              const handleCycleAutoplay = () => {
                let nextVal = 'always'
                let toastMsg = 'Autoplay: Both (Front & Back)'
                if (autoPlayAudio === 'always') {
                  nextVal = 'front'
                  toastMsg = 'Autoplay: Front Only'
                } else if (autoPlayAudio === 'front') {
                  nextVal = 'back'
                  toastMsg = 'Autoplay: Back Only'
                } else if (autoPlayAudio === 'back') {
                  nextVal = 'none'
                  toastMsg = 'Autoplay: OFF'
                } else {
                  nextVal = 'always'
                  toastMsg = 'Autoplay: Both (Front & Back)'
                }
                setAutoPlayAudio(nextVal)
                showLocalToast?.(toastMsg, 'info')
              }

              // 2. Rating mode cycle & meta
              const currentRatingMode: 'both' | 'swipe_4way' | 'buttons' = ratingMode || (
                showActionDock && swipeToRate
                  ? 'both'
                  : showActionDock
                  ? 'buttons'
                  : 'swipe_4way'
              )

              const ratingModeMeta = (() => {
                switch (currentRatingMode) {
                  case 'both':
                    return {
                      label: 'BOTH',
                      color: 'text-emerald-600',
                      container: 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-2xs',
                      iconBox: 'bg-emerald-600 text-white shadow-2xs',
                      icon: <Sparkles className="w-4 h-4" />,
                      title: 'Rating: Both (Swipe + Buttons)'
                    }
                  case 'swipe_4way':
                    return {
                      label: 'SWIPE',
                      color: 'text-indigo-600',
                      container: 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-2xs',
                      iconBox: 'bg-indigo-600 text-white shadow-2xs',
                      icon: <MoveHorizontal className="w-4 h-4" />,
                      title: 'Rating: Swipe Gestures Only'
                    }
                  case 'buttons':
                    return {
                      label: 'BUTTONS',
                      color: 'text-teal-600',
                      container: 'bg-teal-50 border-teal-300 text-teal-700 shadow-2xs',
                      iconBox: 'bg-teal-600 text-white shadow-2xs',
                      icon: <Layers className="w-4 h-4" />,
                      title: 'Rating: On-Screen Buttons Only'
                    }
                }
              })()

              const handleCycleRating = () => {
                if (onCycleRatingMode) {
                  onCycleRatingMode()
                  return
                }
                if (currentRatingMode === 'both') {
                  onToggleActionDock?.()
                } else if (currentRatingMode === 'swipe_4way') {
                  onToggleSwipeToRate?.()
                  onToggleActionDock?.()
                } else {
                  onToggleSwipeToRate?.()
                }
              }

              // 3. Card Images cycle & meta (Both -> Front -> Back -> Off)
              const imagesMeta = (() => {
                const str = String(showImages)
                if (str === 'always' || showImages === true || str === 'true') {
                  return {
                    label: 'BOTH',
                    color: 'text-emerald-600',
                    container: 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-2xs',
                    iconBox: 'bg-emerald-500 text-white shadow-2xs',
                    icon: <Eye className="w-4 h-4" />,
                    title: 'Card Images: Both Sides'
                  }
                }
                if (str === 'front') {
                  return {
                    label: 'FRONT',
                    color: 'text-sky-600',
                    container: 'bg-sky-50 border-sky-300 text-sky-700 shadow-2xs',
                    iconBox: 'bg-sky-500 text-white shadow-2xs',
                    icon: <Eye className="w-4 h-4" />,
                    title: 'Card Images: Front Only'
                  }
                }
                if (str === 'back') {
                  return {
                    label: 'BACK',
                    color: 'text-indigo-600',
                    container: 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-2xs',
                    iconBox: 'bg-indigo-600 text-white shadow-2xs',
                    icon: <Eye className="w-4 h-4" />,
                    title: 'Card Images: Back Only'
                  }
                }
                return {
                  label: 'OFF',
                  color: 'text-slate-400',
                  container: 'bg-slate-50 hover:bg-slate-100/80 border-slate-200/70 text-slate-500',
                  iconBox: 'bg-white text-slate-400 border border-slate-200/60',
                  icon: <EyeOff className="w-4 h-4" />,
                  title: 'Card Images: Hidden'
                }
              })()

              const handleCycleImages = () => {
                const str = String(showImages)
                let nextVal: 'always' | 'front' | 'back' | 'none' = 'always'
                let toastMsg = 'Card Images: Both Sides'
                if (str === 'always' || showImages === true || str === 'true') {
                  nextVal = 'front'
                  toastMsg = 'Card Images: Front Only'
                } else if (str === 'front') {
                  nextVal = 'back'
                  toastMsg = 'Card Images: Back Only'
                } else if (str === 'back') {
                  nextVal = 'none'
                  toastMsg = 'Card Images: OFF'
                } else {
                  nextVal = 'always'
                  toastMsg = 'Card Images: Both Sides'
                }
                setShowImages(nextVal)
                showLocalToast?.(toastMsg, 'info')
              }

              // 4. Font Size cycle & meta (100% Normal -> 125% Large -> 150% XL -> 85% Compact)
              const fontMeta = (() => {
                const match = String(frontFontSize || '100%').match(/\d+/)
                const pct = match ? parseInt(match[0], 10) : 100
                if (pct <= 85) return { label: '85%', sub: 'Compact', active: true, color: 'text-amber-600' }
                if (pct <= 105) return { label: '100%', sub: 'Normal', active: false, color: 'text-slate-500' }
                if (pct <= 135) return { label: '125%', sub: 'Large', active: true, color: 'text-indigo-600' }
                return { label: '150%', sub: 'XL', active: true, color: 'text-purple-600' }
              })()

              const handleCycleFontSize = () => {
                const match = String(frontFontSize || '100%').match(/\d+/)
                const pct = match ? parseInt(match[0], 10) : 100
                let nextVal = '100%'
                let toastMsg = 'Font Size: 100% (Normal)'
                if (pct <= 85) {
                  nextVal = '100%'
                  toastMsg = 'Font Size: 100% (Normal)'
                } else if (pct <= 105) {
                  nextVal = '125%'
                  toastMsg = 'Font Size: 125% (Large)'
                } else if (pct <= 135) {
                  nextVal = '150%'
                  toastMsg = 'Font Size: 150% (Extra Large)'
                } else {
                  nextVal = '85%'
                  toastMsg = 'Font Size: 85% (Compact)'
                }
                setFrontFontSize?.(nextVal)
                showLocalToast?.(toastMsg, 'info')
              }

              return (
                <div className="flex flex-col gap-3">
                  {/* ══════ SECTION 1: AUDIO & FLOW ══════ */}
                  <div className="flex flex-col gap-1.5 text-left px-0.5">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                        Audio & Flow
                      </span>
                      <span className="text-[9px] font-bold text-slate-400">
                        Sound & Pacing
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-2 sm:gap-2.5">
                      {/* 1. Autoplay */}
                      <button
                        type="button"
                        onClick={handleCycleAutoplay}
                        className={cn(
                          "flex flex-col items-center justify-center p-2 rounded-2xl border transition-all active:scale-95 text-center min-h-[72px] gap-1.5 cursor-pointer select-none",
                          autoplayMeta.container
                        )}
                        title={autoplayMeta.title}
                      >
                        <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", autoplayMeta.iconBox)}>
                          {autoplayMeta.icon}
                        </div>
                        <div className="flex flex-col items-center leading-none gap-0.5">
                          <span className="text-[10px] font-bold tracking-tight">Autoplay</span>
                          <span className={cn("text-[8px] font-black uppercase tracking-wider", autoplayMeta.color)}>
                            {autoplayMeta.label}
                          </span>
                        </div>
                      </button>

                      {/* 2. SFX Sounds */}
                      <button
                        type="button"
                        onClick={() => {
                          const nextVal = !sfxEnabled
                          setSfxEnabled(nextVal)
                          showLocalToast?.(`SFX Sounds: ${nextVal ? 'ON' : 'OFF'}`, 'info')
                        }}
                        className={cn(
                          "flex flex-col items-center justify-center p-2 rounded-2xl border transition-all active:scale-95 text-center min-h-[72px] gap-1.5 cursor-pointer select-none",
                          sfxEnabled
                            ? "bg-purple-50 border-purple-300 text-purple-700 shadow-2xs"
                            : "bg-slate-50 hover:bg-slate-100/80 border-slate-200/70 text-slate-500"
                        )}
                        title={`SFX Sounds: ${sfxEnabled ? 'ON' : 'OFF'}`}
                      >
                        <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", sfxEnabled ? "bg-purple-500 text-white shadow-2xs" : "bg-white text-slate-400 border border-slate-200/60")}>
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col items-center leading-none gap-0.5">
                          <span className="text-[10px] font-bold tracking-tight">SFX Audio</span>
                          <span className={cn("text-[8px] font-black uppercase tracking-wider", sfxEnabled ? "text-purple-600" : "text-slate-400")}>
                            {sfxEnabled ? "ON" : "OFF"}
                          </span>
                        </div>
                      </button>

                      {/* 3. Haptic Feedback */}
                      <button
                        type="button"
                        onClick={() => {
                          const nextVal = !hapticEnabled
                          setHapticEnabled?.(nextVal)
                          if (nextVal) triggerHaptic?.('success')
                          showLocalToast?.(`Haptic Feedback: ${nextVal ? 'ON' : 'OFF'}`, 'info')
                        }}
                        className={cn(
                          "flex flex-col items-center justify-center p-2 rounded-2xl border transition-all active:scale-95 text-center min-h-[72px] gap-1.5 cursor-pointer select-none",
                          hapticEnabled
                            ? "bg-emerald-50 border-emerald-300 text-emerald-700 shadow-2xs"
                            : "bg-slate-50 hover:bg-slate-100/80 border-slate-200/70 text-slate-500"
                        )}
                        title={`Haptic Vibration: ${hapticEnabled ? 'ON' : 'OFF'}`}
                      >
                        <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", hapticEnabled ? "bg-emerald-600 text-white shadow-2xs" : "bg-white text-slate-400 border border-slate-200/60")}>
                          {hapticEnabled ? <Vibrate className="w-4 h-4" /> : <VibrateOff className="w-4 h-4" />}
                        </div>
                        <div className="flex flex-col items-center leading-none gap-0.5">
                          <span className="text-[10px] font-bold tracking-tight">Haptic</span>
                          <span className={cn("text-[8px] font-black uppercase tracking-wider", hapticEnabled ? "text-emerald-600" : "text-slate-400")}>
                            {hapticEnabled ? "ON" : "OFF"}
                          </span>
                        </div>
                      </button>

                      {/* 4. Auto Next */}
                      <button
                        type="button"
                        onClick={() => {
                          if (isSpeedSkimMode) {
                            showLocalToast?.("Auto Next is permanently active in Skim Mode", "info")
                            return
                          }
                          const nextVal = !effectiveAutoAdvance
                          setIsAutoAdvance(nextVal)
                          if (setQuickLearnEnabled) setQuickLearnEnabled(nextVal)
                          showLocalToast?.(`Auto Next: ${nextVal ? 'ON' : 'OFF'}`, 'info')
                        }}
                        className={cn(
                          "flex flex-col items-center justify-center p-2 rounded-2xl border transition-all active:scale-95 text-center min-h-[72px] gap-1.5 cursor-pointer select-none",
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
                              ⚡ Skim
                            </span>
                          ) : (
                            <span className={cn("text-[8px] font-black uppercase tracking-wider", effectiveAutoAdvance ? "text-amber-600" : "text-slate-400")}>
                              {effectiveAutoAdvance ? "ON" : "OFF"}
                            </span>
                          )}
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* ══════ SECTION 2: DISPLAY & GESTURES ══════ */}
                  <div className="flex flex-col gap-1.5 text-left px-0.5">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                        Display & Gestures
                      </span>
                      <span className="text-[9px] font-bold text-slate-400">
                        Visuals & Controls
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-2 sm:gap-2.5">
                      {/* 1. Rating Mode */}
                      <button
                        type="button"
                        onClick={handleCycleRating}
                        className={cn(
                          "flex flex-col items-center justify-center p-2 rounded-2xl border transition-all active:scale-95 text-center min-h-[72px] gap-1.5 cursor-pointer select-none",
                          ratingModeMeta.container
                        )}
                        title={ratingModeMeta.title}
                      >
                        <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", ratingModeMeta.iconBox)}>
                          {ratingModeMeta.icon}
                        </div>
                        <div className="flex flex-col items-center leading-none gap-0.5">
                          <span className="text-[10px] font-bold tracking-tight">Rate Mode</span>
                          <span className={cn("text-[8px] font-black uppercase tracking-wider", ratingModeMeta.color)}>
                            {ratingModeMeta.label}
                          </span>
                        </div>
                      </button>

                      {/* 2. Card Images (Cycles: BOTH -> FRONT -> BACK -> OFF) */}
                      <button
                        type="button"
                        onClick={handleCycleImages}
                        className={cn(
                          "flex flex-col items-center justify-center p-2 rounded-2xl border transition-all active:scale-95 text-center min-h-[72px] gap-1.5 cursor-pointer select-none",
                          imagesMeta.container
                        )}
                        title={imagesMeta.title}
                      >
                        <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", imagesMeta.iconBox)}>
                          {imagesMeta.icon}
                        </div>
                        <div className="flex flex-col items-center leading-none gap-0.5">
                          <span className="text-[10px] font-bold tracking-tight">Images</span>
                          <span className={cn("text-[8px] font-black uppercase tracking-wider", imagesMeta.color)}>
                            {imagesMeta.label}
                          </span>
                        </div>
                      </button>

                      {/* 3. Font Size (Cycles: 100% -> 125% -> 150% -> 85%) */}
                      <button
                        type="button"
                        onClick={handleCycleFontSize}
                        className={cn(
                          "flex flex-col items-center justify-center p-2 rounded-2xl border transition-all active:scale-95 text-center min-h-[72px] gap-1.5 cursor-pointer select-none",
                          fontMeta.active
                            ? "bg-indigo-50 border-indigo-300 text-indigo-700 shadow-2xs"
                            : "bg-slate-50 hover:bg-slate-100/80 border-slate-200/70 text-slate-500"
                        )}
                        title={`Font Size: ${fontMeta.label} (${fontMeta.sub})`}
                      >
                        <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", fontMeta.active ? "bg-indigo-600 text-white shadow-2xs" : "bg-white text-slate-400 border border-slate-200/60")}>
                          <Type className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col items-center leading-none gap-0.5">
                          <span className="text-[10px] font-bold tracking-tight">Font Size</span>
                          <span className={cn("text-[8px] font-black uppercase tracking-wider", fontMeta.color)}>
                            {fontMeta.label}
                          </span>
                        </div>
                      </button>

                      {/* 4. Shuffle Order */}
                      <button
                        type="button"
                        onClick={() => {
                          const nextVal = !randomEnabled
                          if (onToggleRandom) {
                            onToggleRandom(nextVal)
                          } else {
                            setRandomEnabled(nextVal)
                          }
                          showLocalToast?.(`Shuffle: ${nextVal ? 'ON' : 'OFF'}`, 'info')
                        }}
                        className={cn(
                          "flex flex-col items-center justify-center p-2 rounded-2xl border transition-all active:scale-95 text-center min-h-[72px] gap-1.5 cursor-pointer select-none",
                          randomEnabled
                            ? "bg-violet-50 border-violet-300 text-violet-700 shadow-2xs"
                            : "bg-slate-50 hover:bg-slate-100/80 border-slate-200/70 text-slate-500"
                        )}
                        title={`Shuffle Order: ${randomEnabled ? 'ON' : 'OFF'}`}
                      >
                        <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", randomEnabled ? "bg-violet-600 text-white shadow-2xs" : "bg-white text-slate-400 border border-slate-200/60")}>
                          <Shuffle className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col items-center leading-none gap-0.5">
                          <span className="text-[10px] font-bold tracking-tight">Shuffle</span>
                          <span className={cn("text-[8px] font-black uppercase tracking-wider", randomEnabled ? "text-violet-600" : "text-slate-400")}>
                            {randomEnabled ? "ON" : "OFF"}
                          </span>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* ══════ SECTION 3: CARD TOOLS & AI ══════ */}
                  <div className="flex flex-col gap-1.5 text-left px-0.5">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                        Card Tools & AI
                      </span>
                      <span className="text-[9px] font-bold text-slate-400">
                        Editor & Insights
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-2 sm:gap-2.5">
                      {/* 1. Edit Card */}
                      <button
                        type="button"
                        disabled={!canEdit}
                        onClick={() => {
                          onClose()
                          onOpenEditModal?.()
                        }}
                        className={cn(
                          "flex flex-col items-center justify-center p-2 rounded-2xl border transition-all active:scale-95 text-center min-h-[72px] gap-1.5 select-none",
                          canEdit
                            ? "bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100/80 cursor-pointer shadow-2xs"
                            : "bg-slate-50 border-slate-200/70 text-slate-400 opacity-50 cursor-not-allowed"
                        )}
                        title={canEdit ? "Edit Current Card Content" : "Card editing locked"}
                      >
                        <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", canEdit ? "bg-blue-600 text-white shadow-2xs" : "bg-slate-200 text-slate-400")}>
                          <Pencil className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col items-center leading-none gap-0.5">
                          <span className="text-[10px] font-bold tracking-tight">Edit Card</span>
                          <span className={cn("text-[8px] font-black uppercase tracking-wider", canEdit ? "text-blue-600" : "text-slate-400")}>
                            {canEdit ? "EDITOR" : "LOCKED"}
                          </span>
                        </div>
                      </button>

                      {/* 2. Card Note */}
                      <button
                        type="button"
                        onClick={() => {
                          onClose()
                          onOpenCardHub?.('note')
                        }}
                        className="flex flex-col items-center justify-center p-2 rounded-2xl border bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100/80 transition-all active:scale-95 text-center min-h-[72px] gap-1.5 cursor-pointer select-none shadow-2xs"
                        title="View & Edit Personal Card Notes"
                      >
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-amber-500 text-white shadow-2xs">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col items-center leading-none gap-0.5">
                          <span className="text-[10px] font-bold tracking-tight">Card Note</span>
                          <span className="text-[8px] font-black uppercase tracking-wider text-amber-700">
                            NOTES
                          </span>
                        </div>
                      </button>

                      {/* 3. AI Explain */}
                      <button
                        type="button"
                        onClick={() => {
                          onClose()
                          onOpenCardHub?.('insight')
                        }}
                        className="flex flex-col items-center justify-center p-2 rounded-2xl border bg-purple-50 border-purple-300 text-purple-800 hover:bg-purple-100/80 transition-all active:scale-95 text-center min-h-[72px] gap-1.5 cursor-pointer select-none shadow-2xs"
                        title="Open AI Explanations & In-Depth Insights"
                      >
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-purple-600 text-white shadow-2xs">
                          <Brain className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col items-center leading-none gap-0.5">
                          <span className="text-[10px] font-bold tracking-tight">AI Explain</span>
                          <span className="text-[8px] font-black uppercase tracking-wider text-purple-700">
                            INSIGHT
                          </span>
                        </div>
                      </button>

                      {/* 4. AI Hint */}
                      <button
                        type="button"
                        onClick={() => {
                          handleToggleHint?.()
                        }}
                        className={cn(
                          "flex flex-col items-center justify-center p-2 rounded-2xl border transition-all active:scale-95 text-center min-h-[72px] gap-1.5 cursor-pointer select-none",
                          showingHint
                            ? "bg-amber-100 border-amber-400 text-amber-900 shadow-2xs"
                            : "bg-slate-50 hover:bg-slate-100/80 border-slate-200/70 text-slate-500"
                        )}
                        title={showingHint ? "Hide AI Hint" : "Reveal / Ask AI Hint"}
                      >
                        <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", showingHint ? "bg-amber-500 text-white shadow-2xs" : "bg-white text-slate-400 border border-slate-200/60")}>
                          <Lightbulb className={cn("w-4 h-4", showingHint && "fill-white")} />
                        </div>
                        <div className="flex flex-col items-center leading-none gap-0.5">
                          <span className="text-[10px] font-bold tracking-tight">AI Hint</span>
                          <span className={cn("text-[8px] font-black uppercase tracking-wider", showingHint ? "text-amber-700" : "text-slate-400")}>
                            {showingHint ? "ACTIVE" : "HINT"}
                          </span>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* ══════ SECTION 4: QUICK UTILITIES ══════ */}
                  <div className="grid grid-cols-4 gap-2 sm:gap-2.5">
                    {/* Star Card (Wide - 2 cols) */}
                    <button
                      type="button"
                      onClick={handleStarQuestion}
                      className={cn(
                        "col-span-2 flex items-center gap-2.5 p-2.5 rounded-2xl border transition-all active:scale-98 cursor-pointer select-none",
                        currentQuestion?.is_starred
                          ? "bg-amber-50 border-amber-300 text-amber-800 shadow-2xs"
                          : "bg-slate-50 hover:bg-slate-100/80 border-slate-200/70 text-slate-600"
                      )}
                      title={currentQuestion?.is_starred ? "Card is Starred (Click to Unstar)" : "Star this Card"}
                    >
                      <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0", currentQuestion?.is_starred ? "bg-amber-500 text-white shadow-2xs" : "bg-white text-slate-400 border border-slate-200/60")}>
                        <Star className={cn("w-4 h-4", currentQuestion?.is_starred && "fill-white")} />
                      </div>
                      <div className="flex flex-col text-left leading-none gap-0.5">
                        <span className="text-[11px] font-bold tracking-tight">Star Card</span>
                        <span className={cn("text-[8.5px] font-black uppercase tracking-wider", currentQuestion?.is_starred ? "text-amber-600" : "text-slate-400")}>
                          {currentQuestion?.is_starred ? "STARRED" : "NOT STARRED"}
                        </span>
                      </div>
                    </button>

                    {/* Select Text Mode (Wide - 2 cols) */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsSelectMode(prev => {
                          const next = !prev
                          showLocalToast?.(next ? "Select Text Mode: ON (Card gestures paused)" : "Select Text Mode: OFF (Card gestures resumed)", "info")
                          return next
                        })
                        onClose()
                      }}
                      className={cn(
                        "col-span-2 flex items-center gap-2.5 p-2.5 rounded-2xl border transition-all active:scale-98 cursor-pointer select-none",
                        isSelectMode
                          ? "bg-rose-50 border-rose-300 text-rose-800 shadow-2xs"
                          : "bg-slate-50 hover:bg-slate-100/80 border-slate-200/70 text-slate-600"
                      )}
                      title={isSelectMode ? "Select Text: ACTIVE" : "Select Text Mode"}
                    >
                      <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0", isSelectMode ? "bg-rose-500 text-white shadow-2xs" : "bg-white text-slate-400 border border-slate-200/60")}>
                        <MousePointer className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col text-left leading-none gap-0.5">
                        <span className="text-[11px] font-bold tracking-tight">Select Text</span>
                        <span className={cn("text-[8.5px] font-black uppercase tracking-wider", isSelectMode ? "text-rose-600" : "text-slate-400")}>
                          {isSelectMode ? "GESTURES PAUSED" : "OFF"}
                        </span>
                      </div>
                    </button>
                  </div>
                </div>
              )
            })()}

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
